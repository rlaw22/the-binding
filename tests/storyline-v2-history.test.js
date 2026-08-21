'use strict';

const assert = require('assert');
const { compileAdventure } = require('../src/storyline-v2/domain');
const { StorylineV2Service } = require('../src/storyline-v2/application/service');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

const adventure = compileAdventure({
  schemaVersion: '2.0', adventureId: 'history-contract', title: 'History Contract',
  classes: ['scholar'], items: {}, prologue: { startingSceneId: 'study' },
  scenes: [{ sceneId: 'study', actions: [{ actionId: 'look', label: 'Look', resolution: { resultType: 'atmosphere', narration: 'Dust moves.' } }] }],
  graph: { entry: 'study', edges: [] }
});

console.log('\n=== Storyline v2 history boundary ===');

test('stores bounded manual bookmarks at authoritative present state', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  service.start({ adventureId: adventure.adventureId, sessionId: 'history-1' });
  service.addBookmark({ sessionId: 'history-1', bookmarkId: 'b1', label: 'First clue' });
  const snapshot = service.addBookmark({ sessionId: 'history-1', bookmarkId: 'b2' });
  assert.strictEqual(snapshot.state.bookmarks.length, 2);
  assert.strictEqual(snapshot.state.bookmarks[0].sceneId, 'study');
  assert.strictEqual(snapshot.state.bookmarks[1].revision, snapshot.state.revision - 1);
  assert.throws(() => service.addBookmark({ sessionId: 'history-1', bookmarkId: 'b3' }), /limit reached/);
});

test('removes bookmarks as a revisioned mutation and rejects unknown IDs', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  service.start({ adventureId: adventure.adventureId, sessionId: 'history-2' });
  service.addBookmark({ sessionId: 'history-2', bookmarkId: 'b1' });
  const snapshot = service.removeBookmark({ sessionId: 'history-2', bookmarkId: 'b1' });
  assert.deepStrictEqual(snapshot.state.bookmarks, []);
  assert.strictEqual(snapshot.state.revision, 2);
  assert.throws(() => service.removeBookmark({ sessionId: 'history-2', bookmarkId: 'missing' }), /Unknown bookmark/);
});

test('journal entries are append-only session history and do not alter the folio', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  service.start({ adventureId: adventure.adventureId, sessionId: 'history-3' });
  const snapshot = service.appendJournal({ sessionId: 'history-3', entry: { entryId: 'j1', actionId: 'look', text: 'Dust moves.', kind: 'narrative' } });
  assert.deepStrictEqual(snapshot.state.journal, [{ entryId: 'j1', actionId: 'look', text: 'Dust moves.', kind: 'narrative', turnNumber: 0, revision: 0, sceneId: 'study' }]);
});

test('history snapshots are immutable across repository boundaries', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  service.start({ adventureId: adventure.adventureId, sessionId: 'history-4' });
  const snapshot = service.addBookmark({ sessionId: 'history-4', bookmarkId: 'b1' });
  snapshot.state.bookmarks[0].label = 'mutated';
  assert.strictEqual(service.snapshot('history-4').state.bookmarks[0].label, 'Bookmark 1');
});
