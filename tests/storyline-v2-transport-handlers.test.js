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

  await test('bookmark route maps add and remove operations to the application service', async () => {
    const calls = [];
    const handlers = createStorylineV2Handlers({
      enabled: true,
      service: {
        adventures: new Map(),
        addBookmark(input) { calls.push(['add', input]); return { bookmark: input.bookmarkId }; },
        removeBookmark(input) { calls.push(['remove', input]); return { removed: input.bookmarkId }; }
      }
    });
    const addResult = await handlers.bookmark(request({ bookmarkId: 'b1', label: 'The clue' }, { id: 's1' }), responseRecorder());
    const removeResult = await handlers.bookmark(request({ operation: 'remove', bookmarkId: 'b1' }, { id: 's1' }), responseRecorder());
    assert.deepStrictEqual(addResult, { bookmark: 'b1' });
    assert.deepStrictEqual(removeResult, { removed: 'b1' });
    assert.deepStrictEqual(calls, [
      ['add', { sessionId: 's1', bookmarkId: 'b1', label: 'The clue' }],
      ['remove', { sessionId: 's1', bookmarkId: 'b1' }]
    ]);
  });

  await test('journal route maps append requests and application errors to client errors', async () => {
    let call;
    const handlers = createStorylineV2Handlers({
      enabled: true,
      service: {
        adventures: new Map(),
        appendJournal(input) { call = input; return { journal: [input.entry] }; }
      }
    });
    const result = await handlers.journal(request({ entryId: 'j1', text: 'A clue.', kind: 'narrative' }, { id: 's2' }), responseRecorder());
    assert.deepStrictEqual(result, { journal: [{ entryId: 'j1', text: 'A clue.', kind: 'narrative' }] });
    assert.deepStrictEqual(call, {
      sessionId: 's2',
      entry: { entryId: 'j1', text: 'A clue.', kind: 'narrative' }
    });

    const failing = createStorylineV2Handlers({
      enabled: true,
      service: { adventures: new Map(), appendJournal() { throw new Error('Invalid journal entry'); } }
    });
    const reply = responseRecorder();
    await failing.journal(request({}, { id: 's2' }), reply);
    assert.strictEqual(reply.statusCode, 400);
    assert.deepStrictEqual(reply.payload, { error: 'Invalid journal entry' });
  });

  await test('bookmark and journal routes honor the V2 disabled boundary', async () => {
    const handlers = createStorylineV2Handlers({ enabled: false, service: { adventures: new Map() } });
    const bookmarkReply = responseRecorder();
    const journalReply = responseRecorder();
    await handlers.bookmark(request({}, { id: 's1' }), bookmarkReply);
    await handlers.journal(request({}, { id: 's1' }), journalReply);
    assert.strictEqual(bookmarkReply.statusCode, 404);
    assert.strictEqual(journalReply.statusCode, 404);
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
