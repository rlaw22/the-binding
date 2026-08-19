#!/usr/bin/env node
/** Regression tests for the Storyline-only narrative inventory boundary. */
const assert = require('assert');
const StorylineInventory = require('../src/story/storyline-inventory');
const StoryEngine = require('../src/story/story-engine');
const { createGame } = require('../src/ai-dm/dm-service');
const { getAdventure } = require('../src/adventure');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (err) { console.error(`  ✗ ${name}: ${err.message}`); process.exitCode = 1; }
}

console.log('\n=== Storyline inventory boundary ===');

test('resolves canonical brass crucifix and legacy IDs consistently', () => {
  assert.strictEqual(StorylineInventory.normalizeStorylineItemId('silver_crucifix'), 'crucifix');
  assert.strictEqual(StorylineInventory.normalizeStorylineItemId('brass_crucifix'), 'crucifix');
  assert.strictEqual(StorylineInventory.resolveStorylineItem('crucifix').name, 'Brass Crucifix');
});

test('deduplicates Storyline awards without touching Campaign inventory', () => {
  const player = StoryEngine.createPlayerState('fighter');
  StorylineInventory.addStorylineItem(player, 'brass_crucifix');
  StorylineInventory.addStorylineItem(player, 'silver_crucifix');
  assert.deepStrictEqual(player.inventory, ['crucifix']);
  const game = createGame({ gameMode: 'storyline', adventureId: 'dracula' });
  assert.deepStrictEqual(game.inventory.slots, []);
  assert.deepStrictEqual(game.storyPlayerState.inventory, []);
});

test('StoryEngine awards authored item into Storyline inventory', () => {
  const player = StoryEngine.createPlayerState('fighter');
  const manifest = { content: [], storyMode: { collectibleItem: {
    id: 'brass_crucifix', label: 'Take the brass crucifix', description: 'You take the crucifix.', name: 'Brass Crucifix'
  } } };
  const result = StoryEngine.processButtonAction('item_brass_crucifix', 'item', manifest, player);
  assert.strictEqual(result.itemGained, 'crucifix');
  assert.deepStrictEqual(player.inventory, ['crucifix']);
  assert.strictEqual(StorylineInventory.listStorylineItems(player)[0].name, 'Brass Crucifix');
  assert.ok(result.narrative.includes('You take the Brass Crucifix and keep it close. It is now in your possession.'));
});

test('manifest validator catches malformed collectible contracts', () => {
  const errors = StorylineInventory.validateStorylineManifest({ storyMode: { collectibleItem: { id: 'x' } } }, 'test-scene');
  assert.ok(errors.some(e => e.includes('needs name or label')));
});

test('manifest validator accepts a valid scene', () => {
  const errors = StorylineInventory.validateStorylineManifest({
    content: [{ id: 'inspect', label: 'Inspect' }],
    storyMode: { collectibleItem: { id: 'key', label: 'Take the key' } },
    initialFacts: { items: ['key'] }
  });
  assert.deepStrictEqual(errors, []);
});

test('all three authored adventures have valid scene contracts', () => {
  for (const adventureId of ['dracula', 'frankenstein', 'holmes']) {
    const adventure = getAdventure(adventureId);
    for (const [sceneId, manifest] of Object.entries(adventure.sceneManifests)) {
      const errors = StorylineInventory.validateStorylineManifest(manifest, `${adventureId}/${sceneId}`);
      assert.deepStrictEqual(errors, []);
    }
  }
});

if (!process.exitCode) console.log('  RESULTS: all Storyline inventory tests passed');
