'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const META_KEY = '__storyline_v2_repository_meta__';
const DEFAULT_LOCK_TIMEOUT_MS = 10_000;
const LOCK_RETRY_MS = 5;

/**
 * Durable Storyline V2 session repository.
 *
 * Sessions and leases are stored in one JSON document. Every read-modify-write
 * mutation is protected by an exclusive sibling lock file, so separate Node
 * processes share revision and lease ownership rather than keeping it in local
 * memory. The lock is stale-recoverable for process-crash recovery.
 */
class FileSessionRepository {
  constructor(filePath, options = {}) {
    if (!filePath) throw new Error('Session repository file path is required');
    this.filePath = path.resolve(filePath);
    this.lockPath = `${this.filePath}.lock`;
    this.clock = options.clock || (() => Date.now());
    this.leaseDurationMs = options.leaseDurationMs || 30_000;
    this.lockTimeoutMs = options.lockTimeoutMs || DEFAULT_LOCK_TIMEOUT_MS;
    this._lockOwner = `${process.pid}-${crypto.randomBytes(8).toString('hex')}`;
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

  _withLock(operation) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const startedAt = this.clock();
    let descriptor;
    while (!descriptor) {
      try {
        descriptor = fs.openSync(this.lockPath, 'wx');
        fs.writeFileSync(descriptor, JSON.stringify({ owner: this._lockOwner, createdAt: this.clock() }));
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        let stale = false;
        try {
          stale = this.clock() - fs.statSync(this.lockPath).mtimeMs > this.lockTimeoutMs;
        } catch (statError) {
          if (statError.code !== 'ENOENT') throw statError;
        }
        if (stale) {
          try { fs.unlinkSync(this.lockPath); } catch (unlinkError) {
            if (unlinkError.code !== 'ENOENT') throw unlinkError;
          }
        } else if (this.clock() - startedAt >= this.lockTimeoutMs) {
          throw new Error('SESSION_REPOSITORY_LOCK_TIMEOUT');
        } else {
          sleep(LOCK_RETRY_MS);
        }
      }
    }
    try {
      return operation();
    } finally {
      try { fs.closeSync(descriptor); } catch (_) { /* already closed */ }
      try { fs.unlinkSync(this.lockPath); } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }

  _meta(document) {
    const existing = document[META_KEY];
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      document[META_KEY] = { leases: {} };
    } else if (!existing.leases || typeof existing.leases !== 'object') {
      existing.leases = {};
    }
    return document[META_KEY];
  }

  _leaseIsValid(lease) {
    return lease && lease.expiresAt > this.clock();
  }

  get(sessionId) {
    const value = this._read()[sessionId];
    return value ? clone(value) : null;
  }

  has(sessionId) {
    return Object.prototype.hasOwnProperty.call(this._read(), sessionId);
  }

  save(sessionId, value, options = {}) {
    return this._withLock(() => {
      const document = this._read();
      const current = document[sessionId];
      const expectedRevision = options.expectedRevision;
      if (expectedRevision != null && (!current || current.state.revision !== expectedRevision)) {
        throw new Error(`SESSION_REVISION_CONFLICT:${sessionId}`);
      }
      if (options.leaseToken && !this._ownsLeaseInDocument(document, sessionId, options.leaseToken)) {
        throw new Error(`SESSION_LEASE_CONFLICT:${sessionId}`);
      }
      document[sessionId] = clone(value);
      this._write(document);
      return clone(value);
    });
  }

  delete(sessionId) {
    return this._withLock(() => {
      const document = this._read();
      const existed = Object.prototype.hasOwnProperty.call(document, sessionId);
      if (existed) delete document[sessionId];
      const meta = this._meta(document);
      delete meta.leases[sessionId];
      if (existed) this._write(document);
      else if (Object.keys(meta.leases).length === 0 && document[META_KEY]) this._write(document);
      return existed;
    });
  }

  clear() {
    return this._withLock(() => this._write({}));
  }

  entries() {
    const document = this._read();
    return Object.keys(document).filter(key => key !== META_KEY).sort().map(sessionId => ({
      sessionId,
      value: clone(document[sessionId])
    }));
  }

  acquireLease(sessionId, ownerId) {
    if (!ownerId) throw new Error('Lease owner is required');
    return this._withLock(() => {
      const document = this._read();
      const meta = this._meta(document);
      const existing = meta.leases[sessionId];
      const now = this.clock();
      if (this._leaseIsValid(existing) && existing.ownerId !== ownerId) {
        throw new Error(`SESSION_LEASE_CONFLICT:${sessionId}`);
      }
      const token = crypto.randomBytes(16).toString('hex');
      const expiresAt = now + this.leaseDurationMs;
      meta.leases[sessionId] = { ownerId, token, expiresAt };
      this._write(document);
      return { token, expiresAt: new Date(expiresAt).toISOString() };
    });
  }

  releaseLease(sessionId, token) {
    return this._withLock(() => {
      const document = this._read();
      const meta = this._meta(document);
      if (!this._ownsLeaseInDocument(document, sessionId, token)) return false;
      delete meta.leases[sessionId];
      this._write(document);
      return true;
    });
  }

  _ownsLeaseInDocument(document, sessionId, token) {
    const meta = document[META_KEY];
    const lease = meta && meta.leases && meta.leases[sessionId];
    return Boolean(this._leaseIsValid(lease) && lease.token === token);
  }
}

function sleep(milliseconds) {
  if (milliseconds <= 0) return;
  const wait = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(wait, 0, 0, milliseconds);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { FileSessionRepository };
