/**
 * Encounter Builder — Phase 2C
 *
 * Generates balanced D&D 5e combat encounters from monster stat blocks.
 * Integrates with Dynamic Difficulty for rubber-band scaling.
 */

const MonsterManual = require('./monster-manual');

// XP thresholds by character level (SRD DMG p.82)
const XP_THRESHOLDS = {
  1:  { easy: 25,   medium: 50,   hard: 75,   deadly: 100 },
  2:  { easy: 50,   medium: 100,  hard: 150,  deadly: 200 },
  3:  { easy: 75,   medium: 150,  hard: 225,  deadly: 400 },
  4:  { easy: 125,  medium: 250,  hard: 375,  deadly: 500 },
  5:  { easy: 250,  medium: 500,  hard: 750,  deadly: 1100 },
  6:  { easy: 300,  medium: 600,  hard: 900,  deadly: 1400 },
  7:  { easy: 350,  medium: 700,  hard: 1050, deadly: 1700 },
  8:  { easy: 450,  medium: 900,  hard: 1400, deadly: 2100 },
  9:  { easy: 550,  medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600,  medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800,  medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 }
};

// Multiplier for number of monsters (DMG p.82)
const MONSTER_COUNT_MULTIPLIER = [
  { max: 1, mult: 1 },
  { max: 2, mult: 1.5 },
  { max: 6, mult: 2 },
  { max: 10, mult: 2.5 },
  { max: 14, mult: 3 },
  { max: Infinity, mult: 4 }
];

// Encounter templates for narrative-driven combat
const ENCOUNTER_TEMPLATES = {
  ambush: {
    name: 'Ambush',
    description: 'Enemies strike from hiding — surprise is likely.',
    setup: 'enemies_hidden',
    surpriseChance: 0.6,
    tags: ['combat', 'surprise', 'tactical']
  },
  dungeon_room: {
    name: 'Dungeon Room',
    description: 'Enemies guard a chamber — standard encounter.',
    setup: 'enemies_stationary',
    surpriseChance: 0.1,
    tags: ['combat', 'exploration']
  },
  boss_fight: {
    name: 'Boss Fight',
    description: 'A powerful foe with minions or lair actions.',
    setup: 'boss_with_support',
    surpriseChance: 0.0,
    tags: ['combat', 'boss', 'climactic']
  },
  random_encounter: {
    name: 'Random Encounter',
    description: 'A chance meeting that turns hostile.',
    setup: 'enemies_approaching',
    surpriseChance: 0.3,
    tags: ['combat', 'exploration', 'random']
  },
  chase: {
    name: 'Chase',
    description: 'Enemies flee or pursue — movement-heavy.',
    setup: 'enemies_mobile',
    surpriseChance: 0.2,
    tags: ['combat', 'chase', 'dynamic']
  }
};

/**
 * Calculate adjusted XP for an encounter.
 */
function calculateEncounterXP(monsters, partySize) {
  const totalXP = monsters.reduce((sum, m) => sum + (m.xp || 0), 0);
  const count = monsters.length;
  const multEntry = MONSTER_COUNT_MULTIPLIER.find(e => count <= e.max);
  const mult = multEntry ? multEntry.mult : 1;

  // Adjust for party size (DMG p.83)
  let partyMult = 1;
  if (partySize <= 2) partyMult = 1.5;
  else if (partySize >= 6) partyMult = 0.5;

  return {
    baseXP: totalXP,
    monsterMultiplier: mult,
    partyMultiplier: partyMult,
    adjustedXP: Math.round(totalXP * mult * partyMult),
    perPlayerXP: Math.round((totalXP * mult * partyMult) / partySize)
  };
}

/**
 * Determine encounter difficulty for a given party.
 */
function getEncounterDifficulty(monsters, party) {
  const partyLevels = party.map(p => p.level || 1);
  const partySize = party.length;

  const xpData = calculateEncounterXP(monsters, partySize);
  const adjustedXP = xpData.adjustedXP;

  // Calculate party thresholds (sum of individual thresholds)
  const partyThresholds = { easy: 0, medium: 0, hard: 0, deadly: 0 };
  for (const level of partyLevels) {
    const t = XP_THRESHOLDS[Math.min(level, 20)] || XP_THRESHOLDS[1];
    partyThresholds.easy += t.easy;
    partyThresholds.medium += t.medium;
    partyThresholds.hard += t.hard;
    partyThresholds.deadly += t.deadly;
  }

  let difficulty = 'trivial';
  if (adjustedXP >= partyThresholds.deadly) difficulty = 'deadly';
  else if (adjustedXP >= partyThresholds.hard) difficulty = 'hard';
  else if (adjustedXP >= partyThresholds.medium) difficulty = 'medium';
  else if (adjustedXP >= partyThresholds.easy) difficulty = 'easy';

  return { difficulty, xpData, partyThresholds };
}

/**
 * Build a balanced encounter for the given party.
 */
function buildEncounter(options = {}) {
  const { party = [], targetDifficulty = 'medium', theme = null, template = null, monsterTypes = null } = options;

  if (party.length === 0) throw new Error('Party cannot be empty');

  const partySize = party.length;
  const avgLevel = Math.round(party.reduce((s, p) => s + (p.level || 1), 0) / partySize);

  // Calculate target XP range
  const partyThresholds = { easy: 0, medium: 0, hard: 0, deadly: 0 };
  for (const p of party) {
    const t = XP_THRESHOLDS[Math.min(p.level || 1, 20)] || XP_THRESHOLDS[1];
    partyThresholds.easy += t.easy;
    partyThresholds.medium += t.medium;
    partyThresholds.hard += t.hard;
    partyThresholds.deadly += t.deadly;
  }

  const targetXP = partyThresholds[targetDifficulty] || partyThresholds.medium;
  const minXP = Math.round(targetXP * 0.7);
  const maxXP = Math.round(targetXP * 1.3);

  // Filter available monsters by CR range (appropriate for party level)
  const maxCR = Math.max(avgLevel + 1, 1);
  const minCR = Math.max(0, Math.floor(avgLevel / 3) - 1);

  let available = MonsterManual.getAll().filter(m => {
    const cr = parseCR(m.cr);
    return cr >= minCR && cr <= maxCR;
  });

  // Filter by theme/type if specified
  if (monsterTypes && monsterTypes.length > 0) {
    const typed = available.filter(m => monsterTypes.includes(m.type));
    if (typed.length > 0) available = typed;
  }

  if (available.length === 0) {
    available = MonsterManual.getAll().filter(m => parseCR(m.cr) <= 1);
  }

  if (available.length === 0) {
    return { monsters: [], difficulty: 'trivial', xpData: null, template: null, error: 'No suitable monsters found' };
  }

  // Greedy selection: pick monsters until we hit the target XP range
  const selected = [];
  let currentXP = 0;
  const maxAttempts = 50;
  let attempts = 0;

  while (currentXP < minXP && attempts < maxAttempts) {
    const candidate = available[Math.floor(Math.random() * available.length)];
    const candidateXP = candidate.xp || 10;

    // Don't overshoot by too much
    if (currentXP + candidateXP > maxXP * 2 && selected.length > 0) {
      attempts++;
      continue;
    }

    selected.push(candidate);
    currentXP += candidateXP;
    attempts++;
  }

  // Apply template modifiers
  const selectedTemplate = template && ENCOUNTER_TEMPLATES[template]
    ? ENCOUNTER_TEMPLATES[template]
    : pickTemplate(selected, targetDifficulty);

  const difficulty = getEncounterDifficulty(selected, party);

  return {
    monsters: selected.map(m => ({
      name: m.name,
      cr: m.cr,
      ac: m.ac,
      hp: m.hp,
      xp: m.xp,
      traits: m.traits || [],
      actions: m.actions || []
    })),
    difficulty: difficulty.difficulty,
    xpData: difficulty.xpData,
    template: selectedTemplate,
    partyLevel: avgLevel,
    partySize
  };
}

/**
 * Pick a narrative-appropriate template based on the encounter.
 */
function pickTemplate(monsters, difficulty) {
  if (difficulty === 'deadly') return ENCOUNTER_TEMPLATES.boss_fight;
  if (monsters.length >= 3) return ENCOUNTER_TEMPLATES.ambush;
  return ENCOUNTER_TEMPLATES.dungeon_room;
}

/**
 * Parse CR string to number (handles "1/2", "1/4", "1/8" etc.)
 */
function parseCR(cr) {
  if (typeof cr === 'number') return cr;
  if (!cr) return 0;
  const s = String(cr).trim();
  if (s.includes('/')) {
    const [num, den] = s.split('/').map(Number);
    return num / den;
  }
  return parseFloat(s) || 0;
}

/**
 * Generate encounter narration context for the AI DM.
 */
function buildEncounterNarrationContext(encounter) {
  if (!encounter || !encounter.monsters || encounter.monsters.length === 0) return null;

  const monsterDesc = encounter.monsters.map(m =>
    `${m.name} (CR ${m.cr}, AC ${m.ac}, HP ${m.hp})`
  ).join(', ');

  return {
    template: encounter.template?.name || 'Standard',
    templateDescription: encounter.template?.description || '',
    difficulty: encounter.difficulty,
    monsterCount: encounter.monsters.length,
    monsterDescription: monsterDesc,
    surpriseChance: encounter.template?.surpriseChance || 0.1,
    totalXP: encounter.xpData?.adjustedXP || 0
  };
}

module.exports = {
  XP_THRESHOLDS,
  MONSTER_COUNT_MULTIPLIER,
  ENCOUNTER_TEMPLATES,
  calculateEncounterXP,
  getEncounterDifficulty,
  buildEncounter,
  buildEncounterNarrationContext,
  parseCR
};
