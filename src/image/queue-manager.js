/**
 * src/image/queue-manager.js — Image Generation Queue Manager
 *
 * Production infrastructure for image generation:
 * - Concurrency control (max parallel generations)
 * - Rate limiting (requests per minute per provider)
 * - Provider fallback chain (primary → secondary → mock)
 * - Retry with exponential backoff
 * - Priority queue (scene images > character portraits > items)
 * - Deduplication (same prompt = same result)
 */

'use strict';

const crypto = require('crypto');

// Default configuration
const DEFAULT_CONFIG = {
  maxConcurrency: 3,          // Max parallel image generations
  maxRetries: 2,              // Retries per provider before fallback
  baseRetryDelayMs: 1000,     // Base delay for exponential backoff
  deduplicationWindowMs: 5 * 60 * 1000, // 5 min dedup window
  rateLimits: {
    xai:       { requestsPerMinute: 10 },
    openai:    { requestsPerMinute: 10 },
    replicate: { requestsPerMinute: 5 },
    mock:      { requestsPerMinute: 100 },
  },
};

// Priority levels — lower number = higher priority
const Priority = {
  SCENE: 1,
  COMBAT: 2,
  CHARACTER: 3,
  NPC: 4,
  ITEM: 5,
  BACKGROUND: 6,
};

/**
 * Create an image generation queue manager.
 *
 * @param {object} opts
 * @param {object[]} opts.providers — ordered list of { name, generate(prompt, opts) }
 * @param {number} [opts.maxConcurrency]
 * @param {number} [opts.maxRetries]
 * @param {Function} [opts.onComplete] — callback(jobId, result)
 * @param {Function} [opts.onFailure] — callback(jobId, error)
 */
function createQueueManager(opts = {}) {
  const config = { ...DEFAULT_CONFIG, ...opts };
  const providers = opts.providers || [];

  // State
  const queue = [];              // Pending jobs, sorted by priority
  const active = new Map();      // jobId -> { promise, startedAt, provider }
  const completed = new Map();   // jobId -> { result, completedAt }
  const dedupCache = new Map();  // promptHash -> { result, expiresAt }
  const pendingPrompts = new Set(); // promptHash of in-flight jobs (dedup before completion)
  const rateLimitBuckets = {};   // providerName -> { timestamps[] }

  let nextJobId = 0;
  let processing = false;

  // ── Helpers ────────────────────────────────────────────────────────

  function makeJobId() {
    return `img_${Date.now()}_${++nextJobId}`;
  }

  function hashPrompt(prompt) {
    return crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
  }

  function checkRateLimit(providerName) {
    const limits = config.rateLimits[providerName];
    if (!limits) return true;

    const now = Date.now();
    const window = 60_000;
    if (!rateLimitBuckets[providerName]) {
      rateLimitBuckets[providerName] = [];
    }
    const bucket = rateLimitBuckets[providerName];
    // Prune old timestamps
    while (bucket.length > 0 && bucket[0] < now - window) bucket.shift();
    return bucket.length < limits.requestsPerMinute;
  }

  function recordRateLimit(providerName) {
    if (!rateLimitBuckets[providerName]) {
      rateLimitBuckets[providerName] = [];
    }
    rateLimitBuckets[providerName].push(Date.now());
  }

  // ── Queue Operations ───────────────────────────────────────────────

  /**
   * Enqueue an image generation job.
   * @param {object} job
   * @param {string} job.prompt — the image prompt
   * @param {number} [job.priority] — Priority constant
   * @param {object} [job.opts] — provider-specific options (size, style, etc.)
   * @param {string} [job.sessionId] — for tracking
   * @returns {{ jobId: string, deduplicated: boolean, result?: object }}
   */
  function enqueue(job) {
    const prompt = job.prompt || '';
    const priority = job.priority || Priority.SCENE;
    const promptHash = hashPrompt(prompt);

    // Check deduplication (pending or completed)
    const cached = dedupCache.get(promptHash);
    if (cached && cached.expiresAt > Date.now()) {
      return { jobId: cached.jobId, deduplicated: true, result: cached.result };
    }
    if (pendingPrompts.has(promptHash)) {
      return { jobId: 'pending_' + promptHash, deduplicated: true };
    }

    const jobId = makeJobId();
    const entry = {
      jobId,
      prompt,
      promptHash,
      priority,
      opts: job.opts || {},
      sessionId: job.sessionId || null,
      retries: 0,
      enqueuedAt: Date.now(),
      providerIndex: 0,  // which provider to try first
    };

    // Track as in-flight for dedup before completion
    pendingPrompts.add(promptHash);

    // Insert in priority order
    let inserted = false;
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].priority > priority) {
        queue.splice(i, 0, entry);
        inserted = true;
        break;
      }
    }
    if (!inserted) queue.push(entry);

    // Kick processing
    scheduleProcess();

    return { jobId, deduplicated: false };
  }

  /**
   * Get the status/result of a job.
   */
  function getStatus(jobId) {
    if (completed.has(jobId)) {
      return { status: 'completed', ...completed.get(jobId) };
    }
    if (active.has(jobId)) {
      return { status: 'processing', startedAt: active.get(jobId).startedAt };
    }
    const pending = queue.find(j => j.jobId === jobId);
    if (pending) {
      return { status: 'queued', position: queue.indexOf(pending) };
    }
    return { status: 'unknown' };
  }

  /**
   * Wait for a specific job to complete.
   * @returns {Promise<object>} the generation result
   */
  function waitForJob(jobId, timeoutMs = 120_000) {
    return new Promise((resolve, reject) => {
      const status = getStatus(jobId);
      if (status.status === 'completed') {
        return resolve(status.result);
      }

      const deadline = Date.now() + timeoutMs;
      const poll = setInterval(() => {
        const s = getStatus(jobId);
        if (s.status === 'completed') {
          clearInterval(poll);
          resolve(s.result);
        } else if (Date.now() > deadline) {
          clearInterval(poll);
          reject(new Error(`Image generation timed out for job ${jobId}`));
        }
      }, 200);
    });
  }

  // ── Processing Loop ────────────────────────────────────────────────

  function scheduleProcess() {
    if (processing) return;
    processing = true;
    // Use setImmediate to avoid re-entrancy
    setImmediate(processNext);
  }

  async function processNext() {
    processing = false;

    // Check concurrency
    if (active.size >= config.maxConcurrency) {
      scheduleProcess();
      return;
    }

    // Find next eligible job (rate-limited provider check)
    let job = null;
    for (let i = 0; i < queue.length; i++) {
      const candidate = queue[i];
      const provider = providers[candidate.providerIndex];
      if (provider && checkRateLimit(provider.name)) {
        job = queue.splice(i, 1)[0];
        break;
      }
    }

    if (!job) {
      // Nothing to process right now — check again later if queue has items
      if (queue.length > 0) {
        setTimeout(scheduleProcess, 1000);
      }
      return;
    }

    // Process the job
    active.set(job.jobId, { startedAt: Date.now() });

    try {
      const provider = providers[job.providerIndex];
      if (!provider) throw new Error('No provider available');

      recordRateLimit(provider.name);
      const result = await provider.generate(job.prompt, {
        ...job.opts,
        sessionId: job.sessionId,
      });

      // Success — cache and complete
      const dedupExpiresAt = Date.now() + config.deduplicationWindowMs;
      dedupCache.set(job.promptHash, {
        result,
        expiresAt: dedupExpiresAt,
        jobId: job.jobId,
      });
      pendingPrompts.delete(job.promptHash);

      completed.set(job.jobId, { result, completedAt: Date.now() });
      active.delete(job.jobId);

      if (opts.onComplete) opts.onComplete(job.jobId, result);
    } catch (err) {
      active.delete(job.jobId);

      // Retry logic — try next provider or retry current
      if (job.retries < config.maxRetries) {
        job.retries++;
        const delay = config.baseRetryDelayMs * Math.pow(2, job.retries - 1);
        setTimeout(() => {
          queue.unshift(job); // Re-insert at front (same priority)
          scheduleProcess();
        }, delay);
      } else if (job.providerIndex < providers.length - 1) {
        // Fall back to next provider
        job.providerIndex++;
        job.retries = 0;
        queue.unshift(job);
        scheduleProcess();
      } else {
        // All providers exhausted
        pendingPrompts.delete(job.promptHash);
        completed.set(job.jobId, { result: null, error: err.message, completedAt: Date.now() });
        if (opts.onFailure) opts.onFailure(job.jobId, err);
      }
    }

    // Continue processing
    scheduleProcess();
  }

  // ── Stats & Maintenance ────────────────────────────────────────────

  function getStats() {
    return {
      queued: queue.length,
      active: active.size,
      completed: completed.size,
      dedupCacheSize: dedupCache.size,
    };
  }

  function clearDedupCache() {
    dedupCache.clear();
  }

  function clearCompleted() {
    completed.clear();
  }

  return {
    enqueue,
    getStatus,
    waitForJob,
    getStats,
    clearDedupCache,
    clearCompleted,
    Priority,
  };
}

module.exports = {
  createQueueManager,
  Priority,
  DEFAULT_CONFIG,
};
