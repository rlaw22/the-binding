'use strict';

const { clone } = require('./collections');

const CAPABILITIES = Object.freeze([
  'observe', 'endure', 'persuade', 'investigate', 'protect', 'fight', 'move', 'resist', 'prepare'
]);

function createCharacter(input = {}) {
  const capabilities = {};
  CAPABILITIES.forEach(key => {
    const value = input.capabilities && input.capabilities[key];
    capabilities[key] = Number.isFinite(value) ? value : 0;
  });
  return {
    characterId: input.characterId || null,
    characterVersion: input.characterVersion || null,
    challengePreference: input.challengePreference || 'standard',
    name: input.name || 'Unnamed traveller',
    classId: input.classId || null,
    level: Number.isFinite(input.level) ? input.level : 1,
    experience: Number.isFinite(input.experience) ? input.experience : 0,
    capabilities,
    permanentTraits: clone(input.permanentTraits || []),
    approvedInventory: clone(input.approvedInventory || []),
    persistentConditions: clone(input.persistentConditions || []),
    scars: clone(input.scars || []),
    titles: clone(input.titles || [])
  };
}

function snapshotCharacter(character) {
  return clone(createCharacter(character));
}

module.exports = { CAPABILITIES, createCharacter, snapshotCharacter };
