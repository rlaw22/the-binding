'use strict';

const assert = require('assert');
const { compileAdventure, createState, resolveTurn, deterministicDie, resolveCheck } = require('../src/storyline-v2');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

const raw = {
  schemaVersion: '2.0', adventureId: 'check-book', title: 'Check Book',
  classes: [{ classId: 'traveller' }],
  prologue: { startingSceneId: 'crossroads' },
  graph: { entry: 'crossroads', edges: [] },
  scenes: [{ sceneId: 'crossroads', name: 'Crossroads', actions: [
    { actionId: 'open_gate', type: 'exploration', category: 'risk', label: 'Open the gate', resolution: {
      check: {
        ability: 'observe', difficulty: 15, seed: 'check-seed',
        onSuccess: { resultType: 'check_success', narration: 'The lock yields.', addItems: ['gate-key'], setFlags: { gate_open: true } },
        onFailure: { resultType: 'check_failure', narration: 'The lock bites your hand.', hp: -2, setFlags: { gate_open: false } }
      }
    } }
  ]}],
  items: { 'gate-key': { name: 'Gate Key' } }
};

console.log('\n=== Storyline v2 deterministic checks ===');

test('derives a stable die result from the authored seed', () => {
  assert.strictEqual(deterministicDie({ seed: 'check-seed', sides: 20 }), 20);
  assert.strictEqual(deterministicDie({ seed: 'check-seed', sides: 20 }), 20);
});

test('resolves check arithmetic without mutating the input state', () => {
  const state = createState(compileAdventure(raw), { classId: 'traveller', abilities: [] });
  const before = JSON.stringify(state);
  const result = resolveCheck({ check: { ability: 'observe', difficulty: 15, seed: 'check-seed' }, state, actionId: 'open_gate', turnId: 't1' });
  assert.deepStrictEqual({ roll: result.roll, capability: result.capability, total: result.total, success: result.success }, { roll: 20, capability: 0, total: 20, success: true });
  assert.strictEqual(JSON.stringify(state), before);
});

test('applies only the authored success branch and exposes the check record', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure, { classId: 'traveller', sessionId: 's-success' });
  const result = resolveTurn({ adventure, state, actionId: 'open_gate', catalogVersion: state.catalogVersion, turnId: 'success-turn' });
  assert.strictEqual(result.result.resultType, 'check_success');
  assert.strictEqual(result.result.check.success, true);
  assert.deepStrictEqual(result.state.inventory, ['gate-key']);
  assert.strictEqual(result.state.character.hp, 20);
  assert.strictEqual(result.state.flags.gate_open, true);
});

test('applies only the authored failure branch deterministically', () => {
  const adventure = compileAdventure({ ...raw, scenes: [{ ...raw.scenes[0], actions: [{ ...raw.scenes[0].actions[0], resolution: { ...raw.scenes[0].actions[0].resolution, check: { ...raw.scenes[0].actions[0].resolution.check, seed: 'failure' } } }] }] });
  const state = createState(adventure, { classId: 'traveller', sessionId: 's-failure' });
  const result = resolveTurn({ adventure, state, actionId: 'open_gate', catalogVersion: state.catalogVersion, turnId: 'failure-turn' });
  assert.strictEqual(result.result.resultType, 'check_failure');
  assert.strictEqual(result.result.check.success, false);
  assert.strictEqual(result.state.character.hp, 18);
  assert.strictEqual(result.result.stateChanges.hp, -2);
  assert.deepStrictEqual(result.state.inventory, []);
  assert.strictEqual(result.state.flags.gate_open, false);
});

test('rejects unknown abilities and invalid difficulty', () => {
  const state = createState(compileAdventure(raw), { classId: 'traveller' });
  assert.throws(() => resolveCheck({ check: { ability: 'luck', difficulty: 10 }, state }), /Unknown check ability/);
  assert.throws(() => resolveCheck({ check: { ability: 'observe', difficulty: -1 }, state }), /difficulty/);
});

test('clamps authored HP and coin effects to valid session bounds', () => {
  const adventure = compileAdventure({ ...raw, scenes: [{ ...raw.scenes[0], actions: [{
    ...raw.scenes[0].actions[0], resolution: {
      check: {
        ability: 'observe', difficulty: 0, seed: 'check-seed',
        onSuccess: { resultType: 'check_success', hp: 50, coins: -50 },
        onFailure: { resultType: 'check_failure' }
      }
    }
  }] }] });
  const state = createState(adventure, { classId: 'traveller', hp: 19, maxHp: 20, coins: 3 });
  const result = resolveTurn({ adventure, state, actionId: 'open_gate', catalogVersion: state.catalogVersion, turnId: 'bounds-turn' });
  assert.strictEqual(result.state.character.hp, 20);
  assert.strictEqual(result.state.coins, 0);
  assert.strictEqual(result.result.stateChanges.hp, 1);
  assert.strictEqual(result.result.stateChanges.coins, -3);
});

test('enters authored recovery when HP reaches zero and resumes only through recovery actions', () => {
  const recoveryAdventure = compileAdventure({
    schemaVersion: '2.0', adventureId: 'recovery-book', title: 'Recovery Book', classes: ['traveller'],
    prologue: { startingSceneId: 'camp' }, graph: { entry: 'camp', edges: [] }, items: {},
    scenes: [{ sceneId: 'camp', actions: [
      { actionId: 'danger', type: 'threat', label: 'Face the danger', resolution: { hp: -20, resultType: 'setback', narration: 'The danger overwhelms you.' } },
      { actionId: 'recover', type: 'recovery', category: 'recovery', label: 'Accept help', resolution: { hp: 5, resultType: 'recovery', narration: 'A companion helps you stand.' } }
    ] }]
  });
  let state = createState(recoveryAdventure, { classId: 'traveller', hp: 5, maxHp: 10 });
  const danger = resolveTurn({ adventure: recoveryAdventure, state, actionId: 'danger', catalogVersion: state.catalogVersion, turnId: 'danger-turn' });
  assert.strictEqual(danger.state.character.hp, 0);
  assert.strictEqual(danger.state.lifecycle, 'awaiting_recovery');
  assert.ok(danger.result.catalog.actions.some(action => action.actionId === 'recover'));
  state = danger.state;
  const recovery = resolveTurn({ adventure: recoveryAdventure, state, actionId: 'recover', catalogVersion: state.catalogVersion, turnId: 'recovery-turn' });
  assert.strictEqual(recovery.state.character.hp, 5);
  assert.strictEqual(recovery.state.lifecycle, 'active');
  assert.strictEqual(recovery.result.resultType, 'recovery');
});

test('rejects malformed authored check branches before gameplay', () => {
  const malformed = {
    ...raw,
    scenes: [{ ...raw.scenes[0], actions: [{
      ...raw.scenes[0].actions[0],
      resolution: { check: { ability: 'luck', difficulty: 1, onSuccess: { teleport: true } } }
    }] }]
  };
  assert.throws(() => compileAdventure(malformed), error => error.code === 'MANIFEST_INVALID' && error.errors.some(item => item.message.includes('Unsupported check ability')) && error.errors.some(item => item.message.includes('Authored check branch is required')));
});
