'use strict';

const { TELEMETRY_SCHEMA_VERSION, PRODUCT_EVENTS, OPERATIONAL_EVENTS, validateEvent } = require('./event-schema');
const { redactContext, redactPayload } = require('./redact');
const { createNoopSink, createMemorySink } = require('./sinks');
const { TelemetryEmitter } = require('./emitter');

module.exports = {
  TELEMETRY_SCHEMA_VERSION,
  PRODUCT_EVENTS,
  OPERATIONAL_EVENTS,
  validateEvent,
  redactContext,
  redactPayload,
  createNoopSink,
  createMemorySink,
  TelemetryEmitter
};