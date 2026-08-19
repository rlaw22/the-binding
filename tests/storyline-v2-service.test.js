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
  classes: ['scholar'], items: {}, prologue: { startingSceneId: 'one' },
  scenes: [
    { sceneId: 'one', actions: [
      { actionId: 'inspect', label: 'Inspect the room', keywords: ['inspect'], resolution: { resultType: 'discovery', narration: 'You inspect the room.', discover: ['room'] } },
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

test('exports and imports canonical session state', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  service.start({ adventureId: adventure.adventureId, sessionId: 's4', classId: 'scholar' });
  const exported = service.exportState('s4');
  const restored = new StorylineV2Service({ [adventure.adventureId]: adventure });
  assert.strictEqual(restored.importState({ sessionId: 's4-restored', adventureId: adventure.adventureId, state: exported.state }).state.sceneId, 'one');
});
