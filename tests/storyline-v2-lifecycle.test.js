'use strict';

const assert = require('assert');
const { compileAdventure, createState, buildCatalog, resolveTurn, transitionSession, canTransition } = require('../src/storyline-v2/domain');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

const adventure = compileAdventure({
  schemaVersion: '2.0', adventureId: 'lifecycle-test', title: 'Lifecycle Test',
  classes: [], items: {}, prologue: { startingSceneId: 'one' },
  scenes: [{ sceneId: 'one', actions: [{ actionId: 'look', label: 'Look', resolution: { resultType: 'atmosphere', narration: 'Stillness.' } }] }],
  graph: { entry: 'one', edges: [] }
});

console.log('\n=== Storyline v2 session lifecycle ===');

test('allows only authored lifecycle transitions', () => {
  assert.strictEqual(canTransition('active', 'paused'), true);
  assert.strictEqual(canTransition('active', 'completed'), true);
  assert.strictEqual(canTransition('completed', 'active'), false);
  const paused = transitionSession({ lifecycle: 'active', sceneId: 'one' }, 'paused');
  assert.strictEqual(paused.lifecycle, 'paused');
  assert.throws(() => transitionSession(paused, 'completed'), /Invalid session lifecycle transition/);
});

test('rejects action resolution while a session is paused', () => {
  const state = createState(adventure, { lifecycle: 'paused' });
  const catalog = buildCatalog(adventure, state);
  const result = resolveTurn({ adventure, state, actionId: 'look', catalogVersion: catalog.catalogVersion, turnId: 'paused-turn' });
  assert.strictEqual(result.result.error, 'SESSION_NOT_PLAYABLE');
  assert.strictEqual(result.state.lifecycle, 'paused');
});

test('preserves idempotent result lookup before lifecycle rejection', () => {
  const state = createState(adventure);
  const catalog = buildCatalog(adventure, state);
  const first = resolveTurn({ adventure, state, actionId: 'look', catalogVersion: catalog.catalogVersion, turnId: 'same-turn' });
  const paused = { ...first.state, lifecycle: 'paused' };
  const retry = resolveTurn({ adventure, state: paused, actionId: 'look', catalogVersion: catalog.catalogVersion, turnId: 'same-turn' });
  assert.strictEqual(retry.resultType, first.result.resultType);
});
