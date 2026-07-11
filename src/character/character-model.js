'use strict';

/**
 * Character Model & Validation for The Binding
 * Full D&D 5e character sheet with Story Mode sanitization.
 */

// ── Constants ────────────────────────────────────────────────────────────────

const VALID_RACES = [
  'human', 'elf', 'dwarf', 'halfling', 'gnome',
  'half-elf', 'half-orc', 'tiefling', 'dragonborn',
];

const VALID_SUBRACES = {
  elf: ['high-elf', 'wood-elf', 'dark-elf'],
  dwarf: ['hill-dwarf', 'mountain-dwarf'],
  halfling: ['lightfoot', 'stout'],
  gnome: ['forest-gnome', 'rock-gnome'],
  dragonborn: ['black', 'blue', 'brass', 'bronze', 'copper', 'gold', 'green', 'red', 'silver', 'white'],
  'half-elf': [],
  'half-orc': [],
  tiefling: [],
  human: [],
};

const VALID_CLASSES = [
  'barbarian', 'bard', 'cleric', 'druid', 'fighter',
  'monk', 'paladin', 'ranger', 'rogue', 'sorcerer',
  'warlock', 'wizard',
];

const VALID_ALIGNMENTS = [
  'lawful-good', 'neutral-good', 'chaotic-good',
  'lawful-neutral', 'true-neutral', 'chaotic-neutral',
  'lawful-evil', 'neutral-evil', 'chaotic-evil',
];

const VALID_ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const VALID_SKILLS = [
  'acrobatics', 'animal-handling', 'arcana', 'athletics',
  'deception', 'history', 'insight', 'intimidation',
  'investigation', 'medicine', 'nature', 'perception',
  'performance', 'persuasion', 'religion', 'sleight-of-hand',
  'stealth', 'survival',
];

const SKILL_ABILITY_MAP = {
  acrobatics: 'dex', 'animal-handling': 'wis', arcana: 'int',
  athletics: 'str', deception: 'cha', history: 'int', insight: 'wis',
  intimidation: 'cha', investigation: 'int', medicine: 'wis',
  nature: 'int', perception: 'wis', performance: 'cha',
  persuasion: 'cha', religion: 'int', 'sleight-of-hand': 'dex',
  stealth: 'dex', survival: 'wis',
};

const XP_TABLE = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

// ── Stat Label Maps (Story Mode) ─────────────────────────────────────────────

const STAT_TIER_LABELS = [
  { min: 1,  max: 3,  label: 'Feeble' },
  { min: 4,  max: 5,  label: 'Weak' },
  { min: 6,  max: 8,  label: 'Below Average' },
  { min: 9,  max: 10, label: 'Average' },
  { min: 11, max: 12, label: 'Above Average' },
  { min: 13, max: 14, label: 'Strong' },
  { min: 15, max: 16, label: 'Very Strong' },
  { min: 17, max: 18, label: 'Exceptional' },
  { min: 19, max: 20, label: 'Legendary' },
];

const ABILITY_FRIENDLY = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

const SKILL_FRIENDLY = {
  acrobatics: 'Acrobatics', 'animal-handling': 'Animal Handling',
  arcana: 'Arcana', athletics: 'Athletics', deception: 'Deception',
  history: 'History', insight: 'Insight', intimidation: 'Intimidation',
  investigation: 'Investigation', medicine: 'Medicine', nature: 'Nature',
  perception: 'Perception', performance: 'Performance',
  persuasion: 'Persuasion', religion: 'Religion',
  'sleight-of-hand': 'Sleight of Hand', stealth: 'Stealth',
  survival: 'Survival',
};

// ── Race Defaults ────────────────────────────────────────────────────────────

const RACE_DEFAULTS = {
  human:    { speed: 30, languages: ['common'], statBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 } },
  elf:      { speed: 30, languages: ['common', 'elvish'], statBonuses: { dex: 2 } },
  dwarf:    { speed: 25, languages: ['common', 'dwarvish'], statBonuses: { con: 2 } },
  halfling: { speed: 25, languages: ['common', 'halfling'], statBonuses: { dex: 2 } },
  gnome:    { speed: 25, languages: ['common', 'gnomish'], statBonuses: { int: 2 } },
  'half-elf':  { speed: 30, languages: ['common', 'elvish'], statBonuses: { cha: 2 } },
  'half-orc':  { speed: 30, languages: ['common', 'orc'], statBonuses: { str: 2, con: 1 } },
  tiefling:    { speed: 30, languages: ['common', 'infernal'], statBonuses: { cha: 2, int: 1 } },
  dragonborn:  { speed: 30, languages: ['common', 'draconic'], statBonuses: { str: 2, cha: 1 } },
};

const SUBRACE_DEFAULTS = {
  'high-elf':    { statBonuses: { int: 1 } },
  'wood-elf':    { statBonuses: { wis: 1 }, speed: 35 },
  'dark-elf':    { statBonuses: { cha: 1 } },
  'hill-dwarf':  { statBonuses: { wis: 1 } },
  'mountain-dwarf': { statBonuses: { str: 2 } },
  lightfoot:     { statBonuses: { cha: 1 } },
  stout:         { statBonuses: { con: 1 } },
  'forest-gnome': { statBonuses: { dex: 1 } },
  'rock-gnome':  { statBonuses: { con: 1 } },
};

// ── Class Defaults ───────────────────────────────────────────────────────────

const CLASS_DEFAULTS = {
  barbarian:  { hitDie: 12, primaryStat: 'str', savingThrows: ['str', 'con'], armorProficiencies: ['light-armor', 'medium-armor', 'shields'], weaponProficiencies: ['simple-weapons', 'martial-weapons'] },
  bard:       { hitDie: 8,  primaryStat: 'cha', savingThrows: ['dex', 'cha'], armorProficiencies: ['light-armor'], weaponProficiencies: ['simple-weapons', 'hand-crossbows', 'longswords', 'rapiers', 'shortswords'] },
  cleric:     { hitDie: 8,  primaryStat: 'wis', savingThrows: ['wis', 'cha'], armorProficiencies: ['light-armor', 'medium-armor', 'shields'], weaponProficiencies: ['simple-weapons'] },
  druid:      { hitDie: 8,  primaryStat: 'wis', savingThrows: ['int', 'wis'], armorProficiencies: ['light-armor', 'medium-armor', 'shields'], weaponProficiencies: ['clubs', 'daggers', 'darts', 'javelins', 'maces', 'quarterstaffs', 'scimitars', 'sickles', 'slings', 'spears'] },
  fighter:    { hitDie: 10, primaryStat: 'str', savingThrows: ['str', 'con'], armorProficiencies: ['all-armor', 'shields'], weaponProficiencies: ['simple-weapons', 'martial-weapons'] },
  monk:       { hitDie: 8,  primaryStat: 'dex', savingThrows: ['str', 'dex'], armorProficiencies: [], weaponProficiencies: ['simple-weapons', 'shortswords'] },
  paladin:    { hitDie: 10, primaryStat: 'str', savingThrows: ['wis', 'cha'], armorProficiencies: ['all-armor', 'shields'], weaponProficiencies: ['simple-weapons', 'martial-weapons'] },
  ranger:     { hitDie: 10, primaryStat: 'dex', savingThrows: ['str', 'dex'], armorProficiencies: ['light-armor', 'medium-armor', 'shields'], weaponProficiencies: ['simple-weapons', 'martial-weapons'] },
  rogue:      { hitDie: 8,  primaryStat: 'dex', savingThrows: ['dex', 'int'], armorProficiencies: ['light-armor'], weaponProficiencies: ['simple-weapons', 'hand-crossbows', 'longswords', 'rapiers', 'shortswords'] },
  sorcerer:   { hitDie: 6,  primaryStat: 'cha', savingThrows: ['con', 'cha'], armorProficiencies: [], weaponProficiencies: ['daggers', 'darts', 'slings', 'quarterstaffs', 'light-crossbows'] },
  warlock:    { hitDie: 8,  primaryStat: 'cha', savingThrows: ['wis', 'cha'], armorProficiencies: ['light-armor'], weaponProficiencies: ['simple-weapons'] },
  wizard:     { hitDie: 6,  primaryStat: 'int', savingThrows: ['int', 'wis'], armorProficiencies: [], weaponProficiencies: ['daggers', 'darts', 'slings', 'quarterstaffs', 'light-crossbows'] },
};

const SPELLCASTING_CLASSES = ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function modifier(score) {
  return Math.floor((score - 10) / 2);
}

function proficiencyBonus(level) {
  return Math.ceil(level / 4) + 1;
}

function xpForLevel(level) {
  if (level < 1 || level > 20) return Infinity;
  return XP_TABLE[level - 1] || 0;
}

function levelForXP(xp) {
  for (let lvl = 20; lvl >= 1; lvl--) {
    if (xp >= XP_TABLE[lvl - 1]) return lvl;
  }
  return 1;
}

function statTierLabel(value) {
  for (const tier of STAT_TIER_LABELS) {
    if (value >= tier.min && value <= tier.max) return tier.label;
  }
  return 'Unknown';
}

// ── Character Factory ────────────────────────────────────────────────────────

function createCharacterTemplate(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: null,
    userId: null,
    name: '',
    race: 'human',
    subrace: null,
    characterClass: 'fighter',
    subclass: null,
    level: 1,
    xp: 0,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: {},
    skills: {},
    hp: 0,
    maxHp: 0,
    tempHp: 0,
    ac: 10,
    speed: 30,
    proficiencyBonus: 2,
    hitDice: { total: 1, remaining: 1, die: 'd10' },
    deathSaves: { successes: 0, failures: 0 },
    inventory: [],
    equipment: {
      armor: null,
      shield: null,
      mainHand: null,
      offHand: null,
      accessories: [],
    },
    spells: { known: [], slots: {}, prepared: [] },
    features: [],
    conditions: [],
    languages: ['common'],
    backstory: '',
    portrait: { url: '', style: '' },
    alignment: 'true-neutral',
    createdAt: now,
    lastPlayedAt: now,
    sessionId: null,
    ...overrides,
  };
}

// ── Validation ───────────────────────────────────────────────────────────────

class ValidationError extends Error {
  constructor(field, message) {
    super(`[${field}] ${message}`);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate a character object. Returns { valid: boolean, errors: string[] }.
 * This does NOT throw — collect all errors for display.
 */
function validateCharacter(char) {
  const errors = [];

  if (!char || typeof char !== 'object') {
    return { valid: false, errors: ['Character must be an object'] };
  }

  // Required fields
  if (!char.id || typeof char.id !== 'string') errors.push('id must be a non-empty string');
  if (!char.userId || typeof char.userId !== 'string') errors.push('userId must be a non-empty string');
  if (!char.name || typeof char.name !== 'string') errors.push('name must be a non-empty string');
  if (char.name && char.name.length > 64) errors.push('name must be 64 characters or fewer');

  // Race
  if (!VALID_RACES.includes(char.race)) errors.push(`race must be one of: ${VALID_RACES.join(', ')}`);
  if (char.subrace) {
    const validSub = VALID_SUBRACES[char.race];
    if (!validSub || !validSub.includes(char.subrace)) {
      errors.push(`subrace "${char.subrace}" is not valid for race "${char.race}"`);
    }
  }

  // Class
  if (!VALID_CLASSES.includes(char.characterClass)) errors.push(`characterClass must be one of: ${VALID_CLASSES.join(', ')}`);

  // Level & XP
  if (typeof char.level !== 'number' || char.level < 1 || char.level > 20) errors.push('level must be 1–20');
  if (typeof char.xp !== 'number' || char.xp < 0) errors.push('xp must be a non-negative number');

  // Stats
  if (!char.stats || typeof char.stats !== 'object') errors.push('stats must be an object');
  else {
    for (const ab of VALID_ABILITIES) {
      if (typeof char.stats[ab] !== 'number') errors.push(`stats.${ab} must be a number`);
      else if (char.stats[ab] < 1 || char.stats[ab] > 30) errors.push(`stats.${ab} must be 1–30`);
    }
  }

  // HP
  if (typeof char.hp !== 'number') errors.push('hp must be a number');
  if (typeof char.maxHp !== 'number' || char.maxHp < 1) errors.push('maxHp must be a positive number');
  if (char.hp > char.maxHp) errors.push('hp cannot exceed maxHp');
  if (typeof char.tempHp !== 'number' || char.tempHp < 0) errors.push('tempHp must be non-negative');

  // AC
  if (typeof char.ac !== 'number' || char.ac < 1) errors.push('ac must be a positive number');

  // Speed
  if (typeof char.speed !== 'number' || char.speed < 0) errors.push('speed must be non-negative');

  // Proficiency bonus
  if (typeof char.proficiencyBonus !== 'number') errors.push('proficiencyBonus must be a number');

  // Hit dice
  if (!char.hitDice || typeof char.hitDice !== 'object') errors.push('hitDice must be an object');
  else {
    if (typeof char.hitDice.total !== 'number' || char.hitDice.total < 1) errors.push('hitDice.total must be a positive number');
    if (typeof char.hitDice.remaining !== 'number') errors.push('hitDice.remaining must be a number');
    if (!char.hitDice.die || typeof char.hitDice.die !== 'string') errors.push('hitDice.die must be a string');
  }

  // Death saves
  if (!char.deathSaves || typeof char.deathSaves !== 'object') errors.push('deathSaves must be an object');
  else {
    if (typeof char.deathSaves.successes !== 'number' || char.deathSaves.successes < 0 || char.deathSaves.successes > 3) errors.push('deathSaves.successes must be 0–3');
    if (typeof char.deathSaves.failures !== 'number' || char.deathSaves.failures < 0 || char.deathSaves.failures > 3) errors.push('deathSaves.failures must be 0–3');
  }

  // Inventory (array of items)
  if (!Array.isArray(char.inventory)) errors.push('inventory must be an array');

  // Equipment
  if (!char.equipment || typeof char.equipment !== 'object') errors.push('equipment must be an object');

  // Spells
  if (!char.spells || typeof char.spells !== 'object') errors.push('spells must be an object');
  else {
    if (!Array.isArray(char.spells.known)) errors.push('spells.known must be an array');
    if (!Array.isArray(char.spells.prepared)) errors.push('spells.prepared must be an array');
  }

  // Alignment
  if (char.alignment && !VALID_ALIGNMENTS.includes(char.alignment)) errors.push(`alignment must be one of: ${VALID_ALIGNMENTS.join(', ')}`);

  // Dates
  if (char.createdAt && isNaN(Date.parse(char.createdAt))) errors.push('createdAt must be a valid ISO date');
  if (char.lastPlayedAt && isNaN(Date.parse(char.lastPlayedAt))) errors.push('lastPlayedAt must be a valid ISO date');

  return { valid: errors.length === 0, errors };
}

/**
 * Assert validity — throws ValidationError on first issue.
 */
function assertValid(char) {
  const result = validateCharacter(char);
  if (!result.valid) {
    throw new ValidationError('character', result.errors.join('; '));
  }
  return true;
}

// ── Story Mode Sanitization ──────────────────────────────────────────────────

/**
 * sanitizeForPlayer — Story Mode version of the character sheet.
 * Hides raw numbers, replaces them with evocative labels.
 * The AI DM uses this when presenting character info to the player.
 */
function sanitizeForPlayer(char) {
  const { stats, hp, maxHp, tempHp, ac, speed, proficiencyBonus, level, hitDice, ...rest } = char;

  const safeStats = {};
  for (const [key, value] of Object.entries(stats || {})) {
    const friendlyName = ABILITY_FRIENDLY[key] || key;
    const tier = statTierLabel(value);
    const mod = modifier(value);
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    safeStats[friendlyName] = { tier, feeling: modStr, raw: undefined }; // raw stripped below
  }

  // HP described in words
  const hpRatio = maxHp > 0 ? hp / maxHp : 0;
  let hpFeeling;
  if (hpRatio >= 1) hpFeeling = 'Unharmed';
  else if (hpRatio >= 0.75) hpFeeling = 'Barely Scratched';
  else if (hpRatio >= 0.5) hpFeeling = 'Wounded';
  else if (hpRatio >= 0.25) hpFeeling = 'Badly Hurt';
  else if (hpRatio > 0) hpFeeling = 'Near Death';
  else hpFeeling = 'Unconscious';

  // AC described
  let acFeeling;
  if (ac >= 20) acFeeling = 'Like a Walking Fortress';
  else if (ac >= 17) acFeeling = 'Well-Protected';
  else if (ac >= 14) acFeeling = 'Decently Armored';
  else if (ac >= 11) acFeeling = 'Lightly Protected';
  else acFeeling = 'Vulnerable';

  // Speed described
  let speedFeeling;
  if (speed >= 40) speedFeeling = 'Lightning Fast';
  else if (speed >= 30) speedFeeling = 'Swift';
  else if (speed >= 25) speedFeeling = 'Steady';
  else speedFeeling = 'Slow';

  return {
    ...rest,
    name: char.name,
    level,
    race: char.race,
    subrace: char.subrace,
    class: char.characterClass,
    subclass: char.subrace,
    stats: safeStats,
    condition: hpFeeling,
    protection: acFeeling,
    movement: speedFeeling,
    tempHp: tempHp > 0 ? 'Has temporary protection' : 'No temporary protection',
    hitDice: hitDice ? `${hitDice.remaining} of ${hitDice.total} remaining` : 'Unknown',
  };
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Constants
  VALID_RACES,
  VALID_SUBRACES,
  VALID_CLASSES,
  VALID_ALIGNMENTS,
  VALID_ABILITIES,
  VALID_SKILLS,
  SKILL_ABILITY_MAP,
  XP_TABLE,
  RACE_DEFAULTS,
  SUBRACE_DEFAULTS,
  CLASS_DEFAULTS,
  SPELLCASTING_CLASSES,
  STAT_TIER_LABELS,
  ABILITY_FRIENDLY,
  SKILL_FRIENDLY,

  // Functions
  modifier,
  proficiencyBonus,
  xpForLevel,
  levelForXP,
  statTierLabel,
  createCharacterTemplate,
  validateCharacter,
  assertValid,
  sanitizeForPlayer,
  ValidationError,
};
