'use strict';

/**
 * @module rule-engine/classes
 * @description All 12 D&D 5e classes with hit dice, primary stats, saving throw
 * proficiencies, starting equipment, and level-up features through level 5.
 */

// ─── Skill lists by class ───────────────────────────────────────────────────

const CLASS_SKILLS = {
  barbarian: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'],
  bard:      ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth'],
  cleric:    ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
  druid:     ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'],
  fighter:   ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'],
  monk:      ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'],
  paladin:   ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'],
  ranger:    ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'],
  rogue:     ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'],
  sorcerer:  ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'],
  warlock:   ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'],
  wizard:    ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
};

// ─── Spellcasting info by class ─────────────────────────────────────────────

const SPELLCASTING = {
  bard:      { ability: 'cha', ritual: true, focusType: 'instrument', cantripsKnown: { 1: 2, 4: 3 }, spellsKnown: { 1: 4, 2: 5, 3: 6, 4: 7, 5: 8 }, prepared: false },
  cleric:    { ability: 'wis', ritual: true, focusType: 'holy symbol', cantripsKnown: { 1: 3, 4: 4 }, prepared: true },
  druid:     { ability: 'wis', ritual: true, focusType: 'druidcraft focus', cantripsKnown: { 1: 2, 4: 3 }, prepared: true },
  paladin:   { ability: 'cha', ritual: false, focusType: 'holy symbol', cantripsKnown: {}, prepared: true, spellcastingStartsAt: 2 },
  ranger:    { ability: 'wis', ritual: false, focusType: null, cantripsKnown: {}, spellsKnown: { 2: 2, 3: 3, 5: 4 }, prepared: false, spellcastingStartsAt: 2 },
  sorcerer:  { ability: 'cha', ritual: false, focusType: 'arcane focus', cantripsKnown: { 1: 4, 4: 5 }, spellsKnown: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 }, prepared: false },
  warlock:   { ability: 'cha', ritual: false, focusType: 'arcane focus', cantripsKnown: { 1: 2, 4: 3 }, spellsKnown: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 }, prepared: false },
  wizard:    { ability: 'int', ritual: true, focusType: 'arcane focus', cantripsKnown: { 1: 3, 4: 4 }, prepared: true },
};

// ─── Class definitions ──────────────────────────────────────────────────────

/**
 * @typedef {object} ClassDef
 * @property {string} id
 * @property {string} name
 * @property {string} hitDice — e.g. '1d12'
 * @property {number} hitPointsAtFirst
 * @property {number} hitPointsPerLevel — average HP per level after 1st
 * @property {string[]} primaryAbilities
 * @property {string[]} savingThrowProficiencies — two abilities
 * @property {string} armorProficiencies
 * @property {string} weaponProficiencies
 * @property {string} toolProficiencies
 * @property {number} skillChoices
 * @property {string[]} skills
 * @property {object[]} startingEquipment
 * @property {object} levels — features gained at each level 1-5
 * @property {object|null} spellcasting
 */

const CLASSES = Object.freeze({
  barbarian: {
    id: 'barbarian',
    name: 'Barbarian',
    hitDie: 'd12',
    hitDice: '1d12',
    hitPointsAtFirst: 12,
    hitPointsPerLevel: 7,
    primaryAbilities: ['str'],
    savingThrowProficiencies: ['str', 'con'],
    armorProficiencies: 'Light armor, medium armor, shields',
    weaponProficiencies: 'Simple weapons, martial weapons',
    toolProficiencies: 'None',
    skillChoices: 2,
    skills: CLASS_SKILLS.barbarian,
    startingEquipment: [
      { choice: 'A', items: ['A greataxe', 'Any martial melee weapon'] },
      { choice: 'B', items: ['Two handaxes', 'Any simple weapon'] },
      { note: 'An explorer\'s pack and four javelins' },
    ],
    levels: {
      1: { features: ['Rage', 'Unarmored Defense'] },
      2: { features: ['Reckless Attack', 'Danger Sense'] },
      3: { features: ['Primal Path'], rageDamage: 2, rages: 3 },
      4: { features: ['Ability Score Improvement'] },
      5: { features: ['Extra Attack', 'Fast Movement'] },
    },
    rage: { 1: { uses: 2, damage: 2 }, 3: { uses: 3, damage: 2 }, 5: { uses: 4, damage: 2 } },
    spellcasting: null,
  },

  bard: {
    id: 'bard',
    name: 'Bard',
    hitDie: 'd8',
    hitDice: '1d8',
    hitPointsAtFirst: 8,
    hitPointsPerLevel: 5,
    primaryAbilities: ['cha'],
    savingThrowProficiencies: ['dex', 'cha'],
    armorProficiencies: 'Light armor',
    weaponProficiencies: 'Simple weapons, hand crossbows, longswords, rapiers, shortswords',
    toolProficiencies: 'Three musical instruments',
    skillChoices: 3,
    skills: CLASS_SKILLS.bard,
    startingEquipment: [
      { choice: 'A', items: ['A rapier', 'A longsword', 'Any simple weapon'] },
      { choice: 'B', items: ['A diplomat\'s pack', 'An entertainer\'s pack'] },
      { choice: 'C', items: ['A lute', 'Any other musical instrument'] },
      { note: 'Leather armor and a dagger' },
    ],
    levels: {
      1: { features: ['Spellcasting', 'Bardic Inspiration (d6)'] },
      2: { features: ['Jack of All Trades', 'Song of Rest (d6)'] },
      3: { features: ['Bard College', 'Expertise'] },
      4: { features: ['Ability Score Improvement'] },
      5: { features: ['Bardic Inspiration (d8)', 'Font of Inspiration'] },
    },
    spellcasting: SPELLCASTING.bard,
  },

  cleric: {
    id: 'cleric',
    name: 'Cleric',
    hitDie: 'd8',
    hitDice: '1d8',
    hitPointsAtFirst: 8,
    hitPointsPerLevel: 5,
    primaryAbilities: ['wis'],
    savingThrowProficiencies: ['wis', 'cha'],
    armorProficiencies: 'Light armor, medium armor, shields',
    weaponProficiencies: 'Simple weapons',
    toolProficiencies: 'None',
    skillChoices: 2,
    skills: CLASS_SKILLS.cleric,
    startingEquipment: [
      { choice: 'A', items: ['A mace', 'A warhammer (if proficient)'] },
      { choice: 'B', items: ['Scale mail', 'Leather armor', 'Chain mail (if proficient)'] },
      { choice: 'C', items: ['A light crossbow and 20 bolts', 'Any simple weapon'] },
      { note: 'A priest\'s pack or an explorer\'s pack, a shield, and a holy symbol' },
    ],
    levels: {
      1: { features: ['Spellcasting', 'Divine Domain'] },
      2: { features: ['Channel Divinity (1/rest)', 'Divine Domain feature'] },
      3: { features: [] },
      4: { features: ['Ability Score Improvement'] },
      5: { features: ['Destroy Undead (CR 1/2)'] },
    },
    spellcasting: SPELLCASTING.cleric,
  },

  druid: {
    id: 'druid',
    name: 'Druid',
    hitDie: 'd8',
    hitDice: '1d8',
    hitPointsAtFirst: 8,
    hitPointsPerLevel: 5,
    primaryAbilities: ['wis'],
    savingThrowProficiencies: ['int', 'wis'],
    armorProficiencies: 'Light armor, medium armor, shields (no metal)',
    weaponProficiencies: 'Clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears',
    toolProficiencies: 'Herbalism kit',
    skillChoices: 2,
    skills: CLASS_SKILLS.druid,
    startingEquipment: [
      { choice: 'A', items: ['A wooden shield', 'Any simple weapon'] },
      { choice: 'B', items: ['A scimitar', 'Any simple melee weapon'] },
      { note: 'Leather armor, an explorer\'s pack, and a druidic focus' },
    ],
    levels: {
      1: { features: ['Druidic', 'Spellcasting'] },
      2: { features: ['Wild Shape'] },
      3: { features: [] },
      4: { features: ['Wild Shape improvement', 'Ability Score Improvement'] },
      5: { features: [] },
    },
    wildShape: { 2: { uses: 2, maxCR: '1/4', noFlying: true, noSwimming: true }, 4: { uses: 2, maxCR: '1/2', noFlying: true } },
    spellcasting: SPELLCASTING.druid,
  },

  fighter: {
    id: 'fighter',
    name: 'Fighter',
    hitDie: 'd10',
    hitDice: '1d10',
    hitPointsAtFirst: 10,
    hitPointsPerLevel: 6,
    primaryAbilities: ['str', 'dex'],
    savingThrowProficiencies: ['str', 'con'],
    armorProficiencies: 'All armor, shields',
    weaponProficiencies: 'Simple weapons, martial weapons',
    toolProficiencies: 'None',
    skillChoices: 2,
    skills: CLASS_SKILLS.fighter,
    startingEquipment: [
      { choice: 'A', items: ['Chain mail', 'Leather armor, longbow, and 20 arrows'] },
      { choice: 'B', items: ['A martial weapon and a shield', 'Two martial weapons'] },
      { choice: 'C', items: ['A light crossbow and 20 bolts', 'Two handaxes'] },
      { note: 'A dungeoneer\'s pack or an explorer\'s pack' },
    ],
    levels: {
      1: { features: ['Fighting Style', 'Second Wind'] },
      2: { features: ['Action Surge (one use)'] },
      3: { features: ['Martial Archetype'] },
      4: { features: ['Ability Score Improvement'] },
      5: { features: ['Extra Attack'] },
    },
    spellcasting: null,
  },

  monk: {
    id: 'monk',
    name: 'Monk',
    hitDie: 'd8',
    hitDice: '1d8',
    hitPointsAtFirst: 8,
    hitPointsPerLevel: 5,
    primaryAbilities: ['dex', 'wis'],
    savingThrowProficiencies: ['str', 'dex'],
    armorProficiencies: 'None',
    weaponProficiencies: 'Simple weapons, shortswords',
    toolProficiencies: 'One artisan\'s tool or musical instrument',
    skillChoices: 2,
    skills: CLASS_SKILLS.monk,
    startingEquipment: [
      { choice: 'A', items: ['A shortsword', 'Any simple weapon'] },
      { choice: 'B', items: ['A dungeoneer\'s pack', 'An explorer\'s pack'] },
      { note: '10 darts' },
    ],
    levels: {
      1: { features: ['Unarmored Defense', 'Martial Arts (d4)'] },
      2: { features: ['Ki', 'Unarmored Movement (+10 ft.)'] },
      3: { features: ['Monk Tradition', 'Deflect Missiles'] },
      4: { features: ['Ability Score Improvement', 'Slow Fall'] },
      5: { features: ['Extra Attack', 'Stunning Strike'] },
    },
    ki: { 2: { points: 2 }, 3: { points: 3 }, 4: { points: 4 }, 5: { points: 5 } },
    martialArts: { 1: 'd4', 5: 'd6' },
    spellcasting: null,
  },

  paladin: {
    id: 'paladin',
    name: 'Paladin',
    hitDie: 'd10',
    hitDice: '1d10',
    hitPointsAtFirst: 10,
    hitPointsPerLevel: 6,
    primaryAbilities: ['str', 'cha'],
    savingThrowProficiencies: ['wis', 'cha'],
    armorProficiencies: 'All armor, shields',
    weaponProficiencies: 'Simple weapons, martial weapons',
    toolProficiencies: 'None',
    skillChoices: 2,
    skills: CLASS_SKILLS.paladin,
    startingEquipment: [
      { choice: 'A', items: ['A martial weapon and a shield', 'Two martial weapons'] },
      { choice: 'B', items: ['Five javelins', 'Any simple melee weapon'] },
      { note: 'A priest\'s pack or an explorer\'s pack, chain mail, and a holy symbol' },
    ],
    levels: {
      1: { features: ['Divine Sense', 'Lay on Hands'] },
      2: { features: ['Fighting Style', 'Spellcasting', 'Divine Smite'] },
      3: { features: ['Divine Health', 'Sacred Oath'] },
      4: { features: ['Ability Score Improvement'] },
      5: { features: ['Extra Attack'] },
    },
    spellcasting: SPELLCASTING.paladin,
  },

  ranger: {
    id: 'ranger',
    name: 'Ranger',
    hitDie: 'd10',
    hitDice: '1d10',
    hitPointsAtFirst: 10,
    hitPointsPerLevel: 6,
    primaryAbilities: ['dex', 'wis'],
    savingThrowProficiencies: ['str', 'dex'],
    armorProficiencies: 'Light armor, medium armor, shields',
    weaponProficiencies: 'Simple weapons, martial weapons',
    toolProficiencies: 'None',
    skillChoices: 3,
    skills: CLASS_SKILLS.ranger,
    startingEquipment: [
      { choice: 'A', items: ['Scale mail', 'Leather armor'] },
      { choice: 'B', items: ['Two shortswords', 'Two simple melee weapons'] },
      { choice: 'C', items: ['A dungeoneer\'s pack', 'An explorer\'s pack'] },
      { note: 'A longbow and a quiver of 20 arrows' },
    ],
    levels: {
      1: { features: ['Favored Enemy', 'Natural Explorer'] },
      2: { features: ['Fighting Style', 'Spellcasting'] },
      3: { features: ['Ranger Archetype', 'Primeval Awareness'] },
      4: { features: ['Ability Score Improvement'] },
      5: { features: ['Extra Attack'] },
    },
    spellcasting: SPELLCASTING.ranger,
  },

  rogue: {
    id: 'rogue',
    name: 'Rogue',
    hitDie: 'd8',
    hitDice: '1d8',
    hitPointsAtFirst: 8,
    hitPointsPerLevel: 5,
    primaryAbilities: ['dex'],
    savingThrowProficiencies: ['dex', 'int'],
    armorProficiencies: 'Light armor',
    weaponProficiencies: 'Simple weapons, hand crossbows, longswords, rapiers, shortswords',
    toolProficiencies: 'Thieves\' tools',
    skillChoices: 4,
    skills: CLASS_SKILLS.rogue,
    startingEquipment: [
      { choice: 'A', items: ['A rapier', 'A shortsword'] },
      { choice: 'B', items: ['A shortbow and quiver of 20 arrows', 'A shortsword'] },
      { note: 'A burglar\'s pack, an explorer\'s pack, or a dungeoneer\'s pack, leather armor, two daggers, and thieves\' tools' },
    ],
    levels: {
      1: { features: ['Expertise', 'Sneak Attack (1d6)', 'Thieves\' Cant'] },
      2: { features: ['Cunning Action'] },
      3: { features: ['Roguish Archetype', 'Sneak Attack (2d6)'] },
      4: { features: ['Ability Score Improvement'] },
      5: { features: ['Uncanny Dodge', 'Sneak Attack (3d6)'] },
    },
    sneakAttack: { 1: '1d6', 3: '2d6', 5: '3d6' },
    spellcasting: null,
  },

  sorcerer: {
    id: 'sorcerer',
    name: 'Sorcerer',
    hitDie: 'd6',
    hitDice: '1d6',
    hitPointsAtFirst: 6,
    hitPointsPerLevel: 4,
    primaryAbilities: ['cha'],
    savingThrowProficiencies: ['con', 'cha'],
    armorProficiencies: 'None',
    weaponProficiencies: 'Daggers, darts, slings, quarterstaffs, light crossbows',
    toolProficiencies: 'None',
    skillChoices: 2,
    skills: CLASS_SKILLS.sorcerer,
    startingEquipment: [
      { choice: 'A', items: ['A light crossbow and 20 bolts', 'Any simple weapon'] },
      { choice: 'B', items: ['A component pouch', 'An arcane focus'] },
      { note: 'A dungeoneer\'s pack or an explorer\'s pack, two daggers' },
    ],
    levels: {
      1: { features: ['Spellcasting', 'Sorcerous Origin'] },
      2: { features: ['Font of Magic'] },
      3: { features: ['Metamagic'] },
      4: { features: ['Ability Score Improvement'] },
      5: { features: [] },
    },
    sorceryPoints: { 2: 2, 3: 3, 4: 4, 5: 5 },
    spellcasting: SPELLCASTING.sorcerer,
  },

  warlock: {
    id: 'warlock',
    name: 'Warlock',
    hitDie: 'd8',
    hitDice: '1d8',
    hitPointsAtFirst: 8,
    hitPointsPerLevel: 5,
    primaryAbilities: ['cha'],
    savingThrowProficiencies: ['wis', 'cha'],
    armorProficiencies: 'Light armor',
    weaponProficiencies: 'Simple weapons',
    toolProficiencies: 'None',
    skillChoices: 2,
    skills: CLASS_SKILLS.warlock,
    startingEquipment: [
      { choice: 'A', items: ['A light crossbow and 20 bolts', 'Any simple weapon'] },
      { choice: 'B', items: ['A component pouch', 'An arcane focus'] },
      { note: 'A scholar\'s pack or a dungeoneer\'s pack, leather armor, any simple weapon, and two daggers' },
    ],
    levels: {
      1: { features: ['Otherworldly Patron', 'Pact Magic'] },
      2: { features: ['Eldritch Invocations'] },
      3: { features: ['Pact Boon'] },
      4: { features: ['Ability Score Improvement'] },
      5: { features: [] },
    },
    spellcasting: SPELLCASTING.warlock,
  },

  wizard: {
    id: 'wizard',
    name: 'Wizard',
    hitDie: 'd6',
    hitDice: '1d6',
    hitPointsAtFirst: 6,
    hitPointsPerLevel: 4,
    primaryAbilities: ['int'],
    savingThrowProficiencies: ['int', 'wis'],
    armorProficiencies: 'None',
    weaponProficiencies: 'Daggers, darts, slings, quarterstaffs, light crossbows',
    toolProficiencies: 'None',
    skillChoices: 2,
    skills: CLASS_SKILLS.wizard,
    startingEquipment: [
      { choice: 'A', items: ['A quarterstaff', 'A dagger'] },
      { choice: 'B', items: ['A component pouch', 'An arcane focus'] },
      { note: 'A scholar\'s pack or an explorer\'s pack, and a spellbook' },
    ],
    levels: {
      1: { features: ['Spellcasting', 'Arcane Recovery'] },
      2: { features: ['Arcane Tradition'] },
      3: { features: [] },
      4: { features: ['Ability Score Improvement'] },
      5: { features: [] },
    },
    spellcasting: SPELLCASTING.wizard,
  },
});

// ─── Lookup helpers ─────────────────────────────────────────────────────────

/**
 * Get a class definition by id.
 * @param {string} id — class key (e.g. 'barbarian')
 * @returns {object|null}
 */
function getClass(id) {
  return CLASSES[id] || null;
}

/**
 * Get all class ids.
 * @returns {string[]}
 */
function listClasses() {
  return Object.keys(CLASSES);
}

/**
 * Get features gained at a specific level for a class.
 * @param {string} classId
 * @param {number} level
 * @returns {string[]}
 */
function featuresAtLevel(classId, level) {
  const cls = CLASSES[classId];
  if (!cls) throw new Error(`Unknown class: ${classId}`);
  const lvl = cls.levels[level];
  return lvl ? lvl.features : [];
}

/**
 * Get all features accumulated from level 1 through the given level.
 * @param {string} classId
 * @param {number} level
 * @returns {string[]}
 */
function featuresUpToLevel(classId, level) {
  const features = [];
  for (let l = 1; l <= level; l++) {
    features.push(...featuresAtLevel(classId, l));
  }
  return features;
}

/**
 * Get hit points for a class at a given level (using average).
 * @param {string} classId
 * @param {number} level
 * @param {number} conMod — Constitution modifier
 * @returns {number}
 */
function hitPointsAtLevel(classId, level, conMod) {
  const cls = CLASSES[classId];
  if (!cls) throw new Error(`Unknown class: ${classId}`);
  if (level < 1 || level > 20) throw new RangeError('Level must be 1-20');
  // Level 1: max hit die + CON mod
  // Levels 2+: average hit die + CON mod per level
  return cls.hitPointsAtFirst + (cls.hitPointsPerLevel + conMod) * (level - 1);
}

/**
 * Calculate spell slots available at a given level for a full caster.
 * Returns null if the class doesn't have standard spellcasting at that level.
 * @param {string} classId
 * @param {number} level
 * @returns {object|null} — { 1: slots, 2: slots, ... }
 */
function spellSlotsAtLevel(classId, level) {
  const cls = CLASSES[classId];
  if (!cls || !cls.spellcasting) return null;
  if (cls.spellcasting.spellcastingStartsAt && level < cls.spellcasting.spellcastingStartsAt) return null;

  // Full caster slots (bard, cleric, druid, sorcerer, wizard)
  const fullCasterSlots = {
    1: { 1: 2 },
    2: { 1: 3 },
    3: { 1: 4, 2: 2 },
    4: { 1: 4, 2: 3 },
    5: { 1: 4, 3: 2, 2: 3 },
  };

  // Half caster slots (paladin, ranger) — starts at level 2
  const halfCasterSlots = {
    2: { 1: 2 },
    3: { 1: 3 },
    4: { 1: 3 },
    5: { 1: 4, 2: 2 },
  };

  const isHalfCaster = ['paladin', 'ranger'].includes(classId);
  const table = isHalfCaster ? halfCasterSlots : fullCasterSlots;
  return table[level] || null;
}

module.exports = {
  CLASSES,
  CLASS_SKILLS,
  SPELLCASTING,
  getClass,
  listClasses,
  featuresAtLevel,
  featuresUpToLevel,
  hitPointsAtLevel,
  spellSlotsAtLevel,
};
