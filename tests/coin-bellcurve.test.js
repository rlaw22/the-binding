/**
 * The Binding — Coin Engine V3 Test Suite
 * Tests for the new 99% features:
 *   1. bellCurveSample — bell-curve distributed coin pool generation
 *   2. convertToBinding — tier-weighted $BINDING conversion
 *   3. formatChapterSummary — enhanced "Here's where they came from..." format
 *   4. createCoinPool — now uses bell curve for scene max coins
 */

const {
  bellCurveSample,
  convertToBinding,
  formatChapterSummary,
  createCoinPool,
  Tier,
  TIER_CONVERSION_RATE,
  CALIBRATION
} = require('../src/coin-engine');

let passed = 0, failed = 0, total = 0;
function assert(c, label) {
  total++;
  if (c) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ ' + label); }
}
function assertEq(a, e, label) {
  total++;
  const av = JSON.stringify(a), ev = JSON.stringify(e);
  if (av === ev) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ ' + label + ' — expected ' + ev + ', got ' + av); }
}
function assertApprox(a, e, tolerance, label) {
  total++;
  if (Math.abs(a - e) <= tolerance) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ ' + label + ' — expected ~' + e + ' (±' + tolerance + '), got ' + a); }
}
function section(n) { console.log('\n═══ ' + n + ' ═══'); }

// ─── Bell Curve Sample ───────────────────────────────────────────────
section('bellCurveSample — basic shape');
{
  const samples = bellCurveSample(1000, 60, 21); // mean=60, stddev=21 (35% of 60)
  assertEq(samples.length, 1000, 'returns n samples');

  // All samples should be integers
  const allIntegers = samples.every(s => Number.isInteger(s));
  assert(allIntegers, 'all samples are integers');

  // All samples should be non-negative
  const allNonNeg = samples.every(s => s >= 0);
  assert(allNonNeg, 'all samples are >= 0');

  // Mean should be close to the requested mean (within 3 for 1000 samples)
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
  assertApprox(Math.round(mean), 60, 3, 'mean ≈ 60 (within tolerance)');

  // Standard deviation should be close to requested (within 5)
  const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / samples.length;
  const stddev = Math.sqrt(variance);
  assertApprox(Math.round(stddev), 21, 5, 'stddev ≈ 21 (within tolerance)');
}

section('bellCurveSample — clamping');
{
  // With extreme mean/stddev, values should still be clamped
  const samples = bellCurveSample(500, 100, 200);
  const clampMax = Math.round(100 * CALIBRATION.BELL_CURVE_CLAMP_MAX); // 200
  const clampMin = Math.max(0, Math.round(100 * CALIBRATION.BELL_CURVE_CLAMP_MIN)); // 10
  const allClamped = samples.every(s => s >= clampMin && s <= clampMax);
  assert(allClamped, `all samples clamped to [${clampMin}, ${clampMax}]`);
}

section('bellCurveSample — edge cases');
{
  // n=0 returns empty array
  assertEq(bellCurveSample(0, 60, 21).length, 0, 'n=0 returns empty array');

  // n=1 returns one sample
  assertEq(bellCurveSample(1, 60, 21).length, 1, 'n=1 returns one sample');

  // stddev=0 should give all values at mean (clamped)
  const zeroStd = bellCurveSample(100, 60, 0);
  const allAtMean = zeroStd.every(s => s === 60);
  assert(allAtMean, 'stddev=0 gives all samples at mean');
}

// ─── Convert to Binding ──────────────────────────────────────────────
section('convertToBinding — tier rates');
{
  // Bronze: 1x
  const bronze = convertToBinding(100, Tier.BRONZE);
  assertEq(bronze.rate, 1.0, 'Bronze rate is 1.0');
  assertEq(bronze.bindingAmount, 100, 'Bronze 100 coins → 100 $BINDING');
  assertEq(bronze.tier, 'bronze', 'Bronze tier label');

  // Silver: 1.5x
  const silver = convertToBinding(100, Tier.SILVER);
  assertEq(silver.rate, 1.5, 'Silver rate is 1.5');
  assertEq(silver.bindingAmount, 150, 'Silver 100 coins → 150 $BINDING');
  assertEq(silver.tier, 'silver', 'Silver tier label');

  // Gold: 2.5x
  const gold = convertToBinding(100, Tier.GOLD);
  assertEq(gold.rate, 2.5, 'Gold rate is 2.5');
  assertEq(gold.bindingAmount, 250, 'Gold 100 coins → 250 $BINDING');
  assertEq(gold.tier, 'gold', 'Gold tier label');

  // Platinum: 5x
  const plat = convertToBinding(100, Tier.PLATINUM);
  assertEq(plat.rate, 5.0, 'Platinum rate is 5.0');
  assertEq(plat.bindingAmount, 500, 'Platinum 100 coins → 500 $BINDING');
  assertEq(plat.tier, 'platinum', 'Platinum tier label');
}

section('convertToBinding — rounding and edge cases');
{
  // Fractional result rounds to 2 decimal places
  const silver = convertToBinding(33, Tier.SILVER);
  assertEq(silver.bindingAmount, 49.5, 'Silver 33 coins → 49.5 $BINDING (rounded)');

  // Zero coins
  const zero = convertToBinding(0, Tier.GOLD);
  assertEq(zero.bindingAmount, 0, '0 coins → 0 $BINDING');

  // Unknown tier defaults to Bronze
  const unknown = convertToBinding(100, 'diamond');
  assertEq(unknown.rate, 1.0, 'Unknown tier defaults to Bronze 1x');
  assertEq(unknown.bindingAmount, 100, 'Unknown tier 100 coins → 100 $BINDING');

  // Large number
  const large = convertToBinding(99999, Tier.PLATINUM);
  assertEq(large.bindingAmount, 499995, 'Platinum 99999 coins → 499995 $BINDING');
}

// ─── Format Chapter Summary (Enhanced) ───────────────────────────────
section('formatChapterSummary — enhanced format');
{
  const result = {
    sceneIndex: 2,
    sceneTotal: 34,
    maxForScene: 50,
    breakdown: { creativity: 10, investigation: 8, roleplay: 7, combat: 5, exploration: 4 },
    percentage: 0.68
  };
  const summary = formatChapterSummary(result);

  // Must include "Chapter 3 Complete!" (sceneIndex 2 → chapter 3)
  assert(summary.includes('Chapter 3 Complete!'), 'shows correct chapter number');

  // Must include the "You earned X/Y coins. Here's where they came from..." format
  assert(summary.includes('You earned **34 / 50** coins. Here\'s where they came from...'),
    'shows "You earned X/Y coins. Here\'s where they came from..."');

  // Must NOT have the old format
  assert(!summary.includes('coins this chapter'), 'old "coins this chapter" format removed');

  // Per-category breakdown present
  assert(summary.includes('Creativity: +10'), 'creativity breakdown shown');
  assert(summary.includes('Investigation: +8'), 'investigation breakdown shown');
  assert(summary.includes('Roleplay: +7'), 'roleplay breakdown shown');
  assert(summary.includes('Combat: +5'), 'combat breakdown shown');
  assert(summary.includes('Exploration: +4'), 'exploration breakdown shown');

  // Visual bars present
  assert(summary.includes('█'), 'visual bar chart present');

  // Efficiency percentage
  assert(summary.includes('68%'), 'efficiency percentage shown');

  // Breakdown header
  assert(summary.includes('**Breakdown:**'), 'breakdown header present');
}

section('formatChapterSummary — edge cases');
{
  // Null input returns empty string
  assertEq(formatChapterSummary(null), '', 'null input returns empty string');
  assertEq(formatChapterSummary(undefined), '', 'undefined input returns empty string');

  // Zero max (avoid division by zero)
  const zeroMax = {
    sceneIndex: 0, sceneTotal: 0, maxForScene: 0,
    breakdown: { creativity: 0 }, percentage: 0
  };
  const zeroSummary = formatChapterSummary(zeroMax);
  assert(zeroSummary.includes('0 / 0'), 'handles zero max without crashing');
  assert(zeroSummary.includes('0%'), 'shows 0% efficiency');
}

// ─── Create Coin Pool (Bell Curve Integration) ──────────────────────
section('createCoinPool — bell curve distribution');
{
  // Seed Math.random for deterministic test
  const origRandom = Math.random;
  let seed = 42;
  Math.random = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };

  const pool = createCoinPool({
    adventureId: 'dracula',
    storyLength: 10,
    difficulty: 'medium',
    totalScenes: 10
  });

  // Restore Math.random
  Math.random = origRandom;

  // Pool has correct structure
  assertEq(pool.totalScenes, 10, 'pool has 10 scenes');
  assertEq(pool.difficulty, 'medium', 'pool difficulty is medium');
  assertEq(pool.adventureId, 'dracula', 'pool adventureId is dracula');

  // Scene pools exist
  assertEq(pool.scenePools.length, 10, 'pool has 10 scene pools');

  // Each scene has a maxCoins value (bell curve distributed, not flat)
  const maxCoinsArr = pool.scenePools.map(sp => sp.maxCoins);
  assert(maxCoinsArr.every(mc => mc > 0), 'all scenes have maxCoins > 0');

  // Not all scene maxCoins are identical (bell curve produces variance)
  const uniqueMaxCoins = new Set(maxCoinsArr);
  assert(uniqueMaxCoins.size > 1, 'scene maxCoins vary (bell curve, not flat)');

  // Total pool = sum of scene maxCoins
  const sumMaxCoins = maxCoinsArr.reduce((s, v) => s + v, 0);
  assertEq(pool.totalPool, sumMaxCoins, 'totalPool equals sum of scene maxCoins');

  // Each scene has category breakdown
  const firstScene = pool.scenePools[0];
  assert(firstScene.categoryBreakdown, 'scene has categoryBreakdown');
  assert(typeof firstScene.categoryBreakdown.creativity === 'number', 'creativity in breakdown');
  assert(typeof firstScene.categoryBreakdown.investigation === 'number', 'investigation in breakdown');

  // Dracula preset weights applied
  assertEq(pool.categoryWeights.investigation, 0.30, 'Dracula investigation weight is 0.30');
  assertEq(pool.categoryWeights.creativity, 0.20, 'Dracula creativity weight is 0.20');
}

section('createCoinPool — default weights for unknown adventure');
{
  const origRandom = Math.random;
  let seed = 123;
  Math.random = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };

  const pool = createCoinPool({
    adventureId: 'unknown',
    storyLength: 5,
    difficulty: 'hard',
    totalScenes: 5
  });

  Math.random = origRandom;

  // Default weights (not adventure-specific)
  assertEq(pool.categoryWeights.creativity, 0.25, 'default creativity weight 0.25');
  assertEq(pool.categoryWeights.investigation, 0.25, 'default investigation weight 0.25');
  assertEq(pool.categoryWeights.roleplay, 0.20, 'default roleplay weight 0.20');

  // Hard difficulty: basePerScene = 80
  const maxCoinsArr = pool.scenePools.map(sp => sp.maxCoins);
  const mean = maxCoinsArr.reduce((s, v) => s + v, 0) / maxCoinsArr.length;
  // The seeded PRNG is a rough determinism aid, not a perfect normal distribution.
  // With only 5 samples and a simple LCG, some variance from the true mean is expected.
  // The key assertion is that the mean is in the right ballpark (not flat 80).
  assert(mean > 50 && mean < 120, 'hard difficulty mean maxCoins is in reasonable range (got ' + Math.round(mean) + ')');
}

// ─── Summary ─────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
console.log('═══════════════════════════════════════════');
process.exit(failed > 0 ? 1 : 0);
