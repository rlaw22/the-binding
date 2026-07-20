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
    rarity: 'uncommon',
    price: 30,
    maxDurability: 100,
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
    rarity: 'common',
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
    rarity: 'common',
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
    rarity: 'uncommon',
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
    rarity: 'rare',
    price: 45,
    maxDurability: 100,
    combatEffect: { type: 'bonus_damage', vsType: 'undead', modifier: 2 },
    flavor: 'The blade catches moonlight and holds it.'
  },
  journal: {
    id: 'journal',
    name: "Jonathan Harker's Journal",
    description: 'A leather-bound journal filled with frantic handwriting. Contains crucial information about Castle Dracula.',
    type: 'lore',
    consumable: false,
    rarity: 'rare',
    price: null,
    flavor: 'The pages are stained with ink and something darker.'
  },
  mirror: {
    id: 'mirror',
    name: 'Hand Mirror',
    description: 'A small silver-backed mirror. Useful for detecting vampires — they cast no reflection.',
    type: 'accessory',
    consumable: false,
    rarity: 'common',
    price: 15,
    maxDurability: 40,
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
    rarity: 'common',
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
    rarity: 'uncommon',
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
    rarity: 'uncommon',
    price: 20,
    maxDurability: 50,
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
    rarity: 'rare',
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
    rarity: 'uncommon',
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
    rarity: 'common',
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
    rarity: 'common',
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
    rarity: 'common',
    price: 10,
    flavor: 'Every adventurer carries rope. The smart ones carry extra.'
  },
  lockpick_set: {
    id: 'lockpick_set',
    name: 'Lockpick Set',
    description: 'A set of fine steel picks and tension wrenches. Opens doors that keys cannot.',
    type: 'tool',
    consumable: false,
    rarity: 'uncommon',
    price: 20,
    flavor: 'The tools of a burglar — or a very determined investigator.'
  },
  enchanted_ring: {
    id: 'enchanted_ring',
    name: 'Enchanted Ring',
    description: 'A silver ring inscribed with protective runes. Grants +1 AC while worn.',
    type: 'accessory',
    consumable: false,
    rarity: 'legendary',
    price: 100,
    maxDurability: 100,
    combatEffect: { type: 'defense', acBonus: 1 },
    flavor: 'The runes shimmer faintly in candlelight, as if alive.'
  },

  // ── Frankenstein Items ─────────────────────────────────────────────────────

  galvanic_battery: {
    id: 'galvanic_battery',
    name: 'Galvanic Battery',
    description: 'A crude voltaic pile wrapped in copper wire. Channels electrical energy for reanimation experiments.',
    type: 'tool',
    consumable: false,
    rarity: 'rare',
    price: 60,
    maxDurability: 80,
    combatEffect: { type: 'bonus_damage', vsType: 'construct', modifier: 2 },
    flavor: 'The terminals spark when brought close together — a miniature storm in a box.'
  },
  reagent_vial: {
    id: 'reagent_vial',
    name: 'Chemical Reagent Vial',
    description: 'A glass vial of volatile alchemical compounds. Useful in experiments and as an improvised acid.',
    type: 'consumable',
    consumable: true,
    uses: 2,
    rarity: 'common',
    price: 15,
    combatEffect: { type: 'damage', dice: '2d6', damageType: 'acid' },
    flavor: 'The liquid inside shifts between amber and green, as if undecided.'
  },
  rubber_gloves: {
    id: 'rubber_gloves',
    name: 'Insulated Rubber Gloves',
    description: 'Thick rubber gloves that protect against electrical shocks and chemical burns.',
    type: 'accessory',
    consumable: false,
    rarity: 'uncommon',
    price: 25,
    maxDurability: 60,
    combatEffect: { type: 'resistance', damageType: 'lightning' },
    flavor: 'They smell of vulcanized rubber and faint ozone.'
  },
  lab_journal: {
    id: 'lab_journal',
    name: "Victor's Lab Journal",
    description: 'A battered notebook filled with diagrams of galvanic circuits, anatomical sketches, and feverish marginalia about the nature of life.',
    type: 'lore',
    consumable: false,
    rarity: 'rare',
    price: null,
    flavor: 'The handwriting deteriorates toward the later pages, as if the author stopped sleeping.'
  },
  surgical_kit: {
    id: 'surgical_kit',
    name: 'Surgical Kit',
    description: 'Scalpels, bone saws, and suturing needles wrapped in oilcloth. Essential for field medicine — or darker work.',
    type: 'tool',
    consumable: false,
    rarity: 'uncommon',
    price: 40,
    maxDurability: 60,
    combatEffect: { type: 'heal', dice: '1d6', modifier: 2 },
    flavor: 'The steel is immaculate. Someone cleaned these with obsessive care.'
  },
  preservation_fluid: {
    id: 'preservation_fluid',
    name: 'Preservation Fluid',
    description: 'A jar of formaldehyde solution for preserving biological specimens — or keeping tissue viable for reanimation.',
    type: 'consumable',
    consumable: true,
    uses: 3,
    rarity: 'uncommon',
    price: 20,
    combatEffect: { type: 'preserve', condition: 'biological_decay' },
    flavor: 'The fumes sting the eyes and cling to everything.'
  },
  lightning_rod: {
    id: 'lightning_rod',
    name: 'Portable Lightning Rod',
    description: 'A telescoping copper rod designed to attract and channel atmospheric electricity. Devastating when thrown during a storm.',
    type: 'weapon',
    consumable: true,
    uses: 1,
    rarity: 'rare',
    price: 75,
    combatEffect: { type: 'damage', dice: '4d8', damageType: 'lightning', condition: 'storm' },
    flavor: 'It hums when raised toward thunderclouds, as if eager.'
  },
  repair_kit: {
    id: 'repair_kit',
    name: 'Repair Kit',
    description: 'A small leather pouch of hammers, nails, and spare parts. Used to restore damaged equipment.',
    type: 'consumable',
    subtype: 'tool',
    consumable: true,
    uses: 3,
    rarity: 'common',
    price: 15,
    flavor: 'A small leather pouch of hammers, nails, and spare parts.'
  },

  // ── Holmes Items ───────────────────────────────────────────────────────────

  magnifying_glass: {
    id: 'magnifying_glass',
    name: 'Magnifying Glass',
    description: 'A brass-rimmed magnifying lens. Reveals hidden details, tracks, and clues invisible to the naked eye.',
    type: 'tool',
    consumable: false,
    rarity: 'uncommon',
    price: 25,
    maxDurability: 50,
    combatEffect: { type: 'reveal', vsType: 'all' },
    flavor: 'When you have eliminated the impossible, whatever remains must be the truth.'
  },
  disguise_kit: {
    id: 'disguise_kit',
    name: 'Disguise Kit',
    description: 'Wigs, theatrical makeup, false beards, and spirit gum. Allows convincing impersonation of others.',
    type: 'tool',
    consumable: false,
    rarity: 'uncommon',
    price: 35,
    flavor: 'The art of disguise is knowing how to hide in plain sight.'
  },
  advanced_lockpicks: {
    id: 'advanced_lockpicks',
    name: 'Advanced Lockpick Set',
    description: 'A refined set of skeleton keys, tension wrenches, and diamond-tipped picks. Opens even high-security mechanisms.',
    type: 'tool',
    consumable: false,
    rarity: 'rare',
    price: 45,
    maxDurability: 40,
    combatEffect: { type: 'bypass', vsType: 'lock', modifier: 3 },
    flavor: 'Every lock is a conversation. These are very persuasive.'
  },
  briar_pipe: {
    id: 'briar_pipe',
    name: 'Briar Pipe',
    description: 'A well-seasoned briarwood pipe. Aids concentration and calms the nerves during deduction.',
    type: 'accessory',
    consumable: false,
    rarity: 'common',
    price: 15,
    maxDurability: 80,
    combatEffect: { type: 'buff', stat: 'intelligence', modifier: 1 },
    flavor: 'The mind works best when the body is at ease.'
  },
  deerstalker_cap: {
    id: 'deerstalker_cap',
    name: 'Deerstalker Cap',
    description: 'A distinctive tweed cap with front and rear brims. Worn by those who pursue truth above all else.',
    type: 'accessory',
    consumable: false,
    rarity: 'uncommon',
    price: 20,
    maxDurability: 70,
    combatEffect: { type: 'buff', stat: 'perception', modifier: 1 },
    flavor: 'It is a cap, not a hat. The distinction matters to some.'
  },
  violin_case: {
    id: 'violin_case',
    name: 'Violin Case',
    description: 'A battered leather case containing a fine violin. Music soothes the mind — and the case conceals a hidden compartment.',
    type: 'tool',
    consumable: false,
    rarity: 'rare',
    price: 50,
    maxDurability: 70,
    combatEffect: { type: 'buff', stat: 'intelligence', modifier: 1 },
    flavor: 'The Stradivarius within is worth more than most of the evidence in this case.'
  },
  holmes_journal: {
    id: 'holmes_journal',
    name: 'Case Notes',
    description: 'A slim leather notebook filled with meticulous observations, coded shorthand, and cross-references to past cases.',
    type: 'lore',
    consumable: false,
    rarity: 'rare',
    price: null,
    flavor: 'Data! Data! Data! I cannot make bricks without clay.'
  },

  // ── Armor Items ────────────────────────────────────────────────────────────

  leather_armor: {
    id: 'leather_armor',
    name: 'Leather Armor',
    description: 'Cured and hardened leather, stitched into a protective vest. Light and flexible, offering modest protection.',
    type: 'armor',
    consumable: false,
    rarity: 'uncommon',
    price: 30,
    maxDurability: 80,
    combatEffect: { type: 'defense', acBonus: 1 },
    flavor: 'Scuffed and worn, but it has turned a blade or two.'
  },
  chain_shirt: {
    id: 'chain_shirt',
    name: 'Chain Shirt',
    description: 'A shirt of interlocking iron rings, worn over a padded gambeson. Good protection at the cost of some mobility.',
    type: 'armor',
    consumable: false,
    rarity: 'rare',
    price: 60,
    maxDurability: 120,
    combatEffect: { type: 'defense', acBonus: 2 },
    flavor: 'Each ring was hammered shut by hand. The craftsmanship is medieval but sound.'
  },
  travelers_cloak: {
    id: 'travelers_cloak',
    name: "Traveler's Cloak",
    description: 'A heavy wool cloak treated with lanolin. Keeps out rain, wind, and the chill of the Carpathian passes.',
    type: 'armor',
    consumable: false,
    rarity: 'uncommon',
    price: 20,
    maxDurability: 60,
    combatEffect: { type: 'defense', acBonus: 1 },
    flavor: 'The dark fabric is moth-eaten at the hem but still warm.'
  },
  detective_coat: {
    id: 'detective_coat',
    name: "Detective's Coat",
    description: 'A long, double-breasted overcoat with deep pockets. Lined with thin steel plates sewn between layers of fabric.',
    type: 'armor',
    consumable: false,
    rarity: 'rare',
    price: 50,
    maxDurability: 100,
    combatEffect: { type: 'defense', acBonus: 2 },
    flavor: 'The coat is heavier than it looks. Its owner came prepared.'
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
        remainingUses: template.uses || null,
        durability: template.consumable ? null : (template.maxDurability || 100),
        maxDurability: template.maxDurability || 100
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
    remainingUses: template.uses || null,
    durability: template.consumable ? null : (template.maxDurability || 100),
    maxDurability: template.maxDurability || 100
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
 * Use a non-equipped consumable from inventory by item ID.
 * Decrements remainingUses, removes the item slot when exhausted.
 * Returns { item, effect, consumed, remainingUses } or null if not found / not consumable / no uses left.
 */
function useItemFromInventory(inventory, itemId) {
  const slot = inventory.slots.find(s => s.id === itemId);
  if (!slot) return null;

  const template = ITEMS[itemId];
  if (!template) return null;
  if (!template.consumable) return null;

  if (slot.remainingUses <= 0) return null;

  slot.remainingUses--;
  const effect = template.combatEffect || null;

  if (slot.remainingUses <= 0) {
    inventory.slots = inventory.slots.filter(s => s !== slot);
    return { item: template, effect, consumed: true, remainingUses: 0 };
  }

  return { item: template, effect, consumed: false, remainingUses: slot.remainingUses };
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
    remainingUses: invSlot.remainingUses,
    durability: invSlot.durability,
    maxDurability: invSlot.maxDurability
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

// ── Equipped Consumable Use ──────────────────────────────────────────────────

/**
 * Use a consumable from an equipment slot (consumable_1 or consumable_2).
 * Decrements uses and unequips if exhausted.
 * @returns {{ success: boolean, item?: object, effect?: object, consumed?: boolean, reason?: string }}
 */
function useEquippedConsumable(inventory, slot) {
  if (slot !== 'consumable_1' && slot !== 'consumable_2') {
    return { success: false, reason: 'Not a consumable slot' };
  }

  const equipped = inventory.equipment[slot];
  if (!equipped) return { success: false, reason: `Nothing in ${slot}` };

  const template = ITEMS[equipped.id];
  if (!template) return { success: false, reason: 'Unknown item' };
  if (!equipped.consumable && !template.consumable) {
    return { success: false, reason: 'Item is not consumable' };
  }

  const effect = template.combatEffect || null;

  if (equipped.remainingUses != null) {
    equipped.remainingUses--;
    if (equipped.remainingUses <= 0) {
      inventory.equipment[slot] = null;
      return { success: true, item: template, effect, consumed: true, remainingUses: 0 };
    }
    return { success: true, item: template, effect, consumed: false, remainingUses: equipped.remainingUses };
  }

  // Non-tracked consumable (shouldn't happen, but safe fallback)
  inventory.equipment[slot] = null;
  return { success: true, item: template, effect, consumed: true, remainingUses: 0 };
}

// ── DM Context Injection ────────────────────────────────────────────────────

/**
 * Generate a compact text summary of the player's inventory for the AI DM.
 * Injected into the DM context so it knows what items the player has.
 * @returns {string} human-readable inventory summary
 */
function getInventoryContext(inventory) {
  if (!inventory) {
    return 'The player carries nothing.';
  }
  const hasEquipment = inventory.equipment && EQUIPMENT_SLOTS.some(s => inventory.equipment[s]);
  const hasSlots = inventory.slots && inventory.slots.length > 0;
  if (!hasSlots && !hasEquipment) {
    return 'The player carries nothing.';
  }

  const lines = [];

  // Equipment
  const equipped = [];
  for (const slot of EQUIPMENT_SLOTS) {
    const eq = inventory.equipment[slot];
    if (eq) {
      const tmpl = ITEMS[eq.id];
      const uses = eq.consumable ? ` (${eq.remainingUses}/${eq.uses} uses)` : '';
      const dur = (!eq.consumable && eq.durability != null) ? ` [${eq.durability}/${eq.maxDurability || 100}]` : '';
      equipped.push(`${slot}: ${eq.name}${uses}${dur}`);
    }
  }
  if (equipped.length > 0) {
    lines.push(`Equipped: ${equipped.join(', ')}`);
  }

  // Bag items
  const bag = inventory.slots.map(s => {
    const tmpl = ITEMS[s.id];
    const uses = s.consumable ? ` (${s.remainingUses}/${s.uses})` : '';
    return `${s.name}${uses}`;
  });
  if (bag.length > 0) {
    lines.push(`Carrying: ${bag.join(', ')}`);
  }

  // Active effects
  const effects = getEquippedEffects(inventory);
  if (effects.length > 0) {
    const fx = effects.map(e => `${e.source}: ${e.type}${e.vsType ? ` vs ${e.vsType}` : ''}${e.acBonus ? ` +${e.acBonus} AC` : ''}`);
    lines.push(`Active effects: ${fx.join('; ')}`);
  }

  return lines.join('\n');
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

// ── Starting Loadouts ──────────────────────────────────────────────────────

/**
 * Adventure-specific starting loadouts.
 * Maps adventure IDs to arrays of item IDs that players start with.
 */
const STARTING_LOADOUTS = {
  dracula: [
    'wooden_stake',
    'garlic',
    'holy_water',
    'torch',
    'journal',
    'travelers_cloak'
  ],
  frankenstein: [
    'galvanic_battery',
    'reagent_vial',
    'rubber_gloves',
    'surgical_kit',
    'lab_journal',
    'leather_armor'
  ],
  holmes: [
    'magnifying_glass',
    'advanced_lockpicks',
    'briar_pipe',
    'deerstalker_cap',
    'holmes_journal',
    'detective_coat'
  ]
};

// ── Durability System ──────────────────────────────────────────────────────

/**
 * Get the durability of an item by its unique instance key or id.
 * Items track durability as current/max on their slot objects.
 * @param {object} inventory
 * @param {string} itemId
 * @returns {{ current: number, max: number, broken: boolean } | null}
 */
function getDurability(inventory, itemId) {
  // Check equipment slots first
  for (const slot of EQUIPMENT_SLOTS) {
    const equipped = inventory.equipment[slot];
    if (equipped && equipped.id === itemId) {
      const template = ITEMS[itemId];
      const maxDurability = template?.maxDurability || 100;
      const current = equipped.durability ?? maxDurability;
      return { current, max: maxDurability, broken: current <= 0 };
    }
  }
  // Check inventory slots
  const invSlot = inventory.slots.find(s => s.id === itemId);
  if (invSlot) {
    const template = ITEMS[itemId];
    const maxDurability = template?.maxDurability || 100;
    const current = invSlot.durability ?? maxDurability;
    return { current, max: maxDurability, broken: current <= 0 };
  }
  return null;
}

/**
 * Apply durability damage to an item by ID.
 * Returns { broken: boolean, current: number, name: string } or null if not found.
 */
function damageDurability(inventory, itemId, amount = 1) {
  // Check equipment slots first
  for (const slot of EQUIPMENT_SLOTS) {
    const equipped = inventory.equipment[slot];
    if (equipped && equipped.id === itemId) {
      // Consumables can't be durability-damaged
      if (equipped.consumable || equipped.durability === null) return null;
      const template = ITEMS[itemId];
      const maxDurability = template?.maxDurability || 100;
      if (equipped.durability === undefined) {
        equipped.durability = maxDurability;
      }
      equipped.durability = Math.max(0, equipped.durability - amount);
      const broke = equipped.durability <= 0;
      if (broke) {
        inventory.equipment[slot] = null;
      }
      return {
        broken: broke,
        current: equipped.durability,
        max: maxDurability,
        name: equipped.name
      };
    }
  }
  // Check inventory slots
  const invSlot = inventory.slots.find(s => s.id === itemId);
  if (invSlot) {
    // Consumables can't be durability-damaged
    if (invSlot.consumable || invSlot.durability === null) return null;
    const template = ITEMS[itemId];
    const maxDurability = template?.maxDurability || 100;
    if (invSlot.durability === undefined) {
      invSlot.durability = maxDurability;
    }
    invSlot.durability = Math.max(0, invSlot.durability - amount);
    const broke = invSlot.durability <= 0;
    if (broke) {
      const idx = inventory.slots.indexOf(invSlot);
      if (idx !== -1) inventory.slots.splice(idx, 1);
    }
    return {
      broken: broke,
      current: invSlot.durability,
      max: maxDurability,
      name: invSlot.name
    };
  }
  return null;
}

/**
 * Apply durability damage to an equipped item by slot name.
 * Returns { broken: boolean, current: number, name: string, id: string } or null if slot empty.
 */
function damageEquippedDurability(inventory, slot, amount = 1) {
  if (!EQUIPMENT_SLOTS.includes(slot)) return null;
  const equipped = inventory.equipment[slot];
  if (!equipped) return null;

  const template = ITEMS[equipped.id];
  const maxDurability = template?.maxDurability || 100;
  if (equipped.durability === undefined) {
    equipped.durability = maxDurability;
  }
  equipped.durability = Math.max(0, equipped.durability - amount);
  const broke = equipped.durability <= 0;
  if (broke) {
    inventory.equipment[slot] = null;
  }
  return {
    broken: broke,
    current: equipped.durability,
    max: maxDurability,
    name: equipped.name,
    id: equipped.id
  };
}

/**
 * Repair an item by ID, restoring durability.
 * Returns { current: number, max: number, name: string } or null if not found.
 */
function repairItem(inventory, itemId, amount = -1) {
  // Check equipment slots first
  for (const slot of EQUIPMENT_SLOTS) {
    const equipped = inventory.equipment[slot];
    if (equipped && equipped.id === itemId) {
      const template = ITEMS[itemId];
      const maxDurability = template?.maxDurability || 100;
      if (equipped.durability === undefined) {
        equipped.durability = maxDurability;
      }
      equipped.durability = Math.min(maxDurability, equipped.durability + amount);
      return {
        current: equipped.durability,
        max: maxDurability,
        name: equipped.name,
        id: equipped.id
      };
    }
  }
  // Check inventory slots
  const invSlot = inventory.slots.find(s => s.id === itemId);
  if (invSlot) {
    if (invSlot.consumable || invSlot.durability === null) return null;
    const template = ITEMS[itemId];
    const maxDurability = template?.maxDurability || 100;
    if (invSlot.durability === undefined) {
      invSlot.durability = maxDurability;
    }
    const repairAmt = amount < 0 ? (maxDurability - invSlot.durability) : amount;
    invSlot.durability = Math.min(maxDurability, invSlot.durability + repairAmt);
    return {
      current: invSlot.durability,
      max: maxDurability,
      name: invSlot.name,
      id: invSlot.id
    };
  }
  return null;
}

/**
 * Remove a broken item from equipment (called when durability hits 0).
 * Returns the item that was removed, or null.
 */
function removeBrokenItem(inventory, slot) {
  if (!EQUIPMENT_SLOTS.includes(slot)) return null;
  const equipped = inventory.equipment[slot];
  if (!equipped) return null;
  const removed = { ...equipped };
  inventory.equipment[slot] = null;
  return removed;
}

// ── Slot-Based Durability API ───────────────────────────────────────────────

/**
 * Damage an equipped item's durability by slot name.
 * If the item has maxDurability, reduces currentDurability by amount (default 1).
 * If currentDurability reaches 0, the item breaks.
 * If the item has no maxDurability (e.g. consumables), does nothing.
 * @param {object} inventory
 * @param {string} slotName — equipment slot (weapon, armor, accessory, etc.)
 * @param {number} [amount=1] — damage to apply
 * @returns {{ item: object|null, currentDurability: number|null, maxDurability: number|null, broken: boolean, message?: string }}
 */
function damageEquipment(inventory, slotName, amount = 1) {
  if (!EQUIPMENT_SLOTS.includes(slotName)) {
    return { item: null, currentDurability: null, maxDurability: null, broken: false };
  }

  const equipped = inventory.equipment[slotName];
  if (!equipped) {
    return { item: null, currentDurability: null, maxDurability: null, broken: false };
  }

  const template = ITEMS[equipped.id];
  if (!template || !template.maxDurability) {
    // No durability field — consumables and non-degradable items don't degrade
    return { item: equipped, currentDurability: null, maxDurability: null, broken: false };
  }

  const maxDurability = template.maxDurability;
  if (equipped.durability === undefined) {
    equipped.durability = maxDurability;
  }

  equipped.durability = Math.max(0, equipped.durability - amount);
  const broken = equipped.durability <= 0;

  let message;
  if (broken) {
    equipped.broken = true;
    message = `Your ${equipped.name} has broken!`;
  } else if (equipped.durability <= maxDurability * 0.25) {
    message = `Your ${equipped.name} is in critical condition (${equipped.durability}/${maxDurability}).`;
  } else if (equipped.durability <= maxDurability * 0.5) {
    message = `Your ${equipped.name} is showing wear (${equipped.durability}/${maxDurability}).`;
  }

  return {
    item: equipped,
    currentDurability: equipped.durability,
    maxDurability,
    broken,
    ...(message ? { message } : {})
  };
}

/**
 * Repair an equipped item using a repair kit from inventory.
 * Restores currentDurability to maxDurability.
 * Consumes one repair kit use (or removes it if no uses field).
 * @param {object} inventory
 * @param {string} slotName — equipment slot to repair
 * @param {number} repairKitItemIndex — index of the repair kit in inventory.slots
 * @returns {{ item: object|null, repaired: boolean, reason?: string }}
 */
function repairEquipment(inventory, slotName, repairKitItemIndex) {
  if (!EQUIPMENT_SLOTS.includes(slotName)) {
    return { item: null, repaired: false, reason: `Invalid slot: ${slotName}` };
  }

  const equipped = inventory.equipment[slotName];
  if (!equipped) {
    return { item: null, repaired: false, reason: `Nothing equipped in ${slotName}` };
  }

  const template = ITEMS[equipped.id];
  if (!template || !template.maxDurability) {
    return { item: equipped, repaired: false, reason: 'Item has no durability to repair' };
  }

  // Validate repair kit
  if (repairKitItemIndex < 0 || repairKitItemIndex >= inventory.slots.length) {
    return { item: equipped, repaired: false, reason: 'Invalid repair kit index' };
  }

  const kitSlot = inventory.slots[repairKitItemIndex];
  if (!kitSlot || kitSlot.id !== 'repair_kit') {
    return { item: equipped, repaired: false, reason: 'No repair kit at that index' };
  }

  // Restore durability
  equipped.durability = template.maxDurability;
  if (equipped.broken) {
    delete equipped.broken;
  }

  // Consume one repair kit use
  if (kitSlot.remainingUses != null && kitSlot.remainingUses > 1) {
    kitSlot.remainingUses--;
  } else {
    // Remove the kit entirely (last use or no uses field)
    inventory.slots.splice(repairKitItemIndex, 1);
  }

  return { item: equipped, repaired: true };
}

/**
 * Get durability status for all equipped items.
 * @param {object} inventory
 * @returns {Array<{ slot: string, itemName: string, currentDurability: number, maxDurability: number, condition: 'good'|'worn'|'critical'|'broken' }>}
 */
function getDurabilityStatus(inventory) {
  const results = [];

  for (const slot of EQUIPMENT_SLOTS) {
    const equipped = inventory.equipment[slot];
    if (!equipped) continue;

    const template = ITEMS[equipped.id];
    if (!template || !template.maxDurability) continue;

    const maxDurability = template.maxDurability;
    const currentDurability = equipped.durability ?? maxDurability;
    const pct = currentDurability / maxDurability;

    let condition;
    if (currentDurability <= 0) {
      condition = 'broken';
    } else if (pct <= 0.25) {
      condition = 'critical';
    } else if (pct <= 0.5) {
      condition = 'worn';
    } else {
      condition = 'good';
    }

    results.push({
      slot,
      itemName: equipped.name,
      currentDurability,
      maxDurability,
      condition
    });
  }

  return results;
}

module.exports = {
  ITEMS,
  SLOT_TYPE_MAP,
  EQUIPMENT_SLOTS,
  STARTING_LOADOUTS,
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
  useEquippedConsumable,
  getInventoryContext,
  getShoppeCatalog,
  buyItem,
  sellItem,
  getDurability,
  damageDurability,
  damageEquippedDurability,
  repairItem,
  removeBrokenItem,
  damageEquipment,
  repairEquipment,
  getDurabilityStatus
};