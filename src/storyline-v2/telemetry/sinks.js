'use strict';

function createNoopSink() {
  return { record: () => undefined };
}

function createMemorySink() {
  const events = [];
  return {
    events,
    record(event) { events.push(JSON.parse(JSON.stringify(event))); }
  };
}

module.exports = { createNoopSink, createMemorySink };