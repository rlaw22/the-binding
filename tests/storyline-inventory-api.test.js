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
    const sessionId = created.json().sessionId;
    const story = await app.inject({ method: 'GET', url: `/api/sessions/${sessionId}/storyline-inventory` });
    assert.strictEqual(story.statusCode, 200, story.body);
    assert.ok(story.json().items.some(item => item.id === 'crucifix'));
    assert.strictEqual(story.json().items.find(item => item.id === 'crucifix').name, 'Brass Crucifix');

    const campaign = await app.inject({ method: 'GET', url: `/api/sessions/${sessionId}/inventory` });
    assert.strictEqual(campaign.statusCode, 200, campaign.body);
    assert.deepStrictEqual(campaign.json().items, []);
    console.log('  ✓ Storyline inventory is separate from Campaign inventory');
  } finally {
    await app.close();
  }
})().catch(err => { console.error('  ✗ API test failed:', err); process.exitCode = 1; });
