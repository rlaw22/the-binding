'use strict';

const { clone } = require('./collections');
const { createCharacter, snapshotCharacter } = require('./character-state');
const { calculateDifficultyProfile } = require('./difficulty');

const TRANSFER_MODES = new Set(['continuity', 'bounded_continuity', 'standalone']);

function buildTransferPreview(book, characterInput, options = {}) {
  const character = createCharacter(characterInput);
  const policy = book.transferPolicy || {};
  const mode = options.mode || policy.defaultMode || 'continuity';
  if (!TRANSFER_MODES.has(mode)) throw new Error(`Unsupported transfer mode: ${mode}`);
  if (policy.persistentCharacters === false && mode !== 'standalone') {
    throw new Error('This adventure does not support persistent characters');
  }
  if (Array.isArray(policy.allowedClassIds) && character.classId && !policy.allowedClassIds.includes(character.classId)) {
    throw new Error(`Character class is not supported by this adventure: ${character.classId}`);
  }
  if (mode === 'standalone') {
    return {
      mode, character: snapshotCharacter(createCharacter({})), recommendedLevelRange: clone((book.difficultyPolicy && book.difficultyPolicy.recommendedLevelRange) || { min: 1, max: 3 }),
      adaptiveDifficulty: calculateDifficultyProfile(book, createCharacter({}), { ...options, mode }), transferredCapabilities: {}, transferredItems: [], unavailableItems: character.approvedInventory.slice(), normalized: false, disclosureRequired: true
    };
  }
  const allowedItems = new Set(policy.allowedItemIds || character.approvedInventory);
  const transferredItems = character.approvedInventory.filter(item => allowedItems.has(item));
  const unavailableItems = character.approvedInventory.filter(item => !allowedItems.has(item));
  return {
    mode,
    character: snapshotCharacter(character),
    recommendedLevelRange: clone((book.difficultyPolicy && book.difficultyPolicy.recommendedLevelRange) || { min: 1, max: 3 }),
    adaptiveDifficulty: calculateDifficultyProfile(book, character, { ...options, mode }),
    transferredCapabilities: clone(character.capabilities),
    transferredItems,
    unavailableItems,
    normalized: mode === 'bounded_continuity',
    disclosureRequired: true
  };
}

function createBookCharacterSnapshot(book, characterInput, options = {}) {
  const preview = buildTransferPreview(book, characterInput, options);
  const character = createCharacter(characterInput);
  return {
    ...snapshotCharacter(character),
    approvedInventory: preview.transferredItems,
    transferMode: preview.mode,
    unavailableItems: preview.unavailableItems
  };
}

module.exports = { TRANSFER_MODES, buildTransferPreview, createBookCharacterSnapshot };
