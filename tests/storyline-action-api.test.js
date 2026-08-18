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
    }

    console.log('✓ Storyline action API regression passed');
  } finally {
    await server.close();
  }
})().catch(error => {
  console.error('✗ Storyline action API regression failed:', error);
  process.exitCode = 1;
});
