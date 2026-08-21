'use strict';

const { clone } = require('./collections');
const { actionAvailable } = require('./requirements');

function buildCatalog(adventure, state) {
  const scene = adventure.scenes[state.sceneId];
  if (!scene) throw new Error(`Unknown scene: ${state.sceneId}`);
  const available = scene.actions.filter(action => actionAvailable(action, state));
  const priority = { recovery: 0, class: 1, lore: 2, exploration: 3, collectible: 3, environment: 4, threat: 5, risk: 5, exit: 6, atmosphere: 7 };
  available.sort((a, b) => (priority[a.category] ?? 5) - (priority[b.category] ?? 5) || a.actionId.localeCompare(b.actionId));
  let selected = available.slice(0, 6);
  // A terminal/scene exit is a progression contract, not optional flavor. If
  // sorting would push it past the six-action presentation limit, reserve the
  // final slot for the first available exit.
  const exit = available.find(action => action.type === 'exit');
  if (exit && !selected.some(action => action.actionId === exit.actionId)) {
    selected = [...selected.slice(0, 5), exit];
  }
  const actions = selected.map(action => ({ actionId: action.actionId, contentId: action.contentId, sceneId: state.sceneId, catalogVersion: state.catalogVersion, type: action.type, category: action.category, label: action.label, shortLabel: action.shortLabel, subtitle: action.subtitle, iconKey: action.iconKey, availability: 'available' }));
  return {
    sceneId: state.sceneId,
    catalogVersion: state.catalogVersion,
    sceneName: scene.name,
    setting: scene.setting,
    openingNarration: scene.openingNarration,
    presentNpcs: clone(scene.presentNpcs),
    actions
  };
}


const buildActionCatalog = buildCatalog;

module.exports = { buildCatalog, buildActionCatalog };
