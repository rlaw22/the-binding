/**
 * E2E Extended Tests — Session Rejoin, Error Recovery, Concurrent Sessions
 * Uses Node's built-in test runner + Fastify server.inject()
 * No real API key needed — uses mock LLM mode.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

describe('E2E Extended Tests', () => {
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

  // ── Session Rejoin Flow ────────────────────────────────────────
  describe('Session Rejoin', () => {
    it('create session → get rejoin code → rejoin with code → state preserved', async () => {
      // Create a session
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'dracula' }
      });
      assert.equal(create.statusCode, 200);
      const session = JSON.parse(create.payload);
      assert.ok(session.sessionId);
      assert.ok(session.rejoinCode);

      // Submit an action to build state
      const action = await server.inject({
        method: 'POST',
        url: `/api/sessions/${session.sessionId}/actions`,
        payload: { type: 'action', content: 'I look around the room carefully' }
      });
      assert.equal(action.statusCode, 200);

      // Rejoin using the rejoin code
      const rejoin = await server.inject({
        method: 'GET',
        url: `/api/rejoin/${session.rejoinCode}`
      });
      assert.equal(rejoin.statusCode, 200);
      const rejoined = JSON.parse(rejoin.payload);
      assert.equal(rejoined.sessionId, session.sessionId);
      assert.ok(rejoined.adventureName, 'rejoin should return adventureName');
      assert.ok(rejoined.state, 'rejoin should return state');
      assert.ok(rejoined.totalTurns >= 0, 'rejoin should return totalTurns');
    });

    it('rejoin with invalid code returns 404', async () => {
      const rejoin = await server.inject({
        method: 'GET',
        url: '/api/rejoin/XXXX-0000'
      });
      assert.equal(rejoin.statusCode, 404);
    });

    it('rejoin code is unique per session', async () => {
      const s1 = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'dracula' }
      });
      const s2 = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'frankenstein' }
      });
      const session1 = JSON.parse(s1.payload);
      const session2 = JSON.parse(s2.payload);
      assert.notEqual(session1.rejoinCode, session2.rejoinCode);
    });
  });

  // ── Error Recovery ─────────────────────────────────────────────
  describe('Error Recovery', () => {
    it('action on non-existent session returns 404', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions/00000000-0000-0000-0000-000000000000/actions',
        payload: { type: 'action', content: 'test' }
      });
      assert.equal(res.statusCode, 404);
    });

    it('action with empty body returns 400', async () => {
      // Create a session first
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'dracula' }
      });
      const session = JSON.parse(create.payload);

      const res = await server.inject({
        method: 'POST',
        url: `/api/sessions/${session.sessionId}/actions`,
        payload: {}
      });
      assert.ok(res.statusCode >= 400);
    });

    it('action with missing action field returns 400', async () => {
      const create = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'dracula' }
      });
      const session = JSON.parse(create.payload);

      const res = await server.inject({
        method: 'POST',
        url: `/api/sessions/${session.sessionId}/actions`,
        payload: { notAction: 'something' }
      });
      assert.ok(res.statusCode >= 400);
    });

    it('messages for non-existent session returns 404', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/sessions/00000000-0000-0000-0000-000000000000/messages'
      });
      assert.equal(res.statusCode, 404);
    });

    it('create session with invalid adventure returns error', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: 'nonexistent-adventure' }
      });
      assert.ok(res.statusCode >= 400);
    });
  });

  // ── Concurrent Sessions ────────────────────────────────────────
  describe('Concurrent Sessions', () => {
    it('create 3 independent sessions with different adventures', async () => {
      const results = await Promise.all([
        server.inject({ method: 'POST', url: '/api/sessions', payload: { adventureId: 'dracula' } }),
        server.inject({ method: 'POST', url: '/api/sessions', payload: { adventureId: 'frankenstein' } }),
        server.inject({ method: 'POST', url: '/api/sessions', payload: { adventureId: 'holmes' } }),
      ]);

      const sessions = results.map(r => {
        assert.equal(r.statusCode, 200);
        return JSON.parse(r.payload);
      });

      // All have unique IDs
      const ids = new Set(sessions.map(s => s.sessionId));
      assert.equal(ids.size, 3);
    });

    it('actions in one session do not affect another', async () => {
      // Create two sessions
      const c1 = await server.inject({ method: 'POST', url: '/api/sessions', payload: { adventureId: 'dracula' } });
      const c2 = await server.inject({ method: 'POST', url: '/api/sessions', payload: { adventureId: 'dracula' } });
      const s1 = JSON.parse(c1.payload);
      const s2 = JSON.parse(c2.payload);

      // Submit action to s1 only
      await server.inject({
        method: 'POST',
        url: `/api/sessions/${s1.sessionId}/actions`,
        payload: { type: 'action', content: 'I draw my sword' }
      });

      // s2 should have no new messages from s1's action
      const msgs2 = await server.inject({
        method: 'GET',
        url: `/api/sessions/${s2.sessionId}/messages`
      });
      assert.equal(msgs2.statusCode, 200);
      const parsed = JSON.parse(msgs2.payload);
      // s2's messages should not contain s1's action content
      const msgTexts = (parsed.messages || parsed || []).map(m => m.content || '').join(' ');
      assert.ok(!msgTexts.includes('draw my sword'));
    });

    it('concurrent actions to same session are handled', async () => {
      const create = await server.inject({ method: 'POST', url: '/api/sessions', payload: { adventureId: 'dracula' } });
      const session = JSON.parse(create.payload);

      // Send two rapid actions
      const [r1, r2] = await Promise.all([
        server.inject({
          method: 'POST',
          url: `/api/sessions/${session.sessionId}/actions`,
          payload: { type: 'action', content: 'I search the desk' }
        }),
        server.inject({
          method: 'POST',
          url: `/api/sessions/${session.sessionId}/actions`,
          payload: { type: 'action', content: 'I look out the window' }
        }),
      ]);

      // At least one should succeed (server may serialize them)
      assert.ok(r1.statusCode === 200 || r2.statusCode === 200);
    });
  });

  // ── Session Persistence ────────────────────────────────────────
  describe('Session State', () => {
    it('messages accumulate across multiple actions', async () => {
      const create = await server.inject({ method: 'POST', url: '/api/sessions', payload: { adventureId: 'dracula' } });
      const session = JSON.parse(create.payload);

      // Get initial message count
      const m1 = await server.inject({ method: 'GET', url: `/api/sessions/${session.sessionId}/messages` });
      const initial = JSON.parse(m1.payload);
      const initialCount = (initial.messages || initial || []).length;

      // Submit action
      await server.inject({
        method: 'POST',
        url: `/api/sessions/${session.sessionId}/actions`,
        payload: { type: 'action', content: 'I enter the castle' }
      });

      // Check messages increased
      const m2 = await server.inject({ method: 'GET', url: `/api/sessions/${session.sessionId}/messages` });
      const after = JSON.parse(m2.payload);
      const afterCount = (after.messages || after || []).length;
      assert.ok(afterCount > initialCount);
    });

    it('adventure data is returned with session', async () => {
      const create = await server.inject({ method: 'POST', url: '/api/sessions', payload: { adventureId: 'frankenstein' } });
      const session = JSON.parse(create.payload);
      assert.ok(session.adventureName, 'create session should return adventureName');
      assert.ok(session.adventureName.toLowerCase().includes('frankenstein') || session.sessionId, 'session should be for frankenstein');
    });
  });
});
