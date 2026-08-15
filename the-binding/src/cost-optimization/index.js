/**
 * Cost Optimization — Main Integration Module
 *
 * Wires together all cost optimization components:
 *   1. Cost Tracker — per-session budget caps
 *   2. Model Router — intelligent model tiering
 *   3. Context Compressor — sliding window + summary
 *   4. TTS Cache — text-hashed audio caching
 *   5. Image Budget — image generation limits
 *
 * Usage:
 *   const { createCostOptimizer } = require('./cost-optimization');
 *   const optimizer = createCostOptimizer({ llmConfig, sessionId });
 *
 *   // In the LLM call path:
 *   const response = await optimizer.llm(messages, { callType: 'narration', playerAction });
 *
 *   // In the TTS path:
 *   const audio = await optimizer.tts(text, voiceSettings, originalGenerate);
 *
 *   // In the image path:
 *   const allowed = optimizer.canGenerateImage();
 */

'use strict';

const { createCostTracker } = require('./cost-tracker');
const { createModelRouter, classifyImportance } = require('./model-router');
const { createContextCompressor } = require('./context-compressor');
const { createTTSCache } = require('./tts-cache');

/**
 * Create a cost optimizer for a game session.
 *
 * @param {object} opts
 * @param {object} opts.llmConfig - LLM config { apiKey, baseUrl, model }
 * @param {string} opts.sessionId - Session ID
 * @returns {object} Cost optimizer API
 */
function createCostOptimizer(opts = {}) {
  const { llmConfig = {}, sessionId = 'unknown' } = opts;

  // 1. Cost tracker
  const costTracker = createCostTracker(sessionId);

  // 2. Model router (smart provider)
  const smartProvider = createModelRouter(llmConfig, costTracker);

  // 3. Context compressor
  const compressor = createContextCompressor({});

  // 4. TTS cache
  const ttsCache = createTTSCache();

  // Summary: Generate periodically
  ttsCache.cleanup(); // Cleanup old TTS cache on init

  return {
    // --- LLM ---
    /**
     * Smart LLM provider that selects the right model based on importance and budget.
     * Drop-in replacement for the raw llmProvider.
     *
     * @param {Array} messages - LLM messages
     * @param {object} context - { callType, playerAction, sceneState }
     * @returns {Promise<string>}
     */
    async llm(messages, context = {}) {
      return smartProvider(messages, context);
    },

    /**
     * Get the raw model router for advanced use cases.
     */
    get modelRouter() {
      return { classifyImportance, selectModel: require('./model-router').selectModel };
    },

    // --- Context Compression ---
    /**
     * Compress old context turns into a running summary.
     * Call this when the hot buffer exceeds the threshold.
     *
     * @param {Array} oldTurns - Turns to compress
     * @param {object} adventureContext - { adventureName, currentScene }
     * @returns {Promise<string>} Updated summary
     */
    async compressContext(oldTurns, adventureContext = {}) {
      // Use the smart provider (mini model) for summaries
      compressor.setProvider(async (messages) => {
        return smartProvider(messages, { callType: 'summary' });
      });
      return compressor.compress(oldTurns, adventureContext);
    },

    /**
     * Get the current running summary.
     */
    getContextSummary() {
      return compressor.getSummary();
    },

    /**
     * Check if compression is needed.
     */
    shouldCompress(hotTurns) {
      return compressor.shouldCompress(hotTurns);
    },

    /**
     * Get context compression stats.
     */
    getCompressionStats() {
      return compressor.getStats();
    },

    // --- TTS ---
    /**
     * Get audio for text, using cache if available.
     *
     * @param {string} text - Narration text
     * @param {object} voiceSettings - Voice settings
     * @param {function} originalGenerate - Original TTS generate function
     * @returns {Promise<object>} TTS result
     */
    async tts(text, voiceSettings = {}, originalGenerate) {
      if (!text || text.trim().length === 0) {
        return { taskId: null, status: 'skipped', reason: 'empty text' };
      }

      // Budget check
      const budget = costTracker.checkBudget('tts');
      if (!budget.allowed) {
        console.log(`[CostOptimizer] TTS skipped: ${budget.reason}`);
        return { taskId: null, status: 'skipped', reason: budget.reason };
      }

      // Check TTS cache first
      const cached = ttsCache.get(text, voiceSettings);
      if (cached.hit) {
        console.log(`[CostOptimizer] TTS cache hit (saved API call)`);
        const taskId = 'cached_' + Date.now().toString(36);
        return {
          taskId,
          status: 'complete',
          audioBase64: cached.audioBase64,
          audioType: cached.audioType,
          cached: true,
        };
      }

      // Generate via original provider
      if (!originalGenerate) {
        return { taskId: null, status: 'error', reason: 'No TTS generator provided' };
      }

      const result = await originalGenerate(text);

      // Cache the result
      if (result && result.audioBase64) {
        ttsCache.set(text, result.audioBase64, result.audioType || 'mp3', voiceSettings);
        // Record cost
        costTracker.recordTTS(text.length);
      }

      return result;
    },

    // --- Images ---
    /**
     * Check if image generation is allowed under the current budget.
     * @returns {{ allowed: boolean, reason?: string }}
     */
    canGenerateImage() {
      return costTracker.checkBudget('image');
    },

    /**
     * Record an image generation cost.
     * @param {string} model - Image model
     */
    recordImageCost(model) {
      return costTracker.recordImage(model);
    },

    // --- Budget ---
    /**
     * Get the cost tracker for direct access.
     */
    get costTracker() {
      return costTracker;
    },

    /**
     * Get a full cost summary.
     */
    getCostSummary() {
      return {
        ...costTracker.getSummary(),
        compression: compressor.getStats(),
        ttsCache: ttsCache.getStats(),
      };
    },

    /**
     * Get the recommended model for a given importance level.
     */
    getModel(importance) {
      const { model } = require('./model-router').selectModel({
        importance,
        costTracker,
        preferredModel: llmConfig.model || 'gpt-4o',
      });
      return model;
    },
  };
}

module.exports = {
  createCostOptimizer,
  createCostTracker,
  createModelRouter,
  createContextCompressor,
  createTTSCache,
};
