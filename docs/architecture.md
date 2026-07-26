# The Binding — Architecture Overview

> Module map and data flow for the entire codebase. Read this alongside `HANDOFF.md` and `game-design-decisions.md`.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (public/)                        │
│  Vanilla HTML/CSS/JS — no framework                              │
│  index.html + app.js + styles.css + browser-tts.js               │
│                                                                  │
│  Gate Screen → Adventure Select → Game Screen                    │
│  Mode Select (3 cards: Storyline / Campaign / Digital DM)        │
│                                                                  │
│  Communicates via: POST /api/action → SSE /api/events            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP + SSE
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (server.js)                            │
│  Fastify — plugin-based, routes registered in api/               │
│                                                                  │
│  Adventure Routes (src/api/adventure-routes.js)                  │
│  Campaign Routes  (src/api/campaign-routes.js)                   │
│       │                        │                                 │
│       ▼                        ▼                                 │
│  ┌─────────────────────────────────────────────┐                 │
│  │         SESSION MANAGER                      │                 │
│  │  src/session/index.js                        │                 │
│  │  - Session state machine                     │                 │
│  │  - Player array (1 adventure, 1-6 campaign)  │                 │
│  │  - Mode: "adventure" | "campaign"            │                 │
│  ├─────────────────────────────────────────────┤                 │
│  │  Message Router (src/session/message-router) │                 │
│  │  - DmMessage with targets[]                  │                 │
│  │  - Types: narration | dice_result | combat   │                 │
│  ├─────────────────────────────────────────────┤                 │
│  │  Persistence (src/session/persistence.js)    │                 │
│  │  - JSON file storage, no database            │                 │
│  └────────┬────────────────────────────────────┘                 │
│           │                                                      │
│           ▼                                                      │
│  Adventure Engine (scene manifests)                              │
│  Story Engine (src/story/ — story-engine, class-abilities)       │
│           │                                                      │
│           ▼                                                      │
│  Rule Engine (src/rule-engine/)                                  │
│  - stats, classes, races, combat, dice, character-sheet          │
│  - Player-count agnostic (works for 1 or 6)                      │
│           │                                                      │
│           ▼                                                      │
│  Dice Service (src/dice/) — deterministic seeding                │
│  Combat Manager (src/combat/) — initiative, turns                │
│  AI DM Service (src/ai/) — LLM integration, mock fallback        │
│  Coin Engine (src/coin-engine/) — scoring, tiers, $BINDING       │
│  Inventory (src/inventory/) — weight, encumbrance, Shoppe        │
│  Dynamic Difficulty (src/difficulty/) — rubber-band scaling       │
│  Voice (src/voice/) — TTS + STT (needs API key)                  │
│  Image Pipeline (src/image/) — generation, queue, cache          │
│  Scene Engine (src/scene-engine/) — transitions, continuity      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Campaign Mode Modules (Phase 2 — built, partially integrated)

16 modules in `src/campaign/`, ~4,974 lines total:

| File | Lines | Purpose |
|------|-------|---------|
| `index.js` | 480 | Campaign session manager (core) |
| `world-builder.js` | 308 | Procedural world generation |
| `quest-engine.js` | 168 | Quest creation/tracking/completion |
| `campaign-prompts.js` | 162 | AI DM system prompts |
| `digital-dm.js` | 153 | Digital DM mode scaffolding |
| `monster-manual.js` | 364 | SRD 5.1 monster stat blocks (334 creatures) |
| `encounter-builder.js` | 260 | Combat encounter generation |
| `turn-manager.js` | 260 | Turn order, initiative, phases |
| `loot-engine.js` | 350 | Treasure, magic items, shops |
| `npc-engine.js` | 300 | NPC personality, dialogue, memory |
| `session-persistence.js` | 280 | Save/load, journal, auto-save |
| `lobby-manager.js` | 391 | Session lobby, invite codes, ready-up |
| `whisper-system.js` | 371 | DM whispers, private messaging |
| `leveling.js` | 526 | XP, leveling, class features |
| `dungeon-generator.js` | 622 | Procedural dungeons, rooms, traps |

Campaign Mode connects to the same session manager, rule engine, and AI DM — it's additive, not a fork.

---

## Data Flow: Single Adventure Turn

```
1. Player clicks action button (or types free text)
2. Frontend → POST /api/action { sessionId, action, playerId }
3. Server routes to Session Manager
4. Session Manager → Rule Engine (skill check, combat roll, etc.)
5. Session Manager → AI DM Service → LLM API (generates narration)
6. Session Manager → Coin Engine (score the action)
7. Session Manager → Dynamic Difficulty (adjust if needed)
8. Session Manager → Image Pipeline (generate scene art, if key available)
9. Server → SSE stream back to frontend { narration, dice, actions, coins }
10. Frontend renders response, updates UI
```

---

## Data Flow: Campaign Mode Turn (Multiplayer)

```
1. Active player submits action → POST /api/action
2. Session Manager checks turn order (turn-manager.js)
3. If combat: initiative tracking → combat-manager.js
4. If narrative: story-engine.js
5. Rule Engine processes for ALL party members
6. AI DM generates narration with campaign-prompts.js
7. Message Router splits output:
   - Shared narration → broadcast to all players
   - Private info → whisper to specific player
8. Loot / NPC / Quest engines update world state
9. Session Persistence auto-saves
10. SSE streams personalized views to each connected player
```

---

## State Model

```
Session
├── mode: "adventure" | "campaign"
├── players[] (1 for adventure, 1-6 for campaign)
├── worldState (SessionWorldState — shared)
│   ├── scene graph / world map
│   ├── NPCs, environment, quests
│   └── combat state
├── playerStates{} (PlayerPrivateState — per-player)
│   ├── character sheet
│   ├── inventory
│   ├── coin balance + tier
│   ├── secrets, clues, personal goals
│   └── private messages
├── turnOrder (null in Phase 1, active in Campaign)
├── difficulty state
└── persistence layer (JSON files)
```

---

## Key Design Patterns

1. **Session as Top-Level Container** — session owns world state, player array, scene graph, turn order
2. **Player-Tagged Actions** — every action includes `playerId`, even in single-player
3. **Shared + Private State** — `SessionWorldState` visible to all, `PlayerPrivateState` per-player
4. **Message Router with Targets** — `DmMessage` with `targets[]`, types: narration | dice_result | combat | whisper
5. **Rule Engine is Player-Count Agnostic** — combat/skills/saves accept actor arrays, works for 1 or 6

---

## Monster Database

- **Source:** D&D 5.1 SRD (CC-BY-4.0)
- **File:** `data/monsters/srd-monsters.json` (334 creatures)
- **Engine:** `src/campaign/monster-manual.js`
- **Builder:** `data/monsters/build_monster_db.py`
- **Docs:** `docs/monster-database.md`

---

## Test Architecture

37 test suites, 1,649 tests. Run all: `npm test`

| Suite | What It Tests |
|-------|---------------|
| `phase1.test.js` | Core Phase 1 functionality |
| `phase2-campaign.test.js` | Campaign modules |
| `e2e-smoke.test.js` | End-to-end happy path |
| `dice.test.js` | Deterministic dice seeding |
| `coin-engine-v2.test.js` | Scoring engine |
| `dynamic-difficulty-tuning.test.js` | Rubber-band scaling |
| `voice-profiles.test.js` | Character voice presets |
| `image-pipeline.test.js` | Image generation pipeline |
| `browser-tts.test.js` | Browser TTS (87 tests) |

---

*Last updated: August 6, 2026*
