/**
 * End-to-End Smoke Test — The Binding Phase 1
 * 
 * Tests full adventure flow using Fastify's server.inject() (same pattern
 * as the passing phase1.test.js): session creation → action submission →
 * narrative response → session persistence → rejoin → error recovery.
 * Uses mock LLM mode — no API key needed.
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

  // Start server in mock mode
  section('Server Startup');
  const server = await createServer({
    llmConfig: { mock: true, apiKey: '', baseUrl: '', model: 'mock' }
  });

  // Health check
  const health = await server.inject({ method: 'GET', url: '/api/health' });
  assertEq(health.statusCode, 200, 'GET /api/health = 200');
  const healthBody = JSON.parse(health.payload);
  assert(healthBody.status === 'ok', 'Health status is ok');

  // List adventures
  section('Adventure Loading');
  const adv = await server.inject({ method: 'GET', url: '/api/adventures' });
  assertEq(adv.statusCode, 200, 'GET /api/adventures = 200');
  const adventures = JSON.parse(adv.payload);
  assert(Array.isArray(adventures), 'Adventures is array');
  const advIds = adventures.map(a => a.id);
  assert(advIds.includes('dracula'), 'Dracula adventure loaded');
  assert(advIds.includes('frankenstein'), 'Frankenstein adventure loaded');
  assert(advIds.includes('holmes'), 'Holmes adventure loaded');

  // Create session (Dracula)
  section('Session Lifecycle — Create');
  const create = await server.inject({
    method: 'POST',
    url: '/api/sessions',
    payload: { adventureId: 'dracula' }
  });
  assertEq(create.statusCode, 200, 'POST /api/sessions = 200');
  const session = JSON.parse(create.payload);
  assert(session.sessionId, 'Session has ID');
  assert(session.character, 'Session has character');
  assert(session.rejoinCode, 'Session has rejoin code');
  assert(session.messages && session.messages.length > 0, 'Opening messages returned');
  const sid = session.sessionId;
  const rejoinCode = session.rejoinCode;

  // Get session info
  section('Session Lifecycle — Retrieve');
  const info = await server.inject({ method: 'GET', url: '/api/sessions/' + sid });
  assertEq(info.statusCode, 200, 'GET /api/sessions/:id = 200');
  const infoBody = JSON.parse(info.payload);
  assert(infoBody.sessionId === sid, 'Session ID matches');

  // Submit an action — core gameplay loop
  section('Action Flow — Player Action');
  const action = await server.inject({
    method: 'POST',
    url: '/api/sessions/' + sid + '/actions',
    payload: { type: 'action', content: 'I examine the brass crucifix.' }
  });
  assertEq(action.statusCode, 200, 'POST action = 200');
  const actionResp = JSON.parse(action.payload);
  assert(actionResp.narrative, 'Action returns narrative');
  assert(typeof actionResp.narrative === 'string', 'Narrative is a string');
  assert(actionResp.narrative.length > 10, 'Narrative has substance');

  // Second action — verify continuous gameplay
  section('Action Flow — Follow-up Action');
  const action2 = await server.inject({
    method: 'POST',
    url: '/api/sessions/' + sid + '/actions',
    payload: { type: 'action', content: 'I speak to the innkeeper about strange occurrences.' }
  });
  assertEq(action2.statusCode, 200, 'Second action = 200');
  const action2Resp = JSON.parse(action2.payload);
  assert(action2Resp.narrative, 'Second action returns narrative');
  assert(action2Resp.narrative !== actionResp.narrative, 'Second narrative differs from first');

  // Poll messages — verify message accumulation
  section('Message Polling');
  const msgs = await server.inject({ method: 'GET', url: '/api/sessions/' + sid + '/messages?after=0' });
  assertEq(msgs.statusCode, 200, 'GET /messages = 200');
  const msgBody = JSON.parse(msgs.payload);
  assert(Array.isArray(msgBody.messages), 'Messages is array');
  assert(msgBody.messages.length >= 3, 'Messages accumulated (opening + 2 actions)');

  // Session rejoin — test multi-device rejoin code
  section('Session Rejoin');
  const rejoin = await server.inject({ method: 'GET', url: '/api/rejoin/' + rejoinCode });
  assertEq(rejoin.statusCode, 200, 'GET /api/rejoin/:code = 200');
  const rejoinBody = JSON.parse(rejoin.payload);
  assert(rejoinBody.sessionId === sid, 'Rejoin returns same session ID');

  // Error recovery — nonexistent session
  section('Error Recovery');
  const badSession = await server.inject({ method: 'GET', url: '/api/sessions/nonexistent-id' });
  assert(badSession.statusCode >= 400, 'Bad session ID returns error (' + badSession.statusCode + ')');

  // Error recovery — bad rejoin code
  const badRejoin = await server.inject({ method: 'GET', url: '/api/rejoin/BADCODE' });
  assert(badRejoin.statusCode >= 400, 'Bad rejoin code returns error (' + badRejoin.statusCode + ')');

  // Error recovery — missing content field
  const missingContent = await server.inject({
    method: 'POST',
    url: '/api/sessions/' + sid + '/actions',
    payload: {}
  });
  assertEq(missingContent.statusCode, 400, 'Missing content returns 400');
  const errBody = JSON.parse(missingContent.payload);
  assert(errBody.error === 'content is required', 'Error message for missing content');

  // Concurrent sessions — second adventure runs independently
  section('Concurrent Sessions');
  const session2 = await server.inject({
    method: 'POST',
    url: '/api/sessions',
    payload: { adventureId: 'frankenstein' }
  });
  assertEq(session2.statusCode, 200, 'Second session created');
  const s2 = JSON.parse(session2.payload);
  assert(s2.sessionId !== sid, 'Second session has different ID');

  const action3 = await server.inject({
    method: 'POST',
    url: '/api/sessions/' + s2.sessionId + '/actions',
    payload: { type: 'action', content: 'I examine the laboratory equipment.' }
  });
  assertEq(action3.statusCode, 200, 'Action on second session works');

  // Voice API endpoints
  section('Voice API');
  const voiceStatus = await server.inject({ method: 'GET', url: '/api/voice/status' });
  assertEq(voiceStatus.statusCode, 200, 'GET /api/voice/status = 200');
  const voiceBody = JSON.parse(voiceStatus.payload);
  assert(voiceBody.provider !== undefined, 'Voice status has provider field');

  // Verify server cleanup
  await server.close();

  // Results
  console.log('\n═══════════════════════════════════════════');
  console.log('  E2E RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
  console.log('═══════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('E2E test crashed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
