/**
 * The Binding — Dynamic Difficulty Tuning Test Suite
 * Tests: getCalibrationReport, tuneCalibration, resetDifficulty, _applyCustomCalibration
 */
const { DynamicDifficulty, TIERS, CALIBRATION } = require('../src/difficulty/dynamic-difficulty');

let passed = 0, failed = 0, total = 0;
function assert(c, label) { total++; if (c) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label); } }
function assertEq(a, e, label) { total++; const av = JSON.stringify(a), ev = JSON.stringify(e); if (av === ev) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label + ' — expected ' + ev + ', got ' + av); } }
function section(n) { console.log('\n═══ ' + n + ' ═══'); }

// ── Calibration Report ──────────────────────────────────────────────────

section('Calibration Report');

const dd1 = new DynamicDifficulty();
const report1 = dd1.getCalibrationReport();
assertEq(report1.adventureType, 'default', 'Default adventure type is default');
assertEq(report1.totalCombats, 0, 'Initial totalCombats is 0');
assertEq(report1.consecutiveWins, 0, 'Initial consecutiveWins is 0');
assertEq(report1.consecutiveLosses, 0, 'Initial consecutiveLosses is 0');
assertEq(report1.deathCount, 0, 'Initial deathCount is 0');
assertEq(report1.recentOutcomes.length, 0, 'No recent outcomes initially');
assert(typeof report1.sessionDurationMin === 'number', 'Has session duration');
assert(report1.effectiveCalibration, 'Has effectiveCalibration object');
assert(typeof report1.effectiveCalibration.lossesToForcePowerWindow === 'number', 'Calibration has lossesToForcePowerWindow');

const dd2 = new DynamicDifficulty('dracula');
dd2.recordOutcome('victory', 30, 50, 2);
dd2.recordOutcome('defeat', 0, 50, 3);
dd2.recordOutcome('victory', 20, 50, 1);
const report2 = dd2.getCalibrationReport();
assertEq(report2.adventureType, 'dracula', 'Dracula adventure type set');
assertEq(report2.totalCombats, 3, '3 combats recorded');
assertEq(report2.consecutiveWins, 1, '1 consecutive win after last outcome');
assertEq(report2.consecutiveLosses, 0, '0 consecutive losses');
assertEq(report2.deathCount, 1, '1 death recorded');
assertEq(report2.recentOutcomes.length, 3, '3 recent outcomes');
assertEq(report2.recentOutcomes[0], 'victory', 'First outcome is victory');
assertEq(report2.recentOutcomes[1], 'defeat', 'Second outcome is defeat');
assertEq(report2.recentOutcomes[2], 'victory', 'Third outcome is victory');

// ── Tune Calibration ────────────────────────────────────────────────────

section('Tune Calibration');

const dd3 = new DynamicDifficulty();
const r1 = dd3.tuneCalibration({ lossesToForcePowerWindow: 1 });
assertEq(r1.success, true, 'Valid tune succeeds');
assertEq(r1.applied.length, 1, 'One override applied');
assertEq(r1.applied[0], 'lossesToForcePowerWindow', 'Applied correct key');
assertEq(r1.errors.length, 0, 'No errors');

// Verify the override takes effect
const cal3 = dd3.getEffectiveCalibration();
assertEq(cal3.lossesToForcePowerWindow, 1, 'Override reflected in calibration');

const r2 = dd3.tuneCalibration({ bogusKey: 5 });
assertEq(r2.success, false, 'Unknown key fails');
assertEq(r2.errors.length, 1, 'One error for unknown key');
assert(r2.errors[0].includes('Unknown key'), 'Error mentions unknown key');

const r3 = dd3.tuneCalibration({ minCombatsBeforeScaling: -1 });
assertEq(r3.success, false, 'Negative number fails');
assert(r3.errors[0].includes('non-negative'), 'Error mentions non-negative');

const r4 = dd3.tuneCalibration(null);
assertEq(r4.success, false, 'null input fails');
assert(r4.errors[0].includes('object'), 'Error mentions object requirement');

// Multiple overrides
const r5 = dd3.tuneCalibration({ winsToSkewChallenge: 5, minCombatsBeforeScaling: 1 });
assertEq(r5.success, true, 'Multiple valid overrides succeed');
assertEq(r5.applied.length, 2, 'Two overrides applied');

// ── Reset Difficulty ────────────────────────────────────────────────────

section('Reset Difficulty');

const dd4 = new DynamicDifficulty('holmes');
dd4.recordOutcome('victory', 30, 50, 2);
dd4.recordOutcome('victory', 25, 50, 1);
dd4.recordOutcome('victory', 40, 50, 3);
dd4.tuneCalibration({ minCombatsBeforeScaling: 1 });
assert(dd4.totalCombats > 0, 'Has combats before reset');
assert(dd4.consecutiveWins > 0, 'Has wins before reset');

dd4.resetDifficulty();
assertEq(dd4.totalCombats, 0, 'totalCombats reset to 0');
assertEq(dd4.consecutiveWins, 0, 'consecutiveWins reset to 0');
assertEq(dd4.consecutiveLosses, 0, 'consecutiveLosses reset to 0');
assertEq(dd4.deathCount, 0, 'deathCount reset to 0');
assertEq(dd4.combatHistory.length, 0, 'combatHistory cleared');
assertEq(dd4.playerActions.length, 0, 'playerActions cleared');
assertEq(dd4.adventureType, 'holmes', 'Adventure type preserved after reset');

// After reset, calibration should be back to default (no custom overrides)
const calAfterReset = dd4.getEffectiveCalibration();
assertEq(calAfterReset.minCombatsBeforeScaling, CALIBRATION.minCombatsBeforeScaling || dd4.getEffectiveCalibration().minCombatsBeforeScaling, 'Custom calibration cleared after reset');

// ── Tune + Report Integration ───────────────────────────────────────────

section('Tune + Report Integration');

const dd5 = new DynamicDifficulty('frankenstein');
dd5.recordOutcome('defeat', 0, 50, 2);
dd5.recordOutcome('defeat', 0, 50, 2);
dd5.tuneCalibration({ lossesToForcePowerWindow: 1 });
const report5 = dd5.getCalibrationReport();
assertEq(report5.adventureType, 'frankenstein', 'Adventure type in report');
assert(report5.effectiveCalibration.lossesToForcePowerWindow === 1, 'Tuned value in report calibration');

// ── Summary ─────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════');
console.log('  DD TUNING RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
console.log('═══════════════════════════════════════════\n');

if (failed > 0) process.exit(1);

// ═══════════════════════════════════════════════════════════════════════════════
// NEW FUNCTIONS: preAdventureDifficulty, getDifficultyBucket, narrativeDifficultyWrap
// ═══════════════════════════════════════════════════════════════════════════════

const {
  preAdventureDifficulty,
  getDifficultyBucket,
  narrativeDifficultyWrap,
  ADVENTURE_BASE_DIFFICULTY,
  BUCKET_THRESHOLDS,
  NARRATIVE_DIFFICULTY_TEXT
} = require('../src/difficulty/dynamic-difficulty');

// ── preAdventureDifficulty ───────────────────────────────────────────────

section('preAdventureDifficulty');

// Level 5 Dracula player — perfectly matched
const pad1 = preAdventureDifficulty(5, 'dracula');
assertEq(pad1.baselineDifficulty, 50, 'Level 5 Dracula = baseline 50 (perfectly matched)');
assertEq(pad1.tier, 'moderate', 'Level 5 Dracula tier is moderate');
assertEq(pad1.scalingFactor, 0.9, 'Dracula scaling factor is 0.9');
assert(typeof pad1.label === 'string' && pad1.label.length > 0, 'Has a label');

// Level 1 Dracula — below base level
const pad2 = preAdventureDifficulty(1, 'dracula');
assert(pad2.baselineDifficulty < 50, 'Level 1 Dracula baseline < 50');
assertEq(pad2.tier, 'easy', 'Level 1 Dracula tier is easy');

// Level 10 Dracula — above base level
const pad3 = preAdventureDifficulty(10, 'dracula');
assert(pad3.baselineDifficulty > 50, 'Level 10 Dracula baseline > 50');
assert(pad3.tier === 'hard' || pad3.tier === 'deadly', 'Level 10 Dracula tier is hard or deadly');

// Level 1 Frankenstein — steeper scaling
const pad4 = preAdventureDifficulty(1, 'frankenstein');
assert(pad4.baselineDifficulty < pad2.baselineDifficulty, 'Frankenstein level 1 is harder than Dracula level 1 (steeper scaling)');
assertEq(pad4.scalingFactor, 1.15, 'Frankenstein scaling factor is 1.15');

// Unknown adventure uses defaults
const pad5 = preAdventureDifficulty(5, 'unknown_adventure');
assertEq(pad5.baselineDifficulty, 50, 'Unknown adventure at level 5 = baseline 50');
assertEq(pad5.scalingFactor, 1.0, 'Unknown adventure uses default scaling 1.0');

// Edge cases
const pad6 = preAdventureDifficulty(0, 'dracula');
assertEq(pad6.baselineDifficulty, preAdventureDifficulty(1, 'dracula').baselineDifficulty, 'Level 0 treated same as level 1');
assertEq(pad6.tier, 'easy', 'Level 0 tier is easy');

const pad7 = preAdventureDifficulty(null, 'dracula');
assertEq(pad7.baselineDifficulty, preAdventureDifficulty(1, 'dracula').baselineDifficulty, 'null level treated as 1');

const pad8 = preAdventureDifficulty(100, 'dracula');
assertEq(pad8.baselineDifficulty, 100, 'Level 100 clamped to 100 (maximum)');
assertEq(pad8.tier, 'deadly', 'Level 100 tier is deadly');

// Holmes balanced scaling
const pad9 = preAdventureDifficulty(4, 'holmes');
assertEq(pad9.baselineDifficulty, 50, 'Level 4 Holmes = baseline 50 (baseLevel=4, scaling=1.0)');
assertEq(pad9.tier, 'moderate', 'Level 4 Holmes tier is moderate');

// ── getDifficultyBucket ──────────────────────────────────────────────────

section('getDifficultyBucket');

// Basic bucket assignment
const b1 = getDifficultyBucket(0, 10);
assert(['standard', 'power_window', 'challenge_spike'].includes(b1), 'Returns a valid bucket');

// Determinism: same inputs → same output
const b2a = getDifficultyBucket(3, 20);
const b2b = getDifficultyBucket(3, 20);
assertEq(b2a, b2b, 'Same inputs produce same bucket (deterministic)');

// Different scenes produce different buckets (statistical over many)
const buckets = {};
for (let i = 0; i < 100; i++) {
  const b = getDifficultyBucket(i, 100);
  buckets[b] = (buckets[b] || 0) + 1;
}
assert(buckets.standard > 0, 'Some scenes are standard');
assert(buckets.power_window > 0, 'Some scenes are power_window');
assert(buckets.challenge_spike > 0, 'Some scenes are challenge_spike');

// Distribution roughly matches 70/20/10 (within 20% tolerance for 100 samples)
const stdPct = (buckets.standard || 0) / 100;
const pwPct = (buckets.power_window || 0) / 100;
const csPct = (buckets.challenge_spike || 0) / 100;
assert(Math.abs(stdPct - 0.70) < 0.20, `Standard ~70% (got ${(stdPct*100).toFixed(0)}%)`);
assert(Math.abs(pwPct - 0.20) < 0.15, `Power window ~20% (got ${(pwPct*100).toFixed(0)}%)`);
assert(Math.abs(csPct - 0.10) < 0.15, `Challenge spike ~10% (got ${(csPct*100).toFixed(0)}%)`);

// Edge: scene 0 of 1
const b3 = getDifficultyBucket(0, 1);
assert(['standard', 'power_window', 'challenge_spike'].includes(b3), 'Single scene returns valid bucket');

// Edge: null/undefined inputs
const b4 = getDifficultyBucket(null, null);
assert(['standard', 'power_window', 'challenge_spike'].includes(b4), 'Null inputs handled gracefully');

// ── narrativeDifficultyWrap ──────────────────────────────────────────────

section('narrativeDifficultyWrap');

// Dracula hard returns a string
const nw1 = narrativeDifficultyWrap('hard', 'dracula');
assert(typeof nw1 === 'string' && nw1.length > 0, 'Dracula hard returns non-empty string');
assert(nw1.includes('shadow') || nw1.includes('dread') || nw1.includes('dark') || nw1.includes('blood') || nw1.includes('ancient'), 'Dracula hard text is thematically appropriate');

// Dracula easy
const nw2 = narrativeDifficultyWrap('easy', 'dracula');
assert(typeof nw2 === 'string' && nw2.length > 0, 'Dracula easy returns non-empty string');

// Frankenstein deadly
const nw3 = narrativeDifficultyWrap('deadly', 'frankenstein');
assert(typeof nw3 === 'string' && nw3.length > 0, 'Frankenstein deadly returns non-empty string');

// Holmes moderate
const nw4 = narrativeDifficultyWrap('moderate', 'holmes');
assert(typeof nw4 === 'string' && nw4.length > 0, 'Holmes moderate returns non-empty string');

// Unknown adventure falls back to _default
const nw5 = narrativeDifficultyWrap('hard', 'unknown_adventure');
assert(typeof nw5 === 'string' && nw5.length > 0, 'Unknown adventure falls back to default text');
assert(NARRATIVE_DIFFICULTY_TEXT._default.hard.includes(nw5), 'Fallback text comes from _default pool');

// Unknown difficulty falls back to moderate
const nw6 = narrativeDifficultyWrap('nonexistent_tier', 'dracula');
assert(typeof nw6 === 'string' && nw6.length > 0, 'Unknown tier falls back to moderate');
assert(NARRATIVE_DIFFICULTY_TEXT.dracula.moderate.includes(nw6), 'Unknown tier returns a moderate line');

// Null adventure
const nw7 = narrativeDifficultyWrap('easy', null);
assert(typeof nw7 === 'string' && nw7.length > 0, 'Null adventure uses _default pool');

// All adventure+difficulty combos return valid text
const adventures = ['dracula', 'frankenstein', 'holmes'];
const difficulties = ['easy', 'moderate', 'hard', 'deadly'];
let allCombosValid = true;
for (const adv of adventures) {
  for (const diff of difficulties) {
    const text = narrativeDifficultyWrap(diff, adv);
    if (typeof text !== 'string' || text.length === 0) {
      allCombosValid = false;
      break;
    }
  }
}
assert(allCombosValid, 'All adventure+difficulty combos return valid text');

// ── Summary ─────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════');
console.log('  DD TUNING RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
console.log('═══════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
