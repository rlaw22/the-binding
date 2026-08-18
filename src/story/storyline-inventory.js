/**
 * Storyline Inventory — narrative collectibles, independent of Campaign inventory.
 *
 * Storyline items are authored props and clues. They are deliberately not
 * equipment slots, consumables, or Campaign catalog entries.
 */

const LEGACY_ALIASES = Object.freeze({
  silver_crucifix: 'crucifix',
  brass_crucifix: 'crucifix'
});

const STORYLINE_ITEMS = Object.freeze({
  crucifix: {
    id: 'crucifix',
    name: 'Brass Crucifix',
    description: 'An old brass crucifix, worn smooth by generations of faithful hands. It grows warm near the undead.',
    type: 'story relic',
    material: 'brass'
  },
  garlic: {
    id: 'garlic',
    name: 'Garlic Bulb',
    description: 'A pungent bundle of garlic, given as protection against the things that hunt after dark.',
    type: 'story item',
    material: 'organic'
  },
  journal: {
    id: 'journal',
    name: "Jonathan Harker's Journal",
    description: 'A leather-bound journal containing crucial observations about Castle Dracula.',
    type: 'story clue',
    material: 'leather and paper'
  }
});

function normalizeStorylineItemId(itemId) {
  if (!itemId || typeof itemId !== 'string') return itemId;
  return LEGACY_ALIASES[itemId] || itemId;
}

function titleFromId(id) {
  return String(id || 'unknown').split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function resolveStorylineItem(item, fallback = {}) {
  const rawId = typeof item === 'string' ? item : (item && item.id);
  const id = normalizeStorylineItemId(rawId);
  if (!id) return null;
  const known = STORYLINE_ITEMS[id] || {};
  return {
    id,
    name: fallback.name || (typeof item === 'object' && item.name) || known.name || titleFromId(id),
    description: fallback.description || (typeof item === 'object' && item.description) || known.description || 'A significant object from the story.',
    type: fallback.type || known.type || 'story item',
    material: fallback.material || known.material || null
  };
}

function ensureStorylineInventory(playerState) {
  if (!playerState) throw new Error('Storyline player state is required');
  if (!Array.isArray(playerState.inventory)) playerState.inventory = [];
  playerState.inventory = [...new Set(playerState.inventory.map(normalizeStorylineItemId))];
  return playerState.inventory;
}

function addStorylineItem(playerState, item) {
  const resolved = resolveStorylineItem(item);
  if (!resolved) return null;
  const inventory = ensureStorylineInventory(playerState);
  if (!inventory.includes(resolved.id)) inventory.push(resolved.id);
  return resolved;
}

function listStorylineItems(playerState) {
  return ensureStorylineInventory(playerState).map(id => resolveStorylineItem(id));
}

function validateStorylineManifest(manifest, source = 'manifest') {
  const errors = [];
  const seen = new Set();
  const content = Array.isArray(manifest && manifest.contentItems)
    ? manifest.contentItems
    : (Array.isArray(manifest && manifest.content) ? manifest.content : []);
  for (const item of content) {
    if (!item || !item.id) errors.push(`${source}: content item is missing an id`);
    else if (seen.has(item.id)) errors.push(`${source}: duplicate content id ${item.id}`);
    else seen.add(item.id);
  }
  const collectible = manifest && manifest.storyMode && manifest.storyMode.collectibleItem;
  if (collectible) {
    if (!collectible.id) errors.push(`${source}: collectibleItem is missing an id`);
    if (!collectible.name && !collectible.label) errors.push(`${source}: collectibleItem ${collectible.id || '(unknown)'} needs name or label`);
  }
  if (manifest && manifest.initialFacts && manifest.initialFacts.items) {
    if (!Array.isArray(manifest.initialFacts.items)) errors.push(`${source}: initialFacts.items must be an array`);
    else for (const id of manifest.initialFacts.items) if (!id || typeof id !== 'string') errors.push(`${source}: initialFacts contains an invalid item id`);
  }
  return errors;
}

module.exports = {
  STORYLINE_ITEMS,
  LEGACY_ALIASES,
  normalizeStorylineItemId,
  resolveStorylineItem,
  ensureStorylineInventory,
  addStorylineItem,
  listStorylineItems,
  validateStorylineManifest
};
