/**
 * The Binding — Phase 1 Test Suite
 *
 * Tests the core systems: dice, rule engine, character, scene engine,
 * adventure/manifests, session, message router, coin engine.
 * Run with: node tests/phase1.test.js
 */

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, label) {
  total++;
  if (condition) {
    passed++;
    console.log('  ✓ ' + label);
  } else {
    failed++;
    console.error('  ✗ ' + label);
  }
}

function assertEq(actual, expected, label) {
  total++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log('  ✓ ' + label);
  } else {
    failed++;
    console.error('  ✗ ' + label + ' — expected ' + e + ', got ' + a);
  }
}

function section(name) {
  console.log('\n═══ ' + name + ' ═══');
}

// ─── DICE ────────────────────────────────────────────────────────────
section('Dice System');
const DiceService = require('../src/dice');

{
  // Basic d20 roll
  const result = DiceService.rollDice({ type: 'd20' });
  assert(result.total >= 1 && result.total <= 20, 'd20 roll in range [1-20]: got ' + result.total);
  assert(result.proof, 'd20 roll has a proof');
  assert(result.rolls && result.rolls.length === 1, 'd20 produces 1 roll');

  // 2d6 roll
  const two = DiceService.rollDice({ type: 'd6', count: 2 });
  assert(two.total >= 2 && two.total <= 12, '2d6 roll in range [2-12]: got ' + two.total);
  assert(two.rolls.length === 2, '2d6 produces 2 rolls');

  // d20+5
  const mod = DiceService.rollDice({ type: 'd20', modifier: 5 });
  assert(mod.total >= 6 && mod.total <= 25, 'd20+5 in range [6-25]: got ' + mod.total);

  // 2d8+3
  const modded = DiceService.rollDice({ type: 'd8', count: 2, modifier: 3 });
  assert(modded.total >= 5 && modded.total <= 19, '2d8+3 in range [5-19]: got ' + modded.total);
  assert(modded.rolls.length === 2, '2d8+3 produces 2 rolls');

  // Verify proof
  const verified = DiceService.verifyRollProof(result);
  assert(verified, 'd20 proof verifies');

  // Random int bounds
  const ri = DiceService.randomInt(1, 20);
  assert(ri >= 1 && ri <= 20, 'randomInt(1,20) in range: got ' + ri);
}

// ─── RULE ENGINE ─────────────────────────────────────────────────────
section('Rule Engine');
const RuleEngine = require('../src/rule-engine');

{
  // Ability modifier
  assertEq(RuleEngine.abilityModifier(10), 0, 'abilityModifier(10) = 0');
  assertEq(RuleEngine.abilityModifier(16), 3, 'abilityModifier(16) = 3');
  assertEq(RuleEngine.abilityModifier(8), -1, 'abilityModifier(8) = -1');
  assertEq(RuleEngine.abilityModifier(20), 5, 'abilityModifier(20) = 5');

  // Proficiency bonus by level
  assertEq(RuleEngine.proficiencyBonus(1), 2, 'proficiencyBonus(1) = 2');
  assertEq(RuleEngine.proficiencyBonus(5), 3, 'proficiencyBonus(5) = 3');
  assertEq(RuleEngine.proficiencyBonus(9), 4, 'proficiencyBonus(9) = 4');

  // XP table
  assertEq(RuleEngine.xpForNextLevel(1), 300, 'xpForNextLevel(1) = 300');

  // Standard array
  const arr = [...RuleEngine.STANDARD_ARRAY];
  assert(Array.isArray(arr) && arr.length === 6, 'Standard array has 6 values');
  assertEq(arr.sort((a,b)=>a-b).join(','), '8,10,12,13,14,15', 'Standard array = [8,10,12,13,14,15]');

  // Point buy validation
  const pb = RuleEngine.validatePointBuy({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
  assert(pb.valid, 'Valid point buy passes');

  // Combat: attack resolution
  const atk = RuleEngine.resolveAttack({
    attackBonus: 5,
    targetAC: 15,
    diceExpression: '1d8+3'
  });
  assert(atk !== undefined, 'resolveAttack returns a result');
  assert(typeof atk.hit === 'boolean', 'resolveAttack has hit boolean');
  if (atk.hit) {
    assert(atk.damage >= 1, 'Hit does >= 1 damage');
  }

  // Races
  const human = RuleEngine.getRace('human');
  assert(human, 'Human race defined');
  assert(human.speed === 30, 'Human speed = 30');

  const elf = RuleEngine.getRace('elf');
  assert(elf, 'Elf race defined');
  assert(elf.subraces && elf.subraces.length > 0, 'Elf has subraces');

  // Classes
  const fighter = RuleEngine.getClass('fighter');
  assert(fighter, 'Fighter class defined');
  assertEq(fighter.hitDie, 'd10', 'Fighter hit die = d10');

  const wizard = RuleEngine.getClass('wizard');
  assert(wizard, 'Wizard class defined');
  assertEq(wizard.hitDie, 'd6', 'Wizard hit die = d6');

  // Character via rule engine
  const reChar = RuleEngine.createCharacter({
    name: 'REHero',
    race: 'human',
    classId: 'fighter',
    stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 }
  });
  assert(reChar, 'RE character created');
  assert(reChar.hp && reChar.hp.max > 0, 'RE character has HP > 0');
  assert(reChar.ac >= 10, 'RE character AC >= 10');

  // Damage/healing via rule engine
  const hpBefore = reChar.hp.current;
  RuleEngine.applyDamage(reChar, 5);
  assert(reChar.hp.current === hpBefore - 5, 'applyDamage reduces HP by 5');
  RuleEngine.applyHealing(reChar, 3);
  assert(reChar.hp.current === hpBefore - 2, 'applyHealing restores 3 HP');
}

// ─── CHARACTER SERVICE ───────────────────────────────────────────────
section('Character Service');
const CharacterService = require('../src/character');

{
  const char = CharacterService.createCharacter({
    userId: 'test-user-1',
    name: 'TestHero',
    race: 'human',
    characterClass: 'fighter',
    alignment: 'lawful-good'
  });

  assert(char, 'Character created');
  assertEq(char.name, 'TestHero', 'Character name = TestHero');
  assert(char.level === 1, 'Character starts at level 1');
  assert(char.hp && char.hp.current > 0, 'Character has HP > 0');

  // XP gain
  const lvlBefore = char.level;
  CharacterService.gainXP(char, 300);
  assert(char.level >= lvlBefore, 'XP gain can trigger level up');

  // Summary
  const summary = CharacterService.getCharacterSummary(char);
  assert(summary && summary.length > 10, 'Character summary is a non-trivial string');
}

// ─── SCENE ENGINE ────────────────────────────────────────────────────
section('Scene Engine');
const SceneEngine = require('../src/scene-engine');

{
  // Enter scene with a manifest
  const state = SceneEngine.enterScene({
    sceneId: 'test_scene',
    sceneName: 'Test Room',
    content: [
      { id: 'examine_desk', label: 'Examine the desk', keywords: ['desk', 'examine', 'inspect', 'wooden', 'drawer', 'surface', 'old'], discovery: 'You find a hidden drawer.' },
      { id: 'talk_npc', label: 'Talk to the innkeeper', keywords: ['innkeeper', 'talk', 'speak', 'ask', 'bald', 'stout', 'man'] },
      { id: 'look_window', label: 'Look out the window', keywords: ['window', 'look', 'outside', 'glass', 'street', 'view', 'night'] }
    ],
    exitAction: 'leave_room',
    exitLabel: 'Leave the room',
    hardExitNarration: 'You are ushered out.'
  });

  assert(state, 'Scene state created');
  assertEq(state.sceneId, 'test_scene', 'Scene ID matches');
  assertEq(state.totalItems, 3, '3 content items');
  assert(state.turnCount === 0, 'Starts at turn 0');

  // Process a turn with a matching action
  const updated = SceneEngine.processTurn(state, 'You examine the old wooden desk closely.', 'I examine the desk');
  assert(updated.turnCount === 1, 'Turn count incremented');
  assert(updated.discoveredIds.has('examine_desk'), 'examine_desk discovered by keywords');
  assert(SceneEngine.getCompletion(updated) > 0, 'Completion > 0 after discovery');

  // Process another turn
  SceneEngine.processTurn(updated, 'The innkeeper tells you about the castle.', 'I talk to the innkeeper about the castle');
  assert(updated.discoveredIds.has('talk_npc'), 'talk_npc discovered');

  // Check pressure
  const pressure = SceneEngine.getPressureLevel(updated);
  assert(pressure === 'background' || pressure === 'gentle' || pressure === 'strong', 'Pressure level is valid: ' + pressure);

  // Exit action
  const exit = SceneEngine.getExitAction(updated);
  assert(exit, 'Exit action exists');
  assertEq(exit.label, 'Leave the room', 'Exit label matches');
}

// ─── ADVENTURE + MANIFESTS ───────────────────────────────────────────
section('Adventure + Dracula Manifests');
const { DraculaAdventure, getScene, getStartScene, getDMGuidance, getAdventureOutline } = require('../src/adventure/dracula');

{
  assertEq(DraculaAdventure.id, 'dracula', 'Adventure ID = dracula');
  assertEq(DraculaAdventure.totalScenes, 25, '25 total scenes');

  // All 25 manifests present
  const manifestKeys = Object.keys(DraculaAdventure.sceneManifests);
  assertEq(manifestKeys.length, 25, '25 scene manifests loaded');

  // Every scene has a manifest
  for (let i = 0; i < 25; i++) {
    const key = 'scene_' + String(i).padStart(2, '0');
    assert(DraculaAdventure.sceneManifests[key], key + ' manifest exists');
  }

  // Get start scene
  const start = getStartScene();
  assert(start, 'Start scene exists');
  assertEq(start.id, 'scene_00', 'Start scene = scene_00');

  // Scene 00 has content
  const m0 = DraculaAdventure.sceneManifests.scene_00;
  assert(m0.content && m0.content.length >= 3, 'Scene 00 has 3+ content items');
  assert(m0.description && m0.description.length > 100, 'Scene 00 has rich description');
  assert(m0.exitAction, 'Scene 00 has exit action');
  assert(m0.initialFacts, 'Scene 00 has initial facts');
  assert(m0.locationKeywords, 'Scene 00 has location keywords');

  // Scene 24 is final
  const m24 = DraculaAdventure.sceneManifests.scene_24;
  assert(m24, 'Scene 24 manifest exists');
  assert(m24.exitLabel && m24.exitLabel.toLowerCase().includes('dawn'), 'Scene 24 exit references dawn');

  // Adventure outline
  const outline = getAdventureOutline();
  assert(outline.includes('Journey'), 'Outline includes Act 1');
  assert(outline.includes('Final Battle'), 'Outline includes Act 5');

  // Key NPCs
  assert(DraculaAdventure.keyNPCs.length >= 8, '8+ key NPCs defined');
  const dracNpc = DraculaAdventure.keyNPCs.find(n => n.id === 'dracula');
  assert(dracNpc && dracNpc.role === 'Antagonist', 'Dracula is the antagonist');
}

// ─── SESSION ─────────────────────────────────────────────────────────
section('Session Management');
const Session = require('../src/session');

{
  const session = Session.createSession({ adventureId: 'dracula' });
  assert(session, 'Session created');
  assert(session.worldState, 'Session has world state');

  // Add player
  Session.addPlayer(session, { id: 'p1', name: 'TestHero' });
  const player = Session.getPlayer(session, 'p1');
  assert(player, 'Player retrieved');
  assertEq(player.name, 'TestHero', 'Player name matches');

  // World state
  Session.updateWorldState(session, { currentScene: 'scene_00' });
  assertEq(session.worldState.currentScene, 'scene_00', 'Current scene updated');

  // Flags
  Session.setFlag(session, 'met_innkeeper');
  assert(Session.hasFlag(session, 'met_innkeeper'), 'Flag set and checked');
  assert(!Session.hasFlag(session, 'met_dracula'), 'Unchecked flag returns false');

  // NPC tracking
  Session.addNPC(session, { id: 'innkeeper', name: 'The Innkeeper', attitude: 'friendly' });
  assert(session.worldState.npcs.innkeeper, 'NPC added');
}

// ─── MESSAGE ROUTER ──────────────────────────────────────────────────
section('Message Router');
const MessageRouter = require('../src/session/message-router');

{
  const msg = MessageRouter.narration('The fire crackles in the hearth.');
  assert(msg.type === 'narration', 'Narration type correct');
  assertEq(msg.content, 'The fire crackles in the hearth.', 'Narration content matches');
  assert(msg.id, 'Message has ID');
  assert(msg.timestamp, 'Message has timestamp');

  const coin = MessageRouter.coinReward({ amount: 5, reason: 'creative solution', category: 'creativity' });
  assert(coin.type === 'coin_reward', 'Coin reward type correct');
  assertEq(coin.metadata.coinAmount.amount, 5, 'Coin amount = 5');

  const actions = MessageRouter.suggestedActions([
    { label: 'Examine the desk', type: 'exploration' },
    { label: 'Talk to the innkeeper', type: 'exploration' },
    { label: 'Board the coach', type: 'exit' }
  ]);
  assert(actions.type === 'suggested_actions', 'Actions type correct');
  assert(actions.metadata.actions.length === 3, '3 suggested actions');
}

// ─── COIN ENGINE ─────────────────────────────────────────────────────
section('Coin Engine');
const CoinEngine = require('../src/coin-engine');

{
  const pool = CoinEngine.createCoinPool({
    totalScenes: 25,
    difficulty: 'medium',
    adventureId: 'dracula'
  });
  assert(pool, 'Coin pool created');
  assert(pool.totalBudget > 0, 'Pool has a positive budget');

  // Score a turn
  const scores = CoinEngine.scoreTurn(pool, 'scene_00', {
    creativity: 7,
    investigation: 5,
    roleplay: 3,
    combat: 0,
    exploration: 4
  });
  assert(scores, 'Turn scored');
  assert(typeof scores.total === 'number', 'Score has total');
}

// ─── CONTINUITY VALIDATOR ────────────────────────────────────────────
section('Continuity Validator');
const { createValidator } = require('../src/scene-engine/continuity-validator');

{
  const v = createValidator({
    sceneName: 'The Inn',
    sceneId: 'scene_00',
    initialFacts: {
      items: ['crucifix'],
      metNPCs: ['innkeeper'],
      established: ['at the inn']
    }
  }, 'You are standing in a warm inn.');

  assert(v, 'Validator created');

  // Valid response
  const ok = v.validate('The innkeeper pours you a drink. The fire crackles warmly.', 'I talk to the innkeeper');
  assert(ok.valid, 'Valid response passes validation');

  // Accumulate facts
  v.accumulate('You pick up a rusty key from the table.');
  assert(v.facts.items.includes('rusty key'), 'Accumulated item tracked');
}

// ─── CONTEXT MANAGER ─────────────────────────────────────────────────
section('Context Manager');
const CM = require('../src/ai-dm/context-manager');

{
  const ctx = CM.createContextManager();
  assert(ctx, 'Context manager created');

  // Add turns
  CM.addTurn(ctx, 'user', 'I look around the room.');
  CM.addTurn(ctx, 'assistant', 'The room is dim and cold.');

  const stats = CM.getStats(ctx);
  assert(stats, 'Stats returned');
  assert(stats.hotCount >= 2, 'Hot buffer has 2+ messages');

  // Build context for LLM
  const messages = CM.buildContext(ctx, 'You are a dungeon master.');
  assert(Array.isArray(messages), 'buildContext returns array');
  assert(messages.length >= 3, 'Messages has system + 2+ user/assistant');
  assert(messages[0].role === 'system', 'First message is system');
}

// ─── API SERVER (smoke test) ─────────────────────────────────────────
section('API Server');
const { createServer } = require('../src/api/server');

async function testServer() {
  const server = await createServer({
    llmConfig: { mock: true, apiKey: '', baseUrl: '', model: 'mock' }
  });

  // Health check
  const health = await server.inject({ method: 'GET', url: '/api/health' });
  assertEq(health.statusCode, 200, 'GET /api/health = 200');
  const body = JSON.parse(health.payload);
  assert(body.status === 'ok', 'Health returns status ok');

  // List adventures
  const adv = await server.inject({ method: 'GET', url: '/api/adventures' });
  assertEq(adv.statusCode, 200, 'GET /api/adventures = 200');
  const adventures = JSON.parse(adv.payload);
  assert(adventures.length > 0, 'At least 1 adventure listed');
  assert(adventures.find(a => a.id === 'dracula'), 'Dracula adventure listed');

  // Create session
  const session = await server.inject({
    method: 'POST',
    url: '/api/sessions',
    payload: {
      adventureId: 'dracula',
      playerName: 'TestHero',
      characterClass: 'fighter',
      characterRace: 'human'
    }
  });
  assertEq(session.statusCode, 200, 'POST /api/sessions = 200');
  const s = JSON.parse(session.payload);
  assert(s.sessionId, 'Session has sessionId');
  assert(s.character, 'Session has character');
  assert(s.rejoinCode, 'Session has rejoin code');
  assert(s.messages && s.messages.length > 0, 'Opening messages returned');

  const sid = s.sessionId;

  // Get session info
  const info = await server.inject({ method: 'GET', url: '/api/sessions/' + sid });
  assertEq(info.statusCode, 200, 'GET /api/sessions/:id = 200');

  // Send an action
  const action = await server.inject({
    method: 'POST',
    url: '/api/sessions/' + sid + '/actions',
    payload: { type: 'action', content: 'I examine the brass crucifix.' }
  });
  assertEq(action.statusCode, 200, 'POST action = 200');
  const actionResp = JSON.parse(action.payload);
  assert(actionResp.narrative, 'Action response has narrative');
  assert(actionResp.suggestedActions, 'Action response has suggested actions');
  assert(Array.isArray(actionResp.suggestedActions), 'Suggested actions is array');

  // Poll for messages
  const msgs = await server.inject({ method: 'GET', url: '/api/sessions/' + sid + '/messages?after=0' });
  assertEq(msgs.statusCode, 200, 'GET messages = 200');
  const msgData = JSON.parse(msgs.payload);
  assert(msgData.messages && msgData.messages.length > 0, 'Polling returns messages');

  // Rejoin by code
  const rejoin = await server.inject({ method: 'GET', url: '/api/rejoin/' + s.rejoinCode });
  assertEq(rejoin.statusCode, 200, 'GET /api/rejoin/:code = 200');
  const rj = JSON.parse(rejoin.payload);
  assertEq(rj.sessionId, sid, 'Rejoin returns same session ID');

  await server.close();
}

testServer().then(() => {
  // ─── SUMMARY ──────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('  RESULTS: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
  console.log('═══════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('\n  ✗ Test server error:', err.message);
  process.exit(1);
});
