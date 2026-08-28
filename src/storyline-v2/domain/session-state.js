'use strict';

const { clone } = require('./collections');

const SESSION_SCHEMA_VERSION = 'storyline-v2-session:1';

function createSessionState(adventure, options = {}) {
  const state = options.state || options;
  const required = ['mode', 'adventureId', 'sessionId', 'lifecycle', 'sceneId', 'character', 'bookSession'];
  const missing = required.filter(key => state[key] == null);
  if (missing.length) throw new Error(`Invalid Storyline v2 session state: missing ${missing.join(', ')}`);
  if (state.mode !== 'storyline') throw new Error('Invalid Storyline v2 session state: mode must be storyline');
  if (state.adventureId !== adventure.adventureId) throw new Error('Invalid Storyline v2 session state: adventure mismatch');
  if (!adventure.scenes[state.sceneId]) throw new Error(`Unknown state scene: ${state.sceneId}`);
  if (!Number.isInteger(state.revision) || state.revision < 0) throw new Error('Invalid Storyline v2 session state: revision must be a non-negative integer');
  if (!state.sessionSchemaVersion) throw new Error('Invalid Storyline v2 session state: session schema version is required');
  if (state.sessionSchemaVersion !== SESSION_SCHEMA_VERSION) throw new Error(`Unsupported Storyline v2 session schema: ${state.sessionSchemaVersion}`);
  if (!state.manifestVersion) throw new Error('Invalid Storyline v2 session state: manifest version is required');
  if (!state.timestamps || !state.timestamps.createdAt || !state.timestamps.updatedAt) {
    throw new Error('Invalid Storyline v2 session state: timestamps are required');
  }
  if (!state.localThreads || typeof state.localThreads !== 'object' || Array.isArray(state.localThreads)) state.localThreads = {};
  if (!state.processedTurns || typeof state.processedTurns !== 'object' || Array.isArray(state.processedTurns)) {
    throw new Error('Invalid Storyline v2 session state: processed turns are required');
  }
  return clone(state);
}

function markMutation(state, now) {
  const next = clone(state);
  next.revision += 1;
  next.timestamps = {
    ...next.timestamps,
    updatedAt: now || next.timestamps.updatedAt
  };
  return next;
}

function snapshotState(state) {
  return clone(state);
}

module.exports = { SESSION_SCHEMA_VERSION, createSessionState, markMutation, snapshotState };