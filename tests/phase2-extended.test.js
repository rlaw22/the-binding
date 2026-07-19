/**
 * Phase 2 Extended Tests — New modules: lobby, whisper, leveling, dungeon, STT
 */

let passed = 0, failed = 0;
function group(name) { console.log(`\n--- ${name} ---`); }
function assert(cond, label) {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}`); failed++; }
}
function assertThrows(fn, label) {
  try { fn(); assert(false, label + ' (should throw)'); } catch (e) { assert(true, label); }
}

// ══════════════════════════════════════════════════════════════
// LOBBY MANAGER
// ══════════════════════════════════════════════════════════════
const {
  createLobby, generateInviteCode, joinLobby, setReady, isAllReady,
  startFromLobby, leaveLobby, kickPlayer, getLobbyState, transferHost
} = require('../src/campaign/lobby-manager');
const { createSession, addPlayer, SessionMode, SessionState } = require('../src/session');

group('Lobby Manager — createLobby');
{
  const session = createSession({ mode: SessionMode.CAMPAIGN, sessionName: 'Test' });
  const host = addPlayer(session, { name: 'Host', class: 'fighter', race: 'human', level: 1, hp: { current: 10, max: 10 } });
  const lobby = createLobby(session, host);
  assert(lobby !== null, 'createLobby returns lobby');
  assert(session.lobby, 'session has lobby state');
  assert(session.lobby.inviteCode, 'lobby has invite code');
  assert(session.lobby.inviteCode.length === 6, 'invite code is 6 chars');
}

group('Lobby Manager — generateInviteCode');
{
  const code = generateInviteCode();
  assert(typeof code === 'string', 'returns string');
  assert(code.length === 6, '6 characters');
  assert(code.match(/^[A-Z0-9]+$/), 'alphanumeric uppercase');
}

group('Lobby Manager — joinLobby');
{
  const session = createSession({ mode: SessionMode.CAMPAIGN, sessionName: 'Test' });
  const host = addPlayer(session, { name: 'Host', class: 'fighter', race: 'human', level: 1, hp: { current: 10, max: 10 } });
  createLobby(session, host);
  const code = session.lobby.inviteCode;
  const result = joinLobby(session, code, { name: 'Player2', class: 'wizard', race: 'elf' });
  assert(result !== null, 'joinLobby returns result');
  assert(session.players.length === 3, '3 players after join (host + lobby entry + joiner)');
}

group('Lobby Manager — setReady / isAllReady');
{
  const session = createSession({ mode: SessionMode.CAMPAIGN, sessionName: 'Test' });
  const host = addPlayer(session, { name: 'Host', class: 'fighter', race: 'human', level: 1, hp: { current: 10, max: 10 } });
  createLobby(session, host);
  setReady(session, host.id, true);
  assert(isAllReady(session) === true, 'all ready after host sets ready');
}

group('Lobby Manager — startFromLobby');
{
  const session = createSession({ mode: SessionMode.CAMPAIGN, sessionName: 'Test' });
  const host = addPlayer(session, { name: 'Host', class: 'fighter', race: 'human', level: 1, hp: { current: 10, max: 10 } });
  createLobby(session, host);
  setReady(session, host.id, true);
  startFromLobby(session);
  assert(session.state === SessionState.ACTIVE, 'session is ACTIVE after start');
}

group('Lobby Manager — leaveLobby');
{
  const session = createSession({ mode: SessionMode.CAMPAIGN, sessionName: 'Test' });
  const host = addPlayer(session, { name: 'Host', class: 'fighter', race: 'human', level: 1, hp: { current: 10, max: 10 } });
  createLobby(session, host);
  joinLobby(session, session.lobby.inviteCode, { name: 'P2', class: 'wizard', race: 'elf' });
  assert(session.players.length === 3, '3 players before leave');
  leaveLobby(session, session.players[2].id);
  assert(session.players.length === 2, '2 players after leave');
}

group('Lobby Manager — getLobbyState');
{
  const session = createSession({ mode: SessionMode.CAMPAIGN, sessionName: 'Test' });
  const host = addPlayer(session, { name: 'Host', class: 'fighter', race: 'human', level: 1, hp: { current: 10, max: 10 } });
  createLobby(session, host);
  const state = getLobbyState(session);
  assert(state !== null, 'getLobbyState returns state');
  assert(state.inviteCode, 'has invite code');
  assert(typeof state.currentPlayerCount === 'number', 'has player count');
}

// ══════════════════════════════════════════════════════════════
// WHISPER SYSTEM
// ══════════════════════════════════════════════════════════════
const {
  WhisperType, createWhisper, broadcastToAll, whisperToPlayer, whisperToParty,
  whisperToDM, getWhisperHistory, getVisibleMessages, createPrivateContext,
  createSharedContext, formatWhisperForDisplay
} = require('../src/campaign/whisper-system');

group('Whisper System — createWhisper');
{
  const w = createWhisper('dm', ['p1'], 'You notice a hidden door.');
  assert(w.content === 'You notice a hidden door.', 'has content');
  assert(w.metadata && (w.metadata.fromId === 'dm' || w.metadata.from === 'dm'), 'has from in metadata');
  assert(w.targets.includes('p1'), 'has target');
  assert(w.type === 'whisper', 'type is whisper');
  assert(w.id, 'has id');
}

group('Whisper System — broadcastToAll');
{
  const session = { players: [{ id: 'p1' }, { id: 'p2' }] };
  const w = broadcastToAll(session, 'The dragon roars!');
  assert(w.targets.length === 2, 'targets all players');
  assert(w.metadata && w.metadata.whisperType === 'broadcast', 'type is broadcast in metadata');
}

group('Whisper System — whisperToPlayer');
{
  const session = { players: [{ id: 'p1' }, { id: 'p2' }] };
  const w = whisperToPlayer(session, 'dm', 'p1', 'Secret message');
  assert(w.targets.length === 1, 'single target');
  assert(w.targets[0] === 'p1', 'correct target');
}

group('Whisper System — whisperToParty');
{
  const session = { players: [{ id: 'p1' }, { id: 'p2' }] };
  const w = whisperToParty(session, 'The innkeeper speaks.');
  assert(w.targets.length === 2, 'targets all');
  assert(w.metadata && w.metadata.whisperType === 'dm_narration', 'dm_narration type in metadata');
}

group('Whisper System — whisperToDM');
{
  const w = whisperToDM({}, 'p1', 'I search for traps');
  assert(w.targets[0] === 'dm', 'target is dm');
  assert(w.metadata && w.metadata.whisperType === 'player_to_dm', 'player_to_dm type in metadata');
}

group('Whisper System — formatWhisperForDisplay');
{
  const w = createWhisper('dm', ['p1'], 'Test');
  const display = formatWhisperForDisplay(w);
  assert(display.content === 'Test', 'has content');
  assert(typeof display.label === 'string', 'has label');
}

group('Whisper System — createPrivateContext');
{
  const session = { players: [{ id: 'p1', character: { name: 'Hero' } }], whisperHistory: [] };
  const ctx = createPrivateContext(session, 'p1');
  assert(ctx !== null, 'returns context');
}

// ══════════════════════════════════════════════════════════════
// LEVELING SYSTEM
// ══════════════════════════════════════════════════════════════
const {
  XP_TABLE, MAX_LEVEL, getLevelFromXP, getXPForNextLevel, getXPProgress,
  awardXP, awardPartyXP, checkLevelUp, processLevelUp, calculateHitDiceGain,
  getLevelFeatures, getProficiencyBonus, formatLevelUpMessage
} = require('../src/campaign/leveling');

group('Leveling — XP_TABLE');
assert(Array.isArray(XP_TABLE), 'XP_TABLE is array');
assert(XP_TABLE.length === 21, '21 entries (levels 0-20)');
assert(XP_TABLE[0] === 0, 'level 0 = 0 XP');
assert(XP_TABLE[1] === 0, 'level 1 = 0 XP (start)');
assert(XP_TABLE[2] === 300, 'level 2 = 300 XP');

group('Leveling — getLevelFromXP');
assert(getLevelFromXP(0) === 1, '0 XP = level 1');
assert(getLevelFromXP(300) === 2, '300 XP = level 2');
assert(getLevelFromXP(900) === 3, '900 XP = level 3');
assert(getLevelFromXP(999999) === 20, 'high XP = level 20');

group('Leveling — getXPForNextLevel');
assert(getXPForNextLevel(1) === 300, 'level 1 needs 300');
assert(getXPForNextLevel(20) === Infinity, 'level 20 cap');

group('Leveling — getXPProgress');
assert(getXPProgress(0, 1) === 0, '0% at start');
assert(typeof getXPProgress(150, 1) === 'number', 'returns number');

group('Leveling — getProficiencyBonus');
assert(getProficiencyBonus(1) === 2, 'level 1 = +2');
assert(getProficiencyBonus(5) === 3, 'level 5 = +3');
assert(getProficiencyBonus(20) === 6, 'level 20 = +6');

group('Leveling — checkLevelUp');
{
  const ch = { level: 1, xp: 300 };
  const result = checkLevelUp(ch);
  assert(result.canLevel === true, 'can level at 300 XP');
}
{
  const ch = { level: 1, xp: 100 };
  const result = checkLevelUp(ch);
  assert(result.canLevel === false, 'cannot level at 100 XP');
}

group('Leveling — processLevelUp');
{
  const ch = { name: 'Hero', class: 'fighter', level: 1, hp: { current: 10, max: 10 }, stats: { con: 14 }, xp: 300, featuresGained: [] };
  const changes = processLevelUp(ch);
  assert(ch.level === 2, 'level increased to 2');
  assert(ch.hp.max > 10, 'HP max increased');
  assert(changes !== null, 'returns changes');
}

group('Leveling — formatLevelUpMessage');
{
  const msg = formatLevelUpMessage({ name: 'Hero', class: 'fighter' }, 1, 2, { hpGained: 8 });
  assert(typeof msg === 'string', 'returns string');
  assert(msg.includes('Hero'), 'includes character name');
  assert(msg.includes('2'), 'includes new level');
}

group('Leveling — getLevelFeatures');
{
  const features = getLevelFeatures('fighter', 2);
  assert(Array.isArray(features), 'returns array');
}

group('Leveling — calculateHitDiceGain');
{
  const result = calculateHitDiceGain('fighter');
  assert(result !== null, 'returns result');
  assert(typeof result.roll === 'number', 'has roll');
}

// ══════════════════════════════════════════════════════════════
// DUNGEON GENERATOR
// ══════════════════════════════════════════════════════════════
const {
  ROOM_TYPES, TRAP_TYPES, THEME_DESCRIPTIONS,
  generateDungeon, generateRoom, connectRooms, populateRoom,
  generateRoomDescription, generateTrap, generateDungeonEntrance,
  generateBossRoom, getDungeonMap, formatDungeonForDM
} = require('../src/campaign/dungeon-generator');

group('Dungeon Generator — constants');
assert(Array.isArray(ROOM_TYPES), 'ROOM_TYPES is array');
assert(ROOM_TYPES.length >= 8, '8+ room types');
assert(Array.isArray(TRAP_TYPES), 'TRAP_TYPES is array');
assert(TRAP_TYPES.length >= 5, '5+ trap types');
assert(typeof THEME_DESCRIPTIONS === 'object', 'THEME_DESCRIPTIONS is object');

group('Dungeon Generator — generateDungeon');
{
  const dungeon = generateDungeon({ rooms: 6, difficulty: 'medium', theme: 'gothic_horror', partyLevel: 3, partySize: 4 });
  assert(dungeon !== null, 'returns dungeon');
  assert(dungeon.name, 'has name');
  assert(Array.isArray(dungeon.rooms), 'has rooms array');
  assert(dungeon.rooms.length >= 6, '6+ rooms');
  assert(dungeon.rooms.some(r => r.isEntrance), 'has entrance room');
  assert(dungeon.rooms.some(r => r.isBoss), 'has boss room');
}

group('Dungeon Generator — generateRoom');
{
  const room = generateRoom({ type: 'chamber', theme: 'gothic_horror', partyLevel: 3 });
  assert(room !== null, 'returns room');
  assert(room.type === 'chamber', 'correct type');
  assert(room.description, 'has description');
}

group('Dungeon Generator — generateTrap');
{
  const trap = generateTrap(TRAP_TYPES[0], 3);
  assert(trap !== null, 'returns trap');
  assert(trap.name || trap.type, 'has name/type');
  assert(typeof trap.dc === 'number', 'has DC');
}

group('Dungeon Generator — generateDungeonEntrance');
{
  const entrance = generateDungeonEntrance('gothic_horror');
  assert(entrance !== null, 'returns entrance');
  assert(entrance.description, 'has description');
}

group('Dungeon Generator — generateBossRoom');
{
  const boss = generateBossRoom('gothic_horror', 3, 4);
  assert(boss !== null, 'returns boss room');
  assert(boss.description, 'has description');
}

group('Dungeon Generator — getDungeonMap');
{
  const dungeon = generateDungeon({ rooms: 4, theme: 'gothic_horror', partyLevel: 3, partySize: 4 });
  const map = getDungeonMap(dungeon);
  assert(typeof map === 'string', 'returns string');
  assert(map.length > 0, 'non-empty map');
}

group('Dungeon Generator — formatDungeonForDM');
{
  const dungeon = generateDungeon({ rooms: 4, theme: 'gothic_horror', partyLevel: 3, partySize: 4 });
  const formatted = formatDungeonForDM(dungeon);
  assert(typeof formatted === 'string', 'returns string');
  assert(formatted.length > 100, 'substantial output');
}

// ══════════════════════════════════════════════════════════════
// STT SERVICE (Voice-to-Text)
// ══════════════════════════════════════════════════════════════
const { detectProvider: detectSTT, createSTTService, createNullSTTService } = require('../src/voice/stt-service');

group('STT Service — detectProvider');
{
  const provider = detectSTT();
  assert(provider === null || typeof provider === 'string', 'returns null or string');
}

group('STT Service — createNullSTTService');
{
  const stt = createNullSTTService();
  assert(stt.provider === null, 'provider is null');
  assert(stt.isReady() === false, 'not ready');
  const result = stt.transcribe(Buffer.from('test'));
  assert(result.then !== undefined, 'returns promise');
  result.then(r => assert(r.status === 'disabled', 'disabled status'));
}

group('STT Service — createSTTService without provider');
{
  const stt = createSTTService({});
  assert(stt !== null, 'returns service');
  assert(typeof stt.transcribe === 'function', 'has transcribe method');
  assert(typeof stt.isReady === 'function', 'has isReady method');
}

// ══════════════════════════════════════════════════════════════
// RESULTS
// ══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`);
console.log(`  Phase 2 Extended Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'═'.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
