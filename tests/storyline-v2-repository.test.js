'use strict';

const assert = require('assert');
const { InMemorySessionRepository } = require('../src/storyline-v2/application/repositories/session-repository');
const { StorylineV2Service } = require('../src/storyline-v2/application/service');
const { compileAdventure } = require('../src/storyline-v2/domain');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

const adventure = compileAdventure({
  schemaVersion: '2.0', adventureId: 'repository-test', title: 'Repository Test',
  classes: ['scholar'], items: {}, prologue: { startingSceneId: 'study' },
  scenes: [{ sceneId: 'study', actions: [{
    actionId: 'look', label: 'Look around', resolution: { resultType: 'atmosphere', narration: 'Dust moves.' }
  }] }],
  graph: { entry: 'study', edges: [] }
});

console.log('\n=== Storyline v2 repository boundary ===');

test('repository clones values at save and read boundaries', () => {
  const repository = new InMemorySessionRepository();
  const value = { state: { sceneId: 'study', flags: {} } };
  repository.save('session-1', value);
  value.state.sceneId = 'mutated-after-save';
  const loaded = repository.get('session-1');
  loaded.state.flags.changed = true;
  assert.strictEqual(repository.get('session-1').state.sceneId, 'study');
  assert.deepStrictEqual(repository.get('session-1').state.flags, {});
});

test('service uses the injected repository for lifecycle and resolution', () => {
  const repository = new InMemorySessionRepository();
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure }, { sessionRepository: repository });
  const start = service.start({ adventureId: adventure.adventureId, sessionId: 'session-2' });
  service.submit({ sessionId: 'session-2', actionId: 'look', catalogVersion: start.catalog.catalogVersion, turnId: 'turn-1' });
  const stored = repository.get('session-2');
  assert.strictEqual(stored.state.turnNumber, 1);
  assert.strictEqual(stored.state.processedTurns['turn-1'].actionId, 'look');
});

test('repository entries support deterministic export ordering', () => {
  const repository = new InMemorySessionRepository();
  repository.save('a', { order: 1 });
  repository.save('b', { order: 2 });
  assert.deepStrictEqual(repository.entries(), [
    { sessionId: 'a', value: { order: 1 } },
    { sessionId: 'b', value: { order: 2 } }
  ]);
});
