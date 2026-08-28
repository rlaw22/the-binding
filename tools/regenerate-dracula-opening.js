'use strict';

/**
 * Build a versioned Dracula opening candidate from an inspectable dramatic beat map.
 * This deliberately does not overwrite the existing full-book manifest.
 */
const fs = require('fs');
const path = require('path');
const { compileAdventure, auditIngestedContent } = require('../src/storyline-v2/domain');

const root = path.join(__dirname, '..');
const base = path.join(root, 'content/ingestion/dracula-1897');
const inputPath = path.join(base, 'chapters-01-04', 'dramatic-beat-map.json');
const outDir = path.join(base, 'candidates', 'dracula-opening-dramatic-002');
const beats = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

function actionType(role) {
  if (role === 'exit') return 'exit';
  if (role === 'commitment') return 'threat';
  return 'exploration';
}

const SOURCE_CLASSES = new Set(['canonical_event', 'decision', 'discovery', 'atmosphere', 'connective_tissue', 'non_playable']);

function sourceClassFor(opportunity) {
  if (!SOURCE_CLASSES.has(opportunity.sourceClass)) {
    throw new Error(`Opportunity ${opportunity.id} requires a supported source-authored sourceClass`);
  }
  return opportunity.sourceClass;
}

function affordanceFrom(opportunity) {
  const kindByRole = { discovery: 'discovery', preparation: 'contextual', alternative: 'contextual', exit: 'exit', commitment: 'state_dependent', atmosphere: 'atmosphere' };
  return {
    affordanceId: opportunity.id,
    kind: kindByRole[opportunity.role] || 'contextual',
    threadId: `thread_${opportunity.id}`,
    persistent: opportunity.replay === 'repeatable',
    closure: opportunity.role === 'exit' ? 'movement_or_commitment' : 'authored_resolution',
    returnBehavior: opportunity.replay === 'repeatable' ? 'resurface_while_plausible' : 'consumed_or_transformed'
  };
}

function actionFrom(sceneId, opportunity) {
  const actionId = `${sceneId}__${opportunity.id}`;
  const setFlags = opportunity.flag ? { [opportunity.flag]: true } : undefined;
  const resolution = {
    resultType: opportunity.role === 'exit' ? 'exit' : opportunity.role === 'commitment' ? 'threat' : opportunity.role,
    narration: opportunity.reaction,
    ...(setFlags ? { setFlags } : {}),
    ...(opportunity.item ? { addItems: [opportunity.item] } : {})
  };
  return {
    actionId,
    contentId: actionId,
    type: actionType(opportunity.role),
    category: opportunity.role,
    label: opportunity.approach,
    shortLabel: opportunity.approach,
    keywords: opportunity.approach.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean),
    role: opportunity.role,
    sourceClass: sourceClassFor(opportunity),
    replay: opportunity.replay,
    affordanceId: opportunity.id,
    affordanceKind: affordanceFrom(opportunity).kind,
    persistent: affordanceFrom(opportunity).persistent,
    threadId: `thread_${opportunity.id}`,
    threadEffects: { ...(opportunity.role === 'exit' ? { resolve: true } : { activate: true }) },
    resurface: opportunity.replay === 'repeatable' ? { whilePlausible: true, maxAuthoredRevisits: 2 } : null,
    examinationVariants: opportunity.examinationVariants || [],
    ...(opportunity.routeTo ? { routeTo: opportunity.routeTo } : {}),
    dramaturgy: {
      approach: opportunity.approach,
      stakes: opportunity.stakes,
      reaction: opportunity.reaction,
      changedSituation: opportunity.changedSituation,
      nextObjective: opportunity.nextObjective,
      effectSummary: opportunity.flag ? `Sets authored flag ${opportunity.flag}.` : 'Changes the immediate dramatic situation without erasing the canonical route.',
      ...((opportunity.convergence || opportunity.routeTo) ? { convergence: opportunity.convergence || opportunity.routeTo } : {})
    },
    resolution
  };
}

const scenes = beats.scenes.map((beat, index) => {
  const sceneId = `dracula_opening_${String(index + 1).padStart(2, '0')}`;
  return {
    sceneId,
    actId: 'act_1',
    name: beat.id.replace(/^beat_\d+_/, '').split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' '),
    location: { id: beat.id, name: beat.id.replace(/^beat_\d+_/, '').split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ') },
    setting: beat.situation,
    presentNpcs: beat.presentActors.map(actor => actor.id),
    openingNarration: `${beat.situation}\n\n${beat.pressure}`,
    threads: beat.opportunities.map(opportunity => ({ threadId: `thread_${opportunity.id}`, status: 'dormant', sourceOpportunityId: opportunity.id })),
    affordances: beat.opportunities.map(affordanceFrom),
    dramaturgy: {
      situation: beat.situation,
      immediateObjective: beat.immediateObjective,
      pressure: beat.pressure,
      presentActors: beat.presentActors,
      nextQuestion: beat.nextQuestion
    },
    sourceTrace: { anchors: beat.sourceAnchors, beatId: beat.id },
    agency: { optionalActionsRequired: false, authoredAlternatives: true },
    sourceClassCounts: beat.opportunities.reduce((counts, opportunity) => {
      const sourceClass = sourceClassFor(opportunity);
      counts[sourceClass] = (counts[sourceClass] || 0) + 1;
      return counts;
    }, {}),
    actions: beat.opportunities.map(opportunity => actionFrom(sceneId, opportunity))
  };
});

const sceneIdByBeat = Object.fromEntries(beats.scenes.map((beat, index) => [beat.id, `dracula_opening_${String(index + 1).padStart(2, '0')}`]));
const graph = scenes.flatMap(scene => {
  const exits = scene.actions.filter(action => action.role === 'exit' || action.role === 'commitment');
  return exits.filter(exit => exit.routeTo).map(exit => {
    const target = exit.routeTo;
    if (!sceneIdByBeat[target]) throw new Error(`Exit ${exit.actionId} has no valid authored routeTo target`);
    return { edgeId: `${exit.actionId}_to_${sceneIdByBeat[target]}`, from: scene.sceneId, to: sceneIdByBeat[target], trigger: { actionId: exit.actionId } };
  });
});

const manifest = {
  schemaVersion: '2.0',
  adventureId: 'dracula-opening-dramatic-002',
  title: 'Dracula: The Threshold East — Branching Opening Candidate',
  publicationMode: 'new-book',
  source: {
    title: 'Dracula', author: 'Bram Stoker', sourceId: beats.sourceId,
    generation: beats.generation, parentCandidate: 'dracula-opening-dramatic-001'
  },
  narrativePolicy: { sourceFidelity: 'high', playerAgency: 'guided', endingPolicy: 'authored', allowOptionalBranches: true },
  agencyPolicy: { strict: true },
  ingestionPolicy: { sourceClassification: 'required' },
  prologue: { text: 'A solicitor travels east on business, carrying a letter from a count he has never met.', startingSceneId: scenes[0].sceneId },
  classes: ['fighter', 'cleric', 'mage', 'rogue'],
  items: { protective_crucifix: { itemId: 'protective_crucifix', name: 'Protective crucifix' }, iron_lantern: { itemId: 'iron_lantern', name: 'Iron lantern' } },
  threats: {}, scenes, graph: { entry: scenes[0].sceneId, edges: graph }, endings: {}
};

const compiled = compileAdventure(manifest);
const qualityAudit = auditIngestedContent(manifest, { strict: true });
if (qualityAudit.errors.length) {
  throw new Error(`Opening ingestion quality gate failed: ${qualityAudit.errors.map(error => error.message).join('; ')}`);
}
const summary = {
  schemaVersion: '1.0', candidateId: manifest.adventureId, sourceId: beats.sourceId,
  sceneCount: scenes.length,
  actionCount: scenes.reduce((total, scene) => total + scene.actions.length, 0),
  edgeCount: graph.length,
  nonExitActionCounts: scenes.map(scene => scene.actions.filter(action => action.type !== 'exit').length),
  rolesByScene: scenes.map(scene => scene.actions.map(action => action.role)),
  warnings: compiled.warnings,
  classificationCounts: qualityAudit.report.classificationCounts,
  status: 'candidate; not published; human narrative review required'
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'compiled-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'source-beat-map.json'), `${JSON.stringify(beats, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'authoring-packet.json'), `${JSON.stringify({ schemaVersion: '1.0', sourceId: beats.sourceId, scenes: scenes.map(scene => ({ sceneId: scene.sceneId, sourceTrace: scene.sourceTrace, threads: scene.threads, affordances: scene.affordances })) }, null, 2)}\n`);
console.log(`Generated ${manifest.adventureId}: ${summary.sceneCount} scenes, ${summary.actionCount} actions, ${summary.edgeCount} edges`);
