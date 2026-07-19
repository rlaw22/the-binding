/**
 * Session Persistence — Phase 2D
 *
 * Handles save/resume for campaign sessions, auto-save scheduling,
 * and campaign journal generation for returning players.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_SAVE_DIR = path.join(process.cwd(), 'data', 'campaigns');
const MAX_SAVES_PER_CAMPAIGN = 5;
const AUTO_SAVE_VERSION = 1;

/**
 * Ensure the save directory exists.
 */
function ensureSaveDir(dir) {
  const saveDir = dir || DEFAULT_SAVE_DIR;
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }
  return saveDir;
}

/**
 * Save a campaign session to disk.
 * Creates a timestamped save file and maintains a rolling window.
 */
function saveCampaign(session, options = {}) {
  const saveDir = ensureSaveDir(options.saveDir);
  const campaignId = session.id;

  if (!campaignId) throw new Error('Session has no ID');

  const saveState = {
    version: AUTO_SAVE_VERSION,
    campaignId,
    sessionName: session.sessionName || 'Unnamed Campaign',
    savedAt: new Date().toISOString(),
    turnCount: session.worldState?.turnCount || 0,
    // Deep clone to avoid mutation
    session: JSON.parse(JSON.stringify(session))
  };

  // Write to primary save slot
  const primaryPath = path.join(saveDir, `${campaignId}.json`);
  fs.writeFileSync(primaryPath, JSON.stringify(saveState, null, 2));

  // Write timestamped backup
  const timestamp = Date.now();
  const backupPath = path.join(saveDir, `${campaignId}_${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(saveState, null, 2));

  // Clean old backups (keep rolling window)
  cleanOldSaves(saveDir, campaignId);

  return {
    campaignId,
    savePath: primaryPath,
    backupPath,
    savedAt: saveState.savedAt,
    turnCount: saveState.turnCount,
    sizeBytes: Buffer.byteLength(JSON.stringify(saveState))
  };
}

/**
 * Load a campaign session from disk.
 */
function loadCampaign(campaignId, options = {}) {
  const saveDir = options.saveDir || DEFAULT_SAVE_DIR;
  const primaryPath = path.join(saveDir, `${campaignId}.json`);

  if (!fs.existsSync(primaryPath)) {
    throw new Error(`Campaign save not found: ${campaignId}`);
  }

  const raw = fs.readFileSync(primaryPath, 'utf8');
  const saveState = JSON.parse(raw);

  // Version migration if needed
  if (saveState.version < AUTO_SAVE_VERSION) {
    migrateSave(saveState);
  }

  return {
    session: saveState.session,
    savedAt: saveState.savedAt,
    turnCount: saveState.turnCount,
    version: saveState.version
  };
}

/**
 * List all saved campaigns.
 */
function listSavedCampaigns(options = {}) {
  const saveDir = options.saveDir || DEFAULT_SAVE_DIR;

  if (!fs.existsSync(saveDir)) return [];

  const files = fs.readdirSync(saveDir);
  const campaigns = [];

  for (const file of files) {
    // Only primary saves, not backups
    if (!file.endsWith('.json') || file.includes('_')) continue;

    try {
      const raw = fs.readFileSync(path.join(saveDir, file), 'utf8');
      const saveState = JSON.parse(raw);
      campaigns.push({
        campaignId: saveState.campaignId,
        sessionName: saveState.sessionName || 'Unnamed',
        savedAt: saveState.savedAt,
        turnCount: saveState.turnCount || 0,
        theme: saveState.session?.campaign?.theme || 'unknown',
        playerCount: saveState.session?.players?.length || 0
      });
    } catch (e) {
      // Skip corrupted saves
      continue;
    }
  }

  // Sort by most recently saved
  campaigns.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  return campaigns;
}

/**
 * Delete a campaign save (and its backups).
 */
function deleteCampaign(campaignId, options = {}) {
  const saveDir = options.saveDir || DEFAULT_SAVE_DIR;
  const files = fs.readdirSync(saveDir);
  let deleted = 0;

  for (const file of files) {
    if (file.startsWith(campaignId)) {
      fs.unlinkSync(path.join(saveDir, file));
      deleted++;
    }
  }

  return { campaignId, deletedFiles: deleted };
}

/**
 * Generate a campaign journal — a summary of key events for returning players.
 */
function generateCampaignJournal(session) {
  if (!session.campaign) return 'No campaign data available.';

  const world = session.campaign.world;
  const log = session.campaign.campaignLog || [];
  const quests = session.campaign.quests || {};

  const sections = [];

  // Header
  sections.push(`# Campaign Journal: ${session.sessionName || 'Unnamed Campaign'}`);
  sections.push(`*Last saved: ${session.campaign.lastSaved ? new Date(session.campaign.lastSaved).toLocaleString() : 'Never'}*\n`);

  // World overview
  if (world) {
    sections.push('## World State');
    sections.push(`- **Day** ${world.dayCount}, ${world.timeOfDay || 'unknown'}`);
    sections.push(`- **Weather:** ${world.weather || 'Clear'}`);
    const discovered = Object.values(world.locations).filter(l => l.discovered);
    sections.push(`- **Locations Discovered:** ${discovered.length}`);
    sections.push(`- **Current Location:** ${world.locations[world.currentLocation]?.name || 'Unknown'}`);
    sections.push('');
  }

  // Party
  if (session.players && session.players.length > 0) {
    sections.push('## Party');
    for (const p of session.players) {
      const ch = p.character || {};
      sections.push(`- **${ch.name || 'Unknown'}** — Level ${ch.level || 1} ${ch.class || 'Adventurer'} (HP: ${ch.hp || '?'})`);
    }
    sections.push('');
  }

  // Active quests
  if (quests.active && quests.active.length > 0) {
    sections.push('## Active Quests');
    for (const q of quests.active) {
      sections.push(`- **${q.name}**: ${q.description || 'No description'}`);
      if (q.objectives) {
        for (const obj of q.objectives) {
          const status = obj.completed ? '✅' : '⬜';
          sections.push(`  - ${status} ${obj.text || obj.description || obj}`);
        }
      }
    }
    sections.push('');
  }

  // Completed quests
  if (quests.completed && quests.completed.length > 0) {
    sections.push('## Completed Quests');
    for (const q of quests.completed) {
      sections.push(`- ~~${q.name}~~`);
    }
    sections.push('');
  }

  // Key events (last 20 significant events)
  const significantEvents = log
    .filter(e => ['campaign_started', 'location_changed', 'quest_updated', 'combat_started', 'npc_discovered', 'new_day'].includes(e.type))
    .slice(-20);

  if (significantEvents.length > 0) {
    sections.push('## Recent Events');
    for (const evt of significantEvents) {
      const time = evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : '';
      sections.push(`- [Turn ${evt.turn || '?'}] ${formatEvent(evt)}`);
    }
    sections.push('');
  }

  // Known NPCs
  if (world) {
    const knownNPCs = Object.values(world.npcs).filter(n => n.alive);
    if (knownNPCs.length > 0) {
      sections.push('## Known NPCs');
      for (const npc of knownNPCs) {
        const loc = world.locations[npc.location]?.name || 'Unknown';
        sections.push(`- **${npc.name}** (${npc.role}) — ${loc} [Attitude: ${formatAttitude(npc.attitude)}]`);
      }
      sections.push('');
    }
  }

  return sections.join('\n');
}

/**
 * Check if auto-save should trigger based on turn count.
 */
function shouldAutoSave(session, interval = 10) {
  const turnsSince = session.campaign?.turnSinceLastSave || 0;
  return turnsSince >= interval;
}

/**
 * Clean old backup saves, keeping only the most recent N.
 */
function cleanOldSaves(saveDir, campaignId, maxKeep = MAX_SAVES_PER_CAMPAIGN) {
  const files = fs.readdirSync(saveDir)
    .filter(f => f.startsWith(`${campaignId}_`) && f.endsWith('.json'))
    .sort()
    .reverse();

  // Keep the most recent, delete the rest
  for (let i = maxKeep; i < files.length; i++) {
    try {
      fs.unlinkSync(path.join(saveDir, files[i]));
    } catch (e) {
      // Ignore delete errors
    }
  }
}

/**
 * Migrate an older save format to the current version.
 */
function migrateSave(saveState) {
  // V0 -> V1: ensure campaign object exists
  if (!saveState.session.campaign) {
    saveState.session.campaign = {
      theme: 'unknown',
      world: null,
      quests: { active: [], completed: [], available: [], failed: [] },
      campaignLog: [],
      campaignFlags: {},
      dmContext: { currentSituation: null, activeThreads: [], recentEvents: [], tensionLevel: 0.3 },
      saveVersion: 1,
      lastSaved: null,
      autoSaveInterval: 10,
      turnSinceLastSave: 0
    };
  }
  saveState.version = AUTO_SAVE_VERSION;
}

function formatEvent(evt) {
  const d = evt.data || {};
  switch (evt.type) {
    case 'campaign_started': return `Campaign began in ${d.theme || 'unknown theme'}`;
    case 'location_changed': return `Moved from ${d.from || '?'} to ${d.to || '?'}`;
    case 'quest_updated': return `Quest "${d.questId || '?'}" → ${d.status || '?'}`;
    case 'combat_started': return `Combat: ${d.description || 'enemies encountered'}`;
    case 'npc_discovered': return `Met ${d.name || d.npcId || 'someone'}`;
    case 'new_day': return `Day ${d.day || '?'} begins`;
    default: return `${evt.type}: ${JSON.stringify(d).slice(0, 80)}`;
  }
}

function formatAttitude(a) {
  if (a > 0.5) return 'Allied';
  if (a > 0.2) return 'Friendly';
  if (a > -0.2) return 'Neutral';
  if (a > -0.6) return 'Unfriendly';
  return 'Hostile';
}

module.exports = {
  DEFAULT_SAVE_DIR,
  MAX_SAVES_PER_CAMPAIGN,
  ensureSaveDir,
  saveCampaign,
  loadCampaign,
  listSavedCampaigns,
  deleteCampaign,
  generateCampaignJournal,
  shouldAutoSave,
  cleanOldSaves,
  migrateSave
};
