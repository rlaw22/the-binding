/**
 * Phase 2A Unit Tests — Campaign Foundation
 */
const assert = require('assert');

const {
  CAMPAIGN_THEMES, createCampaignSession, startCampaign,
  processCampaignAction, applyWorldChanges, parseDMResponseTags,
  buildDMContext, saveCampaign, resumeCampaign, getCampaignSummary
} = require('../src/campaign/index');
const { addPlayer, SessionMode, SessionState } = require('../src/session');
const { THEME_TEMPLATES, generateWorld, discoverLocation, getDiscoveredLocations, getLocationMap } = require('../src/campaign/world-builder');
const { QUEST_TEMPLATES, generateStartingQuests, acceptQuest, processQuestUpdate, getQuestSummary } = require('../src/campaign/quest-engine');
const { buildCampaignSystemPrompt, buildNPCPrompt, buildWorldBuildingPrompt, buildCombatNarrationPrompt } = require('../src/campaign/campaign-prompts');
const { DIGITAL_DM_CONFIG, createDigitalDMSession, getDigitalDMPromptSuffix, getDigitalDMWorldPrompt, getDigitalDMCombatPrompt, isDigitalDM, getDigitalDMInfo } = require('../src/campaign/digital-dm');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (err) { failed++; console.log(`  ❌ ${name}: ${err.message}`); }
}
function addTestPlayer(session, name = 'TestHero') {
  return addPlayer(session, { name, class: 'fighter', race: 'human', level: 1, hp: { current: 10, max: 10 } });
}

console.log('\n=== Phase 2A: Campaign Foundation Tests ===\n');

// --- Themes ---
console.log('--- Campaign Themes ---');
test('All 5 themes exist', () => {
  assert.strictEqual(Object.keys(CAMPAIGN_THEMES).length, 5);
  assert.ok(CAMPAIGN_THEMES.gothic_horror);
  assert.ok(CAMPAIGN_THEMES.sword_coast);
  assert.ok(CAMPAIGN_THEMES.noir_mystery);
  assert.ok(CAMPAIGN_THEMES.wilderness_expedition);
  assert.ok(CAMPAIGN_THEMES.custom);
});
test('Each theme has required fields', () => {
  for (const [id, theme] of Object.entries(CAMPAIGN_THEMES)) {
    assert.ok(theme.id, `${id} missing id`);
    assert.ok(theme.name, `${id} missing name`);
    assert.ok(theme.description, `${id} missing description`);
  }
});

// --- Session Creation ---
console.log('\n--- Campaign Session Creation ---');
test('Create campaign with default theme', () => {
  const s = createCampaignSession();
  assert.strictEqual(s.mode, SessionMode.CAMPAIGN);
  assert.strictEqual(s.campaign.theme, 'gothic_horror');
  assert.strictEqual(s.state, SessionState.LOBBY);
  assert.strictEqual(s.campaign.world, null);
});
test('Create campaign with sword_coast theme', () => {
  const s = createCampaignSession({ theme: 'sword_coast', sessionName: 'Test' });
  assert.strictEqual(s.campaign.theme, 'sword_coast');
  assert.strictEqual(s.sessionName, 'Test');
});
test('Create campaign with custom theme', () => {
  const s = createCampaignSession({ theme: 'custom', customDescription: 'Steampunk city' });
  assert.strictEqual(s.campaign.theme, 'custom');
  assert.strictEqual(s.campaign.customDescription, 'Steampunk city');
});
test('Invalid theme throws', () => {
  assert.throws(() => createCampaignSession({ theme: 'nope' }), /Unknown campaign theme/);
});

// --- World Builder ---
console.log('\n--- World Builder ---');
test('Generate gothic_horror world', () => {
  const w = generateWorld({ theme: 'gothic_horror' });
  assert.ok(w.id);
  assert.strictEqual(w.theme, 'gothic_horror');
  assert.strictEqual(Object.keys(w.locations).length, 4);
  assert.strictEqual(Object.keys(w.npcs).length, 3);
  assert.strictEqual(w.currentLocation, 'loc_tavern');
});
test('Starting location discovered, others not', () => {
  const w = generateWorld({ theme: 'gothic_horror' });
  assert.strictEqual(w.locations['loc_tavern'].discovered, true);
  assert.strictEqual(w.locations['loc_forest'].discovered, false);
});
test('NPCs linked to locations', () => {
  const w = generateWorld({ theme: 'gothic_horror' });
  assert.ok(w.locations['loc_tavern'].npcs.includes('npc_innkeeper'));
});
test('Bidirectional connections', () => {
  const w = generateWorld({ theme: 'gothic_horror' });
  assert.ok(w.locations['loc_tavern'].connections.includes('loc_village'));
  assert.ok(w.locations['loc_village'].connections.includes('loc_tavern'));
});
test('Generate sword_coast world', () => {
  const w = generateWorld({ theme: 'sword_coast' });
  assert.strictEqual(w.theme, 'sword_coast');
  assert.strictEqual(Object.keys(w.locations).length, 4);
});
test('Generate custom world', () => {
  const w = generateWorld({ theme: 'custom', customDescription: 'Floating city' });
  assert.strictEqual(w.theme, 'custom');
  assert.strictEqual(Object.keys(w.locations).length, 2);
});
test('discoverLocation adds new location', () => {
  const w = generateWorld({ theme: 'gothic_horror' });
  const loc = discoverLocation(w, { id: 'loc_cave', name: 'Cave', type: 'dungeon', description: 'Dark cave' });
  assert.strictEqual(loc.name, 'Cave');
  assert.strictEqual(loc.discovered, true);
  assert.ok(w.locations['loc_tavern'].connections.includes('loc_cave'));
});
test('getDiscoveredLocations returns only discovered', () => {
  const w = generateWorld({ theme: 'gothic_horror' });
  assert.strictEqual(getDiscoveredLocations(w).length, 1);
});
test('getLocationMap returns connections', () => {
  const w = generateWorld({ theme: 'gothic_horror' });
  const map = getLocationMap(w);
  assert.ok(map.length >= 2, `Expected at least 2 connections, got ${map.length}`);
  assert.ok(map.some(m => m.id === 'loc_village'));
  assert.ok(map.some(m => m.id === 'loc_forest'));
});

// --- Quest Engine ---
console.log('\n--- Quest Engine ---');
test('Quest templates exist for all themes', () => {
  assert.ok(QUEST_TEMPLATES.gothic_horror.length >= 3);
  assert.ok(QUEST_TEMPLATES.sword_coast.length >= 3);
  assert.ok(QUEST_TEMPLATES.noir_mystery.length >= 3);
  assert.ok(QUEST_TEMPLATES.wilderness_expedition.length >= 3);
});
test('generateStartingQuests returns requested count', () => {
  const q = generateStartingQuests({}, 'gothic_horror', 2);
  assert.strictEqual(q.length, 2);
  assert.ok(q[0].id.startsWith('quest_'));
  assert.strictEqual(q[0].status, 'available');
});
test('acceptQuest moves quest to active', () => {
  const store = { active: [], completed: [], available: [], failed: [] };
  store.available = generateStartingQuests({}, 'gothic_horror', 2);
  const quest = acceptQuest(store, store.available[0].id);
  assert.strictEqual(quest.status, 'active');
  assert.strictEqual(store.active.length, 1);
  assert.strictEqual(store.available.length, 1);
});
test('getQuestSummary returns structured summary', () => {
  const store = { active: [], completed: [], available: [], failed: [] };
  store.available = generateStartingQuests({}, 'gothic_horror', 2);
  const s = getQuestSummary(store);
  assert.strictEqual(s.available.length, 2);
  assert.strictEqual(s.active.length, 0);
});

// --- Campaign Lifecycle ---
console.log('\n--- Campaign Session Lifecycle ---');
test('Start campaign generates world and quests', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  addTestPlayer(s);
  const result = startCampaign(s);
  assert.ok(result.world);
  assert.ok(result.openingNarration);
  assert.ok(result.availableQuests.length > 0);
  assert.strictEqual(s.state, SessionState.ACTIVE);
});
test('Start campaign twice throws', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  addTestPlayer(s);
  startCampaign(s);
  assert.throws(() => startCampaign(s), /already started/);
});
test('processCampaignAction returns DM context', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  const p = addTestPlayer(s);
  startCampaign(s);
  const r = processCampaignAction(s, p.id, 'I look around');
  assert.ok(r.dmContext);
  assert.ok(r.dmContext.currentLocation);
  assert.ok(r.dmContext.party.length > 0);
  assert.strictEqual(s.worldState.turnCount, 1);
});
test('processCampaignAction with bad player throws', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  addTestPlayer(s);
  startCampaign(s);
  assert.throws(() => processCampaignAction(s, 'fake-id', 'test'), /not in session/);
});

// --- Tag Parsing ---
console.log('\n--- DM Response Tag Parsing ---');
test('Parse LOCATION_MOVED tag', () => {
  const c = parseDMResponseTags('You walk. [LOCATION_MOVED: loc_village, "Hollow Creek"]');
  assert.strictEqual(c.locationMoved, 'loc_village');
  assert.strictEqual(c.locationName, 'Hollow Creek');
});
test('Parse LOCATION_DISCOVERED tag', () => {
  const c = parseDMResponseTags('You find a cave. [LOCATION_DISCOVERED: loc_cave, "Dark Cave"]');
  assert.strictEqual(c.locationMoved, 'loc_cave');
});
test('Parse NPC_ATTITUDE tag', () => {
  const c = parseDMResponseTags('She smiles. [NPC_ATTITUDE: npc_innkeeper, +0.2, "shared rumors"]');
  assert.strictEqual(c.npcUpdates.length, 1);
  assert.strictEqual(c.npcUpdates[0].attitude, 0.2);
});
test('Parse QUEST_UPDATE tag', () => {
  const c = parseDMResponseTags('Done! [QUEST_UPDATE: quest_001, completed: saved village]');
  assert.strictEqual(c.questUpdates.length, 1);
  assert.strictEqual(c.questUpdates[0].status, 'completed');
});
test('Parse DICE_ROLL tag', () => {
  const c = parseDMResponseTags('Roll. [DICE_ROLL: ability_check, DC 15, Wisdom (Perception)]');
  assert.strictEqual(c.diceRolls.length, 1);
  assert.strictEqual(c.diceRolls[0].dc, 15);
});
test('Parse COMBAT_START tag', () => {
  const c = parseDMResponseTags('Attack! [COMBAT_START: 4 goblins emerge]');
  assert.ok(c.combatStart);
});
test('Parse ITEM_GRANTED tag', () => {
  const c = parseDMResponseTags('You find it. [ITEM_GRANTED: potion_of_healing, to: Hero]');
  assert.strictEqual(c.itemsGranted.length, 1);
  assert.strictEqual(c.itemsGranted[0].item, 'potion_of_healing');
});
test('Parse TIME_ADVANCED tag', () => {
  const c = parseDMResponseTags('Hours pass. [TIME_ADVANCED: evening]');
  assert.strictEqual(c.timeAdvanced, true);
  assert.strictEqual(c.timeOfDay, 'evening');
});
test('Parse NEW_DAY tag', () => {
  const c = parseDMResponseTags('You rest. [NEW_DAY]');
  assert.strictEqual(c.timeAdvanced, true);
  assert.strictEqual(c.newDay, true);
});
test('Parse WEATHER tag', () => {
  const c = parseDMResponseTags('Rain. [WEATHER: heavy rain]');
  assert.strictEqual(c.weather, 'heavy rain');
});
test('Parse FLAG tag', () => {
  const c = parseDMResponseTags('Truth. [FLAG: knows_secret, true]');
  assert.strictEqual(c.flags.knows_secret, 'true');
});
test('Parse multiple tags', () => {
  const c = parseDMResponseTags('Leave. [LOCATION_MOVED: loc_village] Wave. [NPC_ATTITUDE: npc_innkeeper, +0.1] Find. [ITEM_GRANTED: old_map]');
  assert.strictEqual(c.locationMoved, 'loc_village');
  assert.strictEqual(c.npcUpdates.length, 1);
  assert.strictEqual(c.itemsGranted.length, 1);
});
test('No tags returns empty arrays', () => {
  const c = parseDMResponseTags('Just narration.');
  assert.strictEqual(c.npcUpdates.length, 0);
  assert.strictEqual(c.questUpdates.length, 0);
});

// --- Apply World Changes ---
console.log('\n--- Apply World Changes ---');
test('Moves player to new location', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  addTestPlayer(s);
  startCampaign(s);
  applyWorldChanges(s, 'Walk. [LOCATION_MOVED: loc_village]');
  assert.strictEqual(s.campaign.world.currentLocation, 'loc_village');
});
test('Discovers new location', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  addTestPlayer(s);
  startCampaign(s);
  applyWorldChanges(s, 'Cave. [LOCATION_MOVED: loc_hidden_cave, "Hidden Cave"]');
  assert.ok(s.campaign.world.locations['loc_hidden_cave']);
  assert.strictEqual(s.campaign.world.locations['loc_hidden_cave'].discovered, true);
});
test('Updates NPC attitude', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  addTestPlayer(s);
  startCampaign(s);
  applyWorldChanges(s, 'Smile. [NPC_ATTITUDE: npc_innkeeper, +0.3]');
  assert.strictEqual(s.campaign.world.npcs['npc_innkeeper'].attitude, 0.3);
});
test('Advances time', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  addTestPlayer(s);
  startCampaign(s);
  applyWorldChanges(s, 'Pass. [TIME_ADVANCED: night]');
  assert.strictEqual(s.campaign.world.timeOfDay, 'night');
});
test('Increments day on NEW_DAY', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  addTestPlayer(s);
  startCampaign(s);
  applyWorldChanges(s, 'Rest. [NEW_DAY]');
  assert.strictEqual(s.campaign.world.dayCount, 2);
});

// --- DM Prompts ---
console.log('\n--- Campaign DM Prompts ---');
test('System prompt includes key sections', () => {
  const p = buildCampaignSystemPrompt({
    currentLocation: { name: 'Tavern', description: 'Cozy', npcsPresent: [], connections: ['village'] },
    activeQuests: [], party: [{ name: 'Hero', class: 'fighter', level: 1, hp: { current: 10, max: 10 } }],
    recentEvents: [], timeOfDay: 'evening', dayCount: 1, weather: 'clear',
    playerName: 'Hero', theme: 'gothic_horror', tensionLevel: 0.3
  });
  assert.ok(p.includes('Dungeon Master'));
  assert.ok(p.includes('gothic_horror'));
  assert.ok(p.includes('SUGGESTED ACTIONS'));
});
test('System prompt includes active quests', () => {
  const p = buildCampaignSystemPrompt({
    currentLocation: { name: 'T', description: '', npcsPresent: [], connections: [] },
    activeQuests: [{ name: 'Find Key', description: 'Mysterious', objectives: ['Search cellar'] }],
    party: [], recentEvents: [], timeOfDay: 'morning', dayCount: 1, weather: 'clear',
    playerName: 'H', theme: 'gothic_horror', tensionLevel: 0.5
  });
  assert.ok(p.includes('Find Key'));
});
test('NPC prompt includes personality', () => {
  const p = buildNPCPrompt(
    { name: 'Elara', race: 'Human', role: 'innkeeper', personality: ['warm'], attitude: 0.3, knownInfo: ['rumors'], secrets: ['creature'] },
    'Tell me about the forest', {}
  );
  assert.ok(p.includes('Elara'));
  assert.ok(p.includes('warm'));
});
test('World building prompt includes theme', () => {
  const p = buildWorldBuildingPrompt('gothic_horror', 'settlement', 'Enter village');
  assert.ok(p.includes('gothic_horror'));
});
test('Combat prompt includes attack details', () => {
  const p = buildCombatNarrationPrompt({ name: 'Hero', level: 1, class: 'fighter' }, { name: 'Goblin', ac: 13 }, 15, 6);
  assert.ok(p.includes('Hero'));
  assert.ok(p.includes('HIT'));
});

// --- Save/Resume ---
console.log('\n--- Save/Resume ---');
test('saveCampaign pauses session', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  addTestPlayer(s);
  startCampaign(s);
  const saved = saveCampaign(s);
  assert.strictEqual(saved.state, SessionState.PAUSED);
  assert.ok(saved.campaign.lastSaved);
});
test('resumeCampaign reactivates', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  addTestPlayer(s);
  startCampaign(s);
  const saved = saveCampaign(s);
  const resumed = resumeCampaign(saved);
  assert.strictEqual(resumed.state, SessionState.ACTIVE);
});

// --- Campaign Summary ---
console.log('\n--- Campaign Summary ---');
test('getCampaignSummary returns formatted string', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  addTestPlayer(s);
  startCampaign(s);
  const sum = getCampaignSummary(s);
  assert.ok(sum.includes('Day 1'));
  assert.ok(sum.includes('TestHero'));
});
test('getCampaignSummary before start', () => {
  const s = createCampaignSession();
  assert.ok(getCampaignSummary(s).includes('not yet started'));
});

// --- Digital DM ---
console.log('\n--- Digital DM ---');
test('Config has required fields', () => {
  assert.strictEqual(DIGITAL_DM_CONFIG.id, 'digital_dm');
  assert.strictEqual(DIGITAL_DM_CONFIG.dmType, 'ai');
  assert.ok(DIGITAL_DM_CONFIG.dmBehavior);
});
test('createDigitalDMSession creates valid session', () => {
  const s = createDigitalDMSession();
  assert.strictEqual(s.mode, 'digital_dm');
  assert.ok(s.digitalDM);
  assert.strictEqual(s.digitalDM.creationFreedom, 'unlimited');
});
test('isDigitalDM identifies correctly', () => {
  assert.strictEqual(isDigitalDM(createDigitalDMSession()), true);
  assert.strictEqual(isDigitalDM(createCampaignSession()), false);
});
test('getDigitalDMInfo returns display info', () => {
  const info = getDigitalDMInfo();
  assert.strictEqual(info.name, 'Digital DM');
  assert.ok(info.features.length > 0);
});
test('Prompt suffixes are non-empty', () => {
  assert.ok(getDigitalDMPromptSuffix().length > 50);
  assert.ok(getDigitalDMWorldPrompt().length > 50);
  assert.ok(getDigitalDMCombatPrompt().length > 50);
});

// --- DM Context Builder ---
console.log('\n--- DM Context Builder ---');
test('buildDMContext includes all sections', () => {
  const s = createCampaignSession({ theme: 'gothic_horror' });
  const p = addTestPlayer(s);
  startCampaign(s);
  const ctx = buildDMContext(s, p, 'I look around');
  assert.ok(ctx.currentLocation);
  assert.ok(ctx.party);
  assert.ok(ctx.playerAction === 'I look around');
  assert.ok(ctx.theme === 'gothic_horror');
});

// ════════════════════════════════════════════════════════════════════════════
// RESULTS
// ════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`);
console.log(`  Phase 2A Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'═'.repeat(60)}\n`);
process.exit(failed > 0 ? 1 : 0);
