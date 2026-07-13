/**
 * Adventure Engine — Loads and manages adventures.
 * 
 * Abstracts adventure loading so the DM service doesn't care
 * if the adventure is Dracula, Frankenstein, Holmes, or a Campaign Mode session.
 */

const { DraculaAdventure, getScene: draculaGetScene, getStartScene: draculaGetStartScene, getDMGuidance: draculaGetDMGuidance, getAdventureOutline: draculaGetAdventureOutline } = require('./dracula');
const { FrankensteinAdventure, getScene: frankGetScene, getStartScene: frankGetStartScene, getDMGuidance: frankGetDMGuidance, getAdventureOutline: frankGetAdventureOutline } = require('./frankenstein');
const { HolmesAdventure, getScene: holmesGetScene, getStartScene: holmesGetStartScene, getDMGuidance: holmesGetDMGuidance, getAdventureOutline: holmesGetAdventureOutline } = require('./holmes');

// Registry of available adventures
const adventureRegistry = {
  dracula: DraculaAdventure,
  frankenstein: FrankensteinAdventure,
  holmes: HolmesAdventure
};

// Per-adventure helper lookup — maps adventureId → { getScene, getDMGuidance, getAdventureOutline }
const adventureHelpers = {
  dracula:      { getScene: draculaGetScene,      getDMGuidance: draculaGetDMGuidance,      getAdventureOutline: draculaGetAdventureOutline },
  frankenstein: { getScene: frankGetScene,         getDMGuidance: frankGetDMGuidance,         getAdventureOutline: frankGetAdventureOutline },
  holmes:       { getScene: holmesGetScene,        getDMGuidance: holmesGetDMGuidance,        getAdventureOutline: holmesGetAdventureOutline }
};

/**
 * Get an adventure by ID.
 */
function getAdventure(adventureId) {
  return adventureRegistry[adventureId] || null;
}

/**
 * List all available adventures.
 */
function listAdventures() {
  return Object.values(adventureRegistry).map(a => ({
    id: a.id,
    name: a.name,
    author: a.author,
    description: a.description,
    difficulty: a.difficulty,
    estimatedLength: a.estimatedLength
  }));
}

/**
 * Get the starting scene for an adventure.
 */
function getAdventureStart(adventureId) {
  const adventure = getAdventure(adventureId);
  if (!adventure) return null;
  const helpers = adventureHelpers[adventureId];
  const startScene = helpers.getScene(adventure.startScene);
  return {
    scene: startScene,
    dmGuidance: helpers.getDMGuidance(adventure.startScene),
    adventureOutline: helpers.getAdventureOutline()
  };
}

/**
 * Check if scene transition is allowed based on flags.
 */
function canTransitionTo(adventureId, sceneId, flags) {
  const adventure = getAdventure(adventureId);
  if (!adventure) return false;
  const helpers = adventureHelpers[adventureId];
  const scene = helpers.getScene(sceneId);
  if (!scene) return false;
  // Check all required flags
  return (scene.flags_required || []).every(f => flags[f]);
}

/**
 * Get available scenes from current position.
 */
function getAvailableScenes(adventureId, currentSceneId, flags) {
  const adventure = getAdventure(adventureId);
  if (!adventure) return [];
  const currentIndex = adventure.scenes.findIndex(s => s.id === currentSceneId);
  if (currentIndex < 0) return [];
  // Only next scene is available (linear backbone)
  const next = adventure.scenes[currentIndex + 1];
  if (!next) return [];
  if (canTransitionTo(adventureId, next.id, flags)) {
    return [next];
  }
  return [];
}

/**
 * Adventure-aware getScene — resolves the right adventure from sceneId prefix.
 * Scene IDs follow the pattern: scene_00, scene_01, etc.
 * For multi-adventure, callers should use getSceneForAdventure() instead.
 */
function getScene(sceneId) {
  // Legacy fallback — tries all adventures
  return draculaGetScene(sceneId) || frankGetScene(sceneId) || holmesGetScene(sceneId);
}

/**
 * Adventure-aware getDMGuidance.
 */
function getDMGuidance(sceneId) {
  return draculaGetDMGuidance(sceneId) || frankGetDMGuidance(sceneId) || holmesGetDMGuidance(sceneId);
}

/**
 * Adventure-aware getAdventureOutline — returns outline for all adventures.
 */
function getAdventureOutline(adventureId) {
  if (adventureId && adventureHelpers[adventureId]) {
    return adventureHelpers[adventureId].getAdventureOutline();
  }
  // Default: return all adventure outlines
  return Object.entries(adventureHelpers).map(([id, h]) => {
    const adv = adventureRegistry[id];
    return `=== ${adv.name} ===\n${h.getAdventureOutline()}`;
  }).join('\n\n');
}

/**
 * Get helpers for a specific adventure.
 */
function getAdventureHelpers(adventureId) {
  return adventureHelpers[adventureId] || null;
}

module.exports = {
  getAdventure,
  listAdventures,
  getAdventureStart,
  canTransitionTo,
  getAvailableScenes,
  getScene,
  getDMGuidance,
  getAdventureOutline,
  getAdventureHelpers
};
