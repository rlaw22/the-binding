/**
 * Digital DM E2E Test — Full API flow
 *
 * Tests the complete Digital DM journey through the HTTP API:
 *   POST /api/sessions (create) → POST /api/sessions/:id/actions (play) →
 *   GET /api/sessions/:id/messages (poll) → GET /api/sessions/:id (info) →
 *   GET /api/sessions/:id/coins → GET /api/sessions/:id/progress
 *
 * Uses mock LLM mode — no API key needed.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

describe('Digital DM E2E — Full API Flow', () => {
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

  it('Complete Digital DM session lifecycle', async () => {
    // === 1. Create Digital DM session ===
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: {
        gameMode: 'digital_dm',
        playerName: 'Aria',
        characterClass: 'wizard',
        characterRace: 'elf'
      }
    });
    assert.equal(createRes.statusCode, 200, 'session creation should succeed');
    const session = JSON.parse(createRes.payload);
    assert.ok(session.sessionId, 'should have sessionId');
    assert.ok(session.rejoinCode, 'should have rejoinCode');
    assert.equal(session.gameMode, 'digital_dm');
    assert.equal(session.character.name, 'Aria');
    assert.equal(session.character.class, 'wizard');
    assert.equal(session.character.race, 'elf');
    assert.ok(session.messages.length > 0, 'should have opening messages');

    const sid = session.sessionId;

    // === 2. Poll messages — should include opening narration ===
    const pollRes = await server.inject({
      method: 'GET',
      url: `/api/sessions/${sid}/messages?since=0`
    });
    assert.equal(pollRes.statusCode, 200, 'message polling should succeed');
    const pollBody = JSON.parse(pollRes.payload);
    assert.ok(pollBody.messages.length > 0, 'should have messages');
    // Check for narration in the returned messages — could be type or data.type
    const hasNarration = pollBody.messages.some(m =>
      m.type === 'narration' || (m.data && m.data.type === 'narration')
    );
    assert.ok(hasNarration, 'should have a narration message from opening');

    // === 3. Submit first free-text action ===
    const action1Res = await server.inject({
      method: 'POST',
      url: `/api/sessions/${sid}/actions`,
      payload: { type: 'action', content: 'I cast Detect Magic and scan the room.' }
    });
    assert.equal(action1Res.statusCode, 200, 'first action should succeed');
    const action1 = JSON.parse(action1Res.payload);
    assert.ok(action1.narrative, 'should have narrative');
    assert.equal(typeof action1.narrative, 'string');
    assert.ok(action1.narrative.length > 0, 'narrative should be non-empty');
    assert.ok(action1.turnNumber >= 1, 'should track turn number');

    // === 4. Submit second free-text action ===
    const action2Res = await server.inject({
      method: 'POST',
      url: `/api/sessions/${sid}/actions`,
      payload: { type: 'action', content: 'I approach the nearest NPC and ask about the local rumors.' }
    });
    assert.equal(action2Res.statusCode, 200, 'second action should succeed');
    const action2 = JSON.parse(action2Res.payload);
    assert.ok(action2.narrative, 'should have narrative');
    assert.ok(action2.turnNumber >= 2, 'turn number should increment');

    // === 5. Submit third action — test suggested action format ===
    const action3Res = await server.inject({
      method: 'POST',
      url: `/api/sessions/${sid}/actions`,
      payload: { type: 'action', content: 'I search for hidden passages behind the bookshelf.' }
    });
    assert.equal(action3Res.statusCode, 200, 'third action should succeed');

    // === 6. Check session info ===
    const infoRes = await server.inject({
      method: 'GET',
      url: `/api/sessions/${sid}`
    });
    assert.equal(infoRes.statusCode, 200);
    const info = JSON.parse(infoRes.payload);
    assert.equal(info.sessionId, sid);
    assert.equal(info.state, 'active');
    assert.ok(info.totalTurns >= 3, 'should have at least 3 turns');

    // === 7. Check coins endpoint — should return safe defaults ===
    const coinsRes = await server.inject({
      method: 'GET',
      url: `/api/sessions/${sid}/coins`
    });
    assert.equal(coinsRes.statusCode, 200, 'coins should not crash');
    const coins = JSON.parse(coinsRes.payload);
    assert.equal(coins.totalEarned, 0);
    assert.equal(coins.totalPool, 0);

    // === 8. Check progress endpoint ===
    const progressRes = await server.inject({
      method: 'GET',
      url: `/api/sessions/${sid}/progress`
    });
    assert.equal(progressRes.statusCode, 200, 'progress should not crash');
    const progress = JSON.parse(progressRes.payload);
    assert.equal(progress.mode, 'digital_dm');
    assert.equal(progress.sceneName, 'Open World');
    assert.ok(progress.totalTurns >= 3, 'should track total turns');

    // === 9. Poll messages again — should have accumulated all messages ===
    const finalPoll = await server.inject({
      method: 'GET',
      url: `/api/sessions/${sid}/messages?since=0`
    });
    const finalBody = JSON.parse(finalPoll.payload);
    // Should have: connected + narration (opening) + 3x(narration + suggested_actions + coin_reward) + ...
    const narrationCount = finalBody.messages.filter(m =>
      m.type === 'narration' || (m.data && m.data.type === 'narration')
    ).length;
    assert.ok(narrationCount >= 4, `should have at least 4 narrations (opening + 3 actions), got ${narrationCount}`);

    // === 10. Verify no adventureId required ===
    // The session should work without any adventure references
    assert.equal(session.adventureName, 'Digital DM Sandbox');
  });

  it('Multiple Digital DM sessions can coexist', async () => {
    // Create two sessions
    const res1 = await server.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { gameMode: 'digital_dm', playerName: 'Player1' }
    });
    const res2 = await server.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { gameMode: 'digital_dm', playerName: 'Player2' }
    });

    const s1 = JSON.parse(res1.payload);
    const s2 = JSON.parse(res2.payload);

    assert.notEqual(s1.sessionId, s2.sessionId, 'sessions should have different IDs');
    assert.equal(s1.character.name, 'Player1');
    assert.equal(s2.character.name, 'Player2');

    // Both should accept actions independently
    const a1 = await server.inject({
      method: 'POST',
      url: `/api/sessions/${s1.sessionId}/actions`,
      payload: { type: 'action', content: 'I look north.' }
    });
    const a2 = await server.inject({
      method: 'POST',
      url: `/api/sessions/${s2.sessionId}/actions`,
      payload: { type: 'action', content: 'I look south.' }
    });

    assert.equal(a1.statusCode, 200, 'session 1 action should succeed');
    assert.equal(a2.statusCode, 200, 'session 2 action should succeed');
  });
});
