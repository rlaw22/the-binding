'use strict';

const { clone } = require('./collections');
const { createCharacter } = require('./character-state');
const { calculateDifficultyProfile } = require('./difficulty');
const { SESSION_SCHEMA_VERSION } = require('./session-state');

function createState(adventure, options = {}) {
  const sceneId = options.sceneId || adventure.graph.entry;
  if (!adventure.scenes[sceneId]) throw new Error(`Unknown starting scene: ${sceneId}`);
  const classId = options.classId || null;
  if (classId && !adventure.classes.some(c => (typeof c === 'string' ? c : c.classId) === classId)) throw new Error(`Unknown class: ${classId}`);
  const now = options.now || new Date().toISOString();
  const localThreads = initializeSceneThreads(adventure.scenes[sceneId], options.localThreads);
  return {
    sessionSchemaVersion: SESSION_SCHEMA_VERSION,
    manifestVersion: adventure.schemaVersion,
    mode: 'storyline', adventureId: adventure.adventureId, sessionId: options.sessionId || null,
    lifecycle: options.lifecycle || 'active', revision: 0,
    timestamps: { createdAt: now, updatedAt: now },
    sceneId, actId: adventure.scenes[sceneId].actId, turnNumber: 0, catalogVersion: `${sceneId}:0`,
    character: { ...createCharacter({ ...options.character, classId: classId || (options.character && options.character.classId) }), hp: options.hp == null ? 20 : options.hp, maxHp: options.maxHp == null ? 20 : options.maxHp, abilities: clone(options.abilities || []), abilitiesUsed: [] },
    bookSession: { bookSessionId: options.bookSessionId || options.sessionId || null, transferMode: options.transferMode || 'continuity', difficultyProfile: options.difficultyProfile || calculateDifficultyProfile(adventure, options.character || { level: 1 }, { mode: options.transferMode, challengePreference: options.challengePreference || options.difficultyPreference, calculatedAt: now }) },
    discoveredContentIds: [], consumedActionIds: [], actionVisitCounts: {}, inventory: clone(options.inventory || (options.character && options.character.approvedInventory) || []), flags: clone(options.flags || {}), coins: options.coins == null ? 10 : options.coins,
    metNpcIds: clone(options.metNpcIds || []), localThreads: clone(options.localThreads || localThreads), completedSceneIds: [], bookmarks: [], journal: [], processedTurns: {}
  };
}

const createBookSessionState = createState;

function initializeSceneThreads(scene, existing = {}) {
  const threads = clone(existing || {});
  (scene.threads || []).forEach(thread => {
    if (!threads[thread.threadId]) threads[thread.threadId] = { status: thread.status || 'dormant', progress: clone(thread.progress || {}) };
  });
  return threads;
}

module.exports = { createState, createBookSessionState, initializeSceneThreads };
