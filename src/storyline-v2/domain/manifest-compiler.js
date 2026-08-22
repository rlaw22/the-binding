'use strict';

const { clone, asArray, issue } = require('./collections');
const { estimateManifestMetrics, auditManifestQuality } = require('./manifest-metrics');

const ACTION_TYPES = new Set([
  'exploration', 'collectible', 'class', 'threat', 'bad_choice', 'exit', 'atmosphere', 'recovery'
]);
const CHECK_ABILITIES = new Set([
  'observe', 'endure', 'persuade', 'investigate', 'protect', 'fight', 'move', 'resist', 'prepare'
]);
const CHECK_EFFECT_KEYS = new Set([
  'resultType', 'narration', 'hp', 'coins', 'setFlags', 'discover', 'addItems', 'removeItems', 'endingId', 'endingRules'
]);

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
      validateCheck(action.resolution && action.resolution.check, itemIds, errors, `${actionPath}.resolution.check`);
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

  const metrics = estimateManifestMetrics(raw, Object.values(sceneMap));
  const qualityWarnings = auditManifestQuality(raw, metrics);

  return Object.freeze({
    schemaVersion: '2.0',
    adventureId: raw.adventureId,
    title: raw.title,
    source: clone(raw.source || {}),
    estimatedDuration: clone(metrics.estimatedDuration),
    contentScale: clone(metrics.contentScale),
    narrativePolicy: clone(raw.narrativePolicy || {}),
    transferPolicy: clone(raw.transferPolicy || {}),
    difficultyPolicy: clone(raw.difficultyPolicy || {}),
    prologue: clone(raw.prologue || {}),
    classes: clone(classes),
    items: clone(itemDefs),
    threats: clone(raw.threats || {}),
    scenes: Object.freeze(sceneMap),
    graph: Object.freeze({ entry, edges: clone(graphEdges) }),
    endings: clone(raw.endings || {}),
    qualityWarnings: Object.freeze(qualityWarnings),
    warnings: Object.freeze([...warnings, ...qualityWarnings])
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

function validateCheck(check, itemIds, errors, path) {
  if (!check) return;
  if (!CHECK_ABILITIES.has(check.ability)) errors.push(issue(`${path}.ability`, `Unsupported check ability: ${check.ability}`));
  if (!Number.isInteger(check.difficulty) || check.difficulty < 0) errors.push(issue(`${path}.difficulty`, 'Check difficulty must be a non-negative integer'));
  if (check.dieSides != null && (!Number.isInteger(check.dieSides) || check.dieSides < 2 || check.dieSides > 1000)) {
    errors.push(issue(`${path}.dieSides`, 'Check die sides must be an integer between 2 and 1000'));
  }
  ['onSuccess', 'onFailure'].forEach(branch => {
    const effect = check[branch];
    if (!effect || typeof effect !== 'object') {
      errors.push(issue(`${path}.${branch}`, 'Authored check branch is required'));
      return;
    }
    Object.keys(effect).forEach(key => {
      if (!CHECK_EFFECT_KEYS.has(key)) errors.push(issue(`${path}.${branch}.${key}`, `Unsupported authored check effect: ${key}`));
    });
    [...(effect.addItems || []), ...(effect.removeItems || [])].forEach(itemId => {
      if (!itemIds.has(itemId)) errors.push(issue(`${path}.${branch}`, `Unknown item: ${itemId}`));
    });
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


// `compileManifest` is the boundary name; `compileAdventure` remains an
// explicit compatibility alias for existing callers during extraction.
const compileManifest = compileAdventure;

module.exports = { ACTION_TYPES, compileManifest, compileAdventure };
