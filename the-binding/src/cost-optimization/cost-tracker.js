/**
 * Cost Tracker — Per-Session Budget Caps & Usage Monitoring
 *
 * Tracks estimated cost per API call (LLM, TTS, Images) and enforces
 * hard budget caps to prevent runaway spending.
 *
 * Tiers:
 *   $0-$5   → Full quality (GPT-4o, images, TTS)
 *   $5-$10  → Downgrade to GPT-4o-mini, no new images
 *   $10+    → GPT-4o-mini only, no images, no TTS
 */

'use strict';

// Pricing per 1M tokens (OpenAI as of 2025)
const PRICING = {
  // LLM input/output per 1M tokens
  'gpt-4o':       { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':  { input: 0.15,  output: 0.60 },
  // TTS per 1M characters
  'gpt-4o-mini-tts': { perMillionChars: 12.00 },
  // Image generation per image
  'dall-e-3':     { perImage: 0.04 },   // standard 1024x1024
  'gpt-image-1':  { perImage: 0.02 },   // cheaper model
};

// Budget thresholds (configurable via env)
const DEFAULT_TIER1_LIMIT = parseFloat(process.env.COST_TIER1_LIMIT) || 5.0;   // Full quality
const DEFAULT_TIER2_LIMIT = parseFloat(process.env.COST_TIER2_LIMIT) || 10.0;  // Reduced quality
const DEFAULT_HARD_LIMIT  = parseFloat(process.env.COST_HARD_LIMIT)  || 15.0;  // Emergency shutoff

/**
 * Create a cost tracker for a session.
 */
function createCostTracker(sessionId) {
  const tracker = {
    sessionId,
    totalCost: 0,
    llmCost: 0,
    ttsCost: 0,
    imageCost: 0,
    calls: {
      llm: 0,
      tts: 0,
      images: 0,
    },
    tier: 1,  // 1 = full, 2 = reduced, 3 = emergency
    createdAt: Date.now(),
  };

  return {
    get sessionId() { return tracker.sessionId; },
    get totalCost() { return tracker.totalCost; },
    get llmCost() { return tracker.llmCost; },
    get ttsCost() { return tracker.ttsCost; },
    get imageCost() { return tracker.imageCost; },
    get calls() { return { ...tracker.calls }; },
    get tier() { return tracker.tier; },

    /**
     * Estimate cost of an LLM call and record it.
     * @param {string} model - Model name
     * @param {number} inputTokens - Input token count
     * @param {number} outputTokens - Output token count
     * @returns {number} Estimated cost in USD
     */
    recordLLM(model, inputTokens, outputTokens) {
      const pricing = PRICING[model] || PRICING['gpt-4o-mini'];
      const cost = (inputTokens / 1_000_000) * pricing.input
                 + (outputTokens / 1_000_000) * pricing.output;
      tracker.llmCost += cost;
      tracker.totalCost += cost;
      tracker.calls.llm++;
      this._updateTier();
      return cost;
    },

    /**
     * Estimate LLM cost from message array (rough: 4 chars ≈ 1 token).
     * Used when we don't have actual token counts.
     */
    estimateAndRecordLLM(model, messages, responseLength) {
      const inputChars = messages.reduce((sum, m) => sum + (m.content || '').length, 0);
      const inputTokens = Math.ceil(inputChars / 4);
      const outputTokens = Math.ceil(responseLength / 4);
      return this.recordLLM(model, inputTokens, outputTokens);
    },

    /**
     * Record a TTS generation cost.
     * @param {number} charCount - Number of characters synthesized
     */
    recordTTS(charCount) {
      const pricing = PRICING['gpt-4o-mini-tts'];
      const cost = (charCount / 1_000_000) * pricing.perMillionChars;
      tracker.ttsCost += cost;
      tracker.totalCost += cost;
      tracker.calls.tts++;
      this._updateTier();
      return cost;
    },

    /**
     * Record an image generation cost.
     * @param {string} model - Image model name
     */
    recordImage(model) {
      const pricing = PRICING[model] || PRICING['gpt-image-1'];
      const cost = pricing.perImage;
      tracker.imageCost += cost;
      tracker.totalCost += cost;
      tracker.calls.images++;
      this._updateTier();
      return cost;
    },

    /**
     * Check if a certain type of call is allowed under the current budget.
     * @param {string} callType - 'llm_premium', 'llm_mini', 'image', 'tts'
     * @returns {{ allowed: boolean, reason?: string }}
     */
    checkBudget(callType) {
      // Hard limit — block everything
      if (tracker.totalCost >= DEFAULT_HARD_LIMIT) {
        return {
          allowed: false,
          reason: `Session hard limit ($${DEFAULT_HARD_LIMIT.toFixed(2)}) reached. All API calls blocked.`,
        };
      }

      // Tier 1: everything allowed
      if (tracker.totalCost < DEFAULT_TIER1_LIMIT) {
        return { allowed: true };
      }

      // Tier 2: only mini LLM and TTS allowed
      if (tracker.totalCost < DEFAULT_TIER2_LIMIT) {
        if (callType === 'image') {
          return {
            allowed: false,
            reason: `Budget tier 2 ($${tracker.totalCost.toFixed(2)}/$${DEFAULT_TIER2_LIMIT.toFixed(2)}). Image generation disabled to save cost.`,
          };
        }
        if (callType === 'llm_premium') {
          return {
            allowed: false,
            reason: `Budget tier 2 — using gpt-4o-mini instead of gpt-4o.`,
          };
        }
        return { allowed: true };
      }

      // Tier 3: only mini LLM allowed, no images, no TTS
      if (callType === 'image' || callType === 'tts') {
        return {
          allowed: false,
          reason: `Budget tier 3 ($${tracker.totalCost.toFixed(2)}/$${DEFAULT_HARD_LIMIT.toFixed(2)}). ${callType} disabled.`,
        };
      }
      if (callType === 'llm_premium') {
        return {
          allowed: false,
          reason: `Budget tier 3 — using gpt-4o-mini only.`,
        };
      }
      return { allowed: true };
    },

    /**
     * Get the recommended model for the current budget tier.
     * @param {string} preferredModel - The model the caller wants to use
     * @returns {string} The model to actually use
     */
    resolveModel(preferredModel) {
      const budget = this.checkBudget('llm_premium');
      if (!budget.allowed) {
        return 'gpt-4o-mini';
      }
      return preferredModel;
    },

    /**
     * Update the tier based on total spend.
     * @private
     */
    _updateTier() {
      if (tracker.totalCost >= DEFAULT_TIER2_LIMIT) {
        tracker.tier = 3;
      } else if (tracker.totalCost >= DEFAULT_TIER1_LIMIT) {
        tracker.tier = 2;
      } else {
        tracker.tier = 1;
      }
    },

    /**
     * Get a summary of the session cost.
     */
    getSummary() {
      return {
        sessionId: tracker.sessionId,
        totalCost: Math.round(tracker.totalCost * 10000) / 10000,
        llmCost: Math.round(tracker.llmCost * 10000) / 10000,
        ttsCost: Math.round(tracker.ttsCost * 10000) / 10000,
        imageCost: Math.round(tracker.imageCost * 10000) / 10000,
        calls: { ...tracker.calls },
        tier: tracker.tier,
        tierLimits: {
          tier1: DEFAULT_TIER1_LIMIT,
          tier2: DEFAULT_TIER2_LIMIT,
          hard: DEFAULT_HARD_LIMIT,
        },
        uptime: Math.round((Date.now() - tracker.createdAt) / 1000),
      };
    },
  };
}

module.exports = { createCostTracker, PRICING };
