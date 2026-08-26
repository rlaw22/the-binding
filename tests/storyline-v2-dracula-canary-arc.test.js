'use strict';

const assert = require('assert');
const { buildDraculaCanaryManifest } = require('../src/storyline-v2/adapters/native-dracula-canary');
const { StorylineV2Service } = require('../src/storyline-v2/service');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

const adventure = buildDraculaCanaryManifest();
const arcIds = ['dracula_full_01', 'dracula_full_02', 'dracula_full_03', 'dracula_full_04', 'dracula_full_05'];

console.log('\n=== Dracula V2 authored first arc ===');

test('compiles five authored scenes with no chapter-placeholder opening', () => {
  arcIds.forEach((id, index) => {
    const scene = adventure.scenes[id];
    assert.ok(scene, `missing ${id}`);
    assert.ok(scene.openingNarration.length > 180, `${id} opening is too short`);
    assert.ok(!/^Chapter \d+:/i.test(scene.openingNarration), `${id} still exposes chapter metadata`);
    assert.strictEqual(scene.actions.length, 4);
    assert.ok(scene.actions.every(action => action.resolution.narration.length > 80));
    if (index < arcIds.length - 1) assert.ok(scene.actions.some(action => action.actionId === `${id}__continue`));
  });
});

test('all 27 chapter scenes are source-authored and publication-clean', () => {
  const placeholder = /chapter \d+|observe chapter|prepare for chapter|press chapter|follow the events into chapter/i;
  Object.values(adventure.scenes).forEach(scene => {
    assert.ok(scene.openingNarration.length > 180, `${scene.sceneId} opening is too short`);
    assert.ok(!placeholder.test(scene.openingNarration), `${scene.sceneId} retains placeholder opening`);
    assert.ok(scene.presentNpcs.length > 0, `${scene.sceneId} needs present characters`);
    assert.strictEqual(scene.actions.length, 4);
    assert.ok(scene.actions.every(action => action.role && action.replay), `${scene.sceneId} has incomplete agency metadata`);
    assert.ok(scene.actions.every(action => action.resolution && action.resolution.narration.length > 80), `${scene.sceneId} has weak action narration`);
  });
  assert.strictEqual(adventure.warnings.length, 0);
});

test('starts at the Golden Krone with server catalog and resolves authored state', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  const start = service.start({ adventureId: adventure.adventureId, sessionId: 'arc-service', classId: 'fighter' });
  assert.strictEqual(start.state.sceneId, 'dracula_full_01');
  assert.strictEqual(start.catalog.sceneName, 'The Golden Krone Inn');
  const landlord = start.catalog.actions.find(action => action.actionId.endsWith('__landlord'));
  const result = service.submit({ sessionId: 'arc-service', actionId: landlord.actionId, catalogVersion: start.catalog.catalogVersion, turnId: 'arc-landlord' });
  assert.strictEqual(result.resultType, 'discovery');
  assert.strictEqual(result.state.flags.landlord_warning_heard, true);
  assert.deepStrictEqual(result.state.inventory, ['protective_crucifix']);
  assert.ok(result.state.journal);
});

test('advances through all five scenes using only V2 catalog actions', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  let view = service.start({ adventureId: adventure.adventureId, sessionId: 'arc-route', classId: 'fighter' });
  arcIds.forEach((id, index) => {
    assert.strictEqual(view.state.sceneId, id);
    const next = view.catalog.actions.find(action => action.actionId === `${id}__continue`);
    assert.ok(next, `missing route action for ${id}`);
    const result = service.submit({ sessionId: 'arc-route', actionId: next.actionId, catalogVersion: view.catalog.catalogVersion, turnId: `arc-route-${index}` });
    assert.strictEqual(result.resultType, 'exit');
    view = service.snapshot('arc-route');
    if (index < arcIds.length - 1) assert.strictEqual(view.state.sceneId, arcIds[index + 1]);
  });
  assert.strictEqual(view.state.sceneId, 'dracula_full_06');
  assert.strictEqual(view.state.flags.met_dracula, true);
});

test('resolves both authored terminal outcomes without an accidental dead end', () => {
  const play = (sessionId, selected = {}) => {
    const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
    let view = service.start({ adventureId: adventure.adventureId, sessionId, classId: 'fighter' });
    for (let chapter = 1; chapter <= 26; chapter += 1) {
      const sceneId = `dracula_full_${String(chapter).padStart(2, '0')}`;
      assert.strictEqual(view.state.sceneId, sceneId);
      if (selected[chapter]) {
        const choice = view.catalog.actions.find(item => item.actionId === selected[chapter]);
        assert.ok(choice, `missing ${selected[chapter]}`);
        service.submit({ sessionId, actionId: choice.actionId, catalogVersion: view.catalog.catalogVersion, turnId: `${sessionId}-${chapter}-choice` });
        view = service.snapshot(sessionId);
      }
      const exit = view.catalog.actions.find(item => item.actionId === `${sceneId}__continue`);
      assert.ok(exit, `missing ${sceneId}__continue`);
      service.submit({ sessionId, actionId: exit.actionId, catalogVersion: view.catalog.catalogVersion, turnId: `${sessionId}-${chapter}-exit` });
      view = service.snapshot(sessionId);
    }
    const final = view.catalog.actions.find(item => item.actionId === 'dracula_full_27__resolve');
    assert.ok(final);
    return service.submit({ sessionId, actionId: final.actionId, catalogVersion: view.catalog.catalogVersion, turnId: `${sessionId}-final` });
  };
  const successful = play('full-success', {
    20: 'dracula_full_20__choose',
    21: 'dracula_full_21__investigate',
    26: 'dracula_full_26__choose'
  });
  assert.strictEqual(successful.endingId, 'dracula_destroyed');
  assert.strictEqual(successful.resultType, 'ending');
  const failed = play('full-failure');
  assert.strictEqual(failed.endingId, 'mina_lost');
  assert.strictEqual(failed.resultType, 'ending');
});

test('rejects stale catalogs and returns the current authoritative catalog', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  const start = service.start({ adventureId: adventure.adventureId, sessionId: 'arc-stale', classId: 'rogue' });
  const action = start.catalog.actions[0];
  service.submit({ sessionId: 'arc-stale', actionId: action.actionId, catalogVersion: start.catalog.catalogVersion, turnId: 'arc-stale-first' });
  const rejected = service.submit({ sessionId: 'arc-stale', actionId: action.actionId, catalogVersion: start.catalog.catalogVersion, turnId: 'arc-stale-second' });
  assert.strictEqual(rejected.rejected, true);
  assert.strictEqual(rejected.error, 'STALE_CATALOG');
  assert.strictEqual(rejected.state.revision, 1);
  assert.ok(rejected.catalog.actions.length > 0);
});

test('replays duplicate turn IDs without applying effects twice', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  const start = service.start({ adventureId: adventure.adventureId, sessionId: 'arc-idempotent', classId: 'cleric' });
  const action = start.catalog.actions.find(item => item.actionId.endsWith('__landlord'));
  const first = service.submit({ sessionId: 'arc-idempotent', actionId: action.actionId, catalogVersion: start.catalog.catalogVersion, turnId: 'arc-repeat' });
  const repeat = service.submit({ sessionId: 'arc-idempotent', actionId: action.actionId, catalogVersion: first.catalog.catalogVersion, turnId: 'arc-repeat' });
  assert.deepStrictEqual(repeat, first);
  assert.strictEqual(repeat.state.revision, 1);
  assert.ok(repeat.state.journal);
});
