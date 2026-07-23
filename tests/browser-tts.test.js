/**
 * browser-tts.test.js — Unit tests for BrowserTTS module logic.
 * Runs in Node (no browser DOM needed) — tests pure functions only.
 * Usage: node tests/browser-tts.test.js
 */
(function () {
  'use strict';

  var mod = require('../public/browser-tts.js');
  var chunkText   = mod._chunkText;
  var pickVoice   = mod._pickVoice;
  var getProfile  = mod._getProfile;
  var PROFILES    = mod._VOICE_PROFILES;
  var MAX_CHUNK   = mod._MAX_CHUNK;
  var BrowserTTS  = mod.BrowserTTS;

  var passed = 0;
  var failed = 0;

  function assert(cond, msg) {
    if (cond) { passed++; }
    else { failed++; console.error('  FAIL: ' + msg); }
  }

  function assertEq(actual, expected, msg) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) { passed++; }
    else {
      failed++;
      console.error('  FAIL: ' + msg);
      console.error('    expected: ' + JSON.stringify(expected));
      console.error('    actual:   ' + JSON.stringify(actual));
    }
  }

  function section(name) { console.log('\n── ' + name + ' ──'); }

  /* ── chunkText ── */
  section('chunkText — short text passes through');

  assertEq(chunkText('Hello'), ['Hello'], 'short text returns single chunk');
  assertEq(chunkText(''), [], 'empty string returns empty array');
  assertEq(chunkText(null), [], 'null returns empty array');
  assertEq(chunkText(undefined), [], 'undefined returns empty array');

  section('chunkText — respects max length');

  var longWord = 'A'.repeat(300);
  var chunks = chunkText(longWord, 200);
  assert(chunks.length >= 2, '300-char word splits into >= 2 chunks');
  for (var i = 0; i < chunks.length; i++) {
    assert(chunks[i].length <= 200, 'chunk ' + i + ' <= 200 chars (got ' + chunks[i].length + ')');
  }
  assertEq(chunks.join(''), longWord, 'all chunks concatenated equal original');

  section('chunkText — breaks at sentence boundaries');

  var sentenceText = 'The dungeon is dark and cold. Shadows flicker on the ancient stone walls. A distant echo reverberates through the corridor, sending chills down your spine.';
  var sChunks = chunkText(sentenceText, 100);
  assert(sChunks.length >= 2, 'multi-sentence text splits into >= 2 chunks');
  // First chunk should end near a sentence boundary
  assert(sChunks[0].indexOf('. ') !== -1 || sChunks[0].length <= 100, 'first chunk ends at sentence or fits in limit');

  section('chunkText — breaks at comma if no sentence boundary');

  var commaText = 'The merchant, a stout fellow with a crooked smile, offers you wares from distant lands, exotic spices, and mysterious potions.';
  var cChunks = chunkText(commaText, 80);
  assert(cChunks.length >= 2, 'long comma-text splits');
  for (var c = 0; c < cChunks.length; c++) {
    assert(cChunks[c].length <= 80, 'comma chunk ' + c + ' <= 80 chars');
  }

  section('chunkText — preserves full text across all chunks');

  var bigText = 'Once upon a time in a land far away, there lived a brave adventurer. '.repeat(10);
  var bChunks = chunkText(bigText);
  assertEq(bChunks.join(' '), bigText.trim(), 'reconstructed text matches original');

  /* ── getProfile ── */
  section('getProfile — character type mapping');

  assertEq(getProfile('narrator').rate, 0.92, 'narrator rate');
  assertEq(getProfile('narrator').pitch, 0.85, 'narrator pitch');
  assertEq(getProfile('villain').rate, 0.85, 'villain rate');
  assertEq(getProfile('villain').pitch, 0.65, 'villain pitch');
  assertEq(getProfile('merchant').rate, 1.15, 'merchant rate');
  assertEq(getProfile('merchant').pitch, 1.10, 'merchant pitch');
  assertEq(getProfile('guard').rate, 1.00, 'guard rate');
  assertEq(getProfile('guard').pitch, 0.75, 'guard pitch');
  assertEq(getProfile('companion').rate, 1.05, 'companion rate');
  assertEq(getProfile('companion').pitch, 1.05, 'companion pitch');
  assertEq(getProfile('elder').rate, 0.80, 'elder rate');
  assertEq(getProfile('elder').pitch, 0.90, 'elder pitch');
  assertEq(getProfile('child').rate, 1.20, 'child rate');
  assertEq(getProfile('child').pitch, 1.40, 'child pitch');

  section('getProfile — unknown type falls back to default');

  assertEq(getProfile('unknown_npc').rate, 1.00, 'unknown falls back to default rate');
  assertEq(getProfile('unknown_npc').pitch, 1.00, 'unknown falls back to default pitch');
  assertEq(getProfile(undefined).rate, 1.00, 'undefined falls back to default rate');
  assertEq(getProfile(null).pitch, 1.00, 'null falls back to default pitch');

  /* ── pickVoice ── */
  section('pickVoice — voice selection');

  var fakeVoices = [
    { name: 'Google UK English Male', lang: 'en-GB' },
    { name: 'Google UK English Female', lang: 'en-GB' },
    { name: 'Samantha', lang: 'en-US' },
    { name: 'Microsoft David', lang: 'en-US' },
    { name: 'Microsoft Zira', lang: 'en-US' },
    { name: 'Karen', lang: 'en-AU' }
  ];
  var fakeSynth = { getVoices: function () { return fakeVoices; } };

  var narratorVoice = pickVoice(fakeSynth, PROFILES.narrator.keywords);
  assert(narratorVoice !== null, 'narrator voice found');
  assert(narratorVoice.name.toLowerCase().indexOf('male') !== -1 || narratorVoice.name.toLowerCase().indexOf('david') !== -1, 'narrator voice is male-ish');

  var merchantVoice = pickVoice(fakeSynth, PROFILES.merchant.keywords);
  assert(merchantVoice !== null, 'merchant voice found');

  var villainVoice = pickVoice(fakeSynth, PROFILES.villain.keywords);
  assert(villainVoice !== null, 'villain voice found');

  section('pickVoice — empty voices returns null');

  var emptySynth = { getVoices: function () { return []; } };
  assertEq(pickVoice(emptySynth, ['male']), null, 'empty voices list returns null');
  assertEq(pickVoice(null, ['male']), null, 'null synth returns null');

  /* ── BrowserTTS API surface ── */
  section('BrowserTTS — API surface');

  assert(typeof BrowserTTS.speak === 'function', 'speak is a function');
  assert(typeof BrowserTTS.stop === 'function', 'stop is a function');
  assert(typeof BrowserTTS.isAvailable === 'function', 'isAvailable is a function');
  assert(typeof BrowserTTS.init === 'function', 'init is a function');

  section('BrowserTTS — isAvailable without init');

  // In Node, window is undefined so isAvailable should be false
  assertEq(BrowserTTS.isAvailable(), false, 'isAvailable is false in Node (no window.speechSynthesis)');

  section('BrowserTTS — visual fallback when unavailable');

  var visualCalled = false;
  var visualText = null;
  BrowserTTS._onVisual = function (t) { visualCalled = true; visualText = t; };
  BrowserTTS.speak('Hello adventurer', {});
  assert(visualCalled, 'visual fallback called when TTS unavailable');
  assertEq(visualText, 'Hello adventurer', 'visual fallback receives correct text');

  section('BrowserTTS — onEnd fires even in fallback mode');

  var endCalled = false;
  BrowserTTS.speak('Test', { onEnd: function () { endCalled = true; } });
  assert(endCalled, 'onEnd callback fires in fallback mode');

  /* ── Voice profile completeness ── */
  section('Voice profiles — all expected character types present');

  var expectedTypes = ['narrator', 'villain', 'merchant', 'guard', 'companion', 'elder', 'child', 'default'];
  for (var t = 0; t < expectedTypes.length; t++) {
    assert(PROFILES[expectedTypes[t]] !== undefined, 'profile exists: ' + expectedTypes[t]);
    assert(typeof PROFILES[expectedTypes[t]].rate === 'number', 'rate is number: ' + expectedTypes[t]);
    assert(typeof PROFILES[expectedTypes[t]].pitch === 'number', 'pitch is number: ' + expectedTypes[t]);
    assert(Array.isArray(PROFILES[expectedTypes[t]].keywords), 'keywords is array: ' + expectedTypes[t]);
  }

  section('Voice profiles — narrator is slower and deeper than default');

  assert(PROFILES.narrator.rate < PROFILES.default.rate, 'narrator rate < default rate');
  assert(PROFILES.narrator.pitch < PROFILES.default.pitch, 'narrator pitch < default pitch');

  section('Voice profiles — merchant is faster than default');

  assert(PROFILES.merchant.rate > PROFILES.default.rate, 'merchant rate > default rate');

  section('Voice profiles — villain is lowest pitch');

  for (var v = 0; v < expectedTypes.length; v++) {
    if (expectedTypes[v] === 'villain' || expectedTypes[v] === 'default') continue;
    assert(PROFILES.villain.pitch <= PROFILES[expectedTypes[v]].pitch, 'villain pitch <= ' + expectedTypes[v] + ' pitch');
  }

  /* ── Summary ── */
  console.log('\n══════════════════════════════');
  console.log('  Passed: ' + passed + '  Failed: ' + failed);
  console.log('══════════════════════════════');
  if (failed > 0) process.exit(1);
})();
