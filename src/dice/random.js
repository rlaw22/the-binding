'use strict';

const crypto = require('crypto');

/**
 * Cryptographically secure random number generation for The Binding's dice system.
 * All randomness flows through crypto.randomBytes — no Math.random, no PRNG, no shortcuts.
 *
 * Performance target: < 1ms per roll on commodity hardware.
 */

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/**
 * Return `n` cryptographically random bytes.
 * Thin wrapper that keeps a single import surface for the rest of the dice module.
 *
 * @param {number} n — number of bytes (must be > 0)
 * @returns {Buffer}
 */
function randomBytes(n) {
  if (!Number.isInteger(n) || n <= 0) {
    throw new RangeError(`randomBytes: n must be a positive integer, got ${n}`);
  }
  return crypto.randomBytes(n);
}

/**
 * Uniform random integer in [min, max] inclusive, with no modulo bias.
 *
 * Uses rejection sampling on a 48-bit random value (6 bytes) so the result is
 * perfectly uniform regardless of range size.  Typical dice ranges (1–4 … 1–100)
 * resolve in a single iteration with overwhelming probability.
 *
 * @param {number} min — lower bound (inclusive), integer
 * @param {number} max — upper bound (inclusive), integer, must be >= min
 * @returns {number} integer in [min, max]
 */
function randomInt(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new TypeError('randomInt: min and max must be integers');
  }
  if (max < min) {
    throw new RangeError(`randomInt: max (${max}) must be >= min (${min})`);
  }
  if (min === max) return min;

  const range = max - min;                    // number of gaps
  // We need ceiling(log2(range+1)) bits.  Use 6 bytes (48 bits) which handles
  // ranges up to 2^48 — more than enough for any game die.
  const bytesNeeded = 6;
  const limit = Math.pow(2, bytesNeeded * 8); // 2^48

  // Rejection threshold: largest multiple of (range+1) that fits in 48 bits
  // This guarantees uniformity — we discard samples that would introduce bias.
  const threshold = limit - (limit % (range + 1));

  let value;
  do {
    const buf = randomBytes(bytesNeeded);
    // Read as unsigned 48-bit big-endian integer (fits safely in JS Number)
    value = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      value = value * 256 + buf[i];
    }
  } while (value >= threshold);

  return min + (value % (range + 1));
}

// ---------------------------------------------------------------------------
// Provably-fair proof system
// ---------------------------------------------------------------------------

/**
 * Generate a provably-fair proof for a dice roll.
 *
 * The proof is SHA-256(seed + '|' + timestamp + '|' + nonce).
 * - `seed`   — server-generated secret for this session/roll batch
 * - `nonce`  — monotonically increasing counter per seed (caller tracks this)
 * - `timestamp` — ISO-8601 UTC string captured at roll time
 *
 * The caller publishes the proof *before* the roll result is revealed.
 * After the roll, the caller publishes (seed, nonce, timestamp, result) so
 * any party can recompute and verify the hash.
 *
 * @param {string} seed   — session secret (>= 16 chars recommended)
 * @param {number} nonce  — roll counter for this seed
 * @returns {{ proof: string, seed: string, nonce: number, timestamp: string }}
 */
function generateProof(seed, nonce) {
  if (typeof seed !== 'string' || seed.length === 0) {
    throw new TypeError('generateProof: seed must be a non-empty string');
  }
  if (!Number.isInteger(nonce) || nonce < 0) {
    throw new RangeError('generateProof: nonce must be a non-negative integer');
  }

  const timestamp = new Date().toISOString();
  const payload = `${seed}|${timestamp}|${nonce}`;

  const proof = crypto
    .createHash('sha256')
    .update(payload, 'utf8')
    .digest('hex');

  return { proof, seed, nonce, timestamp };
}

/**
 * Verify that a proof hash matches the claimed (seed, nonce, timestamp).
 *
 * @param {string} proof     — the SHA-256 hex string that was published
 * @param {string} seed      — the seed revealed after the roll
 * @param {number} nonce     — the nonce revealed after the roll
 * @param {string} timestamp — the ISO-8601 timestamp revealed after the roll
 * @returns {boolean} true iff the proof is valid
 */
function verifyProof(proof, seed, nonce, timestamp) {
  if (
    typeof proof !== 'string' ||
    typeof seed !== 'string' ||
    !Number.isInteger(nonce) ||
    typeof timestamp !== 'string'
  ) {
    return false;
  }

  const payload = `${seed}|${timestamp}|${nonce}`;
  const expected = crypto
    .createHash('sha256')
    .update(payload, 'utf8')
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (proof.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(proof, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  randomBytes,
  randomInt,
  generateProof,
  verifyProof,
};
