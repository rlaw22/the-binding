'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Small durable adapter for Storyline V2 sessions.
 *
 * The repository stores cloned session envelopes in one JSON document and
 * replaces that document through a same-directory temporary file + rename.
 * Domain code remains unaware of the filesystem. Revision and lease checks
 * are explicit so a later database adapter can implement the same contract.
 */
class FileSessionRepository {
  constructor(filePath, options = {}) {
    if (!filePath) throw new Error('Session repository file path is required');
    this.filePath = path.resolve(filePath);
    this.clock = options.clock || (() => Date.now());
    this.leaseDurationMs = options.leaseDurationMs || 30_000;
    this._leases = new Map();
  }

  _read() {
    if (!fs.existsSync(this.filePath)) return {};
    const text = fs.readFileSync(this.filePath, 'utf8');
    if (!text.trim()) return {};
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid Storyline session repository document');
    }
    return parsed;
  }

  _write(document) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    try {
      fs.writeFileSync(temporary, `${JSON.stringify(document, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
      fs.renameSync(temporary, this.filePath);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }

  get(sessionId) {
    const value = this._read()[sessionId];
    return value ? clone(value) : null;
  }

  has(sessionId) {
    return Object.prototype.hasOwnProperty.call(this._read(), sessionId);
  }

  save(sessionId, value, options = {}) {
    const document = this._read();
    const current = document[sessionId];
    const expectedRevision = options.expectedRevision;
    if (expectedRevision != null && (!current || current.state.revision !== expectedRevision)) {
      throw new Error(`SESSION_REVISION_CONFLICT:${sessionId}`);
    }
    if (options.leaseToken && !this._ownsLease(sessionId, options.leaseToken)) {
      throw new Error(`SESSION_LEASE_CONFLICT:${sessionId}`);
    }
    document[sessionId] = clone(value);
    this._write(document);
    return clone(value);
  }

  delete(sessionId) {
    const document = this._read();
    const existed = Object.prototype.hasOwnProperty.call(document, sessionId);
    if (existed) {
      delete document[sessionId];
      this._write(document);
    }
    this._leases.delete(sessionId);
    return existed;
  }

  clear() {
    this._write({});
    this._leases.clear();
  }

  entries() {
    const document = this._read();
    return Object.keys(document).sort().map(sessionId => ({
      sessionId,
      value: clone(document[sessionId])
    }));
  }

  acquireLease(sessionId, ownerId) {
    if (!ownerId) throw new Error('Lease owner is required');
    const existing = this._leases.get(sessionId);
    const now = this.clock();
    if (existing && existing.expiresAt > now && existing.ownerId !== ownerId) {
      throw new Error(`SESSION_LEASE_CONFLICT:${sessionId}`);
    }
    const token = crypto.randomBytes(16).toString('hex');
    this._leases.set(sessionId, { ownerId, token, expiresAt: now + this.leaseDurationMs });
    return { token, expiresAt: new Date(now + this.leaseDurationMs).toISOString() };
  }

  releaseLease(sessionId, token) {
    if (!this._ownsLease(sessionId, token)) return false;
    this._leases.delete(sessionId);
    return true;
  }

  _ownsLease(sessionId, token) {
    const lease = this._leases.get(sessionId);
    if (!lease || lease.expiresAt <= this.clock() || lease.token !== token) return false;
    return true;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { FileSessionRepository };