'use strict';

const crypto = require('crypto');
const { TELEMETRY_SCHEMA_VERSION, validateEvent } = require('./event-schema');
const { redactContext, redactPayload } = require('./redact');
const { createNoopSink } = require('./sinks');

class TelemetryEmitter {
  constructor({ analyticsSink, operationalSink, clock, idFactory } = {}) {
    this.analyticsSink = analyticsSink || createNoopSink();
    this.operationalSink = operationalSink || createNoopSink();
    this.clock = clock || (() => new Date().toISOString());
    this.idFactory = idFactory || (() => `telemetry:${crypto.randomUUID()}`);
    this.emittedKeys = new Set();
    this.droppedEvents = 0;
  }

  emit({ stream = 'product', eventName, context, payload, idempotencyKey } = {}) {
    const key = idempotencyKey || `${stream}:${eventName}:${this.idFactory()}`;
    if (this.emittedKeys.has(key)) return false;
    const event = {
      eventId: this.idFactory(),
      schemaVersion: TELEMETRY_SCHEMA_VERSION,
      stream,
      eventName,
      timestamp: this.clock(),
      context: redactContext(context),
      payload: redactPayload(payload),
      idempotencyKey: key
    };
    try {
      validateEvent(event);
    } catch (_) {
      this.droppedEvents += 1;
      return false;
    }
    this.emittedKeys.add(key);
    const sink = stream === 'product' ? this.analyticsSink : this.operationalSink;
    try {
      const result = sink.record(event);
      Promise.resolve(result).catch(() => { this.droppedEvents += 1; });
    } catch (_) {
      this.droppedEvents += 1;
    }
    return true;
  }
}

module.exports = { TelemetryEmitter };