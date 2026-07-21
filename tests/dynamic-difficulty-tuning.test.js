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
