'use strict';

/**
 * @module rule-engine/races
 * @description D&D 5e race definitions with ability score bonuses, speed,
 * size, features, and subraces. Data-only module — no dice or calculations.
 */

// ─── Feature reference ──────────────────────────────────────────────────────
// Each race/subrace has a `features` array of objects:
//   { name, description, level (default 1), type: 'passive'|'active'|'resistance'|'vision' }

/**
 * @typedef {object} Race
 * @property {string} id          — machine key (e.g. 'elf')
 * @property {string} name        — display name
 * @property {string} size        — 'Small' | 'Medium'
 * @property {number} speed       — base walking speed in feet
 * @property {object} abilityBonuses — { str?, dex?, con?, int?, wis?, cha? }
 * @property {string[]} languages — always-known languages
 * @property {object[]} features  — racial traits
 * @property {object[]} subraces  — keyed subraces (may be empty)
 */

// ─── HUMAN ──────────────────────────────────────────────────────────────────

const human = Object.freeze({
  id: 'human',
  name: 'Human',
  size: 'Medium',
  speed: 30,
  abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
  languages: ['Common', 'one extra'],
  features: [
    {
      name: 'Extra Language',
      description: 'You can speak, read, and write one extra language of your choice.',
      type: 'passive',
    },
  ],
  subraces: [],
});

// ─── ELF ────────────────────────────────────────────────────────────────────

const elf = Object.freeze({
  id: 'elf',
  name: 'Elf',
  size: 'Medium',
  speed: 30,
  abilityBonuses: { dex: 2 },
  languages: ['Common', 'Elvish'],
  features: [
    {
      name: 'Darkvision',
      description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
      type: 'vision',
    },
    {
      name: 'Keen Senses',
      description: 'You have proficiency in the Perception skill.',
      type: 'passive',
    },
    {
      name: 'Fey Ancestry',
      description: 'You have advantage on saving throws against being charmed, and magic can\'t put you to sleep.',
      type: 'passive',
    },
    {
      name: 'Trance',
      description: 'You don\'t need to sleep. Instead, you meditate deeply for 4 hours a day, gaining the same benefit as 8 hours of human sleep.',
      type: 'passive',
    },
  ],
  subraces: Object.freeze([
    Object.freeze({
      id: 'high',
      name: 'High Elf',
      abilityBonuses: { int: 1 },
      features: [
        {
          name: 'Elf Weapon Training',
          description: 'You have proficiency with the longsword, shortsword, shortbow, and longbow.',
          type: 'passive',
        },
        {
          name: 'Cantrip',
          description: 'You know one cantrip of your choice from the wizard spell list. Intelligence is your spellcasting ability for it.',
          type: 'active',
        },
        {
          name: 'Extra Language',
          description: 'You can speak, read, and write one extra language of your choice.',
          type: 'passive',
        },
      ],
    }),
    Object.freeze({
      id: 'wood',
      name: 'Wood Elf',
      abilityBonuses: { wis: 1 },
      features: [
        {
          name: 'Elf Weapon Training',
          description: 'You have proficiency with the longsword, shortsword, shortbow, and longbow.',
          type: 'passive',
        },
        {
          name: 'Fleet of Foot',
          description: 'Your base walking speed increases to 35 feet.',
          type: 'passive',
        },
        {
          name: 'Mask of the Wild',
          description: 'You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena.',
          type: 'passive',
        },
      ],
      speedOverride: 35,
    }),
  ]),
});

// ─── DWARF ──────────────────────────────────────────────────────────────────

const dwarf = Object.freeze({
  id: 'dwarf',
  name: 'Dwarf',
  size: 'Medium',
  speed: 25,
  abilityBonuses: { con: 2 },
  languages: ['Common', 'Dwarvish'],
  features: [
    {
      name: 'Darkvision',
      description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
      type: 'vision',
    },
    {
      name: 'Dwarven Resilience',
      description: 'You have advantage on saving throws against poison, and you have resistance against poison damage.',
      type: 'resistance',
    },
    {
      name: 'Dwarven Combat Training',
      description: 'You have proficiency with the battleaxe, handaxe, light hammer, and warhammer.',
      type: 'passive',
    },
    {
      name: 'Tool Proficiency',
      description: 'You gain proficiency with one artisan\'s tool of your choice: smith\'s tools, brewer\'s supplies, or mason\'s tools.',
      type: 'passive',
    },
    {
      name: 'Stonecunning',
      description: 'Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus.',
      type: 'passive',
    },
  ],
  subraces: Object.freeze([
    Object.freeze({
      id: 'hill',
      name: 'Hill Dwarf',
      abilityBonuses: { wis: 1 },
      features: [
        {
          name: 'Dwarven Toughness',
          description: 'Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.',
          type: 'passive',
          hpPerLevel: 1,
        },
      ],
    }),
    Object.freeze({
      id: 'mountain',
      name: 'Mountain Dwarf',
      abilityBonuses: { str: 2 },
      features: [
        {
          name: 'Dwarven Armor Training',
          description: 'You have proficiency with light and medium armor.',
          type: 'passive',
        },
      ],
    }),
  ]),
});

// ─── HALFLING ───────────────────────────────────────────────────────────────

const halfling = Object.freeze({
  id: 'halfling',
  name: 'Halfling',
  size: 'Small',
  speed: 25,
  abilityBonuses: { dex: 2 },
  languages: ['Common', 'Halfling'],
  features: [
    {
      name: 'Lucky',
      description: 'When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.',
      type: 'passive',
    },
    {
      name: 'Brave',
      description: 'You have advantage on saving throws against being frightened.',
      type: 'passive',
    },
    {
      name: 'Halfling Nimbleness',
      description: 'You can move through the space of any creature that is of a size larger than yours.',
      type: 'passive',
    },
  ],
  subraces: Object.freeze([
    Object.freeze({
      id: 'lightfoot',
      name: 'Lightfoot Halfling',
      abilityBonuses: { cha: 1 },
      features: [
        {
          name: 'Naturally Stealthy',
          description: 'You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.',
          type: 'passive',
        },
      ],
    }),
    Object.freeze({
      id: 'stout',
      name: 'Stout Halfling',
      abilityBonuses: { con: 1 },
      features: [
        {
          name: 'Stout Resilience',
          description: 'You have advantage on saving throws against poison, and you have resistance against poison damage.',
          type: 'resistance',
        },
      ],
    }),
  ]),
});

// ─── GNOME ──────────────────────────────────────────────────────────────────

const gnome = Object.freeze({
  id: 'gnome',
  name: 'Gnome',
  size: 'Small',
  speed: 25,
  abilityBonuses: { int: 2 },
  languages: ['Common', 'Gnomish'],
  features: [
    {
      name: 'Darkvision',
      description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
      type: 'vision',
    },
    {
      name: 'Gnome Cunning',
      description: 'You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.',
      type: 'passive',
    },
  ],
  subraces: Object.freeze([
    Object.freeze({
      id: 'forest',
      name: 'Forest Gnome',
      abilityBonuses: { dex: 1 },
      features: [
        {
          name: 'Natural Illusionist',
          description: 'You know the minor illusion cantrip. Intelligence is your spellcasting ability for it.',
          type: 'active',
        },
        {
          name: 'Speak with Small Beasts',
          description: 'Through sounds and gestures, you can communicate simple ideas with Small or smaller beasts.',
          type: 'passive',
        },
      ],
    }),
    Object.freeze({
      id: 'rock',
      name: 'Rock Gnome',
      abilityBonuses: { con: 1 },
      features: [
        {
          name: 'Artificer\'s Lore',
          description: 'Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you can add double your proficiency bonus.',
          type: 'passive',
        },
        {
          name: 'Tinker',
          description: 'You have proficiency with artisan\'s tools (tinker\'s tools). Using those tools, you can spend 1 hour and 10 gp worth of materials to construct a Tiny clockwork device.',
          type: 'active',
        },
      ],
    }),
  ]),
});

// ─── HALF-ELF ───────────────────────────────────────────────────────────────

const halfElf = Object.freeze({
  id: 'half-elf',
  name: 'Half-Elf',
  size: 'Medium',
  speed: 30,
  abilityBonuses: { cha: 2 },
  abilityChoices: {
    count: 2,
    amount: 1,
    description: 'Increase two other ability scores of your choice by 1 each.',
    eligible: ['str', 'dex', 'con', 'int', 'wis'], // cha already +2
  },
  languages: ['Common', 'Elvish', 'one extra'],
  features: [
    {
      name: 'Darkvision',
      description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
      type: 'vision',
    },
    {
      name: 'Fey Ancestry',
      description: 'You have advantage on saving throws against being charmed, and magic can\'t put you to sleep.',
      type: 'passive',
    },
    {
      name: 'Skill Versatility',
      description: 'You gain proficiency in two skills of your choice.',
      type: 'passive',
    },
    {
      name: 'Extra Language',
      description: 'You can speak, read, and write one extra language of your choice.',
      type: 'passive',
    },
  ],
  subraces: [],
});

// ─── HALF-ORC ───────────────────────────────────────────────────────────────

const halfOrc = Object.freeze({
  id: 'half-orc',
  name: 'Half-Orc',
  size: 'Medium',
  speed: 30,
  abilityBonuses: { str: 2, con: 1 },
  languages: ['Common', 'Orc'],
  features: [
    {
      name: 'Darkvision',
      description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
      type: 'vision',
    },
    {
      name: 'Menacing',
      description: 'You gain proficiency in the Intimidation skill.',
      type: 'passive',
    },
    {
      name: 'Relentless Endurance',
      description: 'When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can\'t use this feature again until you finish a long rest.',
      type: 'active',
    },
    {
      name: 'Savage Attacks',
      description: 'When you score a critical hit with a melee weapon attack, you can roll one of the weapon\'s damage dice one additional time and add it to the extra damage of the critical hit.',
      type: 'passive',
    },
  ],
  subraces: [],
});

// ─── TIEFLING ───────────────────────────────────────────────────────────────

const tiefling = Object.freeze({
  id: 'tiefling',
  name: 'Tiefling',
  size: 'Medium',
  speed: 30,
  abilityBonuses: { cha: 2, int: 1 },
  languages: ['Common', 'Infernal'],
  features: [
    {
      name: 'Darkvision',
      description: 'You can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light.',
      type: 'vision',
    },
    {
      name: 'Hellish Resistance',
      description: 'You have resistance to fire damage.',
      type: 'resistance',
    },
    {
      name: 'Infernal Legacy',
      description: 'You know the thaumaturgy cantrip. At 3rd level, you can cast hellish rebuke once per long rest as a 2nd-level spell. At 5th level, you can cast darkness once per long rest. Charisma is your spellcasting ability for these spells.',
      type: 'active',
      spells: {
        1: ['thaumaturgy'],
        3: ['hellish rebuke'],
        5: ['darkness'],
      },
    },
  ],
  subraces: [],
});

// ─── DRAGONBORN ─────────────────────────────────────────────────────────────

/** Dragonborn breath weapon shapes and sizes by ancestry. */
const DRAGON_ANCESTRIES = Object.freeze({
  black:  { damage: 'acid',      shape: '5 × 30 ft. line (Dex save)' },
  blue:   { damage: 'lightning',  shape: '5 × 30 ft. line (Dex save)' },
  brass:  { damage: 'fire',       shape: '5 × 30 ft. line (Dex save)' },
  bronze: { damage: 'lightning',  shape: '5 × 30 ft. line (Dex save)' },
  copper: { damage: 'acid',       shape: '5 × 30 ft. line (Dex save)' },
  gold:   { damage: 'fire',       shape: '15 ft. cone (Dex save)' },
  green:  { damage: 'poison',     shape: '15 ft. cone (Con save)' },
  red:    { damage: 'fire',       shape: '15 ft. cone (Dex save)' },
  silver: { damage: 'cold',       shape: '15 ft. cone (Con save)' },
  white:  { damage: 'cold',       shape: '15 ft. cone (Con save)' },
});

const dragonborn = Object.freeze({
  id: 'dragonborn',
  name: 'Dragonborn',
  size: 'Medium',
  speed: 30,
  abilityBonuses: { str: 2, cha: 1 },
  languages: ['Common', 'Draconic'],
  dragonAncestries: DRAGON_ANCESTRIES,
  features: [
    {
      name: 'Draconic Ancestry',
      description: 'You have dracon ancestry. Choose a type of dragon; this determines your damage type and breath weapon shape.',
      type: 'passive',
    },
    {
      name: 'Breath Weapon',
      description: 'You can use your action to exhale destructive energy. The shape and damage type depend on your ancestry. Each creature in the area must make a saving throw (DC = 8 + proficiency bonus + CON modifier). The damage is 2d6 at 1st level, increasing at 6th (3d6), 11th (4d6), and 16th (5d6). Usable once per short/long rest.',
      type: 'active',
      breathWeaponDamage: { 1: '2d6', 6: '3d6', 11: '4d6', 16: '5d6' },
    },
    {
      name: 'Damage Resistance',
      description: 'You have resistance to the damage type associated with your draconic ancestry.',
      type: 'resistance',
    },
  ],
  subraces: [],
});

// ─── Registry ───────────────────────────────────────────────────────────────

/** All races keyed by id. */
const RACES = Object.freeze({
  human:      human,
  elf:        elf,
  dwarf:      dwarf,
  halfling:   halfling,
  gnome:      gnome,
  'half-elf': halfElf,
  'half-orc': halfOrc,
  tiefling:   tiefling,
  dragonborn: dragonborn,
});

/**
 * Look up a race by id.
 * @param {string} id
 * @returns {Race|null}
 */
function getRace(id) {
  return RACES[id] || null;
}

/**
 * Look up a race and optional subrace.
 * @param {string} raceId
 * @param {string} [subraceId]
 * @returns {{ base: Race, subrace: object|null, merged: object }}
 */
function getRaceWithSubrace(raceId, subraceId) {
  const base = RACES[raceId];
  if (!base) throw new Error(`Unknown race: ${raceId}`);

  let subrace = null;
  if (subraceId && base.subraces) {
    subrace = base.subraces.find ? base.subraces.find(s => s.id === subraceId) || null : null;
  }

  // Merge ability bonuses
  const abilityBonuses = { ...base.abilityBonuses };
  if (subrace && subrace.abilityBonuses) {
    for (const [k, v] of Object.entries(subrace.abilityBonuses)) {
      abilityBonuses[k] = (abilityBonuses[k] || 0) + v;
    }
  }

  // Merge features
  const features = [
    ...base.features,
    ...(subrace ? subrace.features : []),
  ];

  // Speed override
  const speed = (subrace && subrace.speedOverride) ? subrace.speedOverride : base.speed;

  return {
    base,
    subrace,
    merged: {
      ...base,
      abilityBonuses,
      features,
      speed,
      displayName: subrace ? `${subrace.name}` : base.name,
      fullDisplayName: subrace ? `${subrace.name} ${base.name}` : base.name,
    },
  };
}

/**
 * List all race ids.
 * @returns {string[]}
 */
function listRaces() {
  return Object.keys(RACES);
}

/**
 * List subrace ids for a given race.
 * @param {string} raceId
 * @returns {string[]}
 */
function listSubraces(raceId) {
  const race = RACES[raceId];
  if (!race || !race.subraces) return [];
  if (Array.isArray(race.subraces)) return race.subraces.map(s => s.id);
  return Object.keys(race.subraces);
}

module.exports = {
  RACES,
  DRAGON_ANCESTRIES,
  getRace,
  getRaceWithSubrace,
  listRaces,
  listSubraces,
};
