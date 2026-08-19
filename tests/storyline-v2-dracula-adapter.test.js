'use strict';

const assert = require('assert');
const { buildDraculaManifest, compileDracula, sourceScenes } = require('../src/storyline-v2/dracula-adapter');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

console.log('\n=== Storyline v2 Dracula adapter ===');

test('loads the complete authored Dracula scene source', () => {
  assert.ok(sourceScenes().length >= 25);
  assert.strictEqual(sourceScenes()[0].sceneId, 'scene_00');
});

test('produces a data-only v2 manifest', () => {
  const manifest = buildDraculaManifest();
  assert.strictEqual(manifest.schemaVersion, '2.0');
  assert.strictEqual(manifest.adventureId, 'dracula');
  assert.ok(manifest.scenes.every(scene => scene.actions.every(action => action.actionId && action.resolution)));
});

test('compiles Dracula through the universal compiler', () => {
  const adventure = compileDracula();
  assert.strictEqual(adventure.adventureId, 'dracula');
  assert.ok(Object.keys(adventure.scenes).length >= 25);
  assert.ok(Object.keys(adventure.items).length > 0);
  assert.ok(adventure.graph.edges.length > 0);
});

test('preserves a connected provisional scene graph and makes every terminal exit explicit', () => {
  const adventure = compileDracula();
  const scenes = Object.values(adventure.scenes);
  assert.strictEqual(adventure.graph.entry, 'scene_00');
  assert.strictEqual(adventure.graph.edges.length, scenes.length - 1);
  assert.strictEqual(scenes.filter(scene => adventure.graph.edges.some(edge => edge.from === scene.sceneId)).length, scenes.length - 1);
  assert.strictEqual(scenes.filter(scene => !adventure.graph.edges.some(edge => edge.from === scene.sceneId)).map(scene => scene.sceneId).join(','), 'scene_24');
  const terminal = adventure.scenes.scene_24;
  const terminalExit = terminal.actions.find(action => action.type === 'exit');
  assert.ok(terminalExit);
  assert.strictEqual(terminalExit.resolution.resultType, 'exit');
});

test('namespaces migrated discoveries and provides four meaningful opening class actions', () => {
  const adventure = compileDracula();
  const opening = adventure.scenes.scene_00;
  const classActions = opening.actions.filter(action => action.type === 'class');
  assert.deepStrictEqual(classActions.map(action => action.availability.classes[0]).sort(), ['cleric', 'fighter', 'mage', 'rogue']);
  const discovered = opening.actions.filter(action => (action.resolution.discover || []).length);
  assert.ok(discovered.length > 0);
  assert.ok(discovered.every(action => action.resolution.discover[0].startsWith('scene_00__')));
});
