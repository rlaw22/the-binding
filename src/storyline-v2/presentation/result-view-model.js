'use strict';

/**
 * Normalize one authoritative action result for rendering. This is a pure
 * presentation model: it never calculates, retries, or changes story state.
 */
function createStorylineV2ResultViewModel(result) {
  if (!result || typeof result !== 'object') throw new Error('Storyline v2 result is required');
  const check = result.check && typeof result.check === 'object'
    ? {
        ability: result.check.ability || null,
        roll: Number.isFinite(result.check.roll) ? result.check.roll : null,
        modifier: Number.isFinite(result.check.modifier) ? result.check.modifier : 0,
        capability: Number.isFinite(result.check.capability) ? result.check.capability : 0,
        total: Number.isFinite(result.check.total) ? result.check.total : null,
        difficulty: Number.isFinite(result.check.difficulty) ? result.check.difficulty : null,
        success: Boolean(result.check.success),
        outcome: result.check.success ? 'success' : 'failure'
      }
    : null;
  return {
    responseId: result.responseId || null,
    turnId: result.turnId || null,
    actionId: result.actionId || null,
    resultType: result.resultType || null,
    narrative: result.narrative || '',
    dramaticBeat: result.dramaticBeat ? { ...result.dramaticBeat } : {},
    check,
    stateChanges: result.stateChanges ? { ...result.stateChanges } : null,
    transition: result.transition ? { ...result.transition } : null,
    endingId: result.endingId || null,
    rejected: Boolean(result.rejected || result.resultType === 'rejected')
  };
}

module.exports = { createStorylineV2ResultViewModel };