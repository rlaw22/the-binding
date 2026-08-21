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
  createCharacter
} = require('../domain');
const { InMemorySessionRepository } = require('./repositories/session-repository');
const { InMemoryCharacterRepository } = require('./repositories/character-repository');

class StorylineV2Service {
  constructor(adventures = {}, options = {}) {
    this.adventures = new Map(Object.entries(adventures));
    this.sessionRepository = options.sessionRepository || new InMemorySessionRepository();
    this.characterRepository = options.characterRepository || new InMemoryCharacterRepository();
    this.clock = options.clock || (() => new Date().toISOString());
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
    return {
      ...resolved.result,
      rejected: resolved.result.resultType === 'rejected',
      state: JSON.parse(JSON.stringify(session.state))
    };
  }

  transition({ sessionId, to }) {
    const session = this.sessionRepository.get(sessionId);
    if (!session) throw new Error(`Unknown Storyline session: ${sessionId}`);
    const state = transitionSession(session.state, to);
    this.sessionRepository.save(sessionId, { ...session, state: createSessionState(this.getAdventure(session.adventureId), {
      ...state,
      revision: state.revision + 1,
      timestamps: { ...state.timestamps, updatedAt: this.clock() }
    }) });
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
