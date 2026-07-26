# The Binding — v2 Rebuild Plan

> **Status:** Decision made. Rebuild from scratch rather than refactor.
> **Reason:** v1 reached 2,275 lines of frontend and a sprawling backend before the architecture was deemed wrong. This is a re-architecture, not a cleanup.

---

## Why Rebuild Instead of Refactor

v1 accumulated cruft from iterative build sessions. The backend has modules that were bolted on after the fact (Campaign Mode, Digital DM, voice, image pipeline) rather than designed from the start. The frontend is 2,275 lines of vanilla JS with no component structure.

A refactor would be fighting the existing architecture. A rebuild lets us design around the interfaces Campaign Mode, multiplayer, and Digital DM actually need.

---

## Phase 0 — Freeze v1 (30 min)

- Tag current `main` as `v1-legacy` in git
- Export test suite + smoke test results as golden reference
- Create `the-binding-v2/` directory alongside v1 (or new branch)
- **Gate:** v1 is preserved and untouched

---

## Phase 1 — Core Foundation

**Goal:** Server, config, rule engine, dice, character, session — all tested.

| Module | What It Does |
|--------|-------------|
| `server.js` | Fastify, plugin-based, clean route registration |
| `config/` | Centralized env management (no scattered process.env) |
| `src/rule-engine/` | Dice/stats/classes/races/combat/character-sheet |
| `src/dice/` | Deterministic seeding (provably fair) |
| `src/character/` | Persistent character model |
| `src/session/` | Explicit state machine (not ad-hoc) |

**Gate:** All Phase 1 tests pass. Session state machine is deterministic.

---

## Phase 2 — Story and Adventure Engine

**Goal:** Story Mode plays all 3 adventures identically to v1.

| Module | What It Does |
|--------|-------------|
| `src/adventure/` | Manifest loader, scene graph |
| `src/story-mode/` | Button-only Story Mode architecture |
| `src/scene-engine/` | Scene transitions, continuity validation |
| `src/story/` | Class abilities, threat encounters |
| `src/combat/` | Combat manager with initiative |
| `src/inventory/` | Weight, encumbrance, Shoppe |

- Copy 15 manifest files as-is from v1
- **Gate:** Story Mode plays all 3 adventures (Dracula, Frankenstein, Holmes) identically to v1 behavior

---

## Phase 3 — AI DM and Coin Engine

**Goal:** Full AI DM integration with scoring and difficulty.

| Module | What It Does |
|--------|-------------|
| `src/ai/` | DM service, LLM client (OpenAI-compatible), adventure prompts |
| `src/coin-engine/` | 5-category scoring, bell curve, tier conversion |
| `src/difficulty/` | Rubber-band scaling (70/20/10 split) |
| `src/voice/` | TTS + STT services |
| `src/image/` | Image generation pipeline |

**Gate:** Full adventure playthrough with AI DM, coin scoring, and dynamic difficulty.

---

## Phase 4 — Frontend

**Goal:** Clean, responsive frontend that supports all modes.

> **OPEN QUESTION:** Frontend architecture not yet decided.

**Option A: Keep vanilla (clean up)**
- Simpler, no build step
- Works with Render.com deploy as-is
- Risk: multiplayer lobby UI and spectator mode get messy in vanilla

**Option B: Move to a framework (React/Vue/Svelte)**
- Better for multiplayer lobby UI, spectator mode, character creation wizard
- Requires build step and deploy pipeline changes
- The character creation wizard is already started in `the-binding-cc/`

**This decision blocks Phase 4 but NOT Phases 1-3.** Backend rebuild can proceed regardless.

**Gate:** All game modes playable in browser, responsive on mobile.

---

## Phase 5 — Campaign Mode (Multiplayer)

**Goal:** Full D&D 5e campaign mode with 1-6 players.

| Module | What It Does |
|--------|-------------|
| `src/campaign/` | 16 modules from v1 (see architecture.md) |
| Lobby system | Invite codes, ready-up, join-in-progress |
| Whisper system | Private DM messages |
| Turn management | Initiative, AFK auto-skip |
| Dungeon generator | Procedural rooms, traps, bosses |
| NPC engine | Personality, dialogue, memory |

- Most campaign modules already exist from v1 Phase 2 — they get rebuilt on the clean v2 foundation
- **Gate:** 4-player campaign session runs end-to-end

---

## What Gets Carried Forward From v1

| Component | Status | Action |
|-----------|--------|--------|
| Game design decisions | ✅ Decided | Don't re-litigate (see game-design-decisions.md) |
| Rule engine logic | ✅ Proven | Rewrite on clean architecture, same logic |
| Adventure manifests | ✅ Complete | Copy as-is |
| Monster database (334 creatures) | ✅ Complete | Copy as-is |
| Test patterns | ✅ Proven | Rewrite tests for v2 modules |
| Campaign module designs | ✅ Built | Rebuild on clean session model |
| Voice/image pipeline code | ✅ Scaffolded | Rebuild with clean error handling |

## What Gets Dropped From v1

| Component | Why |
|-----------|-----|
| Ad-hoc session state management | Replaced with explicit state machine |
| Scattered `process.env` calls | Centralized config module |
| Frontend spaghetti (2,275 lines) | Either cleaned up or replaced with framework |
| Patched-together module wiring | Clean plugin-based architecture |
| Symlink workarounds for Render | Proper file structure from the start |

---

## Open Questions

| # | Question | Blocks | Status |
|---|----------|--------|--------|
| 1 | Frontend framework choice | Phase 4 | OPEN — see above |
| 2 | Gothic Horror as first Campaign theme | Phase 5 | OPEN |
| 3 | Storyline vs Adventure Mode naming | Phase 2 | OPEN |
| 4 | Digital DM scope | Phase 5 | OPEN |
| 5 | Campaign session storage (JSON vs DB) | Phase 5 | OPEN — defaulting to JSON for beta |
| 6 | Campaign API auth | Phase 5 | OPEN |

---

*Last updated: August 6, 2026*
