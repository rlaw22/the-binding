/**
 * The Binding — Voice Profile Presets Test Suite
 *
 * Tests the CHARACTER_VOICE_PRESETS, getVoiceForCharacter, and related exports
 * from the TTS service module.
 *
 * Run with: node tests/voice-profiles.test.js
 */

let passed = 0, failed = 0, total = 0;
const failures = [];
function assert(c, label) { total++; if (c) { passed++; console.log('  ✓ ' + label); } else { failed++; failures.push(label); console.error('  ✗ ' + label); } }
function assertEq(a, e, label) { total++; const av = JSON.stringify(a), ev = JSON.stringify(e); if (av === ev) { passed++; console.log('  ✓ ' + label); } else { failed++; failures.push(label); console.error('  ✗ ' + label + ' — expected ' + ev + ', got ' + av); } }
function section(n) { console.log('\n═══ ' + n + ' ═══'); }

// ── Import Module ───────────────────────────────────────────────────────────
section('Module Import');

const {
  CHARACTER_VOICE_PRESETS,
  DEFAULT_VOICE_SETTINGS,
  getVoiceForCharacter
} = require('../src/voice/tts-service');

assert(CHARACTER_VOICE_PRESETS !== undefined, 'CHARACTER_VOICE_PRESETS is exported');
assert(DEFAULT_VOICE_SETTINGS !== undefined, 'DEFAULT_VOICE_SETTINGS is exported');
assert(typeof getVoiceForCharacter === 'function', 'getVoiceForCharacter is exported as a function');

// ── Profile Mapping ─────────────────────────────────────────────────────────
section('Profile Mapping');

assertEq(CHARACTER_VOICE_PRESETS.narrator, { voice: 'nova', pitch: 1.0, rate: 0.9 }, 'narrator profile has correct settings');
assertEq(CHARACTER_VOICE_PRESETS.villain, { voice: 'onyx', pitch: 0.8, rate: 0.85 }, 'villain profile has correct settings');
assertEq(CHARACTER_VOICE_PRESETS.ally, { voice: 'shimmer', pitch: 1.1, rate: 1.0 }, 'ally profile has correct settings');
assertEq(CHARACTER_VOICE_PRESETS.merchant, { voice: 'alloy', pitch: 0.95, rate: 1.1 }, 'merchant profile has correct settings');
assertEq(CHARACTER_VOICE_PRESETS.monster, { voice: 'onyx', pitch: 0.7, rate: 0.8 }, 'monster profile has correct settings');

assert(Object.keys(CHARACTER_VOICE_PRESETS).length === 5, 'CHARACTER_VOICE_PRESETS has exactly 5 character types');

// ── Default Voice Settings ──────────────────────────────────────────────────
section('Default Voice Settings');

assertEq(DEFAULT_VOICE_SETTINGS, { voice: 'nova', pitch: 1.0, rate: 1.0 }, 'DEFAULT_VOICE_SETTINGS has correct values');

// ── Character Type Resolution ───────────────────────────────────────────────
section('Character Type Resolution');

assertEq(getVoiceForCharacter('narrator'), { voice: 'nova', pitch: 1.0, rate: 0.9 }, 'getVoiceForCharacter returns narrator profile');
assertEq(getVoiceForCharacter('villain'), { voice: 'onyx', pitch: 0.8, rate: 0.85 }, 'getVoiceForCharacter returns villain profile');
assertEq(getVoiceForCharacter('ally'), { voice: 'shimmer', pitch: 1.1, rate: 1.0 }, 'getVoiceForCharacter returns ally profile');
assertEq(getVoiceForCharacter('merchant'), { voice: 'alloy', pitch: 0.95, rate: 1.1 }, 'getVoiceForCharacter returns merchant profile');
assertEq(getVoiceForCharacter('monster'), { voice: 'onyx', pitch: 0.7, rate: 0.8 }, 'getVoiceForCharacter returns monster profile');

// Test case insensitivity
assertEq(getVoiceForCharacter('NARRATOR'), { voice: 'nova', pitch: 1.0, rate: 0.9 }, 'getVoiceForCharacter handles uppercase');
assertEq(getVoiceForCharacter('Villain'), { voice: 'onyx', pitch: 0.8, rate: 0.85 }, 'getVoiceForCharacter handles mixed case');

// Test whitespace trimming
assertEq(getVoiceForCharacter('  merchant  '), { voice: 'alloy', pitch: 0.95, rate: 1.1 }, 'getVoiceForCharacter trims whitespace');

// ── Fallback to Default ─────────────────────────────────────────────────────
section('Fallback to Default');

assertEq(getVoiceForCharacter('unknown'), { voice: 'nova', pitch: 1.0, rate: 1.0 }, 'getVoiceForCharacter returns default for unknown type');
assertEq(getVoiceForCharacter(''), { voice: 'nova', pitch: 1.0, rate: 1.0 }, 'getVoiceForCharacter returns default for empty string');
assertEq(getVoiceForCharacter(null), { voice: 'nova', pitch: 1.0, rate: 1.0 }, 'getVoiceForCharacter returns default for null');
assertEq(getVoiceForCharacter(undefined), { voice: 'nova', pitch: 1.0, rate: 1.0 }, 'getVoiceForCharacter returns default for undefined');

// Test that returned default is a copy (not a reference to the original)
const result1 = getVoiceForCharacter('unknown');
const result2 = getVoiceForCharacter('unknown');
assert(result1 !== result2, 'getVoiceForCharacter returns a new object each time for defaults');

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed, ${total} total`);
if (failures.length > 0) {
  console.log('\n  Failures:');
  failures.forEach(f => console.log('    - ' + f));
}
console.log('═══════════════════════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
