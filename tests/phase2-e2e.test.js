/**
 * Phase 2A E2E Integration Test — Full Campaign Flow
 *
 * Tests: create campaign → add player → start → process action →
 * apply DM response → parse tags → save → resume
 */
const assert = require('assert');

const {
  createCampaignSession, startCampaign, processCampaignAction,
  applyWorldChanges, parseDMResponseTags, saveCampaign, resumeCampaign,
  getCampaignSummary, CAMPAIGN_THEMES
} = require('../src/campaign/index');
const { addPlayer, SessionState } = require('../src/session');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (err) { failed++; console.log(`  ❌ ${name}: ${err.message}`); }
}

console.log('\n=== Phase 2A: E2E Integration Test ===\n');

// --- Full Campaign Lifecycle ---
console.log('--- Full Campaign Lifecycle ---');

test('E2E: Create → Start → Act → Apply → Save → Resume', () => {
  // 1. Create campaign
  const session = createCampaignSession({
    theme: 'gothic_horror',
    sessionName: 'E2E Test Campaign'
  });
  assert.strictEqual(session.state, SessionState.LOBBY);
  assert.strictEqual(session.campaign.theme, 'gothic_horror');

  // 2. Add player
  const player = addPlayer(session, {
    name: 'E2E Hero',
    class: 'rogue',
    race: 'elf',
    level: 1,
    hp: { current: 10, max: 10 }
  });
  assert.ok(player.id);
  assert.strictEqual(player.character.name, 'E2E Hero');

  // 3. Start campaign — generates world
  const startResult = startCampaign(session);
  assert.ok(startResult.world);
  assert.ok(startResult.openingNarration);
  assert.ok(startResult.availableQuests.length > 0);
  assert.strictEqual(session.state, SessionState.ACTIVE);
  assert.ok(session.campaign.world);
  assert.strictEqual(session.campaign.world.currentLocation, 'loc_tavern');

  // 4. Process player action
  const actionResult = processCampaignAction(session, player.id, 'I ask the innkeeper about the missing villagers');
  assert.ok(actionResult.dmContext);
  assert.strictEqual(actionResult.dmContext.party.length, 1);
  assert.strictEqual(actionResult.dmContext.party[0].name, 'E2E Hero');
  assert.strictEqual(session.worldState.turnCount, 1);

  // 5. Apply DM response with tags
  const dmNarration = `The innkeeper's face darkens. "Aye, three gone in as many nights," she whispers, sliding a tankard toward you. 
  [NPC_ATTITUDE: npc_innkeeper, +0.2, "shared concerns about missing villagers"]
  She glances toward the door. "The last one taken was young Tomas. His mother found only this outside his window."
  [ITEM_GRANTED: torn_cloth, to: E2E Hero]
  [QUEST_UPDATE: quest_missing_villagers, accepted]`;

  const changes = applyWorldChanges(session, dmNarration);
  assert.strictEqual(changes.npcUpdates.length, 1);
  assert.strictEqual(changes.npcUpdates[0].attitude, 0.2);
  assert.strictEqual(changes.itemsGranted.length, 1);
  assert.strictEqual(changes.itemsGranted[0].item, 'torn_cloth');
  assert.strictEqual(changes.questUpdates.length, 1);

  // 6. Verify world state updated
  assert.strictEqual(session.campaign.world.npcs['npc_innkeeper'].attitude, 0.2);

  // 7. Second action — location change
  const action2 = processCampaignAction(session, player.id, 'I head to the village square to investigate');
  assert.strictEqual(session.worldState.turnCount, 2);

  const dmNarration2 = `You step out into the fog-shrouded street. The village square is eerily quiet.
  [LOCATION_MOVED: loc_village]
  [TIME_ADVANCED: night]
  A figure watches you from the shadows of the church steps.`;

  const changes2 = applyWorldChanges(session, dmNarration2);
  assert.strictEqual(changes2.locationMoved, 'loc_village');
  assert.strictEqual(session.campaign.world.currentLocation, 'loc_village');
  assert.strictEqual(session.campaign.world.timeOfDay, 'night');

  // 8. Save campaign
  const saved = saveCampaign(session);
  assert.strictEqual(saved.state, SessionState.PAUSED);
  assert.ok(saved.campaign.lastSaved);
  assert.strictEqual(saved.worldState.turnCount, 2);

  // 9. Resume campaign
  const resumed = resumeCampaign(saved);
  assert.strictEqual(resumed.state, SessionState.ACTIVE);
  assert.strictEqual(resumed.campaign.world.currentLocation, 'loc_village');
  assert.strictEqual(resumed.worldState.turnCount, 2);

  // 10. Verify campaign summary
  const summary = getCampaignSummary(resumed);
  assert.ok(summary.includes('Day 1'));
  assert.ok(summary.includes('night'));
  assert.ok(summary.includes('E2E Hero'));
  const locName = session.campaign.world.locations[session.campaign.world.currentLocation]?.name;
  assert.ok(summary.includes(locName), `Summary should include location '${locName}'`);
});

test('E2E: Multi-tag DM response parses correctly', () => {
  const session = createCampaignSession({ theme: 'sword_coast' });
  addPlayer(session, { name: 'Warrior', class: 'fighter', race: 'human', level: 1, hp: { current: 12, max: 12 } });
  startCampaign(session);

  const complexNarration = `You enter the bustling market. 
  [LOCATION_MOVED: loc_town]
  A merchant waves you over. "Fresh potions, just arrived!"
  [NPC_ATTITUDE: npc_merchant, +0.5, "offered fair prices"]
  [WEATHER: sunny with light breeze]
  [FLAG: visited_market, true]
  [ITEM_GRANTED: health_potion, to: Warrior]
  [TIME_ADVANCED: afternoon]`;

  const changes = applyWorldChanges(session, complexNarration);
  assert.strictEqual(changes.locationMoved, 'loc_town');
  assert.strictEqual(changes.npcUpdates.length, 1);
  assert.strictEqual(changes.weather, 'sunny with light breeze');
  assert.strictEqual(changes.flags.visited_market, 'true');
  assert.strictEqual(changes.itemsGranted.length, 1);
  assert.strictEqual(changes.timeAdvanced, true);
  assert.strictEqual(changes.timeOfDay, 'afternoon');
});

test('E2E: Campaign summary reflects current state', () => {
  const session = createCampaignSession({ theme: 'noir_mystery' });
  addPlayer(session, { name: 'Detective', class: 'rogue', race: 'human', level: 1, hp: { current: 8, max: 8 } });
  startCampaign(session);

  // Process a few actions
  processCampaignAction(session, session.players[0].id, 'I examine the crime scene');
  applyWorldChanges(session, 'You find a clue. [FLAG: found_clue_1, true]');
  processCampaignAction(session, session.players[0].id, 'I question the witness');
  applyWorldChanges(session, 'The witness is nervous. [NPC_ATTITUDE: npc_informant, +0.3]');

  const summary = getCampaignSummary(session);
  assert.ok(summary.includes('Day 1'));
  assert.ok(summary.includes('Detective'));
  assert.ok(summary.includes('rogue'));
});

// ════════════════════════════════════════════════════════════════════════════
// RESULTS
// ════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`);
console.log(`  E2E Integration Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'═'.repeat(60)}\n`);
process.exit(failed > 0 ? 1 : 0);
