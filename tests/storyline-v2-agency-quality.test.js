'use strict';

const assert = require('assert');
const { compileAdventure, auditAgencyQuality } = require('../src/storyline-v2');

function base(overrides = {}) {
  return {
    schemaVersion: '2.0', publicationMode: 'new-book', adventureId: 'agency-fixture', title: 'Agency Fixture',
    prologue: { startingSceneId: 'arrival' }, graph: { entry: 'arrival', edges: [] },
    scenes: [{ sceneId: 'arrival', name: 'Arrival', openingNarration: 'The road ends at the dark house.', actions: [
      { actionId: 'question', type: 'exploration', role: 'alternative', replay: 'consumable', label: 'Question the keeper', consequenceSummary: 'Reveals who was here last.', resolution: { narration: 'The keeper lowers his voice.', setFlags: { asked: true } } },
      { actionId: 'search', type: 'exploration', role: 'discovery', replay: 'consumable', label: 'Search the abandoned cart', consequenceSummary: 'Finds a warning before you enter.', laterBeat: 'threshold', resolution: { narration: 'Under the seat you find a warning.', discover: ['warning'] } },
      { actionId: 'enter', type: 'exit', role: 'exit', replay: 'consumable', label: 'Enter the house', resolution: { narration: 'You cross the threshold.' } }
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

test('allows a valid short linear scene with one authored commitment', () => {
  assert.doesNotThrow(() => compileAdventure(base({ scenes: [{ sceneId: 'arrival', actions: [{ actionId: 'enter', type: 'exit', role: 'exit', replay: 'consumable', label: 'Enter the house', resolution: { narration: 'You enter.' } }] }] })));
});
