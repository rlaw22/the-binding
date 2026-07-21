// Probe: inventory edge cases and potential bugs
const inv = require('./src/inventory/inventory');

// Test 1: damageEquipment on broken item (sets broken flag but doesn't remove from slot)
const i1 = inv.createInventory(['silver_dagger']);
inv.equipItem(i1, 'silver_dagger', 'weapon');
const r1 = inv.damageEquipment(i1, 'weapon', 100);
console.log('damageEquipment broken:', r1.broken, 'slot still has item:', i1.equipment.weapon !== null);

// Test 2: damageEquipment on consumable slot
const i2 = inv.createInventory(['garlic']);
inv.equipItem(i2, 'garlic', 'consumable_1');
const r2 = inv.damageEquipment(i2, 'consumable_1');
console.log('damageEquipment on consumable:', JSON.stringify(r2));

// Test 3: repairItem default amount=-1 for equipped items
const i3 = inv.createInventory(['silver_dagger']);
inv.equipItem(i3, 'silver_dagger', 'weapon');
inv.damageEquippedDurability(i3, 'weapon', 50);
const r3 = inv.repairItem(i3, 'silver_dagger', -1);
console.log('repairItem equipped with amount=-1:', JSON.stringify(r3));
// BUG: amount=-1 means Math.min(max, current + (-1)) = Math.min(100, 49) = 49

// Test 4: buyItem with stacked consumable
const i4 = inv.createInventory();
inv.addItem(i4, 'garlic'); // 3 uses
const r4 = inv.buyItem(i4, 'garlic', 100);
console.log('buyItem stacks consumable:', r4.success, 'remainingUses:', r4.item.remainingUses);

// Test 5: sellItem with stacked consumable
const i5 = inv.createInventory();
inv.addItem(i5, 'garlic');
inv.addItem(i5, 'garlic'); // 6 uses now
const r5 = inv.sellItem(i5, 'garlic');
console.log('sellItem stacked garlic:', r5.success, 'coins:', r5.coinsEarned);
console.log('garlic remaining after sell:', inv.hasItem(i5, 'garlic'));

// Test 6: getSetBonus not exported
console.log('getSetBonus exported:', typeof inv.getSetBonus);
console.log('useItemFromInventory exported:', typeof inv.useItemFromInventory);

// Test 7: damageEquipment doesn't remove broken item from slot
const i7 = inv.createInventory(['leather_armor']);
inv.equipItem(i7, 'leather_armor', 'armor');
inv.damageEquipment(i7, 'armor', 80); // breaks it
console.log('After damageEquipment break, slot still occupied:', i7.equipment.armor !== null);
console.log('Broken flag set:', i7.equipment.armor && i7.equipment.armor.broken);

// Test 8: damageEquippedDurability DOES remove broken item from slot
const i8 = inv.createInventory(['leather_armor']);
inv.equipItem(i8, 'leather_armor', 'armor');
inv.damageEquippedDurability(i8, 'armor', 80); // breaks it
console.log('After damageEquippedDurability break, slot occupied:', i8.equipment.armor !== null);

// Test 9: durability display in getInventoryContext for broken items
const i9 = inv.createInventory(['silver_dagger']);
inv.equipItem(i9, 'silver_dagger', 'weapon');
inv.damageEquipment(i9, 'weapon', 100);
const ctx = inv.getInventoryContext(i9);
console.log('Context after break:', ctx);

// Test 10: sellItem sells entire stack at flat price (stack of 6 garlic = 5 coins, not 5*6)
console.log('\n--- Sell price analysis ---');
const i10 = inv.createInventory();
inv.addItem(i10, 'garlic');
inv.addItem(i10, 'garlic');
inv.addItem(i10, 'garlic'); // 9 uses
console.log('Garlic 9 uses sell price:', inv.sellItem(i10, 'garlic').coinsEarned, '(flat 5, not proportional)');

// Test 11: repairItem for equipped item with amount=-1 should full-repair
// But the code does: Math.min(maxDurability, equipped.durability + amount)
// with amount=-1, that's Math.min(100, 49 + (-1)) = 49 — NOT full repair
console.log('\n--- repairItem bug for equipped items ---');
const i11 = inv.createInventory(['silver_dagger']);
inv.equipItem(i11, 'silver_dagger', 'weapon');
inv.damageEquippedDurability(i11, 'weapon', 50); // 50 remaining
const r11 = inv.repairItem(i11, 'silver_dagger', -1);
console.log('Expected full repair (100), got:', r11.current);
console.log('BUG: repairItem with amount=-1 for EQUIPPED items does not full-repair');

// Test 12: Check if tools can be equipped (they shouldn't — no slot accepts 'tool')
const i12 = inv.createInventory(['rope']);
const r12 = inv.equipItem(i12, 'rope', 'weapon');
console.log('Tool in weapon slot:', r12.success, r12.reason);
const r12b = inv.equipItem(i12, 'rope', 'accessory');
console.log('Tool in accessory slot:', r12b.success, r12b.reason);
