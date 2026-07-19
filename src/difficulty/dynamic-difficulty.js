/**
 * Dynamic Difficulty — Rubber-band scaling for combat encounters.
 *
 * Tracks player combat performance and adjusts enemy stats to maintain
 * engaging difficulty without being punishing or trivial.
 *
 * Distribution: 70% fair fights, 20% power windows, 10% challenge spikes.
 *
 * Rubber-band rules:
 *   - After 2+ consecutive losses → force power window (easier fight)
 *   - After 3+ consecutive wins  → skew toward challenge (harder fight)
 *   - Otherwise                  → 70/20/10 distribution
 */

// ── Difficulty Tiers ──────────────────────────────────────────────────────────

const TIERS = {
  FAIR: 'fair',
  POWER_WINDOW: 'power_window',
  CHALLENGE: 'challenge'
};

/**
 * Tunable calibration constants.
 * Adjust these to shift the feel of combat without touching logic.
 * All values are ratios or counts, not absolute numbers.
 */
const CALIBRATION = {
  // ── Rubber-band triggers ──
  lossesToForcePowerWindow: 2,     // consecutive losses before forcing easy fight
  winsToSkewChallenge: 3,          // consecutive wins before skewing harder

  // ── Win-streak distribution (when player is on a hot streak) ──
  winStreak: {
    challenge: 0.40,   // 40% challenge
    fair: 0.40,        // 40% fair
    powerWindow: 0.20  // 20% power window (breather)
  },

  // ── Base distribution (normal play) ──
  base: {
    fair: 0.70,        // 70% fair fights (design doc §7)
    powerWindow: 0.20, // 20% power windows (feel like a badass)
    challenge: 0.10    // 10% challenge spikes (need creative thinking)
  },

  // ── Fatigue detection ──
  fatigueDetection: {
    recentActionWindow: 10,    // look at last N actions
    minActionsToDetect: 5,     // need at least this many
    repetitiveThreshold: 0.7   // 70%+ same category = fatigued
  },

  // ── HP margin thresholds ──
  hpMargin: {
    nearlyDying: 0.25,   // avg margin below this = give a break
    minRecentFights: 2   // need at least this many recent fights to evaluate
  },

  // ── Enemy scaling ──
  scaling: {
    powerWindowHpMult: 0.80,    // -20% HP
    powerWindowAtkMod: -2,      // -2 attack bonus
    challengeHpMult: 1.30,      // +30% HP
    challengeAtkMod: +2,        // +2 attack bonus
    challengeAcMod: +1          // +1 AC
  },

  // ── History bounds ──
  maxCombatHistory: 50,
  maxActionHistory: 30
};

const NARRATIVE_WRAPPERS = {
  fair: [
    'The enemy stands ready — a fair fight awaits.',
    'Your opponent matches your strength. This will be a test of skill.',
    'Steel meets steel. You are evenly matched.',
    'The creature before you is dangerous, but not overwhelming.',
    'You assess the threat: formidable, but you have faced worse.'
  ],
  power_window: [
    'You sense weakness in your enemy — an opportunity to strike decisively.',
    'Your opponent stumbles, its movements sluggish and uncertain. The advantage is yours.',
    'The tide of battle turns in your favor. Press the attack!',
    'Your enemy falters — something in its eyes betrays fear. Now is the time.',
    'The creature before you is wounded, weakened. You feel a surge of confidence.'
  ],
  challenge: [
    'A terrible foe blocks your path. This fight will push you to your limits.',
    'The enemy radiates power beyond anything you have faced. Every instinct screams caution.',
    'Something dark and dangerous stands before you. Steel yourself — this will be brutal.',
    'The ground trembles beneath your enemy\'s approach. You are outmatched.',
    'This creature is unlike any you have faced. It moves with terrible purpose.'
  ]
};

// ── DynamicDifficulty Class ──────────────────────────────────────────────────

// ── Action Categorization ─────────────────────────────────────────────────────

/**
 * Categorize a player action for fatigue detection.
 */
function categorizeAction(action) {
  if (/attack|strike|cast|fight|shoot|stab|slash|punch|kick/.test(action)) return 'combat';
  if (/search|examine|look|inspect|investigate|check|study|read/.test(action)) return 'investigation';
  if (/go|walk|run|move|enter|climb|descend|north|south|east|west|open|explore/.test(action)) return 'exploration';
  if (/say|tell|ask|speak|talk|whisper|shout|negotiate|persuade|intimidate/.test(action)) return 'social';
  if (/use|combine|try|attempt|craft|make|build/.test(action)) return 'creative';
  return 'other';
}

class DynamicDifficulty {
  constructor() {
    this.combatHistory = [];
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.totalCombats = 0;
    this.playerActions = [];  // recent action patterns for fatigue detection
  }

  /**
   * Record the outcome of a combat encounter.
   * @param {'victory'|'defeat'|'fled'} outcome
   * @param {number} playerHpRemaining — player HP at end
   * @param {number} playerHpMax — player max HP
   * @param {number} enemyCount — number of enemies in the encounter
   */
  recordOutcome(outcome, playerHpRemaining, playerHpMax, enemyCount) {
    const won = outcome === 'victory';
    this.totalCombats++;

    if (won) {
      this.consecutiveWins++;
      this.consecutiveLosses = 0;
    } else {
      this.consecutiveLosses++;
      this.consecutiveWins = 0;
    }

    // HP margin — how close the fight was (0 = nearly died, 1 = untouched)
    const hpMargin = playerHpMax > 0 ? playerHpRemaining / playerHpMax : 0;

    this.combatHistory.push({
      outcome,
      playerHpRemaining,
      playerHpMax,
      hpMargin,
      enemyCount,
      timestamp: Date.now(),
      consecutiveWins: this.consecutiveWins,
      consecutiveLosses: this.consecutiveLosses
    });

    // Keep history bounded
    if (this.combatHistory.length > CALIBRATION.maxCombatHistory) {
      this.combatHistory = this.combatHistory.slice(-CALIBRATION.maxCombatHistory);
    }
  }

  /**
   * Record a player action pattern for fatigue detection.
   * @param {string} action — the player's action text
   */
  recordAction(action) {
    if (!action) return;
    const normalized = action.toLowerCase().trim();
    // Extract action category
    const category = categorizeAction(normalized);
    this.playerActions.push({ category, action: normalized, timestamp: Date.now() });

    // Keep bounded
    if (this.playerActions.length > 30) {
      this.playerActions = this.playerActions.slice(-30);
    }
  }

  /**
   * Detect if the player is fatigued (repetitive actions).
   * Returns fatigue info: { fatigued: bool, dominantCategory: string, ratio: number }
   */
  detectFatigue() {
    if (this.playerActions.length < 5) {
      return { fatigued: false, dominantCategory: null, ratio: 0 };
    }

    const recent = this.playerActions.slice(-10);
    const counts = {};
    for (const entry of recent) {
      counts[entry.category] = (counts[entry.category] || 0) + 1;
    }

    let dominantCategory = null;
    let maxCount = 0;
    for (const [cat, count] of Object.entries(counts)) {
      if (count > maxCount) {
        dominantCategory = cat;
        maxCount = count;
      }
    }

    const ratio = maxCount / recent.length;
    // Fatigued if 70%+ of recent actions are the same category
    return { fatigued: ratio >= 0.7, dominantCategory, ratio };
  }

  /**
   * Determine the difficulty tier for the next encounter.
   * Returns: 'fair' | 'power_window' | 'challenge'
   *
   * Now considers HP margins and fatigue in addition to win/loss streaks.
   */
  getNextTier() {
    // Rubber-band: after 2+ consecutive losses, force a power window
    if (this.consecutiveLosses >= 2) {
      return TIERS.POWER_WINDOW;
    }

    // Fatigue detection: if player is doing repetitive actions, ease up
    const fatigue = this.detectFatigue();
    if (fatigue.fatigued && this.consecutiveWins < 2) {
      return TIERS.POWER_WINDOW;
    }

    // HP margin: if player barely survived recent fights, ease up
    const recentFights = this.combatHistory.slice(-3);
    if (recentFights.length >= 2) {
      const avgMargin = recentFights.reduce((sum, f) => sum + (f.hpMargin || 0.5), 0) / recentFights.length;
      if (avgMargin < 0.25 && this.consecutiveWins < 3) {
        // Player barely surviving — give them a break
        return TIERS.POWER_WINDOW;
      }
    }

    // After 3+ consecutive wins, skew toward challenge
    if (this.consecutiveWins >= 3) {
      const roll = Math.random();
      if (roll < 0.40) return TIERS.CHALLENGE;  // 40% challenge
      if (roll < 0.80) return TIERS.FAIR;         // 40% fair
      return TIERS.POWER_WINDOW;                   // 20% power window
    }

    // Standard distribution: 70% fair, 20% power window, 10% challenge
    const roll = Math.random();
    if (roll < 0.70) return TIERS.FAIR;
    if (roll < 0.90) return TIERS.POWER_WINDOW;
    return TIERS.CHALLENGE;
  }

  /**
   * Scale enemy specs based on difficulty tier.
   * Returns new specs — does NOT mutate the input.
   *
   * @param {Array} enemySpecs — [{ template, count, hp, attackBonus, ac, ... }]
   * @param {string} tier — from getNextTier()
   * @returns {Array} scaled enemy specs
   */
  scaleEnemies(enemySpecs, tier) {
    return enemySpecs.map(spec => {
      const scaled = { ...spec };

      switch (tier) {
        case TIERS.POWER_WINDOW:
          // Weaken: -20% HP, -2 attack bonus, min 1 hp / 0 bonus
          if (scaled.hp) scaled.hp = Math.max(1, Math.floor(scaled.hp * 0.8));
          if (scaled.attackBonus != null) scaled.attackBonus = Math.max(0, scaled.attackBonus - 2);
          scaled._difficultyTier = 'power_window';
          break;

        case TIERS.CHALLENGE:
          // Strengthen: +30% HP, +2 attack bonus, +1 AC
          if (scaled.hp) scaled.hp = Math.floor(scaled.hp * 1.3);
          if (scaled.attackBonus != null) scaled.attackBonus = scaled.attackBonus + 2;
          if (scaled.ac) scaled.ac = scaled.ac + 1;
          scaled._difficultyTier = 'challenge';
          break;

        case TIERS.FAIR:
        default:
          // No modification
          scaled._difficultyTier = 'fair';
          break;
      }

      return scaled;
    });
  }

  /**
   * Get a narrative difficulty wrapper for the DM to use.
   * Returns one random line appropriate to the tier.
   *
   * @param {string} tier — from getNextTier()
   * @returns {string} narrative text
   */
  getNarrativeWrapper(tier) {
    const options = NARRATIVE_WRAPPERS[tier] || NARRATIVE_WRAPPERS.fair;
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Get current performance stats.
   */
  getStats() {
    const wins = this.combatHistory.filter(c => c.outcome === 'victory').length;
    const recentFights = this.combatHistory.slice(-5);
    const avgHpMargin = recentFights.length > 0
      ? recentFights.reduce((sum, f) => sum + (f.hpMargin || 0.5), 0) / recentFights.length
      : 0;
    const fatigue = this.detectFatigue();

    return {
      totalCombats: this.totalCombats,
      wins,
      losses: this.totalCombats - wins,
      consecutiveWins: this.consecutiveWins,
      consecutiveLosses: this.consecutiveLosses,
      winRate: this.totalCombats > 0 ? (wins / this.totalCombats) : 0,
      avgHpMargin: Math.round(avgHpMargin * 100) / 100,
      fatigue,
      recentHistory: this.combatHistory.slice(-10).map(h => ({
        outcome: h.outcome,
        hpRemaining: h.playerHpRemaining,
        hpMargin: h.hpMargin,
        enemies: h.enemyCount
      }))
    };
  }

  /**
   * Serialize for persistence (save to session).
   */
  serialize() {
    return {
      combatHistory: this.combatHistory,
      consecutiveWins: this.consecutiveWins,
      consecutiveLosses: this.consecutiveLosses,
      totalCombats: this.totalCombats,
      playerActions: this.playerActions
    };
  }

  /**
   * Restore from serialized state.
   * @param {object|null} data — serialized state or null
   * @returns {DynamicDifficulty}
   */
  static deserialize(data) {
    const dd = new DynamicDifficulty();
    if (data) {
      dd.combatHistory = data.combatHistory || [];
      dd.consecutiveWins = data.consecutiveWins || 0;
      dd.consecutiveLosses = data.consecutiveLosses || 0;
      dd.totalCombats = data.totalCombats || 0;
      dd.playerActions = data.playerActions || [];
    }
    return dd;
  }
}

module.exports = {
  DynamicDifficulty,
  TIERS,
  NARRATIVE_WRAPPERS,
  categorizeAction
};
