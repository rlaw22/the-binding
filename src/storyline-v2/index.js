'use strict';

/**
 * Storyline v2 foundation.
 *
 * This module is deliberately independent of the legacy Storyline runtime,
 * Campaign inventory, HTTP, browser state, and LLM services.
 */

const ACTION_TYPES = new Set([
  'exploration', 'collectible', 'class', 'threat', 'bad_choice', 'exit', 'atmosphere'
]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : Object.values(value);
}

function idSet(values) {
  return new Set(asArray(values).map(String));
}

function issue(path, message) {
  return { path, message };
}

function compileAdventure(raw) {
  const errors = [];
  const warnings = [];
  if (!raw || typeof raw !== 'object') {
    throw new Error('Manifest must be an object');
  }
  if (raw.schemaVersion !== '2.0') errors.push(issue('schemaVersion', 'Expected schemaVersion 2.0'));
  if (!raw.adventureId) errors.push(issue('adventureId', 'Adventure ID is required'));
  if (!raw.title) errors.push(issue('title', 'Adventure title is required'));

  const classes = asArray(raw.classes);
  const classIds = new Set();
  classes.forEach((entry, i) => {
    const value = typeof entry === 'string' ? { classId: entry } : entry;
    if (!value || !value.classId) errors.push(issue(`classes[${i}]`, 'Class ID is required'));
    else if (classIds.has(value.classId)) errors.push(issue(`classes[${i}]`, `Duplicate class ID: ${value.classId}`));
    else classIds.add(value.classId);
  });

  const itemDefs = raw.items || {};
  const itemIds = new Set(Object.keys(itemDefs));
  const scenes = asArray(raw.scenes);
  const sceneMap = {};
  const actionIds = new Set();
  const contentIds = new Set();

  scenes.forEach((rawScene, sceneIndex) => {
    const path = `scenes[${sceneIndex}]`;
    if (!rawScene || !rawScene.sceneId) {
      errors.push(issue(path, 'Scene ID is required'));
      return;
    }
    if (sceneMap[rawScene.sceneId]) {
      errors.push(issue(path, `Duplicate scene ID: ${rawScene.sceneId}`));
      return;
    }
    if (!rawScene.name && !rawScene.sceneName) warnings.push(issue(path, 'Scene has no display name'));
    const scene = normalizeScene(rawScene);
    sceneMap[scene.sceneId] = scene;

    scene.actions.forEach((action, actionIndex) => {
      const actionPath = `${path}.actions[${actionIndex}]`;
      if (!action.actionId) errors.push(issue(actionPath, 'Action ID is required'));
      if (!ACTION_TYPES.has(action.type)) errors.push(issue(actionPath, `Unsupported action type: ${action.type}`));
      if (actionIds.has(action.actionId)) errors.push(issue(actionPath, `Duplicate action ID: ${action.actionId}`));
      else actionIds.add(action.actionId);
      if (action.contentId) {
        if (contentIds.has(action.contentId)) errors.push(issue(actionPath, `Duplicate content ID: ${action.contentId}`));
        else contentIds.add(action.contentId);
      }
      if (action.type === 'collectible') {
        const added = asArray(action.resolution && action.resolution.addItems);
        added.forEach(itemId => {
          if (!itemIds.has(itemId)) errors.push(issue(actionPath, `Unknown item: ${itemId}`));
        });
      }
      validateRequirements(action.availability && action.availability.requires, classIds, itemIds, actionIds, errors, `${actionPath}.availability.requires`);
      validateRequirements(action.requires, classIds, itemIds, actionIds, errors, `${actionPath}.requires`);
    });
  });

  // Validate action references after all scenes have been indexed so forward
  // references are supported without allowing unknown IDs.
  scenes.forEach((rawScene, sceneIndex) => {
    const scene = sceneMap[rawScene.sceneId];
    scene.actions.forEach((action, actionIndex) => {
      validateActionRequirements(action.availability && action.availability.requires, actionIds, errors, `scenes[${sceneIndex}].actions[${actionIndex}].availability.requires`);
      validateActionRequirements(action.requires, actionIds, errors, `scenes[${sceneIndex}].actions[${actionIndex}].requires`);
    });
  });

  const graphEdges = asArray(raw.graph && raw.graph.edges);
  const edgeIds = new Set();
  graphEdges.forEach((edge, i) => {
    if (!edge || !edge.edgeId) errors.push(issue(`graph.edges[${i}]`, 'Edge ID is required'));
    else if (edgeIds.has(edge.edgeId)) errors.push(issue(`graph.edges[${i}]`, `Duplicate edge ID: ${edge.edgeId}`));
    else edgeIds.add(edge.edgeId);
    if (!edge || !sceneMap[edge.from]) errors.push(issue(`graph.edges[${i}].from`, `Unknown source scene: ${edge && edge.from}`));
    if (!edge || !sceneMap[edge.to]) errors.push(issue(`graph.edges[${i}].to`, `Unknown destination scene: ${edge && edge.to}`));
    if (edge && edge.trigger && edge.trigger.actionId && !actionIds.has(edge.trigger.actionId)) {
      errors.push(issue(`graph.edges[${i}].trigger.actionId`, `Unknown trigger action: ${edge.trigger.actionId}`));
    }
    validateRequirements(edge && edge.trigger && edge.trigger.requires, classIds, itemIds, actionIds, errors, `graph.edges[${i}].trigger.requires`);
  });

  const entry = raw.graph && raw.graph.entry || (raw.prologue && raw.prologue.startingSceneId);
  if (!entry || !sceneMap[entry]) errors.push(issue('graph.entry', `Entry scene does not exist: ${entry}`));
  if (errors.length) {
    const error = new Error(`Invalid Storyline v2 manifest (${errors.length} error${errors.length === 1 ? '' : 's'})`);
    error.code = 'MANIFEST_INVALID';
    error.errors = errors;
    error.warnings = warnings;
    throw error;
  }

  return Object.freeze({
    schemaVersion: '2.0',
    adventureId: raw.adventureId,
    title: raw.title,
    source: clone(raw.source || {}),
    narrativePolicy: clone(raw.narrativePolicy || {}),
    prologue: clone(raw.prologue || {}),
    classes: clone(classes),
    items: clone(itemDefs),
    threats: clone(raw.threats || {}),
    scenes: Object.freeze(sceneMap),
    graph: Object.freeze({ entry, edges: clone(graphEdges) }),
    endings: clone(raw.endings || {}),
    warnings: Object.freeze(warnings)
  });
}

function normalizeScene(raw) {
  const actions = [];
  asArray(raw.actions).forEach(action => actions.push(normalizeAction(action)));
  asArray(raw.content).forEach(item => actions.push(normalizeAction({
    ...item,
    actionId: item.actionId || item.id,
    contentId: item.contentId || item.id,
    type: item.type || 'exploration',
    category: item.category || 'exploration',
    resolution: item.resolution || {
      resultType: item.discovery ? 'discovery' : 'atmosphere',
      narration: item.discovery || '',
      discover: item.discovery ? [item.contentId || item.id] : [],
      addItems: item.itemGained ? [item.itemGained] : []
    }
  })));
  asArray(raw.badChoices).forEach(action => actions.push(normalizeAction({ ...action, type: 'bad_choice', category: 'risk' })));
  asArray(raw.exits).forEach(action => actions.push(normalizeAction({ ...action, type: 'exit', category: 'exit' })));
  asArray(raw.threats).forEach(action => actions.push(normalizeAction({ ...action, type: 'threat', category: 'threat' })));
  return {
    sceneId: raw.sceneId,
    actId: raw.actId || null,
    name: raw.name || raw.sceneName || raw.sceneId,
    location: clone(raw.location || {}),
    setting: raw.setting || raw.description || '',
    presentNpcs: clone(raw.presentNpcs || []),
    openingNarration: raw.openingNarration || raw.description || '',
    actions,
    completion: clone(raw.completion || {})
  };
}

function normalizeAction(action) {
  const resolution = clone(action.resolution || {});
  return {
    actionId: action.actionId || action.id,
    contentId: action.contentId || null,
    type: action.type || 'exploration',
    category: action.category || action.type || 'exploration',
    label: action.label || action.name || action.actionId || action.id,
    shortLabel: action.shortLabel || action.label || action.name || action.actionId || action.id,
    subtitle: action.subtitle || action.description || '',
    iconKey: action.iconKey || null,
    keywords: clone(action.keywords || []),
    availability: clone(action.availability || {}),
    requires: clone(action.requires || []),
    resolution,
    replay: action.replay || 'consumable'
  };
}

function validateActionRequirements(requirements, actionIds, errors, path) {
  asArray(requirements).forEach((req, i) => {
    if (req && req.kind === 'action' && !actionIds.has(req.id)) {
      errors.push(issue(`${path}[${i}]`, `Unknown action: ${req.id}`));
    }
  });
}

function validateRequirements(requirements, classIds, itemIds, actionIds, errors, path) {
  asArray(requirements).forEach((req, i) => {
    if (!req || !req.kind) return errors.push(issue(`${path}[${i}]`, 'Requirement kind is required'));
    if (req.kind === 'class' && !classIds.has(req.id)) errors.push(issue(`${path}[${i}]`, `Unknown class: ${req.id}`));
    if (req.kind === 'item' && !itemIds.has(req.id)) errors.push(issue(`${path}[${i}]`, `Unknown item: ${req.id}`));
    if (req.kind === 'action' && actionIds.size && !actionIds.has(req.id)) {
      // Cross-action references may point forward; defer this check to runtime/compiler pass.
    }
  });
}

function createState(adventure, options = {}) {
  const sceneId = options.sceneId || adventure.graph.entry;
  if (!adventure.scenes[sceneId]) throw new Error(`Unknown starting scene: ${sceneId}`);
  const classId = options.classId || null;
  if (classId && !adventure.classes.some(c => (typeof c === 'string' ? c : c.classId) === classId)) throw new Error(`Unknown class: ${classId}`);
  return {
    mode: 'storyline', adventureId: adventure.adventureId, sessionId: options.sessionId || null,
    sceneId, actId: adventure.scenes[sceneId].actId, turnNumber: 0, catalogVersion: `${sceneId}:0`,
    character: { classId, hp: options.hp == null ? 20 : options.hp, maxHp: options.maxHp == null ? 20 : options.maxHp, abilities: clone(options.abilities || []), abilitiesUsed: [] },
    discoveredContentIds: [], consumedActionIds: [], inventory: clone(options.inventory || []), flags: clone(options.flags || {}), coins: options.coins == null ? 10 : options.coins,
    metNpcIds: clone(options.metNpcIds || []), completedSceneIds: [], processedTurns: {}
  };
}

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

function buildCatalog(adventure, state) {
  const scene = adventure.scenes[state.sceneId];
  if (!scene) throw new Error(`Unknown scene: ${state.sceneId}`);
  const available = scene.actions.filter(action => actionAvailable(action, state));
  const priority = { class: 0, lore: 1, exploration: 2, collectible: 2, environment: 3, threat: 4, risk: 4, exit: 5, atmosphere: 6 };
  available.sort((a, b) => (priority[a.category] ?? 5) - (priority[b.category] ?? 5) || a.actionId.localeCompare(b.actionId));
  const actions = available.slice(0, 6).map(action => ({ actionId: action.actionId, contentId: action.contentId, sceneId: state.sceneId, catalogVersion: state.catalogVersion, type: action.type, category: action.category, label: action.label, shortLabel: action.shortLabel, subtitle: action.subtitle, iconKey: action.iconKey, availability: 'available' }));
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

function resolveTurn({ adventure, state: inputState, actionId, catalogVersion, turnId }) {
  const state = clone(inputState);
  // Idempotency is checked before catalog freshness: a retried request carries
  // the original catalog version, which is expected to be stale after the
  // first successful resolution.
  if (turnId && state.processedTurns[turnId]) return clone(state.processedTurns[turnId]);
  if (catalogVersion !== state.catalogVersion) return rejected(adventure, 'STALE_CATALOG', 'That action is no longer available.', state);
  const scene = adventure.scenes[state.sceneId];
  const action = scene.actions.find(candidate => candidate.actionId === actionId);
  const catalog = buildCatalog(adventure, state);
  if (!action || !catalog.actions.some(candidate => candidate.actionId === actionId)) return rejected(adventure, 'ACTION_UNAVAILABLE', 'That action is no longer available.', state);

  const beforeSceneId = state.sceneId;
  const resolution = action.resolution || {};
  const stateChanges = { hp: 0, coins: 0, flags: {}, discoveredContentIds: [], itemsAdded: [], itemsRemoved: [] };
  if (action.replay !== 'repeatable') state.consumedActionIds.push(action.actionId);
  asArray(resolution.discover).forEach(id => {
    if (!state.discoveredContentIds.includes(id)) { state.discoveredContentIds.push(id); stateChanges.discoveredContentIds.push(id); }
  });
  asArray(resolution.addItems).forEach(id => {
    if (!state.inventory.includes(id)) { state.inventory.push(id); stateChanges.itemsAdded.push(id); }
  });
  asArray(resolution.removeItems).forEach(id => {
    const index = state.inventory.indexOf(id);
    if (index !== -1) { state.inventory.splice(index, 1); stateChanges.itemsRemoved.push(id); }
  });
  if (resolution.hp) { state.character.hp += resolution.hp; stateChanges.hp = resolution.hp; }
  if (resolution.coins) { state.coins += resolution.coins; stateChanges.coins = resolution.coins; }
  Object.assign(state.flags, resolution.setFlags || {}); Object.assign(stateChanges.flags, resolution.setFlags || {});

  let transition = null;
  const edge = (adventure.graph.edges || []).find(candidate => candidate.from === beforeSceneId && candidate.trigger && candidate.trigger.actionId === actionId && requirementsPass(candidate.trigger.requires || [], state));
  if (edge) {
    state.completedSceneIds.push(beforeSceneId);
    state.sceneId = edge.to; state.actId = adventure.scenes[edge.to].actId;
    transition = { edgeId: edge.edgeId, sourceSceneId: beforeSceneId, destinationSceneId: edge.to };
  }
  state.turnNumber += 1; state.catalogVersion = `${state.sceneId}:${state.turnNumber}`;
  const result = {
    responseId: `response:${turnId || state.turnNumber}`, turnId: turnId || null, sceneId: state.sceneId, sourceSceneId: beforeSceneId,
    actionId, contentId: action.contentId, resultType: resolution.resultType || action.type, narrative: resolution.narration || action.label,
    endingId: resolution.endingId || null,
    stateChanges, transition, catalog: buildCatalog(adventure, state)
  };
  if (turnId) state.processedTurns[turnId] = clone(result);
  return { state, result };
}

function rejected(adventure, code, narrative, state) {
  return {
    state: clone(state),
    result: {
      responseId: null, turnId: null, sceneId: state.sceneId, sourceSceneId: state.sceneId,
      actionId: null, contentId: null, resultType: 'rejected', error: code, narrative,
      stateChanges: null, transition: null, catalog: buildCatalog(adventure, state)
    }
  };
}

function matchFreeText(text, catalog, definitions) {
  const normalized = normalize(text);
  if (!normalized || !catalog || !Array.isArray(catalog.actions)) return { status: 'no_match', action: null };
  const definitionMap = new Map((definitions || []).map(item => [item.actionId, item]));
  const candidates = catalog.actions.map(action => {
    const definition = definitionMap.get(action.actionId) || action;
    const terms = [definition.actionId, definition.contentId, definition.label, definition.shortLabel, ...(definition.keywords || [])]
      .filter(Boolean).map(normalize).filter(term => term.length >= 2);
    const exact = terms.filter(term => normalized === term);
    const phrase = terms.filter(term => term.length >= 3 && normalized.includes(term));
    const tokenOverlap = terms.filter(term => term.split(' ').length > 1 && term.split(' ').every(token => normalized.split(' ').includes(token)));
    const score = exact.length ? 100 : phrase.length ? 60 : tokenOverlap.length ? 40 : 0;
    return { action, score, exact: exact.length > 0 };
  }).filter(candidate => candidate.score > 0).sort((a, b) => b.score - a.score || a.action.actionId.localeCompare(b.action.actionId));
  if (!candidates.length) return { status: 'no_match', action: null };
  const top = candidates[0];
  const tied = candidates.filter(candidate => candidate.score === top.score);
  if (tied.length !== 1 || (!top.exact && candidates.length > 1 && candidates[1].score >= top.score - 20)) {
    return { status: 'ambiguous', action: null, candidates: tied.map(candidate => candidate.action) };
  }
  return { status: 'matched', action: top.action };
}

function normalize(text) { return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' '); }

module.exports = { ACTION_TYPES, compileAdventure, createState, buildCatalog, resolveTurn, matchFreeText, normalize };
