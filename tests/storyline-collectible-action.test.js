#!/usr/bin/env node
/** Focused regression tests for Storyline collectible/action identity integrity. */
const assert = require('assert');
const SceneEngine = require('../src/scene-engine');
const StoryEngine = require('../src/story/story-engine');
const { createInventory, addItem, normalizeItemId } = require('../src/inventory/inventory');
const { generateSceneActions } = require('../src/ai-dm/dm-service');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (err) { console.error(`  ✗ ${name}: ${err.message}`); process.exitCode = 1; }
}

console.log('\n=== Storyline collectible/action integrity ===');

test('legacy crucifix IDs normalize to one inventory identity', () => {
  assert.strictEqual(normalizeItemId('silver_crucifix'), 'crucifix');
  assert.strictEqual(normalizeItemId('brass_crucifix'), 'crucifix');
  const inventory = createInventory();
  assert.ok(addItem(inventory, 'silver_crucifix'));
  assert.strictEqual(inventory.slots.length, 1);
  assert.strictEqual(inventory.slots[0].id, 'crucifix');
  assert.strictEqual(inventory.slots[0].name, 'Silver Crucifix');
});

test('StoryEngine awards the authored collectible using its manifest ID', () => {
  const player = StoryEngine.createPlayerState('fighter');
  const manifest = {
    content: [],
    storyMode: { collectibleItem: { id: 'silver_crucifix', label: 'Examine the silver crucifix', description: 'You recover the silver crucifix.' } }
  };
  const result = StoryEngine.processButtonAction('item_silver_crucifix', 'item', manifest, player);
  assert.strictEqual(result.itemGained, 'crucifix');
  assert.deepStrictEqual(player.inventory, ['crucifix']);
  assert.ok(result.narrative.includes('You take the Brass Crucifix and keep it close. It is now in your possession.'));
});

test('filler-authoritative turns cannot discover by keywords and unknown tags do not inflate completion', () => {
  const state = SceneEngine.enterScene({
    sceneId: 'integrity_scene', sceneName: 'Room',
    content: [
      { id: 'inspect_desk', label: 'Inspect the desk', keywords: ['inspect', 'desk'], discovery: 'A drawer opens.' },
      { id: 'read_letter', label: 'Read the letter', keywords: ['read', 'letter'], discovery: 'The letter is troubling.' }
    ],
    exitAction: 'leave_room', exitLabel: 'Leave the room'
  });
  SceneEngine.processTurn(state, '[EXPLORED: inspect_desk, forged_id]', 'Inspect the desk', { authoritative: true });
  assert.equal(state.discoveredIds.has('inspect_desk'), false, 'authoritative filler/result path must not infer discovery');
  assert.equal(state.discoveredIds.has('forged_id'), false, 'unknown IDs cannot count as discovered');
  SceneEngine.processTurn(state, '[EXPLORED: read_letter, forged_id]', 'read letter', {});
  assert.equal(state.discoveredIds.has('read_letter'), true);
  assert.equal(state.discoveredIds.has('forged_id'), false);
  assert.equal(SceneEngine.getCompletion(state), 0.5);
});

test('scene state preserves Storyline metadata and stable discovery IDs', () => {
  const state = SceneEngine.enterScene({
    sceneId: 'crucifix_scene', sceneName: 'Chapel',
    storyMode: { collectibleItem: { id: 'silver_crucifix', label: 'Silver Crucifix' } },
    initialFacts: { items: ['silver_crucifix'] },
    content: [{ id: 'examine_crucifix', label: 'Examine the crucifix', discovery: 'A hidden inscription emerges.' }],
    exitAction: 'leave_chapel', exitLabel: 'Leave the chapel'
  });
  assert.strictEqual(state.storyMode.collectibleItem.id, 'silver_crucifix');
  assert.deepStrictEqual(state.initialFacts.items, ['silver_crucifix']);
  SceneEngine.markDiscovered(state, 'examine_crucifix');
  assert.ok(state.discoveredIds.has('examine_crucifix'));
});

test('all three adventure manifest families load Storyline scenes with stable contracts', () => {
  const adventures = [
    require('../src/adventure/dracula').DraculaAdventure,
    require('../src/adventure/frankenstein').FrankensteinAdventure,
    require('../src/adventure/holmes').HolmesAdventure
  ];
  for (const adventure of adventures) {
    const scenes = Object.values(adventure.sceneManifests || {});
    assert.ok(scenes.length >= 5, `${adventure.name || 'adventure'} should load Storyline scenes`);
    for (const scene of scenes) {
      assert.ok(scene.sceneId, 'scene must have stable sceneId');
      assert.ok(Array.isArray(scene.content), `${scene.sceneId} must have content array`);
      assert.ok(scene.storyMode && scene.storyMode.badChoice, `${scene.sceneId} must have Storyline bad choice`);
      for (const item of scene.content) assert.ok(item.id && item.label, `${scene.sceneId} content must have stable IDs and labels`);
    }
  }
});

test('generated exploration and exit actions carry stable IDs', () => {
  const state = SceneEngine.enterScene({
    sceneId: 'stable_ids', sceneName: 'Room',
    content: [{ id: 'inspect_desk', label: 'Inspect the desk' }],
    exitAction: 'leave_room', exitLabel: 'Leave the room'
  });
  const actions = generateSceneActions(state);
  const explore = actions.find(a => a.type === 'exploration');
  const exit = actions.find(a => a.type === 'exit');
  assert.strictEqual(explore.id, 'inspect_desk');
  assert.strictEqual(explore.contentId, 'inspect_desk');
  assert.strictEqual(exit.id, 'leave_room');
});

if (!process.exitCode) console.log('  RESULTS: all focused tests passed');
