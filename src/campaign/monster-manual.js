/**
 * Monster Manual — SRD 5.1 Open-License Monster Database
 * The Binding — Campaign Mode & Digital DM Mode
 *
 * Loads the SRD monster database and provides the game engine interface
 * for combat encounters, CR balancing, and stat block access.
 *
 * Source: Systems Reference Document 5.1 (CC-BY-4.0)
 * Attribution: This work includes material from the Systems Reference Document 5.1,
 * available at https://dnd.wizards.com/resources/systems-reference-document,
 * and licensed under Creative Commons Attribution 4.0 International.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'monsters', 'srd-monsters.json');

// DMG XP thresholds by player level: [easy, medium, hard, deadly]
const XP_THRESHOLDS = {
  1:  [25, 50, 75, 100],
  2:  [50, 100, 150, 200],
  3:  [75, 150, 225, 400],
  4:  [125, 250, 375, 500],
  5:  [250, 500, 750, 1100],
  6:  [300, 600, 900, 1400],
  7:  [350, 750, 1100, 1700],
  8:  [450, 900, 1400, 2100],
  9:  [550, 1100, 1600, 2400],
  10: [600, 1200, 1900, 2800],
  11: [800, 1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100],
  14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400],
  16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800],
  18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900],
  20: [2800, 5700, 8500, 12700],
};

// Encounter multiplier based on number of monsters vs party size
function getEncounterMultiplier(monsterCount, partySize) {
  let multiplier;
  if (monsterCount === 0) return 0;
  if (monsterCount === 1) multiplier = 1;
  else if (monsterCount === 2) multiplier = 1.5;
  else if (monsterCount <= 6) multiplier = 2;
  else if (monsterCount <= 10) multiplier = 2.5;
  else if (monsterCount <= 14) multiplier = 3;
  else multiplier = 4;

  // Adjust for small/large parties (DMG p.82)
  if (partySize < 3) {
    if (multiplier === 1) multiplier = 1.5;
    else if (multiplier === 1.5) multiplier = 2;
    else multiplier *= 2;
  } else if (partySize > 5) {
    if (multiplier === 1.5) multiplier = 1;
    else if (multiplier === 2) multiplier = 1.5;
    else if (multiplier === 2.5) multiplier = 2;
    else if (multiplier === 3) multiplier = 2.5;
    else multiplier = 3;
  }
  return multiplier;
}

// Cache for loaded database
let _db = null;

/**
 * Load the monster database from disk (cached after first read).
 * @returns {{ meta: object, monsters: object[] }}
 */
function loadDB() {
  if (_db) return _db;
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  _db = JSON.parse(raw);
  return _db;
}

const MonsterManual = {
  // ─── Data Access ────────────────────────────────────────────

  /**
   * Returns all monsters in the database.
   * @returns {object[]} Array of monster stat blocks.
   */
  getAll() {
    return loadDB().monsters;
  },

  /**
   * Look up a monster by name (case-insensitive).
   * @param {string} name - Monster name.
   * @returns {object|null} Monster stat block or null if not found.
   */
  getByName(name) {
    const lower = name.toLowerCase();
    return loadDB().monsters.find(m => m.name.toLowerCase() === lower) || null;
  },

  /**
   * Filter monsters by challenge rating.
   * @param {number} cr - Challenge rating (e.g., 0.25, 1, 5).
   * @returns {object[]} Matching monsters.
   */
  getByCR(cr) {
    return loadDB().monsters.filter(m => m.cr === cr);
  },

  /**
   * Filter monsters by type (e.g., "undead", "fiend", "dragon").
   * @param {string} type - Monster type.
   * @returns {object[]} Matching monsters.
   */
  getByType(type) {
    const lower = type.toLowerCase();
    return loadDB().monsters.filter(m => m.type.toLowerCase() === lower);
  },

  /**
   * Filter monsters by size (e.g., "Small", "Medium", "Large").
   * @param {string} size - Monster size.
   * @returns {object[]} Matching monsters.
   */
  getBySize(size) {
    const lower = size.toLowerCase();
    return loadDB().monsters.filter(m => m.size.toLowerCase() === lower);
  },

  /**
   * Filter monsters by environment (e.g., "forest", "underdark").
   * @param {string} env - Environment name.
   * @returns {object[]} Matching monsters.
   */
  getByEnvironment(env) {
    const lower = env.toLowerCase();
    return loadDB().monsters.filter(m =>
      (m.environment || []).some(e => e.toLowerCase() === lower)
    );
  },

  /**
   * Fuzzy text search across name, type, traits, and actions.
   * @param {string} query - Search term.
   * @returns {object[]} Matching monsters ranked by relevance.
   */
  search(query) {
    const q = query.toLowerCase();
    const results = [];
    for (const m of loadDB().monsters) {
      let score = 0;
      if (m.name.toLowerCase().includes(q)) score += 10;
      if (m.type.toLowerCase().includes(q)) score += 5;
      if ((m.subtype || '').toLowerCase().includes(q)) score += 3;
      for (const t of m.traits || []) {
        if (t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)) score += 2;
      }
      for (const a of m.actions || []) {
        if (a.name.toLowerCase().includes(q)) score += 2;
      }
      if (score > 0) results.push({ monster: m, score });
    }
    return results.sort((a, b) => b.score - a.score).map(r => r.monster);
  },

  // ─── Encounter Building ─────────────────────────────────────

  /**
   * Sum the raw XP of an array of monsters.
   * @param {object[]} creatures - Array of monster stat blocks.
   * @returns {number} Total raw XP.
   */
  getEncounterXPTotal(creatures) {
    return creatures.reduce((sum, c) => sum + (c.xp || 0), 0);
  },

  /**
   * Apply the DMG encounter multiplier for multiple creatures.
   * @param {number} rawXP - Sum of creature XP.
   * @param {number} monsterCount - Number of monsters.
   * @param {number} partySize - Number of player characters.
   * @returns {number} Adjusted XP.
   */
  getAdjustedXP(rawXP, monsterCount, partySize) {
    const mult = getEncounterMultiplier(monsterCount, partySize);
    return Math.floor(rawXP * mult);
  },

  /**
   * Determine encounter difficulty for a given party.
   * @param {number} adjustedXP - Multiplied encounter XP.
   * @param {number[]} partyLevels - Array of player character levels.
   * @returns {string} "trivial" | "easy" | "medium" | "hard" | "deadly"
   */
  getEncounterDifficulty(adjustedXP, partyLevels) {
    // Sum each PC's thresholds
    let easyTotal = 0, mediumTotal = 0, hardTotal = 0, deadlyTotal = 0;
    for (const lvl of partyLevels) {
      const t = XP_THRESHOLDS[Math.min(Math.max(lvl, 1), 20)];
      if (t) {
        easyTotal += t[0];
        mediumTotal += t[1];
        hardTotal += t[2];
        deadlyTotal += t[3];
      }
    }
    if (adjustedXP < easyTotal * 0.5) return 'trivial';
    if (adjustedXP < easyTotal) return 'easy';
    if (adjustedXP < mediumTotal) return 'medium';
    if (adjustedXP < hardTotal) return 'hard';
    if (adjustedXP < deadlyTotal) return 'deadly';
    return 'deadly+';
  },

  /**
   * Generate a random balanced encounter for a party.
   * @param {number} partyLevel - Average party level.
   * @param {number} partySize - Number of PCs.
   * @param {string} [environment] - Filter by environment (optional).
   * @param {string} [difficulty="medium"] - Desired difficulty.
   * @returns {{ creatures: object[], rawXP: number, adjustedXP: number, difficulty: string }}
   */
  buildRandomEncounter(partyLevel, partySize, environment, difficulty = 'medium') {
    const diffIndex = { trivial: 0, easy: 0, medium: 1, hard: 2, deadly: 3 }[difficulty] ?? 1;
    const thresholds = XP_THRESHOLDS[Math.min(Math.max(partyLevel, 1), 20)];
    if (!thresholds) return { creatures: [], rawXP: 0, adjustedXP: 0, difficulty: 'trivial' };

    const targetXP = thresholds[diffIndex] * partySize;
    let pool = environment ? this.getByEnvironment(environment) : this.getAll();
    if (!pool.length) pool = this.getAll();

    // Filter to monsters within reasonable CR range for the party
    const maxCR = Math.max(partyLevel + 2, partyLevel * 1.5);
    const minCR = Math.max(0, partyLevel - 3);
    pool = pool.filter(m => m.cr >= minCR && m.cr <= maxCR);
    if (!pool.length) pool = this.getAll();

    // Greedy encounter building: pick monsters that fit remaining budget
    const creatures = [];
    let remainingXP = targetXP;
    const maxAttempts = 50;

    for (let attempt = 0; attempt < maxAttempts && remainingXP > 10; attempt++) {
      const candidate = pool[Math.floor(Math.random() * pool.length)];
      const mult = getEncounterMultiplier(creatures.length + 1, partySize);
      const costWithCandidate = (this.getEncounterXPTotal([...creatures, candidate])) * mult;

      if (costWithCandidate <= targetXP * 1.2) { // allow 20% overshoot
        creatures.push(candidate);
        remainingXP = targetXP - costWithCandidate;
      }
    }

    const rawXP = this.getEncounterXPTotal(creatures);
    const adjustedXP = this.getAdjustedXP(rawXP, creatures.length, partySize);
    const actualDifficulty = this.getEncounterDifficulty(adjustedXP, Array(partySize).fill(partyLevel));

    return { creatures, rawXP, adjustedXP, difficulty: actualDifficulty };
  },

  /**
   * Validate and summarize a specific encounter composition.
   * @param {object[]} creatures - Array of monster stat blocks.
   * @param {number[]} partyLevels - Array of player levels.
   * @returns {{ rawXP: number, adjustedXP: number, difficulty: string, monsterCount: number }}
   */
  buildEncounter(creatures, partyLevels) {
    const rawXP = this.getEncounterXPTotal(creatures);
    const adjustedXP = this.getAdjustedXP(rawXP, creatures.length, partyLevels.length);
    const difficulty = this.getEncounterDifficulty(adjustedXP, partyLevels);
    return { rawXP, adjustedXP, difficulty, monsterCount: creatures.length };
  },

  // ─── Combat Helpers ─────────────────────────────────────────

  /**
   * Roll HP from the monster's hit dice formula instead of using average.
   * @param {object} monster - Monster stat block.
   * @returns {number} Rolled hit points.
   */
  rollHP(monster) {
    if (!monster.hp_formula) return monster.hp;
    const match = monster.hp_formula.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return monster.hp;
    const [, count, die, mod] = match;
    let total = 0;
    for (let i = 0; i < parseInt(count); i++) {
      total += Math.floor(Math.random() * parseInt(die)) + 1;
    }
    return Math.max(1, total + (parseInt(mod) || 0));
  },

  /**
   * Get available attacks for a monster.
   * @param {object} monster - Monster stat block.
   * @returns {object[]} Actions that have attack_bonus (i.e., attacks).
   */
  getAttacks(monster) {
    return (monster.actions || []).filter(a => a.attack_bonus !== undefined);
  },

  /**
   * Get legendary actions for a monster.
   * @param {object} monster - Monster stat block.
   * @returns {object[]} Legendary actions (empty array if none).
   */
  getLegendaryActions(monster) {
    return monster.legendary_actions || [];
  },

  /**
   * Get lair actions for a monster.
   * @param {object} monster - Monster stat block.
   * @returns {object[]} Lair actions (empty array if none).
   */
  getLairActions(monster) {
    return monster.lair_actions || [];
  },

  /**
   * Check if a monster has legendary actions.
   * @param {object} monster - Monster stat block.
   * @returns {boolean}
   */
  isLegendary(monster) {
    return (monster.legendary_actions || []).length > 0;
  },

  // ─── Statistics ─────────────────────────────────────────────

  /**
   * Get summary statistics about the monster database.
   * @returns {{ total: number, byCR: object, byType: object, crRange: number[] }}
   */
  getStats() {
    const db = loadDB();
    const byCR = {};
    const byType = {};
    for (const m of db.monsters) {
      byCR[m.cr] = (byCR[m.cr] || 0) + 1;
      byType[m.type] = (byType[m.type] || 0) + 1;
    }
    return {
      total: db.meta.total_monsters,
      byCR,
      byType,
      crRange: db.meta.cr_range,
    };
  },

  /**
   * Get the CR range in the database.
   * @returns {[number, number]} [minCR, maxCR]
   */
  getCRRange() {
    const db = loadDB();
    return db.meta.cr_range;
  },
};

module.exports = MonsterManual;
