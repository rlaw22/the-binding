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
