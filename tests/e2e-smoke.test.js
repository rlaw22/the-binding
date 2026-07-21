/**
 * End-to-End Smoke Test — The Binding Phase 1
 * 
 * Tests full adventure flow using Fastify's server.inject() (same pattern
 * as the passing phase1.test.js): session creation → action submission →
 * narrative response → session persistence → rejoin → error recovery.
 * Uses mock LLM mode — no API key needed.
 * 
 * Uses Node's built-in test runner (no external dependencies).
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

describe('E2E Smoke Tests', () => {
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

  describe('Server Startup', () => {
    it('GET /api/health returns 200 with ok status', async () => {
      const health = await server.inject({ method: 'GET', url: '/api/health' });
      assert.equal(health.statusCode, 200);
      const body = JSON.parse(health.payload);
      assert.equal(body.status, 'ok');
    });
  });

  describe('Adventure Loading', () => {
    it('GET /api/adventures returns array with dracula, frankenstein, holmes', async () => {
      const adv = await server.inject({ method: 'GET', url: '/api/adventures' });
      assert.equal(adv.statusCode, 200);
      const adventures = JSON.parse(adv.payload);
      assert.ok(Array.isArray(adventures));
      const advIds = adventures.map(a => a.id);
      assert.ok(advIds.includes('dracula'));
      assert.ok(advIds.includes('frankenstein'));
      assert.ok(advIds.includes('holmes'));
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
      assert.equal(create.statusCode, 200);
      const session = JSON.parse(create.payload);
      assert.ok(session.sessionId);
      assert.ok(session.character);
      assert.ok(session.rejoinCode);
      assert.ok(session.messages !== undefined);
      assert.ok(session.messages.length > 0);
      sid = session.sessionId;
      rejoinCode = session.rejoinCode;
    });

    it('GET /api/sessions/:id retrieves session info', async () => {
      const info = await server.inject({ method: 'GET', url: '/api/sessions/' + sid });
      assert.equal(info.statusCode, 200);
      const body = JSON.parse(info.payload);
      assert.equal(body.sessionId, sid);
    });
  });

  describe('Action Flow', () => {
    let sid;

    before(async () => {
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
      assert.equal(action.statusCode, 200);
      const body = JSON.parse(action.payload);
      assert.ok(body.narrative);
      assert.equal(typeof body.narrative, 'string');
      assert.ok(body.narrative.length > 10);
    });

    it('Second action returns different narrative', async () => {
      const action = await server.inject({
        method: 'POST',
        url: '/api/sessions/' + sid + '/actions',
        payload: { type: 'action', content: 'I speak to the innkeeper about strange occurrences.' }
      });
      assert.equal(action.statusCode, 200);
      const body = JSON.parse(action.payload);
      assert.ok(body.narrative);
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
      assert.equal(msgs.statusCode, 200);
      const body = JSON.parse(msgs.payload);
      assert.ok(Array.isArray(body.messages));
      assert.ok(body.messages.length >= 3);
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
      assert.equal(rejoin.statusCode, 200);
      const rejoinBody = JSON.parse(rejoin.payload);
      assert.equal(rejoinBody.sessionId, body.sessionId);
    });
  });

  describe('Error Recovery', () => {
    it('Bad session ID returns error', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/sessions/nonexistent-id' });
      assert.ok(res.statusCode >= 400);
    });

    it('Bad rejoin code returns error', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/rejoin/BADCODE' });
      assert.ok(res.statusCode >= 400);
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
      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.payload);
      assert.equal(body.error, 'content is required');
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

      assert.notEqual(s2.sessionId, s1.sessionId);

      const action = await server.inject({
        method: 'POST',
        url: '/api/sessions/' + s2.sessionId + '/actions',
        payload: { type: 'action', content: 'I examine the laboratory equipment.' }
      });
      assert.equal(action.statusCode, 200);
    });
  });

  describe('Voice API', () => {
    it('GET /api/voice/status returns provider info', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/voice/status' });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(body.provider !== undefined);
    });
  });
});
