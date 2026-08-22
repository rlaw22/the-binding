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

test('derives variable duration and content-scale metadata without imposing a scene count', () => {
  const adventure = compileAdventure(raw);
  assert.strictEqual(adventure.contentScale.runtimeSceneCount, 2);
  assert.strictEqual(adventure.contentScale.actionCount, 5);
  assert.strictEqual(adventure.contentScale.meaningfulDecisionCount, 3);
  assert.strictEqual(adventure.contentScale.optionalDiscoveryCount, 1);
  assert.ok(adventure.contentScale.wordCount > 0);
  assert.ok(adventure.estimatedDuration.typicalRouteMinutes > 0);
  assert.ok(Array.isArray(adventure.estimatedDuration.replayRangeMinutes));
  assert.strictEqual(adventure.estimatedDuration.routeCount, 1);
  assert.strictEqual(adventure.estimatedDuration.shortestRouteMinutes, adventure.estimatedDuration.longestRouteMinutes);
});

test('uses graph routes to distinguish short and long paths', () => {
  const branched = {
    ...raw,
    scenes: [
      ...raw.scenes,
      { sceneId: 'gallery', name: 'Gallery', setting: 'A long gallery filled with portraits, dust, locked doors, faded maps, cold drafts, and distant footsteps.', actions: [{ actionId: 'leave_gallery', type: 'exit', label: 'Leave the gallery', resolution: { resultType: 'exit', narration: 'You leave.' } }] }
    ],
    graph: {
      entry: 'study',
      edges: [
        { edgeId: 'short', from: 'study', to: 'hall', trigger: { actionId: 'leave_study' } },
        { edgeId: 'long', from: 'study', to: 'gallery', trigger: { actionId: 'touch_portrait' } },
        { edgeId: 'gallery-to-hall', from: 'gallery', to: 'hall', trigger: { actionId: 'leave_gallery' } }
      ]
    }
  };
  const adventure = compileAdventure(branched);
  assert.strictEqual(adventure.estimatedDuration.routeCount, 2);
  assert.ok(adventure.estimatedDuration.shortestRouteMinutes > 0);
  assert.ok(adventure.estimatedDuration.longestRouteMinutes > adventure.estimatedDuration.shortestRouteMinutes);
});

test('emits quality warnings without rejecting variable-length manifests', () => {
  const adventure = compileAdventure({
    ...raw,
    qualityGates: { durationMinutes: { minCriticalPathMinutes: 999 } }
  });
  assert.ok(adventure.qualityWarnings.some(warning => warning.code === 'CRITICAL_PATH_TOO_SHORT'));
  assert.ok(adventure.warnings.some(warning => warning.code === 'CRITICAL_PATH_TOO_SHORT'));
});

test('preserves authored duration estimates when supplied by a published manifest', () => {
  const adventure = compileAdventure({
    ...raw,
    estimatedDuration: {
      criticalPathMinutes: 180,
      typicalRouteMinutes: 240,
      fullExplorationMinutes: 420,
      replayRangeMinutes: [150, 480],
      basis: 'moderated playtest'
    }
  });
  assert.deepStrictEqual(adventure.estimatedDuration, {
    criticalPathMinutes: 180,
      shortestRouteMinutes: adventure.estimatedDuration.shortestRouteMinutes,
      typicalRouteMinutes: 240,
      longestRouteMinutes: adventure.estimatedDuration.longestRouteMinutes,
      fullExplorationMinutes: 420,
      replayRangeMinutes: [150, 480],
      readingMinutes: adventure.estimatedDuration.readingMinutes,
      interactionMinutes: adventure.estimatedDuration.interactionMinutes,
      routeCount: adventure.estimatedDuration.routeCount,
      basis: 'moderated playtest'
  });
});

test('rejects invalid references before gameplay', () => {
  assert.throws(() => compileAdventure({ ...raw, items: {}, scenes: [{ ...raw.scenes[0], actions: [{ ...raw.scenes[0].actions[1], resolution: { addItems: ['missing'] } }] }] }), error => error.code === 'MANIFEST_INVALID' && error.errors.some(item => item.message.includes('Unknown item')));
});

test('rejects unknown action requirements while allowing forward references', () => {
  const forward = { ...raw, scenes: raw.scenes.map(scene => ({ ...scene, actions: scene.actions.map(action => action.actionId === 'touch_portrait' ? { ...action, requires: [{ kind: 'action', id: 'read_letter' }] } : action) })) };
  assert.doesNotThrow(() => compileAdventure(forward));
  const invalid = { ...raw, scenes: raw.scenes.map(scene => ({ ...scene, actions: scene.actions.map(action => action.actionId === 'touch_portrait' ? { ...action, requires: [{ kind: 'action', id: 'missing_action' }] } : action) })) };
  assert.throws(() => compileAdventure(invalid), error => error.errors.some(item => item.message.includes('Unknown action: missing_action')));
});

test('builds a server-owned catalog with stable IDs', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure, { classId: 'scholar' });
  const catalog = buildCatalog(adventure, state);
  assert.ok(catalog.actions.some(action => action.actionId === 'read_letter'));
  assert.ok(catalog.actions.every(action => Object.prototype.hasOwnProperty.call(action, 'iconKey')));
  assert.ok(catalog.actions.every(action => Object.prototype.hasOwnProperty.call(action, 'subtitle')));
  assert.strictEqual(catalog.actions.find(action => action.actionId === 'read_letter').sceneId, 'study');
  assert.strictEqual(catalog.sceneName, 'Study');
  assert.ok(Object.prototype.hasOwnProperty.call(catalog, 'setting'));
  assert.ok(Object.prototype.hasOwnProperty.call(catalog, 'openingNarration'));
  assert.deepStrictEqual(catalog.presentNpcs, []);
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
  const retry = resolveTurn({ adventure, state: first.state, actionId: 'read_letter', catalogVersion: state.catalogVersion, turnId: 'same-turn' });
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

test('ambiguous free text is rejected even when multiple legal actions share a keyword', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure, { classId: 'rogue' });
  const catalog = buildCatalog(adventure, state);
  catalog.actions.push({ actionId: 'look_portrait', contentId: 'portrait_2', label: 'Look at the portrait', shortLabel: 'Look at portrait', sceneId: 'study', catalogVersion: catalog.catalogVersion, type: 'exploration', category: 'exploration' });
  const definitions = adventure.scenes.study.actions.map(item => item.actionId === 'touch_portrait' ? { ...item, keywords: ['look'] } : item).concat([{ actionId: 'look_portrait', contentId: 'portrait_2', label: 'Look at the portrait', keywords: ['look'] }]);
  const match = matchFreeText('look', catalog, definitions);
  assert.strictEqual(match.status, 'ambiguous');
  assert.strictEqual(match.action, null);
});

test('free text cannot match an action outside the current server catalog', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure, { classId: 'scholar' });
  const catalog = buildCatalog(adventure, state);
  const match = matchFreeText('find the brass key', catalog, adventure.scenes.study.actions);
  assert.strictEqual(match.status, 'no_match');
});

test('unmatched text cannot mutate state', () => {
  const adventure = compileAdventure(raw);
  const state = createState(adventure, { classId: 'scholar' });
  const before = JSON.stringify(state);
  const match = matchFreeText('I teleport to the castle and create a sword', buildCatalog(adventure, state), adventure.scenes.study.actions);
  assert.strictEqual(match.status, 'no_match');
  assert.strictEqual(JSON.stringify(state), before);
});

test('authored ending rules are generic and do not depend on an adventure identifier', () => {
  const endingManifest = {
    ...raw,
    adventureId: 'generic-ending-book',
    endings: {
      fulfilled: { endingId: 'fulfilled', narration: 'The promise is fulfilled.' },
      unresolved: { endingId: 'unresolved', narration: 'The promise remains unresolved.' }
    },
    scenes: [{
      sceneId: 'finale',
      actions: [{
        actionId: 'conclude', type: 'exit', category: 'exit', label: 'Conclude the tale',
        resolution: {
          resultType: 'ending', narration: 'The tale reaches its final page.',
          endingRules: [
            { endingId: 'fulfilled', requires: [{ kind: 'flag', id: 'promise_kept', equals: true }] },
            { endingId: 'unresolved', requires: [] }
          ]
        }
      }]
    }],
    graph: { entry: 'finale', edges: [] }
  };
  const adventure = compileAdventure(endingManifest);
  const state = createState(adventure, { flags: { promise_kept: true } });
  const result = resolveTurn({ adventure, state, actionId: 'conclude', catalogVersion: state.catalogVersion, turnId: 'ending-turn' });
  assert.strictEqual(result.result.endingId, 'fulfilled');
  assert.strictEqual(result.result.narrative, 'The promise is fulfilled.');
});
