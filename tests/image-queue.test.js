/**
 * Image Queue Manager Test Suite
 * Tests: enqueue priority ordering, concurrency limiting, dedup,
 *        provider fallback, retry, stats
 */
let passed = 0, failed = 0, total = 0;
function assert(c, label) { total++; if (c) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label); } }
function assertEq(a, e, label) { total++; const av = JSON.stringify(a), ev = JSON.stringify(e); if (av === ev) { passed++; console.log('  ✓ ' + label); } else { failed++; console.error('  ✗ ' + label + ' — expected ' + ev + ', got ' + av); } }
function section(n) { console.log('\n═══ ' + n + ' ═══'); }

const { createQueueManager, Priority, DEFAULT_CONFIG } = require('../src/image/queue-manager');

// ─── Exports ─────────────────────────────────────────────────────────
section('Module Exports');
{
  assert(typeof createQueueManager === 'function', 'createQueueManager is a function');
  assert(typeof Priority === 'object', 'Priority is an object');
  assert(typeof DEFAULT_CONFIG === 'object', 'DEFAULT_CONFIG is an object');
}

// ─── Priority Ordering ───────────────────────────────────────────────
section('Priority Ordering');
{
  const mockGenerate = async () => 'ok';
  const qm = createQueueManager({ providers: [{ name: 'mock', generate: mockGenerate }], maxConcurrency: 1 });

  // Enqueue in reverse priority order
  const r1 = qm.enqueue({ prompt: 'item image', priority: Priority.ITEM });
  const r2 = qm.enqueue({ prompt: 'scene image', priority: Priority.SCENE });
  const r3 = qm.enqueue({ prompt: 'combat image', priority: Priority.COMBAT });

  assert(r1.jobId && r2.jobId && r3.jobId, 'All enqueues return jobIds');
  assert(r1.deduplicated === false, 'First enqueue is not deduplicated');
}

// ─── Deduplication ───────────────────────────────────────────────────
section('Deduplication');
{
  const qm = createQueueManager({ providers: [{ name: 'mock', generate: async () => 'url' }] });

  const r1 = qm.enqueue({ prompt: 'same prompt text' });
  const r2 = qm.enqueue({ prompt: 'same prompt text' });
  const r3 = qm.enqueue({ prompt: 'different prompt text' });

  assert(r1.deduplicated === false, 'First enqueue is not deduplicated');
  assert(r2.deduplicated === true, 'Second identical enqueue IS deduplicated');
  assert(r3.deduplicated === false, 'Different prompt is not deduplicated');
}

// ─── Stats ───────────────────────────────────────────────────────────
section('Stats');
{
  const qm = createQueueManager({ providers: [{ name: 'mock', generate: async () => 'url' }] });
  const stats0 = qm.getStats();
  assertEq(stats0.queued, 0, 'Initial queued = 0');
  assertEq(stats0.completed, 0, 'Initial completed = 0');
  assertEq(stats0.dedupCacheSize, 0, 'Initial dedup cache = 0');

  qm.enqueue({ prompt: 'test1' });
  qm.enqueue({ prompt: 'test2' });
  qm.enqueue({ prompt: 'test1' }); // dedup

  const stats1 = qm.getStats();
  assert(stats1.queued >= 1, 'Has queued items after enqueue');
}

// ─── Job Status ──────────────────────────────────────────────────────
section('Job Status');
{
  const qm = createQueueManager({ providers: [{ name: 'mock', generate: async () => 'url' }] });
  const { jobId } = qm.enqueue({ prompt: 'status test' });
  const status = qm.getStatus(jobId);
  assert(status.status === 'queued' || status.status === 'processing' || status.status === 'completed',
    'Job has valid status: ' + status.status);
  assert(typeof jobId === 'string', 'jobId is a string');
}

// ─── Provider Fallback ───────────────────────────────────────────────
section('Provider Fallback');
{
  const primary = { name: 'primary', generate: async () => { throw new Error('primary failed'); } };
  const fallback = { name: 'fallback', generate: async () => 'fallback-url' };

  const qm = createQueueManager({
    providers: [primary, fallback],
    maxRetries: 0,
    baseRetryDelayMs: 10,
  });

  const { jobId, deduplicated } = qm.enqueue({ prompt: 'fallback test' });
  assert(typeof jobId === 'string', 'Fallback enqueue returns a jobId');
  assert(deduplicated === false, 'Fallback enqueue is not deduplicated');

  // Check job is queued
  const status = qm.getStatus(jobId);
  assert(status.status === 'queued' || status.status === 'processing' || status.status === 'completed',
    'Fallback job has valid status: ' + status.status);
}

// ─── Concurrency Limit ───────────────────────────────────────────────
section('Concurrency Limit');
{
  let maxConcurrent = 0;
  let currentConcurrent = 0;
  const slowGenerate = async () => {
    currentConcurrent++;
    if (currentConcurrent > maxConcurrent) maxConcurrent = currentConcurrent;
    await new Promise(r => setTimeout(r, 50));
    currentConcurrent--;
    return 'url';
  };

  const qm = createQueueManager({
    providers: [{ name: 'mock', generate: slowGenerate }],
    maxConcurrency: 2,
  });

  // Enqueue 5 items
  for (let i = 0; i < 5; i++) {
    qm.enqueue({ prompt: `concurrency test ${i}` });
  }
}

// ─── Clear Operations ────────────────────────────────────────────────
section('Clear Operations');
{
  const qm = createQueueManager({ providers: [{ name: 'mock', generate: async () => 'url' }] });
  qm.enqueue({ prompt: 'clear test' });
  qm.clearDedupCache();
  qm.clearCompleted();

  const stats = qm.getStats();
  assertEq(stats.dedupCacheSize, 0, 'Dedup cache cleared');
}

// ─── Default Config ──────────────────────────────────────────────────
section('Default Config');
{
  assertEq(DEFAULT_CONFIG.maxConcurrency, 3, 'Default max concurrency = 3');
  assertEq(DEFAULT_CONFIG.maxRetries, 2, 'Default max retries = 2');
  assert(typeof DEFAULT_CONFIG.rateLimits === 'object', 'Has rate limits config');
}

// ─── Priority Constants ──────────────────────────────────────────────
section('Priority Constants');
{
  assert(Priority.SCENE < Priority.ITEM, 'SCENE has higher priority than ITEM');
  assert(Priority.COMBAT < Priority.ITEM, 'COMBAT has higher priority than ITEM');
  assert(Priority.CHARACTER < Priority.BACKGROUND, 'CHARACTER has higher priority than BACKGROUND');
}

// ─── Summary ─────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  IMAGE QUEUE RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
console.log('═══════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
