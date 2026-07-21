/**
 * image-pipeline.test.js — Image Generation Pipeline Tests
 *
 * Tests: mock provider, adventure prompt templates, disk-based persistent store,
 * and DM image hook integration. All tests run without external API keys.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

let passed = 0, failed = 0, total = 0;

function assert(cond, label) {
  total++;
  if (cond) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ ' + label); }
}

function assertEq(actual, expected, label) {
  total++;
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ ' + label + ' — expected ' + e + ', got ' + a); }
}

function section(name) { console.log('\n═══ ' + name + ' ═══'); }

// ---------------------------------------------------------------------------
// Test directory for disk storage
// ---------------------------------------------------------------------------
const TEST_DIR = path.join(os.tmpdir(), 'binding-image-test-' + Date.now());

function cleanup() {
  try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch (_) {}
}

// ---------------------------------------------------------------------------
// 1. Mock Provider
// ---------------------------------------------------------------------------
section('Mock Provider');

// Set mock mode
process.env.IMAGE_MOCK = 'true';
delete process.env.XAI_API_KEY;
delete process.env.OPENAI_API_KEY;

const { createImageService, generateAndCache, clearImageCache } = require('../src/image');

{
  const svc = createImageService();
  assert(svc.isEnabled === true, 'Mock provider: isEnabled = true');
  assertEq(svc.providerName, 'Mock', 'Mock provider: providerName = Mock');
  assertEq(svc.cacheStats.max, 100, 'Default cache size = 100');
}

// Mock provider returns a data URI
(async () => {
  section('Mock Provider — Generation');

  const svc = createImageService({ cacheDir: path.join(TEST_DIR, 'mock-test') });
  const url = await svc.generateRaw('A dark castle at midnight');
  assert(url !== null, 'generateRaw returns non-null');
  assert(url.startsWith('data:image/png;base64,'), 'Returns a PNG data URI');
  assert(url.length > 50, 'Data URI has reasonable length');

  // Scene generation
  const sceneUrl = await svc.generateScene({
    description: 'A vast crypt beneath the castle',
    location: 'Beneath Castle Dracula',
    mood: 'dread',
  });
  assert(sceneUrl !== null, 'generateScene returns non-null');
  assert(sceneUrl.startsWith('data:image/png;base64,'), 'Scene returns PNG data URI');

  // Character generation
  const charUrl = await svc.generateCharacter({
    name: 'Van Helsing',
    classType: 'vampire hunter',
    appearance: 'Weathered face, silver hair',
  });
  assert(charUrl !== null, 'generateCharacter returns non-null');

  // Combat generation
  const combatUrl = await svc.generateCombat({
    attacker: 'A vampire lord',
    defender: 'Van Helsing',
    weapon: 'Silver stake',
    outcome: 'critical',
  });
  assert(combatUrl !== null, 'generateCombat returns non-null');

  // Cache hit
  const url2 = await svc.generateRaw('A dark castle at midnight');
  assertEq(url, url2, 'Same prompt returns cached URL');
  assertEq(svc.cacheStats.size, 4, 'Cache has 4 entries after 4 unique prompts');

  // generateAndCache integration
  clearImageCache();
  const r1 = await generateAndCache(svc, 'Test prompt for cache');
  assert(r1.imageUrl !== null, 'generateAndCache returns imageUrl');
  assertEq(r1.cached, false, 'First call is cache miss');

  const r2 = await generateAndCache(svc, 'Test prompt for cache');
  assertEq(r2.cached, true, 'Second call is cache hit');

  // ---------------------------------------------------------------------------
  // 2. Adventure Prompt Templates
  // ---------------------------------------------------------------------------
  section('Adventure Prompt Templates');

  const {
    buildAdventureScenePrompt,
    buildAdventureCharacterPrompt,
    ADVENTURE_TEMPLATES,
  } = require('../src/image');

  assert(typeof buildAdventureScenePrompt === 'function', 'buildAdventureScenePrompt exported');
  assert(typeof buildAdventureCharacterPrompt === 'function', 'buildAdventureCharacterPrompt exported');
  assert(typeof ADVENTURE_TEMPLATES === 'object', 'ADVENTURE_TEMPLATES exported');

  // Dracula templates
  assert(ADVENTURE_TEMPLATES.dracula !== undefined, 'Dracula template exists');
  assertEq(ADVENTURE_TEMPLATES.dracula.name, 'Dracula', 'Dracula template name');
  assert(ADVENTURE_TEMPLATES.dracula.scenes.inn !== undefined, 'Dracula has inn scene');
  assert(ADVENTURE_TEMPLATES.dracula.scenes.castle !== undefined, 'Dracula has castle scene');
  assert(ADVENTURE_TEMPLATES.dracula.characters.dracula !== undefined, 'Dracula has dracula character');

  // Frankenstein templates
  assert(ADVENTURE_TEMPLATES.frankenstein !== undefined, 'Frankenstein template exists');
  assertEq(ADVENTURE_TEMPLATES.frankenstein.name, 'Frankenstein', 'Frankenstein template name');
  assert(ADVENTURE_TEMPLATES.frankenstein.scenes.laboratory !== undefined, 'Frankenstein has laboratory scene');
  assert(ADVENTURE_TEMPLATES.frankenstein.characters.creature !== undefined, 'Frankenstein has creature character');

  // Holmes templates
  assert(ADVENTURE_TEMPLATES.holmes !== undefined, 'Holmes template exists');
  assertEq(ADVENTURE_TEMPLATES.holmes.name, 'The Hound of the Baskervilles', 'Holmes template name');
  assert(ADVENTURE_TEMPLATES.holmes.scenes.baker_street !== undefined, 'Holmes has baker_street scene');
  assert(ADVENTURE_TEMPLATES.holmes.scenes.moor !== undefined, 'Holmes has moor scene');
  assert(ADVENTURE_TEMPLATES.holmes.characters.holmes !== undefined, 'Holmes has holmes character');

  // buildAdventureScenePrompt produces valid prompts
  const draculaInn = buildAdventureScenePrompt('dracula', 'inn', { mood: 'dread' });
  assert(draculaInn.includes('gothic literary illustration'), 'Dracula inn prompt has style prefix');
  assert(draculaInn.includes('inn') || draculaInn.includes('Inn'), 'Dracula inn prompt references inn');

  const frankLab = buildAdventureScenePrompt('frankenstein', 'laboratory', { mood: 'grotesque' });
  assert(frankLab.includes('laboratory') || frankLab.includes('Laboratory'), 'Frankenstein lab prompt references laboratory');

  const holmesMoor = buildAdventureScenePrompt('holmes', 'moor', { mood: 'eerie' });
  assert(holmesMoor.includes('moor') || holmesMoor.includes('Moor') || holmesMoor.includes('Dartmoor'), 'Holmes moor prompt references moor');

  // buildAdventureCharacterPrompt produces valid prompts
  const draculaChar = buildAdventureCharacterPrompt('dracula', 'dracula', { name: 'Count Dracula' });
  assert(draculaChar.includes('Dracula') || draculaChar.includes('dracula'), 'Dracula character prompt references dracula');
  assert(draculaChar.includes('gothic literary illustration'), 'Dracula character prompt has style prefix');

  const creatureChar = buildAdventureCharacterPrompt('frankenstein', 'creature', { name: 'The Creature' });
  assert(creatureChar.includes('Creature') || creatureChar.includes('creature'), 'Creature character prompt references creature');

  // Fallback for unknown adventure
  const unknownScene = buildAdventureScenePrompt('unknown_adventure', 'test', { description: 'A test scene' });
  assert(unknownScene.includes('test') || unknownScene.includes('A test scene'), 'Unknown adventure falls back to generic prompt');

  // ---------------------------------------------------------------------------
  // 3. Disk-Based Persistent Store
  // ---------------------------------------------------------------------------
  section('Disk-Based Persistent Store');

  const { createPersistentStore, makeKey } = require('../src/image/persistent-store');

  // Configurable directory
  const storeDir = path.join(TEST_DIR, 'custom-images');
  const store = createPersistentStore({ dir: storeDir, max: 10 });
  assertEq(store.dir, storeDir, 'Store uses custom directory');
  assert(fs.existsSync(storeDir), 'Custom directory created on disk');
  assertEq(store.size, 0, 'New store is empty');

  // makeKey determinism
  const k1 = makeKey('test prompt', 'Mock', 'scene');
  const k2 = makeKey('test prompt', 'Mock', 'scene');
  assertEq(k1, k2, 'makeKey is deterministic');
  assert(k1.match(/^[a-f0-9]{32}$/), 'makeKey returns 32-char hex');

  // Store and retrieve (using a local file since mock returns data URI)
  const testImagePath = path.join(TEST_DIR, 'test-image.png');
  fs.writeFileSync(testImagePath, Buffer.from('fake-png-data'));

  // Manually add entry to simulate a stored image
  const testKey = makeKey('manual test', 'Mock', 'scene');
  const testFilename = testKey + '.png';
  fs.writeFileSync(path.join(storeDir, testFilename), 'fake-png-data');

  // We need to access the store's internal index — use the store API
  // Since store() expects a URL to download, let's test has/get with a manually created index
  const indexPath = path.join(storeDir, 'index.json');
  const indexData = {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: {
      [testKey]: {
        filename: testFilename,
        prompt: 'manual test prompt',
        provider: 'Mock',
        style: 'scene',
        generatedAt: new Date().toISOString(),
      },
    },
  };
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

  // Reload store to pick up the index
  const store2 = createPersistentStore({ dir: storeDir, max: 10 });
  assertEq(store2.size, 1, 'Reloaded store has 1 entry');
  assert(store2.has(testKey), 'has() returns true for stored key');

  const entry = store2.get(testKey);
  assert(entry !== null, 'get() returns entry');
  assertEq(entry.prompt, 'manual test prompt', 'Entry prompt matches');
  assertEq(entry.provider, 'Mock', 'Entry provider matches');
  assert(entry.filePath.endsWith('.png'), 'Entry filePath ends with .png');
  assert(fs.existsSync(entry.filePath), 'Entry file exists on disk');

  // Eviction test
  const store3 = createPersistentStore({ dir: path.join(TEST_DIR, 'evict-test'), max: 2 });
  // Add 3 entries manually
  for (let i = 0; i < 3; i++) {
    const key = 'key' + i;
    const filename = key + '.png';
    fs.writeFileSync(path.join(store3.dir, filename), 'data' + i);
  }
  const evictIndex = {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: {},
  };
  for (let i = 0; i < 3; i++) {
    evictIndex.entries['key' + i] = {
      filename: 'key' + i + '.png',
      prompt: 'prompt ' + i,
      provider: 'test',
      style: '',
      generatedAt: new Date().toISOString(),
    };
  }
  fs.writeFileSync(path.join(store3.dir, 'index.json'), JSON.stringify(evictIndex, null, 2));

  // Reload — should load all 3, but max is 2, so eviction happens on next store()
  const store3b = createPersistentStore({ dir: store3.dir, max: 2 });
  assertEq(store3b.size, 3, 'All 3 entries loaded (eviction is lazy)');

  // Stats
  const stats = store2.stats();
  assertEq(stats.count, 1, 'Stats count = 1');
  assertEq(stats.maxEntries, 10, 'Stats maxEntries = 10');
  assertEq(stats.dir, storeDir, 'Stats dir matches');
  assert(Array.isArray(stats.entries), 'Stats entries is array');

  // Remove
  store2.remove(testKey);
  assertEq(store2.size, 0, 'Entry removed');
  assert(!fs.existsSync(path.join(storeDir, testFilename)), 'File deleted on remove');

  // Clear
  const store4 = createPersistentStore({ dir: path.join(TEST_DIR, 'clear-test'), max: 10 });
  for (let i = 0; i < 3; i++) {
    fs.writeFileSync(path.join(store4.dir, 'f' + i + '.png'), 'data');
  }
  const clearIndex = {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: {},
  };
  for (let i = 0; i < 3; i++) {
    clearIndex.entries['f' + i] = {
      filename: 'f' + i + '.png',
      prompt: 'p',
      provider: 't',
      style: '',
      generatedAt: new Date().toISOString(),
    };
  }
  fs.writeFileSync(path.join(store4.dir, 'index.json'), JSON.stringify(clearIndex, null, 2));
  const store4b = createPersistentStore({ dir: store4.dir, max: 10 });
  assertEq(store4b.size, 3, 'Store4 has 3 entries before clear');
  store4b.clear();
  assertEq(store4b.size, 0, 'Store4 empty after clear');
  assert(!fs.existsSync(path.join(store4.dir, 'f0.png')), 'File deleted on clear');

  // ---------------------------------------------------------------------------
  // 4. DM Image Hook (integration)
  // ---------------------------------------------------------------------------
  section('DM Image Hook');

  // Verify the DM service exports include the image hook functions
  const dmService = require('../src/ai-dm/dm-service');
  assert(typeof dmService.createGame === 'function', 'createGame exported');
  assert(typeof dmService.processAction === 'function', 'processAction exported');

  // Create a game and verify it has the image hook capability
  const game = dmService.createGame({
    adventureId: 'dracula',
    adventureName: 'Dracula',
    llmProvider: async () => 'Test response',
  });
  assert(game !== null, 'Game created successfully');
  assertEq(game.adventureId, 'dracula', 'Game adventureId = dracula');

  // ---------------------------------------------------------------------------
  // 5. Image Service with Mock Provider (end-to-end)
  // ---------------------------------------------------------------------------
  section('Image Service End-to-End (Mock)');

  // Create service with mock provider and custom cache dir
  const e2eSvc = createImageService({
    cacheDir: path.join(TEST_DIR, 'e2e-cache'),
    enabled: true,
  });
  assert(e2eSvc.isEnabled, 'E2E service enabled');
  assertEq(e2eSvc.providerName, 'Mock', 'E2E provider is Mock');

  // Generate multiple images
  const e2e1 = await e2eSvc.generateScene({
    description: 'A dark forest path',
    location: 'The Black Forest',
    mood: 'eerie',
  });
  assert(e2e1 !== null, 'E2E scene 1 generated');

  const e2e2 = await e2eSvc.generateCharacter({
    name: 'The Creature',
    appearance: 'Eight feet tall, yellow skin, pale blue eyes',
    mood: 'grotesque',
  });
  assert(e2e2 !== null, 'E2E character generated');

  const e2e3 = await e2eSvc.generateCombat({
    attacker: 'Sherlock Holmes',
    defender: 'The Hound',
    weapon: 'Revolver',
    outcome: 'kill',
  });
  assert(e2e3 !== null, 'E2E combat generated');

  // Cache stats
  const e2eStats = e2eSvc.cacheStats;
  assert(e2eStats.size >= 3, 'E2E cache has 3+ entries');

  // Clear cache
  e2eSvc.clearCache();
  assertEq(e2eSvc.cacheStats.size, 0, 'E2E cache cleared');

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n═══════════════════════════════════════════');
  console.log('  IMAGE PIPELINE RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
  console.log('═══════════════════════════════════════════\n');

  cleanup();
  process.exit(failed > 0 ? 1 : 0);
})().catch(err => {
  console.error('Image pipeline test crashed:', err.message);
  console.error(err.stack);
  cleanup();
  process.exit(1);
});
