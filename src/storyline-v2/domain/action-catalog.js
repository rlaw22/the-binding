'use strict';

const { clone } = require('./collections');
const { actionAvailable } = require('./requirements');

function buildCatalog(adventure, state) {
  const scene = adventure.scenes[state.sceneId];
  if (!scene) throw new Error(`Unknown scene: ${state.sceneId}`);
  const affordances = Object.fromEntries((scene.affordances || []).map(item => [item.affordanceId, item]));
  const available = scene.actions.filter(action => {
    const affordance = action.affordanceId && affordances[action.affordanceId];
    return actionAvailable(action, state, { allowConsumed: Boolean(affordance && affordance.persistent) });
  });
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
  const actions = selected.map(action => ({ actionId: action.actionId, contentId: action.contentId, sceneId: state.sceneId, catalogVersion: state.catalogVersion, type: action.type, category: action.category, role: action.role, affordanceId: action.affordanceId, affordanceKind: action.affordanceKind, persistent: action.persistent, visitCount: state.actionVisitCounts?.[action.actionId] || 0, threadId: action.threadId, consequenceSummary: action.consequenceSummary, laterBeat: action.laterBeat, dramaturgy: clone(action.dramaturgy), label: action.label, shortLabel: action.shortLabel, subtitle: action.subtitle, iconKey: action.iconKey, availability: 'available' }));

  return {
    sceneId: state.sceneId,
    catalogVersion: state.catalogVersion,
    sceneName: scene.name,
    setting: scene.setting,
    openingNarration: scene.openingNarration,
    dramaturgy: clone(scene.dramaturgy),
    presentNpcs: clone(scene.presentNpcs),
    threads: (scene.threads || []).map(thread => ({
      threadId: thread.threadId,
      label: thread.label || thread.name || thread.threadId,
      status: state.localThreads && state.localThreads[thread.threadId]
        ? state.localThreads[thread.threadId].status
        : thread.status || 'dormant'
    })),
    actions
  };
}


const buildActionCatalog = buildCatalog;

module.exports = { buildCatalog, buildActionCatalog };
