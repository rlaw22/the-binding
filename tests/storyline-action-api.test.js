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

    // Regression: an atmospheric filler action must not let the LLM invent
    // an NPC interaction or award an item.
    const fillerCreated = await server.inject({
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
    const fillerSession = fillerCreated.json();
    const fillerResponse = await server.inject({
      method: 'POST',
      url: `/api/sessions/${fillerSession.sessionId}/actions`,
      payload: {
        content: 'Review what you know about your destination',
        actionId: 'filler_scene_00_1',
        contentId: null,
        playerId: fillerSession.playerId
      }
    });
    assert.equal(fillerResponse.statusCode, 200);
    assert.doesNotMatch(fillerResponse.json().narrative, /old woman|garlic/i);
    const fillerInventory = await server.inject({
      method: 'GET',
      url: `/api/sessions/${fillerSession.sessionId}/storyline-inventory`
    });
    assert.deepEqual(fillerInventory.json().items, []);

    // Regression: the authored old-woman discovery awards garlic and says so.
    const garlicResponse = await server.inject({
      method: 'POST',
      url: `/api/sessions/${fillerSession.sessionId}/actions`,
      payload: {
        content: 'Approach the old woman in the corner',
        actionId: 'find_old_woman',
        contentId: 'find_old_woman',
        playerId: fillerSession.playerId
      }
    });
    assert.equal(garlicResponse.statusCode, 200);
    assert.match(garlicResponse.json().narrative, /Garlic Bulb|garlic.*possession/i);
    const garlicInventory = await server.inject({
      method: 'GET',
      url: `/api/sessions/${fillerSession.sessionId}/storyline-inventory`
    });
    assert.ok(garlicInventory.json().items.some(item => item.id === 'garlic'));

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

    // Regression: a consumed discovery must not replay through a legacy
    // label-only submission after the stable action has already been used.
    const replayCreated = await server.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: {
        adventureId: 'dracula', gameMode: 'storyline', playerName: 'Law',
        characterClass: 'cleric', characterRace: 'human'
      }
    });
    const replaySession = replayCreated.json();
    const first = await server.inject({
      method: 'POST',
      url: `/api/sessions/${replaySession.sessionId}/actions`,
      payload: {
        content: 'Examine the brass crucifix', actionId: 'examine_crucifix',
        contentId: 'examine_crucifix', playerId: replaySession.playerId
      }
    });
    assert.equal(first.statusCode, 200);
    const beforeReplay = (await server.inject({
      method: 'GET', url: `/api/sessions/${replaySession.sessionId}/storyline-inventory`
    })).json().items.length;
    const replay = await server.inject({
      method: 'POST',
      url: `/api/sessions/${replaySession.sessionId}/actions`,
      payload: {
        content: 'Examine the brass crucifix', playerId: replaySession.playerId
      }
    });
    assert.equal(replay.statusCode, 200);
    const afterReplay = (await server.inject({
      method: 'GET', url: `/api/sessions/${replaySession.sessionId}/storyline-inventory`
    })).json().items.length;
    assert.equal(afterReplay, beforeReplay, 'legacy replay must not add another item');
    assert.doesNotMatch(replay.json().narrative, /Brass Crucifix.*possession/i, 'legacy replay must not repeat acquisition');

    console.log('✓ Storyline action API regression passed');
  } finally {
    await server.close();
  }
})().catch(error => {
  console.error('✗ Storyline action API regression failed:', error);
  process.exitCode = 1;
});
