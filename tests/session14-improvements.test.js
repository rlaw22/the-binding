// Session 14 improvements tests — Image Gen mock themes, mood directions, browser TTS, error recovery
const assert = require('assert');
const fs = require('fs');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message); }
}

// Read source files once
const imageSrc = fs.readFileSync('src/image/image-service.js', 'utf8');
const promptSrc = fs.readFileSync('src/image/prompt-builder.js', 'utf8');
const browserTtsSrc = fs.readFileSync('public/browser-tts.js', 'utf8');

// ─── Image Gen Mock Theme Tests (11 new categories) ───
console.log('\n═══ Image Gen Mock Themes (11 new categories) ═══');

const mockThemes = [
  ['ritual', 'ritual', '🔮'],
  ['investigation', 'investigation', '🔎'],
  ['transformation', 'transformation', '🌀'],
  ['escape', 'escape', '🏃'],
  ['dream', 'dream', '💫'],
  ['death', 'death', '⚰️'],
  ['travel', 'travel', '🗺️'],
  ['conversation', 'conversation', '💬'],
  ['discovery', 'discovery', '✨'],
  ['item', 'artifact', '🗡️'],
  ['background', 'atmospheric', '🏔️'],
];

for (const [name, keyword, icon] of mockThemes) {
  test('mock theme: ' + name, () => {
    assert.ok(imageSrc.includes("p.includes('" + keyword + "')"), 'should have keyword: ' + keyword);
    assert.ok(imageSrc.includes(icon), 'should have icon: ' + icon);
  });
}

// ─── Prompt Builder Mood Direction Tests ───
console.log('\n═══ Prompt Builder — New Mood Directions ═══');

const promptBuilder = require('../src/image/prompt-builder');

test('moodDirection: romantic', () => {
  const r = promptBuilder._moodDirection('romantic');
  assert.ok(r.toLowerCase().includes('warm') || r.toLowerCase().includes('candle'));
});

test('moodDirection: chaotic', () => {
  const r = promptBuilder._moodDirection('chaotic');
  assert.ok(r.toLowerCase().includes('motion') || r.toLowerCase().includes('disorient'));
});

test('moodDirection: oppressive', () => {
  const r = promptBuilder._moodDirection('oppressive');
  assert.ok(r.toLowerCase().includes('ceilings') || r.toLowerCase().includes('stone'));
});

test('moodDirection: whimsical', () => {
  const r = promptBuilder._moodDirection('whimsical');
  assert.ok(r.toLowerCase().includes('askew') || r.toLowerCase().includes('playful'));
});

test('moodDirection: sacred', () => {
  const r = promptBuilder._moodDirection('sacred');
  assert.ok(r.toLowerCase().includes('stained glass') || r.toLowerCase().includes('incense'));
});

test('moodDirection: default fallback', () => {
  const r = promptBuilder._moodDirection('nonexistent_mood_xyz');
  assert.ok(r.toLowerCase().includes('chiaroscuro') || r.toLowerCase().includes('shadows') || r.toLowerCase().includes('atmospheric'));
});

test('moodDirection: existing moods still work (dread)', () => {
  const r = promptBuilder._moodDirection('dread');
  assert.ok(r.toLowerCase().includes('darkness') || r.toLowerCase().includes('suffocating'));
});

test('moodDirection: existing moods still work (combat)', () => {
  const r = promptBuilder._moodDirection('combat');
  assert.ok(r.toLowerCase().includes('motion') || r.toLowerCase().includes('sparks'));
});

// ─── Transient Status Code Tests ───
console.log('\n═══ Error Recovery — 408 Transient Status Code ═══');

test('isTransientError: 408 in TRANSIENT_STATUS_CODES', () => {
  assert.ok(imageSrc.includes('408'), 'should include 408');
  assert.ok(imageSrc.includes('new Set([408'), '408 should be first in the set');
});

test('isTransientError: 429 still transient', () => {
  assert.ok(imageSrc.includes('429'), 'should still include 429');
});

// ─── Browser TTS Tests ───
console.log('\n═══ Browser TTS — New API Methods ═══');

test('browser-tts: pause method exists', () => {
  assert.ok(browserTtsSrc.includes('pause: function'));
});

test('browser-tts: resume method exists', () => {
  assert.ok(browserTtsSrc.includes('resume: function'));
});

test('browser-tts: isPaused method exists', () => {
  assert.ok(browserTtsSrc.includes('isPaused: function'));
});

test('browser-tts: isSpeaking method exists', () => {
  assert.ok(browserTtsSrc.includes('isSpeaking: function'));
});

test('browser-tts: getVoices method exists', () => {
  assert.ok(browserTtsSrc.includes('getVoices: function'));
});

test('browser-tts: ready method exists', () => {
  assert.ok(browserTtsSrc.includes('ready: function'));
});

test('browser-tts: volume in VOICE_PROFILES', () => {
  assert.ok(browserTtsSrc.includes('volume: 0.9'), 'narrator volume: 0.9');
  assert.ok(browserTtsSrc.includes('volume: 0.7'), 'villain volume: 0.7');
  assert.ok(browserTtsSrc.includes('volume: 1.0'), 'default volume: 1.0');
});

test('browser-tts: volume set on utterance', () => {
  assert.ok(browserTtsSrc.includes('utter.volume'), 'should set volume on utterance');
});

test('browser-tts: pause calls synth.pause()', () => {
  assert.ok(browserTtsSrc.includes('this._synth.pause()'));
});

test('browser-tts: resume calls synth.resume()', () => {
  assert.ok(browserTtsSrc.includes('this._synth.resume()'));
});

test('browser-tts: ready returns Promise', () => {
  assert.ok(browserTtsSrc.includes('return Promise.resolve'));
});

test('browser-tts: getVoices maps name/lang/default', () => {
  assert.ok(browserTtsSrc.includes('v.name'));
  assert.ok(browserTtsSrc.includes('v.lang'));
  assert.ok(browserTtsSrc.includes('v.default'));
});

// ─── Report ───
console.log('\n═════════════════════════════════════════════════════════════════════');
console.log('  RESULTS: ' + passed + '/' + (passed + failed) + ' passed, ' + failed + ' failed');
console.log('═════════════════════════════════════════════════════════════════════');
if (failed > 0) process.exit(1);
