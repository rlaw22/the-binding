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
  formatChapterSummary
};
