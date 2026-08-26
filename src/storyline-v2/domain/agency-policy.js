'use strict';

const { asArray, issue } = require('./collections');

const ACTION_ROLES = new Set([
  'alternative', 'discovery', 'preparation', 'commitment', 'exit', 'atmosphere', 'recovery'
]);
const GENERIC_LABEL = /\b(observe|prepare|press|continue|resolve)\b.*\b(chapter|scene|danger|evidence|truth)\b/i;

function auditAgencyQuality(raw, options = {}) {
  const errors = [];
  const warnings = [];
  const strict = options.strict === true || raw.agencyPolicy && raw.agencyPolicy.strict === true;
  const scenes = asArray(raw.scenes);

  scenes.forEach((scene, sceneIndex) => {
    const actions = [
      ...asArray(scene && scene.actions),
      ...asArray(scene && scene.content),
      ...asArray(scene && scene.badChoices),
      ...asArray(scene && scene.exits)
    ];
    const path = `scenes[${sceneIndex}]`;
    const playerActions = actions.filter(action => action && action.type !== 'atmosphere');
    const nonExit = playerActions.filter(action => action.type !== 'exit');
    const exits = playerActions.filter(action => action.type === 'exit');

    actions.forEach((action, actionIndex) => {
      const actionPath = `${path}.actions[${actionIndex}]`;
      const role = action && (action.role || action.actionRole);
      if (strict && !role) errors.push(issue(actionPath, 'New-book actions must declare an agency role'));
      if (role && !ACTION_ROLES.has(role)) errors.push(issue(actionPath, `Unsupported agency role: ${role}`));
      if (strict && !action.replay) errors.push(issue(actionPath, 'New-book actions must declare replay semantics'));
      if (role === 'exit' && action.type !== 'exit') errors.push(issue(actionPath, 'Agency role exit requires action type exit'));
      if (role === 'recovery' && action.type !== 'recovery') errors.push(issue(actionPath, 'Agency role recovery requires action type recovery'));
      const label = String(action && (action.label || action.name || '')).trim();
      if (strict && GENERIC_LABEL.test(label)) errors.push(issue(actionPath, 'Template-style action label is not publishable'));
    });

    if (strict && playerActions.length > 1 && nonExit.length === 0) {
      errors.push(issue(path, 'Scene cannot present only exits as its agency contract'));
    }
    if (strict && nonExit.length > 1 && nonExit.every(action => action.replay !== 'repeatable') && !scene.agency && !scene.agencyPolicy) {
      warnings.push(issue(path, 'All non-exit actions are consumable; declare agency/consequence metadata and verify optional skips remain playable'));
    }
    if (strict && nonExit.length > 1 && !nonExit.some(action => ['alternative', 'discovery', 'preparation', 'recovery'].includes(action.role || action.actionRole))) {
      errors.push(issue(path, 'Scene needs at least one authored non-exit agency role'));
    }
    if (strict && exits.length && nonExit.length && exits.every(exit => !exit.requires && !(exit.availability && exit.availability.requires)) && scene.agency && scene.agency.optionalActionsRequired === true) {
      errors.push(issue(path, 'Optional actions must not be an accidental hard gate for the exit'));
    }
  });

  return { errors, warnings };
}

function assertAgencyQuality(raw, options = {}) {
  const result = auditAgencyQuality(raw, options);
  if (!result.errors.length) return result;
  const error = new Error(`Invalid Storyline v2 agency contract (${result.errors.length} error${result.errors.length === 1 ? '' : 's'})`);
  error.code = 'AGENCY_CONTRACT_INVALID';
  error.errors = result.errors;
  error.warnings = result.warnings;
  throw error;
}

module.exports = { ACTION_ROLES, auditAgencyQuality, assertAgencyQuality };
