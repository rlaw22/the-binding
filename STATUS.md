# The Binding — Status Tracker

## Current Status: 🟢 Phase 1 Core Complete                          *July 19, 2026*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `4f3cce4` — E2E smoke test (35/35 passing)
**Test suite:** 288/288 passing (142 core + 45 coin-v2 + 66 integration + 35 E2E)

---

## Phase 1 Core — Completion Tracker                              *July 19, 2026*

| # | Item | Before | Current | Status |
|---|------|--------|---------|--------|
| 1 | Coin/XP Scoring Engine | 40% | **95%** | ✅ Near-complete |
| 2 | TTS Voice Service | 55% | **80%** | 🟡 Blocked on API key |
| 3 | Dynamic Difficulty | 50% | **85%** | ✅ Functional |
| 4 | Inventory System | 50% | **80%** | ✅ Functional |
| 5 | Web App PWA | 65% | **80%** | ✅ Functional |
| 6 | End-to-End Smoke Test | 35% | **85%** | ✅ Near-complete |
| 7 | Image Generation Pipeline | 0% | **50%** | 🟡 Blocked on API key |

---

## Phase 1 — What Was Built This Session                        *July 19, 2026*

### E2E Smoke Test (`4f3cce4`)
- Rewrote from raw `http.request` to Fastify's `server.inject()` pattern (matching working phase1.test.js)
- **35/35 tests passing** covering:
  - Server startup + health check
  - Adventure loading (Dracula, Frankenstein, Holmes)
  - Session lifecycle: create, retrieve, rejoin code
  - Action flow: submit action → narrative response → follow-up actions
  - Message polling and accumulation
  - Session rejoin via short codes
  - Error recovery: bad session ID (404), bad rejoin code (404), missing content (400)
  - Concurrent sessions: two independent adventures running simultaneously
  - Voice API status endpoint

### Integration Test Fixes (`159cf50`)
- Fixed `recordOutcome()` API: expects `'victory'|'defeat'|'fled'` string, not boolean
- Fixed `scaleEnemies()` API: expects array (uses `.map()`), not single object
- **66/66 integration tests now pass** (TTS, DD, Inventory, Coin Engine)

---

## Phase 1 — Detailed Status by Item                            *July 19, 2026*

### 1. Coin/XP Scoring Engine — 95%
- ✅ `createCoinPool` with adventure presets (Dracula: investigation=0.3, Frankenstein: creativity=0.3)
- ✅ `scoreTurn` with per-category scoring (creativity/investigation/roleplay/combat/exploration)
- ✅ LLM-based scoring via `scoreActionWithLLM` with heuristic fallback
- ✅ `completeScene` + chapter summary injection on narrative transition
- ✅ Bell curve normalization (`bellCurveNormalize`)
- ✅ CALIBRATION config: centralized tuning, seasonal budget (10M), tier conversion rates
- ✅ Adventure summary (`formatAdventureSummary`) with tier + speed bonus
- ✅ Category weights (`applyCategoryWeights`) with validation
- ✅ Coin notification builder (`buildCoinNotification`) with subtle display
- ✅ 45/45 coin engine v2 tests passing
- ⬜ Playtest calibration of scoring rubric weights (needs real LLM play data)

### 2. TTS Voice Service — 80%
- ✅ Provider abstraction: Novita (async), OpenAI (sync), ElevenLabs (sync)
- ✅ Auto-detection from env vars (NOVITA_API_KEY / OPENAI_API_KEY / ELEVENLABS_API_KEY)
- ✅ Graceful fallback to null service when no provider configured
- ✅ 30-minute audio cache with TTL
- ✅ 4 API endpoints: generate, audio, status, toggle
- ✅ Voice toggle (mute/unmute) in frontend
- ✅ Voice indicator animation in message display
- ⬜ **BLOCKER: TTS API key** — which provider? Novita works but quality limited. Need Lawman's choice.
- ⬜ End-to-end voice test with real audio generation

### 3. Dynamic Difficulty — 85%
- ✅ `DynamicDifficulty` class with constructor, recordOutcome, getNextTier, scaleEnemies, getNarrativeWrapper
- ✅ Rubber-band logic: 2+ consecutive losses → power window, 3+ consecutive wins → challenge skew
- ✅ CALIBRATION config: all hardcoded values reference centralized tuning
- ✅ Action categorization (`categorizeAction`): combat/investigation/social/exploration/investigation
- ✅ HP margin tracking: nearlyDying threshold detection
- ✅ Fatigue detection: extended play session detection
- ✅ Enemy scaling: HP mult, attack bonus mod, AC mod per tier
- ✅ Narrative wrappers: per-tier atmospheric text injection
- ✅ Combat integration: wired into CombatManager.startCombat + processPlayerAction
- ✅ 20+ integration tests passing
- ⬜ Playtest calibration of rubber-band thresholds (needs real play data)

### 4. Inventory System — 80%
- ✅ `createInventory` with item storage
- ✅ 17 items in ITEMS catalog
- ✅ Equipment slots: weapon, armor, accessory (EQUIPMENT_SLOTS)
- ✅ `equipItem` / `unequipItem` with slot validation
- ✅ `useEquippedConsumable` — use consumables from equipment slots
- ✅ `getEquippedEffects` — aggregate equipped item effects
- ✅ `getInventoryContext` — LLM context injection for DM awareness
- ✅ Shoppe hooks: `getShoppeCatalog`, `buyItem`, `sellItem`
- ✅ DM service integration: inventory context injected into game state
- ✅ Starting items wired per adventure
- ✅ 17 integration tests passing
- ⬜ Item descriptions and flavor text
- ⬜ Durability tracking on equipment use

### 5. Web App PWA — 80%
- ✅ Mobile responsive CSS (viewport-fit=cover, flex layout)
- ✅ Split scroll layout: narrative (top) + actions (bottom) with drag divider
- ✅ Session rejoin via short codes (rejoin bar with copy button)
- ✅ Spectator mode skeleton (spectator bar + suggestion input)
- ✅ Voice toggle (fixed position, mute/unmute)
- ✅ Coin bar with progress track and flash animation
- ✅ Character bar with stats display
- ✅ Beta code gate (BIND-TY5Y)
- ✅ PWA manifest + service worker
- ✅ Error recovery UI (reconnect banner + retry)
- ⬜ Service worker caching strategy (cache-first for assets)
- ⬜ Offline manifest for full offline play

### 6. End-to-End Smoke Test — 85%
- ✅ 142/142 core tests passing (dice, rule engine, character, scene, adventure, session, message router, coin)
- ✅ 45/45 coin engine v2 tests passing
- ✅ 66/66 integration tests passing (TTS, DD, Inventory, Coin Engine)
- ✅ 35/35 E2E smoke tests passing (full server lifecycle)
- ✅ Adventure loading verified (all 3 adventures)
- ✅ Session lifecycle: create → action → narrative → rejoin
- ✅ Error recovery: bad session, bad rejoin, missing content
- ✅ Concurrent sessions: independent adventures
- ⬜ Full adventure playthroughs (all 5 acts) — needs real LLM
- ⬜ Session persistence across server restart — needs longer test

### 7. Image Generation Pipeline — 50%
- ✅ Provider abstraction: Grok Imagine (xAI) + DALL-E (OpenAI)
- ✅ `postJSON` HTTP client with timeout handling
- ✅ Prompt builder: `buildScenePrompt`, `buildCharacterPrompt`, `buildCombatPrompt`
- ✅ `createImageService` with auto-detection from env vars
- ✅ Graceful null service fallback when no API key
- ✅ 47 lines in index.js, 324 lines in image-service.js, 203 lines in prompt-builder.js
- ⬜ **BLOCKER: Image gen API key** — Grok Imagine (XAI_API_KEY) or DALL-E (OPENAI_API_KEY)?
- ⬜ End-to-end image generation test
- ⬜ Image caching and storage

---

## Test Suite Summary                                            *July 19, 2026*

| Test File | Tests | Status |
|-----------|-------|--------|
| tests/phase1.test.js | 142/142 | ✅ |
| tests/coin-engine-v2.test.js | 45/45 | ✅ |
| tests/phase1-integration.test.js | 66/66 | ✅ |
| tests/e2e-smoke.test.js | 35/35 | ✅ |
| **Total** | **288/288** | **✅ All green** |

---

## Blockers Needing Lawman's Input                               *July 19, 2026*

1. **TTS API key** — Which provider? Novita (already wired, free tier, lower quality), OpenAI TTS, or ElevenLabs (best quality, costs money)?
2. **Image generation API key** — Grok Imagine (XAI_API_KEY) or DALL-E (OPENAI_API_KEY)? Pipeline is scaffolded and ready.
3. **Scoring rubric weights** — Current: creativity/investigation/roleplay/combat/exploration (equal 0-10 scale). Does game-design-decisions.md Section 1 specify different weights?

---

## What's Next                                                  *July 19, 2026*

1. **Coin/XP (95%→100%):** Playtest calibration with real LLM play data
2. **TTS (80%→100%):** Wire chosen API key, end-to-end voice test
3. **Dynamic Difficulty (85%→100%):** Playtest rubber-band thresholds
4. **Inventory (80%→100%):** Item descriptions, durability tracking
5. **PWA (80%→100%):** Service worker caching, offline manifest
6. **Smoke Tests (85%→100%):** Full adventure playthroughs, session persistence
7. **Image Gen (50%→100%):** Wire chosen provider, end-to-end image test
