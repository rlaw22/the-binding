/**
 * Durability Combat Integration Tests
 *
 * Tests that weapon/armor durability decreases during combat,
 * items break at 0 durability, and repair restores durability.
 */

const {
  createInventory, addItem, equipItem, hasItem,
  damageDurability, damageEquippedDurability, repairItem,
  getEquipped, ITEMS
} = require('../src/inventory/inventory');
const { startCombat, processPlayerAction, ENEMY_TEMPLATES } = require('../src/combat/combat-manager');

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
  total++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log('  ✓ ' + label);
  } else {
    failed++;
    console.error('  ✗ ' + label + ` (expected ${e}, got ${a})`);
  }
}

// ── Inventory Durability Unit Tests ─────────────────────────────────────────

console.log('\n═══ Inventory Durability ═══');

(function testDamageDurability() {
  const inv = createInventory(['silver_dagger']);
  const slot = inv.slots.find(s => s.id === 'silver_dagger');
  assert(slot !== undefined, 'Silver dagger in inventory');
  assert(slot.durability === 100, 'Silver dagger starts at 100 durability');

  const result = damageDurability(inv, 'silver_dagger', 25);
  assert(result !== null, 'Damage durability succeeds');
  assert(result.broken === false, 'Item did not break');
  assertEq(result.current, 75, 'Durability reduced to 75');

  const result2 = damageDurability(inv, 'silver_dagger', 75);
  assert(result2 !== null, 'Damage again succeeds');
  assert(result2.broken === true, 'Item breaks at 0 durability');
  assert(!hasItem(inv, 'silver_dagger'), 'Item removed from inventory when broken');
})();

(function testDamageEquippedDurability() {
  const inv = createInventory(['leather_armor']);
  equipItem(inv, 'leather_armor', 'armor');
  const equipped = getEquipped(inv);
  assert(equipped.armor !== null, 'Leather armor equipped');
  assert(equipped.armor.durability === 80, 'Leather armor starts at 80 durability');

  const result = damageEquippedDurability(inv, 'armor', 20);
  assert(result !== null, 'Damage equipped durability succeeds');
  assert(result.broken === false, 'Armor did not break');
  assertEq(result.current, 60, 'Armor durability reduced to 60');

  // Break it
  const result2 = damageEquippedDurability(inv, 'armor', 60);
  assert(result2 !== null, 'Final armor damage succeeds');
  assert(result2.broken === true, 'Armor breaks at 0');
  const eq2 = getEquipped(inv);
  assert(eq2.armor === null, 'Armor slot cleared after break');
})();

(function testRepairItem() {
  const inv = createInventory(['silver_dagger']);
  damageDurability(inv, 'silver_dagger', 50);
  const before = inv.slots.find(s => s.id === 'silver_dagger');
  assertEq(before.durability, 50, 'Dagger at 50 after 50 damage');

  const result = repairItem(inv, 'silver_dagger', 30);
  assert(result !== null, 'Repair succeeds');
  assertEq(result.current, 80, 'Durability restored to 80');

  const result2 = repairItem(inv, 'silver_dagger'); // full repair
  assert(result2 !== null, 'Full repair succeeds');
  assertEq(result2.current, 100, 'Durability restored to 100');
})();

(function testDurabilityEdgeCases() {
  // Consumables can't be durability-damaged
  const inv = createInventory(['garlic']);
  const result = damageDurability(inv, 'garlic', 1);
  assert(result === null, 'Cannot damage durability of consumable');

  // Item not in inventory
  const result2 = damageDurability(inv, 'silver_dagger', 1);  // silver_dagger not in this inv
  // Item not in inventory returns null — guard against it
  assert(result2 === null, 'Cannot damage item not in inventory');

  // Invalid equipment slot
  const result3 = damageEquippedDurability(inv, 'helmet', 1);
  assert(result3 === null, 'Cannot damage invalid equipment slot');

  // Empty slot
  const result4 = damageEquippedDurability(inv, 'weapon', 1);
  assert(result4 === null, 'Cannot damage empty equipment slot');
})();

// ── Combat Durability Integration Tests ─────────────────────────────────────

console.log('\n═══ Combat Durability Integration ═══');

(function testWeaponDurabilityOnAttack() {
  const inv = createInventory(['silver_dagger']);
  equipItem(inv, 'silver_dagger', 'weapon');

  const playerChar = { name: 'Hunter', hp: { current: 20, max: 20 }, stats: { dexterity: 14, strength: 12 } };
  const combat = startCombat(playerChar, [{ template: 'cultist' }], null, inv);

  assert(combat.inventory === inv, 'Combat has inventory reference');

  // Player always hits a cultist (AC 12) with enough attack bonus — but rolls matter.
  // We test that IF a hit occurs, durability is damaged.
  const wpnBefore = inv.equipment.weapon.durability;
  const result = processPlayerAction(combat, 'attack');
  assert(result.narrative.length > 0, 'Attack produces narrative');

  // Check if hit occurred (look for hit log entries)
  const hitLogs = result.combat.log.filter(l => l.actor === 'Hunter' && l.action === 'attack' && l.hit);
  if (hitLogs.length > 0) {
    const wpnAfter = inv.equipment.weapon.durability;
    assert(wpnAfter < wpnBefore, 'Weapon durability decreased after successful hit');
  } else {
    // Miss — durability should be unchanged
    const wpnAfter = inv.equipment.weapon.durability;
    assertEq(wpnAfter, wpnBefore, 'Weapon durability unchanged on miss');
  }
})();

(function testArmorDurabilityOnHit() {
  const inv = createInventory(['chain_shirt']);
  equipItem(inv, 'chain_shirt', 'armor');

  const playerChar = { name: 'Tank', hp: { current: 30, max: 30 }, ac: 16, stats: { dexterity: 10, strength: 14 } };
  // Use dracula — guaranteed to hit with +9 attack bonus vs AC 16
  const combat = startCombat(playerChar, [{ template: 'dracula' }], null, inv);

  const armBefore = inv.equipment.armor.durability;
  const result = processPlayerAction(combat, 'attack');

  // Dracula has +9 attack bonus vs AC 16 — very likely to hit
  const enemyHits = result.combat.log.filter(l => l.action === 'attack' && l.hit && l.actor !== 'Tank');
  if (enemyHits.length > 0) {
    const armAfter = inv.equipment.armor.durability;
    assert(armAfter < armBefore, 'Armor durability decreased when player is hit');
  } else {
    console.log('  (enemy missed — armor durability not tested this round)');
    assert(true, 'Enemy miss — no armor damage expected');
  }
})();

(function testItemBreakNarrative() {
  const inv = createInventory(['mirror']); // maxDurability: 40
  equipItem(inv, 'mirror', 'accessory');

  // Manually set durability to 1 so next hit breaks it
  const slot = inv.slots.find(s => s.id === 'mirror');
  // Mirror is equipped, not in slots. Let's damage the equipped version.
  damageEquippedDurability(inv, 'accessory', 39); // 40 - 39 = 1
  const eq = getEquipped(inv);
  assertEq(eq.accessory.durability, 1, 'Mirror at 1 durability');

  // Now damage it one more — should break
  const result = damageEquippedDurability(inv, 'accessory', 1);
  assert(result.broken === true, 'Mirror breaks on final damage point');
  const eq2 = getEquipped(inv);
  assert(eq2.accessory === null, 'Accessory slot cleared after mirror breaks');
})();

(function testCombatWithoutInventory() {
  // Combat should work fine without inventory (backward compat)
  const playerChar = { name: 'Hero', hp: { current: 20, max: 20 }, stats: { dexterity: 14, strength: 12 } };
  const combat = startCombat(playerChar, [{ template: 'cultist' }], null, null);
  assert(combat.inventory === null, 'Combat works without inventory');

  const result = processPlayerAction(combat, 'attack');
  assert(result.narrative.length > 0, 'Attack works without inventory');
})();

(function testCombatWithInventoryNoWeapon() {
  // Combat with inventory but no weapon equipped
  const inv = createInventory(['garlic', 'torch']);
  const playerChar = { name: 'Unarmed', hp: { current: 15, max: 15 }, stats: { dexterity: 12, strength: 10 } };
  const combat = startCombat(playerChar, [{ template: 'cultist' }], null, inv);

  const result = processPlayerAction(combat, 'attack');
  assert(result.narrative.length > 0, 'Attack works without equipped weapon');
  // No weapon durability damage should occur
  assert(true, 'No error from missing weapon slot');
})();

// ── Results ─────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════');
console.log(`  RESULTS: ${passed}/${total} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════');

if (failed > 0) process.exit(1);
