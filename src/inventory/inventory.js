/**
 * Inventory System — Item management for The Binding.
 *
 * Tracks items per session, handles collection and usage,
 * integrates with combat (use items during encounters).
 *
 * Dracula-specific items included but extensible.
 */

// ── Item Definitions ────────────────────────────────────────────────────────

const ITEMS = {
  crucifix: {
    id: 'crucifix',
    name: 'Silver Crucifix',
    description: 'An old silver crucifix. It emanates a faint warmth in the presence of the undead.',
    type: 'holy',
    consumable: false,
    combatEffect: { type: 'defense', vsType: 'undead', acBonus: 2 },
    flavor: 'The figure of Christ is worn smooth from years of faithful hands.'
  },
  garlic: {
    id: 'garlic',
    name: 'Garlic Bulb',
    description: 'Pungent garlic, a traditional ward against vampires.',
    type: 'herb',
    consumable: true,
    uses: 3,
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
    combatEffect: { type: 'execute', vsType: 'undead', condition: 'target_hp_0' },
    flavor: 'Carved from the wood of a church pew, consecrated and sharp.'
  },
  holy_water: {
    id: 'holy_water',
    name: 'Holy Water',
    description: 'Water blessed by a priest. Burns the undead like acid.',
    type: 'holy',
    consumable: true,
    uses: 1,
    combatEffect: { type: 'damage', vsType: 'undead', dice: '2d6', damageType: 'radiant' },
    flavor: 'The glass vial is cool to the touch, even near fire.'
  },
  silver_dagger: {
    id: 'silver_dagger',
    name: 'Silver Dagger',
    description: 'A dagger forged from silver. Bypasses the resistance of lycanthropes and some undead.',
    type: 'weapon',
    consumable: false,
    combatEffect: { type: 'bonus_damage', vsType: 'undead', modifier: 2 },
    flavor: 'The blade catches moonlight and holds it.'
  },
  journal: {
    id: 'journal',
    name: "Jonathan Harker's Journal",
    description: 'A leather-bound journal filled with frantic handwriting. Contains crucial information about Castle Dracula.',
    type: 'lore',
    consumable: false,
    flavor: 'The pages are stained with ink and something darker.'
  },
  mirror: {
    id: 'mirror',
    name: 'Hand Mirror',
    description: 'A small silver-backed mirror. Useful for detecting vampires — they cast no reflection.',
    type: 'tool',
    consumable: false,
    combatEffect: { type: 'reveal', vsType: 'undead' },
    flavor: 'The glass is old and spotted, but still clear enough.'
  },
  wolfsbane: {
    id: 'wolfsbane',
    name: 'Wolfsbane',
    description: 'A poisonous purple flower that repels wolves and werewolves.',
    type: 'herb',
    consumable: true,
    uses: 2,
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
    combatEffect: { type: 'heal', dice: '2d4', modifier: 2 },
    flavor: 'Dr. Seward packed this with meticulous care.'
  },
  garlic_necklace: {
    id: 'garlic_necklace',
    name: 'Garlic Necklace',
    description: 'Strung garlic bulbs worn around the neck. Continuous ward against vampires.',
    type: 'holy',
    consumable: false,
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
    combatEffect: { type: 'damage', vsType: 'undead', dice: '4d6', damageType: 'radiant' },
    flavor: 'You have one shot. Make it count.'
  }
};

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
  return { slots, maxSize: 20 };
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

module.exports = {
  ITEMS,
  createInventory,
  addItem,
  useItem,
  removeItem,
  listItems,
  hasItem
};
