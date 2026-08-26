'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { FileSessionRepository } = require('../src/storyline-v2/application/repositories/file-session-repository');
const { StorylineV2Service } = require('../src/storyline-v2/application/service');
const { compileAdventure } = require('../src/storyline-v2/domain');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

function makeTempPath() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'storyline-v2-'));
  return { directory, file: path.join(directory, 'sessions.json') };
}

function cleanup(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
}

const adventure = compileAdventure({
  schemaVersion: '2.0', adventureId: 'file-repository-test', title: 'File Repository Test',
  classes: ['scholar'], items: {}, prologue: { startingSceneId: 'study' },
  scenes: [{ sceneId: 'study', actions: [{
    actionId: 'look', label: 'Look around', resolution: { resultType: 'atmosphere', narration: 'Dust moves.' }
  }] }],
  graph: { entry: 'study', edges: [] }
});

console.log('\n=== Storyline v2 durable repository ===');

test('persists values across repository instances with clone isolation', () => {
  const temp = makeTempPath();
  try {
    const first = new FileSessionRepository(temp.file);
    const value = { state: { revision: 0, sceneId: 'study', flags: {} } };
    first.save('session-1', value);
    value.state.flags.changed = true;
    const second = new FileSessionRepository(temp.file);
    const loaded = second.get('session-1');
    loaded.state.sceneId = 'mutated-after-read';
    assert.strictEqual(second.get('session-1').state.sceneId, 'study');
    assert.deepStrictEqual(second.get('session-1').state.flags, {});
  } finally { cleanup(temp.directory); }
});

test('rejects stale revision saves without mutation', () => {
  const temp = makeTempPath();
  try {
    const repository = new FileSessionRepository(temp.file);
    repository.save('session-1', { state: { revision: 2 } });
    assert.throws(() => repository.save('session-1', { state: { revision: 3 } }, { expectedRevision: 1 }), /SESSION_REVISION_CONFLICT/);
    assert.strictEqual(repository.get('session-1').state.revision, 2);
  } finally { cleanup(temp.directory); }
});

test('enforces exclusive leases and releases ownership', () => {
  const temp = makeTempPath();
  let now = 1000;
  try {
    const repository = new FileSessionRepository(temp.file, { clock: () => now, leaseDurationMs: 100 });
    const lease = repository.acquireLease('session-1', 'writer-a');
    assert.throws(() => repository.acquireLease('session-1', 'writer-b'), /SESSION_LEASE_CONFLICT/);
    assert.throws(() => repository.save('session-1', { state: { revision: 0 } }, { leaseToken: 'wrong' }), /SESSION_LEASE_CONFLICT/);
    repository.save('session-1', { state: { revision: 0 } }, { leaseToken: lease.token });
    assert.strictEqual(repository.releaseLease('session-1', lease.token), true);
    assert.strictEqual(repository.acquireLease('session-1', 'writer-b').token.length > 0, true);
    now += 101;
    assert.strictEqual(repository.acquireLease('session-1', 'writer-c').token.length > 0, true);
  } finally { cleanup(temp.directory); }
});

test('service resumes persisted state through a new service instance', () => {
  const temp = makeTempPath();
  try {
    const repositoryA = new FileSessionRepository(temp.file);
    const serviceA = new StorylineV2Service({ [adventure.adventureId]: adventure }, { sessionRepository: repositoryA });
    const start = serviceA.start({ adventureId: adventure.adventureId, sessionId: 'restart-session' });
    const first = serviceA.submit({ sessionId: 'restart-session', actionId: 'look', catalogVersion: start.catalog.catalogVersion, turnId: 'turn-1' });
    const repositoryB = new FileSessionRepository(temp.file);
    const serviceB = new StorylineV2Service({ [adventure.adventureId]: adventure }, { sessionRepository: repositoryB });
    const resumed = serviceB.snapshot('restart-session');
    assert.strictEqual(resumed.state.turnNumber, 1);
    assert.strictEqual(resumed.state.processedTurns['turn-1'].actionId, 'look');
    const retry = serviceB.submit({ sessionId: 'restart-session', actionId: 'look', catalogVersion: first.catalog.catalogVersion, turnId: 'turn-1' });
    assert.strictEqual(retry.turnId, 'turn-1');
    assert.strictEqual(retry.state.revision, first.state.revision);
  } finally { cleanup(temp.directory); }
});

test('shares leases across independent repository instances', () => {
  const temp = makeTempPath();
  try {
    const first = new FileSessionRepository(temp.file);
    const second = new FileSessionRepository(temp.file);
    const lease = first.acquireLease('session-1', 'writer-a');
    assert.throws(() => second.acquireLease('session-1', 'writer-b'), /SESSION_LEASE_CONFLICT/);
    assert.throws(() => second.save('session-1', { state: { revision: 0 } }, { leaseToken: 'wrong' }), /SESSION_LEASE_CONFLICT/);
    assert.strictEqual(second.releaseLease('session-1', lease.token), true);
    assert.doesNotThrow(() => second.acquireLease('session-1', 'writer-b'));
  } finally { cleanup(temp.directory); }
});

test('serializes independent revision writers and preserves both successful updates', () => {
  const temp = makeTempPath();
  try {
    const first = new FileSessionRepository(temp.file);
    first.save('session-1', { state: { revision: 0, writer: 'seed' } });
    const second = new FileSessionRepository(temp.file);
    const expectedRevision = first.get('session-1').state.revision;
    first.save('session-1', { state: { revision: 1, writer: 'first' } }, { expectedRevision });
    assert.throws(() => second.save('session-1', { state: { revision: 1, writer: 'second' } }, { expectedRevision }), /SESSION_REVISION_CONFLICT/);
    assert.strictEqual(second.get('session-1').state.writer, 'first');
  } finally { cleanup(temp.directory); }
});

test('recovers a stale repository lock', () => {
  const temp = makeTempPath();
  let now = 10_000;
  try {
    const repository = new FileSessionRepository(temp.file, { clock: () => now, lockTimeoutMs: 100 });
    fs.writeFileSync(`${temp.file}.lock`, 'crashed writer');
    const staleTime = new Date(now - 101);
    fs.utimesSync(`${temp.file}.lock`, staleTime, staleTime);
    repository.save('session-1', { state: { revision: 0 } });
    assert.strictEqual(repository.has('session-1'), true);
  } finally { cleanup(temp.directory); }
});

test('supports an independent Node process writing the same repository', () => {
  const temp = makeTempPath();
  try {
    const repository = new FileSessionRepository(temp.file);
    repository.save('parent', { state: { revision: 0 } });
    execFileSync(process.execPath, ['-e', `
      const { FileSessionRepository } = require(${JSON.stringify(path.resolve(__dirname, '../src/storyline-v2/application/repositories/file-session-repository'))});
      const repo = new FileSessionRepository(${JSON.stringify(temp.file)});
      repo.save('child', { state: { revision: 0 } });
    `], { stdio: 'pipe' });
    assert.deepStrictEqual(repository.entries().map(entry => entry.sessionId), ['child', 'parent']);
  } finally { cleanup(temp.directory); }
});

test('exports durable entries in deterministic order', () => {
  const temp = makeTempPath();
  try {
    const repository = new FileSessionRepository(temp.file);
    repository.save('b', { order: 2 });
    repository.save('a', { order: 1 });
    assert.deepStrictEqual(repository.entries().map(entry => entry.sessionId), ['a', 'b']);
  } finally { cleanup(temp.directory); }
});
