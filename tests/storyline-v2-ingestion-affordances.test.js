'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { compileAdventure, auditIngestedContent } = require('../src/storyline-v2');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

const candidate = path.join(__dirname, '..', 'content/ingestion/dracula-1897/candidates/dracula-opening-dramatic-002');
const manifestPath = path.join(candidate, 'manifest.json');

console.log('\n=== Storyline v2 ingestion affordance artifacts ===');

test('opening ingestion emits a reviewable authoring packet', () => {
  assert.ok(fs.existsSync(path.join(candidate, 'authoring-packet.json')));
  const packet = JSON.parse(fs.readFileSync(path.join(candidate, 'authoring-packet.json')));
  assert.ok(packet.scenes.length > 0);
  assert.ok(packet.scenes.every(scene => Array.isArray(scene.threads) && Array.isArray(scene.affordances)));
});

test('generated affordances and threads compile with stable references', () => {
  assert.ok(fs.existsSync(manifestPath));
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  const adventure = compileAdventure(manifest);
  for (const scene of Object.values(adventure.scenes)) {
    const threadIds = new Set(scene.threads.map(thread => thread.threadId));
    assert.ok(scene.affordances.every(affordance => threadIds.has(affordance.threadId)));
    assert.ok(scene.actions.every(action => !action.threadId || threadIds.has(action.threadId)));
  }
});

test('ingestion emits valid source classifications and audit counts', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  assert.ok(manifest.ingestionPolicy && manifest.ingestionPolicy.sourceClassification === 'required');
  const actions = manifest.scenes.flatMap(scene => scene.actions);
  const valid = new Set(['canonical_event', 'decision', 'discovery', 'atmosphere', 'connective_tissue', 'non_playable']);
  assert.ok(actions.every(action => valid.has(action.sourceClass)));
  const audit = auditIngestedContent(manifest, { strict: true });
  assert.strictEqual(audit.errors.length, 0, audit.errors.map(error => error.message).join('; '));
  assert.strictEqual(audit.report.actionsChecked, actions.length);
  assert.strictEqual(Object.values(audit.report.classificationCounts).reduce((sum, count) => sum + count, 0), actions.length);
  assert.ok(audit.report.classificationCounts.decision > 0);
  assert.ok(audit.report.classificationCounts.discovery > 0);
});

test('missing or unsupported source classifications fail the required gate', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  const missing = JSON.parse(JSON.stringify(manifest));
  delete missing.scenes[0].actions[0].sourceClass;
  assert.ok(auditIngestedContent(missing, { strict: true }).errors.some(error => error.message.includes('source classification')));
  const unsupported = JSON.parse(JSON.stringify(manifest));
  unsupported.scenes[0].actions[0].sourceClass = 'chapter_heading';
  assert.ok(auditIngestedContent(unsupported, { strict: true }).errors.some(error => error.message.includes('Unsupported source classification')));
});

test('ingestion preserves a distinction between repeatable and consumable affordances', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  const actions = manifest.scenes.flatMap(scene => scene.actions);
  assert.ok(actions.some(action => action.persistent === true && action.replay === 'repeatable'));
  assert.ok(actions.some(action => action.persistent === false && action.replay === 'consumable'));
});
