# The Binding — Status Tracker

## Current Status: 🟢 Phase 2 Core Near-Complete                     *July 24, 2026*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `c3850a1` — chore(test): expand npm test from 2 to 17 suites, fix DD tuning level-0 assertion
**Test suite:** 1,315/1,315 passing (142 phase1 + 132 image-pipeline + 57 coin-bellcurve + 45 coin-v2 + 207 dice + 36 durability-combat + 55 durability-image + 128 DD-tuning + 70 e2e-expanded + 72 image-cache + 24 image-queue + 75 inventory-edge + 72 shoppe + 52 persistent-store + 66 phase1-integration + 54 phase2 + 32 voice-tts)

---

## Phase 1 Core — Completion Tracker                                *July 24, 2026*

| # | Item | Start | Before | Current | Status |
|---|------|-------|--------|---------|--------|
| 1 | Coin/XP Scoring Engine | 40% | 98% | **99%** | ✅ Bell-curve coin pool distribution (Box-Muller), convertToBinding(), enhanced chapter summary |
| 2 | TTS Voice Service | 55% | 92% | **93%** | ✅ Error recovery solid, still needs API key for live E2E |
| 3 | Dynamic Difficulty | 50% | 97% | **99%** | ✅ Pre-adventure difficulty, 70/20/10 buckets, narrative difficulty text |
| 4 | Inventory System | 50% | 97% | **99%** | ✅ Slot validation, weight/encumbrance, item trading |
| 5 | Web App PWA | 65% | 97% | **98%** | ✅ SW v7 reconnect monitor, auto-refresh on connectivity restore |
| 6 | End-to-End Smoke Test | 35% | 98% | **99%** | ✅ 1,315 tests across 17 suites all green |
| 7 | Image Generation Pipeline | 0% | 82% | **83%** | ✅ DM integration confirmed, queue manager solid, needs API key

---

## Session 8 — What Was Built                                      *July 24, 2026*

### Coin Engine Bell-Curve Pools (`d4fe2ff`)
- New `bellCurveSample()` using Box-Muller transform: distributes scene max coins statistically
- `createCoinPool()` now draws per-scene coins from bell curve centered on base-per-scene value
- New `convertToBinding()`: tier-weighted conversion to $BINDING (Bronze 1x, Silver 1.5x, Gold 2.5x, Platinum 5x)
- Enhanced `formatChapterSummary()`: proportional visual bars, "here's where they came from" framing
- New `tests/coin-bellcurve.test.js` (57/57 passing)

### Dynamic Difficulty Pre-Adventure & Buckets (`d4fe2ff`)
- New `preAdventureDifficulty(playerLevel, adventureId)`: player-level baseline calibration before adventure starts
- New `getDifficultyBucket(sceneIndex, totalScenes)`: 70/20/10 rubber-band split (standard/power_window/challenge_spike)
- New `narrativeDifficultyWrap(difficulty, adventure)`: adventure-specific flavor text (Dracula/Frankenstein/Holmes)
- Per-adventure difficulty profiles: Dracula (puzzle-heavy, 0.9x), Frankenstein (combat-heavy, 1.15x), Holmes (investigation, 1.0x)
- DD tuning tests expanded: 84/84 passing (was 44)

### Inventory Weight & Trading (`d4fe2ff`)
- New `validateEquipmentSlot()`: item-type-to-slot validation
- Item weight system: `ITEM_WEIGHT` per type, per-item overrides, `DEFAULT_CAPACITY` (50 units)
- New `getInventoryWeight()`, `getCapacity()`, `getEncumbranceStatus()`
- New `tradeItem()`: NPC trades, shop transactions, party item sharing
- Inventory edge-case tests: 75/75 passing

### PWA Reconnect Monitor (`d4fe2ff`)
- Service worker v7 with `startReconnectMonitor()`: polls connectivity every 5s
- Auto-notifies clients with `RECONNECTED` message when connectivity returns
- Offline cache: proper `Promise.all` for offline.html + dice assets

### Test Suite Expansion (`c3850a1`)
- Expanded `npm test` from 2 suites to 17 suites (1,315 tests)
- Added: coin-bellcurve, coin-engine-v2, dice, durability-combat, durability-image, DD-tuning, e2e-expanded, image-cache, image-queue, inventory-edge, inventory-shoppe, persistent-store, phase1-integration, phase2, voice-tts
- Fixed DD tuning level-0 assertion (level 0 correctly treated as level 1)
- Fixed phase1-integration range checks for bell-curve coin pool variance

---

## Session 7 — What Was Built                                      *July 23, 2026*

### TTS Error Recovery (`c734833`)
- New `createTTSWithRecovery()` in `src/voice/tts-service.js`: wraps any TTS service with exponential backoff retry, provider fallback chain (primary → mock), circuit breaker, and failure logging
- New `TTSFailureLogger`: tracks failures with provider/attempt/text context for debugging
- Circuit breaker integration: auto-skips failing providers after threshold, recovers on success
- New `tests/tts-error-recovery.test.js` (24/24 passing): covers happy path, retry, circuit breaker, edge cases, fallback chain dedup

### DM ↔ Image Pipeline Integration (`4ff9fba`)
- New `tests/image-dm-integration.test.js` (25/25 passing): confirms DM service correctly wires scene/combat/NPC/item image hooks through error-recovery layer
- Verifies all 4 image generation hooks are accessible from DM service and produce results via mock provider

### E2E Voice & Image Integration (`786085f`)
- New `tests/e2e-voice-image.test.js` (13/13 passing): end-to-end API tests for voice generation, image list, DM image hooks (scene/combat/NPC/item), and TTS error recovery integration
- Covers: Voice API (status, generate, empty text, character options, invalid audio), Image API (list), DM image hooks, TTS recovery (fallback, stats, circuit breaker)

---

## Session 6 — What Was Built                                      *July 22, 2026*

### Image Queue Manager (`df2269a`)
- New `src/image/queue-manager.js` (315 lines): production infrastructure for image generation
  - Concurrency control (max parallel generations, default 3)
  - Provider fallback chain (primary → secondary → mock)
  - Retry with exponential backoff
  - Priority queue (scene > combat > character > npc > item > background)
  - Deduplication via promptHash (pending in-flight + completed caches, 5-min window)
  - Rate limiting per provider (xai/openai: 10/min, replicate: 5/min, mock: 100/min)
  - Stats, clear, maintenance API
- New `tests/image-queue.test.js` (24/24 passing)
- Fixed dedup bug: `pendingPrompts.add()` called on enqueue, `.delete()` on success/exhaustion

### TTS Voice Profiles (`df2269a`)
- Added `CHARACTER_VOICE_PRESETS` (5 types: narrator, villain, ally, merchant, monster)
- Added `DEFAULT_VOICE_SETTINGS` and `getVoiceForCharacter()` with case insensitivity + whitespace trimming
- New `tests/voice-profiles.test.js` (23/23 passing)
- Covers: profile mapping, character resolution, fallback to default, copy safety

### DD Rubber-Band Enhancements (`df2269a`)
- Added `getMomentumState()` — detects hot_streak/struggling/stable from recent combat
- Added `getPlayerPerformance()` — rolling win rate, avg HP margin, death count, momentum
- Added `getSessionFatigue()` — time-based fatigue detection (fresh/tired/exhausted)
- Added `pickDifficultyTier()` — deterministic scene-based tier selection using stable hash
- Added `RUBBER_BAND_CONFIG` with scene-position weighting and player-level scaling
- DD tests: 44/44 passing

---

## Session 5 — What Was Built                                      *July 21, 2026*

### E2E Extended Tests (`c293183`)
- Fixed 5 field name mismatches in `tests/e2e-extended.test.js`:
  - `rejoined.id` → `rejoined.sessionId` (rejoin endpoint uses sessionId)
  - `s1.id` / `s2.id` → `s1.sessionId` / `s2.sessionId`
  - `rejoined.messages` → `rejoined.adventureName` + `rejoined.state` + `rejoined.totalTurns`
  - `session.adventureId` → `session.adventureName` (create endpoint returns adventureName)
- Result: **13/13 passing** (was 10/13)
- Covers: session rejoin flow, error recovery, concurrent sessions, session state persistence

### TTS Novita Voice Mapping (`c293183`)
- Added `OPENAI_TO_NOVITA_VOICE_MAP` in `src/voice/tts-service.js`
- Maps OpenAI voice names (nova, onyx, echo, shimmer, alloy, fable) to Novita voice IDs (Emily, Adam, Antoni, Bella, Elli, Josh)
- Fallback to 'Emily' when voice not recognized
- Fixes "voice_id: nova not supports" error from Novita API

### Coin Engine Heuristic Scoring (`d75dfe6`)
- Enhanced `scoreAction()` in `src/ai-dm/dm-service.js`:
  - Replaced `string.includes()` with regex-based keyword matching
  - 3-tier scoring: Strong (3pts), Moderate (2pts), Weak (1pt)
  - Expanded keyword coverage: 5→12 creativity, 4→8 investigation, 3→7 combat, 3→7 exploration, 2→6 roleplay
  - Added narrative context overlap bonus (player references scene details → +1)
- This is the scoring that runs in production when LLM is unavailable (the common case)

---

## Blockers Needing Lawman's Input                                 *July 24, 2026*

1. **TTS API key** — Which provider? Novita (wired, voice mapping done), OpenAI TTS, or ElevenLabs (best quality)?
2. **Image generation API key** — Grok Imagine (XAI_API_KEY) or DALL-E (OPENAI_API_KEY)? Pipeline scaffolded and ready.
3. **Scoring rubric weights** — Current: creativity/investigation/roleplay/combat/exploration (equal 0-10 scale). Does game-design-decisions.md Section 1 specify different weights?

---

---

## What's Next                                                    *July 24, 2026*

1. **Image Gen (83%→100%):** Wire chosen provider (Grok/DALL-E/Replicate), end-to-end image test
2. **TTS (93%→100%):** Wire chosen API key, end-to-end voice test
3. **Coin/XP (99%→100%):** Playtest calibration with real LLM play data
4. **DD (99%→100%):** Playtest rubber-band thresholds with real play data
5. **PWA (98%→100%):** Full offline manifest, mobile polish
6. **Inventory (99%→100%):** Polish, edge cases
7. **E2E (99%→100%):** Full adventure playthroughs, session persistence
