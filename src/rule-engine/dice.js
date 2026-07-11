'use strict';

/**
 * @module rule-engine/dice
 * @description Provably-fair dice roller for D&D 5e.
 * Uses crypto.randomBytes so every roll is independently verifiable.
 *
 * Supported notation:
 *   NdS          — roll N dice of size S           (e.g. 2d6, 1d20)
 *   NdS+M        — add modifier M                  (e.g. 1d20+5)
 *   NdS-M        — subtract modifier M             (e.g. 1d4-1)
 *   NdSdlK       — drop lowest K dice              (e.g. 4d6dl1)
 *   NdSdhK       — drop highest K dice             (e.g. 4d6dh1)
 *   NdSkhK       — keep highest K dice             (e.g. 2d20kh1 for advantage)
 *   NdSklK       — keep lowest K dice              (e.g. 2d20kl1 for disadvantage)
 *   advantage    — alias for 2d20kh1
 *   disadvantage — alias for 2d20kl1
 */

const crypto = require('crypto');

// ─── Valid die sizes ────────────────────────────────────────────────────────
const VALID_DICE = new Set([2, 4, 6, 8, 10, 12, 20, 100]);

// ─── Regex ──────────────────────────────────────────────────────────────────
//  group 1: count (NdS)
//  group 2: sides
//  group 3: keep/drop suffix   (e.g. "dl1", "kh2")
//  group 4: modifier           (e.g. "+3", "-2")
const DICE_RE = /^(\d+)d(\d+)(?:(dl|dh|kh|kl)(\d+))?(?:([+-])(\d+))?$/i;

/**
 * Cryptographic integer in [1, max] inclusive.
 * Uses rejection sampling to avoid modulo bias.
 * @param {number} max — upper bound (die size)
 * @returns {number}
 */
function secureRandomInt(max) {
  if (max <= 0) throw new RangeError('max must be positive');
  // For d100 we need at least 7 bits; for everything else 6 bits suffices.
  const bitsNeeded = Math.ceil(Math.log2(max));
  const bytesNeeded = Math.max(1, Math.ceil(bitsNeeded / 8));
  const cap = 2 ** (bytesNeeded * 8);
  const limit = cap - (cap % max); // rejection threshold

  while (true) {
    const buf = crypto.randomBytes(bytesNeeded);
    let n = 0;
    for (let i = 0; i < bytesNeeded; i++) n = (n << 8) | buf[i];
    if (n < limit) return (n % max) + 1;
    // else reject & re-roll
  }
}

/**
 * Roll a single die of the given size.
 * @param {number} sides
 * @returns {number}
 */
function rollDie(sides) {
  if (!VALID_DICE.has(sides)) {
    throw new RangeError(`Invalid die size d${sides}. Valid: ${[...VALID_DICE].join(', ')}`);
  }
  return secureRandomInt(sides);
}

/**
 * Parse and evaluate a dice expression.
 *
 * @param {string} expr — Dice expression (e.g. '2d6+3', '4d6dl1', 'advantage')
 * @param {object}  [opts]
 * @param {boolean} [opts.advantage]    — roll 2d20, keep highest (overrides expr)
 * @param {boolean} [opts.disadvantage] — roll 2d20, keep lowest  (overrides expr)
 * @param {number}  [opts.extraModifier]— additional flat bonus added on top
 * @returns {DiceResult}
 *
 * @typedef {object} DiceResult
 * @property {number[]}  rolls      — individual die values kept
 * @property {number[]}  dropped    — individual die values dropped
 * @property {number}    modifier   — total flat modifier (expression mod + extra)
 * @property {number}    total      — final sum (sum(kept) + modifier)
 * @property {number|null} natural  — raw d20 value (only for single-d20 rolls, else null)
 * @property {boolean}   isCrit     — true if natural = 20 (d20 only)
 * @property {boolean}   isFumble   — true if natural = 1  (d20 only)
 * @property {string}    expression — canonical expression string
 * @property {string}    breakdown  — human-readable breakdown
 */
function roll(expr, opts = {}) {
  if (typeof expr !== 'string') {
    throw new TypeError('Dice expression must be a string');
  }

  const trimmed = expr.trim().toLowerCase();

  // ── Handle alias strings ──────────────────────────────────────────────
  if (trimmed === 'advantage' || opts.advantage) {
    return roll('2d20kh1', { ...opts, advantage: undefined });
  }
  if (trimmed === 'disadvantage' || opts.disadvantage) {
    return roll('2d20kl1', { ...opts, disadvantage: undefined });
  }

  // ── Parse ─────────────────────────────────────────────────────────────
  const match = trimmed.match(DICE_RE);
  if (!match) {
    throw new SyntaxError(`Cannot parse dice expression: "${expr}"`);
  }

  const count  = parseInt(match[1], 10);
  const sides  = parseInt(match[2], 10);
  const mode   = match[3] || null;  // dl | dh | kh | kl
  const modeN  = match[4] ? parseInt(match[4], 10) : null;
  const sign   = match[5] === '-' ? -1 : 1;
  const modVal = match[6] ? parseInt(match[6], 10) : 0;
  const expressionMod = sign * modVal;
  const extraMod = opts.extraModifier || 0;
  const totalMod = expressionMod + extraMod;

  if (count < 1) throw new RangeError('Dice count must be >= 1');
  if (count > 1000) throw new RangeError('Dice count must be <= 1000');

  // ── Roll all dice ─────────────────────────────────────────────────────
  const allRolls = [];
  for (let i = 0; i < count; i++) allRolls.push(rollDie(sides));

  // ── Apply keep/drop logic ─────────────────────────────────────────────
  let kept;
  const dropped = [];

  if (mode && modeN !== null) {
    // Sort indices by value
    const indexed = allRolls.map((v, i) => ({ v, i }));
    indexed.sort((a, b) => a.v - b.v); // ascending

    let dropIndices;
    if (mode === 'dl') {
      // Drop lowest N
      dropIndices = new Set(indexed.slice(0, modeN).map(x => x.i));
    } else if (mode === 'dh') {
      // Drop highest N
      dropIndices = new Set(indexed.slice(-modeN).map(x => x.i));
    } else if (mode === 'kh') {
      // Keep highest N → drop all except top N
      const keepSet = new Set(indexed.slice(-modeN).map(x => x.i));
      dropIndices = new Set();
      allRolls.forEach((_, i) => { if (!keepSet.has(i)) dropIndices.add(i); });
    } else if (mode === 'kl') {
      // Keep lowest N → drop all except bottom N
      const keepSet = new Set(indexed.slice(0, modeN).map(x => x.i));
      dropIndices = new Set();
      allRolls.forEach((_, i) => { if (!keepSet.has(i)) dropIndices.add(i); });
    } else {
      dropIndices = new Set();
    }

    kept = [];
    allRolls.forEach((v, i) => {
      if (dropIndices.has(i)) dropped.push(v);
      else kept.push(v);
    });
  } else {
    kept = allRolls;
  }

  // ── Compute totals ────────────────────────────────────────────────────
  const keptSum = kept.reduce((a, b) => a + b, 0);
  const total = keptSum + totalMod;

  // ── Determine natural (d20 only, single kept die) ─────────────────────
  const isD20 = (sides === 20);
  const natural = (isD20 && kept.length === 1) ? kept[0] : null;

  // ── Build breakdown string ────────────────────────────────────────────
  const parts = [];
  parts.push(`rolled [${allRolls.join(', ')}]`);
  if (dropped.length > 0) parts.push(`dropped [${dropped.join(', ')}]`);
  if (totalMod !== 0) parts.push(`modifier ${totalMod >= 0 ? '+' : ''}${totalMod}`);
  parts.push(`= ${total}`);

  return {
    rolls: kept,
    dropped,
    modifier: totalMod,
    total,
    natural,
    isCrit: natural === 20,
    isFumble: natural === 1,
    expression: expr,
    breakdown: parts.join('; '),
  };
}

/**
 * Roll multiple dice expressions and return all results.
 * @param {string[]} expressions
 * @param {object}   [opts] — passed to each roll()
 * @returns {DiceResult[]}
 */
function rollMultiple(expressions, opts = {}) {
  return expressions.map(expr => roll(expr, opts));
}

/**
 * Convenience: roll 4d6 drop lowest (standard ability score generation).
 * @returns {DiceResult}
 */
function rollAbilityScore() {
  return roll('4d6dl1');
}

/**
 * Convenience: roll a d20 with optional modifier.
 * @param {number} [modifier=0]
 * @returns {DiceResult}
 */
function rollD20(modifier = 0) {
  const expr = modifier === 0 ? '1d20' : `1d20${modifier >= 0 ? '+' : ''}${modifier}`;
  return roll(expr);
}

/**
 * Roll a d20 with advantage (roll 2, keep highest).
 * @param {number} [modifier=0]
 * @returns {DiceResult}
 */
function rollWithAdvantage(modifier = 0) {
  const expr = modifier === 0 ? '2d20kh1' : `2d20kh1${modifier >= 0 ? '+' : ''}${modifier}`;
  return roll(expr);
}

/**
 * Roll a d20 with disadvantage (roll 2, keep lowest).
 * @param {number} [modifier=0]
 * @returns {DiceResult}
 */
function rollWithDisadvantage(modifier = 0) {
  const expr = modifier === 0 ? '2d20kl1' : `2d20kl1${modifier >= 0 ? '+' : ''}${modifier}`;
  return roll(expr);
}

/**
 * Roll death save (d20, no modifier by default; special crit/fumble rules apply).
 * @returns {DiceResult}
 */
function rollDeathSave() {
  return roll('1d20');
}

module.exports = {
  roll,
  rollMultiple,
  rollDie,
  rollAbilityScore,
  rollD20,
  rollWithAdvantage,
  rollWithDisadvantage,
  rollDeathSave,
  VALID_DICE,
};
