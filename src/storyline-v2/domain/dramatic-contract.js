'use strict';

const { asArray, issue } = require('./collections');

// Dramaturgy is content authority, not runtime improvisation. These fields make
// the intended dramatic beat inspectable and prevent a structurally valid
// manifest from silently degrading into "summary -> command -> acknowledgement".
const SCENE_FIELDS = ['situation', 'immediateObjective', 'pressure', 'nextQuestion'];
const ACTION_FIELDS = ['approach', 'stakes', 'reaction', 'changedSituation', 'nextObjective'];

function auditDramaticContract(raw, options = {}) {
  const errors = [];
  const warnings = [];
  const strict = options.strict === true;
  if (!strict) return { errors, warnings };

  asArray(raw.scenes).forEach((scene, sceneIndex) => {
    const scenePath = `scenes[${sceneIndex}]`;
    const beat = scene && scene.dramaturgy;
    requireTextFields(beat, SCENE_FIELDS, errors, `${scenePath}.dramaturgy`);
    if (beat && !Array.isArray(beat.presentActors) && !Array.isArray(beat.actorStances)) {
      errors.push(issue(`${scenePath}.dramaturgy`, 'Present actors or actor stances are required'));
    }

    const actions = [
      ...asArray(scene && scene.actions),
      ...asArray(scene && scene.content),
      ...asArray(scene && scene.badChoices),
      ...asArray(scene && scene.exits)
    ];
    actions.forEach((action, actionIndex) => {
      const path = `${scenePath}.actions[${actionIndex}]`;
      const beatAction = action && (action.dramaturgy || action.beat);
      requireTextFields(beatAction, ACTION_FIELDS, errors, `${path}.dramaturgy`);
      rejectTemplateDramaturgy(beatAction, errors, `${path}.dramaturgy`);
      if (beatAction && !Array.isArray(beatAction.effects) && !beatAction.effectSummary) {
        errors.push(issue(`${path}.dramaturgy`, 'Authored effects or effectSummary is required'));
      }
      if (action && action.type === 'exit' && beatAction && !beatAction.convergence) {
        warnings.push(issue(`${path}.dramaturgy`, 'Exit action should declare convergence or commitment semantics'));
      }
    });
  });
  return { errors, warnings };
}

function requireTextFields(value, fields, errors, path) {
  if (!value || typeof value !== 'object') {
    errors.push(issue(path, 'Authored dramatic beat is required'));
    return;
  }
  fields.forEach(field => {
    if (typeof value[field] !== 'string' || value[field].trim().length < 12) {
      errors.push(issue(`${path}.${field}`, 'Meaningful authored text is required'));
    }
  });
}

function rejectTemplateDramaturgy(value, errors, path) {
  if (!value || typeof value !== 'object') return;
  const template = /decide what to do next|what was uncertain is now|the choice may change|the scene has changed:/i;
  Object.entries(value).forEach(([field, text]) => {
    if (typeof text === 'string' && template.test(text)) {
      errors.push(issue(`${path}.${field}`, 'Template dramatic text is not publication-safe; author the specific reaction and changed situation'));
    }
  });
}

module.exports = { SCENE_FIELDS, ACTION_FIELDS, auditDramaticContract };
