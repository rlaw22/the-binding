/**
 * The Binding — Coin Engine V2 Test Suite
 * Tests: bellCurveNormalize, normalizeScores, buildCoinNotification,
 *        formatAdventureSummary, applyCategoryWeights
 */
let passed = 0, failed = 0, total = 0;
function assert(c, label) { total++; if (c) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label); } }
function assertEq(a, e, label) { total++; const av = JSON.stringify(a), ev = JSON.stringify(e); if (av === ev) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label + ' — expected ' + ev + ', got ' + av); } }
function section(n) { console.log('\n═══ ' + n + ' ═══'); }

const CoinEngine = require('../src/coin-engine');

// ─── Bell Curve Normalize ────────────────────────────────────────────
section('Bell Curve Normalize');
{
  assertEq(CoinEngine.bellCurveNormalize(0), 0, 'bellCurve(0) = 0');
  assertEq(CoinEngine.bellCurveNormalize(1), 0.5, 'bellCurve(1) = 0.5');
  assertEq(CoinEngine.bellCurveNormalize(3), 3, 'bellCurve(3) = 3');
  assertEq(CoinEngine.bellCurveNormalize(5), 7, 'bellCurve(5) = 7 (midpoint)');
  assertEq(CoinEngine.bellCurveNormalize(7), 9.3, 'bellCurve(7) = 9.3');
  assertEq(CoinEngine.bellCurveNormalize(10), 10, 'bellCurve(10) = 10');
  assertEq(CoinEngine.bellCurveNormalize(-5), 0, 'bellCurve(-5) clamps to 0');
  assertEq(CoinEngine.bellCurveNormalize(15), 10, 'bellCurve(15) clamps to 10');
  assertEq(CoinEngine.bellCurveNormalize(5.7), 8.5, 'bellCurve(5.7) rounds to 6→8.5');
}

// ─── Normalize Scores ────────────────────────────────────────────────
section('Normalize Scores');
{
  const raw = { creativity: 8, investigation: 5, roleplay: 3, combat: 10, exploration: 0 };
  const norm = CoinEngine.normalizeScores(raw);
  assertEq(norm.creativity, 9.7, 'normalized creativity 8→9.7');
  assertEq(norm.investigation, 7, 'normalized investigation 5→7');
  assertEq(norm.roleplay, 3, 'normalized roleplay 3→3');
  assertEq(norm.combat, 10, 'normalized combat 10→10');
  assertEq(norm.exploration, 0, 'normalized exploration 0→0');
  // Missing categories default to 0
  const sparse = { creativity: 6 };
  const norm2 = CoinEngine.normalizeScores(sparse);
  assertEq(norm2.creativity, 8.5, 'normalized sparse creativity 6→8.5');
  assertEq(norm2.combat, 0, 'normalized sparse missing combat→0');
}

// ─── Build Coin Notification ─────────────────────────────────────────
section('Build Coin Notification');
{
  const turnResult = {
    coins: { creativity: 5, investigation: 3, roleplay: 2, combat: 0, exploration: 1 },
    turnTotal: 11,
    isSubtle: true
  };
  const notif = CoinEngine.buildCoinNotification(turnResult, 42);
  assert(notif !== null, 'notification returned for non-zero turn');
  assertEq(notif.type, 'coin_earned', 'type is coin_earned');
  assertEq(notif.delta, 11, 'delta is turnTotal');
  assertEq(notif.category, 'creativity', 'top category is creativity');
  assertEq(notif.runningTotal, 42, 'runningTotal passed through');
  assertEq(notif.isSubtle, true, 'isSubtle is true');
  assert(notif.displayText.includes('11'), 'displayText contains delta');
  assertEq(notif.categoryEmoji, '💡', 'creativity emoji is 💡');

  // Zero-turn returns null
  const zeroTurn = { coins: {}, turnTotal: 0, isSubtle: true };
  assert(CoinEngine.buildCoinNotification(zeroTurn, 10) === null, 'null notification for zero turn');

  // Null input returns null
  assert(CoinEngine.buildCoinNotification(null, 0) === null, 'null notification for null input');

  // Combat emoji
  const combatTurn = { coins: { combat: 8 }, turnTotal: 8, isSubtle: true };
  const cNotif = CoinEngine.buildCoinNotification(combatTurn, 20);
  assertEq(cNotif.category, 'combat', 'top category is combat');
  assertEq(cNotif.categoryEmoji, '⚔️', 'combat emoji is ⚔️');
}

// ─── Format Adventure Summary ────────────────────────────────────────
section('Format Adventure Summary');
{
  const tierResult = {
    tier: 'gold',
    totalEarned: 250,
    totalMax: 300,
    percentage: 0.83,
    conversionRate: 2.5,
    bindingCoins: 625,
    shoppeDiscount: 0.25,
    isTopSpeed: false
  };
  const chapters = [
    { sceneIndex: 0, sceneTotal: 90, maxForScene: 100, breakdown: { creativity: 25, investigation: 20, roleplay: 20, combat: 15, exploration: 10 }, percentage: 0.9 },
    { sceneIndex: 1, sceneTotal: 80, maxForScene: 100, breakdown: { creativity: 20, investigation: 25, roleplay: 15, combat: 10, exploration: 10 }, percentage: 0.8 },
    { sceneIndex: 2, sceneTotal: 80, maxForScene: 100, breakdown: { creativity: 20, investigation: 15, roleplay: 20, combat: 15, exploration: 10 }, percentage: 0.8 }
  ];
  const summary = CoinEngine.formatAdventureSummary(tierResult, chapters, 'Dracula');
  assert(summary.includes('Dracula'), 'summary includes adventure name');
  assert(summary.includes('250 / 300'), 'summary includes total score');
  assert(summary.includes('GOLD'), 'summary includes tier');
  assert(summary.includes('625'), 'summary includes $BINDING earned');
  assert(summary.includes('25%'), 'summary includes shoppe discount');
  assert(summary.includes('Chapter Summary'), 'summary has chapter section');
  assert(summary.includes('Category Breakdown'), 'summary has category section');
  assert(!summary.includes('Speed bonus'), 'no speed bonus when isTopSpeed is false');

  // Platinum with speed
  const platResult = { ...tierResult, tier: 'platinum', isTopSpeed: true };
  const platSummary = CoinEngine.formatAdventureSummary(platResult, chapters, 'Holmes');
  assert(platSummary.includes('PLATINUM'), 'platinum tier shown');
  assert(platSummary.includes('Speed bonus'), 'speed bonus shown for platinum');
}

// ─── Apply Category Weights ──────────────────────────────────────────
section('Apply Category Weights');
{
  const scenePool = {
    sceneIndex: 0,
    maxCoins: 100,
    categoryBreakdown: { creativity: 25, investigation: 25, roleplay: 20, combat: 15, exploration: 15 }
  };
  const weights = { creativity: 0.40, investigation: 0.30, roleplay: 0.15, combat: 0.10, exploration: 0.05 };
  CoinEngine.applyCategoryWeights(scenePool, weights, 100);
  assertEq(scenePool.categoryBreakdown.creativity, 40, 'creativity weighted to 40');
  assertEq(scenePool.categoryBreakdown.investigation, 30, 'investigation weighted to 30');
  assertEq(scenePool.categoryBreakdown.roleplay, 15, 'roleplay weighted to 15');
  assertEq(scenePool.categoryBreakdown.combat, 10, 'combat weighted to 10');
  assertEq(scenePool.categoryBreakdown.exploration, 5, 'exploration weighted to 5');

  // Invalid weights (don't sum to ~1.0) should be ignored
  const pool2 = { sceneIndex: 1, maxCoins: 60, categoryBreakdown: { creativity: 15 } };
  CoinEngine.applyCategoryWeights(pool2, { creativity: 0.5, investigation: 0.1 }, 60);
  assertEq(pool2.categoryBreakdown.creativity, 15, 'invalid weights ignored — unchanged');

  // Null weights should be no-op
  const pool3 = { sceneIndex: 2, maxCoins: 60, categoryBreakdown: { creativity: 15 } };
  CoinEngine.applyCategoryWeights(pool3, null, 60);
  assertEq(pool3.categoryBreakdown.creativity, 15, 'null weights — no change');
}

// ─── Summary ─────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
console.log('═══════════════════════════════════════════');
process.exit(failed > 0 ? 1 : 0);
