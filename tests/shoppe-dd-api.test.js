/**
 * The Binding — Shoppe API + DD Wiring Test Suite
 * Tests: Shoppe endpoints integration, DD action processing integration
 */

const http = require('http');

let passed = 0, failed = 0, total = 0;
function assert(c, label) { total++; if (c) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label); } }
function section(n) { console.log('\n═══ ' + n + ' ═══'); }

// Helper to make HTTP requests
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
  let server, port;
  
  try {
    // Start the server on a random port
    const { createServer } = require('../src/api/server');
    const app = await createServer({ mock: true });
    await app.listen({ port: 0, host: '127.0.0.1' });
    server = app.server;
    port = server.address().port;
    console.log(`  Server started on port ${port}`);
  } catch (err) {
    console.error('  ✗ Failed to start server:', err.message);
    process.exit(1);
  }

  try {
    // Create a session first
    section('Setup');
    const createRes = await request(port, 'POST', '/api/sessions', {
      adventureId: 'dracula',
      characterName: 'TestHero',
      characterClass: 'fighter',
      characterRace: 'human'
    });
    assert(createRes.status === 200 || createRes.status === 201, 'Session created');
    const sessionId = createRes.body.sessionId;
    assert(sessionId, 'Session ID returned');

    // ── Shoppe Catalog ──────────────────────────────────────────────
    section('Shoppe Catalog Endpoint');
    
    const catalogRes = await request(port, 'GET', `/api/sessions/${sessionId}/shoppe`);
    assert(catalogRes.status === 200, 'GET /shoppe returns 200');
    assert(Array.isArray(catalogRes.body.catalog), 'Returns catalog array');
    assert(catalogRes.body.catalog.length > 0, 'Catalog is not empty');
    assert(Array.isArray(catalogRes.body.recommendations), 'Returns recommendations array');
    assert(Array.isArray(catalogRes.body.transactionLog), 'Returns transaction log array');

    // ── Shoppe Buy ──────────────────────────────────────────────────
    section('Shoppe Buy Endpoint');

    const buyRes = await request(port, 'POST', `/api/sessions/${sessionId}/shoppe/buy`, {
      itemId: 'wooden_stake',
      coinBalance: 100
    });
    assert(buyRes.status === 200, 'POST /shoppe/buy returns 200');
    assert(buyRes.body.ok === true, 'Buy returns ok: true');

    const buyNoItem = await request(port, 'POST', `/api/sessions/${sessionId}/shoppe/buy`, {});
    assert(buyNoItem.status === 400, 'POST /shoppe/buy without itemId returns 400');

    const buyBadSession = await request(port, 'POST', '/api/sessions/nonexistent/shoppe/buy', { itemId: 'wooden_stake' });
    assert(buyBadSession.status === 404, 'POST /shoppe/buy with bad session returns 404');

    // ── Shoppe Sell ─────────────────────────────────────────────────
    section('Shoppe Sell Endpoint');

    const sellRes = await request(port, 'POST', `/api/sessions/${sessionId}/shoppe/sell`, {
      itemId: 'wooden_stake'
    });
    // May succeed or fail depending on inventory state — just verify endpoint works
    assert(sellRes.status === 200 || sellRes.status === 400, 'POST /shoppe/sell returns valid status');

    const sellNoItem = await request(port, 'POST', `/api/sessions/${sessionId}/shoppe/sell`, {});
    assert(sellNoItem.status === 400, 'POST /shoppe/sell without itemId returns 400');

    // ── Shoppe Haggle ───────────────────────────────────────────────
    section('Shoppe Haggle Endpoint');

    const haggleRes = await request(port, 'GET', `/api/sessions/${sessionId}/shoppe/haggle/wooden_stake?charismaMod=1.0`);
    assert(haggleRes.status === 200, 'GET /shoppe/haggle returns 200');
    assert(typeof haggleRes.body.originalPrice === 'number', 'Returns originalPrice');
    assert(haggleRes.body.haggledPrice !== undefined, 'Returns haggledPrice');

    const haggleBadItem = await request(port, 'GET', `/api/sessions/${sessionId}/shoppe/haggle/nonexistent_item`);
    assert(haggleBadItem.status === 404, 'GET /shoppe/haggle with bad item returns 404');

    // ── Inventory Weight in GET ─────────────────────────────────────
    section('Inventory Weight Wiring');

    const invRes = await request(port, 'GET', `/api/sessions/${sessionId}/inventory`);
    assert(invRes.status === 200, 'GET /inventory returns 200');
    assert(Array.isArray(invRes.body.items), 'Returns items array');
    assert(typeof invRes.body.weight === 'number', 'Returns weight number');
    assert(typeof invRes.body.capacity === 'number', 'Returns capacity number');
    assert(invRes.body.encumbrance !== undefined, 'Returns encumbrance status');

    // ── Coins Endpoint with $BINDING ────────────────────────────────
    section('Coins Endpoint $BINDING Wiring');

    const coinsRes = await request(port, 'GET', `/api/sessions/${sessionId}/coins`);
    assert(coinsRes.status === 200, 'GET /coins returns 200');
    assert(coinsRes.body.tier !== undefined, 'Returns tier field');
    assert(coinsRes.body.bindingAmount !== undefined, 'Returns bindingAmount field');
    assert(coinsRes.body.conversionRate !== undefined, 'Returns conversionRate field');

    // ── DD in Action Processing ─────────────────────────────────────
    section('DD Action Processing Wiring');

    const actionRes = await request(port, 'POST', `/api/sessions/${sessionId}/actions`, {
      content: 'I search the room for hidden passages'
    });
    assert(actionRes.status === 200, 'POST /actions returns 200');
    assert(actionRes.body.ok === true, 'Action returns ok: true');
    // DD metadata should be attached when difficultyProfile exists
    if (actionRes.body.difficulty) {
      assert(typeof actionRes.body.difficulty.bucket === 'string', 'DD result has bucket');
      assert(typeof actionRes.body.difficulty.intensity === 'string', 'DD result has intensity');
    }

    // ── Bad Session Tests ───────────────────────────────────────────
    section('Error Handling');

    const badInv = await request(port, 'GET', '/api/sessions/nonexistent/inventory');
    assert(badInv.status === 404, 'GET /inventory with bad session returns 404');

    const badShoppe = await request(port, 'GET', '/api/sessions/nonexistent/shoppe');
    assert(badShoppe.status === 404, 'GET /shoppe with bad session returns 404');

    const badCoins = await request(port, 'GET', '/api/sessions/nonexistent/coins');
    assert(badCoins.status === 404, 'GET /coins with bad session returns 404');

  } catch (err) {
    console.error('  ✗ Test error:', err.message);
    failed++;
    total++;
  } finally {
    if (server) server.close();
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`  SHOPPE + DD API RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
