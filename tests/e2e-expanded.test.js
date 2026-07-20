/**
 * E2E Expanded Tests — The Binding Phase 1
 * 
 * Extends e2e-smoke.test.js with:
 * - Multi-adventure creation (Dracula, Frankenstein, Holmes)
 * - Long action sequences (5+ actions)
 * - Edge cases: empty body, very long text, special characters
 * - Session persistence verification
 * - Voice API status endpoint structure
 * - Health check structure
 * - Error handling: malformed requests
 * - Concurrent sessions: 5 simultaneous
 */

let passed = 0, failed = 0, total = 0;

function assert(c, label) {
  total++;
  if (c) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ FAILED: ' + label); }
}

function assertEq(a, e, label) {
  total++;
  const av = JSON.stringify(a), ev = JSON.stringify(e);
  if (av === ev) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ FAILED: ' + label + ' — expected ' + ev + ', got ' + av); }
}

function section(name) { console.log('\n═══ ' + name + ' ═══'); }

async function run() {
  const { createServer } = require('../src/api/server');

  const server = await createServer({
    llmConfig: { mock: true, apiKey: '', baseUrl: '', model: 'mock' }
  });

  // ── Multi-Adventure Creation ────────────────────────────────────────────
  section('Multi-Adventure Creation');

  for (const advId of ['dracula', 'frankenstein', 'holmes']) {
    const res = await server.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { adventureId: advId }
    });
    assertEq(res.statusCode, 200, `Create ${advId} session = 200`);
    const body = JSON.parse(res.payload);
    assert(body.sessionId, `${advId} session has ID`);
    assert(body.character, `${advId} session has character`);
    assert(body.rejoinCode, `${advId} session has rejoin code`);
    assert(body.messages && body.messages.length > 0, `${advId} has opening messages`);

    // Verify character has expected D&D structure
    const char = body.character;
    assert(typeof char.name === 'string', `${advId} character has name`);
    assert(char.hp === undefined || (typeof char.hp === 'object' && typeof char.hp.current === 'number'), `${advId} character HP is valid object`);
  }

  // ── Long Action Sequence ────────────────────────────────────────────────
  section('Long Action Sequence (5 actions)');

  const longSession = await server.inject({
    method: 'POST',
    url: '/api/sessions',
    payload: { adventureId: 'dracula' }
  });
  const longSid = JSON.parse(longSession.payload).sessionId;

  const actions = [
    'I look around the room carefully.',
    'I approach the fireplace and examine the mantelpiece.',
    'I open the door to the east.',
    'I pick up the letter from the table.',
    'I read the letter aloud to my companions.'
  ];

  for (let i = 0; i < actions.length; i++) {
    const res = await server.inject({
      method: 'POST',
      url: `/api/sessions/${longSid}/actions`,
      payload: { type: 'action', content: actions[i] }
    });
    assertEq(res.statusCode, 200, `Action ${i + 1} = 200`);
    const body = JSON.parse(res.payload);
    assert(body.narrative, `Action ${i + 1} returns narrative`);
    assert(body.narrative.length > 10, `Action ${i + 1} narrative has substance`);
  }

  // Verify all messages accumulated
  const allMsgs = await server.inject({
    method: 'GET',
    url: `/api/sessions/${longSid}/messages?after=0`
  });
  const msgBody = JSON.parse(allMsgs.payload);
  assert(msgBody.messages.length >= 6, `Messages accumulated: ${msgBody.messages.length} (expected >= 6)`);

  // ── Edge Cases ──────────────────────────────────────────────────────────
  section('Edge Cases');

  const edgeSession = await server.inject({
    method: 'POST',
    url: '/api/sessions',
    payload: { adventureId: 'dracula' }
  });
  const edgeSid = JSON.parse(edgeSession.payload).sessionId;

  // Empty action body
  const emptyAction = await server.inject({
    method: 'POST',
    url: `/api/sessions/${edgeSid}/actions`,
    payload: { type: 'action', content: '' }
  });
  assert(emptyAction.statusCode >= 400, `Empty action returns error (${emptyAction.statusCode})`);

  // Very long action text (1000+ chars)
  const longText = 'I '.repeat(600) + 'examine the ancient tome.';
  const longAction = await server.inject({
    method: 'POST',
    url: `/api/sessions/${edgeSid}/actions`,
    payload: { type: 'action', content: longText }
  });
  assert(longAction.statusCode === 200 || longAction.statusCode === 400,
    `Long action handled (${longAction.statusCode})`);

  // Special characters in action
  const specialAction = await server.inject({
    method: 'POST',
    url: `/api/sessions/${edgeSid}/actions`,
    payload: { type: 'action', content: 'I say "Hello!" & cast <fireball> at the creature — it\'s immune to fire?!' }
  });
  assertEq(specialAction.statusCode, 200, 'Special characters handled');

  // ── Session Persistence ─────────────────────────────────────────────────
  section('Session Persistence');

  const persistSession = await server.inject({
    method: 'POST',
    url: '/api/sessions',
    payload: { adventureId: 'frankenstein' }
  });
  const persistBody = JSON.parse(persistSession.payload);
  const persistSid = persistBody.sessionId;

  // Submit an action to create history
  await server.inject({
    method: 'POST',
    url: `/api/sessions/${persistSid}/actions`,
    payload: { type: 'action', content: 'I examine the laboratory equipment.' }
  });

  // Retrieve session and verify all fields
  const retrieved = await server.inject({
    method: 'GET',
    url: `/api/sessions/${persistSid}`
  });
  assertEq(retrieved.statusCode, 200, 'Session retrieval = 200');
  const retBody = JSON.parse(retrieved.payload);
  assert(retBody.sessionId === persistSid, 'Retrieved session ID matches');
  assert(retBody.adventureName && retBody.adventureName.toLowerCase().includes('frankenstein'), 'Retained adventure name');
  assert(retBody.character, 'Retrieved session has character');
  assert(typeof retBody.historyLength === 'number', 'Retrieved session has historyLength');

  // ── Voice API Structure ─────────────────────────────────────────────────
  section('Voice API Status');

  const voice = await server.inject({ method: 'GET', url: '/api/voice/status' });
  assertEq(voice.statusCode, 200, 'GET /api/voice/status = 200');
  const vBody = JSON.parse(voice.payload);
  assert(vBody.provider !== undefined, 'Has provider field');
  assert(vBody.enabled !== undefined, 'Has enabled field');

  // ── Health Check Structure ──────────────────────────────────────────────
  section('Health Check Structure');

  const health = await server.inject({ method: 'GET', url: '/api/health' });
  assertEq(health.statusCode, 200, 'GET /api/health = 200');
  const hBody = JSON.parse(health.payload);
  assert(hBody.status === 'ok', 'Health status is ok');
  assert(hBody.uptime !== undefined || hBody.version !== undefined, 'Health has metadata');

  // ── Error Handling ──────────────────────────────────────────────────────
  section('Error Handling');

  // Nonexistent adventure
  const badAdv = await server.inject({
    method: 'POST',
    url: '/api/sessions',
    payload: { adventureId: 'nonexistent_adventure' }
  });
  assert(badAdv.statusCode >= 400, `Bad adventure returns error (${badAdv.statusCode})`);

  // Nonexistent session
  const badSession = await server.inject({
    method: 'GET',
    url: '/api/sessions/fake-uuid-12345'
  });
  assert(badSession.statusCode >= 400, `Bad session returns error (${badSession.statusCode})`);

  // Missing payload entirely
  const noPayload = await server.inject({
    method: 'POST',
    url: '/api/sessions',
    payload: {}
  });
  assert(noPayload.statusCode >= 400, `Missing adventureId returns error (${noPayload.statusCode})`);

  // ── Concurrent Sessions (5 simultaneous) ────────────────────────────────
  section('Concurrent Sessions (5 simultaneous)');

  const concurrentPromises = [];
  const adventures = ['dracula', 'frankenstein', 'holmes', 'dracula', 'frankenstein'];
  for (const advId of adventures) {
    concurrentPromises.push(
      server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { adventureId: advId }
      })
    );
  }

  const concurrentResults = await Promise.all(concurrentPromises);
  const sessionIds = [];
  for (let i = 0; i < concurrentResults.length; i++) {
    assertEq(concurrentResults[i].statusCode, 200, `Concurrent session ${i + 1} = 200`);
    const body = JSON.parse(concurrentResults[i].payload);
    assert(body.sessionId, `Concurrent session ${i + 1} has ID`);
    sessionIds.push(body.sessionId);
  }

  // Verify all sessions are independent
  const uniqueIds = new Set(sessionIds);
  assert(uniqueIds.size === 5, `All 5 concurrent sessions have unique IDs (${uniqueIds.size}/5)`);

  // Submit action to each concurrent session
  for (let i = 0; i < sessionIds.length; i++) {
    const res = await server.inject({
      method: 'POST',
      url: `/api/sessions/${sessionIds[i]}/actions`,
      payload: { type: 'action', content: `I look around (session ${i + 1}).` }
    });
    assertEq(res.statusCode, 200, `Action on concurrent session ${i + 1} = 200`);
  }

  // Cleanup
  await server.close();

  // Results
  console.log('\n═══════════════════════════════════════════');
  console.log('  E2E EXPANDED RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
  console.log('═══════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('E2E expanded test crashed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
