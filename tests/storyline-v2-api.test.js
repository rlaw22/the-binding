'use strict';

const assert = require('assert');
const { createServer } = require('../src/api/server');
const { createStorylineV2ViewModel, createStorylineV2ResultViewModel } = require('../src/storyline-v2/presentation');

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
    assert.strictEqual(start.state.sceneId, 'dracula_full_01');
    assert.ok(start.catalog.actions.length > 0);
    const startView = createStorylineV2ViewModel(start);
    assert.strictEqual(startView.scene.sceneId, start.catalog.sceneId);
    assert.strictEqual(startView.catalogVersion, start.catalog.catalogVersion);
    assert.strictEqual(startView.textInput.catalogVersion, start.catalog.catalogVersion);
    assert.deepStrictEqual(
      startView.textInput.legalActions.map(action => action.actionId),
      start.catalog.actions.map(action => action.actionId)
    );
    assert.ok(startView.textInput.enabled);

    const checkResponse = await app.inject({
      method: 'POST', url: '/api/storyline-v2/sessions',
      payload: { adventureId: 'dracula', sessionId: 'api-check-test', classId: 'cleric' }
    });
    assert.strictEqual(checkResponse.statusCode, 200);
    const checkStart = JSON.parse(checkResponse.payload);
    const checkAction = checkStart.catalog.actions.find(action => action.actionId === 'dracula_full_01__landlord');
    assert.ok(checkAction);
    response = await app.inject({
      method: 'POST', url: '/api/storyline-v2/sessions/api-check-test/actions',
      payload: { actionId: checkAction.actionId, catalogVersion: checkStart.catalog.catalogVersion, turnId: 'api-check-turn' }
    });
    assert.strictEqual(response.statusCode, 200);
    const checkResult = JSON.parse(response.payload);
    assert.strictEqual(checkResult.resultType, 'discovery');
    assert.ok(checkResult.dramaticBeat.nextObjective);
    assert.ok(checkResult.dramaticBeat.changedSituation);
    const checkResultView = createStorylineV2ResultViewModel(checkResult);
    assert.strictEqual(checkResultView.continuity.nextObjective, checkResult.dramaticBeat.nextObjective);
    assert.strictEqual(checkResultView.continuity.changedSituation, checkResult.dramaticBeat.changedSituation);
    const checkAfterView = createStorylineV2ViewModel({
      adventureId: checkStart.adventureId,
      state: checkResult.state,
      catalog: checkResult.catalog
    });
    assert.strictEqual(checkAfterView.catalogVersion, checkResult.catalog.catalogVersion);
    assert.ok(checkAfterView.textInput.enabled);
    assert.deepStrictEqual(
      checkAfterView.textInput.legalActions.map(action => action.actionId),
      checkResult.catalog.actions.map(action => action.actionId)
    );


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
    assert.strictEqual(journal.length, 2, 'manual journal entry is appended after the resolved action');
    assert.strictEqual(journal[0].actionId, start.catalog.actions[0].actionId);
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
