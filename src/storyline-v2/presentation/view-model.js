'use strict';

/**
 * Convert an authoritative V2 snapshot into a presentation-only model.
 * No DOM, browser globals, persistence, or story mutation belongs here.
 */
function createStorylineV2ViewModel(snapshot) {
  if (!snapshot || !snapshot.state || !snapshot.catalog) {
    throw new Error('Storyline v2 snapshot is required');
  }

  const state = snapshot.state;
  const catalog = snapshot.catalog;
  const actions = Array.isArray(catalog.actions) ? catalog.actions : [];
  const journal = Array.isArray(state.journal)
    ? state.journal.map(entry => ({ ...entry }))
    : state.journal && Array.isArray(state.journal.entries)
      ? state.journal.entries.map(entry => ({ ...entry }))
      : [];
  const bookmarks = Array.isArray(state.bookmarks)
    ? state.bookmarks.slice(0, 2).map(bookmark => ({ ...bookmark }))
    : [];
  const textInputActions = actions.map(action => ({
    actionId: action.actionId,
    label: action.label || action.actionId,
    shortLabel: action.shortLabel || action.label || action.actionId
  }));

  return {
    adventureId: snapshot.adventureId || state.adventureId,
    scene: {
      sceneId: catalog.sceneId,
      name: catalog.sceneName || catalog.sceneId,
      setting: catalog.setting || '',
      openingNarration: catalog.openingNarration || '',
      dramaturgy: catalog.dramaturgy ? { ...catalog.dramaturgy } : {},
      presentNpcs: Array.isArray(catalog.presentNpcs) ? catalog.presentNpcs.slice() : [],
      threads: Array.isArray(catalog.threads) ? catalog.threads.map(thread => ({ ...thread })) : [],
      unresolvedThreads: Array.isArray(catalog.threads)
        ? catalog.threads.filter(thread => !['resolved', 'closed', 'impossible'].includes(thread.status)).map(thread => ({ ...thread }))
        : []
    },
    status: {
      mode: state.mode || 'storyline',
      sceneId: state.sceneId,
      actId: state.actId || null,
      turnNumber: Number.isFinite(state.turnNumber) ? state.turnNumber : 0,
      hp: state.character && Number.isFinite(state.character.hp) ? state.character.hp : null,
      maxHp: state.character && Number.isFinite(state.character.maxHp) ? state.character.maxHp : null,
      inventory: Array.isArray(state.inventory) ? state.inventory.slice() : [],
      terminal: Boolean(state.endingId || state.completed)
    },
    textInput: {
      enabled: actions.length > 0 && !Boolean(state.endingId || state.completed),
      label: 'Or describe what you do',
      hint: 'Describe one of the available actions in your own words.',
      catalogVersion: catalog.catalogVersion,
      legalActions: textInputActions
    },
    actions: actions.map(action => ({
      actionId: action.actionId,
      type: action.type || 'exploration',
      category: action.category || action.type || 'exploration',
      label: action.label || action.actionId,
      shortLabel: action.shortLabel || action.label || action.actionId,
      subtitle: action.subtitle || '',
      iconKey: action.iconKey || null,
      dramaturgy: action.dramaturgy ? { ...action.dramaturgy } : {},
      consequenceSummary: action.consequenceSummary || '',
      laterBeat: action.laterBeat || null,
      catalogVersion: action.catalogVersion || catalog.catalogVersion,
      ariaLabel: [action.label || action.actionId, action.subtitle].filter(Boolean).join(' — ')
    })),
    journal: journal.map(entry => ({ ...entry })),
    bookmarks: bookmarks.map(bookmark => ({ ...bookmark })),
    presentBookmark: {
      id: 'present',
      label: 'Present',
      ariaLabel: 'Return to present'
    },
    catalogVersion: catalog.catalogVersion
  };
}

module.exports = { createStorylineV2ViewModel };
