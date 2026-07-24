/**
 * Story Mode Engine — Manages class-based adventure gameplay.
 *
 * Integrates class-abilities with the scene engine to provide:
 * - Character creation with class selection
 * - HP tracking across scenes
 * - Ability use during encounters (defense, offense, investigation, evasion, social)
 * - Ability recharge at scene transitions
 * - Damage/healing with class-based mitigation
 * - Class-specific encounter bypass (rogue stealth, cleric turn undead, etc.)
 */

const {
  getClass, getClassIds, getClassSummaries,
  rechargeAbilities, useAbility, getAvailableAbilities,
  applyDamage, heal
} = require('../story/class-abilities');

/**
 * Create a new Story Mode character.
 * @param {string} classId - fighter, cleric, mage, or rogue
 * @param {string} name - character name
 * @returns {object|null} character object or null if invalid class
 */
function createCharacter(classId, name) {
  const classData = getClass(classId);
  if (!classData) return null;

  return {
    name: name || 'Adventurer',
    classId,
    className: classData.name,
    hp: classData.startingHp,
    maxHp: classData.maxHp,
    classData,
    scenesCompleted: 0,
    totalDamageTaken: 0,
    totalDamageMitigated: 0,
    totalHealingReceived: 0,
    abilitiesUsed: 0,
    encountersBypassed: 0
  };
}

/**
 * Start a new scene — recharge all abilities.
 * @param {object} character
 * @returns {object} character with recharged abilities
 */
function startScene(character) {
  rechargeAbilities(character);
  character.scenesCompleted++;
  return character;
}

/**
 * Get available actions for the current encounter.
 * Returns ability options the player can choose from.
 * @param {object} character
 * @param {string} encounterType - 'combat', 'investigation', 'social', 'exploration', 'supernatural'
 * @returns {object[]} available abilities with relevance flag
 */
function getEncounterActions(character, encounterType) {
  const available = getAvailableAbilities(character);
  return available.map(ability => ({
    ...ability,
    relevant: isRelevant(ability, encounterType)
  }));
}

/**
 * Check if an ability is relevant to the encounter type.
 */
function isRelevant(ability, encounterType) {
  const relevanceMap = {
    combat: ['defense', 'offense', 'evasion'],
    investigation: ['investigation'],
    social: ['social'],
    exploration: ['investigation', 'evasion'],
    supernatural: ['defense', 'investigation']
  };
  const relevant = relevanceMap[encounterType] || [];
  return relevant.includes(ability.type);
}

/**
 * Use an ability in an encounter.
 * @param {object} character
 * @param {string} abilityId
 * @returns {object} { success, ability, bypass } — bypass=true means skip the encounter
 */
function useEncounterAbility(character, abilityId) {
  const ability = useAbility(character, abilityId);
  if (!ability) {
    return { success: false, ability: null, bypass: false };
  }

  character.abilitiesUsed++;

  // Check for encounter bypass abilities
  const bypassEffects = ['stealth_bypass', 'talk_past_npc', 'bypass_undead'];
  const bypass = bypassEffects.includes(ability.effect);
  if (bypass) {
    character.encountersBypassed++;
  }

  return { success: true, ability, bypass };
}

/**
 * Resolve damage in an encounter, applying any active defense.
 * @param {object} character
 * @param {number} baseDamage
 * @param {string} damageType - 'physical' or 'supernatural'
 * @param {object|null} activeDefense - ability if defense was used
 * @returns {object} damage result from applyDamage
 */
function resolveDamage(character, baseDamage, damageType, activeDefense) {
  const result = applyDamage(character, baseDamage, damageType, activeDefense);
  character.totalDamageTaken += result.actualDamage;
  character.totalDamageMitigated += result.mitigated;
  return result;
}

/**
 * Heal the character (recovery scenes).
 * @param {object} character
 * @param {number} amount
 * @returns {object} heal result
 */
function recoverHealth(character, amount) {
  const result = heal(character, amount);
  character.totalHealingReceived += result.healed;
  return result;
}

/**
 * Get a summary of the character's current state.
 * @param {object} character
 * @returns {object} summary for display
 */
function getCharacterSummary(character) {
  const available = getAvailableAbilities(character);
  return {
    name: character.name,
    className: character.className,
    hp: character.hp,
    maxHp: character.maxHp,
    hpPercent: Math.round((character.hp / character.maxHp) * 100),
    scenesCompleted: character.scenesCompleted,
    abilitiesAvailable: available.length,
    abilitiesTotal: character.classData.abilities.length,
    totalDamageTaken: character.totalDamageTaken,
    totalDamageMitigated: character.totalDamageMitigated,
    totalHealingReceived: character.totalHealingReceived,
    abilitiesUsed: character.abilitiesUsed,
    encountersBypassed: character.encountersBypassed
  };
}

module.exports = {
  createCharacter,
  startScene,
  getEncounterActions,
  useEncounterAbility,
  resolveDamage,
  recoverHealth,
  getCharacterSummary,
  // Re-export for convenience
  getClassIds,
  getClassSummaries
};
