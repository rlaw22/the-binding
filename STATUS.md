# The Binding — Status Tracker

## Current Status: 🟢 Phase 1 Core Near-Complete                     *July 21, 2026*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `d75dfe6` — enhanced coin heuristic scoring rubric
**Test suite:** 615/615 passing (143 core + 45 coin-v2 + 66 integration + 51 PWA + 55 durability-image + 72 image-cache + 19 coin-rubric + 35 E2E + 13 E2E-extended + 72 shoppe + 44 DD-tuning)

---

## Phase 1 Core — Completion Tracker                                *July 21, 2026*

| # | Item | Start | Before | Current | Status |
|---|------|-------|--------|---------|--------|
| 1 | Coin/XP Scoring Engine | 40% | 97% | **98%** | ✅ Enhanced heuristic rubric (regex, tiered, context bonus) |
| 2 | TTS Voice Service | 55% | 80% | **85%** | 🟡 Novita voice mapping added, still needs API key for E2E |
| 3 | Dynamic Difficulty | 50% | 96% | **96%** | ✅ Calibration report, tuning API, session reset |
| 4 | Inventory System | 50% | 97% | **97%** | ✅ Shoppe txn log, haggle pricing, recommendations |
| 5 | Web App PWA | 65% | 97% | **97%** | ✅ Spectator mode skeleton, SW v5 caching |
| 6 | End-to-End Smoke Test | 35% | 94% | **97%** | ✅ E2E extended 13/13 green (was 10/13) |
| 7 | Image Generation Pipeline | 0% | 55% | **55%** | 🟡 Blocked on API key, cache + routes done |

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

## What's Next                                                    *July 21, 2026*

1. **TTS (85%→100%):** Wire chosen API key, end-to-end voice test
2. **Image Gen (55%→80%):** Wire chosen provider, end-to-end image test, persistent storage
3. **Coin/XP (98%→100%):** Playtest calibration with real LLM play data
4. **DD (96%→100%):** Playtest rubber-band thresholds with real play data
5. **PWA (97%→100%):** Full offline manifest
6. **Inventory (97%→100%):** Polish, edge cases
7. **E2E (97%→100%):** Full adventure playthroughs, session persistence
