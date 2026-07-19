/**
 * Coin Scoring Engine — Hybrid intelligence-weighted scoring.
 * 
 * Design decisions locked in:
 * - Theoretical max coin pool per adventure (fixed by story length + difficulty)
 * - Standard bell curve distribution — 0.01% ever max out
 * - Hybrid: real-time subtle notifications + post-chapter breakdown
 * - Tier-weighted conversion to $BINDING: Bronze 1x, Silver 1.5x, Gold 2.5x, Platinum 5x
 * - Speed requirement ONLY for Platinum (top 10% completion time + 95%+ coins)
 */

// Coin categories match what the DM assesses
const CoinCategory = {
  CREATIVITY: 'creativity',
  INVESTIGATION: 'investigation',
  ROLEPLAY: 'roleplay',
  COMBAT: 'combat',
  EXPLORATION: 'exploration'
};

// Tiers with thresholds (percentage of max coins)
const Tier = {
  BRONZE: 'bronze',       // Complete the adventure
  SILVER: 'silver',       // 60%+ of max
  GOLD: 'gold',           // 85%+ of max
  PLATINUM: 'platinum'    // 95%+ AND top 10% speed
};

const TIER_THRESHOLDS = {
  [Tier.BRONZE]: 0,
  [Tier.SILVER]: 0.60,
  [Tier.GOLD]: 0.85,
  [Tier.PLATINUM]: 0.95
};

const TIER_CONVERSION_RATE = {
  [Tier.BRONZE]: 1.0,
  [Tier.SILVER]: 1.5,
  [Tier.GOLD]: 2.5,
  [Tier.PLATINUM]: 5.0
};

const TIER_SHOPPE_DISCOUNT = {
  [Tier.BRONZE]: 0,
  [Tier.SILVER]: 0.10,
  [Tier.GOLD]: 0.25,
  [Tier.PLATINUM]: 0.40
};

/**
 * Create a coin pool for an adventure.
 * Theoretical max = sum of all possible coins across all scenes.
 */
function createCoinPool(adventureConfig) {
  const { storyLength, difficulty, totalScenes } = adventureConfig;

  // Base pool scales with story length and difficulty
  const basePerScene = difficulty === 'hard' ? 80 : difficulty === 'medium' ? 60 : 40;
  const totalPool = totalScenes * basePerScene;

  return {
    adventureId: adventureConfig.adventureId,
    totalPool,
    totalBudget: totalPool,
    totalScenes,
    difficulty,
    scenePools: Array.from({ length: totalScenes }, (_, i) => ({
      sceneIndex: i,
      maxCoins: basePerScene,
      categoryBreakdown: {
        [CoinCategory.CREATIVITY]: Math.floor(basePerScene * 0.25),
        [CoinCategory.INVESTIGATION]: Math.floor(basePerScene * 0.25),
        [CoinCategory.ROLEPLAY]: Math.floor(basePerScene * 0.20),
        [CoinCategory.COMBAT]: Math.floor(basePerScene * 0.15),
        [CoinCategory.EXPLORATION]: Math.floor(basePerScene * 0.15)
      },
      earned: false
    })),
    createdAt: Date.now()
  };
}

/**
 * Score a player action and return coins earned.
 * Called per-turn with the DM's creativity assessment.
 */
function scoreTurn(poolOrScores, sceneIndexOrPool, turnScores) {
  // Support two calling conventions:
  // 1. scoreTurn(pool, sceneIndex, scores) — test/API convention
  // 2. scoreTurn(scores, scenePool) — internal convention
  let scores, scenePool;
  if (turnScores !== undefined) {
    // Convention 1: poolOrScores is the pool, sceneIndexOrPool is scene index
    const pool = poolOrScores;
    const sceneIndex = typeof sceneIndexOrPool === 'string' ? 0 : sceneIndexOrPool;
    scores = turnScores;
    scenePool = pool.scenePools ? pool.scenePools[Math.min(sceneIndex, pool.scenePools.length - 1)] : pool;
  } else {
    // Convention 2: poolOrScores is scores, sceneIndexOrPool is scenePool
    scores = poolOrScores;
    scenePool = sceneIndexOrPool || {};
  }

  const coins = {};
  let turnTotal = 0;
  const breakdown = scenePool.categoryBreakdown || {};

  for (const category of Object.values(CoinCategory)) {
    const rawScore = scores[category] || 0;
    const maxForCategory = breakdown[category] || 0;
    const earned = Math.round((rawScore / 10) * maxForCategory);
    coins[category] = earned;
    turnTotal += earned;
  }

  return {
    coins,
    total: turnTotal,
    turnTotal,
    isSubtle: true
  };
}

/**
 * Complete a scene and return the chapter breakdown.
 * Called when a scene ends.
 */
function completeScene(sceneIndex, turnScores, pool) {
  const scenePool = pool.scenePools[sceneIndex];
  if (!scenePool || scenePool.earned) return null;

  const breakdown = {};
  let sceneTotal = 0;

  for (const category of Object.values(CoinCategory)) {
    // Sum all turn scores for this category in this scene
    const categoryTotal = turnScores.reduce((sum, t) => sum + (t.coins[category] || 0), 0);
    // Cap at scene max
    const capped = Math.min(categoryTotal, scenePool.categoryBreakdown[category]);
    breakdown[category] = capped;
    sceneTotal += capped;
  }

  scenePool.earned = true;

  return {
    sceneIndex,
    sceneTotal,
    maxForScene: scenePool.maxCoins,
    breakdown,
    percentage: scenePool.maxCoins > 0 ? (sceneTotal / scenePool.maxCoins) : 0
  };
}

/**
 * Calculate the player's final tier after adventure completion.
 */
function calculateTier(pool, completedScenes, completionTimeMs, medianTimeMs) {
  let totalEarned = 0;
  let totalMax = 0;

  for (let i = 0; i < pool.scenePools.length; i++) {
    const scene = pool.scenePools[i];
    totalMax += scene.maxCoins;
    if (completedScenes[i]) {
      totalEarned += completedScenes[i].sceneTotal;
    }
  }

  const percentage = totalMax > 0 ? totalEarned / totalMax : 0;
  const isTopSpeed = medianTimeMs > 0 && completionTimeMs <= medianTimeMs * 0.9;

  let tier = Tier.BRONZE;
  if (percentage >= TIER_THRESHOLDS[Tier.PLATINUM] && isTopSpeed) {
    tier = Tier.PLATINUM;
  } else if (percentage >= TIER_THRESHOLDS[Tier.GOLD]) {
    tier = Tier.GOLD;
  } else if (percentage >= TIER_THRESHOLDS[Tier.SILVER]) {
    tier = Tier.SILVER;
  }

  return {
    tier,
    totalEarned,
    totalMax,
    percentage,
    conversionRate: TIER_CONVERSION_RATE[tier],
    bindingCoins: Math.round(totalEarned * TIER_CONVERSION_RATE[tier] * 100) / 100,
    shoppeDiscount: TIER_SHOPPE_DISCOUNT[tier],
    isTopSpeed
  };
}

/**
 * Generate the end-of-chapter summary text for the player.
 */
function formatChapterSummary(result) {
  if (!result) return '';
  const lines = [];
  lines.push(`**Chapter ${result.sceneIndex + 1} Complete!**`);
  lines.push(`You earned **${result.sceneTotal} / ${result.maxForScene}** coins this chapter.`);
  lines.push('');
  lines.push('**Breakdown:**');
  for (const [category, amount] of Object.entries(result.breakdown)) {
    const label = category.charAt(0).toUpperCase() + category.slice(1);
    const bar = '█'.repeat(Math.round(amount / (result.maxForScene * 0.25) * 5)) || '░';
    lines.push(`  ${label}: +${amount} ${bar}`);
  }
  lines.push('');
  lines.push(`*Chapter efficiency: ${Math.round(result.percentage * 100)}%*`);
  return lines.join('\n');
}

/**
 * Generate the end-of-adventure total summary.
 * Shows all chapters, final tier, $BINDING earnings, and Shoppe discount.
 */
function formatAdventureSummary(tierResult, chapterResults, adventureName) {
  const lines = [];
  lines.push(`# ⚔️ Adventure Complete: ${adventureName || 'Unknown Adventure'}`);
  lines.push('');
  lines.push(`**Final Score: ${tierResult.totalEarned} / ${tierResult.totalMax} coins** (${Math.round(tierResult.percentage * 100)}%)`);
  lines.push('');

  // Chapter breakdowns
  lines.push('## Chapter Summary');
  for (const chapter of chapterResults) {
    const pct = chapter.maxForScene > 0 ? Math.round((chapter.sceneTotal / chapter.maxForScene) * 100) : 0;
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    lines.push(`  Chapter ${chapter.sceneIndex + 1}: ${chapter.sceneTotal}/${chapter.maxForScene} ${bar} ${pct}%`);
  }
  lines.push('');

  // Category totals
  const categoryTotals = {};
  for (const chapter of chapterResults) {
    for (const [cat, amount] of Object.entries(chapter.breakdown)) {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
    }
  }
  lines.push('## Category Breakdown');
  for (const [category, amount] of Object.entries(categoryTotals)) {
    const label = category.charAt(0).toUpperCase() + category.slice(1);
    lines.push(`  ${label}: ${amount}`);
  }
  lines.push('');

  // Tier and rewards
  const tierEmoji = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };
  lines.push(`## Tier: ${tierEmoji[tierResult.tier] || '🥉'} ${tierResult.tier.toUpperCase()}`);
  lines.push(`  $BINDING earned: ${tierResult.bindingCoins} (${tierResult.conversionRate}x conversion)`);
  lines.push(`  Shoppe discount: ${Math.round(tierResult.shoppeDiscount * 100)}%`);
  if (tierResult.isTopSpeed) {
    lines.push(`  ⚡ Speed bonus applied (top 10% completion time)`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Bell curve normalization for coin scoring.
 * Applies a soft curve that makes high scores harder to achieve,
 * ensuring only ~0.01% of players max out.
 *
 * Raw score 0-10 maps through a bell curve:
 *   0→0, 1→0.5, 2→1.5, 3→3, 4→5, 5→7, 6→8.5, 7→9.3, 8→9.7, 9→9.9, 10→10
 *
 * This means scores of 1-3 are common (easy), 4-6 are average,
 * 7-8 are excellent, and 9-10 are truly exceptional.
 */
function bellCurveNormalize(rawScore) {
  const score = Math.max(0, Math.min(10, Math.round(rawScore)));
  // Lookup table — pre-computed bell curve mapping
  const CURVE = [0, 0.5, 1.5, 3, 5, 7, 8.5, 9.3, 9.7, 9.9, 10];
  return CURVE[score];
}

/**
 * Apply bell curve normalization to all categories in a score object.
 */
function normalizeScores(scores) {
  const normalized = {};
  for (const category of Object.values(CoinCategory)) {
    normalized[category] = bellCurveNormalize(scores[category] || 0);
  }
  return normalized;
}

/**
 * Build a subtle coin notification payload for the frontend.
 * Designed to be unobtrusive — small delta shown briefly.
 */
function buildCoinNotification(turnResult, runningTotal) {
  if (!turnResult || turnResult.turnTotal === 0) return null;

  // Find the category with the highest earned coins this turn
  let topCategory = null;
  let topAmount = 0;
  for (const [cat, amount] of Object.entries(turnResult.coins)) {
    if (amount > topAmount) {
      topCategory = cat;
      topAmount = amount;
    }
  }

  return {
    type: 'coin_earned',
    delta: turnResult.turnTotal,
    category: topCategory,
    runningTotal,
    isSubtle: true,
    displayText: `+${turnResult.turnTotal} 🪙`,
    categoryEmoji: {
      creativity: '💡',
      investigation: '🔍',
      roleplay: '🎭',
      combat: '⚔️',
      exploration: '🗺️'
    }[topCategory] || '🪙'
  };
}

/**
 * Apply custom scene category weights from adventure config.
 * Overrides the default 25/25/20/15/15 split.
 *
 * @param {object} scenePool — the scene pool to modify
 * @param {object} weights — { creativity: 0.3, investigation: 0.25, ... } (must sum to ~1.0)
 * @param {number} maxCoins — total max coins for this scene
 */
function applyCategoryWeights(scenePool, weights, maxCoins) {
  if (!weights) return scenePool;

  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  if (Math.abs(total - 1.0) > 0.05) return scenePool; // weights must sum to ~1.0

  scenePool.categoryBreakdown = {};
  for (const [category, weight] of Object.entries(weights)) {
    scenePool.categoryBreakdown[category] = Math.floor(maxCoins * weight);
  }
  return scenePool;
}

module.exports = {
  CoinCategory,
  Tier,
  TIER_THRESHOLDS,
  TIER_CONVERSION_RATE,
  TIER_SHOPPE_DISCOUNT,
  createCoinPool,
  scoreTurn,
  completeScene,
  calculateTier,
  formatChapterSummary,
  formatAdventureSummary,
  bellCurveNormalize,
  normalizeScores,
  buildCoinNotification,
  applyCategoryWeights
};
