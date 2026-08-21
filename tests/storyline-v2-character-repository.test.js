'use strict';

const assert = require('assert');
const { compileAdventure } = require('../src/storyline-v2/domain');
const { StorylineV2Service } = require('../src/storyline-v2/application/service');
const { InMemoryCharacterRepository } = require('../src/storyline-v2/application/repositories/character-repository');

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (error) { console.error(`  ✗ ${name}: ${error.message}`); process.exitCode = 1; }
}

const adventure = compileAdventure({
  schemaVersion: '2.0', adventureId: 'character-boundary', title: 'Character Boundary',
  classes: ['scholar', 'ranger'], items: { heirloom: {}, quest_key: {} },
  transferPolicy: { persistentCharacters: true, defaultMode: 'continuity', allowedClassIds: ['scholar'], allowedItemIds: ['heirloom'] },
  difficultyPolicy: { recommendedLevelRange: { min: 1, max: 3 }, scaling: 'authored_bounded' },
  prologue: { startingSceneId: 'study' },
  scenes: [{ sceneId: 'study', actions: [{ actionId: 'look', label: 'Look', resolution: { resultType: 'atmosphere', narration: 'Dust moves.' } }] }],
  graph: { entry: 'study', edges: [] }
});

console.log('\n=== Storyline v2 character repository boundary ===');

test('character repository clones folio data and requires identity', () => {
  const repository = new InMemoryCharacterRepository();
  assert.throws(() => repository.save('', { name: 'No ID' }), /Character ID is required/);
  const folio = repository.save('hero-1', { name: 'Mina', level: 4, approvedInventory: ['heirloom'] });
  folio.name = 'Mutated';
  assert.strictEqual(repository.get('hero-1').name, 'Mina');
});

test('transfer preview enforces supported classes and item portability', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  const preview = service.previewTransfer({ adventureId: adventure.adventureId, character: { characterId: 'hero-2', classId: 'scholar', level: 4, approvedInventory: ['heirloom', 'quest_key'] } });
  assert.deepStrictEqual(preview.transferredItems, ['heirloom']);
  assert.deepStrictEqual(preview.unavailableItems, ['quest_key']);
  assert.throws(() => service.previewTransfer({ adventureId: adventure.adventureId, character: { characterId: 'hero-3', classId: 'ranger' } }), /class is not supported/);
});

test('book sessions reference but do not own the persistent folio', () => {
  const characters = new InMemoryCharacterRepository();
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure }, { characterRepository: characters });
  service.saveCharacter({ characterId: 'hero-4', name: 'Jonathan', classId: 'scholar', level: 2, approvedInventory: ['heirloom', 'quest_key'] });
  const snapshot = service.start({ adventureId: adventure.adventureId, sessionId: 'book-1', characterId: 'hero-4' });
  assert.strictEqual(snapshot.state.character.persistentCharacterId, 'hero-4');
  assert.strictEqual(snapshot.state.character.name, 'Jonathan');
  assert.deepStrictEqual(snapshot.state.inventory, ['heirloom']);
  assert.strictEqual(snapshot.state.character.approvedInventory[0], 'heirloom');
  const folio = service.getCharacter('hero-4');
  assert.deepStrictEqual(folio.approvedInventory, ['heirloom', 'quest_key']);
  assert.notStrictEqual(folio, service.getCharacter('hero-4'));
});

test('two book sessions from one folio remain isolated', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  service.saveCharacter({ characterId: 'hero-5', name: 'Lucy', classId: 'scholar', approvedInventory: ['heirloom'] });
  const first = service.start({ adventureId: adventure.adventureId, sessionId: 'book-a', characterId: 'hero-5' });
  const second = service.start({ adventureId: adventure.adventureId, sessionId: 'book-b', characterId: 'hero-5' });
  service.submit({ sessionId: 'book-a', actionId: 'look', catalogVersion: first.catalog.catalogVersion, turnId: 'a-1' });
  assert.strictEqual(service.snapshot('book-a').state.revision, 1);
  assert.strictEqual(service.snapshot('book-b').state.revision, 0);
  assert.strictEqual(service.getCharacter('hero-5').experience, 0);
});

test('standalone transfer does not silently carry persistent character data', () => {
  const service = new StorylineV2Service({ [adventure.adventureId]: adventure });
  const preview = service.previewTransfer({ adventureId: adventure.adventureId, character: { characterId: 'hero-6', name: 'Existing', classId: 'scholar', approvedInventory: ['heirloom'] }, options: { mode: 'standalone' } });
  assert.strictEqual(preview.character.name, 'Unnamed traveller');
  assert.deepStrictEqual(preview.transferredItems, []);
});
