/**
 * Durability & Image Module Integration Tests
 *
 * Tests the durability tracking system and the image module exports
 * that were added in this session.
 */

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, label) {
  total++;
  if (condition) {
    passed++;
    console.log('  ✓ ' + label);
  } else {
    failed++;
    console.error('  ✗ ' + label);
  }
}

function assertEq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  assert(a === e, label + (a !== e ? ` (got ${a}, expected ${e})` : ''));
}

// ── Image Module Tests ──────────────────────────────────────────────────

console.log('\n  Image Module Exports\n');

const img = require('../src/image');

assert(typeof img.createImageService === 'function', 'createImageService is exported');
assert(typeof img.ImageCache === 'function', 'ImageCache class is exported');
assert(typeof img.RateLimiter === 'function', 'RateLimiter class is exported');
assert(typeof img.withRetry === 'function', 'withRetry is exported');
assert(typeof img.hashPrompt === 'function', 'hashPrompt is exported');

// ImageCache
console.log('\n  ImageCache\n');
const cache = new img.ImageCache(3);
cache.set('a', 'url_a');
cache.set('b', 'url_b');
cache.set('c', 'url_c');
assertEq(cache.size, 3, 'Cache has 3 entries');
assertEq(cache.get('a'), 'url_a', 'Cache returns correct value');
cache.set('d', 'url_d');
assertEq(cache.size, 3, 'Cache evicts oldest when full');
assert(cache.get('b') === undefined, 'Oldest entry (b) was evicted');
assert(cache.has('a'), 'Cache has key a');
cache.clear();
assertEq(cache.size, 0, 'Cache clears');

// RateLimiter
console.log('\n  RateLimiter\n');
const rl = new img.RateLimiter(3, 500);
assert(rl.check() === true, 'Rate limit allows first request');
assert(rl.check() === true, 'Rate limit allows second request');
assert(rl.check() === true, 'Rate limit allows third request');
assert(rl.check() === false, 'Rate limit blocks fourth request');
const stats = rl.stats;
assertEq(stats.current, 3, 'Rate limiter shows 3 current');
assertEq(stats.max, 3, 'Rate limiter shows max 3');

// hashPrompt
console.log('\n  hashPrompt\n');
const h1 = img.hashPrompt('test prompt');
const h2 = img.hashPrompt('test prompt');
const h3 = img.hashPrompt('different prompt');
assert(typeof h1 === 'string', 'hashPrompt returns string');
assert(h1.length === 16, 'hashPrompt returns 16 chars');
assert(h1 === h2, 'Same prompt gives same hash');
assert(h1 !== h3, 'Different prompt gives different hash');

// withRetry
console.log('\n  withRetry\n');
let attempts = 0;
async function testRetry() {
  attempts = 0;
  const result = await img.withRetry(async () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  }, 3, 10);
  assertEq(result, 'success', 'withRetry succeeds after retries');
  assertEq(attempts, 3, 'withRetry made 3 attempts');
}

// createImageService (disabled mode)
console.log('\n  createImageService\n');
const svc = img.createImageService({ enabled: false });
assert(svc.isEnabled === false, 'Disabled service reports isEnabled=false');
assert(svc.providerName === null, 'Disabled service has null provider');
assertEq(svc.cacheStats.max, 100, 'Default cache size is 100');
assert(typeof svc.generateScene === 'function', 'generateScene exists');
assert(typeof svc.generateCharacter === 'function', 'generateCharacter exists');
assert(typeof svc.generateCombat === 'function', 'generateCombat exists');
assert(typeof svc.generateRaw === 'function', 'generateRaw exists');
assert(typeof svc.clearCache === 'function', 'clearCache exists');

// Disabled service returns null
async function testDisabled() {
  const result = await svc.generateScene({ description: 'test' });
  assert(result === null, 'Disabled service returns null for generateScene');
  const raw = await svc.generateRaw('test');
  assert(raw === null, 'Disabled service returns null for generateRaw');
}

// ── Inventory Durability Tests ──────────────────────────────────────────

console.log('\n  Inventory Durability System\n');

const inv = require('../src/inventory/inventory');

// Durability in createInventory
const inv1 = inv.createInventory(['silver_dagger', 'crucifix', 'garlic']);
const daggerSlot = inv1.slots.find(s => s.id === 'silver_dagger');
assert(daggerSlot !== null, 'Silver dagger in inventory');
assertEq(daggerSlot.durability, 100, 'Silver dagger starts with 100 durability');

const crucifixSlot = inv1.slots.find(s => s.id === 'crucifix');
assertEq(crucifixSlot.durability, 100, 'Crucifix starts with 100 durability');

const garlicSlot = inv1.slots.find(s => s.id === 'garlic');
assert(garlicSlot.durability === null, 'Consumable has null durability');

// damageDurability
console.log('\n  damageDurability\n');
let dmgResult = inv.damageDurability(inv1, 'silver_dagger', 30);
assertEq(dmgResult.success, true, 'Damage succeeds');
assertEq(dmgResult.broke, false, 'Item not broken');
assertEq(dmgResult.remaining, 70, 'Remaining durability is 70');

dmgResult = inv.damageDurability(inv1, 'silver_dagger', 70);
assertEq(dmgResult.success, true, 'Damage to zero succeeds');
assertEq(dmgResult.broke, true, 'Item breaks at 0 durability');
assert(!inv.hasItem(inv1, 'silver_dagger'), 'Broken item removed from inventory');

// damageDurability on consumable should fail
dmgResult = inv.damageDurability(inv1, 'garlic', 1);
assertEq(dmgResult.success, false, 'Cannot damage consumable durability');

// damageDurability on nonexistent item
dmgResult = inv.damageDurability(inv1, 'nonexistent', 1);
assertEq(dmgResult.success, false, 'Cannot damage nonexistent item');

// damageEquippedDurability
console.log('\n  damageEquippedDurability\n');
const inv2 = inv.createInventory(['silver_dagger', 'leather_armor']);
inv.equipItem(inv2, 'silver_dagger', 'weapon');
inv.equipItem(inv2, 'leather_armor', 'armor');

dmgResult = inv.damageEquippedDurability(inv2, 'weapon', 50);
assertEq(dmgResult.success, true, 'Equipped weapon damaged');
assertEq(dmgResult.remaining, 50, 'Equipped weapon durability 50/100');

dmgResult = inv.damageEquippedDurability(inv2, 'weapon', 50);
assertEq(dmgResult.success, true, 'Equipped weapon damaged to 0');
assertEq(dmgResult.broke, true, 'Equipped weapon broke');
assert(inv2.equipment.weapon === null, 'Broken weapon unequipped');

// Armor durability
dmgResult = inv.damageEquippedDurability(inv2, 'armor', 20);
assertEq(dmgResult.remaining, 60, 'Armor durability 60/80 after 20 damage');

// repairItem
console.log('\n  repairItem\n');
const inv3 = inv.createInventory(['crucifix', 'silver_dagger']);
inv.damageDurability(inv3, 'crucifix', 80);
let crucifix = inv3.slots.find(s => s.id === 'crucifix');
assertEq(crucifix.durability, 20, 'Crucifix at 20/100 after 80 damage');

let repairResult = inv.repairItem(inv3, 'crucifix', 30);
assertEq(repairResult.success, true, 'Repair succeeds');
assertEq(repairResult.durability, 50, 'Crucifix repaired to 50/100');

repairResult = inv.repairItem(inv3, 'crucifix');
assertEq(repairResult.durability, 100, 'Full repair restores to 100/100');

// Repair nonexistent
repairResult = inv.repairItem(inv3, 'nonexistent');
assertEq(repairResult.success, false, 'Cannot repair nonexistent item');

// getInventoryContext includes durability
console.log('\n  getInventoryContext durability display\n');
const inv4 = inv.createInventory(['silver_dagger']);
inv.equipItem(inv4, 'silver_dagger', 'weapon');
inv.damageEquippedDurability(inv4, 'weapon', 40);
const ctx = inv.getInventoryContext(inv4);
assert(ctx.includes('[60/100]'), 'Context shows durability [60/100]');

// ── Dynamic Difficulty additional tests ─────────────────────────────────

console.log('\n  Dynamic Difficulty Edge Cases\n');

const { DynamicDifficulty, TIERS } = require('../src/difficulty/dynamic-difficulty');

// Reset / deserialize
const dd = new DynamicDifficulty();
const serialized = dd.serialize();
const dd2 = DynamicDifficulty.deserialize(serialized);
assertEq(dd2.totalCombats, 0, 'Deserialized DD has 0 combats');

// Multiple losses forces power window
dd.recordOutcome('defeat', 5, 30, 2);
dd.recordOutcome('defeat', 3, 30, 2);
const tierAfterLosses = dd.getNextTier();
assertEq(tierAfterLosses, TIERS.POWER_WINDOW, '2 consecutive losses forces power window');

// Multiple wins skews toward challenge
const dd3 = new DynamicDifficulty();
dd3.recordOutcome('victory', 25, 30, 2);
dd3.recordOutcome('victory', 20, 30, 2);
dd3.recordOutcome('victory', 15, 30, 2);
// After 3 wins, it should skew toward challenge (probabilistic, just check it returns valid tier)
const tierAfterWins = dd3.getNextTier();
assert(
  [TIERS.FAIR, TIERS.POWER_WINDOW, TIERS.CHALLENGE].includes(tierAfterWins),
  'After 3 wins, returns a valid tier'
);

// Stats
const ddStats = dd3.getStats();
assertEq(ddStats.totalCombats, 3, 'Stats shows 3 combats');
assertEq(ddStats.wins, 3, 'Stats shows 3 wins');
assertEq(ddStats.consecutiveWins, 3, 'Stats shows 3 consecutive wins');
assertEq(ddStats.consecutiveLosses, 0, 'Stats shows 0 consecutive losses');

// Fled outcome
dd3.recordOutcome('fled', 10, 30, 1);
assertEq(dd3.consecutiveWins, 0, 'Fled resets consecutive wins');
assertEq(dd3.consecutiveLosses, 1, 'Fled increments consecutive losses');

// scaleEnemies
console.log('\n  scaleEnemies\n');
const enemies = [{ hp: 20, attackBonus: 3, ac: 15 }];
const powerScaled = dd3.scaleEnemies(enemies, TIERS.POWER_WINDOW);
assertEq(powerScaled[0].hp, 16, 'Power window: -20% HP (20 → 16)');
assertEq(powerScaled[0].attackBonus, 1, 'Power window: -2 attack bonus');

const challengeScaled = dd3.scaleEnemies(enemies, TIERS.CHALLENGE);
assertEq(challengeScaled[0].hp, 26, 'Challenge: +30% HP (20 → 26)');
assertEq(challengeScaled[0].attackBonus, 5, 'Challenge: +2 attack bonus');
assertEq(challengeScaled[0].ac, 16, 'Challenge: +1 AC');

const fairScaled = dd3.scaleEnemies(enemies, TIERS.FAIR);
assertEq(fairScaled[0].hp, 20, 'Fair: no HP change');
assertEq(fairScaled[0].ac, 15, 'Fair: no AC change');

// Narrative wrapper
const wrapper = dd3.getNarrativeWrapper(TIERS.CHALLENGE);
assert(typeof wrapper === 'string' && wrapper.length > 10, 'Narrative wrapper is a non-empty string');

// ── Run async tests and summarize ───────────────────────────────────────

(async () => {
  await testRetry();
  await testDisabled();

  console.log('\n═══════════════════════════════════════════');
  console.log(`  RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
})();
