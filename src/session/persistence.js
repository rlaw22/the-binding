/**
 * Session Persistence — Save/load game sessions to disk.
 * 
 * Survives server restarts. Saves periodically and after each action.
 * Serializes game state (context manager, scene state, turn history)
 * and reconstructs non-serializable parts (LLM provider, rule engine) on load.
 */

const fs = require('fs');
const path = require('path');

const SAVE_PATH = path.join(__dirname, '..', '..', 'data', 'sessions.json');
const SAVE_INTERVAL_MS = 30_000; // auto-save every 30s

let saveTimer = null;
let dirty = false;

/**
 * Mark the session store as needing a save.
 */
function markDirty() {
  dirty = true;
}

/**
 * Serialize a single session entry for disk storage.
 * Strips non-serializable function references; keeps all game state.
 */
function serializeEntry(entry) {
  const { session, game, coinPool, sceneCoins, history } = entry;

  // Serialize scene state — convert Set to Array
  let sceneState = null;
  if (game.sceneState) {
    sceneState = {
      ...game.sceneState,
      discoveredIds: game.sceneState.discoveredIds instanceof Set
        ? [...game.sceneState.discoveredIds]
        : (game.sceneState.discoveredIds || [])
    };
  }

  return {
    session,
    game: {
      sessionId: game.sessionId,
      adventureId: game.adventureId,
      adventureName: game.adventureName,
      state: game.state,
      turnHistory: game.turnHistory,
      playerProfile: game.playerProfile,
      contextManager: game.contextManager,
      sceneState
      // llmProvider, ruleEngine, diceService, coinEngine — reconstructed on load
    },
    coinPool,
    sceneCoins,
    history,
    savedAt: Date.now()
  };
}

/**
 * Deserialize a saved entry, reconstructing non-serializable parts.
 * 
 * @param {object} saved — serialized entry from disk
 * @param {Function} createProviderFn — creates LLM provider from config
 * @param {object} llmConfig — LLM config for provider creation
 * @param {object} ruleEngine — rule engine module
 * @param {object} diceService — dice service module
 */
function deserializeEntry(saved, createProviderFn, llmConfig, ruleEngine, diceService) {
  const game = saved.game;

  // Reconstruct Set in scene state
  if (game.sceneState && Array.isArray(game.sceneState.discoveredIds)) {
    game.sceneState.discoveredIds = new Set(game.sceneState.discoveredIds);
  }

  // Reconstruct function references
  game.llmProvider = createProviderFn(llmConfig);
  game.ruleEngine = ruleEngine;
  game.diceService = diceService;
  game.coinEngine = null;

  return {
    session: saved.session,
    game,
    coinPool: saved.coinPool,
    sceneCoins: saved.sceneCoins || [],
    history: saved.history || []
  };
}

/**
 * Save all sessions to disk.
 */
function saveSessions(sessionsMap) {
  try {
    const dir = path.dirname(SAVE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const entries = [];
    for (const [id, entry] of sessionsMap) {
      entries.push(serializeEntry(entry));
    }

    fs.writeFileSync(SAVE_PATH, JSON.stringify(entries, null, 2));
    dirty = false;
    console.log(`[Persistence] Saved ${entries.length} session(s) to disk`);
    return entries.length;
  } catch (err) {
    console.error('[Persistence] Failed to save sessions:', err.message);
    return -1;
  }
}

/**
 * Load sessions from disk and populate the sessions Map + rejoinCodes Map.
 * 
 * @param {Map} sessionsMap — the in-memory sessions store
 * @param {Map} rejoinCodesMap — the rejoin code lookup
 * @param {Function} createProviderFn — creates LLM provider
 * @param {object} llmConfig — LLM config
 * @param {object} ruleEngine — rule engine module
 * @param {object} diceService — dice service module
 * @returns {number} number of sessions loaded
 */
function loadSessions(sessionsMap, rejoinCodesMap, createProviderFn, llmConfig, ruleEngine, diceService) {
  try {
    if (!fs.existsSync(SAVE_PATH)) {
      console.log('[Persistence] No saved sessions found');
      return 0;
    }

    const raw = fs.readFileSync(SAVE_PATH, 'utf8');
    const entries = JSON.parse(raw);

    if (!Array.isArray(entries)) {
      console.warn('[Persistence] Invalid sessions file format');
      return 0;
    }

    let loaded = 0;
    for (const saved of entries) {
      try {
        // Skip sessions that are too old (7 days)
        const age = Date.now() - (saved.savedAt || 0);
        if (age > 7 * 24 * 60 * 60 * 1000) {
          console.log(`[Persistence] Skipping expired session ${saved.session?.id}`);
          continue;
        }

        const entry = deserializeEntry(saved, createProviderFn, llmConfig, ruleEngine, diceService);
        sessionsMap.set(entry.session.id, entry);

        // Restore rejoin code if the session had one
        if (entry.session._rejoinCode) {
          rejoinCodesMap.set(entry.session._rejoinCode, entry.session.id);
        }

        loaded++;
      } catch (err) {
        console.warn(`[Persistence] Failed to load session: ${err.message}`);
      }
    }

    console.log(`[Persistence] Loaded ${loaded} session(s) from disk`);
    return loaded;
  } catch (err) {
    console.error('[Persistence] Failed to load sessions:', err.message);
    return 0;
  }
}

/**
 * Start the auto-save timer.
 */
function startAutoSave(sessionsMap) {
  if (saveTimer) clearInterval(saveTimer);
  saveTimer = setInterval(() => {
    if (dirty) {
      saveSessions(sessionsMap);
    }
  }, SAVE_INTERVAL_MS);
  // Don't block process exit
  if (saveTimer.unref) saveTimer.unref();
  console.log(`[Persistence] Auto-save every ${SAVE_INTERVAL_MS / 1000}s`);
}

/**
 * Save immediately on process exit.
 */
function setupExitSave(sessionsMap) {
  const saveAndExit = () => {
    if (dirty || sessionsMap.size > 0) {
      saveSessions(sessionsMap);
    }
  };
  process.on('SIGTERM', () => { saveAndExit(); process.exit(0); });
  process.on('SIGINT', () => { saveAndExit(); process.exit(0); });
  process.on('exit', saveAndExit);
}

module.exports = {
  saveSessions,
  loadSessions,
  startAutoSave,
  setupExitSave,
  markDirty
};
