'use strict';

/**
 * Legacy Dracula source -> Storyline v2 manifest adapter.
 *
 * This is intentionally a data migration boundary. The v2 compiler and
 * resolver do not know about legacy fields; this module is the only place
 * that translates them while Dracula is being reprocessed.
 */

const legacyDracula = require('../adventure/dracula');
const { compileAdventure } = require('./index');

function values(value) {
  return Array.isArray(value) ? value : Object.values(value || {});
}

function sourceScenes() {
  // DraculaAdventure.sceneManifests is already merged with acts 2-5 by the
  // adventure loader; do not append the per-act modules a second time.
  const allScenes = values(legacyDracula.DraculaAdventure.sceneManifests);
  return allScenes.sort((a, b) =>
    String(a.sceneId).localeCompare(String(b.sceneId), undefined, { numeric: true }));
}

function itemIdFor(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function actionFromContent(content, sceneId) {
  const itemId = content.itemGained ? itemIdFor(content.itemGained) : null;
  const stableId = `${sceneId}__${content.id}`;
  return {
    actionId: stableId,
    contentId: stableId,
    type: itemId ? 'collectible' : 'exploration',
    category: itemId ? 'collectible' : 'exploration',
    label: content.label,
    shortLabel: content.label,
    keywords: content.keywords || [],
    resolution: {
      resultType: itemId ? 'acquisition' : (content.discovery ? 'discovery' : 'atmosphere'),
      narration: content.discovery || `You ${String(content.label || '').toLowerCase()}.`,
      discover: content.discovery ? [stableId] : [],
      addItems: itemId ? [itemId] : []
    }
  };
}

function actionFromBadChoice(scene) {
  const badChoice = scene.storyMode && scene.storyMode.badChoice;
  if (!badChoice) return null;
  return {
    actionId: `${scene.sceneId}__${badChoice.id}`,
    type: 'bad_choice',
    category: 'risk',
    label: badChoice.label,
    shortLabel: badChoice.label,
    resolution: {
      resultType: 'bad_choice',
      narration: badChoice.consequence || badChoice.label,
      coins: -(badChoice.coinCost || 0),
      setFlags: badChoice.flagSet || {}
    }
  };
}

function classAction(sceneId, classId, label, narration, flagId) {
  return {
    actionId: `${sceneId}__class__${classId}`,
    contentId: `${sceneId}__class__${classId}`,
    type: 'class',
    category: 'class',
    label,
    shortLabel: label,
    availability: { classes: [classId] },
    keywords: [classId, label],
    resolution: {
      resultType: 'class_action',
      narration,
      setFlags: { [flagId]: true }
    }
  };
}

function actionFromExit(scene) {
  if (!scene.exitAction) return null;
  return {
    actionId: `${scene.sceneId}__${scene.exitAction}`,
    type: 'exit',
    category: 'exit',
    label: scene.exitLabel || scene.exitAction,
    shortLabel: scene.exitLabel || scene.exitAction,
    resolution: {
      resultType: 'exit',
      narration: scene.hardExitNarration || scene.exitLabel || scene.exitAction
    }
  };
}

function sceneFromLegacy(scene, index) {
  const actions = (scene.content || []).map(content => actionFromContent(content, scene.sceneId));
  if (index === 0) {
    actions.push(classAction(scene.sceneId, 'cleric', 'Offer a prayer of protection', 'You murmur a protective prayer over the inn, and the room seems to settle around you.', 'inn_blessed'));
    actions.push(classAction(scene.sceneId, 'scholar', 'Recall the old lore of the Carpathians', 'The scattered details align: the warnings, the wolves, and the name Dracula form a pattern you cannot ignore.', 'carpathian_lore_recalled'));
    actions.push(classAction(scene.sceneId, 'rogue', 'Quietly inspect the coach arrangements', 'You study the stable yard and exits without drawing attention. The coach is being prepared, but someone is watching from the dark.', 'coach_route_checked'));
    actions.push(classAction(scene.sceneId, 'fighter', 'Prepare for the road ahead', 'You check your weapon, your footing, and the fading light. Whatever waits beyond Bistritz will not find you helpless.', 'road_prepared'));
  }
  const badChoice = actionFromBadChoice(scene);
  const exit = actionFromExit(scene);
  if (badChoice) actions.push(badChoice);
  if (exit) actions.push(exit);
  return {
    sceneId: scene.sceneId,
    actId: `act_${Math.floor(index / 5) + 1}`,
    name: scene.sceneName || scene.sceneId,
    location: { id: scene.sceneId, name: scene.sceneName || scene.sceneId },
    setting: scene.description || '',
    presentNpcs: (scene.initialFacts && scene.initialFacts.metNPCs) || [],
    openingNarration: scene.description || '',
    actions,
    completion: { source: 'legacy-adapter' }
  };
}

function buildDraculaManifest() {
  const legacyScenes = sourceScenes();
  const scenes = legacyScenes.map(sceneFromLegacy);
  const items = {};
  scenes.forEach(scene => scene.actions.forEach(action => {
    (action.resolution.addItems || []).forEach(id => { items[id] = { itemId: id, name: id.replace(/_/g, ' ') }; });
  }));
  const edges = scenes.slice(0, -1).map((scene, index) => ({
    edgeId: `${scene.sceneId}_to_${scenes[index + 1].sceneId}`,
    from: scene.sceneId,
    to: scenes[index + 1].sceneId,
    trigger: { actionId: scene.actions.find(action => action.type === 'exit')?.actionId }
  })).filter(edge => edge.trigger.actionId);

  return {
    schemaVersion: '2.0',
    adventureId: 'dracula',
    title: legacyDracula.DraculaAdventure.name || 'Dracula',
    source: { title: 'Dracula', author: legacyDracula.DraculaAdventure.author || 'Bram Stoker', migration: 'legacy-scenes-to-v2' },
    narrativePolicy: { sourceFidelity: 'high', playerAgency: 'guided', endingPolicy: 'authored', allowOptionalBranches: true },
    prologue: { text: legacyDracula.DraculaAdventure.prologue && legacyDracula.DraculaAdventure.prologue.template || '', startingSceneId: scenes[0].sceneId },
    classes: ['fighter', 'cleric', 'mage', 'rogue'],
    items,
    threats: {},
    scenes,
    graph: { entry: scenes[0].sceneId, edges },
    endings: {}
  };
}

function compileDracula() {
  return compileAdventure(buildDraculaManifest());
}

module.exports = { buildDraculaManifest, compileDracula, sourceScenes };
