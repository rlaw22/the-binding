/**
 * Inventory System — Item management for The Binding.
 *
 * Tracks items per session, handles collection and usage,
 * integrates with combat (use items during encounters).
 *
 * Includes equipment slots and Shoppe economy hooks.
 *
 * Dracula-specific items included but extensible.
 */

// ── Item Definitions ────────────────────────────────────────────────────────

const ITEMS = {
  crucifix: {
    id: 'crucifix',
    name: 'Silver Crucifix',
    description: 'An old silver crucifix. It emanates a faint warmth in the presence of the undead.',
    type: 'accessory',
    consumable: false,
    price: 30,
    combatEffect: { type: 'defense', vsType: 'undead', acBonus: 2 },
    flavor: 'The figure of Christ is worn smooth from years of faithful hands.'
  },
  garlic: {
    id: 'garlic',
    name: 'Garlic Bulb',
    description: 'Pungent garlic, a traditional ward against vampires.',
    type: 'consumable',
    consumable: true,
    uses: 3,
    price: 10,
    combatEffect: { type: 'repel', vsType: 'undead', radius: 10 },
    flavor: 'The innkeeper pressed this into your hands with a warning.'
  },
  wooden_stake: {
    id: 'wooden_stake',
    name: 'Wooden Stake',
    description: 'A sharpened stake of ash wood. Can destroy a vampire at 0 HP.',
    type: 'weapon',
    consumable: true,
    uses: 1,
    price: 5,
    combatEffect: { type: 'execute', vsType: 'undead', condition: 'target_hp_0' },
    flavor: 'Carved from the wood of a church pew, consecrated and sharp.'
  },
  holy_water: {
    id: 'holy_water',
    name: 'Holy Water',
    description: 'Water blessed by a priest. Burns the undead like acid.',
    type: 'consumable',
    consumable: true,
    uses: 1,
    price: 20,
    combatEffect: { type: 'damage', vsType: 'undead', dice: '2d6', damageType: 'radiant' },
    flavor: 'The glass vial is cool to the touch, even near fire.'
  },
  silver_dagger: {
    id: 'silver_dagger',
    name: 'Silver Dagger',
    description: 'A dagger forged from silver. Bypasses the resistance of lycanthropes and some undead.',
    type: 'weapon',
    consumable: false,
    price: 45,
    combatEffect: { type: 'bonus_damage', vsType: 'undead', modifier: 2 },
    flavor: 'The blade catches moonlight and holds it.'
  },
  journal: {
    id: 'journal',
    name: "Jonathan Harker's Journal",
    description: 'A leather-bound journal filled with frantic handwriting. Contains crucial information about Castle Dracula.',
    type: 'lore',
    consumable: false,
    price: null,
    flavor: 'The pages are stained with ink and something darker.'
  },
  mirror: {
    id: 'mirror',
    name: 'Hand Mirror',
    description: 'A small silver-backed mirror. Useful for detecting vampires — they cast no reflection.',
    type: 'accessory',
    consumable: false,
    price: 15,
    combatEffect: { type: 'reveal', vsType: 'undead' },
    flavor: 'The glass is old and spotted, but still clear enough.'
  },
  wolfsbane: {
    id: 'wolfsbane',
    name: 'Wolfsbane',
    description: 'A poisonous purple flower that repels wolves and werewolves.',
    type: 'consumable',
    consumable: true,
    uses: 2,
    price: 12,
    combatEffect: { type: 'repel', vsType: 'beast', radius: 15 },
    flavor: 'Handle with care — it is as dangerous to you as to them.'
  },
  med_kit: {
    id: 'med_kit',
    name: 'Medical Kit',
    description: 'Bandages, salves, and a small bottle of spirits. Restores 2d4+2 HP.',
    type: 'consumable',
    consumable: true,
    uses: 1,
    price: 30,
    combatEffect: { type: 'heal', dice: '2d4', modifier: 2 },
    flavor: 'Dr. Seward packed this with meticulous care.'
  },
  garlic_necklace: {
    id: 'garlic_necklace',
    name: 'Garlic Necklace',
    description: 'Strung garlic bulbs worn around the neck. Continuous ward against vampires.',
    type: 'accessory',
    consumable: false,
    price: 20,
    combatEffect: { type: 'ward', vsType: 'undead', aura: 5 },
    flavor: 'Old fashioned, but effective.'
  },
  blessed_bullet: {
    id: 'blessed_bullet',
    name: 'Blessed Silver Bullet',
    description: 'A single silver bullet, blessed by a priest. Deals extra damage to undead.',
    type: 'weapon',
    consumable: true,
    uses: 1,
    price: 50,
    combatEffect: { type: 'damage', vsType: 'undead', dice: '4d6', damageType: 'radiant' },
    flavor: 'You have one shot. Make it count.'
  },

  // ── Shoppe-Exclusive Items ──────────────────────────────────────────────────

  health_potion: {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'A crimson draught that restores vitality. Heals 2d4+2 HP when consumed.',
    type: 'consumable',
    consumable: true,
    uses: 1,
    price: 25,
    combatEffect: { type: 'heal', dice: '2d4', modifier: 2 },
    flavor: 'The liquid glows faintly red, like a sunset trapped in glass.'
  },
  antidote: {
    id: 'antidote',
    name: 'Antidote',
    description: 'A bitter herbal tonic that neutralizes poisons and venoms.',
    type: 'consumable',
    consumable: true,
    uses: 1,
    price: 15,
    combatEffect: { type: 'cure', condition: 'poison' },
    flavor: 'It tastes like boiled roots and regret, but it works.'
  },
  torch: {
    id: 'torch',
    name: 'Torch',
    description: 'A sturdy wooden torch. Illuminates dark areas and can ward off some creatures.',
    type: 'consumable',
    consumable: true,
    uses: 5,
    price: 5,
    combatEffect: { type: 'illuminate', radius: 20 },
    flavor: 'The pitch-soaked head crackles with promise of light.'
  },
  rope: {
    id: 'rope',
    name: 'Hempen Rope (50ft)',
    description: 'Fifty feet of sturdy hemp rope. Useful for climbing, binding, and improvisation.',
    type: 'tool',
    consumable: false,
    price: 10,
    flavor: 'Every adventurer carries rope. The smart ones carry extra.'
  },
  lockpick_set: {
    id: 'lockpick_set',
    name: 'Lockpick Set',
    description: 'A set of fine steel picks and tension wrenches. Opens doors that keys cannot.',
    type: 'tool',
    consumable: false,
    price: 20,
    flavor: 'The tools of a burglar — or a very determined investigator.'
  },
  enchanted_ring: {
    id: 'enchanted_ring',
    name: 'Enchanted Ring',
    description: 'A silver ring inscribed with protective runes. Grants +1 AC while worn.',
    type: 'accessory',
    consumable: false,
    price: 100,
    combatEffect: { type: 'defense', acBonus: 1 },
    flavor: 'The runes shimmer faintly in candlelight, as if alive.'
  }
};

// ── Equipment Slots ─────────────────────────────────────────────────────────

/** Valid item types per equipment slot. */
const SLOT_TYPE_MAP = {
  weapon: ['weapon'],
  armor: ['armor'],
  accessory: ['accessory'],
  consumable_1: ['consumable'],
  consumable_2: ['consumable']
};

const EQUIPMENT_SLOTS = Object.keys(SLOT_TYPE_MAP);

// ── Inventory Management ────────────────────────────────────────────────────

/**
 * Create a new inventory for a player.
 * @param {Array} [startingItems] — array of item IDs to start with
 */
function createInventory(startingItems = []) {
  const slots = [];
  for (const itemId of startingItems) {
    const template = ITEMS[itemId];
    if (template) {
      slots.push({
        id: itemId,
        name: template.name,
        type: template.type,
        consumable: template.consumable,
        uses: template.uses || null,
        remainingUses: template.uses || null
      });
    }
  }
  const equipment = {
    weapon: null,
    armor: null,
    accessory: null,
    consumable_1: null,
    consumable_2: null
  };
  return { slots, maxSize: 20, equipment };
}

/**
 * Add an item to inventory.
 * @returns {object|null} the added item slot, or null if inventory full / item not found
 */
function addItem(inventory, itemId) {
  if (inventory.slots.length >= inventory.maxSize) return null;
  const template = ITEMS[itemId];
  if (!template) return null;

  // If stackable consumable and already in inventory, add uses
  if (template.consumable) {
    const existing = inventory.slots.find(s => s.id === itemId && s.remainingUses > 0);
    if (existing) {
      existing.remainingUses = (existing.remainingUses || 0) + (template.uses || 1);
      return existing;
    }
  }

  const slot = {
    id: itemId,
    name: template.name,
    type: template.type,
    consumable: template.consumable,
    uses: template.uses || null,
    remainingUses: template.uses || null
  };
  inventory.slots.push(slot);
  return slot;
}

/**
 * Use an item from inventory.
 * @returns {object|null} { item, effect, consumed } or null if not found / no uses left
 */
function useItem(inventory, itemId) {
  const slot = inventory.slots.find(s => s.id === itemId);
  if (!slot) return null;

  const template = ITEMS[itemId];
  if (!template) return null;

  const effect = template.combatEffect || null;

  if (slot.consumable) {
    if (slot.remainingUses <= 0) return null;
    slot.remainingUses--;
    if (slot.remainingUses <= 0) {
      inventory.slots = inventory.slots.filter(s => s !== slot);
      return { item: template, effect, consumed: true, remainingUses: 0 };
    }
    return { item: template, effect, consumed: false, remainingUses: slot.remainingUses };
  }

  // Non-consumable: just return the effect
  return { item: template, effect, consumed: false };
}

/**
 * Remove an item from inventory.
 */
function removeItem(inventory, itemId) {
  inventory.slots = inventory.slots.filter(s => s.id !== itemId);
}

/**
 * Get a player-friendly list of items.
 */
function listItems(inventory) {
  return inventory.slots.map(s => {
    const template = ITEMS[s.id];
    return {
      id: s.id,
      name: s.name,
      description: template ? template.description : '',
      type: s.type,
      consumable: s.consumable,
      uses: s.consumable ? `${s.remainingUses}/${s.uses}` : 'permanent',
      flavor: template ? template.flavor : ''
    };
  });
}

/**
 * Check if inventory has a specific item.
 */
function hasItem(inventory, itemId) {
  return inventory.slots.some(s => s.id === itemId);
}

// ── Equipment Functions ─────────────────────────────────────────────────────

/**
 * Equip an item from inventory into a named slot.
 * Validates that the item type is compatible with the slot.
 * @returns {{ success: boolean, unequipped?: object }}
 */
function equipItem(inventory, itemId, slot) {
  if (!EQUIPMENT_SLOTS.includes(slot)) {
    return { success: false, reason: `Invalid slot: ${slot}` };
  }

  const template = ITEMS[itemId];
  if (!template) return { success: false, reason: 'Unknown item' };

  const allowedTypes = SLOT_TYPE_MAP[slot];
  if (!allowedTypes.includes(template.type)) {
    return { success: false, reason: `Item type '${template.type}' cannot go in '${slot}' slot` };
  }

  // Find the item in inventory
  const invIndex = inventory.slots.findIndex(s => s.id === itemId);
  if (invIndex === -1) return { success: false, reason: 'Item not in inventory' };

  const invSlot = inventory.slots[invIndex];

  // Capture whatever is currently equipped
  const previous = inventory.equipment[slot];
  let unequipped = null;

  if (previous) {
    // Return previous item to inventory
    unequipped = { ...previous };
    inventory.slots.push(unequipped);
  }

  // Move item from inventory to equipment
  inventory.slots.splice(invIndex, 1);
  inventory.equipment[slot] = {
    id: invSlot.id,
    name: invSlot.name,
    type: invSlot.type,
    consumable: invSlot.consumable,
    uses: invSlot.uses,
    remainingUses: invSlot.remainingUses
  };

  return { success: true, unequipped };
}

/**
 * Unequip an item from a slot back into inventory.
 * @returns {{ success: boolean, item?: object }}
 */
function unequipItem(inventory, slot) {
  if (!EQUIPMENT_SLOTS.includes(slot)) {
    return { success: false, reason: `Invalid slot: ${slot}` };
  }

  const equipped = inventory.equipment[slot];
  if (!equipped) return { success: false, reason: `Nothing equipped in ${slot}` };

  if (inventory.slots.length >= inventory.maxSize) {
    return { success: false, reason: 'Inventory full' };
  }

  inventory.equipment[slot] = null;
  inventory.slots.push({ ...equipped });

  return { success: true, item: equipped };
}

/**
 * Return the current equipment configuration.
 */
function getEquipped(inventory) {
  return { ...inventory.equipment };
}

/**
 * Aggregate all combat effects from equipped items.
 * @returns {Array} array of combat effect objects with source and slot
 */
function getEquippedEffects(inventory) {
  const effects = [];
  for (const slot of EQUIPMENT_SLOTS) {
    const equipped = inventory.equipment[slot];
    if (!equipped) continue;
    const template = ITEMS[equipped.id];
    if (template && template.combatEffect) {
      effects.push({ ...template.combatEffect, source: equipped.id, slot });
    }
  }
  return effects;
}

// ── Shoppe Economy ──────────────────────────────────────────────────────────

/**
 * All items available for purchase in the Shoppe.
 * Derived from ITEMS — only items with a valid price.
 */
function getShoppeCatalog() {
  const catalog = [];
  for (const item of Object.values(ITEMS)) {
    if (item.price != null && item.price > 0) {
      catalog.push({
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        price: item.price,
        consumable: item.consumable,
        flavor: item.flavor
      });
    }
  }
  return catalog;
}

/**
 * Buy an item from the Shoppe.
 * @param {object} inventory
 * @param {string} itemId
 * @param {number} coinBalance — player's current coins
 * @returns {{ success: boolean, item?: object, remainingCoins?: number, reason?: string }}
 */
function buyItem(inventory, itemId, coinBalance) {
  const template = ITEMS[itemId];
  if (!template) return { success: false, reason: 'Unknown item' };
  if (template.price == null || template.price <= 0) {
    return { success: false, reason: 'Item is not for sale' };
  }
  if (coinBalance < template.price) {
    return { success: false, reason: 'Not enough coins' };
  }
  if (inventory.slots.length >= inventory.maxSize) {
    return { success: false, reason: 'Inventory full' };
  }

  const added = addItem(inventory, itemId);
  if (!added) return { success: false, reason: 'Could not add item to inventory' };

  const remainingCoins = coinBalance - template.price;
  return { success: true, item: added, remainingCoins };
}

/**
 * Sell an item from inventory back to the Shoppe.
 * Sells at 50% of buy price (floor).
 * @returns {{ success: boolean, coinsEarned?: number, reason?: string }}
 */
function sellItem(inventory, itemId) {
  const template = ITEMS[itemId];
  if (!template) return { success: false, reason: 'Unknown item' };

  const invIndex = inventory.slots.findIndex(s => s.id === itemId);
  if (invIndex === -1) return { success: false, reason: 'Item not in inventory' };

  const sellPrice = template.price ? Math.floor(template.price / 2) : 0;
  inventory.slots.splice(invIndex, 1);

  return { success: true, coinsEarned: sellPrice };
}

module.exports = {
  ITEMS,
  SLOT_TYPE_MAP,
  EQUIPMENT_SLOTS,
  createInventory,
  addItem,
  useItem,
  removeItem,
  listItems,
  hasItem,
  equipItem,
  unequipItem,
  getEquipped,
  getEquippedEffects,
  getShoppeCatalog,
  buyItem,
  sellItem
};
