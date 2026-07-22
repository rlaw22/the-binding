/**
 * Access Control — Mode access management for The Binding.
 *
 * BETA PHASE: Any valid beta token grants access to ALL modes (Storyline, Campaign, Digital DM).
 * PRODUCTION: Will switch to on-chain contract checks (smart contract wallet → mode access).
 *
 * This module sits between the token store (auth) and the game session (gameplay),
 * providing a single source of truth for "can this user play this mode?"
 */

const TokenStore = require('../auth/token-store');

// Game modes — extends SessionMode with Digital DM
const GameMode = Object.freeze({
  STORYLINE: 'storyline',       // Book-based adventures (Dracula, Frankenstein, Holmes)
  CAMPAIGN: 'campaign',         // Open-ended D&D with AI DM
  DIGITAL_DM: 'digital_dm'     // Freeform voice conversation with AI DM
});

// Access source — determines how access was granted
const AccessSource = Object.freeze({
  BETA: 'beta',         // Beta token — free access during testing
  ONCHAIN: 'onchain',   // Smart contract — paid access (production)
  ADMIN: 'admin'        // Admin override
});

// Default pricing (production — used when on-chain mode is enabled)
const DEFAULT_PRICING = Object.freeze({
  [GameMode.STORYLINE]: { type: 'per_book', price_pax: 2.99, label: '$2.99 per book' },
  [GameMode.CAMPAIGN]: { type: 'day_pass', price_pax: 4.99, label: '$4.99 / day pass' },
  [GameMode.DIGITAL_DM]: { type: 'day_pass', price_pax: 7.99, label: '$7.99 / day pass' }
});

// Runtime config
let useOnChain = false;  // false during beta, true when contract is live

/**
 * Check if a token/wallet has access to a specific game mode.
 *
 * @param {string} tokenCode - Beta token code (BIND-XXXX)
 * @param {string} mode - One of GameMode values
 * @param {string} [walletAddress] - Optional wallet address (for on-chain checks)
 * @returns {{ allowed: boolean, source: string, reason: string, token?: object }}
 */
function checkAccess(tokenCode, mode, walletAddress = null) {
  // Validate the mode
  if (!Object.values(GameMode).includes(mode)) {
    return { allowed: false, source: null, reason: `Unknown mode: ${mode}` };
  }

  // Beta path: valid token = full access to all modes
  if (!useOnChain) {
    const token = TokenStore.validateToken(tokenCode);
    if (!token) {
      return { allowed: false, source: AccessSource.BETA, reason: 'Invalid or expired beta token' };
    }
    return {
      allowed: true,
      source: AccessSource.BETA,
      reason: 'Beta access — all modes unlocked',
      token: { code: token.code, label: token.label }
    };
  }

  // On-chain path (production): check smart contract
  // TODO: Wire up contract.hasBookAccess(wallet, bookId) / contract.hasPassAccess(wallet, mode)
  if (walletAddress) {
    return {
      allowed: false,
      source: AccessSource.ONCHAIN,
      reason: 'On-chain access check not yet implemented — use beta tokens'
    };
  }

  return { allowed: false, source: AccessSource.ONCHAIN, reason: 'Wallet address required for on-chain access' };
}

/**
 * Get the full access profile for a token — what modes they can access.
 * Used by the frontend to show mode selection UI.
 *
 * @param {string} tokenCode - Beta token code
 * @returns {{ valid: boolean, modes: object, source: string }}
 */
function getAccessProfile(tokenCode) {
  const token = TokenStore.validateToken(tokenCode);

  if (!token) {
    return {
      valid: false,
      source: null,
      modes: {
        [GameMode.STORYLINE]: { allowed: false, pricing: DEFAULT_PRICING[GameMode.STORYLINE] },
        [GameMode.CAMPAIGN]: { allowed: false, pricing: DEFAULT_PRICING[GameMode.CAMPAIGN] },
        [GameMode.DIGITAL_DM]: { allowed: false, pricing: DEFAULT_PRICING[GameMode.DIGITAL_DM] }
      }
    };
  }

  // During beta: all modes unlocked
  return {
    valid: true,
    source: useOnChain ? AccessSource.ONCHAIN : AccessSource.BETA,
    label: token.label,
    modes: {
      [GameMode.STORYLINE]: {
        allowed: true,
        pricing: DEFAULT_PRICING[GameMode.STORYLINE]
      },
      [GameMode.CAMPAIGN]: {
        allowed: true,
        pricing: DEFAULT_PRICING[GameMode.CAMPAIGN]
      },
      [GameMode.DIGITAL_DM]: {
        allowed: true,
        pricing: DEFAULT_PRICING[GameMode.DIGITAL_DM]
      }
    }
  };
}

/**
 * Switch between beta (server-side) and production (on-chain) access control.
 * @param {boolean} enabled - true = on-chain, false = beta tokens
 */
function setOnChainMode(enabled) {
  useOnChain = !!enabled;
  console.log(`[AccessControl] Mode set to: ${useOnChain ? 'ON-CHAIN' : 'BETA'}`);
}

/**
 * Check if currently using on-chain access control.
 */
function isOnChain() {
  return useOnChain;
}

module.exports = {
  GameMode,
  AccessSource,
  DEFAULT_PRICING,
  checkAccess,
  getAccessProfile,
  setOnChainMode,
  isOnChain
};
