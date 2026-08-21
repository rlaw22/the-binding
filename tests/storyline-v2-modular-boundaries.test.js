'use strict';

const assert = require('assert');
const domain = require('../src/storyline-v2/domain');
const { compileManifest } = require('../src/storyline-v2/domain/manifest-compiler');
const { createBookSessionState } = require('../src/storyline-v2/domain/state-model');
const { buildActionCatalog } = require('../src/storyline-v2/domain/action-catalog');
const { resolveAction } = require('../src/storyline-v2/domain/resolver');
const { matchTextIntent } = require('../src/storyline-v2/domain/text-intent');
const useCases = require('../src/storyline-v2/application/use-cases');
const { StorylineV2Service } = require('../src/storyline-v2/application/service');

const manifest = {
  schemaVersion: '2.0', adventureId: 'modular-test', title: 'Modular Test',
  classes: ['scholar'], items: {}, prologue: { startingSceneId: 'study' },
  scenes: [{ sceneId: 'study', name: 'Study', actions: [
    { actionId: 'look', label: 'Look around', keywords: ['look'], resolution: { resultType: 'atmosphere', narration: 'Dust moves.' } }
  ] }], graph: { entry: 'study', edges: [] }
};

console.log('\n=== Storyline v2 modular boundaries ===');
const adventure = compileManifest(manifest);
const state = createBookSessionState(adventure, { sessionId: 'modular-state' });
const catalog = buildActionCatalog(adventure, state);
const resolved = resolveAction({ adventure, state, actionId: 'look', catalogVersion: catalog.catalogVersion, turnId: 'modular-turn' });
assert.strictEqual(resolved.result.resultType, 'atmosphere');
assert.strictEqual(matchTextIntent('look around', catalog, adventure.scenes.study.actions).status, 'matched');

const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
const snapshot = useCases.startBookSession(service, { adventureId: adventure.adventureId, sessionId: 'modular-session' });
assert.strictEqual(useCases.getBookSnapshot(service, 'modular-session').catalog.sceneId, snapshot.catalog.sceneId);
const result = useCases.submitAction(service, {
  sessionId: 'modular-session', actionId: 'look', catalogVersion: snapshot.catalog.catalogVersion, turnId: 'modular-use-case-turn'
});
assert.strictEqual(result.resultType, 'atmosphere');
assert.strictEqual(typeof domain.compileAdventure, 'function');
console.log('  ✓ domain boundaries expose compiler, state, catalog, resolver, and text intent');
console.log('  ✓ application use cases orchestrate the transport-independent service');
