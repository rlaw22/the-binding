'use strict';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateDifficultyProfile(book, character, options = {}) {
  const policy = book && book.difficultyPolicy || {};
  const recommended = policy.recommendedLevelRange || { min: 1, max: 3 };
  const level = Number.isFinite(character && character.level) ? character.level : 1;
  const preference = options.preference || 'standard';
  const preferenceOffset = preference === 'gentle' ? -1 : preference === 'elevated' ? 1 : 0;
  const capabilityBand = clamp(level - ((recommended.min + recommended.max) / 2), -3, 3);
  const mode = options.mode || policy.defaultMode || 'continuity';
  return {
    mode,
    preference,
    characterLevel: level,
    recommendedLevelRange: { min: recommended.min, max: recommended.max },
    capabilityBand,
    preferenceOffset,
    scaling: policy.scaling || 'authored_bounded',
    disclosed: true,
    normalized: mode === 'bounded_continuity'
  };
}

module.exports = { calculateDifficultyProfile };
