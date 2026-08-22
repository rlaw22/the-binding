'use strict';

const assert = require('assert');
const { compileAdventure } = require('../src/storyline-v2');
const { StorylineV2Service } = require('../src/storyline-v2/service');
const { TelemetryEmitter, createMemorySink, validateEvent, TELEMETRY_SCHEMA_VERSION } = require('../src/storyline-v2/telemetry');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

const adventure = compileAdventure({
  schemaVersion: '2.0', adventureId: 'telemetry-test', title: 'Telemetry Test',
  classes: ['scholar'], prologue: { startingSceneId: 'one' },
  scenes: [{ sceneId: 'one', setting: 'A quiet room.', actions: [
    { actionId: 'inspect', type: 'exploration', label: 'Inspect the room', keywords: ['inspect'], resolution: { resultType: 'discovery', narration: 'You inspect it.', discover: ['clue'] } },
    { actionId: 'leave', type: 'exit', label: 'Leave', resolution: { resultType: 'exit', narration: 'You leave.' } }
  ] }], graph: { entry: 'one', edges: [] }
});

console.log('\n=== Storyline v2 telemetry ===');

test('validates versioned event envelopes', () => {
  assert.doesNotThrow(() => validateEvent({ eventId: 'e1', schemaVersion: TELEMETRY_SCHEMA_VERSION, stream: 'product', eventName: 'session_started', timestamp: '2026-08-22T00:00:00.000Z', context: {}, payload: {} }));
  assert.throws(() => validateEvent({ eventId: 'e1', schemaVersion: 'wrong', stream: 'product', eventName: 'session_started', timestamp: new Date().toISOString() }));
  assert.throws(() => validateEvent({ eventId: 'e1', schemaVersion: TELEMETRY_SCHEMA_VERSION, stream: 'product', eventName: 'provider_request', timestamp: new Date().toISOString() }));
});

test('redacts unapproved payload fields and suppresses duplicate events', () => {
  const sink = createMemorySink();
  const emitter = new TelemetryEmitter({ analyticsSink: sink, clock: () => '2026-08-22T00:00:00.000Z', idFactory: (() => { let n = 0; return () => `id-${++n}`; })() });
  const payload = { actionId: 'inspect', text: 'private transcription', secret: 'do-not-record' };
  assert.strictEqual(emitter.emit({ eventName: 'action_resolved', context: { sessionId: 's1', sceneId: 'one', rawAudio: 'no' }, payload, idempotencyKey: 'turn:s1:t1' }), true);
  assert.strictEqual(emitter.emit({ eventName: 'action_resolved', context: { sessionId: 's1' }, payload, idempotencyKey: 'turn:s1:t1' }), false);
  assert.strictEqual(sink.events.length, 1);
  assert.deepStrictEqual(sink.events[0].payload, { actionId: 'inspect' });
  assert.strictEqual(Object.prototype.hasOwnProperty.call(sink.events[0].context, 'rawAudio'), false);
});

test('sink failures never throw into gameplay', () => {
  const emitter = new TelemetryEmitter({ analyticsSink: { record: () => { throw new Error('sink unavailable'); } }, idFactory: () => 'id' });
  assert.doesNotThrow(() => emitter.emit({ eventName: 'server_error', context: { sessionId: 's1' }, payload: { error: 'bounded' }, idempotencyKey: 'error:s1' }));
});

test('service emits authoritative events after persistence', () => {
  const sink = createMemorySink();
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure }, { telemetry: new TelemetryEmitter({ analyticsSink: sink, clock: () => '2026-08-22T00:00:00.000Z', idFactory: (() => { let n = 0; return () => `id-${++n}`; })() }) });
  const start = service.start({ adventureId: adventure.adventureId, sessionId: 's1', classId: 'scholar' });
  assert.ok(sink.events.some(event => event.eventName === 'session_started'));
  const result = service.submit({ sessionId: 's1', actionId: 'inspect', catalogVersion: start.catalog.catalogVersion, turnId: 't1' });
  assert.strictEqual(result.resultType, 'discovery');
  assert.strictEqual(sink.events.filter(event => event.eventName === 'action_resolved').length, 1);
  assert.strictEqual(sink.events.filter(event => event.eventName === 'discovery_selected').length, 1);
  service.submit({ sessionId: 's1', actionId: 'inspect', catalogVersion: result.catalog.catalogVersion, turnId: 't1' });
  assert.strictEqual(sink.events.filter(event => event.eventName === 'action_resolved').length, 1);
});

test('rejected submissions emit bounded failure events without mutation', () => {
  const sink = createMemorySink();
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure }, { telemetry: new TelemetryEmitter({ analyticsSink: sink }) });
  const start = service.start({ adventureId: adventure.adventureId, sessionId: 's2', classId: 'scholar' });
  const result = service.submit({ sessionId: 's2', actionId: 'inspect', catalogVersion: 'stale', turnId: 'bad' });
  assert.strictEqual(result.rejected, true);
  assert.strictEqual(result.error, 'STALE_CATALOG');
  assert.ok(sink.events.some(event => event.eventName === 'stale_submission'));
  assert.strictEqual(service.snapshot('s2').state.turnNumber, 0);
});
