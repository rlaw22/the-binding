'use strict';

const assert = require('assert');
const {
  compileAdventure, createState, buildCatalog, resolveTurn, matchFreeText
} = require('../src/storyline-v2');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

const raw = {
  schemaVersion: '2.0', adventureId: 'test-book', title: 'Test Book',
  classes: [{ classId: 'scholar' }, { classId: 'rogue' }],
  items: { brass_key: { name: 'Brass Key' } },
  prologue: { startingSceneId: 'study' },
  graph: { entry: 'study', edges: [{ edgeId: 'study-to-hall', from: 'study', to: 'hall', trigger: { actionId: 'leave_study', requires: [{ kind: 'discovery', id: 'letter' }] } }] },
  scenes: [
    { sceneId: 'study', name: 'Study', actions: [
      { actionId: 'read_letter', contentId: 'letter', type: 'exploration', category: 'lore', label: 'Read the letter', keywords: ['letter', 'read'], resolution: { resultType: 'discovery', narration: 'The letter reveals a route.', discover: ['letter'] } },
      { actionId: 'find_key', contentId: 'key', type: 'collectible', category: 'class', label: 'Find the brass key', availability: { classes: ['rogue'] }, resolution: { resultType: 'acquisition', narration: 'You find the key.', addItems: ['brass_key'] } },
      { actionId: 'leave_study', type: 'exit', category: 'exit', label: 'Leave the study', requires: [{ kind: 'discovery', id: 'letter' }], resolution: { resultType: 'exit', narration: 'You leave.' } },
      { actionId: 'touch_portrait', contentId: 'portrait', type: 'atmosphere', category: 'atmosphere', label: 'Touch the portrait', resolution: { resultType: 'atmosphere', narration: 'Dust falls from the frame.' } }
    ] },
    { sceneId: 'hall', name: 'Hall', actions: [{ actionId: 'look_down_hall', type: 'atmosphere', label: 'Look down the hall', resolution: { resultType: 'atmosphere', narration: 'The hall waits.' } }] }
  ]
};

console.log('\n=== Storyline v2 core ===');

test('compiles a valid data-only manifest', () => {
  const adventure = compileAdventure(raw);
  assert.strictEqual(adventure.adventureId, 'test-book');
  assert.ok(adventure.scenes.study);
});

test('rejects invalid references before gameplay', () => {
  assert.throws(() => compileAdventure({ ...raw, items: {}, scenes: [{ ...raw.scenes[0], actions: [{ ...raw.scenes[0].actions[1], resolution: { addItems: ['missing'] } }] }] }), error => error.code === 'MANIFEST_INVALID' && error.errors.some(item => item.message.includes('Unknown item')));
});

test('builds a server-owned catalog with stable IDs', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure, { classId: 'scholar' });
  const catalog = buildCatalog(adventure, state);
  assert.ok(catalog.actions.some(action => action.actionId === 'read_letter'));
  assert.strictEqual(catalog.actions.find(action => action.actionId === 'read_letter').sceneId, 'study');
});

test('discovery resolves once and disappears from the next catalog', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure, { classId: 'scholar' });
  const result = resolveTurn({ adventure, state, actionId: 'read_letter', catalogVersion: state.catalogVersion, turnId: 'turn-1' });
  assert.deepStrictEqual(result.result.stateChanges.discoveredContentIds, ['letter']);
  assert.ok(!result.result.catalog.actions.some(action => action.actionId === 'read_letter'));
  assert.ok(result.state.discoveredContentIds.includes('letter'));
});

test('class actions are contextual and unavailable to another class', () => {
  const adventure = compileAdventure(raw);
  const scholar = createState(adventure, { classId: 'scholar' });
  const rogue = createState(adventure, { classId: 'rogue' });
  assert.ok(!buildCatalog(adventure, scholar).actions.some(action => action.actionId === 'find_key'));
  assert.ok(buildCatalog(adventure, rogue).actions.some(action => action.actionId === 'find_key'));
});

test('collectibles use explicit deterministic inventory effects', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure, { classId: 'rogue' });
  const result = resolveTurn({ adventure, state, actionId: 'find_key', catalogVersion: state.catalogVersion, turnId: 'turn-key' });
  assert.deepStrictEqual(result.state.inventory, ['brass_key']);
  assert.deepStrictEqual(result.result.stateChanges.itemsAdded, ['brass_key']);
});

test('scene transitions require authored conditions and invalidate the old catalog', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure, { classId: 'scholar' });
  const first = resolveTurn({ adventure, state, actionId: 'read_letter', catalogVersion: state.catalogVersion, turnId: 't1' });
  const second = resolveTurn({ adventure, state: first.state, actionId: 'leave_study', catalogVersion: first.state.catalogVersion, turnId: 't2' });
  assert.strictEqual(second.result.transition.destinationSceneId, 'hall');
  assert.strictEqual(second.state.sceneId, 'hall');
  assert.strictEqual(resolveTurn({ adventure, state: second.state, actionId: 'read_letter', catalogVersion: first.state.catalogVersion, turnId: 'stale' }).result.error, 'STALE_CATALOG');
});

test('retries return the original result without applying effects twice', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure, { classId: 'scholar' });
  const first = resolveTurn({ adventure, state, actionId: 'read_letter', catalogVersion: state.catalogVersion, turnId: 'same-turn' });
  const retry = resolveTurn({ adventure, state: first.state, actionId: 'read_letter', catalogVersion: first.state.catalogVersion, turnId: 'same-turn' });
  assert.deepStrictEqual(retry, first.result);
});

test('free text matches only one current legal action', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure, { classId: 'scholar' });
  const catalog = buildCatalog(adventure, state);
  const definitions = adventure.scenes.study.actions;
  assert.strictEqual(matchFreeText('please read the letter', catalog, definitions).status, 'matched');
  assert.strictEqual(matchFreeText('go somewhere', catalog, definitions).status, 'no_match');
});

test('unmatched text cannot mutate state', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure, { classId: 'scholar' });
  const before = JSON.stringify(state);
  const match = matchFreeText('I teleport to the castle and create a sword', buildCatalog(adventure, state), adventure.scenes.study.actions);
  assert.strictEqual(match.status, 'no_match');
  assert.strictEqual(JSON.stringify(state), before);
});
