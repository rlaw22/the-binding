'use strict';

const assert = require('assert');
const { compileAdventure, createState } = require('../src/storyline-v2');
const { StorylineV2Service } = require('../src/storyline-v2/service');
const { createStorylineV2Service } = require('../src/storyline-v2/adventures');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

const adventure = compileAdventure({
  schemaVersion: '2.0', adventureId: 'service-test', title: 'Service Test',
  classes: ['scholar'], items: { token: { name: 'Token' } }, prologue: { startingSceneId: 'one' },
  scenes: [
    { sceneId: 'one', actions: [
      { actionId: 'inspect', label: 'Inspect the room', keywords: ['inspect'], resolution: { resultType: 'discovery', narration: 'You inspect the room.', discover: ['room'] } },
      { actionId: 'test_lock', label: 'Test the lock', resolution: { check: {
        ability: 'observe', difficulty: 15, seed: 'check-seed',
        onSuccess: { resultType: 'check_success', narration: 'The lock opens.', addItems: ['token'] },
        onFailure: { resultType: 'check_failure', narration: 'The lock stays shut.', hp: -1 }
      } } },
      { actionId: 'leave', type: 'exit', label: 'Leave the room', resolution: { resultType: 'exit', narration: 'You leave.' } }
    ] }
  ], graph: { entry: 'one', edges: [] }
});

console.log('\n=== Storyline v2 service ===');

test('starts an isolated session and returns a server catalog', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  const snapshot = service.start({ adventureId: adventure.adventureId, sessionId: 's1', classId: 'scholar' });
  assert.strictEqual(snapshot.catalog.sceneId, 'one');
  assert.ok(snapshot.catalog.actions.some(action => action.actionId === 'inspect'));
});

test('resolves button actions and makes retries idempotent', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  const start = service.start({ adventureId: adventure.adventureId, sessionId: 's2', classId: 'scholar' });
  const first = service.submit({ sessionId: 's2', actionId: 'inspect', catalogVersion: start.catalog.catalogVersion, turnId: 't1' });
  const retry = service.submit({ sessionId: 's2', actionId: 'inspect', catalogVersion: first.catalog.catalogVersion, turnId: 't1' });
  assert.strictEqual(first.resultType, 'discovery');
  assert.strictEqual(retry.resultType, first.resultType);
  assert.strictEqual(retry.turnId, first.turnId);
  assert.deepStrictEqual(retry.state, first.state);
});

test('resolves deterministic checks through the service and replays the settled result', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  const start = service.start({ adventureId: adventure.adventureId, sessionId: 'check-service', classId: 'scholar' });
  const first = service.submit({ sessionId: 'check-service', actionId: 'test_lock', catalogVersion: start.catalog.catalogVersion, turnId: 'check-turn' });
  assert.strictEqual(first.resultType, 'check_success');
  assert.strictEqual(first.check.roll, 20);
  assert.strictEqual(first.check.total, 20);
  assert.deepStrictEqual(first.state.inventory, ['token']);
  const retry = service.submit({ sessionId: 'check-service', actionId: 'test_lock', catalogVersion: first.catalog.catalogVersion, turnId: 'check-turn' });
  assert.deepStrictEqual(retry, first);
});

test('resolves only clear text matches through the same action boundary', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  service.start({ adventureId: adventure.adventureId, sessionId: 's3', classId: 'scholar' });
  const result = service.submitText({ sessionId: 's3', text: 'inspect the room', turnId: 't1' });
  assert.strictEqual(result.status, 'matched');
  assert.strictEqual(result.result.resultType, 'discovery');
});

test('factory compiles and registers Dracula without legacy session logic', () => {
  const service = createStorylineV2Service();
  const snapshot = service.start({ adventureId: 'dracula', sessionId: 'dracula-service-test', classId: 'cleric' });
  assert.strictEqual(snapshot.adventureId, 'dracula');
  assert.strictEqual(snapshot.state.sceneId, 'scene_00');
  assert.ok(snapshot.catalog.actions.some(action => action.type === 'class'));
});

test('exports and imports a complete session bundle', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  service.start({ adventureId: adventure.adventureId, sessionId: 'bundle-a', classId: 'scholar' });
  service.start({ adventureId: adventure.adventureId, sessionId: 'bundle-b', classId: 'scholar' });
  const bundle = service.exportAll();
  assert.strictEqual(bundle.schemaVersion, 'storyline-v2-sessions:1');
  assert.strictEqual(bundle.sessions.length, 2);
  service.clear();
  assert.deepStrictEqual(service.importAll(bundle).sort(), ['bundle-a', 'bundle-b']);
  assert.strictEqual(service.snapshot('bundle-a').state.sceneId, 'one');
});

test('exports and imports canonical session state', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  service.start({ adventureId: adventure.adventureId, sessionId: 's4', classId: 'scholar' });
  const exported = service.exportState('s4');
  const restored = new StorylineV2Service({ [adventure.adventureId]: adventure });
  assert.strictEqual(restored.importState({ sessionId: 's4-restored', adventureId: adventure.adventureId, state: exported.state }).state.sceneId, 'one');
});

test('persists lifecycle transitions through the repository', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  service.start({ adventureId: adventure.adventureId, sessionId: 'lifecycle-service', classId: 'scholar' });
  assert.strictEqual(service.pause('lifecycle-service').state.lifecycle, 'paused');
  assert.strictEqual(service.snapshot('lifecycle-service').state.lifecycle, 'paused');
  assert.strictEqual(service.resume('lifecycle-service').state.lifecycle, 'active');
  assert.throws(() => service.transition({ sessionId: 'lifecycle-service', to: 'archived' }), /Invalid session lifecycle transition/);
});
