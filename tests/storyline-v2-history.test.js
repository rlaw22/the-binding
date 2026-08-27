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
  scenes: [{ sceneId: 'study', actions: [{ actionId: 'look', label: 'Look', replay: 'repeatable', resolution: { resultType: 'atmosphere', narration: 'Dust moves.' } }] }],
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

test('action resolutions and manual entries form append-only session history', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  const start = service.start({ adventureId: adventure.adventureId, sessionId: 'history-3' });
  const afterAction = service.submit({ sessionId: 'history-3', actionId: 'look', catalogVersion: start.catalog.catalogVersion, turnId: 'history-turn-1' });
  assert.strictEqual(afterAction.state.journal.length, 1);
  assert.deepStrictEqual(afterAction.state.journal[0], {
    entryId: 'turn:history-turn-1', actionId: 'look', text: 'Dust moves.', kind: 'action',
    turnNumber: 1, revision: 0, sceneId: 'study'
  });
  const snapshot = service.appendJournal({ sessionId: 'history-3', entry: { entryId: 'j1', actionId: 'look', text: 'A clue enters the journal.', kind: 'narrative' } });
  assert.strictEqual(snapshot.state.journal.length, 2);
  assert.strictEqual(snapshot.state.journal[1].entryId, 'j1');
  assert.strictEqual(snapshot.state.journal[1].revision, 1);
});

test('optional authored actions remain available while progression remains distinct', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  const start = service.start({ adventureId: adventure.adventureId, sessionId: 'history-5' });
  const optional = start.catalog.actions.find(action => action.actionId === 'look');
  assert.ok(optional);
  const afterAction = service.submit({ sessionId: 'history-5', actionId: optional.actionId, catalogVersion: start.catalog.catalogVersion, turnId: 'history-turn-2' });
  assert.ok(afterAction.catalog.actions.some(action => action.actionId === 'look'));
});

test('history snapshots are immutable across repository boundaries', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  service.start({ adventureId: adventure.adventureId, sessionId: 'history-4' });
  const snapshot = service.addBookmark({ sessionId: 'history-4', bookmarkId: 'b1' });
  snapshot.state.bookmarks[0].label = 'mutated';
  assert.strictEqual(service.snapshot('history-4').state.bookmarks[0].label, 'Bookmark 1');
});
