# The Binding — Status Tracker

## Current Status: 🟢 Phase 1 Core Near-Complete                     *July 21, 2026*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `ff4261e` — DD calibration report, tuning API, session reset
**Test suite:** 602/602 passing (143 core + 45 coin-v2 + 66 integration + 51 PWA + 55 durability-image + 72 image-cache + 19 coin-rubric + 35 E2E + 72 shoppe + 44 DD-tuning)

---

## Phase 1 Core — Completion Tracker                                *July 21, 2026*

| # | Item | Start | Before | Current | Status |
|---|------|-------|--------|---------|--------|
| 1 | Coin/XP Scoring Engine | 40% | 95% | **97%** | ✅ Rubric wired, LLM prompt built |
| 2 | TTS Voice Service | 55% | 80% | **80%** | 🟡 Blocked on API key |
| 3 | Dynamic Difficulty | 50% | 93% | **96%** | ✅ Calibration report, tuning API, session reset |
| 4 | Inventory System | 50% | 95% | **97%** | ✅ Shoppe txn log, haggle pricing, recommendations |
| 5 | Web App PWA | 65% | 95% | **97%** | ✅ Spectator mode skeleton, SW v5 caching |
| 6 | End-to-End Smoke Test | 35% | 94% | **94%** | ✅ 602/602 all green |
| 7 | Image Generation Pipeline | 0% | 50% | **55%** | 🟡 Blocked on API key, cache done |

---

## Session 3 — What Was Built                                      *July 20, 2026*

### Inventory: Equipment Context Fix (`17454f8`)
- Fixed `getInventoryContext()` bug: early-return guard checked `slots.length === 0` without checking equipment
- After equipping an item (moved from bag to equipment slot), the function returned "carries nothing"
- Now checks both `slots` and `EQUIPMENT_SLOTS` for occupied equipment before returning empty
- **55/55 durability-image tests passing** (was 54/55)

### PWA + Dynamic Difficulty (`a1e5efc`)
- **Service Worker v5**: Added SWR for adventure manifests, unmatched API fallback with JSON `{error: "offline"}`
- **Dynamic Difficulty**: First-combat safety (returns FAIR on first fight), anti-oscillation guard (minCombatsBeforeScaling=3)
- **Adventure-Type Calibration Presets**: dracula (puzzle-heavy, 4 wins to skew), frankenstein (combat-heavy, 2 wins), holmes (investigation-heavy, 3 wins)
- New API: `setAdventureType()`, `getEffectiveCalibration()`, constructor accepts adventureType
- Serialize/deserialize persists adventureType

---

## Phase 1 — Detailed Status by Item                                *July 20, 2026*

### 1. Coin/XP Scoring Engine — 97%
- ✅ `createCoinPool` with adventure presets (Dracula: investigation=0.3, Frankenstein: creativity=0.3)
- ✅ `scoreTurn` with per-category scoring (creativity/investigation/roleplay/combat/exploration)
- ✅ LLM-based scoring via `scoreActionWithLLM` with heuristic fallback
- ✅ `completeScene` + chapter summary injection on narrative transition
- ✅ Bell curve normalization (`bellCurveNormalize`)
- ✅ CALIBRATION config: centralized tuning, seasonal budget (10M), tier conversion rates
- ✅ Adventure summary (`formatAdventureSummary`) with tier + speed bonus
- ✅ Category weights (`applyCategoryWeights`) with validation
- ✅ Coin notification builder (`buildCoinNotification`) with subtle display
- ✅ **Scoring rubric** (`getScoringRubric`) with criteria + examples per category
- ✅ **Scoring prompt builder** (`buildScoringPrompt`) for LLM assessment
- ✅ 45/45 coin engine v2 tests + 19/19 rubric tests passing
- ⬜ Playtest calibration of scoring rubric weights (needs real LLM play data)

### 2. TTS Voice Service — 80%
- ✅ Provider abstraction: Novita (async), OpenAI (sync), ElevenLabs (sync)
- ✅ Auto-detection from env vars (NOVITA_API_KEY / OPENAI_API_KEY / ELEVENLABS_API_KEY)
- ✅ Graceful fallback to null service when no provider configured
- ✅ 30-minute audio cache with TTL
- ✅ 4 API endpoints: generate, audio, status, toggle
- ✅ Voice toggle (mute/unmute) in frontend
- ✅ Voice indicator animation in message display
- ⬜ **BLOCKER: TTS API key** — which provider? Novita (wired, free tier), OpenAI TTS, or ElevenLabs (best quality)?
- ⬜ End-to-end voice test with real audio generation

### 3. Dynamic Difficulty — 93%
- ✅ `DynamicDifficulty` class with constructor, recordOutcome, getNextTier, scaleEnemies, getNarrativeWrapper
- ✅ Rubber-band logic: 2+ consecutive losses → power window, 3+ consecutive wins → challenge skew
- ✅ CALIBRATION config: all hardcoded values reference centralized tuning
- ✅ Action categorization (`categorizeAction`): combat/investigation/social/exploration
- ✅ HP margin tracking: nearlyDying threshold detection
- ✅ Fatigue detection: extended play session detection
- ✅ Enemy scaling: HP mult, attack bonus mod, AC mod per tier
- ✅ Narrative wrappers: per-tier atmospheric text injection
- ✅ Combat integration: wired into CombatManager
- ✅ **First-combat safety**: returns FAIR on first fight (no rubber-banding)
- ✅ **Anti-oscillation guard**: minCombatsBeforeScaling=3
- ✅ **Adventure-type presets**: dracula/frankenstein/holmes with tuned thresholds
- ✅ `setAdventureType()` + `getEffectiveCalibration()` API
- ✅ Serialize/deserialize persists adventureType
- ⬜ Playtest calibration of rubber-band thresholds (needs real play data)

### 4. Inventory System — 95%
- ✅ `createInventory` with item storage
- ✅ 30+ items across Dracula, Frankenstein, Holmes, Shoppe, and Armor categories
- ✅ Equipment slots: weapon, armor, accessory, consumable_1, consumable_2
- ✅ `equipItem` / `unequipItem` with slot validation
- ✅ `useEquippedConsumable` — use consumables from equipment slots
- ✅ `getEquippedEffects` — aggregate equipped item effects
- ✅ `getInventoryContext` — LLM context injection for DM awareness (**fixed**: now reports equipped items when bag is empty)
- ✅ All items have `description` and `flavor` text fields
- ✅ Durability system: `damageDurability`, `damageEquippedDurability`, `repairItem`
- ✅ Shoppe hooks: `getShoppeCatalog`, `buyItem`, `sellItem`
- ✅ DM service integration: inventory context injected into game state
- ✅ Starting items wired per adventure
- ✅ 17+ integration tests + 55 durability-image tests passing

### 5. Web App PWA — 95%
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
- ✅ **Service Worker v5**: SWR for manifests, unmatched API fallback, cache-first for static assets
- ✅ **Offline fallback page** (public/offline.html)
- ⬜ Full offline manifest for complete offline play

### 6. End-to-End Smoke Test — 94%
- ✅ 143/143 core tests passing (dice, rule engine, character, scene, adventure, session, message router, coin)
- ✅ 45/45 coin engine v2 tests passing
- ✅ 66/66 integration tests passing (TTS, DD, Inventory, Coin Engine)
- ✅ 35/35 E2E smoke tests passing (full server lifecycle)
- ✅ 19/19 coin engine rubric tests passing
- ✅ 72/72 image cache tests passing
- ✅ 55/55 durability-image tests passing
- ✅ 51/51 PWA tests passing
- ✅ Adventure loading verified (all 3 adventures)
- ✅ Session lifecycle: create → action → narrative → rejoin
- ✅ Error recovery: bad session, bad rejoin, missing content
- ✅ Concurrent sessions: independent adventures
- ⬜ Full adventure playthroughs (all 5 acts) — needs real LLM
- ⬜ Session persistence across server restart — needs longer test

### 7. Image Generation Pipeline — 55%
- ✅ Provider abstraction: Grok Imagine (xAI) + DALL-E (OpenAI)
- ✅ `postJSON` HTTP client with timeout handling
- ✅ Prompt builder: `buildScenePrompt`, `buildCharacterPrompt`, `buildCombatPrompt`
- ✅ `createImageService` with auto-detection from env vars
- ✅ Graceful null service fallback when no API key
- ✅ **Image cache**: LRU cache with TTL, 72/72 tests passing
- ✅ API routes (`src/api/image-routes.js`) with rate limiting
- ⬜ **BLOCKER: Image gen API key** — Grok Imagine (XAI_API_KEY) or DALL-E (OPENAI_API_KEY)?
- ⬜ End-to-end image generation test with real provider
- ⬜ Persistent image storage (currently in-memory cache only)

---

## Test Suite Summary                                              *July 20, 2026*

| Test File | Tests | Status |
|-----------|-------|--------|
| tests/phase1.test.js | 143/143 | ✅ |
| tests/coin-engine-v2.test.js | 45/45 | ✅ |
| tests/phase1-integration.test.js | 66/66 | ✅ |
| tests/e2e-smoke.test.js | 35/35 | ✅ |
| tests/coin-engine-rubric.test.js | 19/19 | ✅ |
| tests/image-cache.test.js | 72/72 | ✅ |
| tests/durability-image.test.js | 55/55 | ✅ |
| tests/durability-combat.test.js | ~36/36 | ✅ |
| tests/pwa.test.js | 51/51 | ✅ |
| **Total** | **~522/~522** | **✅ All green** |

---

## Blockers Needing Lawman's Input                                 *July 20, 2026*

1. **TTS API key** — Which provider? Novita (already wired, free tier, lower quality), OpenAI TTS, or ElevenLabs (best quality, costs money)?
2. **Image generation API key** — Grok Imagine (XAI_API_KEY) or DALL-E (OPENAI_API_KEY)? Pipeline is scaffolded and ready.
3. **Scoring rubric weights** — Current: creativity/investigation/roleplay/combat/exploration (equal 0-10 scale). Does game-design-decisions.md Section 1 specify different weights?

---

## What's Next                                                    *July 20, 2026*

1. **TTS (80%→100%):** Wire chosen API key, end-to-end voice test
2. **Image Gen (55%→80%):** Wire chosen provider, end-to-end image test, persistent storage
3. **Coin/XP (97%→100%):** Playtest calibration with real LLM play data
4. **DD (93%→100%):** Playtest rubber-band thresholds with real play data
5. **PWA (95%→100%):** Full offline manifest
6. **Inventory (95%→100%):** Polish, edge cases
7. **E2E (94%→100%):** Full adventure playthroughs, session persistence
