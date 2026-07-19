# Phase 2 — Game Modes: Storyline, Campaign & Digital DM
## Progress Tracker

*Started: July 17, 2026*
*Last Updated: July 18, 2026*

---
## Overall Status: IN PROGRESS

| Phase | Status | Progress | ETA |
|-------|--------|----------|-----|
| **2A: Campaign Foundation** | ✅ Code Complete + Tested | 95% | Weeks 1-3 |
| **2B: Multiplayer** | ✅ Code Complete + Tested | 80% | Weeks 4-6 |
| **2C: Combat & Progression** | ✅ Code Complete + Tested | 80% | Weeks 7-9 |
| **2D: Polish & Advanced** | 🟡 Core Built, Needs Integration | 60% | Weeks 10-12 |
| **Storyline Mode Refinement** | ⚪ Not Started | 0% | Parallel |
| **Digital DM Mode** | 🟡 Scaffolding Done | 30% | After 2A |

---

## Phase 2A: Campaign Foundation — Detailed Tasks

| # | Task | Status | File(s) |
|---|------|--------|---------|
| 2A.1 | Campaign Session Manager | ✅ Code Complete | `src/campaign/index.js` (480 lines) |
| 2A.2 | World Builder | ✅ Code Complete | `src/campaign/world-builder.js` (308 lines) |
| 2A.3 | Campaign DM Prompts | ✅ Code Complete | `src/campaign/campaign-prompts.js` (162 lines) |
| 2A.4 | Campaign API Routes | ✅ Code Complete | `src/api/campaign-routes.js` (253 lines) |
| 2A.5 | Quest Engine | ✅ Code Complete | `src/campaign/quest-engine.js` (168 lines) |
| 2A.6 | Digital DM Scaffolding | ✅ Code Complete | `src/campaign/digital-dm.js` (153 lines) |
| 2A.7 | Server Integration | ✅ Done | `src/api/server.js` (routes wired) |
| 2A.8 | Unit Tests (Phase 2A) | ✅ Done (56/56 passing) | `tests/phase2-campaign.test.js` |
| 2A.9 | Integration Test (E2E) | ✅ Done (3/3 passing) | `tests/phase2-e2e.test.js` |
| 2A.10 | Storyline Mode Refinement | ⚪ Not Started | — |
| 2A.11 | Adventure Catalog (12 adventures, level-tagged) | ✅ Done | `docs/adventure-catalog.md` |
| 2A.12 | Lost Mine of Phandelver Manifest | ✅ Done | `docs/lmop-adventure-manifest.md` |
| 2A.13 | Adventure Level Display in Dropdown | ✅ Done | `public/index.html` |

---

## Phase 2B: Multiplayer — Detailed Tasks

| # | Task | Status | File(s) |
|---|------|--------|---------|
| 2B.1 | Turn Manager | ✅ Code Complete + Tested | `src/campaign/turn-manager.js` (260 lines) |
| 2B.2 | Lobby Manager | ✅ Code Complete + Tested | `src/campaign/lobby-manager.js` (391 lines) |
| 2B.3 | Whisper System | ✅ Code Complete + Tested | `src/campaign/whisper-system.js` (371 lines) |
| 2B.2 | Initiative System | ✅ Done | Included in turn-manager |
| 2B.3 | Narrative/Combat Mode Switching | ✅ Done | `switchMode()` in turn-manager |
| 2B.4 | AFK Auto-Skip | ✅ Done | `forceAdvance()` in turn-manager |
| 2B.5 | Participant Add/Remove | ✅ Done | `addParticipant()` / `removeParticipant()` |
| 2B.6 | Session Lobby System | ⚪ Not Started | — |
| 2B.7 | DM Whisper System | ⚪ Not Started | — |
| 2B.8 | Per-Player State Isolation | ⚪ Not Started | — |

---

## Phase 2C: Combat & Progression — Detailed Tasks

| # | Task | Status | File(s) |
|---|------|--------|---------|
| 2C.1 | Monster Manual | ✅ Done (pre-existing) | `src/campaign/monster-manual.js` (364 lines) |
| 2C.2 | Encounter Builder | ✅ Code Complete + Tested | `src/campaign/encounter-builder.js` (260 lines) |
| 2C.3 | Loot Engine | ✅ Code Complete + Tested | `src/campaign/loot-engine.js` (350 lines) |
| 2C.4 | NPC Engine | ✅ Code Complete + Tested | `src/campaign/npc-engine.js` (300 lines) |
| 2C.5 | Leveling System | ✅ Code Complete + Tested | `src/campaign/leveling.js` (526 lines) |
| 2C.6 | Shop System | ✅ Done | Included in loot-engine |

---

## Phase 2D: Polish & Advanced — Detailed Tasks

| # | Task | Status | File(s) |
|---|------|--------|---------|
| 2D.1 | Session Persistence | ✅ Code Complete + Tested | `src/campaign/session-persistence.js` (280 lines) |
| 2D.2 | Campaign Journal | ✅ Done | `generateCampaignJournal()` in session-persistence |
| 2D.3 | Auto-Save | ✅ Done | `shouldAutoSave()` in session-persistence |
| 2D.4 | Save/Load/List/Delete | ✅ Done | Full CRUD in session-persistence |
| 2D.5 | NPC Relationship System | ✅ Done | Included in npc-engine |
| 2D.6 | Weather/Time System | ✅ Done | Included in world-builder + campaign index |
| 2D.7 | Dungeon Generator | ✅ Code Complete + Tested | `src/campaign/dungeon-generator.js` (622 lines) |
| 2D.8 | Campaign UI | ⚪ Not Started | — |
| V.1 | Voice-to-Text (STT) Service | ✅ Code Complete + Tested | `src/voice/stt-service.js` (230 lines) |
| V.2 | Text-to-Voice (TTS) Service | ✅ Done (pre-existing) | `src/voice/tts-service.js` (408 lines) |

---

## Test Coverage Summary

| Test Suite | Tests | Status |
|-----------|-------|--------|
| Phase 1 Tests | (pre-existing) | ✅ |
| Phase 2A Campaign Tests | 56 | ✅ 56/56 passing |
| Phase 2B/2C/2D Tests | 124 | ✅ 124/124 passing |
| Phase 2 Extended Tests | 91 | ✅ 91/91 passing |
| E2E Integration Tests | 3 | ✅ 3/3 passing |
| **Total** | **274** | **✅ All passing** |

---

## Module Inventory

### Campaign Modules (`src/campaign/`)
| File | Lines | Purpose |
|------|-------|---------|
| `index.js` | 480 | Campaign session manager (core) |
| `world-builder.js` | 308 | Procedural world generation |
| `quest-engine.js` | 168 | Quest creation/tracking/completion |
| `campaign-prompts.js` | 162 | AI DM system prompts |
| `digital-dm.js` | 153 | Digital DM mode scaffolding |
| `monster-manual.js` | 364 | SRD monster stat blocks |
| `encounter-builder.js` | 260 | Combat encounter generation |
| `turn-manager.js` | 260 | Turn order, initiative, phases |
| `loot-engine.js` | 350 | Treasure, magic items, shops |
| `npc-engine.js` | 300 | NPC personality, dialogue, memory |
| `session-persistence.js` | 280 | Save/load, journal, auto-save |
| `lobby-manager.js` | 391 | Session lobby, invite codes, ready-up |
| `whisper-system.js` | 371 | DM whispers, private messaging, visibility |
| `leveling.js` | 526 | XP, leveling, class features, proficiency |
| `dungeon-generator.js` | 622 | Procedural dungeons, rooms, traps, bosses |
| **Total** | **4,974** | **16 modules** |

### Voice Modules (`src/voice/`)
| File | Lines | Purpose |
|------|-------|--------|
| `index.js` | 40 | Voice module entry point (TTS + STT exports) |
| `tts-service.js` | 408 | Text-to-speech (Novita, OpenAI, ElevenLabs) |
| `stt-service.js` | 230 | Speech-to-text (OpenAI Whisper) |
| **Total** | **678** | **3 modules** |

---

## Blockers (Items Lawman Needs to Act On)

| # | Blocker | Priority | Status | Details |
|---|---------|----------|--------|---------|
| B1 | **LLM API key for campaign testing** | ✅ Done | RESOLVED | Using existing Novita API key (`NOVITA_API_KEY`). Model: `qwen/qwen3.6-plus` (free). E2E tests pass with real LLM. |
| B2 | **Gothic Horror theme approval** | 🟡 Medium | OPEN | First world theme for Campaign Mode. Plan proposes Gothic Horror (natural extension of Dracula content). Approve or pick different starting theme? |
| B3 | **Storyline vs Adventure Mode naming** | 🟡 Medium | OPEN | Phase 1 calls it "Adventure Mode." Phase 2 renames to "Storyline Mode." Should we rename existing references now or keep backward compat? |
| B4 | **Digital DM scope confirmation** | 🟡 Medium | OPEN | Digital DM scaffolding is done. How much more should we build in Phase 2? Full implementation or keep as scaffolding and flesh out in Phase 3? |
| B5 | **Campaign session storage** | 🟢 Low | OPEN | Plan uses JSON files (consistent with Phase 1). Confirm no database migration needed for beta? |
| B6 | **Campaign API auth** | 🟡 Medium | OPEN | Current campaign routes have no beta token validation (unlike adventure routes). Should we add it now or later? |
| B7 | **E2E integration test needs live LLM** | ✅ Done | RESOLVED | E2E tests pass with real Novita LLM (`qwen/qwen3.6-plus`). |
| B8 | **srd-monsters.json path mismatch** | 🟢 Low | FIXED | Monster DB was at `public/docs/` but monster-manual.js expected `src/data/monsters/`. Copied file to fix. Consider permanent resolution. |

---

## Decisions Made

| Decision | Choice | Date |
|----------|--------|------|
| Architecture | Build on existing Phase 1 modules (no rewrites) | July 17 |
| Monster Manual | Already done (`src/campaign/monster-manual.js`) | Pre-existing |
| Session Model | Already has campaign mode enum + multiplayer fields | Pre-existing |
| Storage | JSON files for beta (same as Phase 1) | Per plan |
| Server Integration | Try/catch wrapped, graceful fallback if routes fail to load | July 17 |
| Monster DB Path | Copied to `src/data/monsters/` to match monster-manual.js | July 18 |
| Encounter Builder API | Uses `MonsterManual.getAll()` not raw MONSTERS dict | July 18 |

---

## Daily Log

### July 18, 2026 — Day 2
- **Built:** 5 new modules (encounter-builder, turn-manager, loot-engine, npc-engine, session-persistence)
- **Total new code:** ~1,450 lines across 5 modules
- **Tests:** Wrote 124 new tests (phase2bcd.test.js), all passing
- **Fixed:** MonsterManual import in encounter-builder (uses getAll() API)
- **Fixed:** srd-monsters.json path (copied to expected location)
- **Fixed:** Campaign journal test assertion for markdown bold Day format
- **Combined test suite:** 180 tests (56 Phase 2A + 124 Phase 2B/2C/2D), all green
- **Next:** E2E integration test, lobby system, whisper system, UI work
- **Resolved:** B1 (LLM — Novita API key), B7 (E2E — passes with real LLM)
- **Blocked on:** B2 (theme approval), B3 (naming), B4 (DM scope)

### July 17, 2026 — Day 1
- **Started:** Phase 2 kickoff
- **Read:** Campaign mode plan, session model, AI DM service, combat manager, monster manual, server.js
- **Built:** 6 new modules (campaign session manager, world builder, quest engine, DM prompts, API routes, digital DM scaffolding)
- **Integrated:** Campaign routes wired into main server.js
- **Verified:** All 6 modules load without errors
- **Next:** Write unit tests, then start E2E integration test
- **Blocked on:** B1-B6 (see blockers table above)
