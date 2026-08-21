'use strict';

const assert = require('assert');
const { createStorylineV2Handlers } = require('../src/storyline-v2/transport/handlers');

function responseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.payload = payload; return payload; }
  };
}

function request(body = {}, params = {}) { return { body, params }; }
async function test(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

(async () => {
  console.log('\n=== Storyline v2 transport boundary ===');

  await test('disabled handlers reject sessions without invoking application state', async () => {
    let called = false;
    const handlers = createStorylineV2Handlers({
      enabled: false,
      service: { adventures: new Map(), start() { called = true; } }
    });
    const reply = responseRecorder();
    await handlers.start(request({ sessionId: 'disabled' }), reply);
    assert.strictEqual(reply.statusCode, 404);
    assert.strictEqual(called, false);
  });

  await test('status exposes the registered adventure IDs', async () => {
    const handlers = createStorylineV2Handlers({
      enabled: true,
      service: { adventures: new Map([['dracula', {}]]) }
    });
    const result = await handlers.status(request(), responseRecorder());
    assert.deepStrictEqual(result, { enabled: true, adventures: ['dracula'] });
  });

  await test('start maps application errors to a client error', async () => {
    const handlers = createStorylineV2Handlers({
      enabled: true,
      service: { adventures: new Map(), start() { throw new Error('Session ID is required'); } }
    });
    const reply = responseRecorder();
    await handlers.start(request({}), reply);
    assert.strictEqual(reply.statusCode, 400);
    assert.deepStrictEqual(reply.payload, { error: 'Session ID is required' });
  });

  await test('transition maps lifecycle changes and invalid targets cleanly', async () => {
    const calls = [];
    const handlers = createStorylineV2Handlers({
      enabled: true,
      service: {
        adventures: new Map(),
        transition(input) { calls.push(input); return { state: { lifecycle: input.to } }; }
      }
    });
    const reply = responseRecorder();
    const result = await handlers.transition(request({ to: 'paused' }, { id: 's1' }), reply);
    assert.deepStrictEqual(result, { state: { lifecycle: 'paused' } });
    assert.deepStrictEqual(calls, [{ sessionId: 's1', to: 'paused' }]);

    const invalidReply = responseRecorder();
    await handlers.transition(request({}, { id: 's1' }), invalidReply);
    assert.strictEqual(invalidReply.statusCode, 400);
  });

  await test('submit maps stale catalogs to conflict and other rejections to unprocessable entity', async () => {
    const handlers = createStorylineV2Handlers({
      enabled: true,
      service: {
        adventures: new Map(),
        submit() { return { rejected: true, error: 'STALE_CATALOG' }; }
      }
    });
    const staleReply = responseRecorder();
    await handlers.submit(request({ actionId: 'look' }, { id: 's1' }), staleReply);
    assert.strictEqual(staleReply.statusCode, 409);

    const rejectedHandlers = createStorylineV2Handlers({
      enabled: true,
      service: {
        adventures: new Map(),
        submit() { return { rejected: true, error: 'ACTION_UNAVAILABLE' }; }
      }
    });
    const rejectedReply = responseRecorder();
    await rejectedHandlers.submit(request({ actionId: 'look' }, { id: 's1' }), rejectedReply);
    assert.strictEqual(rejectedReply.statusCode, 422);
  });
})();
