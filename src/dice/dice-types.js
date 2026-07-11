'use strict';

const crypto = require('crypto');

/**
 * Dice type catalogue for The Binding.
 *
 * Every die used in the game — from the humble d4 to the centesimal d100 — is
 * defined here with its face count, animation metadata, and helper functions
 * that the client renderer consumes.
 *
 * Animation files are expected at:
 *   /assets/dice/{type}/{animationPrefix}{variantIndex}.{ext}
 * where {ext} is determined by the asset pipeline (lottie json, webp sprite
 * sheet, etc.).  The service only hands back the *path* — the renderer loads
 * and plays it.
 */

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DiceType
 * @property {string}  type            — canonical name (e.g. 'd20')
 * @property {number}  faces           — number of faces (e.g. 20)
 * @property {number}  animationCount  — how many pre-baked animation variants exist
 * @property {string}  animationPrefix — filename prefix for this die's animations
 */

/** @type {DiceType[]} */
const DICE_TYPES = Object.freeze([
  Object.freeze({ type: 'd4',   faces: 4,   animationCount: 30, animationPrefix: 'd4_roll_'   }),
  Object.freeze({ type: 'd6',   faces: 6,   animationCount: 30, animationPrefix: 'd6_roll_'   }),
  Object.freeze({ type: 'd8',   faces: 8,   animationCount: 30, animationPrefix: 'd8_roll_'   }),
  Object.freeze({ type: 'd10',  faces: 10,  animationCount: 30, animationPrefix: 'd10_roll_'  }),
  Object.freeze({ type: 'd12',  faces: 12,  animationCount: 30, animationPrefix: 'd12_roll_'  }),
  Object.freeze({ type: 'd20',  faces: 20,  animationCount: 30, animationPrefix: 'd20_roll_'  }),
  Object.freeze({ type: 'd100', faces: 100, animationCount: 30, animationPrefix: 'd100_roll_' }),
]);

// Build a fast lookup map: 'd20' → DiceType
const DICE_MAP = new Map();
for (const dt of DICE_TYPES) {
  DICE_MAP.set(dt.type, dt);
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Get the DiceType definition for a given die name.
 *
 * @param {string} dieType — e.g. 'd20'
 * @returns {DiceType}
 * @throws {Error} if the die type is unknown
 */
function getDiceType(dieType) {
  const dt = DICE_MAP.get(dieType);
  if (!dt) {
    throw new Error(
      `Unknown die type "${dieType}". Valid types: ${[...DICE_MAP.keys()].join(', ')}`
    );
  }
  return dt;
}

// ---------------------------------------------------------------------------
// Animation selection
// ---------------------------------------------------------------------------

/**
 * Deterministically pick an animation variant for a given roll result.
 *
 * The mapping is stable: the same (dieType, result) always yields the same
 * animation file.  This lets server and client agree on the animation without
 * transmitting it explicitly (useful for replay / spectating).
 *
 * File path format: `/assets/dice/{type}/{prefix}{1-based-index}`
 *   e.g. `/assets/dice/d20/d20_roll_14`
 *
 * @param {string} dieType — e.g. 'd20'
 * @param {number} result  — the roll result (1-based, e.g. 1–20 for d20)
 * @returns {{ file: string, duration: number }}
 */
function getAnimationForRoll(dieType, result) {
  const dt = getDiceType(dieType);

  // Map result into animation index range [0, animationCount-1]
  // Using result % animationCount gives a stable, deterministic mapping.
  const index = (result - 1) % dt.animationCount;       // 0-based
  const padded = String(index + 1).padStart(2, '0');     // 1-based, zero-padded
  const file = `/assets/dice/${dt.type}/${dt.animationPrefix}${padded}`;

  // Duration in milliseconds — scales slightly with face count to match the
  // physical "weight" of the die.  Base 800ms + 20ms per face.
  const duration = 800 + dt.faces * 20;

  return { file, duration };
}

/**
 * Pick a *random* animation variant, avoiding recently used ones.
 *
 * When the client is showing rapid successive rolls (e.g. a flurry of d6 for
 * a fireball), repeating the same animation back-to-back looks jarring.  This
 * function selects uniformly from the variants that were NOT in
 * `recentAnimations`, falling back to full range when all variants are recent
 * (i.e. after 30+ consecutive rolls of the same die).
 *
 * @param {string}   dieType         — e.g. 'd6'
 * @param {number}   result          — the roll result (for duration calc)
 * @param {string[]} recentAnimations — file paths of recently used animations
 *                                      for this die type (caller maintains this)
 * @returns {{ file: string, duration: number }}
 */
function getRandomAnimation(dieType, result, recentAnimations) {
  const dt = getDiceType(dieType);

  // Build a Set for O(1) membership checks
  const recent = new Set(recentAnimations || []);

  // Collect all candidate animation file paths, excluding recent ones
  const candidates = [];
  for (let i = 0; i < dt.animationCount; i++) {
    const padded = String(i + 1).padStart(2, '0');
    const file = `/assets/dice/${dt.type}/${dt.animationPrefix}${padded}`;
    if (!recent.has(file)) {
      candidates.push(file);
    }
  }

  // If everything is recent, reset — use the full pool
  const pool = candidates.length > 0 ? candidates : (() => {
    const all = [];
    for (let i = 0; i < dt.animationCount; i++) {
      const padded = String(i + 1).padStart(2, '0');
      all.push(`/assets/dice/${dt.type}/${dt.animationPrefix}${padded}`);
    }
    return all;
  })();

  // Pick uniformly from the pool using crypto randomness
  const idx = cryptoRandomIndex(pool.length);
  const file = pool[idx];

  const duration = 800 + dt.faces * 20;
  return { file, duration };
}

/**
 * Uniform random index in [0, n-1] using crypto.randomBytes.
 * Kept private to this module — avoids importing random.js (which would
 * create a circular dependency if random.js ever needed dice-types).
 *
 * @param {number} n — pool size (> 0)
 * @returns {number}
 */
function cryptoRandomIndex(n) {
  if (n <= 0) return 0;
  if (n === 1) return 0;

  // For small n (<= 256), a single byte with rejection sampling is enough
  if (n <= 256) {
    const threshold = 256 - (256 % n);
    let byte;
    do {
      byte = crypto.randomBytes(1)[0];
    } while (byte >= threshold);
    return byte % n;
  }

  // For larger n, use 4 bytes (we only have 30 animations max, so this path
  // is future-proofing — never reached with current dice types)
  const max = 0x100000000; // 2^32
  const threshold = max - (max % n);
  let val;
  do {
    const buf = crypto.randomBytes(4);
    val = buf.readUInt32BE(0);
  } while (val >= threshold);
  return val % n;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  DICE_TYPES,
  getDiceType,
  getAnimationForRoll,
  getRandomAnimation,
};
