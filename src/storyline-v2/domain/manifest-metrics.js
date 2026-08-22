'use strict';

const { asArray } = require('./collections');

const MEANINGFUL_TYPES = new Set([
  'exploration', 'collectible', 'class', 'threat', 'bad_choice', 'exit', 'recovery'
]);
const WORDS_PER_MINUTE = 200;
const ACTION_MINUTES = 1.5;

function countWords(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function roundMinutes(value) {
  return Math.max(0, Math.round(value * 10) / 10);
}

function sceneReadingMinutes(scene) {
  return roundMinutes((countWords(scene.setting) + countWords(scene.openingNarration)) / WORDS_PER_MINUTE);
}

function actionMinutes(action) {
  return MEANINGFUL_TYPES.has(action.type) ? ACTION_MINUTES : 0;
}

function buildGraphRoutes(raw, scenes) {
  const sceneMap = Object.fromEntries(scenes.map(scene => [scene.sceneId, scene]));
  const edges = asArray(raw.graph && raw.graph.edges).filter(edge => edge && sceneMap[edge.from] && sceneMap[edge.to]);
  const outgoing = {};
  edges.forEach(edge => { (outgoing[edge.from] ||= []).push(edge); });
  const entry = raw.graph && raw.graph.entry || (raw.prologue && raw.prologue.startingSceneId);
  const actionMap = Object.fromEntries(scenes.flatMap(scene => scene.actions.map(action => [action.actionId, action])));
  const routes = [];
  const maxDepth = Math.max(1, scenes.length + 1);

  function visit(sceneId, minutes, sceneIds, edgeIds) {
    const scene = sceneMap[sceneId];
    if (!scene || sceneIds.length > maxDepth) return;
    const next = (outgoing[sceneId] || []).filter(edge => !sceneIds.includes(edge.to));
    const sceneMinutes = sceneReadingMinutes(scene);
    if (!next.length) {
      routes.push({
        minutes: roundMinutes(minutes + sceneMinutes),
        sceneCount: sceneIds.length,
        edgeCount: edgeIds.length,
        terminal: Boolean(scene.completion && (scene.completion.terminal || scene.completion.endingId))
      });
      return;
    }
    next.forEach(edge => {
      const action = actionMap[edge.trigger && edge.trigger.actionId];
      visit(edge.to, minutes + sceneMinutes + actionMinutes(action || {}), [...sceneIds, edge.to], [...edgeIds, edge.edgeId]);
    });
  }

  if (entry && sceneMap[entry]) visit(entry, 0, [entry], []);
  return routes;
}

function estimateManifestMetrics(raw, normalizedScenes) {
  const scenes = asArray(normalizedScenes);
  const actions = scenes.flatMap(scene => asArray(scene.actions));
  const authoredText = [];
  scenes.forEach(scene => {
    authoredText.push(scene.setting, scene.openingNarration);
    scene.actions.forEach(action => {
      authoredText.push(action.subtitle, action.resolution && action.resolution.narration);
    });
  });

  const wordCount = authoredText.reduce((total, text) => total + countWords(text), 0);
  const meaningfulActions = actions.filter(action => MEANINGFUL_TYPES.has(action.type));
  const optionalDiscoveryCount = actions.filter(action => {
    const result = action.resolution || {};
    return Array.isArray(result.discover) && result.discover.length > 0;
  }).length;
  const readingMinutes = roundMinutes(wordCount / WORDS_PER_MINUTE);
  const interactionMinutes = roundMinutes(meaningfulActions.length * ACTION_MINUTES);
  const routes = buildGraphRoutes(raw, scenes);
  const routeMinutes = routes.map(route => route.minutes);
  const shortestRouteMinutes = routeMinutes.length ? Math.min(...routeMinutes) : 0;
  const longestRouteMinutes = routeMinutes.length ? Math.max(...routeMinutes) : 0;
  const estimated = raw.estimatedDuration || {};
  const typicalRouteMinutes = estimated.typicalRouteMinutes != null
    ? estimated.typicalRouteMinutes
    : routeMinutes.length
      ? roundMinutes((shortestRouteMinutes + longestRouteMinutes) / 2)
      : Math.max(1, roundMinutes(readingMinutes + interactionMinutes));
  const fullExplorationMinutes = estimated.fullExplorationMinutes != null
    ? estimated.fullExplorationMinutes
    : Math.max(typicalRouteMinutes, roundMinutes(readingMinutes + actions.length * ACTION_MINUTES));
  const criticalPathMinutes = estimated.criticalPathMinutes != null
    ? estimated.criticalPathMinutes
    : (routes.length ? shortestRouteMinutes : typicalRouteMinutes);
  const replayRangeMinutes = Array.isArray(estimated.replayRangeMinutes)
    ? estimated.replayRangeMinutes.slice()
    : [Math.max(1, shortestRouteMinutes || roundMinutes(readingMinutes)), Math.max(typicalRouteMinutes, fullExplorationMinutes)];

  return {
    estimatedDuration: {
      criticalPathMinutes,
      shortestRouteMinutes: estimated.shortestRouteMinutes != null ? estimated.shortestRouteMinutes : shortestRouteMinutes || criticalPathMinutes,
      typicalRouteMinutes,
      longestRouteMinutes: estimated.longestRouteMinutes != null ? estimated.longestRouteMinutes : longestRouteMinutes || fullExplorationMinutes,
      fullExplorationMinutes,
      replayRangeMinutes,
      readingMinutes,
      interactionMinutes,
      routeCount: routes.length,
      basis: estimated.basis || 'compiler estimate; validate with simulated routes and human playtests'
    },
    contentScale: {
      wordCount,
      runtimeSceneCount: scenes.length,
      meaningfulDecisionCount: meaningfulActions.length,
      optionalDiscoveryCount,
      actionCount: actions.length
    },
    routeAnalysis: routes
  };
}

function auditManifestQuality(raw, metrics) {
  const warnings = [];
  const duration = metrics.estimatedDuration;
  const scale = metrics.contentScale;
  const policy = raw.qualityGates || raw.durationPolicy || {};
  const target = policy.durationMinutes || policy.targetDuration || {};
  const warn = (code, message) => warnings.push({ code, message });

  if (target.minCriticalPathMinutes != null && duration.criticalPathMinutes < target.minCriticalPathMinutes) {
    warn('CRITICAL_PATH_TOO_SHORT', `Critical path is ${duration.criticalPathMinutes} minutes; target minimum is ${target.minCriticalPathMinutes}`);
  }
  if (target.maxTypicalRouteMinutes != null && duration.typicalRouteMinutes > target.maxTypicalRouteMinutes) {
    warn('TYPICAL_ROUTE_TOO_LONG', `Typical route is ${duration.typicalRouteMinutes} minutes; target maximum is ${target.maxTypicalRouteMinutes}`);
  }
  if (target.maxLongestRouteMinutes != null && duration.longestRouteMinutes > target.maxLongestRouteMinutes) {
    warn('LONGEST_ROUTE_TOO_LONG', `Longest route is ${duration.longestRouteMinutes} minutes; target maximum is ${target.maxLongestRouteMinutes}`);
  }
  if (scale.runtimeSceneCount > 0 && scale.meaningfulDecisionCount === 0) {
    warn('NO_MEANINGFUL_DECISIONS', 'Manifest contains scenes but no meaningful authored decisions');
  }
  const labels = new Set();
  const duplicateLabels = new Set();
  asArray(raw.scenes).flatMap(scene => asArray(scene && scene.actions)).forEach(action => {
    const label = String(action && (action.label || action.name || '')).trim().toLowerCase();
    if (label && labels.has(label)) duplicateLabels.add(label);
    if (label) labels.add(label);
  });
  if (duplicateLabels.size) warn('REPEATED_ACTION_LABELS', `${duplicateLabels.size} action label(s) repeat across the manifest`);
  return warnings;
}

module.exports = { countWords, estimateManifestMetrics, auditManifestQuality, buildGraphRoutes };