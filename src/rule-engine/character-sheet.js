'use strict';

/**
 * @module rule-engine/character-sheet
 * @description D&D 5e character data model and life-cycle functions.
 *
 * This module defines the canonical character object shape and provides
 * functions for creation, levelling, HP management, conditions, and
 * derived-stat queries.  All deterministic — no LLM involvement.
 */

const { abilityModifier, allModifiers, proficiencyBonus, ABILITIES } = require('./stats');
const { getClass, hitPointsAtLevel, featuresUpToLevel } = require('./classes');
const { getRaceWithSubrace } = require('./races');
const { roll } = require('./dice');

// ─── Skill definitions ──────────────────────────────────────────────────────

/**
 * All 18 D&D 5e skills mapped to their governing ability.
 */
const SKILLS = Object.freeze({
  acrobatics:       { ability: 'dex', name: 'Acrobatics' },
  'animal handling': { ability: 'wis', name: 'Animal Handling' },
  arcana:           { ability: 'int', name: 'Arcana' },
  athletics:        { ability: 'str', name: 'Athletics' },
  deception:        { ability: 'cha', name: 'Deception' },
  history:          { ability: 'int', name: 'History' },
  insight:          { ability: 'wis', name: 'Insight' },
  intimidation:     { ability: 'cha', name: 'Intimidation' },
  investigation:    { ability: 'int', name: 'Investigation' },
  medicine:         { ability: 'wis', name: 'Medicine' },
  nature:           { ability: 'int', name: 'Nature' },
  perception:       { ability: 'wis', name: 'Perception' },
  performance:      { ability: 'cha', name: 'Performance' },
  persuasion:       { ability: 'cha', name: 'Persuasion' },
  religion:         { ability: 'int', name: 'Religion' },
  'sleight of hand': { ability: 'dex', name: 'Sleight of Hand' },
  stealth:          { ability: 'dex', name: 'Stealth' },
  survival:         { ability: 'wis', name: 'Survival' },
});

/** Saving throw ability names (same 6 as abilities). */
const SAVING_THROWS = Object.freeze([...ABILITIES]);

// ─── Unique ID generator ────────────────────────────────────────────────────

const crypto = require('crypto');
function generateId() {
  return 'char_' + crypto.randomBytes(8).toString('hex');
}

// ─── Character creation ─────────────────────────────────────────────────────

/**
 * Create a new character object with all derived stats computed.
 *
 * @param {object} options
 * @param {string} options.name
 * @param {string} options.race         — race id (e.g. 'elf')
 * @param {string} [options.subrace]    — subrace id (e.g. 'high')
 * @param {string} options.classId      — class id (e.g. 'wizard')
 * @param {AbilityScores} options.stats — raw ability scores { str, dex, con, int, wis, cha }
 * @param {string[]} [options.skillProficiencies] — skill names the character is proficient in
 * @param {string[]} [options.savingThrowProficiencies] — if not provided, derived from class
 * @param {number} [options.level=1]
 * @param {number} [options.xp=0]
 * @param {string} [options.portrait]   — URL or path
 * @param {string} [options.backstory]
 * @returns {Character}
 *
 * @typedef {object} Character
 */
function createCharacter(options) {
  const {
    name,
    race: raceId,
    subrace: subraceId,
    classId,
    stats,
    skillProficiencies = [],
    savingThrowProficiencies,
    level = 1,
    xp = 0,
    portrait = null,
    backstory = '',
  } = options;

  if (!name) throw new Error('Character name is required');
  if (!raceId) throw new Error('Race is required');
  if (!classId) throw new Error('Class is required');
  if (!stats) throw new Error('Ability scores are required');

  // Validate class
  const classDef = getClass(classId);
  if (!classDef) throw new Error(`Unknown class: ${classId}`);

  // Validate & merge race
  const { merged: raceData } = getRaceWithSubrace(raceId, subraceId);

  // Apply racial bonuses
  const finalStats = {};
  for (const ability of ABILITIES) {
    finalStats[ability] = (stats[ability] || 10) + (raceData.abilityBonuses[ability] || 0);
  }

  const mods = allModifiers(finalStats);
  const profBonus = proficiencyBonus(level);
  const conMod = mods.con;
  const dexMod = mods.dex;

  // HP
  const maxHp = hitPointsAtLevel(classId, level, conMod);

  // AC (base 10 + DEX, overridden by armor in inventory)
  const baseAC = 10 + dexMod;

  // Saving throw proficiencies from class
  const saveProfs = savingThrowProficiencies || classDef.savingThrowProficiencies;

  // Build saving throw bonus map
  const savingThrows = {};
  for (const ability of SAVING_THROWS) {
    const proficient = saveProfs.includes(ability);
    savingThrows[ability] = {
      proficient,
      bonus: mods[ability] + (proficient ? profBonus : 0),
    };
  }

  // Build skill bonus map
  const skills = {};
  for (const [skillKey, skillDef] of Object.entries(SKILLS)) {
    const proficient = skillProficiencies.map(s => s.toLowerCase()).includes(skillKey);
    const expertise = false; // can be set later
    skills[skillKey] = {
      name: skillDef.name,
      ability: skillDef.ability,
      proficient,
      expertise,
      bonus: mods[skillDef.ability] + (proficient ? (expertise ? profBonus * 2 : profBonus) : 0),
    };
  }

  // Features from class up to level
  const classFeatures = featuresUpToLevel(classId, level);

  // Racial features
  const racialFeatures = (raceData.features || []).map(f => f.name);

  const character = {
    id: generateId(),
    name,
    race: raceId,
    subrace: subraceId || null,
    raceDisplayName: raceData.fullDisplayName,
    classId,
    className: classDef.name,
    level,
    xp,
    hitDice: classDef.hitDice,
    stats: { ...finalStats },
    rawStats: { ...stats },
    modifiers: mods,
    hp: maxHp,
    maxHp,
    tempHp: 0,
    ac: baseAC,
    baseAC,
    proficiencyBonus: profBonus,
    speed: raceData.speed,
    savingThrows,
    skillProficiencies,
    skills,
    inventory: [],
    spells: [],
    features: [...classFeatures, ...racialFeatures],
    conditions: [],
    portrait,
    backstory,
    deathSaves: { successes: 0, failures: 0 },
    resources: {}, // class-specific: rages, ki, sorcery points, etc.
    spellSlots: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return character;
}

// ─── Level Up ───────────────────────────────────────────────────────────────

/**
 * Level up a character. Increments level, recalculates HP, proficiency bonus,
 * features, saving throws, and skills.
 *
 * @param {Character} character — mutated in place AND returned
 * @param {object} [opts]
 * @param {number} [opts.hpRoll] — manual HP roll result; if omitted, uses average
 * @returns {Character}
 */
function levelUp(character, opts = {}) {
  if (character.level >= 20) throw new Error('Character is already level 20');

  character.level += 1;

  const classDef = getClass(character.classId);
  const mods = allModifiers(character.stats);
  const conMod = mods.con;

  // HP increase
  const hpGain = opts.hpRoll != null
    ? opts.hpRoll + conMod
    : classDef.hitPointsPerLevel + conMod;
  character.maxHp += Math.max(1, hpGain); // minimum 1 HP per level
  character.hp += Math.max(1, hpGain);

  // Recalculate proficiency
  character.proficiencyBonus = proficiencyBonus(character.level);

  // Recalculate saving throws
  for (const ability of SAVING_THROWS) {
    const proficient = character.savingThrows[ability]?.proficient ||
      classDef.savingThrowProficiencies.includes(ability);
    character.savingThrows[ability] = {
      proficient,
      bonus: mods[ability] + (proficient ? character.proficiencyBonus : 0),
    };
  }

  // Recalculate skills
  for (const [skillKey, skillDef] of Object.entries(SKILLS)) {
    const existing = character.skills[skillKey];
    const proficient = existing?.proficient || false;
    const expertise = existing?.expertise || false;
    character.skills[skillKey] = {
      name: skillDef.name,
      ability: skillDef.ability,
      proficient,
      expertise,
      bonus: mods[skillDef.ability] + (proficient ? (expertise ? character.proficiencyBonus * 2 : character.proficiencyBonus) : 0),
    };
  }

  // New features
  const newFeatures = featuresUpToLevel(character.classId, character.level);
  character.features = [...new Set([...character.features, ...newFeatures])];

  character.modifiers = mods;
  character.updatedAt = new Date().toISOString();

  return character;
}

// ─── HP management ──────────────────────────────────────────────────────────

/**
 * Apply damage to a character. Temp HP absorbs damage first.
 *
 * @param {Character} character
 * @param {number} amount — raw damage (must be >= 0)
 * @param {string} [type] — damage type (for resistances, future use)
 * @returns {{ actualDamage: number, tempHpLost: number, hpLost: number, unconscious: boolean, dead: boolean }}
 */
function applyDamage(character, amount, type) {
  if (amount < 0) throw new RangeError('Damage amount must be non-negative');
  let remaining = amount;
  let tempHpLost = 0;
  let hpLost = 0;

  // Temp HP absorbs first
  if (character.tempHp > 0) {
    tempHpLost = Math.min(character.tempHp, remaining);
    character.tempHp -= tempHpLost;
    remaining -= tempHpLost;
  }

  // Apply to real HP
  hpLost = Math.min(character.hp, remaining);
  character.hp -= hpLost;
  character.updatedAt = new Date().toISOString();

  const unconscious = character.hp === 0;
  const dead = character.hp <= 0 && character.deathSaves?.failures >= 3;

  return { actualDamage: tempHpLost + hpLost, tempHpLost, hpLost, unconscious, dead };
}

/**
 * Apply healing. Cannot exceed maxHp. Also stabilizes if at 0 HP.
 *
 * @param {Character} character
 * @param {number} amount — healing (must be >= 0)
 * @returns {{ actualHealing: number, stabilized: boolean }}
 */
function applyHealing(character, amount) {
  if (amount < 0) throw new RangeError('Healing amount must be non-negative');
  const before = character.hp;
  character.hp = Math.min(character.maxHp, character.hp + amount);
  character.updatedAt = new Date().toISOString();

  const stabilized = before === 0 && character.hp > 0;
  if (stabilized) {
    character.deathSaves = { successes: 0, failures: 0 };
  }

  return { actualHealing: character.hp - before, stabilized };
}

// ─── Temp HP ────────────────────────────────────────────────────────────────

/**
 * Set temporary hit points. Per 5e rules, temp HP do not stack — only the
 * higher value applies.
 *
 * @param {Character} character
 * @param {number} amount
 * @returns {number} — new tempHp value
 */
function setTempHp(character, amount) {
  if (amount < 0) throw new RangeError('Temp HP must be non-negative');
  character.tempHp = Math.max(character.tempHp, amount);
  character.updatedAt = new Date().toISOString();
  return character.tempHp;
}

// ─── Conditions ─────────────────────────────────────────────────────────────

/** Standard D&D 5e conditions. */
const CONDITIONS = Object.freeze([
  'blinded', 'charmed', 'deafened', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
  'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion',
]);

/**
 * Add a condition to a character.
 *
 * @param {Character} character
 * @param {string} condition — condition name (case-insensitive)
 * @param {object} [meta]    — optional metadata (e.g. { source, duration, level })
 * @returns {boolean} — true if added, false if already present
 */
function addCondition(character, condition, meta = {}) {
  const normalized = condition.toLowerCase();
  if (!character.conditions) character.conditions = [];

  const existing = character.conditions.find(c => c.name === normalized);
  if (existing) {
    // Exhaustion stacks
    if (normalized === 'exhaustion' && meta.level != null) {
      existing.level = Math.min(6, (existing.level || 1) + (meta.level || 1));
    }
    return false;
  }

  character.conditions.push({
    name: normalized,
    ...meta,
    appliedAt: new Date().toISOString(),
  });
  character.updatedAt = new Date().toISOString();
  return true;
}

/**
 * Remove a condition from a character.
 *
 * @param {Character} character
 * @param {string} condition
 * @returns {boolean} — true if removed, false if not found
 */
function removeCondition(character, condition) {
  const normalized = condition.toLowerCase();
  if (!character.conditions) return false;
  const idx = character.conditions.findIndex(c => c.name === normalized);
  if (idx === -1) return false;
  character.conditions.splice(idx, 1);
  character.updatedAt = new Date().toISOString();
  return true;
}

/**
 * Check if a character has a specific condition.
 *
 * @param {Character} character
 * @param {string} condition
 * @returns {boolean}
 */
function hasCondition(character, condition) {
  return (character.conditions || []).some(c => c.name === condition.toLowerCase());
}

/**
 * Get a character's exhaustion level (0 if not exhausted).
 * @param {Character} character
 * @returns {number}
 */
function exhaustionLevel(character) {
  const ex = (character.conditions || []).find(c => c.name === 'exhaustion');
  return ex ? (ex.level || 1) : 0;
}

// ─── Derived stats ──────────────────────────────────────────────────────────

/**
 * Get passive Perception score.
 * Formula: 10 + Perception skill bonus
 *
 * @param {Character} character
 * @returns {number}
 */
function getPassivePerception(character) {
  const perc = character.skills?.perception;
  const bonus = perc ? perc.bonus : (character.modifiers?.wis || 0);
  return 10 + bonus + (hasCondition(character, 'exhaustion') && exhaustionLevel(character) >= 3 ? -5 : 0);
}

/**
 * Get initiative bonus (DEX mod, or DEX mod + Jack of All Trades for bards).
 *
 * @param {Character} character
 * @returns {number}
 */
function getInitiative(character) {
  let init = character.modifiers?.dex || 0;
  // Jack of All Trades: half proficiency to initiative
  if (character.features?.includes('Jack of All Trades')) {
    init += Math.floor(character.proficiencyBonus / 2);
  }
  return init;
}

/**
 * Recalculate AC based on equipped armor + DEX mod + shield.
 * Call this after inventory changes.
 *
 * @param {Character} character
 * @returns {number} — new AC
 */
function recalculateAC(character) {
  const dexMod = character.modifiers?.dex || 0;
  let armor = null;
  let shield = 0;

  for (const item of (character.inventory || [])) {
    if (item.equipped && item.type === 'armor') armor = item;
    if (item.equipped && item.type === 'shield') shield = item.acBonus || 2;
  }

  if (!armor) {
    // Unarmored: check for class features
    if (character.classId === 'barbarian' && character.features?.includes('Unarmored Defense')) {
      const conMod = character.modifiers?.con || 0;
      character.ac = 10 + dexMod + conMod + shield;
    } else if (character.classId === 'monk' && character.features?.includes('Unarmored Defense')) {
      const wisMod = character.modifiers?.wis || 0;
      character.ac = 10 + dexMod + wisMod + shield;
    } else {
      character.ac = 10 + dexMod + shield;
    }
  } else {
    // Armored
    let baseAC = armor.baseAC || 10;
    const dexCap = armor.maxDexBonus; // null = no cap
    let applicableDex = dexMod;
    if (dexCap != null) applicableDex = Math.min(dexMod, dexCap);
    character.ac = baseAC + applicableDex + (armor.stealthDisadvantage ? 0 : 0) + shield;
  }

  character.updatedAt = new Date().toISOString();
  return character.ac;
}

// ─── Inventory helpers ──────────────────────────────────────────────────────

/**
 * Add an item to the character's inventory.
 *
 * @param {Character} character
 * @param {object} item — { name, type, weight?, quantity?, ... }
 */
function addItem(character, item) {
  if (!character.inventory) character.inventory = [];

  // Stack if same name and stackable
  const existing = character.inventory.find(i => i.name === item.name && i.stackable);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
  } else {
    character.inventory.push({ ...item, quantity: item.quantity || 1 });
  }
  character.updatedAt = new Date().toISOString();
}

/**
 * Remove an item from inventory by name.
 * @param {Character} character
 * @param {string} itemName
 * @param {number} [quantity=1]
 * @returns {boolean}
 */
function removeItem(character, itemName, quantity = 1) {
  const idx = character.inventory.findIndex(i => i.name === itemName);
  if (idx === -1) return false;
  const item = character.inventory[idx];
  if ((item.quantity || 1) <= quantity) {
    character.inventory.splice(idx, 1);
  } else {
    item.quantity -= quantity;
  }
  character.updatedAt = new Date().toISOString();
  return true;
}

// ─── Death saves ────────────────────────────────────────────────────────────

/**
 * Reset death save counters (when healed or stabilized).
 * @param {Character} character
 */
function resetDeathSaves(character) {
  character.deathSaves = { successes: 0, failures: 0 };
}

/**
 * Record a death save result.
 * @param {Character} character
 * @param {'success'|'failure'} result
 * @returns {{ stabilized: boolean, dead: boolean, successes: number, failures: number }}
 */
function recordDeathSave(character, result) {
  if (!character.deathSaves) character.deathSaves = { successes: 0, failures: 0 };

  if (result === 'success') {
    character.deathSaves.successes += 1;
  } else {
    character.deathSaves.failures += 1;
  }

  const stabilized = character.deathSaves.successes >= 3;
  const dead = character.deathSaves.failures >= 3;

  if (stabilized) {
    character.hp = 1;
    resetDeathSaves(character);
  }

  character.updatedAt = new Date().toISOString();
  return {
    stabilized,
    dead,
    successes: character.deathSaves.successes,
    failures: character.deathSaves.failures,
  };
}

// ─── XP management ──────────────────────────────────────────────────────────

/**
 * Award XP to a character. Does NOT auto-level — call levelUp separately
 * so the DM can narrate the level-up.
 *
 * @param {Character} character
 * @param {number} amount
 * @returns {{ newXP: number, canLevelUp: boolean }}
 */
function awardXP(character, amount) {
  if (amount < 0) throw new RangeError('XP amount must be non-negative');
  character.xp += amount;
  character.updatedAt = new Date().toISOString();
  const { xpForNextLevel } = require('./stats');
  const needed = xpForNextLevel(character.level);
  return {
    newXP: character.xp,
    canLevelUp: needed !== null && character.xp >= needed,
  };
}

/**
 * Serialize a character to a plain JSON-safe object.
 * @param {Character} character
 * @returns {object}
 */
function serialize(character) {
  return JSON.parse(JSON.stringify(character));
}

/**
 * Deserialize a plain object back into a character shape.
 * Recalculates derived stats if needed.
 * @param {object} data
 * @returns {Character}
 */
function deserialize(data) {
  // Ensure required fields exist
  if (!data.stats || !data.modifiers) {
    throw new Error('Invalid character data: missing stats or modifiers');
  }
  return data;
}

module.exports = {
  SKILLS,
  SAVING_THROWS,
  CONDITIONS,
  createCharacter,
  levelUp,
  applyDamage,
  applyHealing,
  setTempHp,
  addCondition,
  removeCondition,
  hasCondition,
  exhaustionLevel,
  getPassivePerception,
  getInitiative,
  recalculateAC,
  addItem,
  removeItem,
  resetDeathSaves,
  recordDeathSave,
  awardXP,
  serialize,
  deserialize,
};
