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

  const personal = await createServer({ storylineV2PersonalTestToken: 'personal-test-secret', llmConfig: { mock: true }, persistence: false });
  try {
    let response = await personal.inject({ method: 'GET', url: '/api/storyline-v2-personal/status' });
    assert.strictEqual(response.statusCode, 401);
    assert.ok(response.headers['www-authenticate']);
    response = await personal.inject({ method: 'GET', url: '/api/storyline-v2-personal/status', headers: { authorization: 'Bearer wrong' } });
    assert.strictEqual(response.statusCode, 401);
    response = await personal.inject({ method: 'GET', url: '/api/storyline-v2-personal/status', headers: { authorization: 'Bearer personal-test-secret' } });
    assert.deepStrictEqual(JSON.parse(response.payload), { enabled: true, adventures: ['dracula'] });
    response = await personal.inject({ method: 'POST', url: '/api/storyline-v2-personal/sessions', headers: { authorization: 'Bearer personal-test-secret' }, payload: { adventureId: 'frankenstein', sessionId: 'personal-unsupported' } });
    assert.strictEqual(response.statusCode, 400);
    response = await personal.inject({ method: 'POST', url: '/api/storyline-v2-personal/sessions', headers: { authorization: 'Bearer personal-test-secret' }, payload: { adventureId: 'dracula', sessionId: 'personal-dracula', classId: 'cleric' } });
    assert.strictEqual(response.statusCode, 200);
  } finally {
    await personal.close();
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

    const checkResponse = await app.inject({
      method: 'POST', url: '/api/storyline-v2/sessions',
      payload: { adventureId: 'dracula', sessionId: 'api-check-test', classId: 'cleric' }
    });
    assert.strictEqual(checkResponse.statusCode, 200);
    const checkStart = JSON.parse(checkResponse.payload);
    const checkAction = checkStart.catalog.actions.find(action => action.actionId === 'scene_00__study_guestbook');
    assert.ok(checkAction);
    response = await app.inject({
      method: 'POST', url: '/api/storyline-v2/sessions/api-check-test/actions',
      payload: { actionId: checkAction.actionId, catalogVersion: checkStart.catalog.catalogVersion, turnId: 'api-check-turn' }
    });
    assert.strictEqual(response.statusCode, 200);
    const checkResult = JSON.parse(response.payload);
    assert.strictEqual(checkResult.resultType, 'check_failure');
    assert.strictEqual(checkResult.check.ability, 'investigate');
    assert.strictEqual(checkResult.check.roll, 12);
    assert.strictEqual(checkResult.check.success, false);


    response = await app.inject({
      method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/actions',
      payload: { actionId: start.catalog.actions[0].actionId, catalogVersion: start.catalog.catalogVersion, turnId: 'api-turn-1' }
    });
    assert.strictEqual(response.statusCode, 200);
    const result = JSON.parse(response.payload);
    assert.strictEqual(result.turnId, 'api-turn-1');
    assert.ok(result.catalog);

    const retryResponse = await app.inject({
      method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/actions',
      payload: { actionId: start.catalog.actions[0].actionId, catalogVersion: result.catalog.catalogVersion, turnId: 'api-turn-1' }
    });
    assert.strictEqual(retryResponse.statusCode, 200);
    assert.deepStrictEqual(JSON.parse(retryResponse.payload), result);

    response = await app.inject({ method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/actions', payload: { actionId: start.catalog.actions[0].actionId, catalogVersion: start.catalog.catalogVersion, turnId: 'api-stale-turn' } });
    assert.strictEqual(response.statusCode, 409);
    assert.strictEqual(JSON.parse(response.payload).error, 'STALE_CATALOG');
    assert.ok(JSON.parse(response.payload).catalog.actions.length > 0);

    response = await app.inject({ method: 'GET', url: '/api/storyline-v2/sessions/api-v2-test' });
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(JSON.parse(response.payload).state.turnNumber, 1);

    response = await app.inject({
      method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/bookmarks',
      payload: { bookmarkId: 'api-bookmark', label: 'The first clue' }
    });
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(JSON.parse(response.payload).state.bookmarks[0].bookmarkId, 'api-bookmark');

    response = await app.inject({
      method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/journal',
      payload: { entryId: 'api-journal', text: 'A clue enters the journal.', kind: 'narrative' }
    });
    assert.strictEqual(response.statusCode, 200);
    const journal = JSON.parse(response.payload).state.journal;
    assert.strictEqual(journal.length, 2);
    assert.strictEqual(journal[0].entryId, 'turn:api-turn-1');
    assert.strictEqual(journal[1].entryId, 'api-journal');

    response = await app.inject({
      method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/bookmarks',
      payload: { operation: 'remove', bookmarkId: 'api-bookmark' }
    });
    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(JSON.parse(response.payload).state.bookmarks, []);

    response = await app.inject({ method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/transition', payload: { to: 'paused' } });
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(JSON.parse(response.payload).state.lifecycle, 'paused');

    response = await app.inject({
      method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/actions',
      payload: { actionId: start.catalog.actions[0].actionId, catalogVersion: JSON.parse((await app.inject({ method: 'GET', url: '/api/storyline-v2/sessions/api-v2-test' })).payload).catalog.catalogVersion, turnId: 'paused-turn' }
    });
    assert.strictEqual(response.statusCode, 422);
    assert.strictEqual(JSON.parse(response.payload).error, 'SESSION_NOT_PLAYABLE');

    response = await app.inject({ method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/transition', payload: { to: 'active' } });
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(JSON.parse(response.payload).state.lifecycle, 'active');

    response = await app.inject({ method: 'POST', url: '/api/storyline-v2/sessions/api-v2-test/actions', payload: { text: 'an impossible action', turnId: 'api-turn-2' } });
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(JSON.parse(response.payload).status, 'no_match');
  } finally {
    await app.close();
  }
  console.log('  ✓ Storyline v2 API transport');
}

main().catch(error => { console.error(`  ✗ Storyline v2 API transport: ${error.message}`); process.exitCode = 1; });
