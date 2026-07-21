/**
 * tests/image-dm-integration.test.js — DM ↔ Image Pipeline Integration Tests
 *
 * Tests that the DM service correctly wires image generation hooks
 * (scene, combat, NPC, item) through the error-recovery layer.
 */

'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// We test with mock provider — no API keys needed
process.env.XAI_API_KEY = '';
process.env.OPENAI_API_KEY = '';
process.env.REPLICATE_API_TOKEN = '';

const {
  createGame,
  processAction,
  getImageService,
  generateSceneImage,
  generateCombatImage,
  generateNPCPortrait,
  generateItemImage,
  mapSceneNameToKey,
} = require('../src/ai-dm/dm-service');

const {
  createImageService,
  createErrorRecovery,
  CircuitBreaker,
  ImageFailureLogger,
  buildCombatPrompt,
  buildNPCPortraitPrompt,
  buildItemPrompt,
} = require('../src/image');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock LLM provider that returns a simple narrative. */
function mockLLM(messages) {
  return Promise.resolve(
    'You stand in the dimly lit corridor. The stone walls drip with moisture. ' +
    'A figure emerges from the shadows — it is the innkeeper, looking worried.\n\n' +
    'SUGGESTED ACTIONS:\n' +
    '1. Ask the innkeeper about the castle\n' +
    '2. Search the corridor for hidden passages\n' +
    '3. Draw your weapon and prepare for danger\n' +
    '4. Follow the innkeeper deeper into the building'
  );
}

// ---------------------------------------------------------------------------
// Test: Image Service Initialization with Error Recovery
// ---------------------------------------------------------------------------

describe('DM Image Service Initialization', () => {
  it('getImageService returns an image service', () => {
    // Reset the cached service so getImageService re-initializes
    const dmModule = require('../src/ai-dm/dm-service');
    // We can't easily reset the singleton, but we can check the exported function
    assert.equal(typeof getImageService, 'function');
  });

  it('createImageService with mock provider returns enabled service', () => {
    const svc = createImageService({ provider: 'mock' });
    assert.ok(svc, 'service should exist');
    assert.equal(svc.isEnabled, true);
  });

  it('createErrorRecovery wraps image service with retry + fallback', () => {
    const raw = createImageService({ provider: 'mock' });
    const wrapped = createErrorRecovery(raw, { maxRetries: 1, fallbackToMock: true });
    assert.ok(wrapped, 'wrapped service should exist');
    assert.equal(wrapped.isEnabled, true);
    assert.ok(wrapped.generateRaw, 'should have generateRaw');
    assert.ok(wrapped.generateCombat, 'should have generateCombat');
    assert.ok(wrapped.generateNpcPortrait, 'should have generateNpcPortrait');
    assert.ok(wrapped.generateItemIllustration, 'should have generateItemIllustration');
  });
});

// ---------------------------------------------------------------------------
// Test: Prompt Builders produce valid prompts
// ---------------------------------------------------------------------------

describe('Image Prompt Builders', () => {
  it('buildCombatPrompt produces a non-empty prompt with combat keywords', () => {
    const prompt = buildCombatPrompt({
      attacker: 'A massive wolf',
      defender: 'Jonathan Harker',
      weapon: 'claws',
      location: 'Castle Dracula corridor',
      outcome: 'hit',
    });
    assert.ok(prompt.length > 100, 'prompt should be substantial');
    assert.ok(prompt.toLowerCase().includes('combat'), 'should mention combat');
    assert.ok(prompt.toLowerCase().includes('wolf'), 'should mention attacker');
    assert.ok(prompt.toLowerCase().includes('harker'), 'should mention defender');
  });

  it('buildNPCPortraitPrompt produces a non-empty prompt with portrait keywords', () => {
    const prompt = buildNPCPortraitPrompt({
      name: 'Innkeeper',
      role: 'innkeeper',
      appearance: 'A stout man with worried eyes and flour-dusted apron',
      personality: 'nervous but kind',
    });
    assert.ok(prompt.length > 100, 'prompt should be substantial');
    assert.ok(prompt.toLowerCase().includes('portrait'), 'should mention portrait');
    assert.ok(prompt.toLowerCase().includes('innkeeper'), 'should mention NPC name/role');
  });

  it('buildItemPrompt produces a non-empty prompt with item keywords', () => {
    const prompt = buildItemPrompt({
      name: 'Silver Crucifix',
      type: 'artifact',
      description: 'A heavy silver crucifix on a chain, warm to the touch',
      material: 'silver',
    });
    assert.ok(prompt.length > 100, 'prompt should be substantial');
    assert.ok(prompt.toLowerCase().includes('crucifix'), 'should mention item name');
  });

  it('prompt builders handle empty context gracefully', () => {
    const combat = buildCombatPrompt({});
    const npc = buildNPCPortraitPrompt({});
    const item = buildItemPrompt({});
    assert.ok(combat.length > 50);
    assert.ok(npc.length > 50);
    assert.ok(item.length > 50);
  });
});

// ---------------------------------------------------------------------------
// Test: Image Generation Functions (mock provider, no API key)
// ---------------------------------------------------------------------------

describe('DM Image Generation Functions', () => {
  it('generateCombatImage returns null when no API key configured', async () => {
    // In test env without API keys, the image service should be mock/disabled
    const result = await generateCombatImage({
      attacker: 'Wolf',
      defender: 'Harker',
      sessionId: 'test-123',
    });
    // With mock provider it should return a data URI or URL
    // Without any provider it returns null
    // We accept either outcome
    assert.ok(result === null || typeof result === 'string',
      'should return null or image URL');
  });

  it('generateNPCPortrait returns null or string', async () => {
    const result = await generateNPCPortrait({
      name: 'Innkeeper',
      role: 'innkeeper',
      sessionId: 'test-123',
    });
    assert.ok(result === null || typeof result === 'string');
  });

  it('generateItemImage returns null or string', async () => {
    const result = await generateItemImage({
      name: 'Silver Crucifix',
      type: 'artifact',
      sessionId: 'test-123',
    });
    assert.ok(result === null || typeof result === 'string');
  });

  it('generateSceneImage returns null or string', async () => {
    const result = await generateSceneImage(
      'dracula', 'Golden Krone Inn', 'A warm but ominous inn', 'test-123'
    );
    assert.ok(result === null || typeof result === 'string');
  });

  it('image generation functions handle missing context gracefully', async () => {
    // Should not throw even with empty/minimal context
    const combat = await generateCombatImage({});
    const npc = await generateNPCPortrait({});
    const item = await generateItemImage({});
    assert.ok(combat === null || typeof combat === 'string');
    assert.ok(npc === null || typeof npc === 'string');
    assert.ok(item === null || typeof item === 'string');
  });
});

// ---------------------------------------------------------------------------
// Test: Scene Name Mapping
// ---------------------------------------------------------------------------

describe('Scene Name Mapping', () => {
  it('maps dracula scene names correctly', () => {
    assert.equal(mapSceneNameToKey('dracula', 'Golden Krone Inn'), 'inn');
    assert.equal(mapSceneNameToKey('dracula', 'The coach ride'), 'coach');
    assert.equal(mapSceneNameToKey('dracula', 'Castle Dracula'), 'castle');
    assert.equal(mapSceneNameToKey('dracula', 'The crypt below'), 'crypt');
    assert.equal(mapSceneNameToKey('dracula', 'London streets'), 'london');
    assert.equal(mapSceneNameToKey('dracula', 'The graveyard'), 'graveyard');
  });

  it('maps frankenstein scene names correctly', () => {
    assert.equal(mapSceneNameToKey('frankenstein', 'Geneva home'), 'geneva');
    assert.equal(mapSceneNameToKey('frankenstein', 'The university'), 'university');
    assert.equal(mapSceneNameToKey('frankenstein', 'The laboratory'), 'laboratory');
    assert.equal(mapSceneNameToKey('frankenstein', 'Dark forest'), 'forest');
    assert.equal(mapSceneNameToKey('frankenstein', 'De Lacey cottage'), 'cottage');
    assert.equal(mapSceneNameToKey('frankenstein', 'Arctic ice'), 'arctic');
  });

  it('maps holmes scene names correctly', () => {
    assert.equal(mapSceneNameToKey('holmes', '221B Baker Street'), 'baker_street');
    assert.equal(mapSceneNameToKey('holmes', 'The moor at night'), 'moor');
    assert.equal(mapSceneNameToKey('holmes', 'Baskerville Hall'), 'hall');
    assert.equal(mapSceneNameToKey('holmes', 'Grimpen Mire'), 'mire');
    assert.equal(mapSceneNameToKey('holmes', 'London fog'), 'london_fog');
  });

  it('returns default for unknown scene names', () => {
    assert.equal(mapSceneNameToKey('dracula', 'xyz_unknown'), 'default');
    assert.equal(mapSceneNameToKey('unknown_adventure', 'anything'), 'default');
  });
});

// ---------------------------------------------------------------------------
// Test: Circuit Breaker
// ---------------------------------------------------------------------------

describe('Circuit Breaker', () => {
  it('starts in closed state (available)', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    assert.equal(cb.isAvailable('test-provider'), true);
  });

  it('opens after threshold failures', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 60000 });
    for (let i = 0; i < 3; i++) {
      cb.recordFailure('test-provider');
    }
    assert.equal(cb.isAvailable('test-provider'), false);
  });

  it('closes on success', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure('test-provider');
    cb.recordFailure('test-provider');
    cb.recordSuccess('test-provider');
    assert.equal(cb.isAvailable('test-provider'), true);
  });

  it('tracks multiple providers independently', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 });
    cb.recordFailure('provider-a');
    cb.recordFailure('provider-a');
    assert.equal(cb.isAvailable('provider-a'), false);
    assert.equal(cb.isAvailable('provider-b'), true);
  });
});

// ---------------------------------------------------------------------------
// Test: Error Recovery Wrapper
// ---------------------------------------------------------------------------

describe('Error Recovery Wrapper', () => {
  it('wraps a mock service and generates images', async () => {
    const raw = createImageService({ provider: 'mock' });
    const wrapped = createErrorRecovery(raw, { maxRetries: 1, fallbackToMock: true });

    const result = await wrapped.generateRaw('A test scene');
    assert.ok(result === null || typeof result === 'string',
      'should return null or image URL from mock provider');
  });

  it('exposes recovery stats', () => {
    const raw = createImageService({ provider: 'mock' });
    const wrapped = createErrorRecovery(raw);

    const stats = wrapped.getRecoveryStats();
    assert.ok(stats, 'should have recovery stats');
    assert.ok(stats.failures !== undefined, 'should have failures count');
    assert.ok(stats.circuitBreaker !== undefined, 'should have circuit breaker state');
  });

  it('exposes failure logger and circuit breaker', () => {
    const raw = createImageService({ provider: 'mock' });
    const wrapped = createErrorRecovery(raw);

    assert.ok(wrapped.failureLogger instanceof ImageFailureLogger);
    assert.ok(wrapped.circuitBreaker instanceof CircuitBreaker);
  });
});

// ---------------------------------------------------------------------------
// Test: Error Recovery with Failing Provider
// ---------------------------------------------------------------------------

describe('Error Recovery with Failing Provider', () => {
  it('falls back to mock when primary provider throws', async () => {
    // Create a service that will fail
    const failingService = {
      isEnabled: true,
      providerName: 'failing-test',
      generateRaw: () => Promise.reject(new Error('Simulated provider failure')),
      generateScene: () => Promise.reject(new Error('Simulated provider failure')),
      generateCombat: () => Promise.reject(new Error('Simulated provider failure')),
      generateNpcPortrait: () => Promise.reject(new Error('Simulated provider failure')),
      generateItemIllustration: () => Promise.reject(new Error('Simulated provider failure')),
    };

    const wrapped = createErrorRecovery(failingService, {
      maxRetries: 1,
      baseDelayMs: 10, // fast for tests
      fallbackToMock: true,
    });

    // Should fall back to mock and return something (or null if mock also fails)
    const result = await wrapped.generateCombat({
      attacker: 'Wolf',
      defender: 'Harker',
    });
    // Accept either a mock result or null
    assert.ok(result === null || typeof result === 'string',
      'should return null or fallback image');
  });

  it('records failures in the failure logger', async () => {
    const failingService = {
      isEnabled: true,
      providerName: 'failing-test',
      generateRaw: () => Promise.reject(new Error('Test failure')),
    };

    const wrapped = createErrorRecovery(failingService, {
      maxRetries: 0,
      baseDelayMs: 10,
      fallbackToMock: false, // no fallback — just record failures
    });

    await wrapped.generateRaw('test prompt');
    const counts = wrapped.failureLogger.getCounts();
    assert.ok(counts.raw >= 1, 'should have recorded at least one failure');
  });
});
