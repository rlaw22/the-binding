/**
 * Token Store — Beta access code management.
 *
 * Tokens are persisted as a JSON file so they survive server restarts.
 * Each token tracks: code, label (tester name), createdAt, active status.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_PATH = path.join(__dirname, '..', '..', 'data', 'beta-tokens.json');

let tokens = [];

/**
 * Ensure the data directory exists and load tokens from disk.
 */
function loadTokens() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(STORE_PATH)) {
      tokens = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('[TokenStore] Failed to load tokens:', err.message);
    tokens = [];
  }
}

/**
 * Save tokens to disk.
 */
function saveTokens() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(tokens, null, 2));
  } catch (err) {
    console.error('[TokenStore] Failed to save tokens:', err.message);
  }
}

/**
 * Generate a new beta token.
 * Format: BIND-XXXX (4 chars, uppercase alphanumeric excluding confusing chars)
 */
function generateToken(label = '', maxSessions = 0) {
  // Exclude confusing chars: 0/O, 1/I/L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let suffix = '';
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) {
    suffix += chars[bytes[i] % chars.length];
  }
  const code = `BIND-${suffix}`;

  const token = {
    code,
    label: label || `Tester-${tokens.length + 1}`,
    createdAt: new Date().toISOString(),
    active: true,
    maxSessions: maxSessions || 0, // 0 = unlimited
    sessionsCreated: 0,
    lastUsedAt: null
  };

  tokens.push(token);
  saveTokens();
  return token;
}

/**
 * Validate a token code. Returns the token object if valid, null otherwise.
 */
function validateToken(code) {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  const token = tokens.find(t => t.code === normalized);
  if (!token || !token.active) return null;

  // Check session limit
  if (token.maxSessions > 0 && token.sessionsCreated >= token.maxSessions) {
    return null;
  }

  return token;
}

/**
 * Record that a session was created with this token.
 */
function recordSession(code) {
  const normalized = (code || '').trim().toUpperCase();
  const token = tokens.find(t => t.code === normalized);
  if (token) {
    token.sessionsCreated++;
    token.lastUsedAt = new Date().toISOString();
    saveTokens();
  }
}

/**
 * Revoke a token by code.
 */
function revokeToken(code) {
  const normalized = (code || '').trim().toUpperCase();
  const token = tokens.find(t => t.code === normalized);
  if (token) {
    token.active = false;
    saveTokens();
    return true;
  }
  return false;
}

/**
 * Reactivate a token by code.
 */
function activateToken(code) {
  const normalized = (code || '').trim().toUpperCase();
  const token = tokens.find(t => t.code === normalized);
  if (token) {
    token.active = true;
    saveTokens();
    return true;
  }
  return false;
}

/**
 * List all tokens (admin view).
 */
function listTokens() {
  return tokens.map(t => ({
    code: t.code,
    label: t.label,
    active: t.active,
    sessionsCreated: t.sessionsCreated,
    maxSessions: t.maxSessions,
    lastUsedAt: t.lastUsedAt,
    createdAt: t.createdAt
  }));
}

/**
 * Get token count.
 */
function getTokenCount() {
  return {
    total: tokens.length,
    active: tokens.filter(t => t.active).length,
    revoked: tokens.filter(t => !t.active).length
  };
}

// Load on module init
loadTokens();


// --- Beta Signup Storage (NDA + Questionnaire) ---
const SIGNUP_PATH = path.join(__dirname, '..', '..', 'data', 'beta-signups.json');
let signups = [];

function loadSignups() {
  try {
    const dir = path.dirname(SIGNUP_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(SIGNUP_PATH)) {
      signups = JSON.parse(fs.readFileSync(SIGNUP_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('[TokenStore] Failed to load signups:', err.message);
    signups = [];
  }
}

function saveSignups() {
  try {
    const dir = path.dirname(SIGNUP_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SIGNUP_PATH, JSON.stringify(signups, null, 2));
  } catch (err) {
    console.error('[TokenStore] Failed to save signups:', err.message);
  }
}

function recordSignup(tokenCode, ndaAccepted, questionnaire) {
  const normalized = (tokenCode || '').trim().toUpperCase();
  const signup = {
    token: normalized,
    ndaAccepted: !!ndaAccepted,
    acceptedAt: new Date().toISOString(),
    questionnaire: questionnaire || {}
  };
  signups.push(signup);
  saveSignups();
  return signup;
}

function getSignups() {
  return signups;
}

loadSignups();

module.exports = {generateToken,
  validateToken,
  recordSession,
  revokeToken,
  activateToken,
  listTokens,
  getTokenCount,
  loadTokens,
  saveTokens,  recordSignup,
  getSignups
};;
