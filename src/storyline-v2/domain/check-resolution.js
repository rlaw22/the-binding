'use strict';

const { clone } = require('./collections');

const DEFAULT_DIE_SIDES = 20;

function hashSeed(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicDie({ seed, sides = DEFAULT_DIE_SIDES }) {
  if (!Number.isInteger(sides) || sides < 2 || sides > 1000) {
    throw new Error('Check die sides must be an integer between 2 and 1000');
  }
  return (hashSeed(seed) % sides) + 1;
}

function resolveCheck({ check, state, actionId, turnId }) {
  if (!check || typeof check !== 'object') return null;
  const ability = check.ability || 'observe';
  const capability = state.character && state.character.capabilities
    ? state.character.capabilities[ability]
    : undefined;
  if (!Number.isFinite(capability)) {
    throw new Error(`Unknown check ability: ${ability}`);
  }
  const sides = check.dieSides == null ? DEFAULT_DIE_SIDES : check.dieSides;
  const seed = check.seed || `${state.sessionId || 'session'}:${turnId || state.turnNumber}:${actionId}`;
  const roll = deterministicDie({ seed, sides });
  const modifier = Number.isFinite(check.modifier) ? check.modifier : 0;
  const total = roll + capability + modifier;
  const difficulty = check.difficulty;
  if (!Number.isInteger(difficulty) || difficulty < 0) {
    throw new Error('Check difficulty must be a non-negative integer');
  }
  const success = total >= difficulty;
  const authored = clone(success ? check.onSuccess : check.onFailure) || {};
  return {
    ability,
    roll,
    modifier,
    capability,
    total,
    difficulty,
    success,
    outcome: authored
  };
}

module.exports = { DEFAULT_DIE_SIDES, deterministicDie, resolveCheck };