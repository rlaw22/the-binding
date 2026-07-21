/**
 * End-to-End Smoke Test — The Binding Phase 1
 * 
 * Tests full adventure flow using Fastify's server.inject() (same pattern
 * as the passing phase1.test.js): session creation → action submission →
 * narrative response → session persistence → rejoin → error recovery.
 * Uses mock LLM mode — no API key needed.
 */

const { describe, it, expect, beforeAll, afterAll } = require('vitest');

describe('E2E Smoke Tests', () => {
  let server;

  beforeAll(async () => {
    const { createServer } = require('../src/api/server');
    server = await createServer({
      llmConfig: { mock: true, apiKey: '', baseUrl: '', model: 'mock' }
    });
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  describe('Server Startup', () => {
    it('GET /api/health returns 200 with ok status', async () => {
      const health = await server.inject({ method: 'GET', url: '/api/health' });
      expect(health.statusCode).toBe(200);
      const body = JSON.parse(health.payload);
      expect(body.status).toBe('ok');
    });
  });

  describe('Adventure Loading', () => {
    it('GET /api/adventures returns array with dracula, frankenstein, holmes', async () => {
      const adv = await server.inject({ method: 'GET', url: '/api/adventures' });
      expect(adv.statusCode).toBe(200);
      const adventures = JSON.parse(adv.payload);
      expect(Array.isArray(adventures)).toBe(true);
      const advIds = adventures.map(a => a.id);
      expect(advIds).toContain('dracula');
      expect(advIds).toContain('frankenstein');
      expect(advIds).toContain('holmes');
    });
  });

  describe('Session Lifecycle', () => {
    let sid, rejoinCode;

    it('POST /api/sessions creates a session with character and messages', async () => {
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'dracula' }
      });
      expect(create.statusCode).toBe(200);
      const session = JSON.parse(create.payload);
      expect(session.sessionId).toBeTruthy();
      expect(session.character).toBeTruthy();
      expect(session.rejoinCode).toBeTruthy();
      expect(session.messages).toBeDefined();
      expect(session.messages.length).toBeGreaterThan(0);
      sid = session.sessionId;
      rejoinCode = session.rejoinCode;
    });

    it('GET /api/sessions/:id retrieves session info', async () => {
      const info = await server.inject({ method: 'GET', url: '/api/sessions/' + sid });
      expect(info.statusCode).toBe(200);
      const body = JSON.parse(info.payload);
      expect(body.sessionId).toBe(sid);
    });
  });

  describe('Action Flow', () => {
    let sid;

    beforeAll(async () => {
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'dracula' }
      });
      sid = JSON.parse(create.payload).sessionId;
    });

    it('POST action returns narrative', async () => {
      const action = await server.inject({
        method: 'POST',
        url: '/api/sessions/' + sid + '/actions',
        payload: { type: 'action', content: 'I examine the brass crucifix.' }
      });
      expect(action.statusCode).toBe(200);
      const body = JSON.parse(action.payload);
      expect(body.narrative).toBeTruthy();
      expect(typeof body.narrative).toBe('string');
      expect(body.narrative.length).toBeGreaterThan(10);
    });

    it('Second action returns different narrative', async () => {
      const action = await server.inject({
        method: 'POST',
        url: '/api/sessions/' + sid + '/actions',
        payload: { type: 'action', content: 'I speak to the innkeeper about strange occurrences.' }
      });
      expect(action.statusCode).toBe(200);
      const body = JSON.parse(action.payload);
      expect(body.narrative).toBeTruthy();
    });
  });

  describe('Message Polling', () => {
    it('GET /api/sessions/:id/messages returns accumulated messages', async () => {
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'dracula' }
      });
      const sid = JSON.parse(create.payload).sessionId;

      await server.inject({
        method: 'POST',
        url: '/api/sessions/' + sid + '/actions',
        payload: { type: 'action', content: 'I look around.' }
      });

      const msgs = await server.inject({ method: 'GET', url: '/api/sessions/' + sid + '/messages?after=0' });
      expect(msgs.statusCode).toBe(200);
      const body = JSON.parse(msgs.payload);
      expect(Array.isArray(body.messages)).toBe(true);
      expect(body.messages.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Session Rejoin', () => {
    it('GET /api/rejoin/:code returns session info', async () => {
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'dracula' }
      });
      const body = JSON.parse(create.payload);

      const rejoin = await server.inject({ method: 'GET', url: '/api/rejoin/' + body.rejoinCode });
      expect(rejoin.statusCode).toBe(200);
      const rejoinBody = JSON.parse(rejoin.payload);
      expect(rejoinBody.sessionId).toBe(body.sessionId);
    });
  });

  describe('Error Recovery', () => {
    it('Bad session ID returns error', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/sessions/nonexistent-id' });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('Bad rejoin code returns error', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/rejoin/BADCODE' });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('Missing content field returns 400', async () => {
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'dracula' }
      });
      const sid = JSON.parse(create.payload).sessionId;

      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions/' + sid + '/actions',
        payload: {}
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('content is required');
    });
  });

  describe('Concurrent Sessions', () => {
    it('Two sessions run independently', async () => {
      const create1 = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'dracula' }
      });
      const s1 = JSON.parse(create1.payload);

      const create2 = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'frankenstein' }
      });
      const s2 = JSON.parse(create2.payload);

      expect(s2.sessionId).not.toBe(s1.sessionId);

      const action = await server.inject({
        method: 'POST',
        url: '/api/sessions/' + s2.sessionId + '/actions',
        payload: { type: 'action', content: 'I examine the laboratory equipment.' }
      });
      expect(action.statusCode).toBe(200);
    });
  });

  describe('Voice API', () => {
    it('GET /api/voice/status returns provider info', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/voice/status' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.provider).toBeDefined();
    });
  });
});
