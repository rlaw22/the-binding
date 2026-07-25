/**
 * Class Abilities — 4 classes for Story Mode
 * IIFE-wrapped for browser use. Exposes window.ClassAbilities.
 */
(function() {

/**
 * Class Abilities — 4 classes for Story Mode
 * 
 * Each class has: name, starting HP, description, 2 per-scene recharge abilities
 * 
 * Fighter: tanky, physical damage mitigation
 * Cleric: support, undead detection and turning
 * Mage: arcane, supernatural damage mitigation and investigation
 * Rogue: agile, stealth and social bypass
 */

const CLASSES = {
  fighter: {
    id: 'fighter',
    name: 'Fighter',
    description: 'A seasoned warrior. You face darkness with steel and shield.',
    startingHp: 12,
    maxHp: 12,
    abilities: [
      {
        id: 'shield_block',
        name: 'Shield Block',
        description: 'Raise your shield to absorb incoming damage.',
        type: 'defense',
        effect: 'absorb_damage',
        value: 3, // reduces incoming damage by 3
        used: false,
        flavor: 'You brace yourself behind your shield, steel ringing as the blow connects.'
      },
      {
        id: 'power_strike',
        name: 'Power Strike',
        description: 'A devastating blow that earns bonus coins from a defeated foe.',
        type: 'offense',
        effect: 'bonus_coins',
        value: 5, // earns 5 bonus coins
        used: false,
        flavor: 'You swing with everything you have. The impact reverberates through your arms.'
      }
    ]
  },

  cleric: {
    id: 'cleric',
    name: 'Cleric',
    description: 'A holy servant. Your faith is your weapon against the darkness.',
    startingHp: 10,
    maxHp: 10,
    abilities: [
      {
        id: 'divine_sense',
        name: 'Divine Sense',
        description: 'Reach out with holy awareness to reveal hidden truths.',
        type: 'investigation',
        effect: 'reveal_hidden',
        value: 1, // reveals 1 hidden item or detail
        used: false,
        flavor: 'You close your eyes and whisper a prayer. When you open them, the unseen is revealed.'
      },
      {
        id: 'turn_undead',
        name: 'Turn Undead',
        description: 'Present your holy symbol to repel the undead.',
        type: 'defense',
        effect: 'bypass_undead',
        value: 0, // bypasses vampire/undead encounter entirely
        used: false,
        flavor: 'You thrust your crucifix forward. A burning light erupts, and the creature recoils with a shriek.'
      }
    ]
  },

  mage: {
    id: 'mage',
    name: 'Mage',
    description: 'A scholar of the arcane. Knowledge is your shield against the unknown.',
    startingHp: 8,
    maxHp: 8,
    abilities: [
      {
        id: 'arcane_shield',
        name: 'Arcane Shield',
        description: 'Conjure a ward of arcane energy to absorb supernatural damage.',
        type: 'defense',
        effect: 'absorb_supernatural_damage',
        value: 4, // reduces supernatural damage by 4
        used: false,
        flavor: 'Arcane syllables tumble from your lips. A shimmering barrier materializes before you.'
      },
      {
        id: 'reveal',
        name: 'Reveal',
        description: 'Cast a spell of revelation to uncover magical secrets.',
        type: 'investigation',
        effect: 'magical_investigation',
        value: 1, // reveals 1 magical hidden item or detail
        used: false,
        flavor: 'You trace the sigil of seeing in the air. The mundane world peels back, revealing what lies beneath.'
      }
    ]
  },

  rogue: {
    id: 'rogue',
    name: 'Rogue',
    description: 'A shadow-walker. You survive by cunning, speed, and a silver tongue.',
    startingHp: 9,
    maxHp: 9,
    abilities: [
      {
        id: 'shadow_step',
        name: 'Shadow Step',
        description: 'Melt into the shadows to bypass a dangerous encounter.',
        type: 'evasion',
        effect: 'stealth_bypass',
        value: 0, // bypasses one encounter without damage
        used: false,
        flavor: 'You slip into the darkness between heartbeats. By the time they notice, you are gone.'
      },
      {
        id: 'silver_tongue',
        name: 'Silver Tongue',
        description: 'Talk your way past a hostile NPC or creature.',
        type: 'social',
        effect: 'talk_past_npc',
        value: 0, // bypasses one NPC encounter without damage
        used: false,
        flavor: 'Words are your weapon, and you wield them with lethal precision.'
      }
    ]
  }
};

/**
 * Get a class definition by ID.
 * @param {string} classId - fighter, cleric, mage, or rogue
 * @returns {object|null} Deep copy of the class definition (fresh abilities each time)
 */
function getClass(classId) {
  const cls = CLASSES[classId];
  if (!cls) return null;
  return JSON.parse(JSON.stringify(cls));
}

/**
 * Get all available class IDs.
 * @returns {string[]}
 */
function getClassIds() {
  return Object.keys(CLASSES);
}

/**
 * Get a brief summary of all classes (for class selection screen).
 * @returns {object[]} Array of {id, name, description, hp}
 */
function getClassSummaries() {
  return Object.values(CLASSES).map(cls => ({
    id: cls.id,
    name: cls.name,
    description: cls.description,
    hp: cls.startingHp
  }));
}

/**
 * Reset all abilities for a character (call at start of each scene).
 * @param {object} character - character object with classData
 * @returns {object} updated character
 */
function rechargeAbilities(character) {
  if (!character.classData || !character.classData.abilities) return character;
  for (const ability of character.classData.abilities) {
    ability.used = false;
  }
  return character;
}

/**
 * Use an ability by ID. Returns the ability object if successful, null if already used or not found.
 * @param {object} character - character object with classData
 * @param {string} abilityId - the ability to use
 * @returns {object|null} the ability object with effect details, or null
 */
function useAbility(character, abilityId) {
  if (!character.classData || !character.classData.abilities) return null;
  const ability = character.classData.abilities.find(a => a.id === abilityId);
  if (!ability || ability.used) return null;
  ability.used = true;
  return ability;
}

/**
 * Get available (unused) abilities for a character.
 * @param {object} character - character object with classData
 * @returns {object[]} array of available ability objects
 */
function getAvailableAbilities(character) {
  if (!character.classData || !character.classData.abilities) return [];
  return character.classData.abilities.filter(a => !a.used);
}

/**
 * Apply damage to a character, accounting for any active defense abilities.
 * @param {object} character - character with hp
 * @param {number} baseDamage - incoming damage before mitigation
 * @param {string} damageType - 'physical' or 'supernatural'
 * @param {object} activeDefense - ability object if a defense ability was used this encounter
 * @returns {object} { actualDamage, mitigated, newHp }
 */
function applyDamage(character, baseDamage, damageType, activeDefense) {
  let mitigated = 0;
  
  if (activeDefense) {
    if (activeDefense.effect === 'absorb_damage' && damageType === 'physical') {
      mitigated = Math.min(baseDamage, activeDefense.value);
    } else if (activeDefense.effect === 'absorb_supernatural_damage' && damageType === 'supernatural') {
      mitigated = Math.min(baseDamage, activeDefense.value);
    }
  }

  const actualDamage = Math.max(0, baseDamage - mitigated);
  character.hp = Math.max(0, character.hp - actualDamage);

  return {
    actualDamage,
    mitigated,
    newHp: character.hp,
    unconscious: character.hp <= 0
  };
}

/**
 * Heal a character (for recovery scenes).
 * @param {object} character - character with hp
 * @param {number} amount - HP to restore
 * @returns {object} { healed, newHp }
 */
function heal(character, amount) {
  const before = character.hp;
  character.hp = Math.min(character.classData.maxHp, character.hp + amount);
  return {
    healed: character.hp - before,
    newHp: character.hp
  };
}

module.exports = {
  CLASSES,
  getClass,
  getClassIds,
  getClassSummaries,
  rechargeAbilities,
  useAbility,
  getAvailableAbilities,
  applyDamage,
  heal
};

// Browser global
if (typeof window !== 'undefined') {
  window.ClassAbilities = {
    CLASSES: CLASSES,
    getClass: getClass,
    getClassIds: getClassIds,
    getClassSummaries: getClassSummaries,
    rechargeAbilities: rechargeAbilities,
    useAbility: useAbility,
    getAvailableAbilities: getAvailableAbilities,
    applyDamage: applyDamage,
    heal: heal
  };
}

  var _exports = {
    CLASSES: CLASSES,
    getClass: getClass,
    getClassIds: getClassIds,
    getClassSummaries: getClassSummaries,
    rechargeAbilities: rechargeAbilities,
    useAbility: useAbility,
    getAvailableAbilities: getAvailableAbilities,
    applyDamage: applyDamage,
    heal: heal
  };

  // Browser global
  if (typeof window !== 'undefined') {
    window.ClassAbilities = _exports;
  }
  // Node.js / CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = _exports;
  }

})();
