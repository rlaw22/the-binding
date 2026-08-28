'use strict';

const assert = require('assert');
const { compileAdventure, createState, buildCatalog, resolveTurn } = require('../src/storyline-v2');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

const raw = {
  schemaVersion: '2.0', adventureId: 'stateful-test', title: 'Stateful Test',
  publicationMode: 'compatibility', classes: [], items: {},
  prologue: { startingSceneId: 'inn' }, graph: { entry: 'inn', edges: [] },
  scenes: [{
    sceneId: 'inn', name: 'The Inn', setting: 'A narrow inn with a letter, a shuttered window, and a coach waiting outside.',
    threads: [
      { threadId: 'letter', status: 'dormant' },
      { threadId: 'warning', status: 'dormant' }
    ],
    affordances: [
      { affordanceId: 'room', kind: 'core', persistent: true },
      { affordanceId: 'letter', kind: 'discovery', threadId: 'letter' },
      { affordanceId: 'warning', kind: 'contextual', threadId: 'warning' }
    ],
    actions: [
      { actionId: 'look_inn', type: 'atmosphere', category: 'atmosphere', label: 'Look around the inn', affordanceId: 'room', affordanceKind: 'core', persistent: true, replay: 'repeatable', resolution: { resultType: 'atmosphere', narration: 'The landlord watches the shutter, and the coachman calls from outside.' } },
      { actionId: 'read_letter', type: 'exploration', category: 'lore', label: 'Read the letter', affordanceId: 'letter', affordanceKind: 'discovery', threadId: 'letter', replay: 'consumable', threadEffects: { activate: true }, resolution: { resultType: 'discovery', narration: 'The letter names the pass and the hour.', discover: ['letter_read'] } },
      { actionId: 'ask_warning', type: 'exploration', category: 'exploration', label: 'Ask about the warning', affordanceId: 'warning', affordanceKind: 'contextual', threadId: 'warning', replay: 'consumable', threadEffects: { resolve: true }, resolution: { resultType: 'discovery', narration: 'The innkeeper presses a crucifix into your hand.', discover: ['warning_heard'] } }
    ]
  }]
};

console.log('\n=== Storyline v2 stateful scene affordances ===');

test('preserves explicit threads and affordances through compilation', () => {
  const adventure = compileAdventure(raw);
  assert.strictEqual(adventure.scenes.inn.threads[0].threadId, 'letter');
  assert.strictEqual(adventure.scenes.inn.affordances[0].affordanceId, 'room');
  assert.strictEqual(adventure.scenes.inn.actions[0].persistent, true);
});

test('retains a persistent core affordance after a local thread resolves', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure);
  const first = resolveTurn({ adventure, state, actionId: 'read_letter', catalogVersion: state.catalogVersion, turnId: 'read' });
  assert.strictEqual(first.state.localThreads.letter.status, 'active');
  assert.ok(first.result.catalog.actions.some(action => action.actionId === 'look_inn'));
  assert.ok(!first.result.catalog.actions.some(action => action.actionId === 'read_letter'));
});

test('supports thread requirements and deterministic lifecycle effects', () => {
  const manifest = { ...raw, scenes: [{ ...raw.scenes[0], actions: [...raw.scenes[0].actions, { actionId: 'follow_thread', type: 'atmosphere', category: 'atmosphere', label: 'Follow the warning thread', replay: 'repeatable', requires: [{ kind: 'thread', id: 'warning', status: 'resolved' }], resolution: { resultType: 'atmosphere', narration: 'The warning stays with you.' } }] }] };
  const adventure = compileAdventure(manifest);
  const state = createState(adventure);
  const result = resolveTurn({ adventure, state, actionId: 'ask_warning', catalogVersion: state.catalogVersion, turnId: 'warning' });
  assert.strictEqual(result.state.localThreads.warning.status, 'resolved');
  assert.ok(result.result.catalog.actions.some(action => action.actionId === 'follow_thread'));
});

test('allows catalogs with fewer than six meaningful actions without padding', () => {
  const adventure = compileAdventure(raw);
  assert.ok(buildCatalog(adventure, createState(adventure)).actions.length < 6);
});

test('strict authoring rejects unbounded repeatable affordances and missing closure metadata', () => {
  const invalid = {
    ...raw,
    publicationMode: 'new-book',
    scenes: [{
      ...raw.scenes[0],
      affordances: [{ affordanceId: 'room', kind: 'core', persistent: true }],
      actions: [{ ...raw.scenes[0].actions[0], resurface: null }]
    }]
  };
  assert.throws(() => compileAdventure(invalid), error => error.code === 'MANIFEST_INVALID' && error.errors.some(item => item.path.endsWith('.closure')) && error.errors.some(item => item.path.endsWith('.resurface')));
});
