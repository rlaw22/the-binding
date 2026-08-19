#!/usr/bin/env node
/** Regression coverage for the live Storyline action request path. */
const assert = require('node:assert/strict');
const { createServer } = require('../src/api/server');

(async () => {
  const server = await createServer({
    llmConfig: { mock: true, apiKey: '', baseUrl: '', model: 'mock' }
  });

  try {
    const actions = [
      ['Examine the brass crucifix', 'examine_crucifix'],
      ['Search the fireplace mantel', 'search_mantel'],
      ['Search the bench near the fireplace where the shawl lies', 'read_letter']
    ];

    for (const [content, actionId] of actions) {
      const created = await server.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: {
          adventureId: 'dracula',
          gameMode: 'storyline',
          playerName: 'Law',
          characterClass: 'cleric',
          characterRace: 'human'
        }
      });
      assert.equal(created.statusCode, 200, `create session for ${actionId}`);
      const session = created.json();

      if (actionId === 'examine_crucifix') {
        const beforeInventory = await server.inject({
          method: 'GET',
          url: `/api/sessions/${session.sessionId}/storyline-inventory`
        });
        assert.deepEqual(beforeInventory.json().items, [], 'crucifix should not be granted before examination');
      }

      const response = await server.inject({
        method: 'POST',
        url: `/api/sessions/${session.sessionId}/actions`,
        payload: {
          content,
          actionId,
          contentId: actionId,
          playerId: session.playerId
        }
      });

      assert.equal(response.statusCode, 200, `${actionId} should return HTTP 200`);
      const body = response.json();
      assert.equal(body.ok, true, `${actionId} should be accepted`);
      assert.ok(body.narrative, `${actionId} should return narration`);
      assert.notEqual(body.narrative, 'Something went wrong — try again.');
      if (actionId === 'examine_crucifix') {
        assert.match(body.narrative, /Brass Crucifix/);
        const afterInventory = await server.inject({
          method: 'GET',
          url: `/api/sessions/${session.sessionId}/storyline-inventory`
        });
        assert.ok(afterInventory.json().items.some(item => item.id === 'crucifix'), 'examination should award crucifix');
      }
    }

    // Regression: stale/malformed clients must not crash the action handler
    // when action metadata is an object instead of a stable string ID.
    const malformedCreated = await server.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: {
        adventureId: 'dracula',
        gameMode: 'storyline',
        playerName: 'Law',
        characterClass: 'cleric',
        characterRace: 'human'
      }
    });
    const malformedSession = malformedCreated.json();
    const malformedResponse = await server.inject({
      method: 'POST',
      url: `/api/sessions/${malformedSession.sessionId}/actions`,
      payload: {
        content: 'Search the fireplace mantel',
        actionId: { id: 'search_mantel' },
        contentId: { id: 'search_mantel' },
        playerId: malformedSession.playerId
      }
    });
    assert.equal(malformedResponse.statusCode, 200, 'malformed metadata should fall back safely');
    assert.equal(malformedResponse.json().ok, true, 'malformed metadata action should be accepted');

    console.log('✓ Storyline action API regression passed');
  } finally {
    await server.close();
  }
})().catch(error => {
  console.error('✗ Storyline action API regression failed:', error);
  process.exitCode = 1;
});
