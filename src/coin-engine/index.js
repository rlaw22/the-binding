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

/**
 * CALIBRATION — Centralized tuning constants for the coin scoring engine.
 * All magic numbers live here so designers can tune without touching logic.
 * Mirrors the pattern in dynamic-difficulty.js.
 */
const CALIBRATION = {
  // Base coins per scene, scaled by difficulty
  BASE_PER_SCENE: { easy: 40, medium: 60, hard: 80 },

  // Default category weights (must sum to ~1.0)
  // Override per-adventure with applyCategoryWeights()
  DEFAULT_CATEGORY_WEIGHTS: {
    creativity: 0.25,
    investigation: 0.25,
    roleplay: 0.20,
    combat: 0.15,
    exploration: 0.15
  },

  // Bell curve lookup — maps raw score 0-10 to normalized value
  // Makes high scores progressively harder to achieve
  BELL_CURVE: [0, 0.5, 1.5, 3, 5, 7, 8.5, 9.3, 9.7, 9.9, 10],

  // Subtle notification thresholds — coins below this delta are silent
  NOTIFICATION_THRESHOLD: 0,

  // Seasonal coin budget — total $BINDING mintable per season (controls inflation)
  SEASON_COIN_BUDGET: 10_000_000,

  // Speed bonus — top N% of completion time qualifies for Platinum
  PLATINUM_SPEED_PERCENTILE: 0.10,

  // Adventure-specific category weight presets
  // Each adventure can emphasize different scoring categories
  ADVENTURE_PRESETS: {
    dracula: { creativity: 0.20, investigation: 0.30, roleplay: 0.20, combat: 0.15, exploration: 0.15 },
    frankenstein: { creativity: 0.30, investigation: 0.20, roleplay: 0.25, combat: 0.10, exploration: 0.15 },
    holmes: { creativity: 0.15, investigation: 0.35, roleplay: 0.15, combat: 0.10, exploration: 0.25 }
  }
};

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
  const { storyLength, difficulty, totalScenes, adventureId } = adventureConfig;

  // Base pool scales with story length and difficulty
  const basePerScene = CALIBRATION.BASE_PER_SCENE[difficulty] || CALIBRATION.BASE_PER_SCENE.medium;
  const totalPool = totalScenes * basePerScene;

  // Use adventure-specific preset weights if available, otherwise defaults
  const presetKey = adventureId ? adventureId.toLowerCase().replace(/[^a-z]/g, '') : null;
  const weights = (presetKey && CALIBRATION.ADVENTURE_PRESETS[presetKey]) || CALIBRATION.DEFAULT_CATEGORY_WEIGHTS;

  return {
    adventureId,
    totalPool,
    totalBudget: totalPool,
    totalScenes,
    difficulty,
    categoryWeights: { ...weights },
    seasonalBudget: CALIBRATION.SEASON_COIN_BUDGET,
    scenePools: Array.from({ length: totalScenes }, (_, i) => ({
      sceneIndex: i,
      maxCoins: basePerScene,
      categoryBreakdown: Object.fromEntries(
        Object.entries(weights).map(
          ([cat, weight]) => [cat, Math.floor(basePerScene * weight)]
        )
      ),
      earned: false
    })),
    createdAt: Date.now()
  };
}

/**
 * Track seasonal coin spend against the budget.
 * Returns { allowed, remaining, spent, budget }.
 */
function checkSeasonalBudget(pool, coinsToSpend) {
  const budget = pool.seasonalBudget || CALIBRATION.SEASON_COIN_BUDGET;
  const spent = pool.seasonalSpent || 0;
  const remaining = Math.max(0, budget - spent);
  const allowed = coinsToSpend <= remaining;
  return { allowed, remaining, spent, budget, coinsToSpend };
}

/**
 * Record seasonal coin spend. Call after scoring a turn.
 */
function recordSeasonalSpend(pool, coinsSpent) {
  pool.seasonalSpent = (pool.seasonalSpent || 0) + coinsSpent;
  return checkSeasonalBudget(pool, 0);
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
  return CALIBRATION.BELL_CURVE[score];
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

// ── Scoring Analytics ────────────────────────────────────────────────────────

/**
 * Create a fresh scoring analytics tracker for a session.
 * Tracks per-category scores, detects streaks, and computes trends.
 */
function createScoringAnalytics() {
  return {
    scores: [],          // ordered list of { score, total, categories: {cat: num}, timestamp }
    categoryTotals: {},  // running totals per category
    categoryCounts: {},  // how many scores recorded per category
    totalCoinsEarned: 0,
    createdAt: Date.now()
  };
}

/**
 * Record a score into the analytics tracker.
 * @param {object} analytics — from createScoringAnalytics()
 * @param {object} score — { creativity, investigation, roleplay, combat, exploration } (0-10 each)
 *   OR a turnResult object with .coins and .turnTotal
 */
function recordScore(analytics, score) {
  if (!analytics || !score) return;

  // Support both raw scores (0-10) and coin results (earned amounts)
  const categories = {};
  let total = 0;

  if (score.coins && typeof score.turnTotal === 'number') {
    // Turn result from scoreTurn — use coin amounts
    for (const [cat, amount] of Object.entries(score.coins)) {
      categories[cat] = amount;
      total += amount;
    }
  } else {
    // Raw scores (0-10 per category)
    for (const cat of Object.values(CoinCategory)) {
      const val = score[cat] || 0;
      categories[cat] = val;
      total += val;
    }
  }

  const entry = {
    score: total,
    total,
    categories,
    timestamp: Date.now()
  };

  analytics.scores.push(entry);
  analytics.totalCoinsEarned += total;

  // Update running category totals
  for (const [cat, val] of Object.entries(categories)) {
    analytics.categoryTotals[cat] = (analytics.categoryTotals[cat] || 0) + val;
    analytics.categoryCounts[cat] = (analytics.categoryCounts[cat] || 0) + 1;
  }
}
/**
 * Get a summary of scoring analytics: averages per category, trend, totals.
 * @returns {{ avgPerCategory: {}, trend: 'improving'|'declining'|'stable', totalCoinsEarned, scoreCount, topCategory, weakestCategory }}
 */
function getAnalyticsSummary(analytics) {
  if (!analytics || analytics.scores.length === 0) {
    return {
      avgPerCategory: {},
      trend: 'stable',
      totalCoinsEarned: 0,
      scoreCount: 0,
      topCategory: null,
      weakestCategory: null
    };
  }

  // Average per category
  const avgPerCategory = {};
  for (const [cat, total] of Object.entries(analytics.categoryTotals)) {
    const count = analytics.categoryCounts[cat] || 1;
    avgPerCategory[cat] = Math.round((total / count) * 100) / 100;
  }

  // Trend: compare first half avg to second half avg
  const scores = analytics.scores;
  let trend = 'stable';
  if (scores.length >= 4) {
    const mid = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, mid);
    const secondHalf = scores.slice(mid);
    const firstAvg = firstHalf.reduce((s, e) => s + e.total, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, e) => s + e.total, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;
    // Threshold: 10% of the max possible score shift
    if (diff > 1.5) trend = 'improving';
    else if (diff < -1.5) trend = 'declining';
  }

  // Top and weakest categories
  let topCategory = null;
  let weakestCategory = null;
  let topAvg = -1;
  let weakestAvg = Infinity;
  for (const [cat, avg] of Object.entries(avgPerCategory)) {
    if (avg > topAvg) { topAvg = avg; topCategory = cat; }
    if (avg < weakestAvg) { weakestAvg = avg; weakestCategory = cat; }
  }

  return {
    avgPerCategory,
    trend,
    totalCoinsEarned: analytics.totalCoinsEarned,
    scoreCount: analytics.scores.length,
    topCategory,
    weakestCategory
  };
}

/**
 * Detect if the player is on a hot streak (3+ high scores in a row)
 * or cold streak (3+ low scores in a row).
 *
 * "High" = total >= 70th percentile of all recorded scores
 * "Low"  = total <= 30th percentile of all recorded scores
 *
 * @returns {{ streak: 'hot'|'cold'|'none', count: number, avgDuringStreak: number }}
 */
function detectStreak(analytics) {
  if (!analytics || analytics.scores.length < 3) {
    return { streak: 'none', count: 0, avgDuringStreak: 0 };
  }

  const scores = analytics.scores;
  const allTotals = scores.map(s => s.total).sort((a, b) => a - b);
  const p30 = allTotals[Math.floor(allTotals.length * 0.3)];
  const p70 = allTotals[Math.floor(allTotals.length * 0.7)];

  // Walk backwards from the most recent score
  const recent = scores.slice(-10); // look at last 10 max

  // Check for hot streak (consecutive high scores at the end)
  let hotCount = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].total >= p70) hotCount++;
    else break;
  }
  if (hotCount >= 3) {
    const streakScores = recent.slice(-hotCount);
    const avg = streakScores.reduce((s, e) => s + e.total, 0) / hotCount;
    return { streak: 'hot', count: hotCount, avgDuringStreak: Math.round(avg * 100) / 100 };
  }

  // Check for cold streak (consecutive low scores at the end)
  let coldCount = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].total <= p30) coldCount++;
    else break;
  }
  if (coldCount >= 3) {
    const streakScores = recent.slice(-coldCount);
    const avg = streakScores.reduce((s, e) => s + e.total, 0) / coldCount;
    return { streak: 'cold', count: coldCount, avgDuringStreak: Math.round(avg * 100) / 100 };
  }

  return { streak: 'none', count: 0, avgDuringStreak: 0 };
}

// ── AI DM Scoring Rubric & Prompt Builder ────────────────────────────────────

/**
 * Return the full scoring rubric as a structured object.
 * Each category (0-10) has: name, description, criteria[], examples { excellent, poor }.
 * Used by the AI DM to assess player actions consistently.
 */
function getScoringRubric() {
  return {
    creativity: {
      name: 'Creativity',
      description: 'Originality of approach and unexpected solutions to challenges.',
      criteria: [
        'Uses items or abilities in unconventional ways',
        'Proposes solutions not obvious from the scene description',
        'Combines multiple elements in novel ways',
        'Approaches problems from unexpected angles',
        'Adds narrative flair or improvisation to actions'
      ],
      examples: {
        excellent: [
          'Using a mirror to redirect sunlight into a vampire\'s eyes instead of fighting',
          'Convincing a guard they\'re being haunted by dressing up as a ghost',
          'Using a fishing rod to retrieve an item from across a chasm'
        ],
        poor: [
          'I attack the enemy with my sword (generic, no creativity)',
          'I search the room (standard action, no originality)',
          'I ask the NPC for the quest reward (expected, mechanical)'        ]
      }
    },
    investigation: {
      name: 'Investigation',
      description: 'Thoroughness of searching, questioning, and connecting clues.',
      criteria: [
        'Examines environment systematically rather than randomly',
        'Asks NPCs targeted, relevant questions',
        'Connects disparate pieces of information',
        'Follows up on leads and inconsistencies',
        'Documents or remembers important details'
      ],
      examples: {
        excellent: [
          'Noticing the scratches on the lock match a key found earlier',
          'Asking the innkeeper about the specific traveler mentioned in the letter',
          'Comparing the handwriting on two documents to identify the forger'
        ],
        poor: [
          'I look around the room (vague, no specific investigation)',
          'I ask the NPC what to do (no independent investigation)',
          'I pick up the first item I see (no systematic search)'
        ]
      }
    },
    roleplay: {
      name: 'Roleplay',
      description: 'Staying in character, narrative consistency, and dialogue quality.',
      criteria: [
        'Speaks and acts consistent with character background',
        'Uses appropriate tone and vocabulary for the character',
        'Makes decisions based on character motivations, not player knowledge',
        'Engages with NPCs in character-appropriate ways',
        'Maintains narrative consistency across scenes'
      ],
      examples: {
        excellent: [
          'A noble-born character refusing to eat with commoners despite the quest need',
          'A cowardly character hesitating before entering the dark cave',
          'Using period-appropriate language and mannerisms'
        ],
        poor: [
          'Breaking character to reference game mechanics',
          'Acting completely out of character without narrative reason',
          'Using modern slang in a medieval setting'
        ]
      }
    },
    combat: {
      name: 'Combat',
      description: 'Tactical thinking, resource management, and positioning.',
      criteria: [
        'Uses terrain and positioning strategically',
        'Manages resources (spells, items, abilities) effectively',
        'Coordinates with allies when applicable',
        'Targets enemy weaknesses or exploits opportunities',
        'Makes tactical retreats or defensive choices when appropriate'
      ],
      examples: {
        excellent: [
          'Using a doorway as a chokepoint against multiple enemies',
          'Targeting the enemy spellcaster first to disrupt their support',
          'Using cover and ranged attacks against a melee-focused enemy'
        ],
        poor: [
          'I attack the nearest enemy (no tactical consideration)',
          'Using all spells immediately without conservation',
          'Standing in the open against ranged attackers'
        ]
      }
    },
    exploration: {
      name: 'Exploration',
      description: 'Environmental interaction, discovery, and map awareness.',
      criteria: [
        'Interacts with environmental features beyond the obvious',
        'Discovers hidden areas, items, or passages',
        'Maintains awareness of spatial relationships and map layout',
        'Uses environment creatively for advantage',
        'Thoroughly explores before moving to the next area'
      ],
      examples: {
        excellent: [
          'Checking behind the bookshelf reveals a hidden passage',
          'Noticing the draft from a secret door in the wall',
          'Using a rope to explore a vertical shaft safely'
        ],
        poor: [
          'I go to the next room (no exploration of current area)',
          'I walk through the dungeon without examining anything',
          'Ignoring obvious environmental features'
        ]
      }
    }
  };
}

/**
 * Build a structured prompt for an LLM to assess a player action.
 * Returns a string prompt requesting JSON output with scores for all 5 categories.
 *
 * @param {string} playerAction — the player's action text
 * @param {object} narrativeContext — { sceneDescription, questInfo, characterInfo }
 * @param {object} sceneInfo — { sceneIndex, totalScenes, difficulty, adventureId }
 * @returns {string} formatted prompt for LLM scoring
 */
function buildScoringPrompt(playerAction, narrativeContext, sceneInfo) {
  const rubric = getScoringRubric();
  const { sceneDescription, questInfo, characterInfo } = narrativeContext || {};
  const { sceneIndex, totalScenes, difficulty, adventureId } = sceneInfo || {};

  // Build rubric section
  let rubricText = '';
  for (const [key, cat] of Object.entries(rubric)) {
    rubricText += `\n### ${cat.name} (0-10)\n`;
    rubricText += `${cat.description}\n`;
    rubricText += `Criteria:\n`;
    for (const criterion of cat.criteria) {
      rubricText += `- ${criterion}\n`;
    }
    rubricText += `Excellent example: ${cat.examples.excellent[0]}\n`;
    rubricText += `Poor example: ${cat.examples.poor[0]}\n`;
  }

  const prompt = `You are an AI Dungeon Master assessing a player's action in a text-based RPG adventure.

## Scoring Guidelines
- 0-3: Negative play (disruptive, nonsensical, or harmful to narrative)
- 4-6: Average play (competent but unremarkable)
- 6-8: Good play (thoughtful, engaged, effective)
- 8-10: Exceptional play (creative, immersive, masterful)

## Scoring Rubric${rubricText}

## Scene Context
${adventureId ? `Adventure: ${adventureId}` : ''}
${sceneIndex != null && totalScenes ? `Scene: ${sceneIndex + 1} of ${totalScenes}` : ''}
${difficulty ? `Difficulty: ${difficulty}` : ''}
${sceneDescription ? `Scene Description: ${sceneDescription}` : ''}
${questInfo ? `Quest Info: ${questInfo}` : ''}
${characterInfo ? `Character Info: ${characterInfo}` : ''}

## Player Action
"${playerAction}"

## Task
Assess this player action across all 5 categories. Return ONLY a JSON object (no markdown, no explanation outside JSON):

{
  "creativity": <0-10>,
  "investigation": <0-10>,
  "roleplay": <0-10>,
  "combat": <0-10>,
  "exploration": <0-10>,
  "reasoning": "<brief explanation of scores>"
}`;

  return prompt;
}

module.exports = {
  CALIBRATION,
  CoinCategory,
  Tier,
  TIER_THRESHOLDS,
  TIER_CONVERSION_RATE,
  TIER_SHOPPE_DISCOUNT,
  createCoinPool,
  checkSeasonalBudget,
  recordSeasonalSpend,
  scoreTurn,
  completeScene,
  calculateTier,
  formatChapterSummary,
  formatAdventureSummary,
  bellCurveNormalize,
  normalizeScores,
  buildCoinNotification,
  applyCategoryWeights,
  createScoringAnalytics,
  recordScore,
  getAnalyticsSummary,
  detectStreak,
  getScoringRubric,
  buildScoringPrompt
};
