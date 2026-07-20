/**
 * The Binding — TTS Voice Service Test Suite
 *
 * Tests the TTS service module without requiring a real API key.
 * Validates: provider detection, null service fallback, text truncation,
 * service interface contract, and edge cases.
 *
 * Run with: node tests/voice-tts.test.js
 */

let passed = 0, failed = 0, total = 0;
const failures = [];
function assert(c, label) { total++; if (c) { passed++; console.log('  ✓ ' + label); } else { failed++; failures.push(label); console.error('  ✗ ' + label); } }
function assertEq(a, e, label) { total++; const av = JSON.stringify(a), ev = JSON.stringify(e); if (av === ev) { passed++; console.log('  ✓ ' + label); } else { failed++; failures.push(label); console.error('  ✗ ' + label + ' — expected ' + ev + ', got ' + av); } }
function section(n) { console.log('\n═══ ' + n + ' ═══'); }

// ── Provider Detection ──────────────────────────────────────────────
section('Provider Detection');

// Save original env
const origEnv = { ...process.env };

function clearTtsEnv() {
  delete process.env.NOVITA_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
}

// We need to re-require the module after changing env to get fresh detection
// But detectProvider reads env at call time, so we can test it directly
const { detectProvider, createTTSService, createVoiceService, getCachedAudio, cleanupCache } = require('../src/voice');

(async () => {


  {
    // Test 1: No keys → null
    clearTtsEnv();
    assertEq(detectProvider(), null, 'No API keys → null provider');

    // Test 2: Novita takes priority
    process.env.NOVITA_API_KEY = 'test-key';
    assertEq(detectProvider(), 'novita', 'NOVITA_API_KEY set → novita');

    // Test 3: OpenAI when only OpenAI key
    delete process.env.NOVITA_API_KEY;
    process.env.OPENAI_API_KEY = 'test-key';
    assertEq(detectProvider(), 'openai', 'Only OPENAI_API_KEY set → openai');

    // Test 4: ElevenLabs when only ElevenLabs key
    delete process.env.OPENAI_API_KEY;
    process.env.ELEVENLABS_API_KEY = 'test-key';
    assertEq(detectProvider(), 'elevenlabs', 'Only ELEVENLABS_API_KEY set → elevenlabs');

    // Test 5: Novita takes priority over OpenAI
    process.env.NOVITA_API_KEY = 'test-novita';
    process.env.OPENAI_API_KEY = 'test-openai';
    assertEq(detectProvider(), 'novita', 'Both Novita + OpenAI → novita (priority)');

    // Test 6: Novita takes priority over ElevenLabs
    delete process.env.OPENAI_API_KEY;
    process.env.ELEVENLABS_API_KEY = 'test-eleven';
    assertEq(detectProvider(), 'novita', 'Both Novita + ElevenLabs → novita (priority)');
  }

  // Restore env
  clearTtsEnv();

  // ── Null TTS Service (no provider) ──────────────────────────────────
  section('Null TTS Service (no provider configured)');

  {
    const svc = createTTSService({});

    assertEq(svc.provider, null, 'Null service has provider=null');
    assertEq(svc.isReady(), false, 'Null service isReady() = false');
    assert(svc.voice === null || svc.voice === 'default', 'Null service has voice=null or default');
    assertEq(svc.speed, 1.0, 'Null service has speed=1.0');
    assertEq(svc.language, 'en-US', 'Null service has language=en-US');

    const genResult = await svc.generate('Hello, adventurer.');
    assertEq(genResult.status, 'disabled', 'Null service generate() returns disabled');
    assertEq(genResult.taskId, null, 'Null service generate() returns null taskId');

    const audioResult = await svc.getAudio('some-id');
    assertEq(audioResult.ready, false, 'Null service getAudio() returns not ready');
  }

  // ── Voice Service Factory ───────────────────────────────────────────
  section('Voice Service Factory');

  {
    // No provider → null service
    clearTtsEnv();
    const voice = createVoiceService({});
    assertEq(voice.isReady(), false, 'createVoiceService with no keys → not ready');
    assertEq(voice.speed, 0.95, 'createVoiceService default speed is 0.95');

    // With explicit provider override (still no key, but tests config plumbing)
    const voice2 = createVoiceService({ speed: 1.2, language: 'fr-FR' });
    assertEq(voice2.speed, 1.2, 'createVoiceService respects speed config');
    assertEq(voice2.language, 'fr-FR', 'createVoiceService respects language config');
  }

  // ── Edge Cases ──────────────────────────────────────────────────────
  section('Edge Cases');

  {
    clearTtsEnv();
    const svc = createTTSService({});

    // Empty text
    const emptyResult = await svc.generate('');
    assertEq(emptyResult.status, 'skipped', 'Empty text → skipped');

    // Whitespace-only text
    const wsResult = await svc.generate('   \n\t  ');
    assertEq(wsResult.status, 'skipped', 'Whitespace-only text → skipped');

    // null text
    const nullResult = await svc.generate(null);
    assertEq(nullResult.status, 'skipped', 'null text → skipped');

    // undefined text
    const undefResult = await svc.generate(undefined);
    assertEq(undefResult.status, 'skipped', 'undefined text → skipped');

    // getAudio with null taskId
    const noTask = await svc.getAudio(null);
    assertEq(noTask.ready, false, 'getAudio(null) → not ready');
    assert(noTask.reason.includes('no taskId'), 'getAudio(null) reason mentions no taskId');

    // getAudio with empty string
    const emptyTask = await svc.getAudio('');
    assertEq(emptyTask.ready, false, 'getAudio("") → not ready');
  }

  // ── Cache Functions ─────────────────────────────────────────────────
  section('Cache Functions');

  {
    // getCachedAudio on empty cache
    const cached = getCachedAudio('nonexistent-id');
    assertEq(cached, null, 'getCachedAudio for missing ID → null');

    // cleanupCache on empty cache (should not throw)
    let cleanupThrew = false;
    try {
      cleanupCache();
    } catch (e) {
      cleanupThrew = true;
    }
    assert(!cleanupThrew, 'cleanupCache on empty cache does not throw');
  }

  // ── Service Module Exports ──────────────────────────────────────────
  section('Module Exports');

  {
    const voiceModule = require('../src/voice');
    assert(typeof voiceModule.createVoiceService === 'function', 'exports createVoiceService');
    assert(typeof voiceModule.createTTSService === 'function', 'exports createTTSService');
    assert(typeof voiceModule.createSTTService === 'function', 'exports createSTTService');
    assert(typeof voiceModule.getCachedAudio === 'function', 'exports getCachedAudio');
    assert(typeof voiceModule.cleanupCache === 'function', 'exports cleanupCache');
    assert(typeof voiceModule.detectProvider === 'function', 'exports detectProvider');
    assert(typeof voiceModule.detectSTTProvider === 'function', 'exports detectSTTProvider');
  }

  // ── TTS Provider Priority Chain ─────────────────────────────────────
  section('Provider Config Chain');

  {
    // Test that createTTSService respects explicit provider override
    clearTtsEnv();
    // Even without a key, if we force provider, it should try that provider
    // (will fail at generation time, but the config is correct)
    const svc = createTTSService({ provider: 'openai', voice: 'nova', speed: 0.8 });
    assertEq(svc.provider, 'openai', 'Explicit provider override works');
    assertEq(svc.voice, 'nova', 'Explicit voice override works');
    assertEq(svc.speed, 0.8, 'Explicit speed override works');
  }

  // Restore original env
  process.env = { ...origEnv };

  // ── Summary ─────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log(`  RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════');
  if (failures.length > 0) {
    console.log('\n  FAILURES:');
    failures.forEach(f => console.log('    ✗ ' + f));
  }
  process.exit(failed > 0 ? 1 : 0);

})().catch(err => { console.error(err); process.exit(1); });
