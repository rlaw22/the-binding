'use strict';

const { clone } = require('./collections');
const { createCharacter, snapshotCharacter } = require('./character-state');
const { calculateDifficultyProfile } = require('./difficulty');

function buildTransferPreview(book, characterInput, options = {}) {
  const character = createCharacter(characterInput);
  const policy = book.transferPolicy || {};
  const mode = options.mode || policy.defaultMode || 'continuity';
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

module.exports = { buildTransferPreview, createBookCharacterSnapshot };
