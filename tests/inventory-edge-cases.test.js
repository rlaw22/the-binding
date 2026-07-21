/**
 * Inventory Edge-Case Tests — The Binding
 * 
 * Tests real behavior for:
 * - Duplicate item equipping (equipping same item twice)
 * - Equipping to wrong slot type
 * - Selling equipped items (sellItem only checks inventory.slots, not equipment)
 * - Shoppe with insufficient gold
 * - Durability at zero (broken items)
 * - Equipping when slot already occupied (auto-unequip)
 * - Lore items cannot be equipped
 * - Consumable stacking edge cases
 */

let passed = 0, failed = 0, total = 0;

function assert(c, label) {
  total++;
  if (c) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ FAILED: ' + label); }
}

function assertEq(a, e, label) {
  total++;
  const av = JSON.stringify(a), ev = JSON.stringify(e);
  if (av === ev) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ FAILED: ' + label + ' — expected ' + ev + ', got ' + av); }
}

function section(name) { console.log('\n═══ ' + name + ' ═══'); }

const inv = require('../src/inventory/inventory');

// ── Duplicate Item Equipping ────────────────────────────────────────────────
section('Duplicate Item Equipping');
{
  // Create inventory with two silver daggers (addItem creates separate slots)
  const inventory = inv.createInventory();
  inv.addItem(inventory, 'silver_dagger');
  inv.addItem(inventory, 'silver_dagger');
  assertEq(inventory.slots.length, 2, 'Two silver daggers in inventory');

  // Equip first dagger
  const r1 = inv.equipItem(inventory, 'silver_dagger', 'weapon');
  assertEq(r1.success, true, 'First dagger equipped');
  assertEq(inventory.slots.length, 1, 'One dagger remains in inventory');

  // Equip second dagger — should succeed (unequips first, equips second)
  const r2 = inv.equipItem(inventory, 'silver_dagger', 'weapon');
  assertEq(r2.success, true, 'Second dagger equipped (replaces first)');
  assert(r2.unequipped !== null, 'First dagger was unequipped');
  assertEq(r2.unequipped.id, 'silver_dagger', 'Unequipped item is silver_dagger');
  assertEq(inventory.slots.length, 1, 'Still one dagger in inventory (the unequipped one)');
  assertEq(inventory.equipment.weapon.id, 'silver_dagger', 'Weapon slot has silver_dagger');
}

// ── Equipping to Wrong Slot Type ────────────────────────────────────────────
section('Equipping to Wrong Slot Type');
{
  const inventory = inv.createInventory(['silver_dagger', 'leather_armor', 'crucifix']);

  // Weapon in armor slot
  const r1 = inv.equipItem(inventory, 'silver_dagger', 'armor');
  assertEq(r1.success, false, 'Weapon cannot go in armor slot');
  assert(r1.reason.includes("weapon"), 'Reason mentions weapon type');
  assert(r1.reason.includes("armor"), 'Reason mentions armor slot');

  // Armor in weapon slot
  const r2 = inv.equipItem(inventory, 'leather_armor', 'weapon');
  assertEq(r2.success, false, 'Armor cannot go in weapon slot');

  // Accessory in consumable slot
  const r3 = inv.equipItem(inventory, 'crucifix', 'consumable_1');
  assertEq(r3.success, false, 'Accessory cannot go in consumable slot');

  // Consumable in accessory slot
  const inventory2 = inv.createInventory(['garlic']);
  const r4 = inv.equipItem(inventory2, 'garlic', 'accessory');
  assertEq(r4.success, false, 'Consumable cannot go in accessory slot');

  // Invalid slot name
  const r5 = inv.equipItem(inventory, 'silver_dagger', 'helmet');
  assertEq(r5.success, false, 'Invalid slot name rejected');
  assert(r5.reason.includes('Invalid slot'), 'Reason mentions invalid slot');

  // Correct placements still work
  const r6 = inv.equipItem(inventory, 'silver_dagger', 'weapon');
  assertEq(r6.success, true, 'Weapon in weapon slot works');
  const r7 = inv.equipItem(inventory, 'leather_armor', 'armor');
  assertEq(r7.success, true, 'Armor in armor slot works');
  const r8 = inv.equipItem(inventory, 'crucifix', 'accessory');
  assertEq(r8.success, true, 'Accessory in accessory slot works');
}

// ── Selling Equipped Items ──────────────────────────────────────────────────
section('Selling Equipped Items');
{
  // sellItem only checks inventory.slots, not equipment — equipped items can't be sold
  const inventory = inv.createInventory(['silver_dagger', 'crucifix']);
  inv.equipItem(inventory, 'silver_dagger', 'weapon');

  // Try to sell the equipped weapon — should fail because it's no longer in slots
  const r1 = inv.sellItem(inventory, 'silver_dagger');
  assertEq(r1.success, false, 'Cannot sell equipped item (not in inventory.slots)');
  assertEq(r1.reason, 'Item not in inventory', 'Reason: item not in inventory');

  // Unequipped item can be sold
  const r2 = inv.sellItem(inventory, 'crucifix');
  assertEq(r2.success, true, 'Unequipped item sells successfully');
  assert(r2.coinsEarned > 0, 'Earns coins from selling');
  assertEq(r2.coinsEarned, 15, 'Crucifix sells for 15 (floor(30/2))');

  // After unequipping, the item can be sold
  inv.unequipItem(inventory, 'weapon');
  const r3 = inv.sellItem(inventory, 'silver_dagger');
  assertEq(r3.success, true, 'Unequipped weapon can now be sold');
  assertEq(r3.coinsEarned, 22, 'Silver dagger sells for 22 (floor(45/2))');
}

// ── Shoppe with Insufficient Gold ───────────────────────────────────────────
section('Shoppe with Insufficient Gold');
{
  const inventory = inv.createInventory();

  // Try to buy with 0 coins
  const r1 = inv.buyItem(inventory, 'silver_dagger', 0);
  assertEq(r1.success, false, 'Cannot buy with 0 coins');
  assertEq(r1.reason, 'Not enough coins', 'Reason: not enough coins');

  // Try to buy with insufficient coins (silver_dagger costs 45)
  const r2 = inv.buyItem(inventory, 'silver_dagger', 10);
  assertEq(r2.success, false, 'Cannot buy with 10 coins (item costs 45)');
  assertEq(r2.reason, 'Not enough coins', 'Reason: not enough coins');

  // Exact coins should work
  const r3 = inv.buyItem(inventory, 'silver_dagger', 45);
  assertEq(r3.success, true, 'Buy with exact coins works');
  assertEq(r3.remainingCoins, 0, 'Remaining coins is 0');

  // One coin short
  const r4 = inv.buyItem(inventory, 'crucifix', 29);
  assertEq(r4.success, false, 'One coin short fails (crucifix costs 30)');

  // Exactly enough for crucifix
  const r5 = inv.buyItem(inventory, 'crucifix', 30);
  assertEq(r5.success, true, 'Exact coins for crucifix works');
  assertEq(r5.remainingCoins, 0, 'Remaining coins is 0');

  // Free items (lore items with null price) cannot be bought
  const r6 = inv.buyItem(inventory, 'journal', 1000);
  assertEq(r6.success, false, 'Lore item (null price) cannot be bought');
  assertEq(r6.reason, 'Item is not for sale', 'Reason: not for sale');
}

// ── Durability at Zero (Broken Items) ───────────────────────────────────────
section('Durability at Zero — Broken Items');
{
  // Item breaks at exactly 0 durability
  const inventory = inv.createInventory(['silver_dagger']);
  inv.equipItem(inventory, 'silver_dagger', 'weapon');

  // Damage to exactly 0
  const r1 = inv.damageEquippedDurability(inventory, 'weapon', 100);
  assertEq(r1.broken, true, 'Item breaks at 0 durability');
  assertEq(r1.current, 0, 'Current durability is 0');
  assertEq(inventory.equipment.weapon, null, 'Weapon slot cleared on break');

  // Overkill damage (more than max durability)
  const inventory2 = inv.createInventory(['silver_dagger']);
  inv.equipItem(inventory2, 'silver_dagger', 'weapon');
  const r2 = inv.damageEquippedDurability(inventory2, 'weapon', 999);
  assertEq(r2.broken, true, 'Overkill damage breaks item');
  assertEq(r2.current, 0, 'Durability clamped to 0 (not negative)');

  // Broken item is removed from equipment
  assertEq(inventory2.equipment.weapon, null, 'Weapon slot null after break');

  // Can equip a new item after break
  inv.addItem(inventory2, 'silver_dagger');
  const r3 = inv.equipItem(inventory2, 'silver_dagger', 'weapon');
  assertEq(r3.success, true, 'Can equip new item after previous broke');

  // Damage at 1 durability — should break
  const inventory3 = inv.createInventory(['silver_dagger']);
  inv.equipItem(inventory3, 'silver_dagger', 'weapon');
  inv.damageEquippedDurability(inventory3, 'weapon', 99); // 1 remaining
  const r4 = inv.damageEquippedDurability(inventory3, 'weapon', 1);
  assertEq(r4.broken, true, 'Breaks at 1 damage when at 1 durability');
  assertEq(r4.current, 0, 'Current is 0');
}

// ── Equipping When Slot Already Occupied ────────────────────────────────────
section('Equipping When Slot Already Occupied');
{
  const inventory = inv.createInventory(['silver_dagger', 'crucifix', 'enchanted_ring']);

  // Equip first accessory
  inv.equipItem(inventory, 'crucifix', 'accessory');
  assertEq(inventory.equipment.accessory.id, 'crucifix', 'Crucifix equipped');

  // Equip second accessory — should unequip first
  const r = inv.equipItem(inventory, 'enchanted_ring', 'accessory');
  assertEq(r.success, true, 'Second accessory equipped');
  assert(r.unequipped !== null, 'Previous accessory unequipped');
  assertEq(r.unequipped.id, 'crucifix', 'Unequipped crucifix');
  assertEq(inventory.equipment.accessory.id, 'enchanted_ring', 'Ring now in accessory slot');

  // Crucifix should be back in inventory
  assert(inv.hasItem(inventory, 'crucifix'), 'Crucifix back in inventory');
}

// ── Lore Items Cannot Be Equipped ───────────────────────────────────────────
section('Lore Items Cannot Be Equipped');
{
  const inventory = inv.createInventory(['journal', 'holmes_journal', 'lab_journal']);

  // Lore items have type 'lore' — no slot accepts 'lore'
  const r1 = inv.equipItem(inventory, 'journal', 'weapon');
  assertEq(r1.success, false, 'Lore item cannot go in weapon slot');

  const r2 = inv.equipItem(inventory, 'journal', 'armor');
  assertEq(r2.success, false, 'Lore item cannot go in armor slot');

  const r3 = inv.equipItem(inventory, 'journal', 'accessory');
  assertEq(r3.success, false, 'Lore item cannot go in accessory slot');

  const r4 = inv.equipItem(inventory, 'journal', 'consumable_1');
  assertEq(r4.success, false, 'Lore item cannot go in consumable slot');
}

// ── Consumable Stacking Edge Cases ──────────────────────────────────────────
section('Consumable Stacking');
{
  const inventory = inv.createInventory();

  // Add garlic (3 uses) — first time creates new slot
  const g1 = inv.addItem(inventory, 'garlic');
  assertEq(g1.remainingUses, 3, 'First garlic has 3 uses');

  // Add garlic again — should stack (add uses to existing)
  const g2 = inv.addItem(inventory, 'garlic');
  assertEq(g2.remainingUses, 6, 'Second garlic stacks to 6 uses');
  assertEq(inventory.slots.filter(s => s.id === 'garlic').length, 1, 'Only one garlic slot');

  // Use garlic until depleted
  inv.useItem(inventory, 'garlic'); // 5
  inv.useItem(inventory, 'garlic'); // 4
  inv.useItem(inventory, 'garlic'); // 3
  inv.useItem(inventory, 'garlic'); // 2
  inv.useItem(inventory, 'garlic'); // 1
  const lastUse = inv.useItem(inventory, 'garlic'); // 0 → consumed
  assertEq(lastUse.consumed, true, 'Garlic consumed at 0 uses');
  assert(!inv.hasItem(inventory, 'garlic'), 'Garlic removed from inventory');

  // Using item with 0 uses returns null
  const inventory2 = inv.createInventory(['wooden_stake']);
  inv.useItem(inventory2, 'wooden_stake'); // uses: 1 → 0, consumed
  const r = inv.useItem(inventory2, 'wooden_stake');
  assertEq(r, null, 'Using depleted item returns null');
}

// ── Equipping Nonexistent Item ──────────────────────────────────────────────
section('Equipping Nonexistent Item');
{
  const inventory = inv.createInventory();

  const r1 = inv.equipItem(inventory, 'nonexistent_item', 'weapon');
  assertEq(r1.success, false, 'Cannot equip item not in inventory');
  assertEq(r1.reason, 'Item not in inventory', 'Reason: not in inventory');

  const r2 = inv.equipItem(inventory, 'silver_dagger', 'weapon');
  assertEq(r2.success, false, 'Cannot equip item not in inventory (valid item ID)');
}

// ── Unequip Edge Cases ──────────────────────────────────────────────────────
section('Unequip Edge Cases');
{
  const inventory = inv.createInventory(['silver_dagger']);

  // Unequip empty slot
  const r1 = inv.unequipItem(inventory, 'weapon');
  assertEq(r1.success, false, 'Cannot unequip empty slot');
  assertEq(r1.reason, 'Nothing equipped in weapon', 'Reason: nothing equipped');

  // Equip then unequip
  inv.equipItem(inventory, 'silver_dagger', 'weapon');
  const r2 = inv.unequipItem(inventory, 'weapon');
  assertEq(r2.success, true, 'Unequip succeeds');
  assertEq(r2.item.id, 'silver_dagger', 'Unequipped item is silver_dagger');
  assertEq(inventory.equipment.weapon, null, 'Weapon slot cleared');
  assert(inv.hasItem(inventory, 'silver_dagger'), 'Item back in inventory');

  // Unequip invalid slot
  const r3 = inv.unequipItem(inventory, 'helmet');
  assertEq(r3.success, false, 'Invalid slot rejected');
}

// ── Inventory Full Edge Cases ───────────────────────────────────────────────
section('Inventory Full');
{
  const inventory = inv.createInventory();
  inventory.maxSize = 3; // Small inventory for testing

  inv.addItem(inventory, 'garlic');
  inv.addItem(inventory, 'torch');
  inv.addItem(inventory, 'holy_water');

  // Try to add when full
  const r1 = inv.addItem(inventory, 'antidote');
  assertEq(r1, null, 'addItem returns null when inventory full');

  // Try to buy when full
  const r2 = inv.buyItem(inventory, 'rope', 100);
  assertEq(r2.success, false, 'buyItem fails when inventory full');
  assertEq(r2.reason, 'Inventory full', 'Reason: inventory full');
}

// ── Results ─────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  INVENTORY EDGE-CASE RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
console.log('═══════════════════════════════════════════');
process.exit(failed > 0 ? 1 : 0);
