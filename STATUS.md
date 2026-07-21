# The Binding — Status Tracker

## Current Status: 🟢 Phase 1 Core Near-Complete                     *July 23, 2026*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `786085f` — test(e2e): add voice & image integration E2E tests (13/13 passing)
**Test suite:** 676+/676+ passing (143 core + 45 coin-v2 + 66 integration + 51 PWA + 55 durability-image + 72 image-cache + 19 coin-rubric + 35 E2E + 13 E2E-extended + 13 E2E-voice-image + 72 shoppe + 44 DD-tuning + 24 image-queue + 23 voice-profiles + 25 image-dm-integration + 24 tts-error-recovery)

---

## Phase 1 Core — Completion Tracker                                *July 23, 2026*

| # | Item | Start | Before | Current | Status |
|---|------|-------|--------|---------|--------|
| 1 | Coin/XP Scoring Engine | 40% | 97% | **98%** | ✅ Enhanced heuristic rubric (regex, tiered, context bonus) |
| 2 | TTS Voice Service | 55% | 90% | **92%** | ✅ Error recovery (retry+fallback+CB, 24/24 tests), still needs API key for live E2E |
| 3 | Dynamic Difficulty | 50% | 96% | **97%** | ✅ Momentum detection, session fatigue, scene-based pickDifficultyTier |
| 4 | Inventory System | 50% | 97% | **97%** | ✅ Shoppe txn log, haggle pricing, recommendations |
| 5 | Web App PWA | 65% | 97% | **97%** | ✅ Spectator mode skeleton, SW v5 caching |
| 6 | End-to-End Smoke Test | 35% | 97% | **98%** | ✅ Voice+image E2E 13/13 green, DM image hooks confirmed |
| 7 | Image Generation Pipeline | 0% | 75% | **82%** | ✅ DM integration tests (25/25), error recovery wired, queue manager |

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

## Blockers Needing Lawman's Input                                 *July 21, 2026*

1. **TTS API key** — Which provider? Novita (wired, voice mapping done), OpenAI TTS, or ElevenLabs (best quality)?
2. **Image generation API key** — Grok Imagine (XAI_API_KEY) or DALL-E (OPENAI_API_KEY)? Pipeline scaffolded and ready.
3. **Scoring rubric weights** — Current: creativity/investigation/roleplay/combat/exploration (equal 0-10 scale). Does game-design-decisions.md Section 1 specify different weights?

---

---

## What's Next                                                    *July 22, 2026*

1. **Image Gen (75%→100%):** Wire chosen provider (Grok/DALL-E/Replicate), end-to-end image test
2. **TTS (90%→100%):** Wire chosen API key, end-to-end voice test
3. **Coin/XP (98%→100%):** Playtest calibration with real LLM play data
4. **DD (97%→100%):** Playtest rubber-band thresholds with real play data
5. **PWA (97%→100%):** Full offline manifest
6. **Inventory (97%→100%):** Polish, edge cases
7. **E2E (97%→100%):** Full adventure playthroughs, session persistence
