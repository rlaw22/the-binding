/**
 * error-recovery.js — Error Recovery Middleware for Image Generation
 *
 * Provides graceful degradation when image generation fails:
 * - Retry with exponential backoff
 * - Fallback to mock provider when all real providers fail
 * - Structured failure logging
 * - Circuit breaker pattern for repeated failures
 */

'use strict';

const { _buildProvider } = require('./image-service');

// ---------------------------------------------------------------------------
// Failure Logger
// ---------------------------------------------------------------------------

class ImageFailureLogger {
  constructor() {
    this._failures = [];
    this._maxEntries = 100;
  }

  /**
   * Log an image generation failure.
   * @param {object} ctx
   * @param {string} ctx.imageType - 'scene', 'combat', 'npc', 'item'
   * @param {string} ctx.provider - Provider name that failed
   * @param {Error} ctx.error - The error
   * @param {number} ctx.attempt - Attempt number
   * @param {string} [ctx.sessionId] - Session ID
   * @param {string} [ctx.prompt] - Truncated prompt for debugging
   */
  log(ctx) {
    const entry = {
      timestamp: Date.now(),
      imageType: ctx.imageType,
      provider: ctx.provider,
      error: ctx.error.message,
      attempt: ctx.attempt,
      sessionId: ctx.sessionId || null,
      promptPreview: (ctx.prompt || '').slice(0, 120),
    };

    this._failures.push(entry);

    // Trim to max size
    if (this._failures.length > this._maxEntries) {
      this._failures = this._failures.slice(-this._maxEntries);
    }

    console.warn(
      `[ImageRecovery] ${ctx.imageType} image failed (attempt ${ctx.attempt}, ` +
      `provider: ${ctx.provider}): ${ctx.error.message}`
    );
  }

  /**
   * Get recent failures.
   * @param {number} [limit=20]
   * @returns {object[]}
   */
  getRecent(limit = 20) {
    return this._failures.slice(-limit);
  }

  /**
   * Get failure count by type.
   * @returns {object} { scene: N, combat: N, npc: N, item: N }
   */
  getCounts() {
    const counts = {};
    for (const f of this._failures) {
      counts[f.imageType] = (counts[f.imageType] || 0) + 1;
    }
    return counts;
  }

  /**
   * Clear failure log.
   */
  clear() {
    this._failures = [];
  }
}

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------

/**
 * Simple circuit breaker to avoid hammering a failing provider.
 * States: closed (normal) → open (failing, skip provider) → half-open (try one request)
 */
class CircuitBreaker {
  constructor(opts = {}) {
    this._failureThreshold = opts.failureThreshold || 5;
    this._resetTimeoutMs = opts.resetTimeoutMs || 60_000;
    this._states = new Map(); // providerName → { failures, state, openedAt }
  }

  /**
   * Check if a provider is available.
   * @param {string} providerName
   * @returns {boolean}
   */
  isAvailable(providerName) {
    const state = this._states.get(providerName);
    if (!state) return true;
    if (state.state === 'closed') return true;

    // Check if reset timeout has elapsed → half-open
    if (Date.now() - state.openedAt >= this._resetTimeoutMs) {
      state.state = 'half-open';
      return true; // Allow one attempt
    }

    return false; // Still open
  }

  /**
   * Record a successful call.
   * @param {string} providerName
   */
  recordSuccess(providerName) {
    const state = this._states.get(providerName);
    if (state) {
      state.failures = 0;
      state.state = 'closed';
    }
  }

  /**
   * Record a failed call.
   * @param {string} providerName
   */
  recordFailure(providerName) {
    let state = this._states.get(providerName);
    if (!state) {
      state = { failures: 0, state: 'closed', openedAt: 0 };
      this._states.set(providerName, state);
    }

    state.failures++;
    if (state.failures >= this._failureThreshold) {
      state.state = 'open';
      state.openedAt = Date.now();
      console.warn(
        `[ImageRecovery] Circuit breaker OPEN for provider "${providerName}" ` +
        `(${state.failures} consecutive failures). Will retry after ${this._resetTimeoutMs / 1000}s.`
      );
    }
  }

  /**
   * Get circuit breaker stats.
   * @returns {object}
   */
  stats() {
    const result = {};
    for (const [name, state] of this._states) {
      result[name] = { ...state };
    }
    return result;
  }

  /**
   * Reset all circuit breakers.
   */
  reset() {
    this._states.clear();
  }
}

// ---------------------------------------------------------------------------
// Error Recovery Wrapper
// ---------------------------------------------------------------------------

/**
 * Create an error recovery wrapper around an image service.
 *
 * @param {object} imageService - The image service instance (from createImageService)
 * @param {object} [opts]
 * @param {number} [opts.maxRetries] - Max retries per provider (default 2)
 * @param {number} [opts.baseDelayMs] - Base delay for exponential backoff (default 1000)
 * @param {number} [opts.maxDelayMs] - Max delay cap (default 10000)
 * @param {boolean} [opts.fallbackToMock] - Fall back to mock provider on total failure (default true)
 * @param {number} [opts.circuitBreakerThreshold] - Failures before opening circuit (default 5)
 * @returns {object} Wrapped image service with error recovery
 */
function createErrorRecovery(imageService, opts = {}) {
  const maxRetries = opts.maxRetries !== undefined ? opts.maxRetries : 2;
  const baseDelayMs = opts.baseDelayMs || 1000;
  const maxDelayMs = opts.maxDelayMs || 10000;
  const fallbackToMock = opts.fallbackToMock !== undefined ? opts.fallbackToMock : true;

  const failureLogger = new ImageFailureLogger();
  const circuitBreaker = new CircuitBreaker({
    failureThreshold: opts.circuitBreakerThreshold || 5,
    resetTimeoutMs: opts.circuitBreakerResetMs || 60_000,
  });

  /**
   * Sleep for a given number of milliseconds.
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute with exponential backoff retry.
   */
  async function withRetry(fn, retries, imageType, sessionId) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          const delay = Math.min(
            baseDelayMs * Math.pow(2, attempt) + Math.random() * baseDelayMs,
            maxDelayMs
          );
          console.log(
            `[ImageRecovery] Retrying ${imageType} image (attempt ${attempt + 2}/${retries + 1}) ` +
            `after ${Math.round(delay)}ms: ${err.message}`
          );
          await sleep(delay);
        }
      }
    }
    throw lastErr;
  }

  /**
   * Generate with fallback to mock provider.
   */
  async function generateWithFallback(generateFn, imageType, context = {}) {
    const sessionId = context.sessionId;

    // Try the primary generation with retries
    try {
      const result = await withRetry(generateFn, maxRetries, imageType, sessionId);
      circuitBreaker.recordSuccess('primary');
      return result;
    } catch (err) {
      failureLogger.log({
        imageType,
        provider: imageService.providerName || 'unknown',
        error: err,
        attempt: maxRetries + 1,
        sessionId,
      });

      // Fallback to mock if enabled
      if (fallbackToMock) {
        console.log(`[ImageRecovery] Falling back to mock provider for ${imageType} image`);
        try {
          const mockProvider = _buildProvider('mock');
          if (mockProvider) {
            // Build a basic prompt for the mock provider
            const mockPrompt = buildMockPrompt(imageType, context);
            const mockResult = await mockProvider.generate(mockPrompt, mockProvider);
            failureLogger.log({
              imageType,
              provider: 'Mock (fallback)',
              error: new Error('Used mock fallback — primary provider failed'),
              attempt: 0,
              sessionId,
            });
            return mockResult;
          }
        } catch (mockErr) {
          failureLogger.log({
            imageType,
            provider: 'Mock (fallback)',
            error: mockErr,
            attempt: 0,
            sessionId,
          });
        }
      }

      return null;
    }
  }

  /**
   * Build a basic prompt for mock fallback.
   */
  function buildMockPrompt(imageType, context) {
    const parts = ['A dark gothic literary illustration.'];
    switch (imageType) {
      case 'combat':
        parts.push('A dramatic combat scene.');
        if (context.attacker) parts.push(`Attacker: ${context.attacker}.`);
        if (context.defender) parts.push(`Defender: ${context.defender}.`);
        break;
      case 'npc':
        parts.push('A character portrait.');
        if (context.name) parts.push(`Name: ${context.name}.`);
        if (context.role) parts.push(`Role: ${context.role}.`);
        break;
      case 'item':
        parts.push('An illustration of a mysterious object.');
        if (context.name) parts.push(`Item: ${context.name}.`);
        if (context.type) parts.push(`Type: ${context.type}.`);
        break;
      default:
        parts.push('A mysterious scene.');
    }
    return parts.join(' ');
  }

  // Return wrapped service
  return {
    /**
     * Generate a scene image with error recovery.
     */
    async generateScene(context = {}) {
      return generateWithFallback(
        () => imageService.generateScene(context),
        'scene',
        context
      );
    },

    /**
     * Generate a combat image with error recovery.
     */
    async generateCombat(context = {}) {
      return generateWithFallback(
        () => imageService.generateCombat(context),
        'combat',
        context
      );
    },

    /**
     * Generate an NPC portrait with error recovery.
     */
    async generateNpcPortrait(context = {}) {
      return generateWithFallback(
        () => imageService.generateNpcPortrait(context),
        'npc',
        context
      );
    },

    /**
     * Generate an item image with error recovery.
     */
    async generateItemIllustration(context = {}) {
      return generateWithFallback(
        () => imageService.generateItemIllustration(context),
        'item',
        context
      );
    },

    /**
     * Generate a raw image with error recovery.
     */
    async generateRaw(prompt, context = {}) {
      return generateWithFallback(
        () => imageService.generateRaw(prompt),
        'raw',
        { ...context, prompt }
      );
    },

    /**
     * Get failure logger for inspection.
     */
    get failureLogger() {
      return failureLogger;
    },

    /**
     * Get circuit breaker for inspection.
     */
    get circuitBreaker() {
      return circuitBreaker;
    },

    /**
     * Get recovery stats.
     */
    getRecoveryStats() {
      return {
        failures: failureLogger.getCounts(),
        recentFailures: failureLogger.getRecent(10),
        circuitBreaker: circuitBreaker.stats(),
      };
    },

    /**
     * Check if the underlying service is enabled.
     */
    get isEnabled() {
      return imageService.isEnabled;
    },

    /**
     * Get the provider name.
     */
    get providerName() {
      return imageService.providerName;
    },

    /**
     * Access the underlying image service.
     */
    get rawService() {
      return imageService;
    },
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  createErrorRecovery,
  ImageFailureLogger,
  CircuitBreaker,
};
