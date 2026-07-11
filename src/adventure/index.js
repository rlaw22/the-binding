/**
 * Adventure Engine — Loads and manages adventures.
 * 
 * Abstracts adventure loading so the DM service doesn't care
 * if the adventure is Dracula, Treasure Island, or a Campaign Mode session.
 */

const { DraculaAdventure, getScene, getStartScene, getDMGuidance, getAdventureOutline } = require('./dracula');

// Registry of available adventures
const adventureRegistry = {
  dracula: DraculaAdventure
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
  const startScene = getScene(adventure.startScene);
  return {
    scene: startScene,
    dmGuidance: getDMGuidance(adventure.startScene),
    adventureOutline: getAdventureOutline()
  };
}

/**
 * Check if scene transition is allowed based on flags.
 */
function canTransitionTo(adventureId, sceneId, flags) {
  const adventure = getAdventure(adventureId);
  if (!adventure) return false;
  const scene = getScene(sceneId);
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

module.exports = {
  getAdventure,
  listAdventures,
  getAdventureStart,
  canTransitionTo,
  getAvailableScenes,
  getScene,
  getDMGuidance,
  getAdventureOutline
};
