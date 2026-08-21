'use strict';

const assert = require('assert');
const { createStorylineV2ViewModel } = require('../src/storyline-v2/presentation');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

console.log('\n=== Storyline v2 presentation boundary ===');

test('maps authoritative snapshot data without exposing mutable source arrays', () => {
  const snapshot = {
    adventureId: 'book',
    state: {
      mode: 'storyline', sceneId: 'study', actId: 'act-1', turnNumber: 3,
      character: { hp: 12, maxHp: 20 }, inventory: ['key'],
      journal: { entries: [{ narrative: 'A clue.' }] },
      replayBookmarks: [{ bookmarkId: 'b1', label: 'The clue' }, { bookmarkId: 'b2', label: 'The door' }, { bookmarkId: 'b3', label: 'Too many' }]
    },
    catalog: {
      sceneId: 'study', sceneName: 'The Study', setting: 'Dust hangs in the light.',
      openingNarration: 'The room is still.', presentNpcs: ['Mina'], catalogVersion: 'study:3',
      actions: [{ actionId: 'look', type: 'exploration', label: 'Look around', subtitle: 'Search carefully' }]
    }
  };
  const model = createStorylineV2ViewModel(snapshot);
  assert.strictEqual(model.scene.name, 'The Study');
  assert.strictEqual(model.status.hp, 12);
  assert.strictEqual(model.actions[0].ariaLabel, 'Look around — Search carefully');
  assert.strictEqual(model.bookmarks.length, 2);
  model.scene.presentNpcs.push('Van Helsing');
  model.actions[0].label = 'Mutated';
  assert.deepStrictEqual(snapshot.catalog.presentNpcs, ['Mina']);
  assert.strictEqual(snapshot.catalog.actions[0].label, 'Look around');
});

test('provides safe defaults for optional presentation state', () => {
  const model = createStorylineV2ViewModel({ state: { sceneId: 'one', character: {} }, catalog: { sceneId: 'one', actions: [] } });
  assert.deepStrictEqual(model.journal, []);
  assert.deepStrictEqual(model.bookmarks, []);
  assert.strictEqual(model.presentBookmark.ariaLabel, 'Return to present');
});

test('rejects incomplete snapshots before rendering', () => {
  assert.throws(() => createStorylineV2ViewModel({ state: {} }), /snapshot is required/);
});
