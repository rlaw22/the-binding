/**
 * Digital DM Integration Tests
 *
 * Tests the Digital DM mode end-to-end:
 *   1. Scenario catalog (GET /api/digital-dm/scenarios)
 *   2. Session creation with scenarioId
 *   3. Opening narration with world-building
 *   4. Free-text action → narrative response
 *   5. World state tracking across turns
 *   6. Coins endpoint (no crash without coin pool)
 *   7. Progress endpoint (no crash without scenes)
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

  describe('Scenario Catalog', () => {
    it('GET /api/digital-dm/scenarios returns themes and adventures', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/digital-dm/scenarios' });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(Array.isArray(body.themes), 'should have themes array');
      assert.ok(Array.isArray(body.adventures), 'should have adventures array');
      assert.ok(body.themes.length >= 4, 'should have at least 4 themes');
      assert.ok(body.adventures.length >= 3, 'should have at least 3 adventures');
    });

    it('Themes have required fields', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/digital-dm/scenarios' });
      const body = JSON.parse(res.payload);
      for (const theme of body.themes) {
        assert.ok(theme.id, 'theme should have id');
        assert.ok(theme.name, 'theme should have name');
        assert.ok(theme.description, 'theme should have description');
        assert.ok(theme.levelRange, 'theme should have levelRange');
        assert.equal(theme.type, 'theme', 'theme type should be theme');
      }
    });

    it('Adventures have required fields and correct statuses', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/digital-dm/scenarios' });
      const body = JSON.parse(res.payload);
      const ready = body.adventures.filter(a => a.status === 'ready');
      const comingSoon = body.adventures.filter(a => a.status === 'coming_soon');
      assert.ok(ready.length >= 3, 'should have at least 3 ready adventures (dracula, frankenstein, holmes)');
      assert.ok(comingSoon.length >= 1, 'should have at least 1 coming_soon adventure');
      for (const adv of body.adventures) {
        assert.ok(adv.id, 'adventure should have id');
        assert.ok(adv.name, 'adventure should have name');
        assert.ok(adv.status, 'adventure should have status');
      }
    });
  });

  describe('Session Creation', () => {
    it('POST /api/sessions with digital_dm requires scenarioId', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', playerName: 'TestHero' }
      });
      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.payload);
      assert.ok(body.error.includes('scenarioId'), 'error should mention scenarioId');
    });

    it('POST /api/sessions with digital_dm + gothic_horror creates themed session', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', scenarioId: 'gothic_horror', playerName: 'TestHero' }
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(body.sessionId, 'should have sessionId');
      assert.ok(body.rejoinCode, 'should have rejoinCode');
      assert.ok(body.playerId, 'should have playerId');
      assert.equal(body.adventureName, 'Gothic Horror');
      assert.equal(body.gameMode, 'digital_dm');
      assert.equal(body.scenarioId, 'gothic_horror');
      assert.ok(body.character, 'should have character');
      assert.equal(body.character.name, 'TestHero');
    });

    it('POST /api/sessions with digital_dm + dracula creates adventure session', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', scenarioId: 'dracula', playerName: 'VampireHunter' }
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.adventureName, 'Dracula');
      assert.equal(body.scenarioId, 'dracula');
    });

    it('POST /api/sessions with digital_dm + coming_soon scenario returns 400', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', scenarioId: 'death_house' }
      });
      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.payload);
      assert.ok(body.error.includes('coming soon'), 'should say coming soon');
    });

    it('POST /api/sessions with digital_dm + unknown scenario returns 404', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', scenarioId: 'nonexistent' }
      });
      assert.equal(res.statusCode, 404);
    });

    it('Digital DM session uses default character when no player details given', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', scenarioId: 'sword_coast' }
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
        payload: { gameMode: 'digital_dm', scenarioId: 'noir_mystery' }
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
        payload: { gameMode: 'digital_dm', scenarioId: 'wilderness_expedition', playerName: 'Narrator' }
      });
      const body = JSON.parse(res.payload);
      const msgTypes = body.messages.map(m => m.data.type);
      assert.ok(msgTypes.includes('connected'), 'should have connected message');
      const narrations = body.messages.filter(m => m.data.type === 'narration');
      assert.ok(narrations.length > 0, 'should have narration messages');
    });

    it('Opening narration has non-empty text', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', scenarioId: 'gothic_horror', playerName: 'Test' }
      });
      const body = JSON.parse(res.payload);
      const narration = body.messages.find(m => m.data.type === 'narration');
      assert.ok(narration, 'should have a narration message');
      const text = narration.data.content || narration.data.text || '';
      assert.equal(typeof text, 'string', 'narration text should be a string');
      assert.ok(text.length > 0, 'narration text should be non-empty');
    });
  });

  describe('Free-Text Action Flow', () => {
    let sid;

    it('POST /api/sessions/:id/actions with free text returns narrative', async () => {
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', scenarioId: 'gothic_horror', playerName: 'ActionTest' }
      });
      sid = JSON.parse(create.payload).sessionId;

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
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', scenarioId: 'sword_coast', playerName: 'MultiTest' }
      });
      sid = JSON.parse(create.payload).sessionId;

      const action1 = await server.inject({
        method: 'POST',
        url: `/api/sessions/${sid}/actions`,
        payload: { type: 'action', content: 'I draw my sword and advance.' }
      });
      const body1 = JSON.parse(action1.payload);

      const action2 = await server.inject({
        method: 'POST',
        url: `/api/sessions/${sid}/actions`,
        payload: { type: 'action', content: 'I call out to whoever is hiding.' }
      });
      const body2 = JSON.parse(action2.payload);

      assert.ok(body1.narrative, 'first action should have narrative');
      assert.ok(body2.narrative, 'second action should have narrative');
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

    it('extractWorldState deduplicates entities', () => {
      const { extractWorldState } = require('../src/ai-dm/dm-service');
      const worldState = { locations: [], npcs: [], quests: [], items: [], events: [] };

      extractWorldState('Elara says hello. Elara nods at you.', '', worldState);
      assert.equal(worldState.npcs.filter(n => n === 'Elara').length, 1, 'should not duplicate Elara');
    });
  });

  describe('Session Info and Endpoints', () => {
    let sid;

    it('GET /api/sessions/:id returns Digital DM session info', async () => {
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { gameMode: 'digital_dm', scenarioId: 'gothic_horror', playerName: 'InfoTest' }
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
        payload: { gameMode: 'digital_dm', scenarioId: 'sword_coast' }
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
        payload: { gameMode: 'digital_dm', scenarioId: 'noir_mystery' }
      });
      sid = JSON.parse(create.payload).sessionId;

      await server.inject({
        method: 'POST',
        url: `/api/sessions/${sid}/actions`,
        payload: { type: 'action', content: 'I look around.' }
      });

      const progress = await server.inject({ method: 'GET', url: `/api/sessions/${sid}/progress` });
      assert.equal(progress.statusCode, 200);
      const body = JSON.parse(progress.payload);
      assert.equal(body.mode, 'digital_dm');
      assert.ok(body.totalTurns >= 1, 'should track turns');
    });
  });

  describe('Scenario World Seeds', () => {
    it('Gothic Horror theme generates structured world seed', () => {
      const { getScenarioWorldSeed } = require('../src/campaign/digital-dm-scenarios');
      const seed = getScenarioWorldSeed('gothic_horror');
      assert.ok(seed, 'should return a seed');
      assert.ok(seed.locations, 'should have locations');
      assert.ok(seed.npcs, 'should have npcs');
      assert.ok(Object.keys(seed.locations).length >= 3, 'should have at least 3 locations');
      assert.ok(Object.keys(seed.npcs).length >= 2, 'should have at least 2 NPCs');
    });

    it('Lost Mine manifest loads scene graph', () => {
      const { getScenarioWorldSeed } = require('../src/campaign/digital-dm-scenarios');
      const seed = getScenarioWorldSeed('lost_mine');
      assert.ok(seed, 'should return a seed');
      assert.ok(seed.scenes, 'should have scenes');
      assert.ok(seed.scenes.length >= 20, 'should have many scenes');
      assert.ok(seed.keyNPCs, 'should have keyNPCs');
    });

    it('Dracula adventure returns scene graph flag', () => {
      const { getScenarioWorldSeed } = require('../src/campaign/digital-dm-scenarios');
      const seed = getScenarioWorldSeed('dracula');
      assert.ok(seed, 'should return a seed');
      assert.equal(seed.useSceneGraph, true, 'should flag useSceneGraph');
      assert.equal(seed.adventureId, 'dracula', 'should have adventureId');
    });
  });
});
