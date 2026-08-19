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
