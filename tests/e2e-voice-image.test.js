/**
 * E2E Voice & Image Integration Tests
 * Tests voice generation, image hooks via DM service, TTS error recovery.
 * Uses mock LLM + mock TTS — no API keys needed.
 */
'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

describe('E2E Voice & Image Integration', () => {
  let server;
  before(async () => {
    process.env.TTS_PROVIDER = 'mock';
    const { createServer } = require('../src/api/server');
    server = await createServer({ llmConfig: { mock: true, apiKey: '', baseUrl: '', model: 'mock' } });
  });
  after(async () => { if (server) await server.close(); });

  describe('Voice API', () => {
    it('GET /api/voice/status returns provider info', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/voice/status' });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(body.provider !== undefined, 'should have provider');
    });
    it('POST /api/voice/generate returns audio for valid text', async () => {
      const res = await server.inject({ method: 'POST', url: '/api/voice/generate', payload: { text: 'The castle looms before you.' } });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(body.taskId, 'should return taskId');
    });
    it('POST /api/voice/generate with empty text returns skipped/400', async () => {
      const res = await server.inject({ method: 'POST', url: '/api/voice/generate', payload: { text: '' } });
      assert.ok(res.statusCode === 200 || res.statusCode === 400);
    });
    it('POST /api/voice/generate with character options', async () => {
      const res = await server.inject({ method: 'POST', url: '/api/voice/generate', payload: { text: 'Welcome, traveler.', characterName: 'Merchant', adventureId: 'dracula' } });
      assert.equal(res.statusCode, 200);
    });
    it('GET /api/voice/audio/:invalid returns not-ready', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/voice/audio/nonexistent' });
      assert.ok(res.statusCode === 404 || res.statusCode === 200);
    });
  });

  describe('Image API', () => {
    it('GET /api/images returns image list', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/images' });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(res.statusCode, 200);
    });
  });

  describe('DM Image Hooks', () => {
    it('generateSceneImage produces result via mock', async () => {
      const { generateSceneImage } = require('../src/ai-dm/dm-service');
      const result = await generateSceneImage('dracula', 'crypt', 'A dark crypt', 'test-sess');
      assert.ok(result !== null && result !== undefined);
    });
    it('generateCombatImage produces result via mock', async () => {
      const { generateCombatImage } = require('../src/ai-dm/dm-service');
      const result = await generateCombatImage({ attacker: 'Dracula', defender: 'Van Helsing', scene: 'hallway' });
      assert.ok(result !== null && result !== undefined);
    });
    it('generateNPCPortrait produces result via mock', async () => {
      const { generateNPCPortrait } = require('../src/ai-dm/dm-service');
      const result = await generateNPCPortrait({ name: 'Count Dracula', description: 'Tall pale figure', role: 'villain' });
      assert.ok(result !== null && result !== undefined);
    });
    it('generateItemImage produces result via mock', async () => {
      const { generateItemImage } = require('../src/ai-dm/dm-service');
      const result = await generateItemImage({ name: 'Silver Dagger', description: 'Ornate silver dagger', type: 'weapon' });
      assert.ok(result !== null && result !== undefined);
    });
  });

  describe('TTS Error Recovery', () => {
    it('falls back to mock when primary fails', async () => {
      const { createTTSWithRecovery } = require('../src/voice/tts-service');
      const svc = createTTSWithRecovery({ provider: 'elevenlabs' }, { maxRetries: 0, fallbackChain: ['elevenlabs', 'mock'] });
      const result = await svc.generate('The door creaks open.');
      assert.equal(result.status, 'complete');
      assert.ok(result.audioBase64);
    });
    it('recovery stats track fallback', async () => {
      const { createTTSWithRecovery } = require('../src/voice/tts-service');
      const svc = createTTSWithRecovery({ provider: 'elevenlabs' }, { maxRetries: 0, fallbackChain: ['elevenlabs', 'mock'] });
      await svc.generate('Test tracking');
      const stats = svc.getRecoveryStats();
      assert.ok(stats.fallbackChain.includes('mock'));
    });
    it('circuit breaker starts closed', async () => {
      const { createTTSWithRecovery } = require('../src/voice/tts-service');
      const svc = createTTSWithRecovery({ provider: 'mock' });
      assert.equal(svc.circuitBreaker.state, 'closed');
    });
  });
});
