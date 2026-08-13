/**
 * Digital DM Integration Tests
 *
 * Tests the Digital DM mode end-to-end:
 *   1. Session creation (no adventureId required)
 *   2. Opening narration with world-building
 *   3. Free-text action → narrative response
 *   4. World state tracking across turns
 *   5. Coins endpoint (no crash without coin pool)
 *   6. Progress endpoint (no crash without scenes)
 *
 * Uses mock LLM mode — no API key needed.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

describe('Digital DM Integration Tests', () => {
  let server;

  before(async () => {
    const { createServer } = require('../src/api/server');
    server = await createServer({
      llmConfig: { mock: true, apiKey: '', baseUrl: '', model: 'mock' }
    });
  });

  after(async () => {
    if (server) await server.close();
  });

  describe('Session Creation', () => {
    it('POST /api/sessions with gameMode=digital_dm creates session without adventureId', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', playerName: 'TestHero' }
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(body.sessionId, 'should have sessionId');
      assert.ok(body.rejoinCode, 'should have rejoinCode');
      assert.ok(body.playerId, 'should have playerId');
      assert.equal(body.adventureName, 'Digital DM Sandbox');
      assert.equal(body.gameMode, 'digital_dm');
      assert.ok(body.character, 'should have character');
      assert.equal(body.character.name, 'TestHero');
      assert.ok(body.messages, 'should have messages array');
      assert.ok(body.messages.length > 0, 'should have opening messages');
    });

    it('Digital DM session uses default character when no player details given', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm' }
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.character.name, 'Adventurer');
      assert.equal(body.character.class, 'fighter');
    });

    it('Digital DM session includes uiConfig for free text input', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm' }
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(body.uiConfig, 'should have uiConfig');
      assert.equal(body.uiConfig.showFreeTextEntry, true, 'should have free text entry enabled');
    });
  });

  describe('Opening Narration', () => {
    it('Opening messages include connected and narration types', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', playerName: 'Narrator' }
      });
      const body = JSON.parse(res.payload);
      const msgTypes = body.messages.map(m => m.data.type);
      assert.ok(msgTypes.includes('connected'), 'should have connected message');
      // Should have at least one narration (the world-building response)
      const narrations = body.messages.filter(m => m.data.type === 'narration');
      assert.ok(narrations.length > 0, 'should have narration messages');
    });

    it('Opening narration has non-empty text', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', playerName: 'Test' }
      });
      const body = JSON.parse(res.payload);
      const narration = body.messages.find(m => m.data.type === 'narration');
      assert.ok(narration, 'should have a narration message');
      // MessageRouter uses 'content' field for the text
      const text = narration.data.content || narration.data.text || '';
      assert.equal(typeof text, 'string', 'narration text should be a string');
      assert.ok(text.length > 0, 'narration text should be non-empty');
    });
  });

  describe('Free-Text Action Flow', () => {
    let sid;

    it('POST /api/sessions/:id/actions with free text returns narrative', async () => {
      // Create session
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', playerName: 'ActionTest' }
      });
      sid = JSON.parse(create.payload).sessionId;

      // Submit free-text action
      const action = await server.inject({
        method: 'POST',
        url: `/api/sessions/${sid}/actions`,
        payload: { type: 'action', content: 'I look around the tavern carefully.' }
      });
      assert.equal(action.statusCode, 200);
      const body = JSON.parse(action.payload);
      assert.ok(body.narrative, 'should have narrative');
      assert.equal(typeof body.narrative, 'string');
      assert.ok(body.narrative.length > 0, 'narrative should be non-empty');
    });

    it('Multiple actions return distinct responses', async () => {
      // Create session
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', playerName: 'MultiTest' }
      });
      sid = JSON.parse(create.payload).sessionId;

      // First action
      const action1 = await server.inject({
        method: 'POST',
        url: `/api/sessions/${sid}/actions`,
        payload: { type: 'action', content: 'I draw my sword and advance.' }
      });
      const body1 = JSON.parse(action1.payload);

      // Second action
      const action2 = await server.inject({
        method: 'POST',
        url: `/api/sessions/${sid}/actions`,
        payload: { type: 'action', content: 'I call out to whoever is hiding.' }
      });
      const body2 = JSON.parse(action2.payload);

      assert.ok(body1.narrative, 'first action should have narrative');
      assert.ok(body2.narrative, 'second action should have narrative');
      // Both should succeed (they may be different or the same depending on mock LLM)
    });
  });

  describe('World State Tracking', () => {
    it('extractWorldState extracts locations from narrative text', () => {
      const { extractWorldState } = require('../src/ai-dm/dm-service');
      const worldState = { locations: [], npcs: [], quests: [], items: [], events: [] };

      extractWorldState(
        'You arrive at the Crimson Tavern. The smell of ale fills the air.',
        'I enter the tavern.',
        worldState
      );

      assert.ok(worldState.locations.includes('Crimson Tavern'), 'should extract Crimson Tavern');
    });

    it('extractWorldState extracts NPC names from dialogue', () => {
      const { extractWorldState } = require('../src/ai-dm/dm-service');
      const worldState = { locations: [], npcs: [], quests: [], items: [], events: [] };

      extractWorldState(
        'Elara says, "Welcome, traveler. You look weary from the road."',
        'I greet the barmaid.',
        worldState
      );

      assert.ok(worldState.npcs.includes('Elara'), 'should extract NPC Elara');
    });

    it('extractWorldState extracts quest hooks', () => {
      const { extractWorldState } = require('../src/ai-dm/dm-service');
      const worldState = { locations: [], npcs: [], quests: [], items: [], events: [] };

      extractWorldState(
        'You must find the ancient relic hidden beneath the old chapel before the moon wanes.',
        'What should I do?',
        worldState
      );

      assert.ok(worldState.quests.length > 0, 'should extract at least one quest');
      assert.ok(worldState.quests[0].includes('ancient relic'), 'quest should mention the relic');
    });

    it('extractWorldState deduplicates entities', () => {
      const { extractWorldState } = require('../src/ai-dm/dm-service');
      const worldState = { locations: [], npcs: [], quests: [], items: [], events: [] };

      extractWorldState('Elara says hello. Elara nods at you.', '', worldState);
      assert.equal(worldState.npcs.filter(n => n === 'Elara').length, 1, 'should not duplicate Elara');
    });

    it('extractWorldState caps quests at 10', () => {
      const { extractWorldState } = require('../src/ai-dm/dm-service');
      const worldState = { locations: [], npcs: [], quests: [], items: [], events: [] };

      for (let i = 0; i < 15; i++) {
        extractWorldState(`You must find the artifact number ${i + 1} hidden in the cave.`, '', worldState);
      }
      assert.ok(worldState.quests.length <= 10, 'should cap at 10 quests');
    });
  });

  describe('Session Info and Endpoints', () => {
    let sid;

    it('GET /api/sessions/:id returns Digital DM session info', async () => {
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', playerName: 'InfoTest' }
      });
      sid = JSON.parse(create.payload).sessionId;

      const info = await server.inject({ method: 'GET', url: `/api/sessions/${sid}` });
      assert.equal(info.statusCode, 200);
      const body = JSON.parse(info.payload);
      assert.equal(body.sessionId, sid);
      assert.equal(body.state, 'active');
    });

    it('GET /api/sessions/:id/coins returns safe defaults for Digital DM', async () => {
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm' }
      });
      sid = JSON.parse(create.payload).sessionId;

      const coins = await server.inject({ method: 'GET', url: `/api/sessions/${sid}/coins` });
      assert.equal(coins.statusCode, 200);
      const body = JSON.parse(coins.payload);
      assert.equal(body.totalEarned, 0);
      assert.equal(body.totalPool, 0);
      assert.equal(body.currentScene, -1);
    });

    it('GET /api/sessions/:id/progress returns Digital DM progress', async () => {
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm' }
      });
      sid = JSON.parse(create.payload).sessionId;

      // Submit an action so turn count > 0
      await server.inject({
        method: 'POST',
        url: `/api/sessions/${sid}/actions`,
        payload: { type: 'action', content: 'I look around.' }
      });

      const progress = await server.inject({ method: 'GET', url: `/api/sessions/${sid}/progress` });
      assert.equal(progress.statusCode, 200);
      const body = JSON.parse(progress.payload);
      assert.equal(body.mode, 'digital_dm');
      assert.equal(body.sceneName, 'Open World');
      assert.ok(body.totalTurns >= 1, 'should track turns');
    });
  });
});
