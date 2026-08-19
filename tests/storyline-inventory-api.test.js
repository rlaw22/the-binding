#!/usr/bin/env node
/** API regression test for Storyline/Campaign inventory separation. */
const assert = require('assert');
const { createServer } = require('../src/api/server');

(async () => {
  const app = await createServer({ llmConfig: { mock: true, apiKey: '', baseUrl: '', model: 'mock' } });
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { adventureId: 'dracula', playerName: 'Inventory Tester', gameMode: 'storyline' }
    });
    assert.strictEqual(created.statusCode, 200, created.body);
    const session = created.json();
    const storyBefore = await app.inject({ method: 'GET', url: `/api/sessions/${session.sessionId}/storyline-inventory` });
    assert.strictEqual(storyBefore.statusCode, 200, storyBefore.body);
    assert.deepStrictEqual(storyBefore.json().items, []);

    const action = await app.inject({
      method: 'POST',
      url: `/api/sessions/${session.sessionId}/actions`,
      payload: {
        content: 'Examine the brass crucifix',
        actionId: 'examine_crucifix',
        contentId: 'examine_crucifix',
        playerId: session.playerId
      }
    });
    assert.strictEqual(action.statusCode, 200, action.body);
    assert.match(action.json().narrative, /Brass Crucifix/);

    const story = await app.inject({ method: 'GET', url: `/api/sessions/${session.sessionId}/storyline-inventory` });
    assert.strictEqual(story.statusCode, 200, story.body);
    assert.ok(story.json().items.some(item => item.id === 'crucifix'));
    assert.strictEqual(story.json().items.find(item => item.id === 'crucifix').name, 'Brass Crucifix');

    const campaign = await app.inject({ method: 'GET', url: `/api/sessions/${session.sessionId}/inventory` });
    assert.strictEqual(campaign.statusCode, 200, campaign.body);
    assert.deepStrictEqual(campaign.json().items, []);
    console.log('  ✓ Storyline inventory is separate from Campaign inventory');
  } finally {
    await app.close();
  }
})().catch(err => { console.error('  ✗ API test failed:', err); process.exitCode = 1; });
