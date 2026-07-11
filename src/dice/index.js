'use strict';

/**
 * The Binding — Dice Service
 *
 * Main entry point.  Re-exports everything the combat engine, AI DM, and
 * client renderer need.
 *
 * Usage:
 *   const dice = require('./dice');
 *   const result = dice.rollDice({ type: 'd20', count: 1, modifier: 5, context: 'attack_roll' });
 *   const damage = dice.rollDamage('d8', 2, 3);
 *   const proof  = dice.verifyRollProof(result);
 */

const random = require('./random');
const diceTypes = require('./dice-types');
const diceService = require('./dice-service');

module.exports = {
  // --- Primary API ---
  rollDice:             diceService.rollDice,

  // --- Convenience wrappers ---
  roll:                 diceService.roll,
  rollAttack:           diceService.rollAttack,
  rollDamage:           diceService.rollDamage,
  rollSave:             diceService.rollSave,
  rollCheck:            diceService.rollCheck,

  // --- History & leaderboard ---
  getRecentRolls:       diceService.getRecentRolls,
  getRollHistory:       diceService.getRollHistory,
  getCharacterRolls:    diceService.getCharacterRolls,
  getLeaderboardStats:  diceService.getLeaderboardStats,
  verifyRollProof:      diceService.verifyRollProof,
  clearHistory:         diceService.clearHistory,

  // --- Random (for direct use by other modules) ---
  randomInt:            random.randomInt,
  randomBytes:          random.randomBytes,
  generateProof:        random.generateProof,
  verifyProof:          random.verifyProof,

  // --- Dice types ---
  DICE_TYPES:           diceTypes.DICE_TYPES,
  getDiceType:          diceTypes.getDiceType,
  getAnimationForRoll:  diceTypes.getAnimationForRoll,
  getRandomAnimation:   diceTypes.getRandomAnimation,
};
