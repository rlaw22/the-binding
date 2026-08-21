'use strict';

const assert = require('assert');
const { buildDraculaManifest, compileDracula, sourceScenes } = require('../src/storyline-v2/dracula-adapter');
const { createState, buildCatalog, resolveTurn } = require('../src/storyline-v2');

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

test('preserves the connected backbone and makes every terminal exit explicit', () => {
  const adventure = compileDracula();
  const scenes = Object.values(adventure.scenes);
  assert.strictEqual(adventure.graph.entry, 'scene_00');
  assert.strictEqual(adventure.graph.edges.length, scenes.length - 1 + 3);
  assert.strictEqual(scenes.filter(scene => adventure.graph.edges.some(edge => edge.from === scene.sceneId)).length, scenes.length - 1);
  assert.strictEqual(scenes.filter(scene => !adventure.graph.edges.some(edge => edge.from === scene.sceneId)).map(scene => scene.sceneId).join(','), 'scene_24');
  const terminal = adventure.scenes.scene_24;
  const terminalExit = terminal.actions.find(action => action.type === 'exit');
  assert.ok(terminalExit);
  assert.strictEqual(terminalExit.resolution.resultType, 'exit');
  assert.deepStrictEqual(terminalExit.resolution.endingRules.map(rule => rule.endingId), ['dracula_destroyed', 'mina_lost']);
  assert.deepStrictEqual(terminalExit.resolution.endingRules[0].requires, [
    { kind: 'flag', id: 'protected_mina', equals: true },
    { kind: 'flag', id: 'fast_route', equals: true }
  ]);
});

test('adds authored converging branches at the counter-attack and pursuit', () => {
  const adventure = compileDracula();
  const branchIds = adventure.graph.edges.filter(edge => edge.edgeId.includes('honor_release') || edge.edgeId.includes('hold_line') || edge.edgeId.includes('fast_route')).map(edge => edge.trigger.actionId).sort();
  assert.deepStrictEqual(branchIds, ['scene_14__honor_lucys_release', 'scene_18__hold_the_line', 'scene_20__charter_fast_route']);
  assert.strictEqual(adventure.scenes.scene_14.actions.find(action => action.actionId === 'scene_14__honor_lucys_release').resolution.setFlags.lucy_ritual_prepared, true);
  assert.strictEqual(adventure.scenes.scene_18.actions.find(action => action.actionId === 'scene_18__hold_the_line').resolution.setFlags.protected_mina, true);
  assert.strictEqual(adventure.scenes.scene_20.actions.find(action => action.actionId === 'scene_20__charter_fast_route').resolution.setFlags.fast_route, true);
  assert.deepStrictEqual(Object.keys(adventure.endings).sort(), ['dracula_destroyed', 'mina_lost']);
});

test('resolves authored branch actions into converged scenes and flags', () => {
  const adventure = compileDracula();
  const state = createState(adventure, { sceneId: 'scene_18', classId: 'cleric', flags: { mina_taken: true } });
  const catalog = buildCatalog(adventure, state);
  const result = resolveTurn({ adventure, state, actionId: 'scene_18__hold_the_line', catalogVersion: catalog.catalogVersion, turnId: 'branch-18' });
  assert.strictEqual(result.state.sceneId, 'scene_19');
  assert.strictEqual(result.state.flags.protected_mina, true);
  assert.strictEqual(result.result.transition.destinationSceneId, 'scene_19');

  const pursuit = createState(adventure, { sceneId: 'scene_20', classId: 'rogue', flags: { mina_blood_bond: true } });
  const pursuitCatalog = buildCatalog(adventure, pursuit);
  const pursuitResult = resolveTurn({ adventure, state: pursuit, actionId: 'scene_20__charter_fast_route', catalogVersion: pursuitCatalog.catalogVersion, turnId: 'branch-20' });
  assert.strictEqual(pursuitResult.state.sceneId, 'scene_21');
  assert.strictEqual(pursuitResult.state.flags.fast_route, true);

  const terminal = createState(adventure, { sceneId: 'scene_24', classId: 'fighter', flags: { protected_mina: true, fast_route: true } });
  const terminalCatalog = buildCatalog(adventure, terminal);
  assert.ok(terminalCatalog.actions.some(action => action.type === 'exit'));
  const success = resolveTurn({ adventure, state: terminal, actionId: 'scene_24__witness_sunrise', catalogVersion: terminalCatalog.catalogVersion, turnId: 'ending-success' });
  assert.strictEqual(success.result.endingId, 'dracula_destroyed');

  const failureState = createState(adventure, { sceneId: 'scene_24', classId: 'fighter' });
  const failureCatalog = buildCatalog(adventure, failureState);
  const failure = resolveTurn({ adventure, state: failureState, actionId: 'scene_24__witness_sunrise', catalogVersion: failureCatalog.catalogVersion, turnId: 'ending-failure' });
  assert.strictEqual(failure.result.endingId, 'mina_lost');
  assert.ok(failure.result.narrative.toLowerCase().includes('bound to him'));
});

test('completes an enabled-mode success journey through authored branches', () => {
  const adventure = compileDracula();
  let state = createState(adventure, { classId: 'cleric' });
  let ending = null;
  for (let step = 0; step < 40 && !ending; step += 1) {
    const catalog = buildCatalog(adventure, state);
    const actionId = state.sceneId === 'scene_18'
      ? 'scene_18__hold_the_line'
      : state.sceneId === 'scene_20'
        ? 'scene_20__charter_fast_route'
        : catalog.actions.find(action => action.type === 'exit')?.actionId;
    assert.ok(actionId, `No progression action at ${state.sceneId}`);
    const turn = resolveTurn({ adventure, state, actionId, catalogVersion: catalog.catalogVersion, turnId: `journey-${step}` });
    state = turn.state;
    ending = turn.result.endingId;
  }
  assert.strictEqual(state.sceneId, 'scene_24');
  assert.strictEqual(ending, 'dracula_destroyed');
});

test('authors an opening investigation check through the universal resolver', () => {
  const adventure = compileDracula();
  const opening = adventure.scenes.scene_00;
  const checkAction = opening.actions.find(action => action.actionId === 'scene_00__study_guestbook');
  assert.ok(checkAction);
  assert.strictEqual(checkAction.resolution.check.ability, 'investigate');
  assert.ok(checkAction.resolution.check.onSuccess);
  assert.ok(checkAction.resolution.check.onFailure);
  const state = createState(adventure, { sceneId: 'scene_00', classId: 'cleric', abilities: [] });
  const result = resolveTurn({ adventure, state, actionId: checkAction.actionId, catalogVersion: state.catalogVersion, turnId: 'guestbook-check' });
  assert.strictEqual(result.result.check.success, false);
  assert.strictEqual(result.result.resultType, 'check_failure');
  assert.strictEqual(result.state.character.hp, 19);
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
