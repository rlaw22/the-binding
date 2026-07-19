'use strict';

/**
 * @module campaign/leveling
 * @description D&D 5e character leveling system for The Binding.
 *
 * Tracks XP, calculates level progression, processes level-ups (HP gain,
 * class features, proficiency bonus), and formats announcements. Integrates
 * with the session model (players[].character) and rule-engine/classes.
 */

const { v4: uuidv4 } = require('uuid');
const Dice = require('../rule-engine/dice');
const { CLASSES } = require('../rule-engine/classes');

// ─── XP Thresholds by Level ─────────────────────────────────────────────────
// SRD PHB p.15 — index 0 is unused, index 1 = level 1, etc.
/** @type {number[]} XP required to reach each level (1-indexed). */
const XP_TABLE = [
  0,       // [0]  unused
  0,       // [1]  level 1
  300,     // [2]
  900,     // [3]
  2700,    // [4]
  6500,    // [5]
  14000,   // [6]
  23000,   // [7]
  34000,   // [8]
  48000,   // [9]
  64000,   // [10]
  85000,   // [11]
  100000,  // [12]
  120000,  // [13]
  140000,  // [14]
  165000,  // [15]
  195000,  // [16]
  225000,  // [17]
  265000,  // [18]
  305000,  // [19]
  355000,  // [20]
];

const MAX_LEVEL = 20;

// ─── Proficiency Bonus Table ────────────────────────────────────────────────
/** @type {number[]} Proficiency bonus indexed by level (1-indexed). */
const PROFICIENCY_TABLE = [
  0,  // [0] unused
  2, 2, 2, 2,  // levels 1-4
  3, 3, 3, 3,  // levels 5-8
  4, 4, 4, 4,  // levels 9-12
  5, 5, 5, 5,  // levels 13-16
  6, 6, 6, 6,  // levels 17-20
];

// ─── Hit Dice Sizes by Class ────────────────────────────────────────────────
const HIT_DICE_SIZE = {
  barbarian: 12, bard: 8, cleric: 8, druid: 8, fighter: 10, monk: 8,
  paladin: 10, ranger: 10, rogue: 8, sorcerer: 6, warlock: 8, wizard: 6,
};

// ─── Class Features by Level (simplified, 1–20) ────────────────────────────
const CLASS_FEATURES = {
  barbarian: {
    1: ['Rage', 'Unarmored Defense'], 2: ['Reckless Attack', 'Danger Sense'],
    3: ['Primal Path'], 4: ['Ability Score Improvement'],
    5: ['Extra Attack', 'Fast Movement'], 6: ['Path Feature'],
    7: ['Feral Instinct'], 8: ['Ability Score Improvement'],
    9: ['Brutal Critical (1 die)'], 10: ['Path Feature'],
    11: ['Relentless Rage'], 12: ['Ability Score Improvement'],
    13: ['Brutal Critical (2 dice)'], 14: ['Path Feature'],
    15: ['Persistent Rage'], 16: ['Ability Score Improvement'],
    17: ['Brutal Critical (3 dice)'], 18: ['Indomitable Might'],
    19: ['Ability Score Improvement'], 20: ['Primal Champion'],
  },
  bard: {
    1: ['Spellcasting', 'Bardic Inspiration (d6)'], 2: ['Jack of All Trades', 'Song of Rest (d6)'],
    3: ['Bard College', 'Expertise'], 4: ['Ability Score Improvement'],
    5: ['Bardic Inspiration (d8)', 'Font of Inspiration'], 6: ['Countercharm', 'Bard College Feature'],
    7: [], 8: ['Ability Score Improvement'], 9: ['Song of Rest (d8)'],
    10: ['Bardic Inspiration (d10)', 'Expertise', 'Magical Secrets'],
    11: [], 12: ['Ability Score Improvement'], 13: ['Song of Rest (d10)'],
    14: ['Bard College Feature', 'Magical Secrets'], 15: ['Bardic Inspiration (d12)'],
    16: ['Ability Score Improvement'], 17: ['Song of Rest (d12)'],
    18: ['Magical Secrets'], 19: ['Ability Score Improvement'], 20: ['Superior Inspiration'],
  },
  cleric: {
    1: ['Spellcasting', 'Divine Domain'], 2: ['Channel Divinity (1/rest)', 'Divine Domain Feature'],
    3: [], 4: ['Ability Score Improvement'], 5: ['Destroy Undead (CR 1/2)'],
    6: ['Channel Divinity (2/rest)', 'Divine Domain Feature'], 7: [],
    8: ['Ability Score Improvement', 'Destroy Undead (CR 1)', 'Divine Domain Feature'],
    9: [], 10: ['Divine Intervention'], 11: ['Destroy Undead (CR 2)'],
    12: ['Ability Score Improvement'], 13: [], 14: ['Destroy Undead (CR 3)'],
    15: [], 16: ['Ability Score Improvement'],
    17: ['Destroy Undead (CR 4)', 'Divine Domain Feature'],
    18: ['Channel Divinity (3/rest)'], 19: ['Ability Score Improvement'],
    20: ['Divine Intervention Improvement'],
  },
  druid: {
    1: ['Druidic', 'Spellcasting'], 2: ['Wild Shape'], 3: ['Druid Circle'],
    4: ['Ability Score Improvement', 'Wild Shape Improvement'], 5: [],
    6: ['Druid Circle Feature'], 7: [], 8: ['Ability Score Improvement', 'Wild Shape Improvement'],
    9: [], 10: ['Druid Circle Feature'], 11: [], 12: ['Ability Score Improvement'],
    13: [], 14: ['Druid Circle Feature'], 15: [], 16: ['Ability Score Improvement'],
    17: [], 18: ['Timeless Body', 'Beast Spells'], 19: ['Ability Score Improvement'],
    20: ['Archdruid'],
  },
  fighter: {
    1: ['Fighting Style', 'Second Wind'], 2: ['Action Surge (1 use)'],
    3: ['Martial Archetype'], 4: ['Ability Score Improvement'], 5: ['Extra Attack'],
    6: ['Ability Score Improvement'], 7: ['Martial Archetype Feature'],
    8: ['Ability Score Improvement'], 9: ['Indomitable (1 use)'],
    10: ['Martial Archetype Feature'], 11: ['Extra Attack (2)'],
    12: ['Ability Score Improvement'], 13: ['Indomitable (2 uses)'],
    14: ['Ability Score Improvement'], 15: ['Martial Archetype Feature'],
    16: ['Ability Score Improvement'], 17: ['Action Surge (2 uses)', 'Indomitable (3 uses)'],
    18: ['Martial Archetype Feature'], 19: ['Ability Score Improvement'], 20: ['Extra Attack (3)'],
  },
  monk: {
    1: ['Unarmored Defense', 'Martial Arts (1d4)'], 2: ['Ki', 'Unarmored Movement'],
    3: ['Monastic Tradition', 'Deflect Missiles'],
    4: ['Ability Score Improvement', 'Slow Fall'], 5: ['Extra Attack', 'Stunning Strike'],
    6: ['Ki-Empowered Strikes', 'Monastic Tradition Feature'],
    7: ['Evasion', 'Stillness of Mind'], 8: ['Ability Score Improvement'],
    9: ['Unarmored Movement Improvement'], 10: ['Purity of Body'],
    11: ['Monastic Tradition Feature'], 12: ['Ability Score Improvement'],
    13: ['Tongue of Sun and Moon'], 14: ['Diamond Soul'], 15: ['Timeless Body'],
    16: ['Ability Score Improvement'], 17: ['Monastic Tradition Feature'],
    18: ['Empty Body'], 19: ['Ability Score Improvement'], 20: ['Perfect Self'],
  },
  paladin: {
    1: ['Divine Sense', 'Lay on Hands'], 2: ['Fighting Style', 'Spellcasting', 'Divine Smite'],
    3: ['Divine Health', 'Sacred Oath'], 4: ['Ability Score Improvement'], 5: ['Extra Attack'],
    6: ['Aura of Protection'], 7: ['Sacred Oath Feature'],
    8: ['Ability Score Improvement'], 9: [], 10: ['Aura of Courage'],
    11: ['Improved Divine Smite'], 12: ['Ability Score Improvement'], 13: [],
    14: ['Cleansing Touch'], 15: ['Sacred Oath Feature'],
    16: ['Ability Score Improvement'], 17: [], 18: ['Aura Improvements'],
    19: ['Ability Score Improvement'], 20: ['Sacred Oath Feature'],
  },
  ranger: {
    1: ['Favored Enemy', 'Natural Explorer'], 2: ['Fighting Style', 'Spellcasting'],
    3: ['Ranger Archetype', 'Primeval Awareness'], 4: ['Ability Score Improvement'],
    5: ['Extra Attack'], 6: ['Favored Enemy Improvement', 'Natural Explorer Improvement'],
    7: ['Ranger Archetype Feature'], 8: ['Ability Score Improvement', "Land's Stride"],
    9: [], 10: ['Natural Explorer Improvement', 'Hide in Plain Sight'],
    11: ['Ranger Archetype Feature'], 12: ['Ability Score Improvement'], 13: [],
    14: ['Favored Enemy Improvement', 'Vanish'], 15: ['Ranger Archetype Feature'],
    16: ['Ability Score Improvement'], 17: [], 18: ['Feral Senses'],
    19: ['Ability Score Improvement'], 20: ['Foe Slayer'],
  },
  rogue: {
    1: ['Expertise', 'Sneak Attack (1d6)', "Thieves' Cant"], 2: ['Cunning Action'],
    3: ['Roguish Archetype', 'Sneak Attack (2d6)'], 4: ['Ability Score Improvement'],
    5: ['Uncanny Dodge'], 6: ['Expertise'], 7: ['Evasion'],
    8: ['Ability Score Improvement'], 9: ['Sneak Attack (5d6)', 'Roguish Archetype Feature'],
    10: ['Ability Score Improvement'], 11: ['Reliable Talent'],
    12: ['Ability Score Improvement'], 13: ['Sneak Attack (7d6)', 'Roguish Archetype Feature'],
    14: ['Blindsense'], 15: ['Slippery Mind'], 16: ['Ability Score Improvement'],
    17: ['Sneak Attack (10d6)', 'Roguish Archetype Feature'], 18: ['Elusive'],
    19: ['Ability Score Improvement'], 20: ['Stroke of Luck'],
  },
  sorcerer: {
    1: ['Spellcasting', 'Sorcerous Origin'], 2: ['Font of Magic'], 3: ['Metamagic'],
    4: ['Ability Score Improvement'], 5: [], 6: ['Sorcerous Origin Feature'],
    7: [], 8: ['Ability Score Improvement'], 9: [], 10: ['Metamagic'],
    11: [], 12: ['Ability Score Improvement'], 13: [], 14: ['Sorcerous Origin Feature'],
    15: [], 16: ['Ability Score Improvement'], 17: ['Metamagic'],
    18: ['Sorcerous Origin Feature'], 19: ['Ability Score Improvement'],
    20: ['Sorcerous Restoration'],
  },
  warlock: {
    1: ['Otherworldly Patron', 'Pact Magic'], 2: ['Eldritch Invocations'],
    3: ['Pact Boon'], 4: ['Ability Score Improvement'], 5: [],
    6: ['Otherworldly Patron Feature'], 7: [], 8: ['Ability Score Improvement'],
    9: [], 10: ['Otherworldly Patron Feature'],
    11: ['Mystic Arcanum (6th level)'], 12: ['Ability Score Improvement'],
    13: ['Mystic Arcanum (7th level)'], 14: ['Otherworldly Patron Feature'],
    15: ['Mystic Arcanum (8th level)'], 16: ['Ability Score Improvement'],
    17: ['Mystic Arcanum (9th level)'], 18: [], 19: ['Ability Score Improvement'],
    20: ['Eldritch Master'],
  },
  wizard: {
    1: ['Spellcasting', 'Arcane Recovery'], 2: ['Arcane Tradition'], 3: [],
    4: ['Ability Score Improvement'], 5: [], 6: ['Arcane Tradition Feature'],
    7: [], 8: ['Ability Score Improvement'], 9: [], 10: ['Arcane Tradition Feature'],
    11: [], 12: ['Ability Score Improvement'], 13: [], 14: ['Arcane Tradition Feature'],
    15: [], 16: ['Ability Score Improvement'], 17: [], 18: ['Spell Mastery'],
    19: ['Ability Score Improvement'], 20: ['Signature Spell'],
  },
};

// ─── XP / Level Functions ───────────────────────────────────────────────────

/**
 * Calculate character level from total XP.
 * @param {number} xp — total accumulated XP
 * @returns {number} character level (1–20)
 */
function getLevelFromXP(xp) {
  if (typeof xp !== 'number' || xp < 0) return 1;
  for (let lvl = MAX_LEVEL; lvl >= 1; lvl--) {
    if (xp >= XP_TABLE[lvl]) return lvl;
  }
  return 1;
}

/**
 * XP required to reach the next level.
 * @param {number} currentLevel — current character level (1–20)
 * @returns {number} XP threshold for next level, or Infinity at cap
 */
function getXPForNextLevel(currentLevel) {
  if (currentLevel >= MAX_LEVEL) return Infinity;
  return XP_TABLE[currentLevel + 1];
}

/**
 * Progress toward the next level as a percentage (0–100).
 * @param {number} xp — total accumulated XP
 * @param {number} level — current character level
 * @returns {number} percentage progress (floored, 0–100)
 */
function getXPProgress(xp, level) {
  if (level >= MAX_LEVEL) return 100;
  const currentThreshold = XP_TABLE[level];
  const nextThreshold = XP_TABLE[level + 1];
  const range = nextThreshold - currentThreshold;
  if (range <= 0) return 100;
  const progress = ((xp - currentThreshold) / range) * 100;
  return Math.max(0, Math.min(100, Math.floor(progress)));
}

// ─── Proficiency Bonus ──────────────────────────────────────────────────────

/**
 * D&D 5e proficiency bonus for a given level.
 * @param {number} level — character level (1–20)
 * @returns {number} proficiency bonus
 */
function getProficiencyBonus(level) {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, level));
  return PROFICIENCY_TABLE[clamped];
}

// ─── Class Features ─────────────────────────────────────────────────────────

/**
 * Get the class features gained at a specific level.
 * Falls back to the rule-engine/classes data for levels 1–5.
 * @param {string} characterClass — class id (e.g. 'fighter')
 * @param {number} level — the level being gained
 * @returns {string[]} array of feature names (empty if none)
 */
function getLevelFeatures(characterClass, level) {
  const cls = (characterClass || '').toLowerCase();

  // Prefer the extended table (covers 1–20)
  if (CLASS_FEATURES[cls] && CLASS_FEATURES[cls][level]) {
    return [...CLASS_FEATURES[cls][level]];
  }

  // Fall back to rule-engine/classes for levels 1–5
  const classDef = CLASSES[cls];
  if (classDef && classDef.levels && classDef.levels[level]) {
    const features = classDef.levels[level].features;
    if (Array.isArray(features)) return [...features];
  }

  return [];
}

// ─── HP Gain on Level Up ────────────────────────────────────────────────────

/**
 * Calculate HP gained when leveling up.
 * Uses the average (rounded up) per PHB rules: floor(hitDie / 2) + 1.
 * @param {string} characterClass — class id
 * @returns {{ roll: number, average: number, die: number }}
 */
function calculateHitDiceGain(characterClass) {
  const cls = (characterClass || '').toLowerCase();
  const die = HIT_DICE_SIZE[cls] || 8;
  const average = Math.floor(die / 2) + 1;

  let roll;
  try {
    roll = Dice.roll(`1d${die}`).total;
  } catch (_e) {
    roll = Math.floor(Math.random() * die) + 1;
  }

  return { roll, average, die };
}

// ─── Level-Up Processing ────────────────────────────────────────────────────

/**
 * Check whether a character has enough XP to level up.
 * @param {object} character — character object with .xp and .level
 * @returns {{ canLevel: boolean, currentLevel: number, nextLevel: number, xpNeeded: number }}
 */
function checkLevelUp(character) {
  const currentLevel = character.level || 1;
  const xp = character.xp || 0;

  if (currentLevel >= MAX_LEVEL) {
    return { canLevel: false, currentLevel, nextLevel: MAX_LEVEL, xpNeeded: Infinity };
  }

  const nextLevel = currentLevel + 1;
  const xpNeeded = XP_TABLE[nextLevel];

  return { canLevel: xp >= xpNeeded, currentLevel, nextLevel, xpNeeded };
}

/**
 * Extract Constitution modifier from a character's stats.
 * @param {object} character
 * @returns {number}
 */
function getConstitutionModifier(character) {
  if (!character || !character.stats) return 0;
  const con = character.stats.con || character.stats.constitution || 10;
  return Math.floor((con - 10) / 2);
}

/**
 * Process a single level-up on a character. Mutates the character in place.
 * Uses the PHB average HP (not rolled) for consistency; callers can override.
 * @param {object} character — character object (will be mutated)
 * @param {object} [options]
 * @param {boolean} [options.useAverageHP=true] — use average HP gain vs. roll
 * @returns {{ oldLevel: number, newLevel: number, hpGained: number, features: string[], proficiencyBonus: number }}
 */
function processLevelUp(character, options = {}) {
  const { useAverageHP = true } = options;
  const oldLevel = character.level || 1;

  if (oldLevel >= MAX_LEVEL) {
    return {
      oldLevel, newLevel: MAX_LEVEL, hpGained: 0, features: [],
      proficiencyBonus: getProficiencyBonus(MAX_LEVEL),
    };
  }

  const newLevel = oldLevel + 1;
  const cls = (character.class || '').toLowerCase();

  // HP gain
  const hitDice = calculateHitDiceGain(cls);
  const conMod = getConstitutionModifier(character);
  const hpGain = (useAverageHP ? hitDice.average : hitDice.roll) + conMod;
  const finalGain = Math.max(1, hpGain); // minimum 1 HP per level

  // Features
  const features = getLevelFeatures(cls, newLevel);

  // Apply to character
  character.level = newLevel;
  if (character.hp) {
    character.hp.max = (character.hp.max || 0) + finalGain;
    character.hp.current = (character.hp.current || 0) + finalGain;
  }

  if (!character.featuresGained) character.featuresGained = [];
  character.featuresGained.push({ level: newLevel, features, timestamp: Date.now() });

  return {
    oldLevel, newLevel, hpGained: finalGain, features,
    proficiencyBonus: getProficiencyBonus(newLevel),
  };
}

// ─── XP Award Functions ─────────────────────────────────────────────────────

/**
 * Award XP to a single player in a session. Checks for level-up and
 * processes it automatically if the threshold is met.
 * @param {object} session — session object with .players[]
 * @param {string} playerId — id of the player receiving XP
 * @param {number} amount — XP to award (positive integer)
 * @param {string} [reason] — reason for the XP award
 * @returns {{ leveledUp: boolean, newLevel: number, xpGained: number, changes: object|null }}
 */
function awardXP(session, playerId, amount, reason) {
  if (!session || !session.players) {
    return { leveledUp: false, newLevel: 1, xpGained: 0, changes: null };
  }

  const player = session.players.find(p => p.id === playerId);
  if (!player || !player.character) {
    return { leveledUp: false, newLevel: 1, xpGained: 0, changes: null };
  }

  const character = player.character;
  const xpAmount = Math.max(0, Math.floor(amount || 0));

  if (typeof character.xp !== 'number') character.xp = 0;

  const oldLevel = character.level || 1;
  character.xp += xpAmount;

  // Log the XP award
  if (!character.xpLog) character.xpLog = [];
  character.xpLog.push({
    id: uuidv4(), amount: xpAmount, reason: reason || 'adventure',
    timestamp: Date.now(), totalAfter: character.xp,
  });

  // Check for level-up (may gain multiple levels at once)
  let changes = null;
  let leveledUp = false;

  while (character.level < MAX_LEVEL) {
    const check = checkLevelUp(character);
    if (!check.canLevel) break;

    const levelChange = processLevelUp(character);
    if (!changes) {
      changes = levelChange;
    } else {
      changes.newLevel = levelChange.newLevel;
      changes.hpGained += levelChange.hpGained;
      changes.features = changes.features.concat(levelChange.features);
      changes.proficiencyBonus = levelChange.proficiencyBonus;
    }
    leveledUp = true;
  }

  return { leveledUp, newLevel: character.level, xpGained: xpAmount, changes };
}

/**
 * Award XP split evenly among all players in a session.
 * @param {object} session — session object with .players[]
 * @param {number} amount — total XP to distribute
 * @param {string} [reason] — reason for the XP award
 * @returns {{ totalXP: number, perPlayer: number, results: object[] }}
 */
function awardPartyXP(session, amount, reason) {
  if (!session || !session.players || session.players.length === 0) {
    return { totalXP: 0, perPlayer: 0, results: [] };
  }

  const totalXP = Math.max(0, Math.floor(amount || 0));
  const perPlayer = Math.floor(totalXP / session.players.length);
  const remainder = totalXP - (perPlayer * session.players.length);

  const results = session.players.map((player, index) => {
    const bonus = index < remainder ? 1 : 0;
    return awardXP(session, player.id, perPlayer + bonus, reason);
  });

  return { totalXP, perPlayer, results };
}

// ─── Formatting ─────────────────────────────────────────────────────────────

/**
 * Format a level-up announcement message.
 * @param {object} character — the character that leveled up
 * @param {number} oldLevel — previous level
 * @param {number} newLevel — new level
 * @param {object} changes — changes object from processLevelUp
 * @returns {string} formatted announcement
 */
function formatLevelUpMessage(character, oldLevel, newLevel, changes) {
  const name = character.name || 'Unknown Hero';
  const cls = (character.class || 'adventurer').charAt(0).toUpperCase()
    + (character.class || 'adventurer').slice(1);

  const lines = [];
  lines.push(`🎉 **LEVEL UP!** ${name} advances to level ${newLevel}!`);
  lines.push('');
  lines.push(`**Class:** ${cls}`);
  lines.push(`**Level:** ${oldLevel} → ${newLevel}`);

  if (changes) {
    if (changes.hpGained > 0) {
      lines.push(`**HP Gained:** +${changes.hpGained} (now ${character.hp ? character.hp.current : '?'} / ${character.hp ? character.hp.max : '?'})`);
    }

    if (changes.proficiencyBonus) {
      const oldProf = getProficiencyBonus(oldLevel);
      if (changes.proficiencyBonus > oldProf) {
        lines.push(`**Proficiency Bonus:** +${oldProf} → +${changes.proficiencyBonus}`);
      }
    }

    if (changes.features && changes.features.length > 0) {
      lines.push('');
      lines.push('**New Features:**');
      for (const feat of changes.features) {
        lines.push(`  • ${feat}`);
      }
    }
  }

  // ASI reminder at levels 4, 8, 12, 16, 19
  if ([4, 8, 12, 16, 19].includes(newLevel)) {
    lines.push('');
    lines.push('💡 *Remember to apply your Ability Score Improvement!*');
  }

  return lines.join('\n');
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  XP_TABLE,
  MAX_LEVEL,
  getLevelFromXP,
  getXPForNextLevel,
  getXPProgress,
  awardXP,
  awardPartyXP,
  checkLevelUp,
  processLevelUp,
  calculateHitDiceGain,
  getLevelFeatures,
  getProficiencyBonus,
  formatLevelUpMessage,
};

