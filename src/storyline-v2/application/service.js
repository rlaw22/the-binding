'use strict';

/**
 * Storyline v2 application boundary.
 *
 * This module owns compiled-adventure lookup and session-local state. It does
 * not persist, call an LLM, mutate browser state, or touch Campaign data.
 * Persistence and HTTP adapters can wrap this boundary later.
 */

const {
  createState,
  buildCatalog,
  resolveTurn,
  matchFreeText,
  transitionSession,
  createSessionState,
  snapshotState,
  buildTransferPreview,
  createBookCharacterSnapshot,
  createCharacter,
  addBookmark,
  removeBookmark,
  appendJournal
} = require('../domain');
const { InMemorySessionRepository } = require('./repositories/session-repository');
const { InMemoryCharacterRepository } = require('./repositories/character-repository');
const { TelemetryEmitter } = require('../telemetry');

class StorylineV2Service {
  constructor(adventures = {}, options = {}) {
    this.adventures = new Map(Object.entries(adventures));
    this.sessionRepository = options.sessionRepository || new InMemorySessionRepository();
    this.characterRepository = options.characterRepository || new InMemoryCharacterRepository();
    this.clock = options.clock || (() => new Date().toISOString());
    this.telemetry = options.telemetry || new TelemetryEmitter({ clock: this.clock });
  }

  get sessions() {
    // Compatibility view for transitional callers. New application code must
    // use the repository contract rather than mutating a Map directly.
    return this.sessionRepository.sessions;
  }

  registerAdventure(adventure) {
    if (!adventure || !adventure.adventureId) throw new Error('Compiled adventure is required');
    this.adventures.set(adventure.adventureId, adventure);
    return adventure.adventureId;
  }

  getAdventure(adventureId) {
    const adventure = this.adventures.get(adventureId);
    if (!adventure) throw new Error(`Unknown Storyline adventure: ${adventureId}`);
    return adventure;
  }

  saveCharacter(characterInput) {
    const character = createCharacter(characterInput);
    if (!character.characterId) throw new Error('Character ID is required');
    return this.characterRepository.save(character.characterId, character);
  }

  getCharacter(characterId) {
    const character = this.characterRepository.get(characterId);
    if (!character) throw new Error(`Unknown Storyline character: ${characterId}`);
    return character;
  }

  previewTransfer({ adventureId, characterId, character, options = {} }) {
    const adventure = this.getAdventure(adventureId);
    const folio = characterId ? this.getCharacter(characterId) : createCharacter(character);
    return buildTransferPreview(adventure, folio, options);
  }

  start({ adventureId, sessionId, classId, characterId, options = {} }) {
    if (!sessionId) throw new Error('Session ID is required');
    if (this.sessionRepository.has(sessionId)) return this.snapshot(sessionId);
    const adventure = this.getAdventure(adventureId);
    const folio = characterId ? this.getCharacter(characterId) : createCharacter({ ...options.character, characterId });
    const transfer = buildTransferPreview(adventure, folio, options);
    const bookCharacter = createBookCharacterSnapshot(adventure, folio, options);
    const state = createState(adventure, {
      ...options,
      sessionId,
      classId: classId || bookCharacter.classId,
      character: bookCharacter,
      inventory: transfer.transferredItems,
      bookSessionId: sessionId
    });
    state.characterId = folio.characterId || null;
    state.character = { ...state.character, persistentCharacterId: folio.characterId || null };
    this.sessionRepository.save(sessionId, { adventureId, characterId: folio.characterId || null, state: createSessionState(adventure, state) });
    this.telemetry.emit({
      eventName: 'session_started',
      context: { sessionId, adventureId, manifestVersion: adventure.schemaVersion, sceneId: state.sceneId, actId: state.actId },
      payload: { outcome: 'started' },
      idempotencyKey: `session_started:${sessionId}`
    });
    return this.snapshot(sessionId);
  }

  snapshot(sessionId) {
    const session = this.sessionRepository.get(sessionId);
    if (!session) throw new Error(`Unknown Storyline session: ${sessionId}`);
    return {
      adventureId: session.adventureId,
      state: snapshotState(session.state),
      catalog: buildCatalog(this.getAdventure(session.adventureId), session.state)
    };
  }

  submit({ sessionId, actionId, catalogVersion, turnId }) {
    const session = this.sessionRepository.get(sessionId);
    if (!session) throw new Error(`Unknown Storyline session: ${sessionId}`);
    const adventure = this.getAdventure(session.adventureId);
    const resolved = resolveTurn({ adventure, state: session.state, actionId, catalogVersion, turnId });
    if (resolved.result && resolved.result.resultType === 'rejected') {
      this.telemetry.emit({
        eventName: resolved.result.error === 'STALE_CATALOG' ? 'stale_submission' : 'submission_failed',
        context: { sessionId, adventureId: session.adventureId, manifestVersion: adventure.schemaVersion, sceneId: session.state.sceneId },
        payload: { actionId, error: resolved.result.error, outcome: 'rejected' },
        idempotencyKey: `submission:${sessionId}:${turnId || actionId}:${resolved.result.error}`
      });
      return { ...resolved.result, rejected: true, state: JSON.parse(JSON.stringify(session.state)) };
    }
    // The pure resolver returns the previously stored result directly for an
    // idempotent retry. Wrap it in the same service envelope without applying
    // effects or replacing canonical session state.
    if (!resolved.state) {
      return {
        ...resolved,
        rejected: resolved.resultType === 'rejected',
        state: JSON.parse(JSON.stringify(session.state))
      };
    }
    session.state = createSessionState(adventure, resolved.state);
    this.sessionRepository.save(sessionId, session);
    const result = resolved.result;
    const context = { sessionId, adventureId: session.adventureId, manifestVersion: adventure.schemaVersion, sceneId: result.sceneId, actId: session.state.actId };
    this.telemetry.emit({ eventName: 'action_resolved', context, payload: { actionId: result.actionId, contentId: result.contentId, resultType: result.resultType, outcome: result.resultType, turnId: result.turnId }, idempotencyKey: `action_resolved:${sessionId}:${result.turnId || result.responseId}` });
    (result.stateChanges && result.stateChanges.discoveredContentIds || []).forEach(contentId => this.telemetry.emit({ eventName: 'discovery_selected', context, payload: { actionId: result.actionId, contentId }, idempotencyKey: `discovery:${sessionId}:${result.turnId}:${contentId}` }));
    if (result.transition) this.telemetry.emit({ eventName: 'branch_reached', context, payload: { actionId: result.actionId, edgeId: result.transition.edgeId, sourceSceneId: result.transition.sourceSceneId, destinationSceneId: result.transition.destinationSceneId }, idempotencyKey: `branch:${sessionId}:${result.turnId}:${result.transition.edgeId}` });
    if (result.endingId) this.telemetry.emit({ eventName: 'ending_reached', context, payload: { actionId: result.actionId, endingId: result.endingId }, idempotencyKey: `ending:${sessionId}:${result.endingId}` });
    return {
      ...result,
      rejected: resolved.result.resultType === 'rejected',
      state: JSON.parse(JSON.stringify(session.state))
    };
  }

  transition({ sessionId, to }) {
    const session = this.sessionRepository.get(sessionId);
    if (!session) throw new Error(`Unknown Storyline session: ${sessionId}`);
    const state = transitionSession(session.state, to);
    const adventure = this.getAdventure(session.adventureId);
    const nextState = createSessionState(adventure, {
      ...state,
      revision: state.revision + 1,
      timestamps: { ...state.timestamps, updatedAt: this.clock() }
    });
    this.sessionRepository.save(sessionId, { ...session, state: nextState });
    const lifecycleEvents = { paused: 'session_paused', active: 'session_resumed', interrupted: 'session_interrupted', awaiting_recovery: 'session_interrupted', completed: 'session_completed', failed: 'session_abandoned' };
    const eventName = lifecycleEvents[to];
    if (eventName) this.telemetry.emit({ eventName, context: { sessionId, adventureId: session.adventureId, manifestVersion: adventure.schemaVersion, sceneId: nextState.sceneId, actId: nextState.actId }, payload: { outcome: to }, idempotencyKey: `lifecycle:${sessionId}:${nextState.revision}:${to}` });
    return this.snapshot(sessionId);
  }

  addBookmark({ sessionId, bookmarkId, label }) {
    const session = this.sessionRepository.get(sessionId);
    if (!session) throw new Error(`Unknown Storyline session: ${sessionId}`);
    const adventure = this.getAdventure(session.adventureId);
    const state = createSessionState(adventure, {
      ...session.state,
      bookmarks: addBookmark(session.state, { bookmarkId, label }, this.clock()),
      revision: session.state.revision + 1,
      timestamps: { ...session.state.timestamps, updatedAt: this.clock() }
    });
    this.sessionRepository.save(sessionId, { ...session, state });
    return this.snapshot(sessionId);
  }

  removeBookmark({ sessionId, bookmarkId }) {
    const session = this.sessionRepository.get(sessionId);
    if (!session) throw new Error(`Unknown Storyline session: ${sessionId}`);
    const adventure = this.getAdventure(session.adventureId);
    const state = createSessionState(adventure, {
      ...session.state,
      bookmarks: removeBookmark(session.state, bookmarkId),
      revision: session.state.revision + 1,
      timestamps: { ...session.state.timestamps, updatedAt: this.clock() }
    });
    this.sessionRepository.save(sessionId, { ...session, state });
    return this.snapshot(sessionId);
  }

  appendJournal({ sessionId, entry }) {
    const session = this.sessionRepository.get(sessionId);
    if (!session) throw new Error(`Unknown Storyline session: ${sessionId}`);
    const adventure = this.getAdventure(session.adventureId);
    const state = createSessionState(adventure, {
      ...session.state,
      journal: appendJournal(session.state, entry || {}),
      revision: session.state.revision + 1,
      timestamps: { ...session.state.timestamps, updatedAt: this.clock() }
    });
    this.sessionRepository.save(sessionId, { ...session, state });
    return this.snapshot(sessionId);
  }

  pause(sessionId) {
    return this.transition({ sessionId, to: 'paused' });
  }

  resume(sessionId) {
    return this.transition({ sessionId, to: 'active' });
  }

  interrupt(sessionId) {
    return this.transition({ sessionId, to: 'interrupted' });
  }

  recover(sessionId) {
    return this.transition({ sessionId, to: 'active' });
  }

  submitText({ sessionId, text, turnId }) {
    const session = this.sessionRepository.get(sessionId);
    if (!session) throw new Error(`Unknown Storyline session: ${sessionId}`);
    const adventure = this.getAdventure(session.adventureId);
    const catalog = buildCatalog(adventure, session.state);
    const definitions = adventure.scenes[session.state.sceneId].actions;
    const match = matchFreeText(text, catalog, definitions);
    if (match.status !== 'matched') return { ...match, catalog };
    return {
      ...match,
      result: this.submit({
        sessionId,
        actionId: match.action.actionId,
        catalogVersion: catalog.catalogVersion,
        turnId
      })
    };
  }

  exportState(sessionId) {
    return this.snapshot(sessionId);
  }

  importState({ sessionId, adventureId, state }) {
    if (!sessionId) throw new Error('Session ID is required');
    const adventure = this.getAdventure(adventureId);
    const canonical = createSessionState(adventure, { ...state, sessionId });
    this.sessionRepository.save(sessionId, { adventureId, state: canonical });
    return this.snapshot(sessionId);
  }

  exportAll() {
    return {
      schemaVersion: 'storyline-v2-sessions:1',
      sessions: this.sessionRepository.entries().map(({ sessionId, value: session }) => ({
        sessionId,
        adventureId: session.adventureId,
        state: JSON.parse(JSON.stringify(session.state))
      }))
    };
  }

  importAll(bundle) {
    if (!bundle || bundle.schemaVersion !== 'storyline-v2-sessions:1' || !Array.isArray(bundle.sessions)) {
      throw new Error('Invalid Storyline session bundle');
    }
    const imported = [];
    bundle.sessions.forEach(entry => {
      this.importState({ sessionId: entry.sessionId, adventureId: entry.adventureId, state: entry.state });
      imported.push(entry.sessionId);
    });
    return imported;
  }

  clear() {
    this.sessionRepository.clear();
  }
}

module.exports = { StorylineV2Service };
