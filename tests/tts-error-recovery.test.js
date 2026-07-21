/**
 * tests/tts-error-recovery.test.js — TTS Error Recovery Tests
 *
 * Tests: createTTSWithRecovery, TTSFailureLogger, CircuitBreaker integration,
 *        retry with backoff, provider fallback chain, circuit breaker bypass.
 */

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Force mock provider — no API keys needed
process.env.TTS_PROVIDER = 'mock';

const {
  createTTSService,
  createTTSWithRecovery,
  TTSFailureLogger,
  CircuitBreaker,
} = require('../src/voice/tts-service');

describe('TTS Failure Logger', () => {
  it('logs failures with context', () => {
    const logger = new TTSFailureLogger();
    logger.log({
      provider: 'novita',
      error: new Error('API timeout'),
      attempt: 1,
      text: 'Hello world this is a test',
    });

    const recent = logger.getRecent();
    assert.equal(recent.length, 1);
    assert.equal(recent[0].provider, 'novita');
    assert.equal(recent[0].error, 'API timeout');
    assert.equal(recent[0].attempt, 1);
    assert.ok(recent[0].timestamp > 0);
    assert.equal(recent[0].textPreview, 'Hello world this is a test');
  });

  it('truncates text preview to 120 chars', () => {
    const logger = new TTSFailureLogger();
    const longText = 'A'.repeat(200);
    logger.log({
      provider: 'openai',
      error: new Error('rate limited'),
      attempt: 2,
      text: longText,
    });

    const recent = logger.getRecent();
    assert.equal(recent[0].textPreview.length, 120);
  });

  it('counts failures by provider', () => {
    const logger = new TTSFailureLogger();
    logger.log({ provider: 'novita', error: new Error('a'), attempt: 1, text: '' });
    logger.log({ provider: 'novita', error: new Error('b'), attempt: 2, text: '' });
    logger.log({ provider: 'openai', error: new Error('c'), attempt: 1, text: '' });

    const counts = logger.getCounts();
    assert.equal(counts.novita, 2);
    assert.equal(counts.openai, 1);
  });

  it('respects max entries limit', () => {
    const logger = new TTSFailureLogger(5);
    for (let i = 0; i < 10; i++) {
      logger.log({ provider: 'test', error: new Error(`e${i}`), attempt: i, text: '' });
    }

    const recent = logger.getRecent();
    assert.equal(recent.length, 5);
    assert.equal(recent[0].error, 'e5'); // oldest kept
    assert.equal(recent[4].error, 'e9'); // newest
  });

  it('clear() empties the log', () => {
    const logger = new TTSFailureLogger();
    logger.log({ provider: 'test', error: new Error('x'), attempt: 1, text: '' });
    assert.equal(logger.getRecent().length, 1);

    logger.clear();
    assert.equal(logger.getRecent().length, 0);
    assert.deepEqual(logger.getCounts(), {});
  });
});

describe('createTTSWithRecovery — Mock Provider (happy path)', () => {
  it('generates audio with mock provider', async () => {
    const svc = createTTSWithRecovery({ provider: 'mock' }, { maxRetries: 0 });
    const result = await svc.generate('The candle flickers in the darkness.');

    assert.equal(result.status, 'complete');
    assert.ok(result.audioBase64, 'should have audioBase64');
    assert.equal(result.audioType, 'wav');
    assert.ok(result.taskId.startsWith('mock_'));
  });

  it('skips empty text', async () => {
    const svc = createTTSWithRecovery({ provider: 'mock' }, { maxRetries: 0 });
    const result = await svc.generate('');

    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'empty text');
  });

  it('skips null text', async () => {
    const svc = createTTSWithRecovery({ provider: 'mock' }, { maxRetries: 0 });
    const result = await svc.generate(null);

    assert.equal(result.status, 'skipped');
  });

  it('exposes provider, voice, speed, language', () => {
    const svc = createTTSWithRecovery({ provider: 'mock', speed: 1.5 });
    assert.equal(svc.provider, 'mock');
    assert.ok(svc.voice);
    assert.equal(svc.speed, 1.5);
    assert.equal(svc.language, 'en-US');
  });

  it('isReady() returns true', () => {
    const svc = createTTSWithRecovery({ provider: 'mock' });
    assert.equal(svc.isReady(), true);
  });

  it('getRecoveryStats() returns initial state', () => {
    const svc = createTTSWithRecovery({ provider: 'mock' });
    const stats = svc.getRecoveryStats();

    assert.deepEqual(stats.failures, {});
    assert.equal(stats.recentFailures.length, 0);
    assert.equal(stats.circuitBreaker.state, 'closed');
    assert.equal(stats.circuitBreaker.failureCount, 0);
    assert.ok(Array.isArray(stats.fallbackChain));
    assert.ok(stats.fallbackChain.includes('mock'));
  });
});

describe('createTTSWithRecovery — Retry Logic', () => {
  it('retries on failure and falls back to mock', async () => {
    // Use a provider that doesn't exist (no API key) — will fail then fall back
    const svc = createTTSWithRecovery(
      { provider: 'openai' }, // No OPENAI_API_KEY set — will fail
      {
        maxRetries: 0,  // No retries per provider — just fail fast and fallback
        baseDelayMs: 10,
        fallbackChain: ['openai', 'mock'],
      }
    );

    const result = await svc.generate('Test fallback');
    assert.equal(result.status, 'complete');
    assert.ok(result.audioBase64, 'fallback to mock should produce audio');
  });

  it('tracks failure counts in recovery stats', async () => {
    const svc = createTTSWithRecovery(
      { provider: 'openai' },
      { maxRetries: 0, fallbackChain: ['openai', 'mock'] }
    );

    await svc.generate('Track failures');
    const stats = svc.getRecoveryStats();

    // Should have logged at least one failure (openai missing key)
    assert.ok(stats.failures['openai'] >= 1 || stats.recentFailures.length >= 1,
      'should track openai failure');
  });

  it('multiple generations accumulate stats', async () => {
    const svc = createTTSWithRecovery({ provider: 'mock' }, { maxRetries: 0 });

    await svc.generate('First');
    await svc.generate('Second');
    await svc.generate('Third');

    const stats = svc.getRecoveryStats();
    assert.equal(stats.circuitBreaker.state, 'closed');
    // No failures since mock works
    assert.deepEqual(stats.failures, {});
  });
});

describe('createTTSWithRecovery — Circuit Breaker', () => {
  it('circuit breaker starts closed', () => {
    const svc = createTTSWithRecovery({ provider: 'mock' });
    assert.equal(svc.circuitBreaker.state, 'closed');
    assert.equal(svc.circuitBreaker.isClosed, true);
  });

  it('circuit breaker records failures', () => {
    const cb = new CircuitBreaker({ threshold: 2, windowMs: 60000 });
    assert.equal(cb.isClosed, true);

    cb.recordFailure();
    assert.equal(cb.state, 'closed');
    assert.equal(cb.isClosed, true);

    cb.recordFailure();
    assert.equal(cb.state, 'open');
    assert.equal(cb.isClosed, false);
  });

  it('circuit breaker recovers on success', () => {
    const cb = new CircuitBreaker({ threshold: 2, windowMs: 60000 });
    cb.recordFailure();
    cb.recordFailure();
    assert.equal(cb.state, 'open');

    // Simulate time passing by resetting
    cb.reset();
    assert.equal(cb.state, 'closed');
    assert.equal(cb.isClosed, true);
  });

  it('circuit breaker half-open allows request after window', () => {
    const cb = new CircuitBreaker({ threshold: 1, windowMs: 1 }); // 1ms window
    cb.recordFailure();
    assert.equal(cb.state, 'open');

    // Wait for window to expire
    const start = Date.now();
    while (Date.now() - start < 5) {} // spin 5ms

    assert.equal(cb.allowRequest(), true); // half-open → allows probe
    assert.equal(cb.state, 'half-open');
  });
});

describe('createTTSWithRecovery — Edge Cases', () => {
  it('handles SSML-wrapped text', async () => {
    const svc = createTTSWithRecovery({ provider: 'mock' }, { maxRetries: 0 });
    const result = await svc.generate('The door creaks open.', { ssml: true });

    assert.equal(result.status, 'complete');
    assert.ok(result.audioBase64);
  });

  it('handles SSML disabled', async () => {
    const svc = createTTSWithRecovery({ provider: 'mock' }, { maxRetries: 0 });
    const result = await svc.generate('The door creaks open.', { ssml: false });

    assert.equal(result.status, 'complete');
    assert.ok(result.audioBase64);
  });

  it('handles character options', async () => {
    const svc = createTTSWithRecovery({ provider: 'mock' }, { maxRetries: 0 });
    const result = await svc.generate('You dare enter my domain?', {
      characterName: 'Count Dracula',
      adventureId: 'dracula',
    });

    assert.equal(result.status, 'complete');
  });

  it('handles very long text (truncation)', async () => {
    const svc = createTTSWithRecovery({ provider: 'mock' }, { maxRetries: 0 });
    const longText = 'The darkness stretches on forever. '.repeat(100);
    const result = await svc.generate(longText);

    assert.equal(result.status, 'complete');
    assert.ok(result.audioBase64);
  });

  it('custom fallback chain works', async () => {
    const svc = createTTSWithRecovery(
      { provider: 'mock' },
      {
        maxRetries: 0,
        fallbackChain: ['elevenlabs', 'novita', 'openai', 'mock'],
      }
    );

    // All real providers fail (no API keys), falls back to mock
    const result = await svc.generate('Custom chain test');
    assert.equal(result.status, 'complete');
    assert.ok(result.audioBase64);
  });

  it('deduplicates fallback chain', () => {
    const svc = createTTSWithRecovery(
      { provider: 'mock' },
      {
        fallbackChain: ['mock', 'mock', 'openai', 'mock'],
      }
    );

    const stats = svc.getRecoveryStats();
    // mock appears once, openai once, mock appended at end only if missing
    assert.equal(stats.fallbackChain[0], 'mock');
    assert.equal(stats.fallbackChain[1], 'openai');
    // Length should be 2 (mock + openai), not 4
    assert.equal(stats.fallbackChain.length, 2);
  });
});
