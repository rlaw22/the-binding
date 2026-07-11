'use strict';

/**
 * @module rule-engine
 * @description Central export for The Binding's D&D 5e deterministic rule engine.
 *
 * This module handles ALL game math — dice rolling, ability scores, combat,
 * character sheets, class/race data.  No LLM involvement in calculations.
 *
 * Usage:
 *   const engine = require('./rule-engine');
 *   const char = engine.createCharacter({ name: 'Aria', race: 'elf', subrace: 'high', classId: 'wizard', stats: { str:8, dex:15, con:14, int:15, wis:10, cha:12 } });
 *   const attack = engine.makeAttackRoll({ attackBonus: 5, targetAC: 13 });
 *   const story = engine.storyMode.attack(attack);
 */

// ─── Import all sub-modules ─────────────────────────────────────────────────

const dice = require('./dice');
const stats = require('./stats');
const races = require('./races');
const classes = require('./classes');
const characterSheet = require('./character-sheet');
const combat = require('./combat');

// ─── Story Mode ─────────────────────────────────────────────────────────────

/**
 * Story Mode wrapper — provides simplified, narrative-friendly outputs
 * for all rule engine operations. Hides raw math from players.
 */
const storyMode = Object.freeze({
  /**
   * Convert ability scores to Story Mode descriptors.
   * @param {object} scores — { str, dex, con, int, wis, cha }
   * @returns {{ descriptors: object, summary: string }}
   */
  abilities(scores) {
    const { descriptors, modifiers } = stats.toStoryMode(scores);
    return {
      descriptors,
      modifiers, // still available for internal use
      summary: stats.storyModeSummary(scores),
    };
  },

  /**
   * Format an attack roll + optional damage for player-facing output.
   * @param {object} attackResult — from combat.makeAttackRoll()
   * @param {object} [damageResult] — from combat.rollDamage()
   * @returns {string}
   */
  attack(attackResult, damageResult) {
    return combat.storyModeAttack(attackResult, damageResult);
  },

  /**
   * Format a saving throw for player-facing output.
   * @param {object} saveResult — from combat.makeSavingThrow()
   * @returns {string}
   */
  save(saveResult) {
    return combat.storyModeSave(saveResult);
  },

  /**
   * Format a skill check for player-facing output.
   * @param {object} checkResult — from combat.makeSkillCheck()
   * @returns {string}
   */
  skillCheck(checkResult) {
    return combat.storyModeSkillCheck(checkResult);
  },

  /**
   * Format a death save for player-facing output.
   * @param {object} deathSaveResult — from combat.makeDeathSave()
   * @returns {string}
   */
  deathSave(deathSaveResult) {
    return combat.storyModeDeathSave(deathSaveResult);
  },

  /**
   * Format damage result for player-facing output.
   * @param {object} damageResult — from combat.rollDamage()
   * @returns {string}
   */
  damage(damageResult) {
    return `${damageResult.total} ${damageResult.damageType} damage.`;
  },

  /**
   * Format initiative results for player-facing output.
   * @param {Array} initiativeOrder — from combat.rollInitiativeAll()
   * @returns {string[]}
   */
  initiative(initiativeOrder) {
    return initiativeOrder.map((entry, i) =>
      `${i + 1}. ${entry.name}`
    );
  },
});

// ─── Convenience: Full attack sequence ──────────────────────────────────────

/**
 * Execute a complete attack sequence: roll to hit, then roll damage on hit.
 * Returns both raw data and Story Mode text.
 *
 * @param {object} params
 * @param {number} params.attackBonus
 * @param {number} params.targetAC
 * @param {string} params.damageDice    — e.g. '1d8+3'
 * @param {string} [params.damageType='slashing']
 * @param {string} [params.advantage='normal']
 * @param {number} [params.critThreshold=20]
 * @returns {{ attack: object, damage: object|null, storyText: string }}
 */
function resolveAttack(params) {
  const {
    attackBonus,
    targetAC,
    damageDice,
    damageType = 'slashing',
    advantage = combat.AdvantageState.NORMAL,
    critThreshold = 20,
  } = params;

  const attack = combat.makeAttackRoll({
    attackBonus,
    targetAC,
    advantage,
    critThreshold,
  });

  let damage = null;
  if (attack.hit) {
    damage = combat.rollDamage({
      diceExpression: damageDice,
      critical: attack.criticalHit,
      damageType,
    });
  }

  return {
    attack,
    damage,
    storyText: storyMode.attack(attack, damage),
  };
}

// ─── Convenience: Full skill check with character ───────────────────────────

/**
 * Make a skill check using a character's stored skill bonus.
 *
 * @param {object} character
 * @param {string} skillName — e.g. 'perception', 'stealth'
 * @param {number} dc
 * @param {object} [opts]
 * @param {string} [opts.advantage='normal']
 * @param {string} [opts.description]
 * @returns {object} — SkillCheckResult
 */
function characterSkillCheck(character, skillName, dc, opts = {}) {
  const skill = character.skills?.[skillName.toLowerCase()];
  const bonus = skill ? skill.bonus : (character.modifiers?.dex || 0);
  const passive = skillName.toLowerCase() === 'perception'
    ? characterSheet.getPassivePerception(character)
    : undefined;

  return combat.makeSkillCheck({
    skillBonus: bonus,
    dc,
    skill: skill?.name || skillName,
    ability: skill?.ability || '',
    advantage: opts.advantage || combat.AdvantageState.NORMAL,
    description: opts.description || '',
    passiveScore: passive,
  });
}

// ─── Convenience: Full saving throw with character ──────────────────────────

/**
 * Make a saving throw using a character's stored save bonus.
 *
 * @param {object} character
 * @param {string} ability — 'str', 'dex', 'con', 'int', 'wis', 'cha'
 * @param {number} dc
 * @param {object} [opts]
 * @param {string} [opts.advantage='normal']
 * @param {string} [opts.description]
 * @returns {object} — SaveResult
 */
function characterSavingThrow(character, ability, dc, opts = {}) {
  const saveData = character.savingThrows?.[ability];
  const bonus = saveData ? saveData.bonus : (character.modifiers?.[ability] || 0);

  return combat.makeSavingThrow({
    saveBonus: bonus,
    dc,
    ability,
    advantage: opts.advantage || combat.AdvantageState.NORMAL,
    description: opts.description || '',
  });
}

// ─── Module exports ─────────────────────────────────────────────────────────

module.exports = {
  // ── Dice ──
  roll:                   dice.roll,
  rollDie:                dice.rollDie,
  rollD20:                dice.rollD20,
  rollMultiple:           dice.rollMultiple,
  rollAbilityScore:       dice.rollAbilityScore,
  rollWithAdvantage:      dice.rollWithAdvantage,
  rollWithDisadvantage:   dice.rollWithDisadvantage,
  VALID_DICE:             dice.VALID_DICE,

  // ── Stats ──
  ABILITIES:              stats.ABILITIES,
  ABILITY_NAMES:          stats.ABILITY_NAMES,
  STANDARD_ARRAY:         stats.STANDARD_ARRAY,
  XP_TABLE:               stats.XP_TABLE,
  abilityModifier:        stats.abilityModifier,
  allModifiers:           stats.allModifiers,
  validatePointBuy:       stats.validatePointBuy,
  pointBuyRemaining:      stats.pointBuyRemaining,
  standardArray:          stats.standardArray,
  rollAbilityScores:      stats.rollAbilityScores,
  rollAndAssign:          stats.rollAndAssign,
  applyRacialBonuses:     stats.applyRacialBonuses,
  proficiencyBonus:       stats.proficiencyBonus,
  toStoryMode:            stats.toStoryMode,
  storyModeSummary:       stats.storyModeSummary,
  xpForNextLevel:         stats.xpForNextLevel,
  levelFromXP:            stats.levelFromXP,

  // ── Races ──
  RACES:                  races.RACES,
  DRAGON_ANCESTRIES:      races.DRAGON_ANCESTRIES,
  getRace:                races.getRace,
  getRaceWithSubrace:     races.getRaceWithSubrace,
  listRaces:              races.listRaces,
  listSubraces:           races.listSubraces,

  // ── Classes ──
  CLASSES:                classes.CLASSES,
  CLASS_SKILLS:           classes.CLASS_SKILLS,
  SPELLCASTING:           classes.SPELLCASTING,
  getClass:               classes.getClass,
  listClasses:            classes.listClasses,
  featuresAtLevel:        classes.featuresAtLevel,
  featuresUpToLevel:      classes.featuresUpToLevel,
  hitPointsAtLevel:       classes.hitPointsAtLevel,
  spellSlotsAtLevel:      classes.spellSlotsAtLevel,

  // ── Character Sheet ──
  SKILLS:                 characterSheet.SKILLS,
  SAVING_THROWS:          characterSheet.SAVING_THROWS,
  CONDITIONS:             characterSheet.CONDITIONS,
  createCharacter:        characterSheet.createCharacter,
  levelUp:                characterSheet.levelUp,
  applyDamage:            characterSheet.applyDamage,
  applyHealing:           characterSheet.applyHealing,
  setTempHp:              characterSheet.setTempHp,
  addCondition:           characterSheet.addCondition,
  removeCondition:        characterSheet.removeCondition,
  hasCondition:           characterSheet.hasCondition,
  exhaustionLevel:        characterSheet.exhaustionLevel,
  getPassivePerception:   characterSheet.getPassivePerception,
  getInitiative:          characterSheet.getInitiative,
  recalculateAC:          characterSheet.recalculateAC,
  addItem:                characterSheet.addItem,
  removeItem:             characterSheet.removeItem,
  resetDeathSaves:        characterSheet.resetDeathSaves,
  recordDeathSave:        characterSheet.recordDeathSave,
  awardXP:                characterSheet.awardXP,
  serialize:              characterSheet.serialize,
  deserialize:            characterSheet.deserialize,

  // ── Combat ──
  AdvantageState:         combat.AdvantageState,
  d20Check:               combat.d20Check,
  rollInitiative:         combat.rollInitiative,
  rollInitiativeAll:      combat.rollInitiativeAll,
  makeAttackRoll:         combat.makeAttackRoll,
  rollDamage:             combat.rollDamage,
  makeSavingThrow:        combat.makeSavingThrow,
  makeSkillCheck:         combat.makeSkillCheck,
  contestedCheck:         combat.contestedCheck,
  makeDeathSave:          combat.makeDeathSave,
  storyModeAttack:        combat.storyModeAttack,
  storyModeSave:          combat.storyModeSave,
  storyModeSkillCheck:    combat.storyModeSkillCheck,
  storyModeDeathSave:     combat.storyModeDeathSave,

  // ── Convenience wrappers ──
  resolveAttack,
  characterSkillCheck,
  characterSavingThrow,

  // ── Story Mode (the friendly wrapper) ──
  storyMode,
};
