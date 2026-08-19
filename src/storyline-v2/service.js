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
  matchFreeText
} = require('./index');

class StorylineV2Service {
  constructor(adventures = {}) {
    this.adventures = new Map(Object.entries(adventures));
    this.sessions = new Map();
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

  start({ adventureId, sessionId, classId, options = {} }) {
    if (!sessionId) throw new Error('Session ID is required');
    if (this.sessions.has(sessionId)) return this.snapshot(sessionId);
    const adventure = this.getAdventure(adventureId);
    const state = createState(adventure, { ...options, sessionId, classId });
    this.sessions.set(sessionId, { adventureId, state });
    return this.snapshot(sessionId);
  }

  snapshot(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Unknown Storyline session: ${sessionId}`);
    return {
      adventureId: session.adventureId,
      state: JSON.parse(JSON.stringify(session.state)),
      catalog: buildCatalog(this.getAdventure(session.adventureId), session.state)
    };
  }

  submit({ sessionId, actionId, catalogVersion, turnId }) {
    const session = this.sessions.get(sessionId);
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
    session.state = resolved.state;
    return {
      ...resolved.result,
      rejected: resolved.result.resultType === 'rejected',
      state: JSON.parse(JSON.stringify(session.state))
    };
  }

  submitText({ sessionId, text, turnId }) {
    const session = this.sessions.get(sessionId);
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
    if (!state || state.mode !== 'storyline' || state.adventureId !== adventureId) {
      throw new Error('Invalid Storyline state');
    }
    if (!adventure.scenes[state.sceneId]) throw new Error(`Unknown state scene: ${state.sceneId}`);
    this.sessions.set(sessionId, { adventureId, state: JSON.parse(JSON.stringify(state)) });
    return this.snapshot(sessionId);
  }

  exportAll() {
    return {
      schemaVersion: 'storyline-v2-sessions:1',
      sessions: Array.from(this.sessions, ([sessionId, session]) => ({
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
    this.sessions.clear();
  }
}

module.exports = { StorylineV2Service };
