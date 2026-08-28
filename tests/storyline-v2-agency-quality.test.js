'use strict';

const assert = require('assert');
const { compileAdventure, auditAgencyQuality } = require('../src/storyline-v2');

const sceneBeat = {
  situation: 'The road ends at a dark house while night gathers around you.',
  immediateObjective: 'Decide whether to enter before the last light disappears.',
  pressure: 'A storm is closing in and someone inside is watching the road.',
  presentActors: ['keeper'],
  nextQuestion: 'What will you risk before the house closes its door?'
};
const actionBeat = {
  approach: 'You question the keeper directly instead of entering blind.',
  stakes: 'The answer may reveal who was here last, but it may cost his trust.',
  reaction: 'The keeper lowers his voice and glances toward the dark windows.',
  changedSituation: 'The house is no longer merely abandoned; someone may still be inside.',
  nextObjective: 'Decide whether to search the cart or cross the threshold.',
  effectSummary: 'Reveals a warning and changes the available approach.'
};

function base(overrides = {}) {
  return {
    schemaVersion: '2.0', publicationMode: 'new-book', adventureId: 'agency-fixture', title: 'Agency Fixture',
    prologue: { startingSceneId: 'arrival' }, graph: { entry: 'arrival', edges: [] },
    scenes: [{ sceneId: 'arrival', name: 'Arrival', openingNarration: 'The road ends at the dark house.', dramaturgy: sceneBeat, actions: [
      { actionId: 'question', type: 'exploration', role: 'alternative', replay: 'consumable', label: 'Question the keeper', consequenceSummary: 'Reveals who was here last.', dramaturgy: actionBeat, resolution: { narration: 'The keeper lowers his voice.', setFlags: { asked: true } } },
      { actionId: 'search', type: 'exploration', role: 'discovery', replay: 'consumable', label: 'Search the abandoned cart', consequenceSummary: 'Finds a warning before you enter.', laterBeat: 'threshold', dramaturgy: { ...actionBeat, approach: 'You search the abandoned cart for evidence.', reaction: 'A warning is hidden under the seat.' }, resolution: { narration: 'Under the seat you find a warning.', discover: ['warning'] } },
      { actionId: 'enter', type: 'exit', role: 'exit', replay: 'consumable', label: 'Enter the house', dramaturgy: { ...actionBeat, approach: 'You cross the threshold before the storm arrives.', reaction: 'The door opens onto darkness.', changedSituation: 'The road is behind you and the house has claimed your attention.', nextObjective: 'Find the source of the watchful presence.', convergence: 'threshold', effectSummary: 'Commits the journey to the house.' }, resolution: { narration: 'You cross the threshold.' } }
    ] }],
    ...overrides
  };
}

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

console.log('\n=== Storyline v2 agency quality ===');

test('compiles a new-book scene with explicit agency roles and replay policies', () => {
  const adventure = compileAdventure(base());
  assert.strictEqual(adventure.scenes.arrival.actions[0].role, 'alternative');
  assert.strictEqual(adventure.scenes.arrival.actions[1].laterBeat, 'threshold');
});

test('rejects new-book actions without explicit agency metadata', () => {
  assert.throws(() => compileAdventure(base({ scenes: [{ ...base().scenes[0], actions: [{ ...base().scenes[0].actions[0], role: undefined }] }] })), error => error.code === 'MANIFEST_INVALID' && error.errors.some(item => item.message.includes('agency role')));
});

test('rejects template-shaped labels in new-book content', () => {
  assert.throws(() => compileAdventure(base({ scenes: [{ ...base().scenes[0], actions: [{ ...base().scenes[0].actions[0], label: "Observe chapter 1's evidence" }, ...base().scenes[0].actions.slice(1)] }] })), error => error.errors.some(item => item.message.includes('Template-style')));
});

test('warns when a scene drains multiple consumable actions', () => {
  const audit = auditAgencyQuality(base(), { strict: true });
  assert.ok(audit.warnings.some(item => item.message.includes('All non-exit actions are consumable')));
});

test('rejects a new-book scene without a dramatic beat', () => {
  assert.throws(() => compileAdventure(base({ scenes: [{ ...base().scenes[0], dramaturgy: undefined }] })), error => error.code === 'MANIFEST_INVALID' && error.errors.some(item => item.path.endsWith('.dramaturgy')));
});

test('rejects generic dramatic fallback text in a new-book action', () => {
  const generic = { ...actionBeat, changedSituation: 'What was uncertain is now part of the journey.' };
  assert.throws(() => compileAdventure(base({ scenes: [{ ...base().scenes[0], actions: [{ ...base().scenes[0].actions[0], dramaturgy: generic }, ...base().scenes[0].actions.slice(1)] }] })), error => error.code === 'MANIFEST_INVALID' && error.errors.some(item => item.message.includes('Template dramatic text')));
});

test('preserves dramatic beat data through compilation, catalog, resolution, and presentation', () => {
  const adventure = compileAdventure(base());
  const state = require('../src/storyline-v2').createState(adventure, { sessionId: 'trace', classId: null });
  const catalog = require('../src/storyline-v2').buildCatalog(adventure, state);
  assert.strictEqual(catalog.dramaturgy.nextQuestion, sceneBeat.nextQuestion);
  assert.strictEqual(catalog.actions[0].dramaturgy.nextObjective, actionBeat.nextObjective);
  const resolved = require('../src/storyline-v2').resolveTurn({ adventure, state, actionId: 'question', catalogVersion: state.catalogVersion, turnId: 'trace-turn' });
  assert.strictEqual(resolved.result.dramaticBeat.nextObjective, actionBeat.nextObjective);
  const { createStorylineV2ResultViewModel } = require('../src/storyline-v2/presentation');
  assert.strictEqual(createStorylineV2ResultViewModel(resolved.result).dramaticBeat.changedSituation, actionBeat.changedSituation);
});

test('allows a valid short linear scene with one authored commitment', () => {
  assert.doesNotThrow(() => compileAdventure(base({ scenes: [{ sceneId: 'arrival', dramaturgy: sceneBeat, actions: [{ actionId: 'enter', type: 'exit', role: 'exit', replay: 'consumable', label: 'Enter the house', dramaturgy: { ...actionBeat, approach: 'You cross the threshold before the storm arrives.', reaction: 'The door opens onto darkness.', changedSituation: 'The road is behind you and the house has claimed your attention.', nextObjective: 'Find the source of the watchful presence.', convergence: 'threshold', effectSummary: 'Commits the journey to the house.' }, resolution: { narration: 'You enter.' } }] }] })));
});

test('rejects generic standalone action labels instead of padding a catalog', () => {
  assert.throws(() => compileAdventure(base({ scenes: [{ ...base().scenes[0], actions: [{ ...base().scenes[0].actions[0], label: 'Continue' }, ...base().scenes[0].actions.slice(1)] }] })), error => error.code === 'MANIFEST_INVALID' && error.errors.some(item => item.message.includes('Generic or Template-style')));
});

test('rejects duplicate non-exit labels that disguise padded choices', () => {
  const actions = base().scenes[0].actions;
  assert.throws(() => compileAdventure(base({ scenes: [{ ...base().scenes[0], actions: [actions[0], { ...actions[1], label: actions[0].label }] }] })), error => error.code === 'MANIFEST_INVALID' && error.errors.some(item => item.message.includes('Duplicate action labels')));
});

test('rejects meaningful alternatives with no distinct immediate or named later consequence', () => {
  const actions = base().scenes[0].actions;
  const same = { ...actions[1], consequenceSummary: actions[0].consequenceSummary, laterBeat: undefined, dramaturgy: actions[0].dramaturgy, resolution: { ...actions[1].resolution, setFlags: { asked: true }, discover: undefined } };
  assert.throws(() => compileAdventure(base({ scenes: [{ ...base().scenes[0], actions: [actions[0], same, actions[2]] }] })), error => error.code === 'MANIFEST_INVALID' && error.errors.some(item => item.message.includes('different immediate or named later consequences')));
});

test('rejects actions that target an unestablished entity', () => {
  const actions = base().scenes[0].actions;
  assert.throws(() => compileAdventure(base({ scenes: [{ ...base().scenes[0], establishedEntities: ['keeper'], actions: [{ ...actions[0], targets: ['unknown-stranger'] }, actions[1], actions[2]] }] })), error => error.code === 'MANIFEST_INVALID' && error.errors.some(item => item.message.includes('not established in the scene')));
});

test('accepts actions targeting an established actor or current location', () => {
  const actions = base().scenes[0].actions;
  assert.doesNotThrow(() => compileAdventure(base({ scenes: [{ ...base().scenes[0], location: { id: 'arrival' }, establishedEntities: ['keeper'], actions: [{ ...actions[0], targets: ['keeper'] }, { ...actions[1], targets: ['arrival'] }, actions[2]] }] })));
});

test('permits meaningful alternatives that converge later when their consequences differ', () => {
  const actions = base().scenes[0].actions;
  const alternative = { ...actions[1], laterBeat: 'threshold', dramaturgy: { ...actions[0].dramaturgy, changedSituation: 'The warning gives you leverage when the housekeeper opens the door.', nextObjective: 'Use the warning before crossing the threshold.' }, resolution: { narration: 'The warning changes your approach.', setFlags: { warned: true } } };
  assert.doesNotThrow(() => compileAdventure(base({ scenes: [{ ...base().scenes[0], actions: [actions[0], alternative, actions[2]] }] })));
});
