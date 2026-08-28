'use strict';

const assert = require('assert');
const { createStorylineV2ViewModel, createStorylineV2ResultViewModel } = require('../src/storyline-v2/presentation');

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
      bookmarks: [{ bookmarkId: 'b1', label: 'The clue' }, { bookmarkId: 'b2', label: 'The door' }, { bookmarkId: 'b3', label: 'Too many' }]
    },
    catalog: {
      sceneId: 'study', sceneName: 'The Study', setting: 'Dust hangs in the light.',
      openingNarration: 'The room is still.', presentNpcs: ['Mina'], catalogVersion: 'study:3',
      threads: [{ threadId: 'door', label: 'The locked door', status: 'active' }, { threadId: 'letter', label: 'The letter', status: 'closed' }],
      actions: [{ actionId: 'look', type: 'exploration', label: 'Look around', subtitle: 'Search carefully', consequenceSummary: 'Reveals what the room is hiding.', laterBeat: 'The door' }]
    }
  };
  const model = createStorylineV2ViewModel(snapshot);
  assert.strictEqual(model.scene.name, 'The Study');
  assert.strictEqual(model.status.hp, 12);
  assert.strictEqual(model.actions[0].ariaLabel, 'Look around — Search carefully');
  assert.strictEqual(model.actions[0].consequenceSummary, 'Reveals what the room is hiding.');
  assert.strictEqual(model.textInput.enabled, true);
  assert.strictEqual(model.textInput.catalogVersion, 'study:3');
  assert.deepStrictEqual(model.textInput.legalActions, [{ actionId: 'look', label: 'Look around', shortLabel: 'Look around' }]);
  assert.strictEqual(model.textInput.hint, 'Describe one of the available actions in your own words.');
  assert.strictEqual(model.scene.unresolvedThreads.length, 1);
  assert.strictEqual(model.scene.unresolvedThreads[0].label, 'The locked door');
  assert.strictEqual(model.bookmarks.length, 2);
  assert.strictEqual(model.journal[0].narrative, 'A clue.');
  model.scene.presentNpcs.push('Van Helsing');
  model.actions[0].label = 'Mutated';
  model.bookmarks[0].label = 'Mutated bookmark';
  model.journal[0].narrative = 'Mutated journal';
  assert.deepStrictEqual(snapshot.catalog.presentNpcs, ['Mina']);
  assert.strictEqual(snapshot.catalog.actions[0].label, 'Look around');
  assert.strictEqual(snapshot.state.bookmarks[0].label, 'The clue');
  assert.strictEqual(snapshot.state.journal.entries[0].narrative, 'A clue.');
});

test('provides safe defaults for optional presentation state', () => {
  const model = createStorylineV2ViewModel({ state: { sceneId: 'one', character: {} }, catalog: { sceneId: 'one', actions: [] } });
  assert.deepStrictEqual(model.journal, []);
  assert.deepStrictEqual(model.bookmarks, []);
  assert.strictEqual(model.textInput.enabled, false);
  assert.deepStrictEqual(model.textInput.legalActions, []);
  assert.strictEqual(model.presentBookmark.ariaLabel, 'Return to present');
});

test('maps settled check results into accessible rendering data without recalculating them', () => {
  const result = createStorylineV2ResultViewModel({
    responseId: 'response:1', turnId: 'turn-1', actionId: 'inspect', resultType: 'check_failure',
    narrative: 'The lock resists.',
    check: { ability: 'investigate', roll: 12, modifier: 1, capability: 2, total: 15, difficulty: 18, success: false },
    stateChanges: { hp: -2, flags: { hurt: true } }
  });
  assert.deepStrictEqual(result.check, {
    ability: 'investigate', roll: 12, modifier: 1, capability: 2, total: 15,
    difficulty: 18, success: false, outcome: 'failure'
  });
  assert.strictEqual(result.narrative, 'The lock resists.');
  assert.strictEqual(result.stateChanges.hp, -2);
});

test('maps authored response continuity without recalculating runtime state', () => {
  const result = createStorylineV2ResultViewModel({
    resultType: 'exploration', narrative: 'The keeper answers in a whisper.',
    dramaticBeat: {
      reaction: 'The keeper glances toward the stair.',
      changedSituation: 'The house is no longer empty.',
      nextObjective: 'Decide whether to follow the sound.',
      nextQuestion: 'What waits above?'
    },
    stateChanges: { flags: { warned: true } }
  });
  assert.deepStrictEqual(result.continuity, {
    reaction: 'The keeper glances toward the stair.',
    changedSituation: 'The house is no longer empty.',
    nextObjective: 'Decide whether to follow the sound.',
    nextQuestion: 'What waits above?'
  });
});

test('rejects incomplete snapshots and results before rendering', () => {
  assert.throws(() => createStorylineV2ViewModel({ state: {} }), /snapshot is required/);
  assert.throws(() => createStorylineV2ResultViewModel(null), /result is required/);
});
