'use strict';

/**
 * The Binding — Character Service
 *
 * Central barrel export. This is the single import point for all
 * character-related functionality across the application.
 *
 * Usage:
 *   const { characterService, portraitService, characterModel } = require('./character');
 *   const char = characterService.createCharacter({ userId, name, race, characterClass });
 *   const prompt = portraitService.generatePortraitPrompt(char, 'dark_fantasy');
 */

const characterModel = require('./character-model');
const characterService = require('./character-service');
const portraitService = require('./portrait-service');

module.exports = {
  // The singleton service — primary interface for CRUD and game logic
  characterService,

  // Portrait generation and storage
  portraitService,

  // Raw model: validation, constants, helpers, template factory
  characterModel,

  // Convenience re-exports (top-level access to the most-used items)
  createCharacter:       characterService.createCharacter.bind(characterService),
  getCharacter:          characterService.getCharacter.bind(characterService),
  getCharacterOrThrow:   characterService.getCharacterOrThrow.bind(characterService),
  updateCharacter:       characterService.updateCharacter.bind(characterService),
  deleteCharacter:       characterService.deleteCharacter.bind(characterService),
  gainXP:                characterService.gainXP.bind(characterService),
  equipItem:             characterService.equipItem.bind(characterService),
  unequipItem:           characterService.unequipItem.bind(characterService),
  addToInventory:        characterService.addToInventory.bind(characterService),
  removeFromInventory:   characterService.removeFromInventory.bind(characterService),
  useItem:               characterService.useItem.bind(characterService),
  getCharacterSummary:   characterService.getCharacterSummary.bind(characterService),
  listCharacterIds:      characterService.listCharacterIds.bind(characterService),

  // Model helpers
  validateCharacter:     characterModel.validateCharacter,
  sanitizeForPlayer:     characterModel.sanitizeForPlayer,
  createCharacterTemplate: characterModel.createCharacterTemplate,
  modifier:              characterModel.modifier,
  proficiencyBonus:      characterModel.proficiencyBonus,
  xpForLevel:            characterModel.xpForLevel,
  levelForXP:            characterModel.levelForXP,

  // Portrait
  generatePortraitPrompt: portraitService.generatePortraitPrompt,
  storePortrait:          portraitService.storePortrait,
  getPortrait:            portraitService.getPortrait,
  getStylePresets:        portraitService.getStylePresets,
};
