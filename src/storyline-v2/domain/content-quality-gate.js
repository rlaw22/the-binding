'use strict';

const { asArray, issue } = require('./collections');

const STRUCTURAL = /\b(?:chapter|section|part|act)\s*(?:[ivxlcdm]+|\d+)?\b/i;
const GENERIC_ONLY = /^(?:observe|prepare|continue|resolve|proceed|look around|move forward|press onward|investigate|explore|do something|make a choice)$/i;
const ID_LABEL = /^(?:scene|chapter|act|action|resolve|continue|observe|prepare|press)[\w\s-]*$/i;

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function comparable(value) { return text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function sourceHeadings(raw) {
  const headings = [];
  for (const chapter of asArray(raw && raw.source && raw.source.chapters)) headings.push(chapter && (chapter.title || chapter.heading));
  for (const scene of asArray(raw && raw.scenes)) {
    headings.push(scene && scene.setting);
    headings.push(scene && scene.location && (scene.location.sourceLabel || scene.location.name));
  }
  return headings.map(comparable).filter(Boolean);
}
function overlapsHeading(value, headings) {
  const normalized = comparable(value);
  if (!normalized) return false;
  return headings.some(heading => normalized === heading || (heading.length > 12 && normalized.includes(heading)));
}

function auditIngestedContent(raw, options = {}) {
  const errors = [];
  const warnings = [];
  const scenes = asArray(raw && raw.scenes);
  const strict = options.strict === true || options.ingested === true || raw && (raw.publicationMode === 'new-book' || raw.source && /^whole-book/i.test(raw.source.generation || ''));
  if (!strict) return { errors, warnings, report: { scenesChecked: 0, actionsChecked: 0 } };
  const headings = sourceHeadings(raw);
  let actionsChecked = 0;
  scenes.forEach((scene, si) => {
    const path = `scenes[${si}]`;
    const opening = text(scene && scene.openingNarration);
    const setting = text(scene && scene.setting);
    if (!opening) errors.push(issue(`${path}.openingNarration`, 'Ingested scenes require authored opening narration'));
    if (/^(?:chapter|section|part|act)\s*(?:[ivxlcdm]+|\d+)\s*:/i.test(opening) || STRUCTURAL.test(opening) && opening.length < 140) errors.push(issue(`${path}.openingNarration`, 'Opening narration is structural metadata, not authored player-facing prose'));
    if (overlapsHeading(opening, headings) && opening.length < 180) errors.push(issue(`${path}.openingNarration`, 'Opening narration is copied from source metadata'));
    if (!setting) errors.push(issue(`${path}.setting`, 'Ingested scenes require an authored contextual setting'));
    const actions = [
      ...asArray(scene && scene.actions), ...asArray(scene && scene.content),
      ...asArray(scene && scene.badChoices), ...asArray(scene && scene.exits)
    ];
    const player = actions.filter(a => a && a.type !== 'atmosphere');
    const nonExit = player.filter(a => a.type !== 'exit');
    const exits = player.filter(a => a.type === 'exit');
    if (!exits.length && !scene.terminal) errors.push(issue(path, 'Ingested scene requires an authored route-forward action'));
    if (player.length <= 1 && !scene.terminal) errors.push(issue(path, 'Ingested scene cannot present only a forced exit'));
    actions.forEach((action, ai) => {
      actionsChecked += 1;
      const ap = `${path}.actions[${ai}]`;
      const label = text(action && action.label);
      const short = text(action && action.shortLabel);
      const narration = text(action && action.resolution && action.resolution.narration);
      const role = action && (action.role || action.actionRole);
      if (!label || !short) errors.push(issue(ap, 'Ingested actions require authored label and shortLabel'));
      if (!role) errors.push(issue(ap, 'Ingested actions require an explicit agency role'));
      if (!action || !action.replay) errors.push(issue(ap, 'Ingested actions require explicit replay semantics'));
      if (GENERIC_ONLY.test(label) || ID_LABEL.test(label) || STRUCTURAL.test(label)) errors.push(issue(ap, 'Template or structural action label is not publishable'));
      if (overlapsHeading(label, headings)) errors.push(issue(ap, 'Action label copies source metadata'));
      if (!narration) errors.push(issue(ap, 'Ingested actions require authored resolution narration'));
      if (overlapsHeading(narration, headings) && narration.length < 180) errors.push(issue(ap, 'Action resolution narration copies source metadata'));
    });
    if (nonExit.length > 1 && nonExit.every(a => a.replay !== 'repeatable') && !(scene.agency && scene.agency.allowForcedExitAfterExhaustion === true)) {
      errors.push(issue(path, 'Consumable non-exit actions would silently exhaust the scene into a forced exit'));
    }
    if (nonExit.length > 1 && !nonExit.some(a => ['alternative', 'discovery', 'preparation', 'commitment'].includes(a.role || a.actionRole))) {
      errors.push(issue(path, 'Scene requires at least one meaningful non-exit agency role'));
    }
  });
  return { errors, warnings, report: { scenesChecked: scenes.length, actionsChecked } };
}

function assertIngestedContent(raw, options = {}) {
  const result = auditIngestedContent(raw, options);
  if (!result.errors.length) return result;
  const error = new Error(`Ingested content quality gate failed (${result.errors.length} errors)`);
  error.code = 'INGESTION_QUALITY_GATE_FAILED';
  error.errors = result.errors;
  error.warnings = result.warnings;
  error.report = result.report;
  throw error;
}

module.exports = { auditIngestedContent, assertIngestedContent };
