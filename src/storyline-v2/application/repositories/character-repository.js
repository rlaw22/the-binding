'use strict';

/**
 * Character folio repository contract. The application stores persistent
 * character identity here, never inside a book session repository.
 */
class InMemoryCharacterRepository {
  constructor(seed = []) {
    this.characters = new Map(seed.map(entry => [entry.characterId, clone(entry.value || entry)]));
  }

  get(characterId) {
    const value = this.characters.get(characterId);
    return value ? clone(value) : null;
  }

  has(characterId) {
    return this.characters.has(characterId);
  }

  save(characterId, value) {
    if (!characterId) throw new Error('Character ID is required');
    this.characters.set(characterId, clone({ ...value, characterId }));
    return clone(this.characters.get(characterId));
  }

  entries() {
    return Array.from(this.characters, ([characterId, value]) => ({ characterId, value: clone(value) }));
  }

  clear() {
    this.characters.clear();
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { InMemoryCharacterRepository };