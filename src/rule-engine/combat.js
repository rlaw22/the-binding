'use strict';

/**
 * @module rule-engine/combat
 * @description Full D&D 5e combat resolution: initiative, attack rolls,
 * damage, saving throws, skill checks, death saves.
 * All deterministic math — no LLM involvement in calculations.
 *
 * Supports advantage/disadvantage and a Story Mode that produces
 * player-friendly narrative output instead of raw numbers.
 */

const { roll, rollD20, rollWithAdvantage, rollWithDisadvantage, rollDeathSave } = require('./dice');
const { abilityModifier, proficiencyBonus: profBonusFn } = require('./stats');

// ─── Advantage / Disadvantage enum ──────────────────────────────────────────

/**
 * @enum {string}
 */
const AdvantageState = Object.freeze({
  NORMAL:       'normal',
  ADVANTAGE:    'advantage',
  DISADVANTAGE: 'disadvantage',
});

// ─── Core d20 roll with context ─────────────────────────────────────────────

/**
 * Roll a d20 with an additive modifier, respecting advantage/disadvantage.
 *
 * @param {number} modifier   — total bonus to add (proficiency + ability + misc)
 * @param {string} [advantageState='normal'] — one of AdvantageState values
 * @returns {D20Result}
 *
 * @typedef {object} D20Result
 * @property {number}  total     — final result
 * @property {number}  natural   — raw d20 value used
 * @property {number}  modifier  — modifier applied
 * @property {boolean} isCrit    — natural 20
 * @property {boolean} isFumble  — natural 1
 * @property {number[]} allRolls — all d20s rolled (2 if adv/disadv)
 * @property {string}  advantage — advantage state used
 * @property {string}  breakdown
 */
function d20Check(modifier, advantageState = AdvantageState.NORMAL) {
  let result;
  switch (advantageState) {
    case AdvantageState.ADVANTAGE:
      result = rollWithAdvantage(modifier);
      break;
    case AdvantageState.DISADVANTAGE:
      result = rollWithDisadvantage(modifier);
      break;
    default:
      result = rollD20(modifier);
      break;
  }

  // Reconstruct allRolls for advantage/disadvantage
  let allRolls = result.rolls;
  if (result.dropped.length > 0) {
    allRolls = [...result.rolls, ...result.dropped];
  }

  return {
    total: result.total,
    natural: result.natural,
    modifier,
    isCrit: result.isCrit,
    isFumble: result.isFumble,
    allRolls,
    advantage: advantageState,
    breakdown: result.breakdown,
  };
}

// ─── Initiative ─────────────────────────────────────────────────────────────

/**
 * Roll initiative for a character or NPC.
 *
 * @param {object} params
 * @param {number} params.dexMod   — Dexterity modifier
 * @param {number} [params.miscBonus=0] — any additional bonus (e.g. Alert feat, Jack of All Trades)
 * @param {string} [params.advantage='normal']
 * @returns {D20Result}
 */
function rollInitiative({ dexMod, miscBonus = 0, advantage = AdvantageState.NORMAL }) {
  return d20Check(dexMod + miscBonus, advantage);
}

/**
 * Roll initiative for an entire combat, sorting participants by result.
 *
 * @param {Array<{ id: string, name: string, dexMod: number, miscBonus?: number, advantage?: string }>} participants
 * @returns {Array<{ id: string, name: string, initiative: number, roll: D20Result }>}
 */
function rollInitiativeAll(participants) {
  return participants
    .map(p => ({
      id: p.id,
      name: p.name,
      initiative: rollInitiative({
        dexMod: p.dexMod,
        miscBonus: p.miscBonus || 0,
        advantage: p.advantage || AdvantageState.NORMAL,
      }),
    }))
    .map(p => ({ ...p, initiative: p.initiative.total }))
    .sort((a, b) => b.initiative - a.initiative || Math.random() - 0.5);
}

// ─── Attack rolls ───────────────────────────────────────────────────────────

/**
 * @typedef {object} AttackRollParams
 * @property {number} attackBonus   — total attack bonus (ability mod + proficiency + magic bonus)
 * @property {number} targetAC      — target's Armor Class
 * @property {string} [advantage='normal']
 * @property {number} [critThreshold=20]  — natural roll that counts as crit (e.g. 19 for Champion)
 */

/**
 * @typedef {object} AttackResult
 * @property {boolean} hit
 * @property {boolean} criticalHit
 * @property {boolean} criticalMiss
 * @property {number}  attackRoll   — total attack roll
 * @property {number}  naturalRoll  — raw d20
 * @property {number}  attackBonus
 * @property {number}  targetAC
 * @property {string}  breakdown
 */

/**
 * Make an attack roll against a target AC.
 *
 * @param {AttackRollParams} params
 * @returns {AttackResult}
 */
function makeAttackRoll({ attackBonus, targetAC, advantage = AdvantageState.NORMAL, critThreshold = 20 }) {
  const rollResult = d20Check(attackBonus, advantage);

  const criticalHit = rollResult.natural >= critThreshold;
  const criticalMiss = rollResult.isFumble;

  // Natural 20 always hits, natural 1 always misses
  let hit;
  if (criticalHit) hit = true;
  else if (criticalMiss) hit = false;
  else hit = rollResult.total >= targetAC;

  return {
    hit,
    criticalHit,
    criticalMiss,
    attackRoll: rollResult.total,
    naturalRoll: rollResult.natural,
    attackBonus,
    targetAC,
    breakdown: `d20(${rollResult.natural}) + ${attackBonus} = ${rollResult.total} vs AC ${targetAC}` +
      (criticalHit ? ' [CRITICAL HIT!]' : criticalMiss ? ' [CRITICAL MISS!]' : hit ? ' [HIT]' : ' [MISS]'),
  };
}

// ─── Damage rolls ───────────────────────────────────────────────────────────

/**
 * @typedef {object} DamageRollParams
 * @property {string} diceExpression — e.g. '1d8+3', '2d6'
 * @property {boolean} [critical=false] — on crit, double dice (not modifier)
 * @property {string} [damageType='slashing']
 */

/**
 * @typedef {object} DamageResult
 * @property {number}  total
 * @property {number}  baseDiceTotal
 * @property {number}  modifier
 * @property {number}  critDiceTotal
 * @property {string}  damageType
 * @property {string}  breakdown
 * @property {object}  baseRoll    — DiceResult
 * @property {object}  [critRoll]  — DiceResult (if critical)
 */

/**
 * Roll damage for an attack.
 *
 * @param {DamageRollParams} params
 * @returns {DamageResult}
 */
function rollDamage({ diceExpression, critical = false, damageType = 'slashing' }) {
  const baseRoll = roll(diceExpression);
  let critDiceTotal = 0;
  let critRoll = null;

  if (critical) {
    // Extract just the dice part (without modifier) and roll again
    const diceOnly = diceExpression.replace(/([+-]\d+)\s*$/, '');
    critRoll = roll(diceOnly);
    critDiceTotal = critRoll.total;
  }

  const total = baseRoll.total + critDiceTotal;

  return {
    total,
    baseDiceTotal: baseRoll.total - baseRoll.modifier,
    modifier: baseRoll.modifier,
    critDiceTotal,
    damageType,
    breakdown: critical
      ? `${diceExpression} (base) = ${baseRoll.total} + ${diceOnly(diceExpression)} (crit) = ${critRoll.total} → ${total} ${damageType}`
      : `${diceExpression} = ${baseRoll.total} ${damageType}`,
    baseRoll,
    critRoll,
  };
}

/** Extract dice-only portion of an expression. */
function diceOnly(expr) {
  return expr.replace(/([+-]\d+)\s*$/, '');
}

// ─── Saving throws ──────────────────────────────────────────────────────────

/**
 * @typedef {object} SaveParams
 * @property {number} saveBonus      — ability mod + (proficiency if applicable)
 * @property {number} dc             — Difficulty Class to beat
 * @property {string} [ability='dex'] — ability name (for display)
 * @property {string} [advantage='normal']
 * @property {string} [description]  — what the save is against
 */

/**
 * @typedef {object} SaveResult
 * @property {boolean} success
 * @property {boolean} criticalSuccess — natural 20
 * @property {boolean} criticalFailure — natural 1
 * @property {number}  roll
 * @property {number}  dc
 * @property {number}  margin        — positive = beat DC by, negative = failed by
 * @property {string}  breakdown
 */

/**
 * Make a saving throw against a DC.
 *
 * @param {SaveParams} params
 * @returns {SaveResult}
 */
function makeSavingThrow({ saveBonus, dc, ability = 'dex', advantage = AdvantageState.NORMAL, description = '' }) {
  const result = d20Check(saveBonus, advantage);

  // Natural 20 always succeeds on saves; natural 1 always fails
  let success;
  if (result.isCrit) success = true;
  else if (result.isFumble) success = false;
  else success = result.total >= dc;

  const margin = result.total - dc;
  const desc = description ? ` vs ${description}` : '';

  return {
    success,
    criticalSuccess: result.isCrit,
    criticalFailure: result.isFumble,
    roll: result.total,
    natural: result.natural,
    dc,
    margin,
    ability,
    breakdown: `${ability.toUpperCase()} save: d20(${result.natural}) + ${saveBonus} = ${result.total} vs DC ${dc}${desc} → ${success ? 'SUCCESS' : 'FAILURE'}`,
  };
}

// ─── Skill checks ───────────────────────────────────────────────────────────

/**
 * @typedef {object} SkillCheckParams
 * @property {number} skillBonus        — ability mod + proficiency (if proficient)
 * @property {number} dc                — Difficulty Class
 * @property {string} [skill='General'] — skill name
 * @property {string} [ability]         — governing ability
 * @property {string} [advantage='normal']
 * @property {string} [description]     — what the check is for
 * @property {number} [passiveScore]    — if set and passive score >= DC, auto-succeed
 */

/**
 * Make an ability/skill check.
 *
 * @param {SkillCheckParams} params
 * @returns {SkillCheckResult}
 *
 * @typedef {object} SkillCheckResult
 * @property {boolean} success
 * @property {boolean} passiveUsed
 * @property {number}  roll
 * @property {number}  dc
 * @property {number}  margin
 * @property {string}  breakdown
 */
function makeSkillCheck({ skillBonus, dc, skill = 'General', ability = '', advantage = AdvantageState.NORMAL, description = '', passiveScore }) {
  // Passive check shortcut: if passive >= DC, auto-succeed without rolling
  if (passiveScore != null && passiveScore >= dc && advantage === AdvantageState.NORMAL) {
    return {
      success: true,
      passiveUsed: true,
      roll: passiveScore,
      natural: null,
      dc,
      margin: passiveScore - dc,
      skill,
      ability,
      breakdown: `Passive ${skill} (${passiveScore}) >= DC ${dc} → SUCCESS (passive)`,
    };
  }

  const result = d20Check(skillBonus, advantage);
  const success = result.total >= dc;
  const margin = result.total - dc;
  const desc = description ? ` (${description})` : '';

  return {
    success,
    passiveUsed: false,
    roll: result.total,
    natural: result.natural,
    dc,
    margin,
    skill,
    ability,
    breakdown: `${skill} check${desc}: d20(${result.natural}) + ${skillBonus} = ${result.total} vs DC ${dc} → ${success ? 'SUCCESS' : 'FAILURE'}`,
  };
}

// ─── Contested checks ───────────────────────────────────────────────────────

/**
 * Resolve a contested check (e.g. grapple: Athletics vs Athletics/Acrobatics).
 *
 * @param {{ bonus: number, advantage?: string }} attacker
 * @param {{ bonus: number, advantage?: string }} defender
 * @returns {{ winner: 'attacker'|'defender'|'tie', attackerRoll: D20Result, defenderRoll: D20Result, breakdown: string }}
 */
function contestedCheck(attacker, defender) {
  const atk = d20Check(attacker.bonus, attacker.advantage || AdvantageState.NORMAL);
  const def = d20Check(defender.bonus, defender.advantage || AdvantageState.NORMAL);

  let winner;
  if (atk.total > def.total) winner = 'attacker';
  else if (def.total > atk.total) winner = 'defender';
  else winner = 'tie';

  return {
    winner,
    attackerRoll: atk,
    defenderRoll: def,
    breakdown: `Contested: attacker rolled ${atk.total} vs defender ${def.total} → ${winner === 'tie' ? 'TIE (attacker wins ties by default)' : winner.toUpperCase()} wins`,
  };
}

// ─── Death saving throws ────────────────────────────────────────────────────

/**
 * @typedef {object} DeathSaveResult
 * @property {'success'|'failure'|'crit'|'nat1'} outcome
 * @property {number} natural
 * @property {boolean} stabilized
 * @property {string} breakdown
 */

/**
 * Roll a death saving throw.
 *
 * @returns {DeathSaveResult}
 */
function makeDeathSave() {
  const result = rollDeathSave();
  let outcome;
  let stabilized = false;

  if (result.isCrit) {
    outcome = 'crit';
    stabilized = true; // Natural 20 on death save = regain 1 HP
  } else if (result.isFumble) {
    outcome = 'nat1'; // Counts as 2 failures
  } else if (result.total >= 10) {
    outcome = 'success';
  } else {
    outcome = 'failure';
  }

  return {
    outcome,
    natural: result.natural,
    total: result.total,
    stabilized,
    breakdown: `Death save: d20(${result.natural}) → ${
      outcome === 'crit' ? 'NATURAL 20! You regain 1 HP!' :
      outcome === 'nat1' ? 'NATURAL 1! Counts as 2 failures!' :
      outcome === 'success' ? 'Success.' :
      'Failure.'
    }`,
  };
}

// ─── Story Mode wrappers ────────────────────────────────────────────────────

/**
 * Format an attack result for Story Mode — narrative, player-friendly.
 *
 * @param {AttackResult} attackResult
 * @param {DamageResult} [damageResult] — provided only on hit
 * @returns {string}
 */
function storyModeAttack(attackResult, damageResult) {
  if (attackResult.criticalMiss) {
    return 'You fumble! Your attack goes wide.';
  }
  if (attackResult.criticalHit) {
    const dmg = damageResult ? damageResult.total : '?';
    const type = damageResult ? damageResult.damageType : 'damage';
    return `Critical hit! You strike with devastating precision for ${dmg} ${type}!`;
  }
  if (attackResult.hit) {
    const dmg = damageResult ? damageResult.total : '?';
    const type = damageResult ? damageResult.damageType : 'damage';
    return `You hit! ${dmg} ${type}.`;
  }
  return 'You miss.';
}

/**
 * Format a saving throw result for Story Mode.
 *
 * @param {SaveResult} saveResult
 * @returns {string}
 */
function storyModeSave(saveResult) {
  if (saveResult.criticalSuccess) return `You shrug off the effect with a burst of will!`;
  if (saveResult.criticalFailure) return `You fail badly — the effect takes hold.`;
  if (saveResult.success) return `You resist the effect.`;
  return `You fail to resist.`;
}

/**
 * Format a skill check result for Story Mode.
 *
 * @param {SkillCheckResult} checkResult
 * @returns {string}
 */
function storyModeSkillCheck(checkResult) {
  if (checkResult.passiveUsed) return `You notice it without even trying.`;
  if (checkResult.success) {
    if (checkResult.margin >= 5) return `You succeed impressively.`;
    return `You manage it.`;
  }
  if (checkResult.margin <= -5) return `You fail badly.`;
  return `You don't quite manage it.`;
}

/**
 * Format a death save result for Story Mode.
 *
 * @param {DeathSaveResult} deathSaveResult
 * @returns {string}
 */
function storyModeDeathSave(deathSaveResult) {
  switch (deathSaveResult.outcome) {
    case 'crit':   return 'Against all odds, you surge back to consciousness!';
    case 'nat1':   return 'Things take a dire turn...';
    case 'success': return 'You hold on. Still in the fight — barely.';
    case 'failure': return 'You slip further toward the brink...';
    default:        return 'The outcome is unclear.';
  }
}

module.exports = {
  AdvantageState,
  d20Check,
  rollInitiative,
  rollInitiativeAll,
  makeAttackRoll,
  rollDamage,
  makeSavingThrow,
  makeSkillCheck,
  contestedCheck,
  makeDeathSave,
  storyModeAttack,
  storyModeSave,
  storyModeSkillCheck,
  storyModeDeathSave,
};
