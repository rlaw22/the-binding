# The Binding — Campaign Mode Implementation Plan

*Drafted: July 17, 2026*
*Status: SPEC — Not Started*

---

## Executive Summary

Campaign Mode is The Binding's Phase II: a full AI Dungeon Master that runs open-ended D&D 5e sessions for 1-6 players. Unlike Adventure Mode (curated book-based scenes), Campaign Mode is sandbox — the AI DM creates worlds, NPCs, quests, and combat encounters on the fly, responding to player actions in real time.

The Phase 1 architecture was designed for this from Day 1. The session model, message router, rule engine, and combat manager all accept multi-player inputs already. Campaign Mode is **purely additive** — no rewrites to existing code.

---

## Architecture Overview

### What Already Exists (Build On These)

| Module | File(s) | What It Does | Campaign Mode Reuse |
|--------|---------|-------------|-------------------|
| **Session Model** | `src/session/index.js` (330 lines) | Session container with `mode` field (`adventure`/`campaign`), players array, hostId, turnOrder, worldState, suggestions | ✅ Already has campaign mode enum, lobby state, turn management fields |
| **Message Router** | `src/session/message-router.js` (271 lines) | DmMessage with targets[], types: narration/dice_result/combat_update/whisper/system | ✅ Whisper type exists, spectator_suggestion type exists |
| **Rule Engine** | `src/rule-engine/` (7 modules, ~108KB) | D&D 5e: 12 classes, full SRD races, combat, stats, character sheets | ✅ Player-count agnostic — works for 1-6 already |
| **Combat Manager** | `src/combat/combat-manager.js` (438 lines) | Initiative, multi-foe encounters, action economy, ENEMY_TEMPLATES | ✅ Needs monster stat block expansion |
| **Dynamic Difficulty** | `src/difficulty/dynamic-difficulty.js` (219 lines) | Rubber-band scaling: 70% fair, 20% power window, 10% challenge | ✅ Works as-is |
| **Coin Engine** | `src/coin-engine/index.js` (225 lines) | Categories: creativity/investigation/roleplay/combat/exploration, tier system | ✅ Needs per-player tracking |
| **Inventory** | `src/inventory/inventory.js` (240 lines) | Item definitions with combat effects, equipment slots | ✅ Needs per-player isolation |
| **AI DM Service** | `src/ai-dm/` (4 modules, 1,191 lines) | LLM orchestration, context management, DM prompts | ⚠️ Needs campaign-specific prompts + world state management |
| **Character** | `src/character/` (4 modules, 1,505 lines) | Character model, service, portrait gen | ⚠️ Needs multi-character support per session |
| **Dice Service** | `src/dice/` (4 modules, 899 lines) | All die types, 207 tests passing | ✅ Works as-is |
| **Auth** | `src/auth/token-store.js` (218 lines) | Beta token validation | ✅ Works as-is |
| **TTS Voice** | `src/voice/tts-service.js` (408 lines) | Text-to-speech service | ✅ Works as-is |

### What Needs to Be Built

| New Module | Purpose | Priority |
|-----------|---------|----------|
| `src/campaign/` | Campaign session manager, world generator, quest engine | P0 — Core |
| `src/campaign/world-builder.js` | Procedural world generation (locations, NPCs, hooks) | P0 — Core |
| `src/campaign/quest-engine.js` | Quest creation, tracking, completion | P0 — Core |
| `src/campaign/encounter-builder.js` | Combat encounter generation from monster stat blocks | P1 — Combat |
| `src/campaign/monster-manual.js` | Monster stat block database (SRD creatures) | ✅ DONE |
| `src/campaign/turn-manager.js` | Turn order, initiative, action resolution for parties | P1 — Combat |
| `src/campaign/loot-engine.js` | Treasure generation, magic item drops | P2 — Progression |
| `src/campaign/npc-engine.js` | NPC personality, dialogue, memory, relationships | P1 — Roleplay |
| `src/campaign/campaign-prompts.js` | DM system prompts for open-ended play | P0 — Core |
| `src/campaign/session-persistence.js` | Save/resume campaign state to disk | P1 — Persistence |
| `src/api/campaign-routes.js` | Campaign-specific API endpoints | P0 — Core |

---

## Implementation Phases

### Phase 2A: Campaign Foundation (Weeks 1-3)

**Goal:** A single player can start a campaign, the AI DM generates a world, and the player can explore and interact.

#### 2A.1 Campaign Session Manager (`src/campaign/index.js`)

```
CampaignSession extends Session:
  - mode: 'campaign'
  - world: WorldState (generated locations, NPCs, quests)
  - party: PartyState (characters, positions, shared inventory)
  - campaignLog: CampaignEvent[] (full history for context)
  - dmContext: DMContext (current situation, active threads)
```

**Key functions:**
- `createCampaign(options)` — Initialize a new campaign session
- `generateStartingWorld(theme, level)` — Create the initial world state
- `processCampaignAction(session, playerId, action)` — Handle player actions in campaign mode
- `advanceWorldState(session, action, result)` — Update world based on what happened

#### 2A.2 World Builder (`src/campaign/world-builder.js`)

Generates a sandbox world from a theme seed:

```javascript
WorldState = {
  locations: {
    'loc_tavern': {
      id: 'loc_tavern',
      name: 'The Rusty Flagon',
      type: 'settlement',
      description: 'A weathered tavern at the crossroads...',
      npcs: ['npc_innkeeper', 'npc_mysterious_stranger'],
      connections: ['loc_forest', 'loc_castle_ruins'],
      discovered: true,
      events: []  // things that happened here
    }
  },
  npcs: {
    'npc_innkeeper': {
      id: 'npc_innkeeper',
      name: 'Elara Thornwick',
      race: 'Human',
      role: 'innkeeper',
      personality: ['warm', 'gossipy', 'secretly afraid'],
      attitude: 0.5,  // -1 to 1, affects info sharing
      knownInfo: ['rumors_about_castle', 'local_politics'],
      secrets: ['saw_the_creature_last_night'],
      dialogueHistory: []
    }
  },
  quests: { active: [], completed: [], available: [] },
  globalFlags: {},
  timeOfDay: 'evening',
  dayCount: 1,
  currentLocation: 'loc_tavern'
}
```

**Themes (preset starting points):**
- `gothic_horror` — Dark villages, haunted forests, vampire lords
- `sword_coast` — Classic D&D frontier, dungeons, dragons
- `noir_mystery` — Urban intrigue, thieves guilds, political corruption
- `wilderness_expedition` — Exploration, ruins, ancient civilizations
- `custom` — Player describes a setting, AI generates from description

#### 2A.3 Campaign DM Prompts (`src/campaign/campaign-prompts.js`)

The core difference from Adventure Mode: the DM has no pre-written scenes. It must:

1. **Describe the world** — Rich sensory descriptions of locations and NPCs
2. **React to player actions** — Resolve open-ended actions with consequences
3. **Drive narrative** — Create tension, stakes, and story arcs organically
4. **Manage NPCs** — Distinct personalities, memory of past interactions
5. **Track consequences** — Actions have lasting effects on the world

**System prompt structure:**
```
You are the Dungeon Master for a D&D 5e campaign.

WORLD STATE:
{serialized world state}

ACTIVE QUESTS:
{quest list with status}

PARTY STATUS:
{character sheets for all players}

CURRENT SITUATION:
{what's happening right now, recent events}

YOUR ROLE:
- Describe environments vividly (sights, sounds, smells)
- Roleplay NPCs with distinct voices and personalities
- Call for dice rolls when actions have uncertain outcomes
- Track consequences — actions matter
- Create tension and stakes organically
- Never speak for the players or describe their actions

RESPONSE FORMAT:
[Your narration here]

[DICE_ROLL: ability_check, DC 15, Wisdom (Perception)]
—or—
[SUGGESTED_ACTIONS: action1, action2, action3, action4]
```

#### 2A.4 Campaign API Routes (`src/api/campaign-routes.js`)

```
POST   /api/campaigns              — Create new campaign
GET    /api/campaigns/:id          — Get campaign state
POST   /api/campaigns/:id/actions  — Submit player action
GET    /api/campaigns/:id/events   — SSE stream for campaign events
POST   /api/campaigns/:id/join     — Join existing campaign (Phase 2B)
GET    /api/campaigns/:id/character — Get character sheet
POST   /api/campaigns/:id/character — Create/update character
GET    /api/campaigns/:id/map      — Get discovered locations (theater of mind)
POST   /api/campaigns/:id/save     — Save campaign state
GET    /api/campaigns               — List active campaigns
```

---

### Phase 2B: Multiplayer (Weeks 4-6)

**Goal:** 1-6 players can join a campaign, with host/spectator roles and turn management.

#### 2B.1 Session Lobby System

The session model already has `SessionState.LOBBY`. Build out:

- **Lobby UI** — Host creates campaign, gets share code (like adventure mode rejoin codes)
- **Player join flow** — Enter code → create character → join lobby
- **Ready check** — All players must ready up before campaign starts
- **Role assignment** — First player is host, others are players (spectators join separately)

#### 2B.2 Turn Manager (`src/campaign/turn-manager.js`)

```
TurnManager:
  - turnOrder: Player[] (determined by initiative or narrative)
  - currentPlayer: Player (whose turn it is)
  - turnPhase: 'action' | 'bonus_action' | 'movement' | 'reaction' | 'free'
  - turnTimer: optional (for pacing)

  - calculateTurnOrder(characters) — Initiative-based or narrative-based
  - advanceTurn() — Move to next player
  - isPlayerTurn(playerId) — Check if it's this player's turn
  - forceAdvance() — Skip AFK player after timeout
```

**Turn modes:**
- **Initiative-based** (combat) — Dexterity order, strict turns
- **Narrative-based** (exploration/social) — Free-form, DM calls on players
- **Hybrid** — Narrative in safe areas, initiative in combat (auto-switches)

#### 2B.3 DM Whisper System

The message router already supports `whisper` type. Build out:

- **DM → Player whisper** — Private information (perception checks, secret knowledge, NPC secrets)
- **Player → Player whisper** — Side conversations (limited to adjacent players in-game)
- **DM → Party** — Broadcast narration (default)
- **Implementation** — DmMessage.targets[] controls who sees what

#### 2B.4 Per-Player State Isolation

- **Shared state** — Current location, visible NPCs, environment, active combat
- **Private state** — Individual perception results, personal quest hooks, secret items, private NPC relationships
- **Implementation** — Session worldState splits into `shared` and `private[playerId]`

---

### Phase 2C: Combat & Progression (Weeks 7-9)

**Goal:** Full D&D 5e combat with initiative, spell slots, abilities, and loot.

#### 2C.1 Monster Manual (`src/campaign/monster-manual.js`)

SRD creatures as stat blocks:

```javascript
MONSTERS = {
  goblin: {
    name: 'Goblin', cr: 0.25, type: 'humanoid',
    ac: 15, hp: 7, speed: '30ft',
    str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8,
    skills: ['Stealth +6'],
    traits: ['Nimble Escape'],
    actions: ['Scimitar +4 (1d6+2)', 'Shortbow +4 (1d6+2)'],
    xp: 50
  },
  // ... 50+ SRD monsters
}
```

#### 2C.2 Encounter Builder (`src/campaign/encounter-builder.js`)

- **CR-based balancing** — Match encounter difficulty to party level/size
- **Dynamic encounters** — AI DM can create encounters on the fly based on narrative
- **Template library** — Pre-built encounter templates (ambush, dungeon room, boss fight)
- **Integration with Dynamic Difficulty** — Rubber-band scaling applies to campaign combat

#### 2C.3 Loot Engine (`src/campaign/loot-engine.js`)

- **Treasure tables** — SRD treasure hoards by CR
- **Magic items** — Common through Legendary, with attunement rules
- **Gold/XP distribution** — Split among party members
- **Shop system** — Towns have inventories, prices vary by region

#### 2C.4 Leveling System

- **XP tracking** — Per-character, shared from combat + quest completion
- **Milestone leveling** — Optional mode (DM awards levels at story beats)
- **Level-up flow** — New HP, class features, spell slots, ability score improvements
- **Multi-class support** — Rule engine already handles this in SRD classes

---

### Phase 2D: Polish & Advanced Features (Weeks 10-12)

#### 2D.1 Session Persistence (`src/campaign/session-persistence.js`)

- **Auto-save** — Every N turns or on significant events
- **Manual save** — Player can save at any time
- **Resume flow** — Load campaign state, reconnect players
- **Campaign journal** — Auto-generated recap of key events for returning players

#### 2D.2 Advanced DM Features

- **NPC relationship system** — Attitude tracking, reputation, faction standings
- **Weather/time system** — Day/night cycles, weather affects gameplay
- **Random encounter tables** — Region-based encounter probability
- **Dungeon generator** — Procedural dungeon rooms with traps, treasures, monsters
- **Puzzle system** — DM can present logic puzzles, riddles

#### 2D.3 Campaign UI

- **Party dashboard** — All character sheets visible, HP bars, conditions
- **Location map** — Theater of mind with text-based "map" of discovered locations
- **Quest log** — Active/completed quests with objectives
- **NPC codex** — Discovered NPCs with notes
- **Combat tracker** — Initiative order, turn indicator, HP/conditions

---

## Technical Design Decisions

### 1. World State as JSON (Not Database)

Campaign state serializes to JSON, stored in `data/campaigns/{id}.json`. Same pattern as adventure sessions. Reasons:
- Consistent with existing architecture
- Easy to save/load/share
- No database dependency for beta
- Can migrate to DB later if needed

### 2. LLM Context Window Management

Campaign Mode generates much more context than Adventure Mode. Strategy:
- **Sliding window** — Keep last N exchanges in full, summarize older context
- **World state compression** — Only send relevant location/NPC data, not entire world
- **Quest state injection** — Always include active quest objectives
- **Character sheets** — Include on session start, refresh on level-up
- **Token budget** — ~8K tokens for system prompt + world state, ~4K for conversation history, ~2K for response

### 3. DM Response Parsing

The AI DM must output structured data alongside narration. Parse tags:
```
[DICE_ROOL: ability_check, DC 15, Wisdom (Perception)]
[COMBAT_START: goblin x4, difficulty: medium]
[NPC_ATTITUDE: npc_innkeeper, +0.1, "shared rumors"]
[QUEST_UPDATE: quest_find_sword, status: completed]
[LOCATION_DISCOVERED: loc_hidden_cave, "A narrow opening in the cliff face"]
[ITEM_GRANTED: potion_of_healing, to: player_1]
[EXPLORED: talk_to_innkeeper]
```

### 4. Multiplayer Message Routing

```
All messages → MessageRouter
  ├── narration → targets: [] (broadcast to all)
  ├── whisper → targets: [specific_player_id]
  ├── dice_result → targets: [roller_id] + broadcast summary
  ├── combat_update → targets: [] (all need to see)
  ├── system → targets: [] (player joined, etc.)
  └── suggested_actions → targets: [current_player_id]
```

### 5. Coin/XP in Campaign Mode

- **No fixed coin pool** (adventures have theoretical max; campaigns are open-ended)
- **Earn rates** based on: encounter CR, quest difficulty, roleplay quality, exploration
- **Session-length scaling** — Longer sessions = more earning opportunities
- **Tier thresholds** adjusted for campaign length (campaigns run 10-50+ sessions)
- **Per-player tracking** — Each player earns independently

---

## File Structure

```
src/campaign/
├── index.js                    — Campaign session manager (main entry)
├── world-builder.js            — Procedural world generation
├── quest-engine.js             — Quest creation/tracking/completion
├── encounter-builder.js        — Combat encounter generation
├── monster-manual.js           — SRD monster stat blocks
├── turn-manager.js             — Turn order and initiative
├── loot-engine.js              — Treasure/magic item generation
├── npc-engine.js               — NPC personality/dialogue/memory
├── campaign-prompts.js         — DM system prompts for campaigns
├── session-persistence.js      — Save/resume functionality
├── dungeon-generator.js        — Procedural dungeon rooms (Phase 2D)
└── themes/
    ├── gothic-horror.js        — Gothic horror world template
    ├── sword-coast.js          — Classic D&D frontier template
    ├── noir-mystery.js         — Urban intrigue template
    ├── wilderness.js           — Exploration template
    └── index.js                — Theme registry

src/api/
└── campaign-routes.js          — Campaign API endpoints

data/
└── campaigns/                  — Saved campaign state files
    └── .gitkeep

public/
└── campaign.html               — Campaign Mode frontend
```

---

## Dependencies (No New Packages Required)

Everything Campaign Mode needs is already in the dependency tree:
- **Fastify** — API server ✅
- **uuid** — Session/campaign IDs ✅
- **ws** — WebSocket for multiplayer ✅
- **fastify-sse-v2** — Real-time event streams ✅

The only external dependency is the LLM API (OpenAI or equivalent), which is already configured.

---

## Testing Strategy

### Unit Tests (`tests/campaign.test.js`)

- World builder generates valid locations with connections
- Quest engine creates/tracks/completes quests
- Encounter builder produces balanced encounters for party level
- Turn manager handles initiative ordering and turn advancement
- Monster manual stat blocks are valid D&D 5e format
- Loot engine generates appropriate treasure by CR

### Integration Tests

- Full campaign flow: create → join → explore → combat → quest → save → resume
- Multiplayer: 3 players take turns, whisper system isolates private info
- DM response parsing: extract dice rolls, quest updates, NPC attitude changes

### E2E Smoke Test

- Create campaign session via API
- Generate world (gothic horror theme)
- Send 5 player actions, verify DM responses
- Start combat encounter, verify initiative and turn order
- Save and resume campaign
- Verify all message types route correctly to targets

---

## Effort Estimate

| Phase | Scope | Effort | Dependencies |
|-------|-------|--------|-------------|
| **2A: Foundation** | Campaign session, world builder, DM prompts, API | 2-3 weeks | None — builds on existing |
| **2B: Multiplayer** | Lobby, turn manager, whispers, per-player state | 2-3 weeks | Phase 2A complete |
| **2C: Combat** | Monster manual, encounters, loot, leveling | 2-3 weeks | Phase 2A complete (can parallel with 2B) |
| **2D: Polish** | Persistence, advanced DM, UI | 2-3 weeks | Phases 2A+2B+2C complete |

**Total: 8-12 weeks** for full Campaign Mode.

Phase 2A alone (single-player campaign) is deliverable in 2-3 weeks and provides immediate value — a player can start a campaign, explore a generated world, fight monsters, and complete quests without multiplayer.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LLM context window overflow in long campaigns | High | Sliding window + world state compression + summarize old events |
| AI DM generates inconsistent world state | High | Strict JSON schema for world updates, validate on parse |
| Multiplayer turn management feels slow | Medium | Fast turn timers, narrative mode outside combat |
| Monster stat blocks are wrong/broken | Medium | Unit test every stat block against SRD reference |
| Campaign save files become corrupted | Medium | Auto-save with versioning, keep last 3 saves |
| LLM cost per campaign session is high | Medium | Optimize prompt size, cache world state, use cheaper models for NPC dialogue |
| Players grief/abuse in multiplayer | Low | Host kick, report system, session-level bans |

---

## Next Steps

1. **Review this plan** — Lawman to approve/adjust scope and priorities
2. **Start Phase 2A** — Begin with campaign session manager + world builder
3. **Write campaign DM prompts** — The most critical piece — the DM's voice defines the experience
4. **Build first theme** — Gothic Horror (natural extension of existing Dracula content)
5. **Single-player E2E test** — One player, one campaign, full loop

---

*This plan is a living document. Update as implementation progresses.*
