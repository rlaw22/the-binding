'use strict';

/**
 * @module rule-engine/stats
 * @description Ability score generation, modifiers, and related utilities for D&D 5e.
 *
 * Supports two play modes:
 *  - **Standard Mode**: full 5e rules, players see all numbers.
 *  - **Story Mode**: simplified — auto-select optimal modifiers, hide raw scores
 *    from the player-facing output and return narrative-friendly descriptors.
 */

const { roll, rollAbilityScore } = require('./dice');

// ─── Ability names (canonical order) ────────────────────────────────────────
const ABILITIES = Object.freeze(['str', 'dex', 'con', 'int', 'wis', 'cha']);

/** Full display names keyed by abbreviation. */
const ABILITY_NAMES = Object.freeze({
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
});

// ─── Standard Array ─────────────────────────────────────────────────────────
const STANDARD_ARRAY = Object.freeze([15, 14, 13, 12, 10, 8]);

// ─── Point-Buy tables ───────────────────────────────────────────────────────
/** Cost of each score in the point-buy system (scores 8-15). */
const POINT_BUY_COST = Object.freeze({
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
});

const POINT_BUY_MIN = 8;
const POINT_BUY_MAX = 15;
const POINT_BUY_BUDGET = 27;

// ─── Modifier calculation ───────────────────────────────────────────────────

/**
 * Calculate the D&D 5e ability modifier for a given score.
 * Formula: Math.floor((score - 10) / 2)
 *
 * @param {number} score — raw ability score (1–30)
 * @returns {number} modifier (can be negative)
 */
function abilityModifier(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    throw new TypeError('Ability score must be a finite number');
  }
  return Math.floor((score - 10) / 2);
}

/**
 * Return a descriptive tier for a modifier (used in Story Mode).
 * @param {number} mod
 * @returns {string}
 */
function modifierDescriptor(mod) {
  if (mod >= 5) return 'extraordinary';
  if (mod >= 3) return 'excellent';
  if (mod >= 1) return 'good';
  if (mod === 0) return 'average';
  if (mod >= -2) return 'poor';
  return 'terrible';
}

/**
 * Calculate all six ability modifiers from a scores object.
 *
 * @param {AbilityScores} scores — { str, dex, con, int, wis, cha }
 * @returns {AbilityModifiers}
 *
 * @typedef {object} AbilityScores
 * @property {number} str
 * @property {number} dex
 * @property {number} con
 * @property {number} int
 * @property {number} wis
 * @property {number} cha
 *
 * @typedef {object} AbilityModifiers
 * @property {number} str
 * @property {number} dex
 * @property {number} con
 * @property {number} int
 * @property {number} wis
 * @property {number} cha
 */
function allModifiers(scores) {
  const mods = {};
  for (const ability of ABILITIES) {
    mods[ability] = abilityModifier(scores[ability]);
  }
  return mods;
}

// ─── Point Buy ──────────────────────────────────────────────────────────────

/**
 * Validate a set of scores against the point-buy rules.
 *
 * @param {AbilityScores} scores
 * @returns {{ valid: boolean, cost: number, errors: string[] }}
 */
function validatePointBuy(scores) {
  const errors = [];
  let cost = 0;

  for (const ability of ABILITIES) {
    const val = scores[ability];
    if (val === undefined || val === null) {
      errors.push(`Missing score for ${ABILITY_NAMES[ability]}`);
      continue;
    }
    if (!Number.isInteger(val)) {
      errors.push(`${ABILITY_NAMES[ability]} must be an integer (got ${val})`);
      continue;
    }
    if (val < POINT_BUY_MIN || val > POINT_BUY_MAX) {
      errors.push(`${ABILITY_NAMES[ability]} must be between ${POINT_BUY_MIN} and ${POINT_BUY_MAX} (got ${val})`);
      continue;
    }
    cost += POINT_BUY_COST[val];
  }

  if (cost > POINT_BUY_BUDGET) {
    errors.push(`Total cost ${cost} exceeds budget of ${POINT_BUY_BUDGET}`);
  }

  return { valid: errors.length === 0, cost, errors };
}

/**
 * Return the maximum remaining budget for a given ability when the others are
 * at their minimum. Useful for UI sliders.
 *
 * @param {AbilityScores} currentScores
 * @returns {{ remaining: number, maxFor: object }}
 */
function pointBuyRemaining(currentScores) {
  let spent = 0;
  for (const ability of ABILITIES) {
    const v = currentScores[ability];
    if (v != null && POINT_BUY_COST[v] !== undefined) {
      spent += POINT_BUY_COST[v];
    }
  }
  const remaining = POINT_BUY_BUDGET - spent;

  // For each ability, how high can it go with the remaining budget + what it already costs?
  const maxFor = {};
  for (const ability of ABILITIES) {
    const currentCost = POINT_BUY_COST[currentScores[ability]] || 0;
    const budgetWithCurrent = remaining + currentCost;
    let max = POINT_BUY_MIN;
    for (let s = POINT_BUY_MAX; s >= POINT_BUY_MIN; s--) {
      if (POINT_BUY_COST[s] <= budgetWithCurrent) { max = s; break; }
    }
    maxFor[ability] = max;
  }

  return { remaining, maxFor };
}

// ─── Standard Array assignment ──────────────────────────────────────────────

/**
 * Assign the standard array [15, 14, 13, 12, 10, 8] to abilities.
 *
 * @param {object} assignment — map of ability → index in STANDARD_ARRAY
 *   e.g. { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }
 * @returns {AbilityScores}
 */
function standardArray(assignment) {
  const vals = Object.values(assignment);
  const sorted = [...vals].sort((a, b) => a - b);
  const arr = [...STANDARD_ARRAY].sort((a, b) => a - b);
  if (sorted.length !== 6) throw new Error('Must assign all 6 abilities');
  for (let i = 0; i < 6; i++) {
    if (sorted[i] !== arr[i]) {
      throw new Error(
        `Assignment must use exactly the standard array [${STANDARD_ARRAY.join(', ')}]. ` +
        `Got [${sorted.join(', ')}].`
      );
    }
  }
  const scores = {};
  for (const ability of ABILITIES) {
    scores[ability] = assignment[ability];
  }
  return scores;
}

// ─── Random rolling (4d6 drop lowest) ──────────────────────────────────────

/**
 * Roll ability scores using 4d6 drop lowest for each of the 6 abilities.
 * Returns raw rolls (NOT assigned to abilities yet — that's a player choice).
 *
 * @returns {{ scores: number[], rolls: object[] }}
 */
function rollAbilityScores() {
  const scores = [];
  const allRolls = [];
  for (let i = 0; i < 6; i++) {
    const result = rollAbilityScore();
    scores.push(result.total);
    allRolls.push(result);
  }
  scores.sort((a, b) => b - a); // highest first convention
  return { scores, rolls: allRolls };
}

/**
 * Roll ability scores and assign them to abilities in the order given.
 *
 * @param {string[]} [order] — array of 6 ability abbreviations.
 *   Defaults to ['str','dex','con','int','wis','cha'].
 * @returns {{ scores: AbilityScores, raw: number[], diceRolls: object[] }}
 */
function rollAndAssign(order = ABILITIES) {
  const { scores: raw, rolls: diceRolls } = rollAbilityScores();
  const scores = {};
  for (let i = 0; i < 6; i++) {
    scores[order[i]] = raw[i];
  }
  return { scores, raw, diceRolls };
}

// ─── Racial bonuses ─────────────────────────────────────────────────────────

/**
 * Apply racial ability score bonuses to base scores.
 *
 * @param {AbilityScores} baseScores
 * @param {AbilityScores} racialBonuses — e.g. { str: 2, con: 1 }
 * @returns {AbilityScores} — new scores with bonuses applied
 */
function applyRacialBonuses(baseScores, racialBonuses) {
  const result = {};
  for (const ability of ABILITIES) {
    result[ability] = (baseScores[ability] || 0) + (racialBonuses[ability] || 0);
  }
  return result;
}

// ─── Proficiency bonus by level ─────────────────────────────────────────────

/**
 * Calculate the proficiency bonus for a given character level.
 *
 * @param {number} level — character level (1–20)
 * @returns {number}
 */
function proficiencyBonus(level) {
  if (level < 1 || level > 20) throw new RangeError('Level must be 1-20');
  return Math.ceil(level / 4) + 1;
}

// ─── Story Mode helpers ─────────────────────────────────────────────────────

/**
 * Convert a set of scores to Story Mode output — raw scores hidden,
 * modifiers replaced with narrative descriptors.
 *
 * @param {AbilityScores} scores
 * @returns {object} { modifiers, descriptors }
 */
function toStoryMode(scores) {
  const mods = allModifiers(scores);
  const descriptors = {};
  for (const ability of ABILITIES) {
    descriptors[ability] = modifierDescriptor(mods[ability]);
  }
  return { modifiers: mods, descriptors };
}

/**
 * Build a Story Mode summary string for a set of ability scores.
 *
 * @param {AbilityScores} scores
 * @returns {string} e.g. "You are extraordinarily strong, with excellent
 *   agility and solid endurance. Your intellect is average, your perception
 *   sharp, and your presence average."
 */
function storyModeSummary(scores) {
  const { descriptors } = toStoryMode(scores);
  return [
    `Strength: ${descriptors.str}`,
    `Dexterity: ${descriptors.dex}`,
    `Constitution: ${descriptors.con}`,
    `Intelligence: ${descriptors.int}`,
    `Wisdom: ${descriptors.wis}`,
    `Charisma: ${descriptors.cha}`,
  ].join(', ') + '.';
}

// ─── XP thresholds ──────────────────────────────────────────────────────────

/** XP required to reach each level (index = level, value = cumulative XP). */
const XP_TABLE = Object.freeze([
  0,      // level 1
  300,    // level 2
  900,    // level 3
  2700,   // level 4
  6500,   // level 5
  14000,  // level 6
  23000,  // level 7
  34000,  // level 8
  48000,  // level 9
  64000,  // level 10
  85000,  // level 11
  100000, // level 12
  120000, // level 13
  140000, // level 14
  165000, // level 15
  195000, // level 16
  225000, // level 17
  265000, // level 18
  305000, // level 19
  355000, // level 20
]);

/**
 * Get the XP needed for the next level.
 * @param {number} currentLevel
 * @returns {number|null} null if already level 20
 */
function xpForNextLevel(currentLevel) {
  if (currentLevel >= 20) return null;
  return XP_TABLE[currentLevel]; // XP_TABLE[level] = XP needed to REACH that level
}

/**
 * Determine what level a given XP total corresponds to.
 * @param {number} xp
 * @returns {number} level (1–20)
 */
function levelFromXP(xp) {
  for (let lvl = XP_TABLE.length - 1; lvl >= 0; lvl--) {
    if (xp >= XP_TABLE[lvl]) return lvl + 1;
  }
  return 1;
}

module.exports = {
  ABILITIES,
  ABILITY_NAMES,
  STANDARD_ARRAY,
  POINT_BUY_COST,
  POINT_BUY_MIN,
  POINT_BUY_MAX,
  POINT_BUY_BUDGET,
  XP_TABLE,
  abilityModifier,
  modifierDescriptor,
  allModifiers,
  validatePointBuy,
  pointBuyRemaining,
  standardArray,
  rollAbilityScores,
  rollAndAssign,
  applyRacialBonuses,
  proficiencyBonus,
  toStoryMode,
  storyModeSummary,
  xpForNextLevel,
  levelFromXP,
};
