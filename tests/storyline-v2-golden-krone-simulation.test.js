'use strict';

const assert = require('assert');
const manifest = require('../content/ingestion/dracula-1897/candidates/dracula-opening-dramatic-002/manifest.json');
const { compileAdventure, createState, buildCatalog, resolveTurn } = require('../src/storyline-v2');
const { StorylineV2Service } = require('../src/storyline-v2/service');

function play(adventure, state, actionId, turnId) {
  const catalogVersion = state.catalogVersion;
  const result = resolveTurn({ adventure, state, actionId, catalogVersion, turnId });
  assert.notStrictEqual(result.result.resultType, 'rejected', `${actionId} should be legal`);
  return result;
}

console.log('\n=== Golden Krone stateful-space simulations ===');
const adventure = compileAdventure(manifest);

const reordered = createState(adventure, { sessionId: 'golden-reordered' });
let step = play(adventure, reordered, 'dracula_opening_01__inspect_stable', 'inspect-first');
assert.ok(step.result.catalog.actions.some(action => action.actionId === 'dracula_opening_01__question_landlord'), 'unvisited landlord affordance should remain after stable inspection');
step = play(adventure, step.state, 'dracula_opening_01__question_landlord', 'question-second');
assert.ok(step.result.catalog.actions.some(action => action.actionId === 'dracula_opening_01__accept_crucifix'), 'unvisited preparation affordance should remain after reordered exploration');
step = play(adventure, step.state, 'dracula_opening_01__trust_warning', 'depart-protected');
assert.strictEqual(step.result.transition.destinationSceneId, 'dracula_opening_02', 'protected departure should enter the protected coach scene');
assert.strictEqual(step.state.completedSceneIds.includes('dracula_opening_01'), true, 'departure should complete the inn scene');
assert.ok(step.result.catalog.actions.every(action => !action.actionId.startsWith('dracula_opening_01__')), 'departure should remove inn affordances from the visible destination catalog while retaining history');
assert.strictEqual(step.state.localThreads.thread_inspect_stable.status, 'closed', 'movement should close unresolved local threads');
assert.strictEqual(step.state.localThreads.thread_question_landlord.status, 'closed', 'movement should close deferred local questions');
console.log('  ✓ reordered exploration preserves deferred affordances and departure transforms the active space');

const skipped = createState(adventure, { sessionId: 'golden-skipped' });
const skippedCatalog = buildCatalog(adventure, skipped);
assert.ok(skippedCatalog.actions.some(action => action.actionId === 'dracula_opening_01__dismiss_warning'), 'direct commitment should be legal without optional exploration');
const skippedResult = play(adventure, skipped, 'dracula_opening_01__dismiss_warning', 'depart-exposed');
assert.strictEqual(skippedResult.result.transition.destinationSceneId, 'dracula_opening_04', 'skipping optional inn actions should preserve a legal exposed route');
assert.strictEqual(skippedResult.state.flags.exposed_route, true, 'skipped path should preserve its authored consequence');
console.log('  ✓ skipped optional interactions retain legal continuation with a distinct consequence');

const protectedRoute = play(adventure, createState(adventure, { sessionId: 'golden-protected' }), 'dracula_opening_01__trust_warning', 'protected-route');
const evidenceRoute = play(adventure, createState(adventure, { sessionId: 'golden-evidence' }), 'dracula_opening_01__investigate_then_board', 'evidence-route');
const exposedRoute = play(adventure, createState(adventure, { sessionId: 'golden-exposed' }), 'dracula_opening_01__dismiss_warning', 'exposed-route');
assert.strictEqual(protectedRoute.state.flags.trusted_local_warning, true, 'protected branch should preserve its authored trust flag');
assert.strictEqual(evidenceRoute.state.flags.evidence_route, true, 'evidence branch should preserve its authored evidence flag');
assert.strictEqual(exposedRoute.state.flags.exposed_route, true, 'exposed branch should preserve its authored exposure flag');
assert.notStrictEqual(protectedRoute.result.transition.destinationSceneId, evidenceRoute.result.transition.destinationSceneId, 'protected and evidence branches should diverge locally');
assert.notStrictEqual(evidenceRoute.result.transition.destinationSceneId, exposedRoute.result.transition.destinationSceneId, 'evidence and exposed branches should diverge locally');
console.log('  ✓ divergent departures preserve branch-local state before later convergence');

const examine = createState(adventure, { sessionId: 'golden-examine' });
const before = buildCatalog(adventure, examine);
assert.ok(before.actions.filter(action => action.persistent).length >= 2, 'the inn should expose persistent authored affordances');
const examined = play(adventure, examine, 'dracula_opening_01__inspect_stable', 'examine-once');
assert.ok(examined.result.catalog.actions.some(action => action.actionId === 'dracula_opening_01__inspect_stable'), 'bounded repeatable examination remains available while plausible');
assert.ok(examined.result.catalog.actions.every(action => action.label && !/generic|continue|do something/i.test(action.label)), 'catalog should not use generic padding labels');
console.log('  ✓ bounded authored examination remains contextual and catalogs contain no generic padding');

const knowledgeShift = createState(adventure, { sessionId: 'golden-knowledge-shift' });
let firstExamination = play(adventure, knowledgeShift, 'dracula_opening_01__inspect_stable', 'knowledge-examine-first');
assert.strictEqual(firstExamination.result.narrative.includes('horses were changed twice'), true, 'first examination should use the initial authored observation');
assert.ok(firstExamination.result.catalog.actions.some(action => action.actionId === 'dracula_opening_01__inspect_stable'), 'examination should resurface after one visit');
firstExamination.state.flags.landlord_warning_heard = true;
let secondExamination = play(adventure, firstExamination.state, 'dracula_opening_01__inspect_stable', 'knowledge-examine-second');
assert.strictEqual(secondExamination.result.narrative.includes('landlord’s warning in mind'), true, 'new knowledge should select the authored examination variant');
assert.strictEqual(secondExamination.result.catalog.actions.some(action => action.actionId === 'dracula_opening_01__inspect_stable'), false, 'bounded examination should close after authored visits');
console.log('  ✓ examination changes with authored knowledge and closes at its revisit bound');

const exportedBranch = createState(adventure, { sessionId: 'golden-export-branch' });
const branchStep = play(adventure, exportedBranch, 'dracula_opening_01__investigate_then_board', 'export-branch');
const branchService = new StorylineV2Service({ [adventure.adventureId]: adventure });
branchService.importState({ sessionId: 'golden-export-branch', adventureId: adventure.adventureId, state: branchStep.state });
const restored = branchService.snapshot('golden-export-branch');
assert.deepStrictEqual(restored.state.flags, branchStep.state.flags, 'export/import should preserve branch flags');
assert.deepStrictEqual(restored.state.completedSceneIds, branchStep.state.completedSceneIds, 'export/import should preserve scene history');
assert.deepStrictEqual(restored.catalog.actions.map(action => action.actionId), branchStep.result.catalog.actions.map(action => action.actionId), 'export/import should rebuild the same legal catalog');
const bundleService = new StorylineV2Service({ [adventure.adventureId]: adventure });
bundleService.importState({ sessionId: 'bundle-protected', adventureId: adventure.adventureId, state: protectedRoute.state });
bundleService.importState({ sessionId: 'bundle-exposed', adventureId: adventure.adventureId, state: exposedRoute.state });
const branchBundle = bundleService.exportAll();
bundleService.clear();
assert.deepStrictEqual(bundleService.importAll(branchBundle).sort(), ['bundle-exposed', 'bundle-protected'], 'bundle import should restore every branch session');
assert.strictEqual(bundleService.snapshot('bundle-protected').state.flags.trusted_local_warning, true, 'bundle restore should preserve protected branch state');
assert.strictEqual(bundleService.snapshot('bundle-exposed').state.flags.exposed_route, true, 'bundle restore should preserve exposed branch state');
console.log('  ✓ export/import preserves branch-local state, history, and legal catalog');
