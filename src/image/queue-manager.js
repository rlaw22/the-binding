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
  jobTimeoutMs: 120_000,      // 2 min timeout for stale jobs
  maxQueueSize: 100,          // Max pending jobs in queue
  dedupCleanupIntervalMs: 60_000, // Cleanup dedup cache every 60s
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

    // Check queue size limit
    if (queue.length >= config.maxQueueSize) {
      return { jobId: null, deduplicated: false, error: 'queue full' };
    }

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
    if (paused) return;

    // Check for stale active jobs (timeout)
    const now = Date.now();
    for (const [jobId, entry] of active.entries()) {
      if (entry.startedAt && (now - entry.startedAt) > config.jobTimeoutMs) {
        active.delete(jobId);
        const staleJob = queue.find(j => j.jobId === jobId) || null;
        if (staleJob) {
          pendingPrompts.delete(staleJob.promptHash);
        }
        completed.set(jobId, { result: null, error: 'job timed out', completedAt: Date.now() });
        if (opts.onFailure) opts.onFailure(jobId, new Error('Job timed out'));
      }
    }

    // Check concurrency
    if (active.size >= config.maxConcurrency) {
      scheduleProcess();
      return;
    }

    // Find next eligible job (rate-limited provider check)
    // Priority aging: boost jobs waiting > 30s
    const AGING_THRESHOLD_MS = 30_000;
    for (const qj of queue) {
      if (qj.priority > 1 && (now - qj.enqueuedAt) > AGING_THRESHOLD_MS) {
        qj.priority = Math.max(1, qj.priority - 1);
      }
    }
    // Re-sort after aging
    queue.sort((a, b) => a.priority - b.priority);

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

      // Check if job was cancelled while running
      const activeEntry = active.get(job.jobId);
      if (activeEntry && activeEntry.cancelled) {
        active.delete(job.jobId);
        pendingPrompts.delete(job.promptHash);
        scheduleProcess();
        return;
      }

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
        const delay = Math.min(
          config.baseRetryDelayMs * Math.pow(2, job.retries - 1) + Math.random() * config.baseRetryDelayMs,
          30_000
        );
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
      maxQueueSize: config.maxQueueSize,
      jobTimeoutMs: config.jobTimeoutMs,
    };
  }

  /**
   * Estimate wait time for a new job based on current queue depth and concurrency.
   * @returns {number} Estimated wait in milliseconds
   */
  function getEstimatedWaitTime() {
    if (queue.length === 0 && active.size === 0) return 0;
    const avgJobMs = 5000; // rough estimate: 5s per job
    const slots = Math.max(1, config.maxConcurrency);
    const aheadOfMe = queue.length + active.size;
    return Math.ceil((aheadOfMe / slots) * avgJobMs);
  }

  /**
   * Clean up expired dedup cache entries.
   */
  function cleanupDedupCache() {
    const now = Date.now();
    for (const [hash, entry] of dedupCache.entries()) {
      if (entry.expiresAt <= now) {
        dedupCache.delete(hash);
      }
    }
  }

  // Periodic dedup cleanup
  const dedupCleanupTimer = setInterval(cleanupDedupCache, config.dedupCleanupIntervalMs);
  if (dedupCleanupTimer.unref) dedupCleanupTimer.unref();

  function clearDedupCache() {
    dedupCache.clear();
  }

  function clearCompleted() {
    completed.clear();
  }

  /**
   * Cancel a queued or active job.
   * @param {string} jobId
   * @returns {{ cancelled: boolean, reason?: string }}
   */
  function cancelJob(jobId) {
    // Check queue first
    const idx = queue.findIndex(j => j.jobId === jobId);
    if (idx !== -1) {
      const job = queue.splice(idx, 1)[0];
      pendingPrompts.delete(job.promptHash);
      completed.set(jobId, { result: null, error: 'cancelled', completedAt: Date.now() });
      return { cancelled: true };
    }

    // Check active (mark for cancellation — the running promise won't stop,
    // but we mark it so processNext ignores the result)
    if (active.has(jobId)) {
      const entry = active.get(jobId);
      entry.cancelled = true;
      return { cancelled: true, reason: 'active — result will be discarded' };
    }

    // Already completed or unknown
    if (completed.has(jobId)) {
      return { cancelled: false, reason: 'already completed' };
    }
    return { cancelled: false, reason: 'unknown job' };
  }

  /**
   * Get a snapshot of the current queue state for debugging.
   * @returns {{ queued: Array, active: Array, stats: object }}
   */
  function getQueueSnapshot() {
    return {
      queued: queue.map(j => ({
        jobId: j.jobId,
        priority: j.priority,
        retries: j.retries,
        providerIndex: j.providerIndex,
        enqueuedAt: j.enqueuedAt,
        promptPreview: j.prompt.slice(0, 80),
      })),
      active: Array.from(active.entries()).map(([jobId, entry]) => ({
        jobId,
        startedAt: entry.startedAt,
        cancelled: entry.cancelled || false,
      })),
      stats: getStats(),
    };
  }

  /**
   * Pause the queue — no new jobs will be processed.
   */
  function pause() {
    paused = true;
  }

  /**
   * Resume the queue after a pause.
   */
  function resume() {
    paused = false;
    scheduleProcess();
  }

  /**
   * Check if the queue is paused.
   */
  function isPaused() {
    return paused;
  }

  let paused = false;

  // Patch scheduleProcess to respect pause
  const _origScheduleProcess = scheduleProcess;
  // We override scheduleProcess inline — but since it's a closure, we need
  // to patch processNext instead. Add a guard at the top of processNext.
  // Actually, we need to re-wrap. Let's just add the pause check inside processNext.
  // Since processNext is already defined, we'll patch the exported resume to kick processing.

  return {
    enqueue,
    getStatus,
    waitForJob,
    getStats,
    getEstimatedWaitTime,
    cleanupDedupCache,
    clearDedupCache,
    clearCompleted,
    cancelJob,
    getQueueSnapshot,
    pause,
    resume,
    isPaused,
    destroy() { clearInterval(dedupCleanupTimer); },
    Priority,
  };
}

module.exports = {
  createQueueManager,
  Priority,
  DEFAULT_CONFIG,
};
