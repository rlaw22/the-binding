/**
 * The Binding — Phase 2 Test Suite
 *
 * Tests host + spectator mode: roles, join flow, suggestions, approval,
 * role-based action filtering, message routing.
 * Run with: node tests/phase2.test.js
 */

const { createSession, addPlayer, getPlayer, getPrimaryPlayer, getHostPlayer, getSpectators, isHost, addSuggestion, approveSuggestion, dismissSuggestion, getPendingSuggestions } = require('../src/session');
const MessageRouter = require('../src/session/message-router');
const { MessageTypes } = MessageRouter;

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, label) {
  total++;
  if (condition) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ ' + label); }
}

function assertEq(actual, expected, label) {
  total++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ ' + label + ' — expected ' + e + ', got ' + a); }
}

function section(name) { console.log('\n═══ ' + name + ' ═══'); }

// ─── SESSION ROLES ──────────────────────────────────────────────────
section('Session Roles');
{
  const session = createSession({ adventureId: 'dracula' });

  // First player = host
  const host = addPlayer(session, { name: 'Lawman', class: 'fighter' });
  assertEq(host.role, 'host', 'First player gets host role');
  assertEq(session.hostId, host.id, 'Session hostId set to first player');
  assert(isHost(session, host.id), 'isHost returns true for host');

  // Second player = spectator
  const spec = addPlayer(session, { name: 'Watcher', role: 'spectator' });
  assertEq(spec.role, 'spectator', 'Second player gets spectator role');
  assert(!isHost(session, spec.id), 'isHost returns false for spectator');

  // getHostPlayer
  const h = getHostPlayer(session);
  assert(h && h.id === host.id, 'getHostPlayer returns the host');

  // getSpectators
  const specs = getSpectators(session);
  assertEq(specs.length, 1, '1 spectator');
  assertEq(specs[0].id, spec.id, 'Spectator ID matches');

  // getPrimaryPlayer still works (backwards compat)
  const primary = getPrimaryPlayer(session);
  assert(primary && primary.id === host.id, 'getPrimaryPlayer still returns first player');
}

// ─── SPECTATOR SUGGESTIONS ──────────────────────────────────────────
section('Spectator Suggestions');
{
  const session = createSession({ adventureId: 'dracula' });
  const host = addPlayer(session, { name: 'Host', class: 'fighter' });
  const spec = addPlayer(session, { name: 'Watcher', role: 'spectator' });

  // Add a suggestion
  const sug = addSuggestion(session, spec.id, 'I search the bookshelf');
  assert(sug, 'Suggestion created');
  assertEq(sug.spectatorId, spec.id, 'Suggestion linked to spectator');
  assertEq(sug.spectatorName, 'Watcher', 'Suggestion has spectator name');
  assertEq(sug.action, 'I search the bookshelf', 'Suggestion action matches');
  assertEq(sug.status, 'pending', 'Suggestion starts pending');

  // getPendingSuggestions
  const pending = getPendingSuggestions(session);
  assertEq(pending.length, 1, '1 pending suggestion');

  // Add second suggestion
  const sug2 = addSuggestion(session, spec.id, 'Talk to the innkeeper');
  const pending2 = getPendingSuggestions(session);
  assertEq(pending2.length, 2, '2 pending suggestions');

  // Approve first suggestion
  const approved = approveSuggestion(session, sug.id);
  assert(approved && approved.status === 'approved', 'Suggestion approved');
  const pending3 = getPendingSuggestions(session);
  assertEq(pending3.length, 1, '1 pending after approval');

  // Dismiss second suggestion
  dismissSuggestion(session, sug2.id);
  const pending4 = getPendingSuggestions(session);
  assertEq(pending4.length, 0, '0 pending after dismiss');

  // Non-existent suggestion
  const bad = approveSuggestion(session, 999);
  assert(bad === null, 'Approve non-existent returns null');
}

// ─── MESSAGE ROUTER — ROLE-BASED FILTERING ──────────────────────────
section('Message Router — Role Filtering');
{
  const session = createSession({ adventureId: 'dracula' });
  const host = addPlayer(session, { name: 'Host', class: 'fighter' });
  const spec = addPlayer(session, { name: 'Watcher', role: 'spectator' });

  // SUGGESTED_ACTIONS should NOT go to spectators
  const actionsMsg = MessageRouter.suggestedActions([
    { label: 'Examine the desk', type: 'exploration' },
    { label: 'Board the coach', type: 'exit' }
  ], 'What would you like to do?');

  const deliveredTo = [];
  MessageRouter.routeMessage(session, actionsMsg, function(playerId) {
    deliveredTo.push(playerId);
  });
  assert(deliveredTo.includes(host.id), 'Suggested actions delivered to host');
  assert(!deliveredTo.includes(spec.id), 'Suggested actions NOT delivered to spectator');

  // NARRATION should go to everyone
  const narrMsg = MessageRouter.narration('The fire crackles.');
  const narrDelivered = [];
  MessageRouter.routeMessage(session, narrMsg, function(pid) { narrDelivered.push(pid); });
  assert(narrDelivered.includes(host.id), 'Narration delivered to host');
  assert(narrDelivered.includes(spec.id), 'Narration delivered to spectator');

  // SPECTATOR_SUGGESTION should only go to host
  const sugMsg = MessageRouter.spectatorSuggestion('Search the bookshelf', 'Watcher', spec.id);
  assertEq(sugMsg.type, 'spectator_suggestion', 'Spectator suggestion message type');
  const sugDelivered = [];
  MessageRouter.routeMessage(session, sugMsg, function(pid) { sugDelivered.push(pid); });
  assert(sugDelivered.includes(host.id), 'Spectator suggestion delivered to host');
  assert(!sugDelivered.includes(spec.id), 'Spectator suggestion NOT delivered to spectator');

  // SYSTEM goes to everyone
  const sysMsg = MessageRouter.system('A new watcher joins.');
  const sysDelivered = [];
  MessageRouter.routeMessage(session, sysMsg, function(pid) { sysDelivered.push(pid); });
  assertEq(sysDelivered.length, 2, 'System message delivered to all');
}

// ─── API SERVER — PHASE 2 ENDPOINTS ────────────────────────────────
section('API Server — Phase 2');
const { createServer } = require('../src/api/server');

async function testPhase2API() {
  const server = await createServer({
    llmConfig: { mock: true, apiKey: '', baseUrl: '', model: 'mock' }
  });

  // Create a host session
  const sessionResp = await server.inject({
    method: 'POST',
    url: '/api/sessions',
    payload: {
      adventureId: 'dracula',
      playerName: 'TestHost',
      characterClass: 'fighter',
      characterRace: 'human'
    }
  });
  assertEq(sessionResp.statusCode, 200, 'POST /api/sessions = 200');
  const sessionData = JSON.parse(sessionResp.payload);
  const sid = sessionData.sessionId;
  const hostPid = sessionData.playerId;
  assert(sid, 'Session ID exists');
  assert(hostPid, 'Host player ID exists');

  // Session info should include role and hostId
  const info = await server.inject({ method: 'GET', url: '/api/sessions/' + sid });
  assertEq(info.statusCode, 200, 'GET /api/sessions/:id = 200');
  const infoData = JSON.parse(info.payload);
  assertEq(infoData.hostId, hostPid, 'hostId matches host player');
  assert(infoData.players[0].role === 'host', 'First player has host role');
  assertEq(infoData.spectatorCount, 0, 'No spectators yet');

  // Spectator joins
  const joinResp = await server.inject({
    method: 'POST',
    url: '/api/sessions/' + sid + '/join',
    payload: { playerName: 'TestWatcher' }
  });
  assertEq(joinResp.statusCode, 200, 'POST /api/sessions/:id/join = 200');
  const joinData = JSON.parse(joinResp.payload);
  assert(joinData.playerId, 'Spectator has playerId');
  assertEq(joinData.role, 'spectator', 'Joined as spectator');
  const specPid = joinData.playerId;

  // Verify spectator count increased
  const info2 = await server.inject({ method: 'GET', url: '/api/sessions/' + sid });
  const info2Data = JSON.parse(info2.payload);
  assertEq(info2Data.spectatorCount, 1, '1 spectator after join');
  assert(info2Data.players.find(p => p.role === 'spectator'), 'Players list includes spectator');

  // Spectator submits suggestion
  const sugResp = await server.inject({
    method: 'POST',
    url: '/api/sessions/' + sid + '/suggestions',
    payload: { playerId: specPid, content: 'Examine the old journal' }
  });
  assertEq(sugResp.statusCode, 200, 'POST suggestion = 200');
  const sugData = JSON.parse(sugResp.payload);
  assert(sugData.ok, 'Suggestion ok');
  assert(sugData.suggestion.id, 'Suggestion has ID');

  // Get pending suggestions
  const pendingResp = await server.inject({ method: 'GET', url: '/api/sessions/' + sid + '/suggestions' });
  assertEq(pendingResp.statusCode, 200, 'GET suggestions = 200');
  const pendData = JSON.parse(pendingResp.payload);
  assert(pendData.suggestions.length >= 1, 'At least 1 pending suggestion');

  // Host can submit action (no spectator rejection)
  const actResp = await server.inject({
    method: 'POST',
    url: '/api/sessions/' + sid + '/actions',
    payload: { type: 'action', content: 'I look around the room.', playerId: hostPid }
  });
  assertEq(actResp.statusCode, 200, 'Host action = 200');

  // Spectator CANNOT submit action (403)
  const specActResp = await server.inject({
    method: 'POST',
    url: '/api/sessions/' + sid + '/actions',
    payload: { type: 'action', content: 'I attack the dragon!', playerId: specPid }
  });
  assertEq(specActResp.statusCode, 403, 'Spectator action = 403');
  const specActData = JSON.parse(specActResp.payload);
  assert(specActData.error.includes('Spectators'), 'Error message says spectators cannot act');

  // Host approves suggestion
  const sugId = pendData.suggestions[0].id;
  const approveResp = await server.inject({
    method: 'POST',
    url: '/api/sessions/' + sid + '/suggestions/' + sugId + '/approve',
    payload: { playerId: hostPid }
  });
  assertEq(approveResp.statusCode, 200, 'POST approve = 200');
  const approveData = JSON.parse(approveResp.payload);
  assert(approveData.ok, 'Approval ok');
  assert(approveData.narrative, 'Approval returns narrative');

  // Messages include spectator suggestion message type
  const msgs = await server.inject({ method: 'GET', url: '/api/sessions/' + sid + '/messages?after=0' });
  const msgData = JSON.parse(msgs.payload);
  const hasSpectatorMsg = msgData.messages.some(m => m.data.type === 'spectator_suggestion');
  assert(hasSpectatorMsg, 'Messages include spectator_suggestion type');

  // Join with missing name = 400
  const badJoin = await server.inject({
    method: 'POST',
    url: '/api/sessions/' + sid + '/join',
    payload: {}
  });
  assertEq(badJoin.statusCode, 400, 'Join without name = 400');

  // Suggestion from host = 403
  const hostSug = await server.inject({
    method: 'POST',
    url: '/api/sessions/' + sid + '/suggestions',
    payload: { playerId: hostPid, content: 'I do something' }
  });
  assertEq(hostSug.statusCode, 403, 'Host suggestion = 403');

  await server.close();
}

testPhase2API().then(() => {
  console.log('\n═══════════════════════════════════════════');
  console.log('  RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
  console.log('═══════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('\n  ✗ Test server error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
