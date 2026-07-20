/**
 * Durability & Image Module Integration Tests
 * Tests image module exports, inventory durability, and dynamic difficulty.
 */
let passed = 0, failed = 0, total = 0;

function assert(c, l) { total++; if (c) { passed++; console.log('  ✓ ' + l); } else { failed++; console.error('  ✗ ' + l); } }
function assertEq(a, e, l) { const av = JSON.stringify(a), ev = JSON.stringify(e); assert(av === ev, l + (av !== ev ? ` (got ${av}, expected ${ev})` : '')); }

// ── Image Module Exports ──────────────────────────────────────────────
console.log('\n  Image Module Exports\n');
const img = require('../src/image');
assert(typeof img.createImageService === 'function', 'createImageService exported');
assert(typeof img.ImageCacheStore === 'function', 'ImageCacheStore exported');
assert(typeof img.generateAndCache === 'function', 'generateAndCache exported');
assert(typeof img.getImageCacheStats === 'function', 'getImageCacheStats exported');
assert(typeof img.clearImageCache === 'function', 'clearImageCache exported');
assert(typeof img.IMAGE_CACHE_TTL_MS === 'number', 'IMAGE_CACHE_TTL_MS exported');
assert(typeof img.IMAGE_CACHE_MAX === 'number', 'IMAGE_CACHE_MAX exported');

// ImageCacheStore basics
console.log('\n  ImageCacheStore\n');
const store = new img.ImageCacheStore(3, 60000);
const k1 = img.ImageCacheStore.makeKey('a', 'test', '');
const k2 = img.ImageCacheStore.makeKey('b', 'test', '');
const k3 = img.ImageCacheStore.makeKey('c', 'test', '');
const k4 = img.ImageCacheStore.makeKey('d', 'test', '');
store.set(k1, { imageUrl: 'u1', prompt: 'a', generatedAt: Date.now(), expiresAt: Date.now() + 60000 });
store.set(k2, { imageUrl: 'u2', prompt: 'b', generatedAt: Date.now(), expiresAt: Date.now() + 60000 });
store.set(k3, { imageUrl: 'u3', prompt: 'c', generatedAt: Date.now(), expiresAt: Date.now() + 60000 });
assertEq(store.size, 3, 'Store has 3 entries');
assertEq(store.get(k1).imageUrl, 'u1', 'get returns correct value');
store.set(k4, { imageUrl: 'u4', prompt: 'd', generatedAt: Date.now(), expiresAt: Date.now() + 60000 });
assertEq(store.size, 3, 'Evicts oldest when full');
assert(store.get(k2) === undefined, 'Oldest evicted');
store.clear();
assertEq(store.size, 0, 'Clear works');

// createImageService disabled
console.log('\n  createImageService\n');
const svc = img.createImageService({ enabled: false });
assert(svc.isEnabled === false, 'Disabled: isEnabled=false');
assert(svc.providerName === null, 'Disabled: providerName=null');
assertEq(svc.cacheStats.max, 100, 'Default cache 100');
assert(typeof svc.generateScene === 'function', 'generateScene exists');
assert(typeof svc.generateRaw === 'function', 'generateRaw exists');

// Cache stats/clear
console.log('\n  Cache Stats\n');
img.clearImageCache();
const stats = img.getImageCacheStats();
assertEq(stats.size, 0, 'Empty after clear');
assertEq(stats.maxSize, img.IMAGE_CACHE_MAX, 'maxSize matches constant');
assertEq(stats.ttlMs, img.IMAGE_CACHE_TTL_MS, 'ttlMs matches constant');

// ── Inventory Durability ──────────────────────────────────────────────
console.log('\n  Inventory Durability\n');
const inv = require('../src/inventory/inventory');

const inv1 = inv.createInventory(['silver_dagger', 'crucifix', 'garlic']);
const dagger = inv1.slots.find(s => s.id === 'silver_dagger');
assert(dagger !== undefined, 'Silver dagger in inventory');
assertEq(dagger.durability, 100, 'Silver dagger starts at 100');

const crucifix = inv1.slots.find(s => s.id === 'crucifix');
assertEq(crucifix.durability, 100, 'Crucifix starts at 100');

const garlic = inv1.slots.find(s => s.id === 'garlic');
assert(garlic.durability === null, 'Consumable durability is null');

// damageDurability
console.log('\n  damageDurability\n');
let r = inv.damageDurability(inv1, 'silver_dagger', 30);
assert(r !== null, 'Damage 30 succeeds');
assertEq(r.broken, false, 'Not broken at 70');
assertEq(r.current, 70, 'Current is 70');

r = inv.damageDurability(inv1, 'silver_dagger', 70);
assert(r !== null, 'Damage 70 succeeds');
assertEq(r.broken, true, 'Broken at 0');
assert(!inv.hasItem(inv1, 'silver_dagger'), 'Broken item removed');

// Consumable can't be damaged
r = inv.damageDurability(inv1, 'garlic', 1);
assert(r === null, 'Cannot damage consumable');

// Nonexistent returns null
r = inv.damageDurability(inv1, 'nonexistent', 1);
assert(r === null, 'Nonexistent item returns null');

// damageEquippedDurability
console.log('\n  damageEquippedDurability\n');
const inv2 = inv.createInventory(['silver_dagger', 'leather_armor']);
inv.equipItem(inv2, 'silver_dagger', 'weapon');
inv.equipItem(inv2, 'leather_armor', 'armor');

r = inv.damageEquippedDurability(inv2, 'weapon', 50);
assert(r !== null, 'Equipped weapon damaged');
assertEq(r.current, 50, 'Weapon at 50/100');

r = inv.damageEquippedDurability(inv2, 'weapon', 50);
assertEq(r.broken, true, 'Weapon breaks at 0');
assert(inv2.equipment.weapon === null, 'Weapon slot cleared');

r = inv.damageEquippedDurability(inv2, 'armor', 20);
assertEq(r.current, 60, 'Armor at 60/80 after 20 damage');

// repairItem
console.log('\n  repairItem\n');
const inv3 = inv.createInventory(['crucifix', 'silver_dagger']);
inv.damageDurability(inv3, 'crucifix', 80);
let c = inv3.slots.find(s => s.id === 'crucifix');
assertEq(c.durability, 20, 'Crucifix at 20 after 80 damage');

r = inv.repairItem(inv3, 'crucifix', 30);
assert(r !== null, 'Repair succeeds');
assertEq(r.current, 50, 'Repaired to 50');

r = inv.repairItem(inv3, 'crucifix'); // default full repair
assertEq(r.current, 100, 'Full repair to 100');

r = inv.repairItem(inv3, 'nonexistent');
assert(r === null, 'Repair nonexistent returns null');

// getInventoryContext shows durability
console.log('\n  getInventoryContext\n');
const inv4 = inv.createInventory(['silver_dagger']);
inv.equipItem(inv4, 'silver_dagger', 'weapon');
inv.damageEquippedDurability(inv4, 'weapon', 40);
const ctx = inv.getInventoryContext(inv4);
assert(ctx.includes('60') && ctx.includes('100'), 'Context shows durability numbers');

// ── Dynamic Difficulty ────────────────────────────────────────────────
console.log('\n  Dynamic Difficulty\n');
const { DynamicDifficulty, TIERS } = require('../src/difficulty/dynamic-difficulty');

const dd = new DynamicDifficulty();
const serialized = dd.serialize();
const dd2 = DynamicDifficulty.deserialize(serialized);
assertEq(dd2.totalCombats, 0, 'Deserialized has 0 combats');

dd.recordOutcome('defeat', 5, 30, 2);
dd.recordOutcome('defeat', 3, 30, 2);
assertEq(dd.getNextTier(), TIERS.POWER_WINDOW, '2 losses → power window');

const dd3 = new DynamicDifficulty();
dd3.recordOutcome('victory', 25, 30, 2);
dd3.recordOutcome('victory', 20, 30, 2);
dd3.recordOutcome('victory', 15, 30, 2);
const tier = dd3.getNextTier();
assert([TIERS.FAIR, TIERS.POWER_WINDOW, TIERS.CHALLENGE].includes(tier), 'After 3 wins returns valid tier');

const s = dd3.getStats();
assertEq(s.totalCombats, 3, 'Stats: 3 combats');
assertEq(s.wins, 3, 'Stats: 3 wins');

dd3.recordOutcome('fled', 10, 30, 1);
assertEq(dd3.consecutiveWins, 0, 'Fled resets wins');

// scaleEnemies
console.log('\n  scaleEnemies\n');
const enemies = [{ hp: 20, attackBonus: 3, ac: 15 }];
const pw = dd3.scaleEnemies(enemies, TIERS.POWER_WINDOW);
assertEq(pw[0].hp, 16, 'Power: -20% HP');
const ch = dd3.scaleEnemies(enemies, TIERS.CHALLENGE);
assertEq(ch[0].hp, 26, 'Challenge: +30% HP');
const fair = dd3.scaleEnemies(enemies, TIERS.FAIR);
assertEq(fair[0].hp, 20, 'Fair: no change');

// Narrative wrapper
const w = dd3.getNarrativeWrapper(TIERS.CHALLENGE);
assert(typeof w === 'string' && w.length > 10, 'Narrative wrapper is non-empty string');

// ── Async + Summary ───────────────────────────────────────────────────
(async () => {
  const r1 = await img.generateAndCache(null, 'test');
  assertEq(r1.imageUrl, null, 'generateAndCache null service → null');
  const r2 = await img.generateAndCache(svc, 'test');
  assertEq(r2.imageUrl, null, 'generateAndCache disabled → null');

  console.log('\n═══════════════════════════════════════════');
  console.log(`  RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
})();
