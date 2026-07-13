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

class DynamicDifficulty {
  constructor() {
    this.combatHistory = [];
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.totalCombats = 0;
  }

  /**
   * Record the outcome of a combat encounter.
   * @param {'victory'|'defeat'|'fled'} outcome
   * @param {number} playerHpRemaining — player HP at end
   * @param {number} enemyCount — number of enemies in the encounter
   */
  recordOutcome(outcome, playerHpRemaining, enemyCount) {
    const won = outcome === 'victory';
    this.totalCombats++;

    if (won) {
      this.consecutiveWins++;
      this.consecutiveLosses = 0;
    } else {
      this.consecutiveLosses++;
      this.consecutiveWins = 0;
    }

    this.combatHistory.push({
      outcome,
      playerHpRemaining,
      enemyCount,
      timestamp: Date.now(),
      consecutiveWins: this.consecutiveWins,
      consecutiveLosses: this.consecutiveLosses
    });

    // Keep history bounded
    if (this.combatHistory.length > 50) {
      this.combatHistory = this.combatHistory.slice(-50);
    }
  }

  /**
   * Determine the difficulty tier for the next encounter.
   * Returns: 'fair' | 'power_window' | 'challenge'
   */
  getNextTier() {
    // Rubber-band: after 2+ consecutive losses, force a power window
    if (this.consecutiveLosses >= 2) {
      return TIERS.POWER_WINDOW;
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
    return {
      totalCombats: this.totalCombats,
      wins,
      losses: this.totalCombats - wins,
      consecutiveWins: this.consecutiveWins,
      consecutiveLosses: this.consecutiveLosses,
      winRate: this.totalCombats > 0 ? (wins / this.totalCombats) : 0,
      recentHistory: this.combatHistory.slice(-10).map(h => ({
        outcome: h.outcome,
        hpRemaining: h.playerHpRemaining,
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
      totalCombats: this.totalCombats
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
    }
    return dd;
  }
}

module.exports = {
  DynamicDifficulty,
  TIERS,
  NARRATIVE_WRAPPERS
};
