'use strict';

const { asArray } = require('./collections');

function requirementsPass(requirements, state) {
  return asArray(requirements).every(req => {
    if (req.kind === 'item') return state.inventory.includes(req.id);
    if (req.kind === 'class') return state.character.classId === req.id;
    if (req.kind === 'flag') return state.flags[req.id] === req.equals;
    if (req.kind === 'discovery') return state.discoveredContentIds.includes(req.id);
    if (req.kind === 'action') return state.consumedActionIds.includes(req.id);
    return false;
  });
}

function actionAvailable(action, state) {
  if (state.consumedActionIds.includes(action.actionId) && action.replay !== 'repeatable') return false;
  const availability = action.availability || {};
  if (availability.classes && availability.classes.length && !availability.classes.includes(state.character.classId)) return false;
  const required = [...(availability.requires || []), ...(action.requires || [])];
  const excluded = availability.excludes || [];
  return requirementsPass(required, state) && !excluded.some(requirement => requirementsPass([requirement], state));
}


module.exports = { requirementsPass, actionAvailable };
