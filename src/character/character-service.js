'use strict';

const { randomUUID } = require('crypto');

const {
  VALID_RACES, VALID_SUBRACES, VALID_CLASSES,
  RACE_DEFAULTS, SUBRACE_DEFAULTS, CLASS_DEFAULTS, SPELLCASTING_CLASSES,
  XP_TABLE,
  modifier, proficiencyBonus, xpForLevel, levelForXP,
  createCharacterTemplate, validateCharacter, assertValid, sanitizeForPlayer,
  ValidationError,
} = require('./character-model');

// ── EventEmitter for level-up / death / condition-change notifications ───────

const { EventEmitter } = require('events');

// ── In-Memory Store (Phase 1) ────────────────────────────────────────────────

/**
 * CharacterService — singleton.
 * Source of truth for all character state. AI DM reads from here,
 * combat system updates here, frontend renders from here.
 */
class CharacterService extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, object>} id → character */
    this._characters = new Map();
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Create a new character.
   *
   * @param {object} options
   * @param {string} options.userId       — owning player
   * @param {string} options.name         — character name
   * @param {string} options.race         — e.g. 'elf'
   * @param {string} [options.subrace]    — e.g. 'wood-elf'
   * @param {string} options.characterClass — e.g. 'wizard'
   * @param {string} [options.alignment]
   * @param {string} [options.backstory]
   * @param {string} [options.sessionId]
   * @param {number[]} [options.statArray] — 6 values in [str,dex,con,int,wis,cha] order. If omitted, 4d6-drop-lowest is rolled.
   * @param {object} [options.portrait]
   * @returns {object} the created character
   */
  createCharacter(options = {}) {
    const {
      userId, name, race = 'human', subrace = null,
      characterClass = 'fighter', alignment = 'true-neutral',
      backstory = '', sessionId = null, statArray = null,
      portrait = { url: '', style: '' },
    } = options;

    if (!userId) throw new ValidationError('userId', 'userId is required');
    if (!name) throw new ValidationError('name', 'name is required');
    if (!VALID_RACES.includes(race)) throw new ValidationError('race', `Invalid race: ${race}`);
    if (!VALID_CLASSES.includes(characterClass)) throw new ValidationError('characterClass', `Invalid class: ${characterClass}`);
    if (subrace) {
      const validSub = VALID_SUBRACES[race];
      if (!validSub || !validSub.includes(subrace)) {
        throw new ValidationError('subrace', `Invalid subrace "${subrace}" for race "${race}"`);
      }
    }

    const id = randomUUID();
    const raceDefaults = RACE_DEFAULTS[race] || {};
    const subraceDefaults = subrace ? (SUBRACE_DEFAULTS[subrace] || {}) : {};
    const classDefaults = CLASS_DEFAULTS[characterClass] || {};

    // ── Stats ──────────────────────────────────────────────────────────────
    const stats = this._assignStats(statArray, raceDefaults, subraceDefaults);

    // ── Derived values ─────────────────────────────────────────────────────
    const conMod = modifier(stats.con);
    const hitDie = classDefaults.hitDie || 10;
    const maxHp = hitDie + conMod; // level 1: max hit die + CON mod
    const profBonus = 2; // level 1 always 2

    // AC: 10 + DEX mod (base, no armor)
    const dexMod = modifier(stats.dex);
    const baseAc = 10 + dexMod;

    // Skills & saving throws — populate with proficient defaults
    const savingThrows = {};
    for (const st of (classDefaults.savingThrows || [])) {
      savingThrows[st] = { proficient: true, value: modifier(stats[st]) + profBonus };
    }
    // Fill non-proficient saves
    for (const ab of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      if (!savingThrows[ab]) {
        savingThrows[ab] = { proficient: false, value: modifier(stats[ab]) };
      }
    }

    // Languages
    const languages = [...new Set([...(raceDefaults.languages || ['common']), ...(subraceDefaults.languages || [])])];

    // Hit dice
    const hitDice = { total: 1, remaining: 1, die: `d${hitDie}` };

    // Spellcasting setup for casters
    const spells = { known: [], slots: {}, prepared: [] };
    if (SPELLCASTING_CLASSES.includes(characterClass)) {
      spells.slots = this._level1SpellSlots(characterClass);
    }

    const template = createCharacterTemplate({
      id,
      userId,
      name,
      race,
      subrace,
      characterClass,
      subclass: null,
      level: 1,
      xp: 0,
      stats,
      savingThrows,
      skills: {},
      hp: maxHp,
      maxHp,
      tempHp: 0,
      ac: baseAc,
      speed: raceDefaults.speed || 30,
      proficiencyBonus: profBonus,
      hitDice,
      deathSaves: { successes: 0, failures: 0 },
      inventory: [],
      equipment: { armor: null, shield: null, mainHand: null, offHand: null, accessories: [] },
      spells,
      features: this._level1Features(characterClass),
      conditions: [],
      languages,
      backstory,
      portrait: portrait || { url: '', style: '' },
      alignment,
      createdAt: new Date().toISOString(),
      lastPlayedAt: new Date().toISOString(),
      sessionId,
    });

    assertValid(template);
    this._characters.set(id, template);

    this.emit('character:created', { characterId: id, userId, name });
    return { ...template };
  }

  /**
   * Get a character by ID. Returns null if not found.
   */
  getCharacter(id) {
    const char = this._characters.get(id);
    return char ? { ...char, stats: { ...char.stats }, equipment: { ...char.equipment }, deathSaves: { ...char.deathSaves }, hitDice: { ...char.hitDice }, spells: { ...char.spells }, portrait: { ...char.portrait } } : null;
  }

  /**
   * Get character or throw.
   */
  getCharacterOrThrow(id) {
    const char = this.getCharacter(id);
    if (!char) throw new Error(`Character not found: ${id}`);
    return char;
  }

  /**
   * Partial update. Merges `changes` into the character.
   * Validates after merge.
   */
  updateCharacter(id, changes) {
    const char = this._characters.get(id);
    if (!char) throw new Error(`Character not found: ${id}`);

    const forbidden = ['id', 'userId', 'createdAt'];
    for (const key of forbidden) {
      if (key in changes) throw new ValidationError(key, `Cannot modify ${key}`);
    }

    // Deep merge for nested objects
    for (const [key, value] of Object.entries(changes)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && char[key] && typeof char[key] === 'object' && !Array.isArray(char[key])) {
        char[key] = { ...char[key], ...value };
      } else {
        char[key] = value;
      }
    }

    char.lastPlayedAt = new Date().toISOString();
    assertValid(char);

    this.emit('character:updated', { characterId: id, changes: Object.keys(changes) });
    return this.getCharacter(id);
  }

  /**
   * Delete a character.
   */
  deleteCharacter(id) {
    const existed = this._characters.delete(id);
    if (existed) this.emit('character:deleted', { characterId: id });
    return existed;
  }

  // ── XP & Leveling ────────────────────────────────────────────────────────

  /**
   * Award XP. Handles multi-level jumps and emits events.
   *
   * @returns {{ character, levelsGained, notifications: string[] }}
   */
  gainXP(id, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new ValidationError('amount', 'XP amount must be a positive number');
    }

    const char = this._characters.get(id);
    if (!char) throw new Error(`Character not found: ${id}`);

    const oldLevel = char.level;
    char.xp += amount;
    const newLevel = levelForXP(char.xp);
    const levelsGained = newLevel - oldLevel;
    const notifications = [];

    if (levelsGained > 0) {
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        char.level = lvl;
        const levelNote = this._applyLevelUp(char, lvl);
        notifications.push(`Level Up! ${char.name} is now level ${lvl}. ${levelNote}`);
      }

      this.emit('character:levelup', {
        characterId: id,
        oldLevel,
        newLevel,
        notifications,
      });
    }

    char.lastPlayedAt = new Date().toISOString();
    notifications.push(`${char.name} gained ${amount} XP (total: ${char.xp})`);

    return { character: this.getCharacter(id), levelsGained, notifications };
  }

  // ── Equipment ────────────────────────────────────────────────────────────

  /**
   * Equip an item from inventory into a slot.
   * @param {string} id       character id
   * @param {string} itemId   inventory item id
   * @param {string} slot     'armor'|'shield'|'mainHand'|'offHand'|'accessories'
   */
  equipItem(id, itemId, slot) {
    const char = this._characters.get(id);
    if (!char) throw new Error(`Character not found: ${id}`);

    const validSlots = ['armor', 'shield', 'mainHand', 'offHand', 'accessories'];
    if (!validSlots.includes(slot)) {
      throw new ValidationError('slot', `Invalid slot: ${slot}. Must be one of: ${validSlots.join(', ')}`);
    }

    const itemIdx = char.inventory.findIndex(i => i.id === itemId);
    if (itemIdx === -1) throw new Error(`Item not found in inventory: ${itemId}`);

    const item = char.inventory[itemIdx];

    // If slot is occupied, unequip current first (return to inventory)
    if (slot === 'accessories') {
      // Accessories is an array — push
      char.equipment.accessories.push(item);
    } else {
      const current = char.equipment[slot];
      if (current) {
        char.inventory.push(current);
      }
      char.equipment[slot] = item;
    }

    // Remove from inventory
    char.inventory.splice(itemIdx, 1);

    // Recalculate AC if armor/shield changed
    if (slot === 'armor' || slot === 'shield') {
      this._recalculateAC(char);
    }

    char.lastPlayedAt = new Date().toISOString();
    this.emit('character:item-equipped', { characterId: id, itemId, slot });

    return this.getCharacter(id);
  }

  /**
   * Unequip an item from a slot back to inventory.
   */
  unequipItem(id, slot) {
    const char = this._characters.get(id);
    if (!char) throw new Error(`Character not found: ${id}`);

    const validSlots = ['armor', 'shield', 'mainHand', 'offHand', 'accessories'];
    if (!validSlots.includes(slot)) {
      throw new ValidationError('slot', `Invalid slot: ${slot}`);
    }

    let item;
    if (slot === 'accessories') {
      if (char.equipment.accessories.length === 0) throw new Error('No accessories to unequip');
      item = char.equipment.accessories.pop();
    } else {
      item = char.equipment[slot];
      if (!item) throw new Error(`Nothing equipped in ${slot}`);
      char.equipment[slot] = null;
    }

    char.inventory.push(item);

    if (slot === 'armor' || slot === 'shield') {
      this._recalculateAC(char);
    }

    char.lastPlayedAt = new Date().toISOString();
    this.emit('character:item-unequipped', { characterId: id, slot });

    return this.getCharacter(id);
  }

  // ── Inventory ────────────────────────────────────────────────────────────

  /**
   * Add an item to inventory.
   * @param {string} id    character id
   * @param {object} item  { id?, name, type, quantity?, description?, properties? }
   */
  addToInventory(id, item) {
    const char = this._characters.get(id);
    if (!char) throw new Error(`Character not found: ${id}`);

    if (!item || !item.name) throw new ValidationError('item', 'Item must have a name');

    const inventoryItem = {
      id: item.id || randomUUID(),
      name: item.name,
      type: item.type || 'misc',
      quantity: item.quantity || 1,
      description: item.description || '',
      properties: item.properties || {},
      ...item,
      id: item.id || randomUUID(), // ensure id is set last
    };

    // Stack if same item name and type
    const existing = char.inventory.find(
      i => i.name === inventoryItem.name && i.type === inventoryItem.type
    );
    if (existing && !inventoryItem.properties.unique) {
      existing.quantity += inventoryItem.quantity;
    } else {
      char.inventory.push(inventoryItem);
    }

    char.lastPlayedAt = new Date().toISOString();
    this.emit('character:inventory-add', { characterId: id, item: inventoryItem });

    return this.getCharacter(id);
  }

  /**
   * Remove an item from inventory.
   */
  removeFromInventory(id, itemId) {
    const char = this._characters.get(id);
    if (!char) throw new Error(`Character not found: ${id}`);

    const idx = char.inventory.findIndex(i => i.id === itemId);
    if (idx === -1) throw new Error(`Item not found in inventory: ${itemId}`);

    const removed = char.inventory.splice(idx, 1)[0];
    char.lastPlayedAt = new Date().toISOString();

    this.emit('character:inventory-remove', { characterId: id, item: removed });
    return { character: this.getCharacter(id), removed };
  }

  /**
   * Use a consumable item (potion, scroll, etc.).
   * Decrements quantity or removes if last one.
   */
  useItem(id, itemId) {
    const char = this._characters.get(id);
    if (!char) throw new Error(`Character not found: ${id}`);

    const item = char.inventory.find(i => i.id === itemId);
    if (!item) throw new Error(`Item not found in inventory: ${itemId}`);

    if (item.type !== 'consumable' && item.type !== 'potion' && item.type !== 'scroll') {
      throw new ValidationError('item', `Item "${item.name}" is not consumable (type: ${item.type})`);
    }

    const effects = item.properties || {};

    // Apply potion / consumable effects
    if (effects.healing) {
      const healed = Math.min(effects.healing, char.maxHp - char.hp);
      char.hp += healed;
    }
    if (effects.tempHp) {
      char.tempHp = Math.max(char.tempHp, effects.tempHp);
    }
    if (effects.conditions && Array.isArray(effects.conditions)) {
      // Remove conditions
      char.conditions = char.conditions.filter(c => !effects.conditions.includes(c));
    }

    // Decrement
    item.quantity = (item.quantity || 1) - 1;
    if (item.quantity <= 0) {
      char.inventory = char.inventory.filter(i => i.id !== itemId);
    }

    char.lastPlayedAt = new Date().toISOString();
    this.emit('character:item-used', { characterId: id, itemId, itemName: item.name, effects });

    return { character: this.getCharacter(id), effects, remaining: item.quantity };
  }

  // ── Summary for AI DM ────────────────────────────────────────────────────

  /**
   * Player-friendly summary for the AI DM context window.
   * Combines sanitizeForPlayer with key context the DM needs.
   */
  getCharacterSummary(id) {
    const raw = this.getCharacterOrThrow(id);
    const sanitized = sanitizeForPlayer(raw);

    return {
      ...sanitized,
      // DM-relevant structured data the sanitized version strips
      _dm: {
        id: raw.id,
        userId: raw.userId,
        level: raw.level,
        xp: raw.xp,
        xpToNext: raw.level < 20 ? XP_TABLE[raw.level] - raw.xp : null,
        hp: raw.hp,
        maxHp: raw.maxHp,
        tempHp: raw.tempHp,
        ac: raw.ac,
        speed: raw.speed,
        proficiencyBonus: raw.proficiencyBonus,
        stats: { ...raw.stats },
        conditions: [...raw.conditions],
        inventoryCount: raw.inventory.length,
        equippedItems: {
          armor: raw.equipment.armor?.name || 'None',
          shield: raw.equipment.shield?.name || 'None',
          mainHand: raw.equipment.mainHand?.name || 'None',
          offHand: raw.equipment.offHand?.name || 'None',
          accessories: raw.equipment.accessories.map(a => a.name),
        },
        spellSlots: raw.spells.slots,
        preparedSpells: raw.spells.prepared,
        hitDiceRemaining: raw.hitDice.remaining,
        deathSaves: { ...raw.deathSaves },
        features: [...raw.features],
      },
    };
  }

  // ── Admin / Debug ────────────────────────────────────────────────────────

  /** List all character IDs (for debugging / admin). */
  listCharacterIds() {
    return [...this._characters.keys()];
  }

  /** Get count. */
  get size() {
    return this._characters.size;
  }

  /** Clear all. */
  clear() {
    this._characters.clear();
  }

  // ── Internal Helpers ─────────────────────────────────────────────────────

  /**
   * Assign stats: either from a provided array or rolled (4d6 drop lowest).
   */
  _assignStats(statArray, raceDefaults, subraceDefaults) {
    let base;
    if (statArray && statArray.length === 6) {
      base = [...statArray].sort((a, b) => b - a); // sort descending for assignment
    } else {
      // 4d6 drop lowest, 6 times
      base = Array.from({ length: 6 }, () => {
        const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
        rolls.sort((a, b) => b - a);
        return rolls[0] + rolls[1] + rolls[2]; // drop lowest
      }).sort((a, b) => b - a);
    }

    // Apply racial bonuses
    const racialBonuses = { ...(raceDefaults.statBonuses || {}), ...(subraceDefaults.statBonuses || {}) };
    const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const stats = {};
    for (let i = 0; i < 6; i++) {
      stats[abilities[i]] = base[i] + (racialBonuses[abilities[i]] || 0);
    }

    return stats;
  }

  /**
   * Apply level-up: HP increase, hit dice, feature unlocks.
   * Returns a note string.
   */
  _applyLevelUp(char, newLevel) {
    const classDefaults = CLASS_DEFAULTS[char.characterClass] || {};
    const hitDie = classDefaults.hitDie || 10;
    const conMod = modifier(char.stats.con);

    // HP: max hit die / 2 + 1 + CON mod (average), or could be rolled
    const hpGain = Math.floor(hitDie / 2) + 1 + conMod;
    char.maxHp += Math.max(hpGain, 1); // minimum 1 HP per level
    char.hp = char.maxHp; // Full heal on level up

    // Proficiency bonus
    char.proficiencyBonus = proficiencyBonus(newLevel);

    // Hit dice
    char.hitDice.total = newLevel;
    char.hitDice.remaining = newLevel; // full restore on level up

    // Recalculate saving throws
    for (const ab of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const isProficient = char.savingThrows[ab]?.proficient || false;
      char.savingThrows[ab] = {
        proficient: isProficient,
        value: modifier(char.stats[ab]) + (isProficient ? char.proficiencyBonus : 0),
      };
    }

    // Spell slots for casters
    if (SPELLCASTING_CLASSES.includes(char.characterClass)) {
      char.spells.slots = this._spellSlotsForLevel(char.characterClass, newLevel);
    }

    // Feature unlocks (simplified — extendable)
    const featureNote = this._checkFeatureUnlocks(char, newLevel);

    return `HP +${hpGain} (now ${char.maxHp}). Proficiency +${char.proficiencyBonus}. ${featureNote}`;
  }

  /**
   * Recalculate AC based on equipped armor + shield.
   */
  _recalculateAC(char) {
    const dexMod = modifier(char.stats.dex);
    let baseAc = 10 + dexMod;

    const armor = char.equipment.armor;
    if (armor && armor.properties) {
      const p = armor.properties;
      const armorAc = p.ac || 10;
      const maxDex = p.maxDexBonus != null ? p.maxDexBonus : dexMod;
      baseAc = armorAc + Math.min(dexMod, maxDex);
    }

    if (char.equipment.shield) {
      const shieldAc = char.equipment.shield.properties?.ac || 2;
      baseAc += shieldAc;
    }

    char.ac = baseAc;
  }

  /**
   * Level 1 spell slots for casting classes.
   */
  _level1SpellSlots(cls) {
    const full = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard'];
    const half = ['paladin', 'ranger'];
    const pact = ['warlock'];

    if (full.includes(cls)) return { '1': 2 };
    if (half.includes(cls)) return {}; // half-casters get slots at level 2
    if (pact.includes(cls)) return { '1': 1 }; // warlock: 1 pact slot
    return {};
  }

  /**
   * Spell slots by class and level (simplified — full 5e table would be huge).
   */
  _spellSlotsForLevel(cls, level) {
    const fullCasterLevel = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(cls)
      ? level
      : ['paladin', 'ranger'].includes(cls)
        ? Math.ceil(level / 2)
        : cls === 'warlock' ? level : 0;

    if (cls === 'warlock') {
      // Warlock pact magic — simplified
      const slotLevel = level < 3 ? 1 : level < 5 ? 2 : level < 7 ? 3 : level < 9 ? 4 : 5;
      const numSlots = level < 2 ? 1 : level < 11 ? 2 : level < 17 ? 3 : 4;
      return { [String(slotLevel)]: numSlots };
    }

    // Standard full-caster slot table (levels 1-20)
    const slotTable = [
      [2,0,0,0,0,0,0,0,0], // 1
      [3,0,0,0,0,0,0,0,0], // 2
      [4,2,0,0,0,0,0,0,0], // 3
      [4,3,0,0,0,0,0,0,0], // 4
      [4,3,2,0,0,0,0,0,0], // 5
      [4,3,3,0,0,0,0,0,0], // 6
      [4,3,3,1,0,0,0,0,0], // 7
      [4,3,3,2,0,0,0,0,0], // 8
      [4,3,3,3,1,0,0,0,0], // 9
      [4,3,3,3,2,0,0,0,0], // 10
      [4,3,3,3,2,1,0,0,0], // 11
      [4,3,3,3,2,1,0,0,0], // 12
      [4,3,3,3,2,1,1,0,0], // 13
      [4,3,3,3,2,1,1,0,0], // 14
      [4,3,3,3,2,1,1,1,0], // 15
      [4,3,3,3,2,1,1,1,0], // 16
      [4,3,3,3,2,1,1,1,1], // 17
      [4,3,3,3,3,1,1,1,1], // 18
      [4,3,3,3,3,2,1,1,1], // 19
      [4,3,3,3,3,2,2,1,1], // 20
    ];

    const idx = Math.max(0, Math.min(fullCasterLevel - 1, 19));
    const slots = {};
    const row = slotTable[idx];
    for (let i = 0; i < row.length; i++) {
      if (row[i] > 0) slots[String(i + 1)] = row[i];
    }
    return slots;
  }

  /**
   * Level 1 class features.
   */
  _level1Features(cls) {
    const features = {
      barbarian: ['Rage (2 uses)', 'Unarmored Defense'],
      bard: ['Bardic Inspiration (d6)', 'Spellcasting'],
      cleric: ['Divine Domain (choose at creation)', 'Spellcasting', 'Channel Divinity (1/rest)'],
      druid: ['Druidic', 'Spellcasting'],
      fighter: ['Fighting Style', 'Second Wind'],
      monk: ['Unarmored Defense', 'Martial Arts (d4)'],
      paladin: ['Divine Sense', 'Lay on Hands'],
      ranger: ['Favored Enemy', 'Natural Explorer'],
      rogue: ['Expertise', 'Sneak Attack (1d6)', 'Thieves\' Cant'],
      sorcerer: ['Spellcasting', 'Sorcerous Origin (choose at creation)'],
      warlock: ['Otherworldly Patron (choose at creation)', 'Pact Magic'],
      wizard: ['Spellcasting', 'Arcane Recovery'],
    };
    return features[cls] || [];
  }

  /**
   * Check for feature unlocks at a given level (key milestones only).
   */
  _checkFeatureUnlocks(char, level) {
    const notes = [];
    const cls = char.characterClass;

    // Universal milestone features
    if (level === 2) notes.push('New class features unlocked.');
    if (level === 3) {
      notes.push('Subclass choice available — choose your archetype!');
      char.subclass = char.subclass || '(pending choice)';
    }
    if (level === 4 || level === 8 || level === 12 || level === 16 || level === 19) {
      notes.push('Ability Score Improvement available (+2 to one stat or +1 to two).');
    }
    if (level === 5) notes.push('Extra Attack or major class power spike!');
    if (level === 20) notes.push('Capstone feature unlocked!');

    // Class-specific
    if (cls === 'barbarian') {
      if (level === 3) notes.push('Primal Path chosen.');
      if (level === 5) notes.push('Extra Attack, Fast Movement.');
    }
    if (cls === 'rogue') {
      if (level === 3) notes.push('Roguish Archetype chosen. Sneak Attack now 2d6.');
      if (level === 5) notes.push('Uncanny Dodge.');
    }

    return notes.join(' ');
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

const characterService = new CharacterService();

module.exports = characterService;
module.exports.CharacterService = CharacterService;
