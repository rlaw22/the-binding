'use strict';

const { clone, asArray, issue } = require('./collections');
const { estimateManifestMetrics, auditManifestQuality } = require('./manifest-metrics');
const { auditAgencyQuality, assertAgencyQuality } = require('./agency-policy');
const { auditDramaticContract } = require('./dramatic-contract');

const AFFORDANCE_KINDS = new Set(['core', 'contextual', 'discovery', 'state_dependent', 'atmosphere', 'exit']);
const THREAD_STATUSES = new Set(['dormant', 'active', 'resolved', 'closed']);
const AFFORDANCE_CLOSURES = new Set(['authored_resolution', 'movement_or_commitment', 'time', 'world_state', 'impossible']);
const AFFORDANCE_RETURNS = new Set(['resurface_while_plausible', 'consumed_or_transformed', 'closed', 'never']);
const REPLAY_POLICIES = new Set(['repeatable', 'consumable']);

function validateAuthoringQuality(scene, errors, path, strict) {
  const affordances = new Map(asArray(scene.affordances).map(item => [item.affordanceId, item]));
  asArray(scene.affordances).forEach((affordance, index) => {
    const affordancePath = `${path}.affordances[${index}]`;
    if (strict && !affordance.closure) errors.push(issue(`${affordancePath}.closure`, 'Authored affordance closure is required'));
    if (strict && !affordance.returnBehavior) errors.push(issue(`${affordancePath}.returnBehavior`, 'Authored affordance returnBehavior is required'));
    if (affordance.closure && !AFFORDANCE_CLOSURES.has(affordance.closure)) errors.push(issue(`${affordancePath}.closure`, `Unsupported affordance closure: ${affordance.closure}`));
    if (affordance.returnBehavior && !AFFORDANCE_RETURNS.has(affordance.returnBehavior)) errors.push(issue(`${affordancePath}.returnBehavior`, `Unsupported affordance returnBehavior: ${affordance.returnBehavior}`));
  });
  scene.actions.forEach((action, index) => {
    const actionPath = `${path}.actions[${index}]`;
    if (strict && action.affordanceId && !affordances.has(action.affordanceId)) errors.push(issue(`${actionPath}.affordanceId`, 'Action must reference an established affordance'));
    if (action.replay && !REPLAY_POLICIES.has(action.replay)) errors.push(issue(`${actionPath}.replay`, `Unsupported replay policy: ${action.replay}`));
    if (action.replay === 'repeatable' && strict && (!action.resurface || action.resurface.whilePlausible !== true || !Number.isInteger(action.resurface.maxAuthoredRevisits) || action.resurface.maxAuthoredRevisits < 1)) {
      errors.push(issue(`${actionPath}.resurface`, 'Repeatable authored actions require bounded whilePlausible resurfacing'));
    }
  });
}

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
  validateAdaptiveDifficulty(raw.adaptiveDifficulty, errors, warnings);
  const agencyAudit = auditAgencyQuality(raw, { strict: raw.publicationMode === 'new-book' || raw.agencyPolicy && raw.agencyPolicy.strict === true });
  if (agencyAudit.errors.length) errors.push(...agencyAudit.errors);
  warnings.push(...agencyAudit.warnings);
  const dramaticAudit = auditDramaticContract(raw, { strict: raw.publicationMode === 'new-book' });
  if (dramaticAudit.errors.length) errors.push(...dramaticAudit.errors);
  warnings.push(...dramaticAudit.warnings);

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
    validateSceneAffordances(scene, errors, path);
    validateEstablishedTargets(scene, errors, path, raw.publicationMode === 'new-book' || raw.agencyPolicy && raw.agencyPolicy.strict === true);
    // Apply the stateful-space authoring gate to manifests that opt into the
    // explicit affordance contract. Transitional manifests remain compilable
    // until their ingestion artifacts are regenerated.
    validateAuthoringQuality(scene, errors, path, (raw.publicationMode === 'new-book' || (raw.agencyPolicy && raw.agencyPolicy.strict === true)) && scene.affordances.length > 0);
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
      validateThreadRequirements(action.availability && action.availability.requires, scene.threads, errors, `${actionPath}.availability.requires`);
      validateThreadRequirements(action.requires, scene.threads, errors, `${actionPath}.requires`);
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
    adaptiveDifficulty: clone(raw.adaptiveDifficulty || null),
    publicationMode: raw.publicationMode || 'compatibility',
    agencyPolicy: clone(raw.agencyPolicy || {}),
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
    establishedEntities: clone(raw.establishedEntities || []),
    threads: clone(raw.threads || []),
    affordances: clone(raw.affordances || []),
    openingNarration: raw.openingNarration || raw.description || '',
    actions,
    completion: clone(raw.completion || {}),
    agency: clone(raw.agency || raw.agencyPolicy || {}),
    dramaturgy: clone(raw.dramaturgy || {})
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
    adaptiveLeverId: action.adaptiveLeverId || null,
    affordanceId: action.affordanceId || null,
    affordanceKind: action.affordanceKind || null,
    persistent: action.persistent === true,
    threadId: action.threadId || null,
    threadEffects: clone(action.threadEffects || {}),
    resurface: clone(action.resurface || null),
    examinationVariants: clone(action.examinationVariants || []),
    role: action.role || action.actionRole || null,
    sourceClass: action.sourceClass || null,
    consequenceSummary: action.consequenceSummary || '',
    laterBeat: action.laterBeat || null,
    dramaturgy: clone(action.dramaturgy || action.beat || {}),
    targets: clone(action.targets || []),
    keywords: clone(action.keywords || []),
    availability: clone(action.availability || {}),
    requires: clone(action.requires || []),
    resolution,
    replay: action.replay || 'consumable'
  };
}


function validateEstablishedTargets(scene, errors, path, strict) {
  const declared = new Set();
  asArray(scene.establishedEntities).forEach((entity, index) => {
    const id = typeof entity === 'string' ? entity : entity && (entity.entityId || entity.id);
    if (!id) errors.push(issue(`${path}.establishedEntities[${index}]`, 'Established entity requires an id'));
    else if (declared.has(id)) errors.push(issue(`${path}.establishedEntities[${index}]`, `Duplicate established entity: ${id}`));
    else declared.add(id);
  });
  if (!strict) return;
  const locationId = scene.location && (scene.location.id || scene.location.locationId);
  if (locationId) declared.add(locationId);
  scene.actions.forEach((action, index) => {
    asArray(action.targets).forEach((target, targetIndex) => {
      const id = typeof target === 'string' ? target : target && (target.entityId || target.id);
      if (!id) errors.push(issue(`${path}.actions[${index}].targets[${targetIndex}]`, 'Action target requires an id'));
      else if (!declared.has(id)) errors.push(issue(`${path}.actions[${index}].targets[${targetIndex}]`, `Action target is not established in the scene: ${id}`));
    });
  });
}

function validateSceneAffordances(scene, errors, path) {
  const threadIds = new Set();
  asArray(scene.threads).forEach((thread, index) => {
    if (!thread || !thread.threadId || threadIds.has(thread.threadId)) {
      errors.push(issue(`${path}.threads[${index}]`, 'Unique threadId is required'));
      return;
    }
    threadIds.add(thread.threadId);
    if (thread.status && !THREAD_STATUSES.has(thread.status)) errors.push(issue(`${path}.threads[${index}].status`, `Unsupported thread status: ${thread.status}`));
  });
  const affordanceIds = new Set();
  asArray(scene.affordances).forEach((affordance, index) => {
    const affordancePath = `${path}.affordances[${index}]`;
    if (!affordance || !affordance.affordanceId || affordanceIds.has(affordance.affordanceId)) errors.push(issue(affordancePath, 'Unique affordanceId is required'));
    else affordanceIds.add(affordance.affordanceId);
    if (affordance && affordance.kind && !AFFORDANCE_KINDS.has(affordance.kind)) errors.push(issue(`${affordancePath}.kind`, `Unsupported affordance kind: ${affordance.kind}`));
    if (affordance && affordance.threadId && !threadIds.has(affordance.threadId)) errors.push(issue(`${affordancePath}.threadId`, `Unknown thread: ${affordance.threadId}`));
  });
  scene.actions.forEach((action, index) => {
    if (action.affordanceId && !affordanceIds.has(action.affordanceId)) errors.push(issue(`${path}.actions[${index}].affordanceId`, `Unknown affordance: ${action.affordanceId}`));
    if (action.threadId && !threadIds.has(action.threadId)) errors.push(issue(`${path}.actions[${index}].threadId`, `Unknown thread: ${action.threadId}`));
    if (action.affordanceKind && !AFFORDANCE_KINDS.has(action.affordanceKind)) errors.push(issue(`${path}.actions[${index}].affordanceKind`, `Unsupported affordance kind: ${action.affordanceKind}`));
  });
}

function validateAdaptiveDifficulty(policy, errors, warnings) {
  if (policy == null) return;
  const path = 'adaptiveDifficulty';
  if (typeof policy !== 'object' || Array.isArray(policy)) return errors.push(issue(path, 'Adaptive difficulty must be an object'));
  if (policy.schemaVersion !== '1.0') errors.push(issue(`${path}.schemaVersion`, 'Expected adaptive difficulty schemaVersion 1.0'));
  if (typeof policy.enabled !== 'boolean') errors.push(issue(`${path}.enabled`, 'Adaptive difficulty enabled must be boolean'));
  const bounds = policy.offsetBounds;
  if (!bounds || !Number.isInteger(bounds.min) || !Number.isInteger(bounds.max) || bounds.min < -2 || bounds.max > 2 || bounds.min > bounds.max) {
    errors.push(issue(`${path}.offsetBounds`, 'Offset bounds must be integers within [-2,2] with min <= max'));
  }
  const target = policy.targetCapability;
  if (!target || !Number.isFinite(target.score) || !Number.isFinite(target.bandWidth) || target.bandWidth <= 0) errors.push(issue(`${path}.targetCapability`, 'Target capability score and positive band width are required'));
  const weights = policy.weights;
  if (!weights || !Number.isFinite(weights.capability) || !Number.isFinite(weights.preference) || weights.capability < 0 || weights.preference < 0) errors.push(issue(`${path}.weights`, 'Non-negative capability and preference weights are required'));
  const leverIds = new Set();
  (policy.levers || []).forEach((lever, index) => {
    const leverPath = `${path}.levers[${index}]`;
    if (!lever || !lever.leverId || leverIds.has(lever.leverId)) errors.push(issue(leverPath, 'Unique leverId is required'));
    else leverIds.add(lever.leverId);
    if (!lever || !lever.kind || !lever.byOffset || typeof lever.byOffset !== 'object' || Array.isArray(lever.byOffset)) {
      if (!lever || !lever.kind) errors.push(issue(leverPath, 'Lever kind is required'));
      if (!lever || !lever.byOffset || typeof lever.byOffset !== 'object' || Array.isArray(lever.byOffset)) errors.push(issue(`${leverPath}.byOffset`, 'Offset mappings are required'));
    }
    if (lever && lever.allowedDelta && (lever.allowedDelta.min > lever.allowedDelta.max)) errors.push(issue(`${leverPath}.allowedDelta`, 'Allowed delta range is invalid'));
    if (lever && lever.byOffset && typeof lever.byOffset === 'object') Object.keys(lever.byOffset).forEach(offset => {
      if (!['-2', '-1', '0', '1', '2'].includes(offset)) errors.push(issue(`${leverPath}.byOffset.${offset}`, 'Unknown adaptive offset'));
    });
  });
  if (policy.enabled && (!policy.disclosure || policy.disclosure.adaptiveChallenge !== true)) warnings.push(issue(`${path}.disclosure`, 'Enabled adaptive difficulty should disclose adaptive challenge'));
}

function validateThreadRequirements(requirements, threads, errors, path) {
  const threadIds = new Set(asArray(threads).map(thread => thread && thread.threadId));
  asArray(requirements).forEach((req, i) => {
    if (req && req.kind === 'thread' && !threadIds.has(req.id)) errors.push(issue(`${path}[${i}]`, `Unknown thread: ${req.id}`));
  });
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
    if (req.kind === 'thread' && (!req.id || typeof req.id !== 'string')) errors.push(issue(`${path}[${i}]`, 'Thread requirement ID is required'));
    if (req.kind === 'action' && actionIds.size && !actionIds.has(req.id)) {
      // Cross-action references may point forward; defer this check to runtime/compiler pass.
    }
  });
}


// `compileManifest` is the boundary name; `compileAdventure` remains an
// explicit compatibility alias for existing callers during extraction.
const compileManifest = compileAdventure;

module.exports = { ACTION_TYPES, AFFORDANCE_KINDS, THREAD_STATUSES, compileManifest, compileAdventure };
