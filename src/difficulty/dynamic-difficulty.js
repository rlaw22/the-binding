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

// ── Encounter Scaling Presets (per adventure) ───────────────────────────────

const ENCOUNTER_SCALING = {
  dracula: {
    baseEnemyCount: 2,
    hpMultiplierRange: [0.9, 1.3],
    specialAbilityThreshold: 0.6,
    flavor: "undead",
    notes: "More undead enemies, higher HP variance. Night encounters favored."
  },
  frankenstein: {
    baseEnemyCount: 1,
    hpMultiplierRange: [1.2, 1.8],
    specialAbilityThreshold: 0.4,
    flavor: "construct",
    notes: "Fewer but much tougher enemies. Laboratory and wilderness settings."
  },
  holmes: {
    baseEnemyCount: 3,
    hpMultiplierRange: [0.7, 1.1],
    specialAbilityThreshold: 0.7,
    flavor: "human",
    notes: "More human enemies, tactical combat. Urban and investigative settings."
  },
  default: {
    baseEnemyCount: 2,
    hpMultiplierRange: [0.8, 1.2],
    specialAbilityThreshold: 0.5,
    flavor: "mixed",
    notes: "Balanced encounter scaling for unspecified adventures."
  }
};

class DynamicDifficulty {
  constructor() {
    this.combatHistory = [];
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.totalCombats = 0;
    this.playerActions = [];  // recent action patterns for fatigue detection
    this.deathCount = 0;
    this.sessionStartTime = Date.now();
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
      if (outcome === 'defeat') {
        this.deathCount++;
      }
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
    if (this.playerActions.length > CALIBRATION.maxActionHistory) {
      this.playerActions = this.playerActions.slice(-CALIBRATION.maxActionHistory);
    }
  }

  /**
   * Detect if the player is fatigued (repetitive actions).
   * Returns fatigue info: { fatigued: bool, dominantCategory: string, ratio: number }
   */
  detectFatigue() {
    if (this.playerActions.length < CALIBRATION.fatigueDetection.minActionsToDetect) {
      return { fatigued: false, dominantCategory: null, ratio: 0 };
    }

    const recent = this.playerActions.slice(-CALIBRATION.fatigueDetection.recentActionWindow);
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
    // Fatigued if threshold of recent actions are the same category
    return { fatigued: ratio >= CALIBRATION.fatigueDetection.repetitiveThreshold, dominantCategory, ratio };
  }

  /**
   * Determine the difficulty tier for the next encounter.
   * Returns: 'fair' | 'power_window' | 'challenge'
   *
   * Now considers HP margins and fatigue in addition to win/loss streaks.
   */
  getNextTier() {
    // Rubber-band: after N+ consecutive losses, force a power window
    if (this.consecutiveLosses >= CALIBRATION.lossesToForcePowerWindow) {
      return TIERS.POWER_WINDOW;
    }

    // Fatigue detection: if player is doing repetitive actions, ease up
    const fatigue = this.detectFatigue();
    if (fatigue.fatigued && this.consecutiveWins < CALIBRATION.winsToSkewChallenge) {
      return TIERS.POWER_WINDOW;
    }

    // HP margin: if player barely survived recent fights, ease up
    const recentFights = this.combatHistory.slice(-3);
    if (recentFights.length >= CALIBRATION.hpMargin.minRecentFights) {
      const avgMargin = recentFights.reduce((sum, f) => sum + (f.hpMargin || 0.5), 0) / recentFights.length;
      if (avgMargin < CALIBRATION.hpMargin.nearlyDying && this.consecutiveWins < CALIBRATION.winsToSkewChallenge) {
        // Player barely surviving — give them a break
        return TIERS.POWER_WINDOW;
      }
    }

    // After N+ consecutive wins, skew toward challenge
    if (this.consecutiveWins >= CALIBRATION.winsToSkewChallenge) {
      const roll = Math.random();
      const ws = CALIBRATION.winStreak;
      if (roll < ws.challenge) return TIERS.CHALLENGE;
      if (roll < ws.challenge + ws.fair) return TIERS.FAIR;
      return TIERS.POWER_WINDOW;
    }

    // Standard distribution from calibration
    const roll = Math.random();
    const b = CALIBRATION.base;
    if (roll < b.fair) return TIERS.FAIR;
    if (roll < b.fair + b.powerWindow) return TIERS.POWER_WINDOW;
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
          // Weaken per calibration
          if (scaled.hp) scaled.hp = Math.max(1, Math.floor(scaled.hp * CALIBRATION.scaling.powerWindowHpMult));
          if (scaled.attackBonus != null) scaled.attackBonus = Math.max(0, scaled.attackBonus + CALIBRATION.scaling.powerWindowAtkMod);
          scaled._difficultyTier = 'power_window';
          break;

        case TIERS.CHALLENGE:
          // Strengthen per calibration
          if (scaled.hp) scaled.hp = Math.floor(scaled.hp * CALIBRATION.scaling.challengeHpMult);
          if (scaled.attackBonus != null) scaled.attackBonus = scaled.attackBonus + CALIBRATION.scaling.challengeAtkMod;
          if (scaled.ac) scaled.ac = scaled.ac + CALIBRATION.scaling.challengeAcMod;
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

  // ── Momentum Detection ────────────────────────────────────────────────────

  /**
   * Detect player momentum state based on recent combat performance.
   * @returns {'hot_streak'|'struggling'|'stable'}
   */
  getMomentumState() {
    const recent = this.combatHistory.slice(-5);
    if (recent.length < 2) return 'stable';

    const recentWins = recent.filter(c => c.outcome === 'victory').length;
    const recentLosses = recent.filter(c => c.outcome === 'defeat').length;
    const avgHpMargin = recent.reduce((s, c) => s + (c.hpMargin || 0.5), 0) / recent.length;

    // Hot streak: 3+ wins in last 5 with comfortable HP margins
    if (recentWins >= 3 && avgHpMargin > 0.6) return 'hot_streak';
    // Struggling: 2+ losses in last 5, or low HP margins, or 3+ deaths total
    if (recentLosses >= 2 || avgHpMargin < 0.25 || this.deathCount >= 3) return 'struggling';
    return 'stable';
  }

  /**
   * Get player performance summary from recent combat history.
   * @returns {{ rollingWinRate, avgHpMargin, deathCount, momentum, sessionDurationMin, fatigueState }}
   */
  getPlayerPerformance() {
    const recent = this.combatHistory.slice(-10);
    const wins = recent.filter(c => c.outcome === 'victory').length;
    const avgHp = recent.length > 0
      ? recent.reduce((s, c) => s + (c.hpMargin || 0.5), 0) / recent.length
      : 0;
    const sessionMs = this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
    const sessionMin = Math.round(sessionMs / 60000);

    return {
      rollingWinRate: recent.length > 0 ? Math.round((wins / recent.length) * 100) / 100 : 0,
      avgHpMargin: Math.round(avgHp * 100) / 100,
      deathCount: this.deathCount || 0,
      momentum: this.getMomentumState(),
      sessionDurationMin: sessionMin,
      fatigueState: this.getSessionFatigue()
    };
  }

  /**
   * Detect session-duration fatigue (time-based, not action-based).
   * @returns {{ level: 'fresh'|'tired'|'exhausted', sessionMin, suggestion: string }}
   */
  getSessionFatigue() {
    const sessionMs = this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
    const sessionMin = Math.round(sessionMs / 60000);

    if (sessionMin >= 90) {
      return { level: 'exhausted', sessionMin, suggestion: 'Consider saving your progress and resting.' };
    }
    if (sessionMin >= 60) {
      return { level: 'tired', sessionMin, suggestion: 'Your adventures are wearing on you. A rest might help.' };
    }
    return { level: 'fresh', sessionMin, suggestion: '' };
  }

  /**
   * Get encounter scaling for a specific adventure.
   * @param {string} adventure — 'dracula'|'frankenstein'|'holmes'
   * @returns {object} scaling preset
   */
  getEncounterScaling(adventure) {
    return ENCOUNTER_SCALING[adventure] || ENCOUNTER_SCALING.default;
  }
  serialize() {
    return {
      combatHistory: this.combatHistory,
      consecutiveWins: this.consecutiveWins,
      consecutiveLosses: this.consecutiveLosses,
      totalCombats: this.totalCombats,
      playerActions: this.playerActions,
      deathCount: this.deathCount,
      sessionStartTime: this.sessionStartTime
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
      dd.deathCount = data.deathCount || 0;
      dd.sessionStartTime = data.sessionStartTime || Date.now();
    }
    return dd;
  }
}

module.exports = {
  DynamicDifficulty,
  TIERS,
  CALIBRATION,
  NARRATIVE_WRAPPERS,
  categorizeAction
};
