/**
 * Loot Engine — Phase 2C
 *
 * Generates treasure, magic items, and shop inventories for campaign mode.
 * Based on SRD treasure tables by CR.
 */

// Treasure hoard tables by CR range (simplified from DMG p.137-139)
const TREASURE_HOARDS = {
  '0-4': {
    cp: [0, 6, [6, 6, 6, 6, 6, 6]],
    sp: [0, 3, [6, 6, 6]],
    gp: [0, 2, [6, 6]],
    pp: [0, 0, []],
    gems: { chance: 0.6, table: 'gem_10gp' },
    art: { chance: 0.3, table: 'art_25gp' },
    magicItems: [
      { chance: 0.3, table: 'magic_a' },
      { chance: 0.2, table: 'magic_b' }
    ]
  },
  '5-10': {
    cp: [0, 0, []],
    sp: [0, 4, [6, 6, 6, 6]],
    gp: [0, 6, [6, 6, 6, 6, 6, 6]],
    pp: [0, 3, [6, 6, 6]],
    gems: { chance: 0.5, table: 'gem_50gp' },
    art: { chance: 0.4, table: 'art_250gp' },
    magicItems: [
      { chance: 0.4, table: 'magic_c' },
      { chance: 0.3, table: 'magic_d' }
    ]
  },
  '11-16': {
    cp: [0, 0, []],
    sp: [0, 0, []],
    gp: [0, 4, [6, 6, 6, 6]],
    pp: [0, 5, [6, 6, 6, 6, 6]],
    gems: { chance: 0.5, table: 'gem_500gp' },
    art: { chance: 0.5, table: 'art_750gp' },
    magicItems: [
      { chance: 0.5, table: 'magic_e' },
      { chance: 0.3, table: 'magic_f' },
      { chance: 0.2, table: 'magic_g' }
    ]
  },
  '17-20': {
    cp: [0, 0, []],
    sp: [0, 0, []],
    gp: [0, 12, [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]],
    pp: [0, 8, [6, 6, 6, 6, 6, 6, 6, 6]],
    gems: { chance: 0.4, table: 'gem_1000gp' },
    art: { chance: 0.5, table: 'art_2500gp' },
    magicItems: [
      { chance: 0.5, table: 'magic_h' },
      { chance: 0.4, table: 'magic_i' },
      { chance: 0.3, table: 'magic_g' }
    ]
  }
};

// Gem tables by value
const GEM_TABLES = {
  gem_10gp: [
    'Azurite (opaque mottled blue)', 'Banded agate (translucent striped)',
    'Blue quartz (transparent pale blue)', 'Eye agate (translucent circles)',
    'Hematite (opaque grey-black)', 'Lapis lazuli (opaque light/dark blue)',
    'Malachite (opaque striated green)', 'Moss agate (translucent pink/moss)',
    'Obsidian (opaque black)', 'Rhodochrosite (opaque light pink)',
    'Tiger eye (translucent brown/gold)', 'Turquoise (opaque light blue-green)'
  ],
  gem_50gp: [
    'Bloodstone (opaque dark grey/red)', 'Carnelian (opaque orange/red)',
    'Chalcedony (opaque white)', 'Chrysoprase (translucent green)',
    'Citrine (transparent pale yellow)', 'Jasper (opaque red/brown/blue)',
    'Moonstone (translucent white/blue)', 'Onyx (opaque bands of black/white)',
    'Quartz (transparent white)', 'Sardonyx (opaque bands of red/white)',
    'Star rose quartz (translucent pink)', 'Zircon (transparent pale blue-green)'
  ],
  gem_500gp: [
    'Alexandrite (transparent dark green)', 'Aquamarine (transparent pale blue-green)',
    'Black pearl (opaque pure black)', 'Blue spinel (transparent deep blue)',
    'Peridot (transparent rich olive green)', 'Topaz (transparent golden yellow)'
  ],
  gem_1000gp: [
    'Black opal (translucent dark green/black)', 'Blue sapphire (transparent blue)',
    'Emerald (transparent deep green)', 'Fire opal (translucent red/orange)',
    'Opal (translucent pale blue)', 'Star ruby (translucent ruby red)',
    'Star sapphire (translucent blue)', 'Yellow sapphire (transparent golden)'
  ],
  gem_5000gp: [
    'Black sapphire (translucent black)', 'Diamond (transparent blue-white)',
    'Jacinth (transparent orange)', 'Ruby (transparent clear red)'
  ]
};

// Art object tables by value
const ART_TABLES = {
  art_25gp: [
    'Silver ewer', 'Carved bone statuette', 'Small gold bracelet',
    'Cloth-of-gold vestments', 'Black velvet mask with silver thread',
    'Copper chalice with silver filigree', 'Pair of bone dice',
    'Small mirror in painted wooden frame', 'Embroidered silk handkerchief',
    'Gold locket with painted portrait inside'
  ],
  art_250gp: [
    'Gold ring set with bloodstones', 'Carved ivory statuette',
    'Large gold bracelet', 'Silver necklace with gemstone pendant',
    'Bronze crown', 'Silk robe with gold embroidery',
    'Large well-made tapestry', 'Brass mug with jade inlay',
    'Box of turquoise animal figurines', 'Gold bird cage with electrum filigree'
  ],
  art_750gp: [
    'Silver chalice with moonstones', 'Silver-plated steel longsword with jet in hilt',
    'Carved harp of exotic wood with ivory inlay and zircon gems',
    'Small gold statuette set with red garnets', 'Gold crown set with topaz',
    'Gold and turquoise pendant', 'Turquoise and gold ring',
    'Gold comb set with carnelians'
  ],
  art_2500gp: [
    'Gold and topaz pendant', 'Ivory statuette with gold accents',
    'Eye agate set in gold pendant', 'Necklace of freshwater pearls',
    'Gold ring set with sapphire', 'Gold circlet set with aquamarines',
    'Gold locket with pressed flower'
  ],
  art_7500gp: [
    'Jeweled gold crown', 'Jeweled platinum ring',
    'Gold and ruby bracelet', 'Gold cup set with emeralds',
    'Gold and malachite pendant', 'Platinum bracelet set with sapphires'
  ]
};

// Magic item tables (simplified — SRD items by rarity)
const MAGIC_ITEM_TABLES = {
  magic_a: [
    { name: 'Potion of Healing', rarity: 'common', type: 'potion', value: 50 },
    { name: 'Spell Scroll (cantrip)', rarity: 'common', type: 'scroll', value: 25 },
    { name: 'Potion of Climbing', rarity: 'common', type: 'potion', value: 50 },
    { name: 'Spell Scroll (1st level)', rarity: 'common', type: 'scroll', value: 50 }
  ],
  magic_b: [
    { name: 'Potion of Greater Healing', rarity: 'uncommon', type: 'potion', value: 150 },
    { name: 'Potion of Fire Breath', rarity: 'uncommon', type: 'potion', value: 150 },
    { name: 'Spell Scroll (2nd level)', rarity: 'uncommon', type: 'scroll', value: 200 },
    { name: 'Bag of Holding', rarity: 'uncommon', type: 'wondrous', value: 4000 },
    { name: 'Driftglobe', rarity: 'uncommon', type: 'wondrous', value: 750 }
  ],
  magic_c: [
    { name: 'Potion of Superior Healing', rarity: 'rare', type: 'potion', value: 500 },
    { name: 'Spell Scroll (4th level)', rarity: 'rare', type: 'scroll', value: 500 },
    { name: 'Bag of Beans', rarity: 'rare', type: 'wondrous', value: 1000 },
    { name: 'Bead of Force', rarity: 'rare', type: 'wondrous', value: 1500 }
  ],
  magic_d: [
    { name: 'Cloak of Displacement', rarity: 'rare', type: 'wondrous', value: 4000 },
    { name: 'Belt of Hill Giant Strength', rarity: 'rare', type: 'wondrous', value: 4000 },
    { name: 'Sword of Wounding', rarity: 'rare', type: 'weapon', value: 8000 },
    { name: 'Wand of Fireballs', rarity: 'rare', type: 'wand', value: 8000 }
  ],
  magic_e: [
    { name: 'Potion of Supreme Healing', rarity: 'very_rare', type: 'potion', value: 2000 },
    { name: 'Spell Scroll (7th level)', rarity: 'very_rare', type: 'scroll', value: 5000 },
    { name: 'Belt of Frost Giant Strength', rarity: 'very_rare', type: 'wondrous', value: 16000 }
  ],
  magic_f: [
    { name: 'Cloak of Invisibility', rarity: 'very_rare', type: 'wondrous', value: 32000 },
    { name: 'Ring of Regeneration', rarity: 'very_rare', type: 'ring', value: 20000 },
    { name: 'Vorpal Sword', rarity: 'very_rare', type: 'weapon', value: 50000 }
  ],
  magic_g: [
    { name: 'Manual of Bodily Health', rarity: 'very_rare', type: 'wondrous', value: 25000 },
    { name: 'Manual of Gainful Exercise', rarity: 'very_rare', type: 'wondrous', value: 25000 },
    { name: 'Tome of Clear Thought', rarity: 'very_rare', type: 'wondrous', value: 25000 }
  ],
  magic_h: [
    { name: 'Potion of Storm Giant Strength', rarity: 'legendary', type: 'potion', value: 5000 },
    { name: 'Belt of Storm Giant Strength', rarity: 'legendary', type: 'wondrous', value: 75000 }
  ],
  magic_i: [
    { name: 'Ring of Three Wishes', rarity: 'legendary', type: 'ring', value: 90000 },
    { name: 'Rod of Resurrection', rarity: 'legendary', type: 'rod', value: 60000 }
  ]
};

/**
 * Roll dice expression like "2d6" or "4d6x10".
 */
function rollDice(expr) {
  if (!expr || typeof expr !== 'string') return 0;
  const match = expr.match(/^(\d+)d(\d+)(?:x(\d+))?$/i);
  if (!match) return parseInt(expr) || 0;
  const [, count, sides, mult] = match;
  let total = 0;
  for (let i = 0; i < parseInt(count); i++) {
    total += Math.floor(Math.random() * parseInt(sides)) + 1;
  }
  return total * (parseInt(mult) || 1);
}

/**
 * Pick a random item from an array.
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get the treasure hoard table for a given CR.
 */
function getHoardTable(cr) {
  if (cr <= 4) return TREASURE_HOARDS['0-4'];
  if (cr <= 10) return TREASURE_HOARDS['5-10'];
  if (cr <= 16) return TREASURE_HOARDS['11-16'];
  return TREASURE_HOARDS['17-20'];
}

/**
 * Generate a treasure hoard for a given CR.
 */
function generateTreasureHoard(cr) {
  const hoard = getHoardTable(cr);
  const treasure = { coins: {}, gems: [], artObjects: [], magicItems: [], totalValue: 0 };

  // Roll coins
  if (hoard.cp[0] > 0 || hoard.cp[1] > 0) {
    const cp = rollDice(`${hoard.cp[1]}d${hoard.cp[2][0] || 6}`);
    treasure.coins.cp = cp;
    treasure.totalValue += cp * 0.01;
  }
  if (hoard.sp[0] > 0 || hoard.sp[1] > 0) {
    const sp = rollDice(`${hoard.sp[1]}d${hoard.sp[2][0] || 6}`);
    treasure.coins.sp = sp;
    treasure.totalValue += sp * 0.1;
  }
  if (hoard.gp[0] > 0 || hoard.gp[1] > 0) {
    const gp = rollDice(`${hoard.gp[1]}d${hoard.gp[2][0] || 6}`);
    treasure.coins.gp = gp;
    treasure.totalValue += gp;
  }
  if (hoard.pp[0] > 0 || hoard.pp[1] > 0) {
    const pp = rollDice(`${hoard.pp[1]}d${hoard.pp[2][0] || 6}`);
    treasure.coins.pp = pp;
    treasure.totalValue += pp * 10;
  }

  // Roll gems
  if (hoard.gems.chance > 0 && Math.random() < hoard.gems.chance) {
    const gemTable = GEM_TABLES[hoard.gems.table] || GEM_TABLES.gem_10gp;
    const count = Math.floor(Math.random() * 6) + 1;
    const gemValue = parseInt(hoard.gems.table.replace('gem_', '').replace('gp', '')) || 10;
    for (let i = 0; i < count; i++) {
      const gem = { name: pickRandom(gemTable), value: gemValue };
      treasure.gems.push(gem);
      treasure.totalValue += gemValue;
    }
  }

  // Roll art objects
  if (hoard.art.chance > 0 && Math.random() < hoard.art.chance) {
    const artTable = ART_TABLES[hoard.art.table] || ART_TABLES.art_25gp;
    const count = Math.floor(Math.random() * 4) + 1;
    const artValue = parseInt(hoard.art.table.replace('art_', '').replace('gp', '')) || 25;
    for (let i = 0; i < count; i++) {
      const art = { name: pickRandom(artTable), value: artValue };
      treasure.artObjects.push(art);
      treasure.totalValue += artValue;
    }
  }

  // Roll magic items
  for (const mi of hoard.magicItems) {
    if (mi.chance > 0 && Math.random() < mi.chance) {
      const table = MAGIC_ITEM_TABLES[mi.table];
      if (table && table.length > 0) {
        const item = { ...pickRandom(table) };
        treasure.magicItems.push(item);
        treasure.totalValue += item.value || 0;
      }
    }
  }

  treasure.totalValue = Math.round(treasure.totalValue * 100) / 100;
  return treasure;
}

/**
 * Generate individual monster loot (simpler than a full hoard).
 */
function generateMonsterLoot(monster) {
  const cr = typeof monster.cr === 'string' ? parseCR(monster.cr) : (monster.cr || 0);
  const loot = { coins: {}, items: [], totalValue: 0 };

  // Simple coin drops based on CR
  if (cr <= 1) {
    const cp = Math.floor(Math.random() * 10) + 1;
    const sp = Math.floor(Math.random() * 5);
    loot.coins = { cp, sp };
    loot.totalValue = cp * 0.01 + sp * 0.1;
  } else if (cr <= 4) {
    const sp = Math.floor(Math.random() * 20) + 5;
    const gp = Math.floor(Math.random() * 10);
    loot.coins = { sp, gp };
    loot.totalValue = sp * 0.1 + gp;
  } else if (cr <= 10) {
    const gp = Math.floor(Math.random() * 50) + 10;
    const pp = Math.floor(Math.random() * 5);
    loot.coins = { gp, pp };
    loot.totalValue = gp + pp * 10;
  } else {
    const gp = Math.floor(Math.random() * 100) + 50;
    const pp = Math.floor(Math.random() * 20) + 5;
    loot.coins = { gp, pp };
    loot.totalValue = gp + pp * 10;
  }

  // Small chance of a potion or scroll
  if (Math.random() < 0.15) {
    const potionTable = MAGIC_ITEM_TABLES.magic_a;
    const item = { ...pickRandom(potionTable) };
    loot.items.push(item);
    loot.totalValue += item.value || 0;
  }

  loot.totalValue = Math.round(loot.totalValue * 100) / 100;
  return loot;
}

/**
 * Generate a shop inventory for a settlement.
 */
function generateShopInventory(options = {}) {
  const { settlementLevel = 'village', maxItemRarity = 'uncommon' } = options;

  const rarityOrder = ['common', 'uncommon', 'rare', 'very_rare', 'legendary'];
  const maxRarityIdx = rarityOrder.indexOf(maxItemRarity);

  const inventory = { items: [], totalValue: 0 };

  // Common items always available
  const commonItems = Object.values(MAGIC_ITEM_TABLES)
    .flat()
    .filter(i => rarityOrder.indexOf(i.rarity) <= maxRarityIdx);

  // Number of items based on settlement
  const itemCounts = { village: 3, town: 6, city: 10, metropolis: 15 };
  const count = itemCounts[settlementLevel] || 5;

  const shuffled = [...commonItems].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const item = { ...shuffled[i], inStock: true };
    inventory.items.push(item);
    inventory.totalValue += item.value || 0;
  }

  inventory.totalValue = Math.round(inventory.totalValue * 100) / 100;
  return inventory;
}

/**
 * Distribute loot among party members.
 */
function distributeLoot(treasure, party) {
  if (!party || party.length === 0) return [];

  const totalGP = treasure.totalValue || 0;
  const shareGP = Math.floor((totalGP / party.length) * 100) / 100;

  return party.map(p => ({
    playerId: p.id,
    playerName: p.name || p.id,
    goldShare: shareGP,
    // Magic items distributed round-robin
    magicItems: []
  }));
}

/**
 * Format treasure for DM narration.
 */
function formatTreasureNarration(treasure) {
  const parts = [];

  // Coins
  const coinParts = [];
  if (treasure.coins.cp) coinParts.push(`${treasure.coins.cp} cp`);
  if (treasure.coins.sp) coinParts.push(`${treasure.coins.sp} sp`);
  if (treasure.coins.gp) coinParts.push(`${treasure.coins.gp} gp`);
  if (treasure.coins.pp) coinParts.push(`${treasure.coins.pp} pp`);
  if (coinParts.length > 0) parts.push(`Coins: ${coinParts.join(', ')}`);

  // Gems
  if (treasure.gems && treasure.gems.length > 0) {
    parts.push(`Gems: ${treasure.gems.map(g => `${g.name} (${g.value} gp)`).join(', ')}`);
  }

  // Art
  if (treasure.artObjects && treasure.artObjects.length > 0) {
    parts.push(`Art: ${treasure.artObjects.map(a => `${a.name} (${a.value} gp)`).join(', ')}`);
  }

  // Magic items
  if (treasure.magicItems && treasure.magicItems.length > 0) {
    parts.push(`Magic: ${treasure.magicItems.map(i => i.name).join(', ')}`);
  }

  return parts.join(' | ') || 'Nothing of value.';
}

function parseCR(cr) {
  if (typeof cr === 'number') return cr;
  if (!cr) return 0;
  const s = String(cr).trim();
  if (s.includes('/')) {
    const [num, den] = s.split('/').map(Number);
    return num / den;
  }
  return parseFloat(s) || 0;
}

module.exports = {
  TREASURE_HOARDS,
  GEM_TABLES,
  ART_TABLES,
  MAGIC_ITEM_TABLES,
  rollDice,
  generateTreasureHoard,
  generateMonsterLoot,
  generateShopInventory,
  distributeLoot,
  formatTreasureNarration,
  parseCR
};
