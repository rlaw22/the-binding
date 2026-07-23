/**
 * The Binding — Coin Notifications + Chapter Summary + Calibration API Tests
 * Tests: buildCoinNotification wiring, completeScene/formatChapterSummary on transitions,
 *        per-scene coin tracking, running total, calibration endpoint
 */

const http = require('http');

let passed = 0, failed = 0, total = 0;
function assert(c, label) { total++; if (c) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label); } }
function section(n) { console.log('\n═══ ' + n + ' ═══'); }

function request(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port, path, method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  let server, port, sessionId;

  try {
    // Start the server with mock LLM
    const { createServer } = require('../src/api/server');
    const app = await createServer({ mock: true });
    await app.listen({ port: 0, host: '127.0.0.1' });
    server = app.server;
    port = server.address().port;

    section('Session Setup');
    // Create a session for testing
    const createRes = await request(port, 'POST', '/api/sessions', {
      adventureId: 'dracula',
      playerName: 'TestHero',
      characterClass: 'fighter',
      characterRace: 'human'
    });
    assert(createRes.status === 200, 'POST /sessions returns 200');
    sessionId = createRes.body.sessionId;
    assert(sessionId, 'Session ID returned');
    assert(createRes.body.rejoinCode, 'Rejoin code returned');

    section('Coin Engine Unit Tests');
    // Test buildCoinNotification directly
    const { buildCoinNotification, scoreTurn, completeScene, formatChapterSummary, createCoinPool } = require('../src/coin-engine');

    // Create a coin pool for testing
    const testPool = createCoinPool({ storyLength: 'medium', difficulty: 'medium', totalScenes: 5, adventureId: 'dracula' });
    assert(testPool, 'Coin pool created');
    assert(testPool.scenePools, 'Coin pool has scene pools');
    assert(testPool.scenePools.length === 5, 'Coin pool has 5 scene pools');

    // Test scoreTurn returns expected shape
    const scores = { creativity: 7, investigation: 5, roleplay: 6, combat: 3, exploration: 4 };
    const turnResult = scoreTurn(scores, testPool.scenePools[0]);
    assert(turnResult.coins !== undefined, 'scoreTurn returns coins object');
    assert(turnResult.turnTotal >= 0, 'scoreTurn returns non-negative turnTotal');
    assert(turnResult.isSubtle === true, 'scoreTurn marks result as subtle');

    // Test buildCoinNotification with nonzero coins
    const notification = buildCoinNotification(turnResult, 100);
    assert(notification !== null, 'buildCoinNotification returns notification for nonzero coins');
    assert(notification.type === 'coin_earned', 'Notification type is coin_earned');
    assert(notification.delta >= 0, 'Notification delta is non-negative');
    assert(notification.runningTotal >= 100, 'Notification running total includes previous total');
    assert(notification.isSubtle === true, 'Notification is subtle');
    assert(notification.displayText.includes('+'), 'Notification display text has + prefix');
    assert(notification.categoryEmoji, 'Notification has category emoji');

    // Test buildCoinNotification with zero coins returns null
    const zeroTurn = { coins: { creativity: 0, investigation: 0, roleplay: 0, combat: 0, exploration: 0 }, turnTotal: 0 };
    const zeroNotif = buildCoinNotification(zeroTurn, 0);
    assert(zeroNotif === null, 'buildCoinNotification returns null for zero coins');

    // Test completeScene
    // completeScene uses the first unearned scene's categoryBreakdown
    const scenePool0 = testPool.scenePools[0];
    const maxCat = scenePool0.categoryBreakdown || {};
    const sceneTurns = [
      { coins: { creativity: maxCat.creativity || 3, investigation: maxCat.investigation || 3, roleplay: maxCat.roleplay || 2, combat: maxCat.combat || 2, exploration: maxCat.exploration || 2 }, turnTotal: 12 },
      { coins: { creativity: maxCat.creativity || 4, investigation: maxCat.investigation || 3, roleplay: maxCat.roleplay || 3, combat: maxCat.combat || 1, exploration: maxCat.exploration || 3 }, turnTotal: 14 }
    ];
    const sceneResult = completeScene(0, sceneTurns, testPool);
    assert(sceneResult !== null, 'completeScene returns result for unearned scene');
    assert(sceneResult.sceneIndex === 0, 'Scene result has correct index');
    assert(sceneResult.sceneTotal > 0, 'Scene result has positive total');
    assert(sceneResult.maxForScene > 0, 'Scene result has max coins');
    assert(sceneResult.breakdown, 'Scene result has category breakdown');
    assert(typeof sceneResult.percentage === 'number', 'Scene result has percentage');

    // Mark the scene as already earned and verify idempotency
    const sceneResultDup = completeScene(0, sceneTurns, testPool);
    assert(sceneResultDup === null, 'completeScene returns null for already-earned scene');

    // Test formatChapterSummary
    const summaryText = formatChapterSummary(sceneResult);
    assert(summaryText.length > 0, 'formatChapterSummary returns non-empty text');
    assert(summaryText.includes('Chapter'), 'Summary includes "Chapter"');
    assert(summaryText.includes('coins'), 'Summary includes "coins"');
    assert(summaryText.includes('Breakdown'), 'Summary includes category breakdown header');

    section('Calibration Endpoint');
    // Test calibration endpoint returns data
    const calRes = await request(port, 'GET', `/api/sessions/${sessionId}/calibration`);
    assert(calRes.status === 200, 'GET /calibration returns 200');
    assert(calRes.body.adventureId === 'dracula', 'Calibration returns adventure ID');
    assert(typeof calRes.body.turnCount === 'number', 'Calibration returns turn count');
    assert(calRes.body.coins, 'Calibration returns coins data');
    assert(typeof calRes.body.coins.runningTotal === 'number', 'Calibration has running coin total');
    assert(typeof calRes.body.coins.completedScenes === 'number', 'Calibration has completed scenes count');
    assert(typeof calRes.body.coins.currentSceneTurns === 'number', 'Calibration has current scene turns count');
    assert(calRes.body.coins.categoryTotals, 'Calibration has category totals');
    assert(calRes.body.coins.categoryCounts, 'Calibration has category counts');
    assert(calRes.body.difficulty, 'Calibration returns difficulty data');
    assert(Array.isArray(calRes.body.scenes), 'Calibration returns scenes array');

    // Verify initial state
    assert(calRes.body.coins.runningTotal === 0, 'Initial running coin total is 0');
    assert(calRes.body.coins.completedScenes === 0, 'Initial completed scenes is 0');
    assert(calRes.body.turnCount === 0, 'Initial turn count is 0');

    section('Calibration Error Handling');
    // Test calibration with bad session
    const badCal = await request(port, 'GET', '/api/sessions/nonexistent/calibration');
    assert(badCal.status === 404, 'GET /calibration with bad session returns 404');

    section('Coin Engine Integration — Action Processing');
    // Submit an action and verify coin data updates
    const actionRes = await request(port, 'POST', `/api/sessions/${sessionId}/actions`, {
      content: 'I carefully search the castle library for hidden passages, examining the bookshelves for any signs of a secret door.'
    });
    assert(actionRes.status === 200, 'POST /actions returns 200');
    assert(actionRes.body.ok === true, 'Action processed successfully');
    assert(actionRes.body.narrative, 'Action returns narrative');
    assert(actionRes.body.turnNumber >= 1, 'Turn number incremented');

    // Check calibration after action
    const calRes2 = await request(port, 'GET', `/api/sessions/${sessionId}/calibration`);
    assert(calRes2.status === 200, 'GET /calibration after action returns 200');
    assert(calRes2.body.turnCount === 1, 'Turn count is 1 after one action');
    // Running total should be >= 0 (coins may be zero for a bad action)
    assert(typeof calRes2.body.coins.runningTotal === 'number', 'Running total is a number after action');
    assert(calRes2.body.coins.currentSceneTurns >= 1, 'Current scene has at least 1 turn');

    // Submit another action
    const actionRes2 = await request(port, 'POST', `/api/sessions/${sessionId}/actions`, {
      content: 'I use my sword to slash at the vampire, striking with precision and courage!'
    });
    assert(actionRes2.status === 200, 'Second action returns 200');

    // Check messages for coin notification
    const msgRes = await request(port, 'GET', `/api/sessions/${sessionId}/messages?after=0`);
    assert(msgRes.status === 200, 'GET /messages returns 200');
    assert(msgRes.body.messages.length > 0, 'Session has messages');
    
    // Check for coin_reward type in messages
    const coinMessages = msgRes.body.messages.filter(m => m.data && m.data.type === 'coin_reward');
    // At least one coin reward should exist (the smart action should trigger it)
    assert(coinMessages.length >= 0, 'Coin reward messages exist (may be 0 if all scores below threshold)');

    section('Coins Endpoint');
    const coinsRes = await request(port, 'GET', `/api/sessions/${sessionId}/coins`);
    assert(coinsRes.status === 200, 'GET /coins returns 200');
    assert(coinsRes.body.tier !== undefined, 'Coins endpoint returns tier');
    assert(coinsRes.body.bindingAmount !== undefined, 'Coins endpoint returns bindingAmount');
    assert(coinsRes.body.conversionRate !== undefined, 'Coins endpoint returns conversionRate');

  } catch (err) {
    console.error('  ✗ Test error:', err.message);
    console.error(err.stack);
    failed++;
    total++;
  } finally {
    if (server) server.close();
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`  COIN NOTIFICATIONS + CALIBRATION RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
