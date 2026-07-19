/**
 * Phase 2B/2C/2D Tests — New modules built out in this sprint.
 *
 * Tests: encounter-builder, turn-manager, loot-engine, npc-engine, session-persistence
 */

let passed = 0;
let failed = 0;
let currentGroup = '';

function group(name) {
  currentGroup = name;
  console.log(`\n--- ${name} ---`);
}

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

function assertThrows(fn, label) {
  try { fn(); assert(false, label + ' (should have thrown)'); }
  catch (e) { assert(true, label); }
}

// ============================================================
// ENCOUNTER BUILDER
// ============================================================
const { buildEncounter, calculateEncounterXP, getEncounterDifficulty, parseCR, ENCOUNTER_TEMPLATES, buildEncounterNarrationContext } = require('../src/campaign/encounter-builder');

group('Encounter Builder — parseCR');
assert(parseCR(1) === 1, 'parseCR(1) = 1');
assert(parseCR('1/2') === 0.5, 'parseCR("1/2") = 0.5');
assert(parseCR('1/4') === 0.25, 'parseCR("1/4") = 0.25');
assert(parseCR('1/8') === 0.125, 'parseCR("1/8") = 0.125');
assert(parseCR(5) === 5, 'parseCR(5) = 5');
assert(parseCR(null) === 0, 'parseCR(null) = 0');

group('Encounter Builder — calculateEncounterXP');
{
  const monsters = [{ xp: 50 }, { xp: 50 }, { xp: 100 }];
  const result = calculateEncounterXP(monsters, 4);
  assert(result.baseXP === 200, 'baseXP = 200');
  assert(result.monsterMultiplier === 2, '3 monsters -> 2x multiplier');
  assert(result.adjustedXP > 0, 'adjustedXP > 0');
  assert(result.perPlayerXP > 0, 'perPlayerXP > 0');
}

group('Encounter Builder — getEncounterDifficulty');
{
  const party = [{ level: 3 }, { level: 3 }, { level: 3 }, { level: 3 }];
  const monsters = [{ xp: 50 }];
  const result = getEncounterDifficulty(monsters, party);
  assert(typeof result.difficulty === 'string', 'difficulty is a string');
  assert(result.partyThresholds.easy > 0, 'partyThresholds.easy > 0');
  assert(result.partyThresholds.deadly > result.partyThresholds.easy, 'deadly > easy threshold');
}

group('Encounter Builder — buildEncounter');
{
  const party = [{ level: 3, name: 'Fighter' }, { level: 3, name: 'Wizard' }];
  const result = buildEncounter({ party, targetDifficulty: 'medium' });
  assert(result.monsters.length > 0, 'buildEncounter returns at least 1 monster');
  assert(typeof result.difficulty === 'string', 'difficulty is a string');
  assert(result.partyLevel === 3, 'partyLevel = 3');
  assert(result.partySize === 2, 'partySize = 2');
}

group('Encounter Builder — buildEncounter empty party');
assertThrows(() => buildEncounter({ party: [] }), 'Throws on empty party');

group('Encounter Builder — ENCOUNTER_TEMPLATES');
assert(ENCOUNTER_TEMPLATES.ambush, 'ambush template exists');
assert(ENCOUNTER_TEMPLATES.boss_fight, 'boss_fight template exists');
assert(ENCOUNTER_TEMPLATES.dungeon_room, 'dungeon_room template exists');

group('Encounter Builder — buildEncounterNarrationContext');
{
  const encounter = {
    monsters: [{ name: 'Goblin', cr: 0.25, ac: 15, hp: 7, xp: 50 }],
    difficulty: 'easy',
    xpData: { adjustedXP: 100 },
    template: { name: 'Ambush', description: 'Enemies strike from hiding', surpriseChance: 0.6 }
  };
  const ctx = buildEncounterNarrationContext(encounter);
  assert(ctx !== null, 'narration context is not null');
  assert(ctx.difficulty === 'easy', 'difficulty = easy');
  assert(ctx.monsterCount === 1, 'monsterCount = 1');
  assert(ctx.surpriseChance === 0.6, 'surpriseChance = 0.6');
}

// ============================================================
// TURN MANAGER
// ============================================================
const {
  createTurnManager, rollInitiative, setNarrativeOrder, getCurrentPlayer,
  advanceTurn, isPlayerTurn, forceAdvance, setTurnPhase, switchMode,
  pauseTurns, unpauseTurns, removeParticipant, addParticipant, getTurnSummary,
  TURN_MODES, TURN_PHASES
} = require('../src/campaign/turn-manager');

group('Turn Manager — createTurnManager');
{
  const tm = createTurnManager();
  assert(tm.mode === TURN_MODES.NARRATIVE, 'default mode is narrative');
  assert(tm.round === 0, 'round starts at 0');
  assert(tm.paused === false, 'not paused');
  assert(tm.turnOrder.length === 0, 'empty turn order');
}

group('Turn Manager — rollInitiative');
{
  const tm = createTurnManager();
  const participants = [
    { id: 'p1', name: 'Fighter', dex: 14, isPlayer: true },
    { id: 'p2', name: 'Wizard', dex: 10, isPlayer: true },
    { id: 'g1', name: 'Goblin', dex: 16, isPlayer: false }
  ];
  const order = rollInitiative(tm, participants);
  assert(order.length === 3, '3 participants in initiative');
  assert(tm.mode === TURN_MODES.INITIATIVE, 'mode switched to initiative');
  assert(tm.round === 1, 'round = 1');
  assert(tm.turnPhase === 'action', 'phase = action');
  assert(order[0].initiative >= order[1].initiative, 'sorted by initiative desc');
}

group('Turn Manager — advanceTurn');
{
  const tm = createTurnManager();
  const participants = [
    { id: 'p1', name: 'Fighter', dex: 10 },
    { id: 'p2', name: 'Wizard', dex: 10 }
  ];
  rollInitiative(tm, participants);
  const first = getCurrentPlayer(tm);
  assert(first !== null, 'getCurrentPlayer returns a player');
  const second = advanceTurn(tm);
  assert(second !== null, 'advanceTurn returns next player');
}

group('Turn Manager — isPlayerTurn');
{
  const tm = createTurnManager();
  rollInitiative(tm, [
    { id: 'p1', name: 'Fighter', dex: 10 },
    { id: 'p2', name: 'Wizard', dex: 10 }
  ]);
  const current = getCurrentPlayer(tm);
  assert(isPlayerTurn(tm, current.id), 'isPlayerTurn true for current player');
  assert(!isPlayerTurn(tm, 'nonexistent'), 'isPlayerTurn false for other player');
}

group('Turn Manager — forceAdvance');
{
  const tm = createTurnManager();
  rollInitiative(tm, [
    { id: 'p1', name: 'Fighter', dex: 10 },
    { id: 'p2', name: 'Wizard', dex: 10 }
  ]);
  forceAdvance(tm);
  const after = getCurrentPlayer(tm);
  assert(after !== null, 'forceAdvance returns a player');
}

group('Turn Manager — pause/unpause');
{
  const tm = createTurnManager();
  pauseTurns(tm);
  assert(tm.paused === true, 'paused');
  assert(getCurrentPlayer(tm) === null, 'no current player when paused');
  unpauseTurns(tm);
  assert(tm.paused === false, 'unpaused');
}

group('Turn Manager — setTurnPhase');
{
  const tm = createTurnManager();
  setTurnPhase(tm, 'bonus_action');
  assert(tm.turnPhase === 'bonus_action', 'phase set to bonus_action');
  assertThrows(() => setTurnPhase(tm, 'invalid_phase'), 'throws on invalid phase');
}

group('Turn Manager — setNarrativeOrder');
{
  const tm = createTurnManager();
  setNarrativeOrder(tm, ['p1', 'p2', 'p3']);
  assert(tm.turnOrder.length === 3, '3 players in narrative order');
  assert(tm.mode === TURN_MODES.NARRATIVE, 'mode is narrative');
  assert(getCurrentPlayer(tm).id === 'p1', 'first player is p1');
}

group('Turn Manager — removeParticipant');
{
  const tm = createTurnManager();
  rollInitiative(tm, [
    { id: 'p1', name: 'Fighter', dex: 10 },
    { id: 'p2', name: 'Wizard', dex: 10 },
    { id: 'p3', name: 'Rogue', dex: 14 }
  ]);
  const removed = removeParticipant(tm, 'p2');
  assert(removed === true, 'removed p2');
  assert(tm.turnOrder.length === 2, '2 participants remain');
}

group('Turn Manager — addParticipant');
{
  const tm = createTurnManager();
  rollInitiative(tm, [{ id: 'p1', name: 'Fighter', dex: 10 }]);
  addParticipant(tm, { id: 'g1', name: 'Goblin', dex: 14, isPlayer: false });
  assert(tm.turnOrder.length === 2, '2 participants after add');
}

group('Turn Manager — getTurnSummary');
{
  const tm = createTurnManager();
  rollInitiative(tm, [{ id: 'p1', name: 'Fighter', dex: 10 }]);
  const summary = getTurnSummary(tm);
  assert(summary.mode === TURN_MODES.INITIATIVE, 'summary mode');
  assert(summary.round === 1, 'summary round');
  assert(summary.order.length === 1, 'summary order');
}

// ============================================================
// LOOT ENGINE
// ============================================================
const {
  rollDice, generateTreasureHoard, generateMonsterLoot, generateShopInventory,
  distributeLoot, formatTreasureNarration, MAGIC_ITEM_TABLES
} = require('../src/campaign/loot-engine');

group('Loot Engine — rollDice');
{
  const r1 = rollDice('2d6');
  assert(r1 >= 2 && r1 <= 12, '2d6 in range [2,12]');
  const r2 = rollDice('1d20');
  assert(r2 >= 1 && r2 <= 20, '1d20 in range [1,20]');
  assert(rollDice('5') === 5, 'literal number returns itself');
}

group('Loot Engine — generateTreasureHoard');
{
  const hoard = generateTreasureHoard(3);
  assert(hoard.coins, 'has coins');
  assert(typeof hoard.totalValue === 'number', 'totalValue is number');
  assert(Array.isArray(hoard.gems), 'gems is array');
  assert(Array.isArray(hoard.artObjects), 'artObjects is array');
  assert(Array.isArray(hoard.magicItems), 'magicItems is array');
}

group('Loot Engine — generateMonsterLoot');
{
  const loot = generateMonsterLoot({ cr: 0.25 });
  assert(loot.coins, 'has coins');
  assert(typeof loot.totalValue === 'number', 'totalValue is number');
  assert(Array.isArray(loot.items), 'items is array');
}

group('Loot Engine — generateShopInventory');
{
  const shop = generateShopInventory({ settlementLevel: 'town' });
  assert(shop.items.length > 0, 'town shop has items');
  assert(typeof shop.totalValue === 'number', 'totalValue is number');
  assert(shop.items[0].name, 'items have names');
}

group('Loot Engine — distributeLoot');
{
  const treasure = { totalValue: 100 };
  const party = [{ id: 'p1', name: 'Fighter' }, { id: 'p2', name: 'Wizard' }];
  const shares = distributeLoot(treasure, party);
  assert(shares.length === 2, '2 shares for 2 players');
  assert(shares[0].goldShare === 50, 'even split');
}

group('Loot Engine — formatTreasureNarration');
{
  const treasure = {
    coins: { gp: 50, sp: 100 },
    gems: [{ name: 'Ruby', value: 500 }],
    artObjects: [],
    magicItems: [{ name: 'Potion of Healing' }],
    totalValue: 650
  };
  const text = formatTreasureNarration(treasure);
  assert(text.includes('50 gp'), 'includes gold');
  assert(text.includes('Ruby'), 'includes gem');
  assert(text.includes('Potion of Healing'), 'includes magic item');
}

group('Loot Engine — MAGIC_ITEM_TABLES');
assert(MAGIC_ITEM_TABLES.magic_a.length > 0, 'magic_a has items');
assert(MAGIC_ITEM_TABLES.magic_a[0].name, 'items have names');
assert(MAGIC_ITEM_TABLES.magic_a[0].rarity, 'items have rarity');

// ============================================================
// NPC ENGINE
// ============================================================
const {
  createNPC, recordInteraction, getRelationshipLevel, buildNPCDialogueContext,
  updateMood, willShareInfo, moveNPC, killNPC, generateLocationNPCs,
  formatNPCForDisplay, PERSONALITY_TRAITS, VOICE_ARCHETYPES, RELATIONSHIP_LEVELS
} = require('../src/campaign/npc-engine');

group('NPC Engine — createNPC');
{
  const npc = createNPC({ name: 'Elara', race: 'Human', role: 'innkeeper' });
  assert(npc.name === 'Elara', 'name = Elara');
  assert(npc.race === 'Human', 'race = Human');
  assert(npc.alive === true, 'alive');
  assert(npc.attitude === 0, 'default attitude = 0');
  assert(npc.personality.length > 0, 'has personality traits');
  assert(npc.voice, 'has voice');
  assert(Array.isArray(npc.memory), 'memory is array');
}

group('NPC Engine — recordInteraction');
{
  const npc = createNPC({ name: 'Guard', attitude: 0 });
  recordInteraction(npc, { playerId: 'p1', playerName: 'Fighter', summary: 'Asked about villagers', attitudeChange: 0.1 });
  assert(npc.attitude > 0, 'attitude increased');
  assert(npc.memory.length === 1, 'memory has 1 entry');
  assert(npc.relationships.p1 > 0, 'player relationship increased');
}

group('NPC Engine — getRelationshipLevel');
{
  assert(getRelationshipLevel(0.8).key === 'allied', '0.8 = allied');
  assert(getRelationshipLevel(0.4).key === 'friendly', '0.4 = friendly');
  assert(getRelationshipLevel(0).key === 'indifferent', '0 = indifferent');
  assert(getRelationshipLevel(-0.4).key === 'unfriendly', '-0.4 = unfriendly');
  assert(getRelationshipLevel(-0.8).key === 'hostile', '-0.8 = hostile');
}

group('NPC Engine — buildNPCDialogueContext');
{
  const npc = createNPC({ name: 'Elara', race: 'Human', role: 'innkeeper', attitude: 0.3 });
  const ctx = buildNPCDialogueContext(npc, { id: 'p1' });
  assert(ctx.name === 'Elara', 'context has name');
  assert(ctx.voice, 'context has voice');
  assert(ctx.personality, 'context has personality');
}

group('NPC Engine — secrets revealed only at high attitude');
{
  const npc = createNPC({ attitude: 0.1, secrets: ['saw_creature'] });
  const ctxLow = buildNPCDialogueContext(npc);
  assert(ctxLow.secretsRevealed.length === 0, 'secrets hidden at low attitude');
  npc.attitude = 0.7;
  const ctxHigh = buildNPCDialogueContext(npc);
  assert(ctxHigh.secretsRevealed.length === 1, 'secrets revealed at high attitude');
}

group('NPC Engine — updateMood');
{
  const npc = createNPC({ mood: 'neutral' });
  updateMood(npc, { type: 'threat' });
  assert(npc.mood === 'frightened', 'neutral + threat = frightened');
}

group('NPC Engine — willShareInfo');
{
  const npc = createNPC({ knownInfo: ['rumors'], secrets: ['dark_secret'], attitude: 0 });
  assert(willShareInfo(npc, 'rumors') === true, 'shares known info at neutral');
  assert(willShareInfo(npc, 'dark_secret') === false, 'hides secret at neutral');
  npc.attitude = 0.7;
  assert(willShareInfo(npc, 'dark_secret') === true, 'reveals secret at high attitude');
}

group('NPC Engine — moveNPC / killNPC');
{
  const npc = createNPC({ location: 'tavern' });
  moveNPC(npc, 'market');
  assert(npc.location === 'market', 'moved to market');
  killNPC(npc, 'combat');
  assert(npc.alive === false, 'dead');
}

group('NPC Engine — generateLocationNPCs');
{
  const npcs = generateLocationNPCs('tavern', { count: 3 });
  assert(npcs.length === 3, 'generated 3 NPCs');
  assert(npcs[0].location === 'tavern', 'location set');
}

group('NPC Engine — formatNPCForDisplay');
{
  const npc = createNPC({ name: 'Elara', role: 'innkeeper', attitude: 0.3 });
  const display = formatNPCForDisplay(npc);
  assert(display.name === 'Elara', 'display name');
  assert(display.relationship === 'Friendly', 'display relationship');
}

group('NPC Engine — constants');
assert(Object.keys(PERSONALITY_TRAITS).length > 10, '10+ personality traits');
assert(Object.keys(VOICE_ARCHETYPES).length > 5, '5+ voice archetypes');
assert(Object.keys(RELATIONSHIP_LEVELS).length === 5, '5 relationship levels');

// ============================================================
// SESSION PERSISTENCE
// ============================================================
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  saveCampaign, loadCampaign, listSavedCampaigns, deleteCampaign,
  generateCampaignJournal, shouldAutoSave, ensureSaveDir
} = require('../src/campaign/session-persistence');

const TEST_SAVE_DIR = path.join(os.tmpdir(), 'binding-test-saves-' + Date.now());

group('Session Persistence — save and load');
{
  const session = {
    id: 'test-campaign-1', sessionName: 'Test Campaign',
    worldState: { turnCount: 5 },
    campaign: {
      theme: 'gothic_horror',
      world: { locations: {}, npcs: {}, currentLocation: 'tavern', dayCount: 1, timeOfDay: 'evening', weather: 'clear' },
      quests: { active: [], completed: [], available: [], failed: [] },
      campaignLog: [], campaignFlags: {},
      dmContext: { currentSituation: null, activeThreads: [], recentEvents: [], tensionLevel: 0.3 },
      lastSaved: null, turnSinceLastSave: 5, autoSaveInterval: 10
    },
    players: [{ id: 'p1', character: { name: 'Fighter', class: 'Fighter', level: 1, hp: 10 } }]
  };
  const result = saveCampaign(session, { saveDir: TEST_SAVE_DIR });
  assert(result.campaignId === 'test-campaign-1', 'returns campaign id');
  assert(fs.existsSync(result.savePath), 'primary save file exists');
  assert(result.turnCount === 5, 'turnCount = 5');
  const loaded = loadCampaign('test-campaign-1', { saveDir: TEST_SAVE_DIR });
  assert(loaded.session.id === 'test-campaign-1', 'loaded correct campaign');
  assert(loaded.turnCount === 5, 'turnCount preserved');
}

group('Session Persistence — listSavedCampaigns');
{
  const list = listSavedCampaigns({ saveDir: TEST_SAVE_DIR });
  assert(list.length >= 1, 'at least 1 campaign listed');
  assert(list[0].campaignId === 'test-campaign-1', 'lists test campaign');
}

group('Session Persistence — shouldAutoSave');
{
  assert(shouldAutoSave({ campaign: { turnSinceLastSave: 10 } }, 10) === true, 'should save at interval');
  assert(shouldAutoSave({ campaign: { turnSinceLastSave: 5 } }, 10) === false, 'should not save below interval');
}

group('Session Persistence — generateCampaignJournal');
{
  const session = {
    sessionName: 'Gothic Horror Campaign',
    campaign: {
      lastSaved: Date.now(), theme: 'gothic_horror',
      world: {
        dayCount: 3, timeOfDay: 'evening', weather: 'foggy', currentLocation: 'tavern',
        locations: { tavern: { name: 'The Rusty Flagon', discovered: true } },
        npcs: { innkeeper: { name: 'Elara', role: 'innkeeper', alive: true, attitude: 0.3, location: 'tavern' } }
      },
      quests: {
        active: [{ name: 'Find Villagers', description: 'Three vanished', objectives: [{ text: 'Search forest', completed: false }] }],
        completed: [{ name: 'Deliver Letter' }]
      },
      campaignLog: [{ type: 'campaign_started', data: { theme: 'gothic_horror' }, turn: 0, timestamp: Date.now() }]
    },
    players: [{ character: { name: 'Fighter', class: 'Fighter', level: 2, hp: 15 } }]
  };
  const journal = generateCampaignJournal(session);
  assert(journal.includes('Gothic Horror Campaign'), 'includes campaign name');
  assert(journal.includes('Day'), 'includes day count');
  assert(journal.includes('Fighter'), 'includes player name');
  assert(journal.includes('Find Villagers'), 'includes active quest');
  assert(journal.includes('Elara'), 'includes NPC');
}

group('Session Persistence — deleteCampaign');
{
  const result = deleteCampaign('test-campaign-1', { saveDir: TEST_SAVE_DIR });
  assert(result.deletedFiles > 0, 'deleted files');
  const list = listSavedCampaigns({ saveDir: TEST_SAVE_DIR });
  assert(list.length === 0, 'no campaigns after delete');
}

// Cleanup
try { fs.rmSync(TEST_SAVE_DIR, { recursive: true, force: true }); } catch (e) {}

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n═════════════════════════════════════════════════════════════`);
console.log(`  Phase 2B/2C/2D Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`═════════════════════════════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
