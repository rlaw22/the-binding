/**
 * Quest Engine — Quest creation, tracking, and completion for Campaign Mode.
 *
 * Generates quests from the world state and theme, tracks objectives,
 * and processes quest updates from the AI DM's structured tags.
 */

const { v4: uuidv4 } = require('uuid');

// Quest templates by theme
const QUEST_TEMPLATES = {
  gothic_horror: [
    { name: 'The Missing Villagers', description: 'Three villagers from Hollow Creek have vanished in the past week. The last one taken was a child.',
      objectives: ['Investigate the village', 'Find线索 about the disappearances', 'Search the Blighted Wood', 'Confront the source'],
      reward: { xp: 500, gold: 50 }, difficulty: 'medium' },
    { name: 'The Abbey\'s Secret', description: 'Father Aldric claims the ruins of St. Aldric\'s Abbey hold a powerful relic. But something guards it.',
      objectives: ['Travel to the abbey ruins', 'Explore the catacombs', 'Retrieve the relic', 'Return to Father Aldric'],
      reward: { xp: 750, gold: 100, item: 'holy_symbol' }, difficulty: 'hard' },
    { name: 'The Hooded Stranger', description: 'A mysterious traveler arrived last night. They ask too many questions and avoid the sunlight.',
      objectives: ['Learn the stranger\'s identity', 'Discover their purpose', 'Decide whether to trust them'],
      reward: { xp: 300, gold: 0 }, difficulty: 'easy' }
  ],
  sword_coast: [
    { name: 'Goblin Trouble', description: 'Goblins have been raiding caravans on the High Road. The Merchant\'s Guild wants them dealt with.',
      objectives: ['Investigate the goblin lair', 'Defeat the goblin boss', 'Recover stolen goods'],
      reward: { xp: 400, gold: 75 }, difficulty: 'medium' },
    { name: 'Depths of Undermountain', description: 'Durnan offers a bounty for anyone who can clear the first level of Undermountain.',
      objectives: ['Enter Undermountain', 'Clear Level 1', 'Return with proof'],
      reward: { xp: 1000, gold: 200 }, difficulty: 'hard' },
    { name: 'The Smuggler\'s Route', description: 'Captain Rolf suspects someone is smuggling contraband through the harbor.',
      objectives: ['Investigate the docks', 'Follow the trail', 'Confront the smugglers'],
      reward: { xp: 350, gold: 60 }, difficulty: 'medium' }
  ],
  noir_mystery: [
    { name: 'The Drowning Case', description: 'A body was pulled from the harbor. The police ruled it accidental. The victim\'s sister disagrees.',
      objectives: ['Examine the body', 'Interview witnesses', 'Follow the money', 'Confront the killer'],
      reward: { xp: 500, gold: 100 }, difficulty: 'medium' },
    { name: 'The Velvet Shadow', description: 'Vera Malone knows more than she lets on. Someone wants her silenced.',
      objectives: ['Protect Vera', 'Learn her secrets', 'Identify the threat'],
      reward: { xp: 400, gold: 50 }, difficulty: 'medium' },
    { name: 'Inspector Cross', description: 'The inspector seems to be working both sides. Evidence is disappearing from the lockup.',
      objectives: ['Gather evidence of corruption', 'Find an ally in the force', 'Expose the truth'],
      reward: { xp: 600, gold: 0 }, difficulty: 'hard' }
  ],
  wilderness_expedition: [
    { name: 'The Lost Temple', description: 'Professor Harlow believes an ancient temple lies beyond the river. No one has returned from that direction.',
      objectives: ['Chart a path through the jungle', 'Cross the river', 'Locate the temple', 'Explore its chambers'],
      reward: { xp: 800, gold: 150 }, difficulty: 'hard' },
    { name: 'The Guardian\'s Test', description: 'Kaya speaks of a spirit guardian that tests all who seek the ruins. Most fail.',
      objectives: ['Seek the guardian', 'Pass the test', 'Gain passage to the inner ruins'],
      reward: { xp: 500, gold: 0, item: 'guardian_token' }, difficulty: 'medium' },
    { name: 'Supply Run', description: 'Trader Voss needs rare herbs from the jungle for his medicines. The plants grow in dangerous territory.',
      objectives: ['Find the herb patches', 'Gather sufficient herbs', 'Return safely'],
      reward: { xp: 200, gold: 40 }, difficulty: 'easy' }
  ]
};

/**
 * Generate starting quests for a new campaign.
 */
function generateStartingQuests(world, theme, count = 2) {
  const templates = QUEST_TEMPLATES[theme] || QUEST_TEMPLATES.gothic_horror;
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map(t => ({
    id: `quest_${uuidv4().slice(0, 8)}`,
    ...t,
    status: 'available',
    currentObjective: 0,
    objectivesCompleted: [],
    startedAt: null,
    completedAt: null
  }));
}

/**
 * Accept a quest — move from available to active.
 */
function acceptQuest(questStore, questId) {
  const idx = questStore.available.findIndex(q => q.id === questId);
  if (idx === -1) return null;
  const quest = questStore.available.splice(idx, 1)[0];
  quest.status = 'active';
  quest.startedAt = Date.now();
  questStore.active.push(quest);
  return quest;
}

/**
 * Process a quest update from the AI DM's structured tags.
 */
function processQuestUpdate(questStore, update) {
  const { questId, status, detail } = update;

  // Find quest in any list
  let quest = questStore.active.find(q => q.id === questId)
    || questStore.available.find(q => q.id === questId);
  if (!quest) {
    // Try matching by name substring
    quest = questStore.active.find(q => questId.includes(q.name.toLowerCase().replace(/\s+/g, '_')))
      || questStore.available.find(q => questId.includes(q.name.toLowerCase().replace(/\s+/g, '_')));
  }
  if (!quest) return null;

  switch (status) {
    case 'completed':
      quest.status = 'completed';
      quest.completedAt = Date.now();
      moveQuest(questStore, quest, 'completed');
      break;
    case 'failed':
      quest.status = 'failed';
      quest.completedAt = Date.now();
      moveQuest(questStore, quest, 'failed');
      break;
    case 'updated':
    case 'progress':
      if (detail) {
        quest.currentObjective = Math.min(
          (quest.currentObjective || 0) + 1,
          (quest.objectives || []).length
        );
        if (quest.objectives && quest.currentObjective > 0) {
          quest.objectivesCompleted = quest.objectives.slice(0, quest.currentObjective);
        }
      }
      break;
    case 'accepted':
      acceptQuest(questStore, quest.id);
      break;
  }

  return quest;
}

/**
 * Move a quest between lists.
 */
function moveQuest(questStore, quest, targetList) {
  const lists = ['active', 'available', 'completed', 'failed'];
  for (const list of lists) {
    const idx = questStore[list].indexOf(quest);
    if (idx !== -1) questStore[list].splice(idx, 1);
  }
  if (questStore[targetList]) questStore[targetList].push(quest);
}

/**
 * Get a summary of all quests for the DM context.
 */
function getQuestSummary(questStore) {
  return {
    active: questStore.active.map(q => ({
      name: q.name, description: q.description,
      currentObjective: q.objectives?.[q.currentObjective] || 'None',
      progress: `${q.currentObjective || 0}/${q.objectives?.length || 0}`
    })),
    available: questStore.available.map(q => ({ name: q.name, description: q.description })),
    completed: questStore.completed.map(q => ({ name: q.name }))
  };
}

module.exports = {
  QUEST_TEMPLATES,
  generateStartingQuests,
  acceptQuest,
  processQuestUpdate,
  getQuestSummary
};
