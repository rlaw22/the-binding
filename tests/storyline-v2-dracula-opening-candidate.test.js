'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  compileAdventure,
  createState,
  buildCatalog,
  resolveTurn
} = require('../src/storyline-v2');

const manifestPath = path.join(__dirname, '..', 'content/ingestion/dracula-1897/candidates/dracula-opening-dramatic-002/manifest.json');
const adventure = compileAdventure(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
const opening = adventure.scenes.dracula_opening_01;
assert.ok(opening.openingNarration.includes('extends it toward him with both hands'), 'the crucifix offer must be established in the opening');
assert.ok(opening.openingNarration.includes('stable yard'), 'the opening must spatially establish the stable yard');
assert.ok(opening.openingNarration.includes('Yellow lamplight'), 'the opening must establish sensory atmosphere');

function resolveOpening(actionId, turnId) {
  const state = createState(adventure, { classId: 'rogue' });
  const catalog = buildCatalog(adventure, state);
  const result = resolveTurn({
    adventure,
    state,
    actionId,
    catalogVersion: catalog.catalogVersion,
    turnId
  });
  assert.strictEqual(result.result.error, undefined, `opening action should resolve: ${actionId}`);
  return result;
}

const routes = [
  ['dracula_opening_01__trust_warning', 'dracula_opening_02', 'trusted_local_warning'],
  ['dracula_opening_01__investigate_then_board', 'dracula_opening_03', 'evidence_route'],
  ['dracula_opening_01__dismiss_warning', 'dracula_opening_04', 'exposed_route']
];

for (const [actionId, destination, flag] of routes) {
  const result = resolveOpening(actionId, actionId);
  assert.strictEqual(result.result.transition.destinationSceneId, destination);
  assert.strictEqual(result.state.flags[flag], true);
  assert.ok(result.result.dramaticBeat.reaction.length > 20);
  assert.ok(result.result.dramaticBeat.nextObjective.length > 20);
}

const edgeTargets = adventure.graph.edges
  .filter(edge => edge.from === 'dracula_opening_01')
  .map(edge => edge.to)
  .sort();
assert.deepStrictEqual(edgeTargets, ['dracula_opening_02', 'dracula_opening_03', 'dracula_opening_04']);

console.log('✓ Dracula branching opening candidate preserves three authored routes and reactions');
