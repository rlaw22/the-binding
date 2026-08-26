'use strict';

const TELEMETRY_SCHEMA_VERSION = 'storyline-v2-telemetry:1';

const PRODUCT_EVENTS = new Set([
  'session_started', 'session_resumed', 'session_paused', 'session_interrupted',
  'session_recovered', 'session_abandoned', 'session_completed', 'scene_entered',
  'action_presented', 'action_selected', 'action_resolved', 'discovery_selected',
  'branch_reached', 'ending_reached', 'submission_failed', 'stale_submission',
  'input_mode_changed', 'media_fallback', 'accessibility_mode_changed',
  'client_error', 'server_error'
]);

const OPERATIONAL_EVENTS = new Set([
  'provider_request', 'cache_hit', 'cache_miss', 'provider_retry',
  'provider_failure', 'quota_decision', 'usage_completed'
]);

function assertString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Telemetry ${name} is required`);
}

function validateEvent(event) {
  if (!event || typeof event !== 'object') throw new Error('Telemetry event is required');
  assertString(event.eventId, 'eventId');
  if (event.schemaVersion !== TELEMETRY_SCHEMA_VERSION) throw new Error('Unsupported telemetry schema version');
  if (event.stream !== 'product' && event.stream !== 'operational') throw new Error('Telemetry stream is invalid');
  const allowed = event.stream === 'product' ? PRODUCT_EVENTS : OPERATIONAL_EVENTS;
  if (!allowed.has(event.eventName)) throw new Error(`Telemetry event name is invalid: ${event.eventName}`);
  assertString(event.timestamp, 'timestamp');
  if (Number.isNaN(Date.parse(event.timestamp))) throw new Error('Telemetry timestamp is invalid');
  if (event.context != null && typeof event.context !== 'object') throw new Error('Telemetry context is invalid');
  if (event.payload != null && typeof event.payload !== 'object') throw new Error('Telemetry payload is invalid');
  return event;
}

module.exports = { TELEMETRY_SCHEMA_VERSION, PRODUCT_EVENTS, OPERATIONAL_EVENTS, validateEvent };