'use strict';

const assert = require('assert');
const { createServer } = require('../src/api/server');

async function main() {
  const disabled = await createServer({ llmConfig: { mock: true }, persistence: false });
  try {
    let response = await disabled.inject({ method: 'GET', url: '/api/storyline-v2/status' });
    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(JSON.parse(response.payload), { enabled: false, adventures: [] });
    response = await disabled.inject({ method: 'POST', url: '/api/storyline-v2/sessions', payload: { sessionId: 'disabled-test' } });
    assert.strictEqual(response.statusCode, 404);
  } finally {
    await disabled.close();
  }

  const app = await createServer({ storylineV2Enabled: true, llmConfig: { mock: true }, persistence: false });
  try {
    let response = await app.inject({ method: 'GET', url: '/api/storyline-v2/status' });
    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(JSON.parse(response.payload), { enabled: true, adventures: ['dracula'] });

    response = await app.inject({
      method: 'POST', url: '/api/storyline-v2/sessions',
      payload: { adventureId: 'dracula', sessionId: 'api-v2-test', classId: 'cleric' }
    });
    assert.strictEqual(response.statusCode, 200);
    const start = JSON.parse(response.payload);
    assert.strictEqual(start.state.sceneId, 'scene_00');
    assert.ok(start.catalog.actions.length > 0);

    response = await app.inject({
      method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/actions',
      payload: { actionId: start.catalog.actions[0].actionId, catalogVersion: start.catalog.catalogVersion, turnId: 'api-turn-1' }
    });
    assert.strictEqual(response.statusCode, 200);
    const result = JSON.parse(response.payload);
    assert.strictEqual(result.turnId, 'api-turn-1');
    assert.ok(result.catalog);

    response = await app.inject({ method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/actions', payload: { actionId: start.catalog.actions[0].actionId, catalogVersion: start.catalog.catalogVersion, turnId: 'api-stale-turn' } });
    assert.strictEqual(response.statusCode, 409);
    assert.strictEqual(JSON.parse(response.payload).error, 'STALE_CATALOG');
    assert.ok(JSON.parse(response.payload).catalog.actions.length > 0);

    response = await app.inject({ method: 'GET', url: '/api/storyline-v2/sessions/api-v2-test' });
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(JSON.parse(response.payload).state.turnNumber, 1);

    response = await app.inject({ method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/actions', payload: { text: 'an impossible action', turnId: 'api-turn-2' } });
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(JSON.parse(response.payload).status, 'no_match');
  } finally {
    await app.close();
  }
  console.log('  ✓ Storyline v2 API transport');
}

main().catch(error => { console.error(`  ✗ Storyline v2 API transport: ${error.message}`); process.exitCode = 1; });
