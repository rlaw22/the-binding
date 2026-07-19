/**
 * Phase 1 Integration Tests — TTS, Dynamic Difficulty, Inventory, Coin Engine
 * Verifies all Phase 1 modules load, export correctly, and basic flows work.
 */
let passed = 0, failed = 0, total = 0;
function assert(c, label) { total++; if (c) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label); } }
function assertEq(a, e, label) { total++; const av = JSON.stringify(a), ev = JSON.stringify(e); if (av === ev) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label + ' — expected ' + ev + ', got ' + av); } }
function section(n) { console.log('\n═══ ' + n + ' ═══'); }

// ─── TTS Service ─────────────────────────────────────────────────
section('TTS Service');
{
  const { createTTSService, detectProvider, getCachedAudio, cleanupCache } = require('../src/voice/tts-service');
  assert(typeof createTTSService === 'function', 'createTTSService exported');
  assert(typeof detectProvider === 'function', 'detectProvider exported');
  assert(typeof getCachedAudio === 'function', 'getCachedAudio exported');
  assert(typeof cleanupCache === 'function', 'cleanupCache exported');

  // Service with explicit provider (no API key needed for object creation)
  const ttsNovita = createTTSService({ provider: 'novita', voice: 'Emily', speed: 0.95 });
  assert(ttsNovita !== null, 'TTS Novita service created');
  assert(ttsNovita.isReady() === true, 'TTS Novita service reports ready');
  assertEq(ttsNovita.provider, 'novita', 'provider is novita');
  assertEq(ttsNovita.voice, 'Emily', 'voice is Emily');
  assertEq(ttsNovita.speed, 0.95, 'speed is 0.95');

  // Auto-detect with no env vars — should return null provider gracefully
  const oldNovita = process.env.NOVITA_API_KEY;
  const oldOpenai = process.env.OPENAI_API_KEY;
  const oldEleven = process.env.ELEVENLABS_API_KEY;
  delete process.env.NOVITA_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  const detected = detectProvider();
  assertEq(detected, null, 'detectProvider returns null with no env vars');
  if (oldNovita) process.env.NOVITA_API_KEY = oldNovita;
  if (oldOpenai) process.env.OPENAI_API_KEY = oldOpenai;
  if (oldEleven) process.env.ELEVENLABS_API_KEY = oldEleven;

  // Generate with empty text should skip
  ttsNovita.generate('').then(r => {
    assertEq(r.status, 'skipped', 'empty text returns skipped');
  }).catch(() => assert(false, 'empty text generate should not throw'));
}

// ─── Dynamic Difficulty ──────────────────────────────────────────
section('Dynamic Difficulty');
{
  const { DynamicDifficulty, CALIBRATION, TIERS, NARRATIVE_WRAPPERS, categorizeAction } = require('../src/difficulty/dynamic-difficulty');
  assert(CALIBRATION !== undefined, 'CALIBRATION exported');
  assert(TIERS !== undefined, 'TIERS exported');
  assert(NARRATIVE_WRAPPERS !== undefined, 'NARRATIVE_WRAPPERS exported');
  assert(typeof categorizeAction === 'function', 'categorizeAction is a function');

  const dd = new DynamicDifficulty();
  assert(dd !== null, 'DynamicDifficulty instance created');

  // Action categorization
  assertEq(categorizeAction('I attack the monster'), 'combat', 'attack → combat');
  assertEq(categorizeAction('I search the room for clues'), 'investigation', 'search → investigation');
  assertEq(categorizeAction('I talk to the innkeeper'), 'social', 'talk → social');
  assertEq(categorizeAction('I cast fireball'), 'combat', 'fireball → combat');
  assertEq(categorizeAction('I explore the dungeon'), 'exploration', 'explore → exploration');

  // Rubber-band: consecutive losses tracked
  dd.recordOutcome('defeat');
  dd.recordOutcome('defeat');
  const stats1 = dd.getStats();
  assertEq(stats1.consecutiveLosses, 2, 'records 2 consecutive losses');
  assertEq(stats1.consecutiveWins, 0, 'no consecutive wins after losses');

  // Rubber-band: consecutive wins tracked
  const dd2 = new DynamicDifficulty();
  dd2.recordOutcome('victory');
  dd2.recordOutcome('victory');
  dd2.recordOutcome('victory');
  const stats2 = dd2.getStats();
  assertEq(stats2.consecutiveWins, 3, 'records 3 consecutive wins');
  assertEq(stats2.consecutiveLosses, 0, 'no consecutive losses after wins');
  assertEq(stats2.winRate, 1.0, 'win rate is 100%');

  // Enemy scaling
  const baseEnemy = { hp: 30, ac: 13, attackBonus: 4 };
  const scaledArr = dd.scaleEnemies([baseEnemy]);
  const scaled = scaledArr[0];
  assert(scaled.hp > 0, 'scaled HP is positive');
  assert(scaled.ac > 0, 'scaled AC is positive');

  // Narrative wrapper
  const wrapper = dd.getNarrativeWrapper();
  assert(typeof wrapper === 'string', 'narrative wrapper is a string');
  assert(wrapper.length > 0, 'narrative wrapper is non-empty');

  // Serialize
  const serialized = dd.serialize();
  assert(serialized !== null, 'serialize returns object');
  assert(serialized.totalCombats !== undefined, 'serialized has totalCombats');
}

// ─── Inventory System ────────────────────────────────────────────
section('Inventory System');
{
  const inv = require('../src/inventory/inventory');
  assert(typeof inv.createInventory === 'function', 'createInventory exported');
  assert(typeof inv.addItem === 'function', 'addItem exported');
  assert(typeof inv.equipItem === 'function', 'equipItem exported');
  assert(typeof inv.useEquippedConsumable === 'function', 'useEquippedConsumable exported');
  assert(typeof inv.getInventoryContext === 'function', 'getInventoryContext exported');
  assert(typeof inv.getShoppeCatalog === 'function', 'getShoppeCatalog exported');
  assert(typeof inv.buyItem === 'function', 'buyItem exported');
  assert(typeof inv.sellItem === 'function', 'sellItem exported');
  assert(inv.ITEMS !== undefined, 'ITEMS catalog exists');
  assert(inv.EQUIPMENT_SLOTS !== undefined, 'EQUIPMENT_SLOTS defined');

  // Test inventory creation and operations
  const inventory = inv.createInventory();
  assert(inventory !== null, 'Inventory created');

  const items = Object.keys(inv.ITEMS);
  assert(items.length > 0, 'ITEMS catalog has entries: ' + items.length + ' items');

  // Shoppe catalog
  const catalog = inv.getShoppeCatalog();
  assert(Array.isArray(catalog), 'Shoppe catalog is an array');
  assert(catalog.length > 0, 'Shoppe catalog has items');

  // Add an item
  const firstItem = items[0];
  const addResult = inv.addItem(inventory, firstItem, 1);
  assert(addResult !== null, 'addItem returns result');

  // Inventory context for LLM
  const context = inv.getInventoryContext(inventory);
  assert(typeof context === 'string', 'Inventory context is a string');
}

// ─── Coin Engine ─────────────────────────────────────────────────
section('Coin Engine');
{
  const ce = require('../src/coin-engine');
  assert(ce.CALIBRATION !== undefined, 'CALIBRATION exported');
  assert(typeof ce.createCoinPool === 'function', 'createCoinPool exported');
  assert(typeof ce.checkSeasonalBudget === 'function', 'checkSeasonalBudget exported');
  assert(typeof ce.recordSeasonalSpend === 'function', 'recordSeasonalSpend exported');
  assert(typeof ce.scoreTurn === 'function', 'scoreTurn exported');
  assert(typeof ce.completeScene === 'function', 'completeScene exported');
  assert(typeof ce.calculateTier === 'function', 'calculateTier exported');
  assert(typeof ce.bellCurveNormalize === 'function', 'bellCurveNormalize exported');
  assert(typeof ce.formatAdventureSummary === 'function', 'formatAdventureSummary exported');

  // Adventure presets
  const draculaPool = ce.createCoinPool({ adventureId: 'dracula', difficulty: 'medium', totalScenes: 25 });
  assertEq(draculaPool.adventureId, 'dracula', 'Dracula pool adventureId');
  assertEq(draculaPool.categoryWeights.investigation, 0.3, 'Dracula: investigation=0.3');
  assertEq(draculaPool.seasonalBudget, 10000000, 'Seasonal budget 10M');
  assertEq(draculaPool.totalPool, 1500, 'Medium: 25 scenes × 60 = 1500');

  const frankPool = ce.createCoinPool({ adventureId: 'frankenstein', difficulty: 'hard', totalScenes: 25 });
  assertEq(frankPool.categoryWeights.creativity, 0.3, 'Frankenstein: creativity=0.3');
  assertEq(frankPool.totalPool, 2000, 'Hard: 25 × 80 = 2000');

  // Seasonal budget
  const budget = ce.checkSeasonalBudget(draculaPool, 500);
  assertEq(budget.allowed, true, 'Budget allows spending');
  ce.recordSeasonalSpend(draculaPool, 500);
  assertEq(draculaPool.seasonalSpent, 500, 'Spend recorded');

  // Scoring flow
  const scores = { creativity: 7, investigation: 8, roleplay: 6, combat: 5, exploration: 4 };
  const turnResult = ce.scoreTurn(draculaPool, 0, scores);
  assert(turnResult.turnTotal > 0, 'Turn scoring produces coins');
  assert(turnResult.coins !== undefined, 'Turn result has category breakdown');
}

// ─── Results ─────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
console.log('═══════════════════════════════════════════');
process.exit(failed > 0 ? 1 : 0);
