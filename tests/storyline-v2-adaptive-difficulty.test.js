'use strict';
const assert = require('assert');
const { compileAdventure } = require('../src/storyline-v2/domain');
const { deriveCapabilityScore, classifyCapability, calculateDifficultyProfile, preferenceToBand, applyAuthoredLever } = require('../src/storyline-v2/domain/difficulty');
const { StorylineV2Service } = require('../src/storyline-v2/application/service');

function test(name, fn) { try { fn(); console.log(`  ✓ ${name}`); } catch (e) { console.error(`  ✗ ${name}: ${e.message}`); process.exitCode = 1; } }
const adaptive = {
  enabled: true, schemaVersion: '1.0', mode: 'authored',
  targetCapability: { score: 50, bandWidth: 12, recommendedLevelRange: { min: 1, max: 4 } },
  baseline: { label: 'standard', offset: 0 }, offsetBounds: { min: -1, max: 1 },
  weights: { capability: 0.75, preference: 0.50 },
  allowedLevers: ['checkTarget'], fixedElements: ['canonicalEvents'],
  levers: [{ leverId: 'gate', sceneId: 'start', kind: 'checkTarget', baseValue: 13, allowedDelta: { min: -1, max: 1 }, byOffset: { '-1': -1, '0': 0, '1': 1 } }],
  disclosure: { adaptiveChallenge: true, normalization: 'none', summaryKey: 'authored-adaptive-challenge' }
};
const adventure = compileAdventure({ schemaVersion: '2.0', adventureId: 'adaptive-test', title: 'Adaptive Test', classes: ['scholar'], items: {}, adaptiveDifficulty: adaptive, transferPolicy: { persistentCharacters: true }, prologue: { startingSceneId: 'start' }, scenes: [{ sceneId: 'start', actions: [{ actionId: 'inspect', label: 'Inspect', adaptiveLeverId: 'gate', resolution: { check: { ability: 'observe', difficulty: 13, seed: 'adaptive', onSuccess: { resultType: 'success', narration: 'Open.' }, onFailure: { resultType: 'failure', narration: 'Closed.' } } } }] }], graph: { entry: 'start', edges: [] } });

console.log('\n=== Storyline v2 adaptive difficulty ===');
test('normalizes capability score and classifies bands', () => { const score = deriveCapabilityScore({ level: 4, capabilities: { observe: 10 } }, adaptive); assert(score.score >= 0 && score.score <= 100); assert.strictEqual(classifyCapability(50, adaptive.targetCapability), 0); assert.strictEqual(classifyCapability(10, adaptive.targetCapability), -2); assert.strictEqual(classifyCapability(90, adaptive.targetCapability), 2); });
test('maps challenge preferences', () => { assert.strictEqual(preferenceToBand('gentle'), -1); assert.strictEqual(preferenceToBand('standard'), 0); assert.strictEqual(preferenceToBand('demanding'), 1); });
test('calculates bounded entry profile', () => { const p = calculateDifficultyProfile(adventure, { characterId: 'c1', level: 4, capabilities: {}, challengePreference: 'demanding' }, { calculatedAt: 'now' }); assert.strictEqual(p.sessionOffset, 1); assert.strictEqual(p.calculatedAt, 'now'); assert.strictEqual(p.manifestVersion, '2.0'); });
test('rejects invalid authored mappings', () => { assert.throws(() => applyAuthoredLever({ leverId: 'bad', byOffset: { '1': 3 }, allowedDelta: { min: -1, max: 1 } }, 1), /outside/); });
test('persists profile and exposes player disclosure', () => { const service = new StorylineV2Service({ [adventure.adventureId]: adventure }); const snap = service.start({ adventureId: adventure.adventureId, sessionId: 'adaptive-session', options: { character: { characterId: 'c1', level: 4, challengePreference: 'demanding' }, challengePreference: 'demanding' } }); assert.strictEqual(snap.state.bookSession.difficultyProfile.sessionOffset, 1); assert.strictEqual(snap.adaptiveDifficulty.enabled, true); assert.match(snap.adaptiveDifficulty.text, /authored limits/); });
test('applies authored check lever and records provenance', () => { const service = new StorylineV2Service({ [adventure.adventureId]: adventure }); const snap = service.start({ adventureId: adventure.adventureId, sessionId: 'adaptive-action', options: { character: { level: 4, challengePreference: 'demanding' }, challengePreference: 'demanding' } }); const result = service.submit({ sessionId: 'adaptive-action', actionId: 'inspect', catalogVersion: snap.catalog.catalogVersion, turnId: 't1' }); assert.strictEqual(result.adaptive.resolvedVariant, 14); assert.strictEqual(result.check.difficulty, 14); });
test('compiler rejects malformed adaptive policy', () => { assert.throws(() => compileAdventure({ schemaVersion: '2.0', adventureId: 'bad', title: 'Bad', adaptiveDifficulty: { enabled: true }, prologue: { startingSceneId: 's' }, scenes: [{ sceneId: 's', actions: [] }], graph: { entry: 's', edges: [] } }), /Invalid Storyline v2 manifest/); });
