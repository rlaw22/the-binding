'use strict';

/**
 * In-memory session repository adapter. The application depends on this
 * contract; durable storage can replace the adapter without changing domain
 * resolution or use cases.
 */
class InMemorySessionRepository {
  constructor(seed = []) {
    this.sessions = new Map(seed.map(entry => [entry.sessionId, clone(entry.value || entry)]));
  }

  get(sessionId) {
    const value = this.sessions.get(sessionId);
    return value ? clone(value) : null;
  }

  has(sessionId) {
    return this.sessions.has(sessionId);
  }

  save(sessionId, value) {
    this.sessions.set(sessionId, clone(value));
    return clone(value);
  }

  delete(sessionId) {
    return this.sessions.delete(sessionId);
  }

  clear() {
    this.sessions.clear();
  }

  entries() {
    return Array.from(this.sessions, ([sessionId, value]) => ({ sessionId, value: clone(value) }));
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { InMemorySessionRepository };
