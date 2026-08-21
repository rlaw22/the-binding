'use strict';

const assert = require('assert');
const { compileAdventure, createState, createSessionState, SESSION_SCHEMA_VERSION } = require('../src/storyline-v2/domain');
const { StorylineV2Service } = require('../src/storyline-v2/application/service');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

const adventure = compileAdventure({
  schemaVersion: '2.0', adventureId: 'session-contract', title: 'Session Contract',
  classes: ['scholar'], items: {}, prologue: { startingSceneId: 'study' },
  scenes: [{ sceneId: 'study', actions: [{ actionId: 'look', label: 'Look', resolution: { resultType: 'atmosphere', narration: 'Dust moves.' } }] }],
  graph: { entry: 'study', edges: [] }
});

console.log('\n=== Storyline v2 session state contract ===');

test('creates a versioned canonical snapshot with isolated book state', () => {
  const state = createState(adventure, { sessionId: 'contract-1', classId: 'scholar', now: '2026-01-01T00:00:00.000Z' });
  assert.strictEqual(state.sessionSchemaVersion, SESSION_SCHEMA_VERSION);
  assert.strictEqual(state.manifestVersion, '2.0');
  assert.strictEqual(state.revision, 0);
  assert.deepStrictEqual(state.timestamps, { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' });
  assert.strictEqual(state.bookSession.bookSessionId, 'contract-1');
  assert.ok(Array.isArray(state.bookmarks));
  assert.ok(Array.isArray(state.journal));
});

test('rejects incompatible schema and manifest versions on resume', () => {
  const state = createState(adventure, { sessionId: 'contract-2' });
  assert.throws(() => createSessionState(adventure, { ...state, sessionSchemaVersion: 'storyline-v2-session:999' }), /Unsupported Storyline v2 session schema/);
  assert.throws(() => createSessionState({ ...adventure, adventureId: 'other' }, state), /adventure mismatch/);
});

test('mutations increment revision while idempotent retries do not', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  const start = service.start({ adventureId: adventure.adventureId, sessionId: 'contract-3' });
  const first = service.submit({ sessionId: 'contract-3', actionId: 'look', catalogVersion: start.catalog.catalogVersion, turnId: 'turn-1' });
  assert.strictEqual(first.state.revision, 1);
  const retry = service.submit({ sessionId: 'contract-3', actionId: 'look', catalogVersion: 'stale', turnId: 'turn-1' });
  assert.strictEqual(retry.state.revision, 1);
  assert.deepStrictEqual(retry.state, first.state);
});

test('lifecycle transitions increment revision and preserve created timestamp', () => {
  let tick = 0;
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure }, { clock: () => `2026-01-01T00:00:0${++tick}.000Z` });
  const start = service.start({ adventureId: adventure.adventureId, sessionId: 'contract-4', now: '2026-01-01T00:00:00.000Z' });
  const paused = service.pause('contract-4');
  assert.strictEqual(paused.state.revision, 1);
  assert.strictEqual(paused.state.timestamps.createdAt, start.state.timestamps.createdAt);
  assert.notStrictEqual(paused.state.timestamps.updatedAt, start.state.timestamps.updatedAt);
});

test('repository resume rejects incomplete snapshots', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  assert.throws(() => service.importState({ sessionId: 'bad', adventureId: adventure.adventureId, state: { mode: 'storyline' } }), /Invalid Storyline v2 session state/);
});
