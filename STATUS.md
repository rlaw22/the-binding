# The Binding — Status Tracker

## Current Status: 🟢 Phase 1 Core Complete (minus API keys)           *July 27, 2026*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `4e762d3` — feat: wire coin engine's full scoring rubric into DM service
**Test suite:** 1,649 passing across 37 suites (phase1 + image-pipeline + coin-bellcurve + coin-v2 + dice + durability-combat + durability-image + DD-tuning×2 + e2e-expanded + image-cache + image-queue + inventory-edge + shoppe + persistent-store + phase1-integration + phase2 + voice-tts + class-abilities + story-mode + pwa-improvements + session14-improvements + browser-tts + coin-notifications-calibration + coin-engine-rubric + e2e-extended + e2e-smoke + e2e-voice-image + image-dm-integration + phase2-campaign + phase2-e2e + phase2-extended + phase2bcd + pwa + shoppe-dd-api + tts-error-recovery + voice-profiles + voice-tts-e2e)

---

## Phase 1 Core — Completion Tracker                                *August 5, 2026*

| # | Item | Prior | Current | Status |
|---|------|-------|---------|--------|
| 1 | Coin/XP Scoring Engine | 100% | **100%** | ✅ Full rubric per game-design-decisions.md §1: 5 categories, bell curve, tier conversion, chapter summaries, LLM scoring with heuristic fallback. DM service now uses coin-engine's full buildScoringPrompt with scene context (criteria, examples, scoring tiers) instead of simplified prompt |
| 2 | TTS Voice Service | 95% | **97%** | ✅ Fixed browser-tts.js structural corruption (module.exports split the BrowserTTS object). All 87 browser-tts tests pass. 🔒 Still needs: API key for real TTS provider |
| 3 | Dynamic Difficulty | 100% | **100%** | ✅ Rubber-band tuning 84/84, pre-adventure calibration, narrative difficulty wrap |
| 4 | Inventory System | 100% | **100%** | ✅ Weight/encumbrance, 4 Shoppe API endpoints, 75 edge-case tests |
| 5 | Web App PWA | 100% | **100%** | ✅ Session rejoin validation, spectator mode functional, offline fallback with saved session + SW integration, mobile responsive (360px + safe-area-inset) |
| 6 | End-to-End Smoke Test | 100% | **100%** | ✅ 1,649 tests across 37 suites. All passing |
| 7 | Image Generation Pipeline | 92% | **92%** | 🔧 Prompt builder (11 new scene types, 6 mood directions), 408 transient error recovery, persistent store, DM hooks. Still needs: API key for live generation |

---

## Session 16 — What Was Built                                    *July 27, 2026*

### Coin Engine Rubric Wiring (`4e762d3`)
- Wired coin-engine's canonical `buildScoringPrompt` into DM service's `scoreActionWithLLM`
- DM previously used a simplified `buildCoinScoringPrompt` from `./prompts` (just weight percentages + brief descriptions)
- Now uses the full rubric from `getScoringRubric()` with detailed criteria, examples of excellent/poor play, and scene context
- `scoreActionWithLLM` now accepts `sceneInfo` parameter (sceneIndex, totalScenes, difficulty, adventureId)
- `processAction` constructs sceneInfo from game state and passes it through
- Falls back to simplified prompt when scene info is unavailable (backward compatible)
- 148/148 tape tests pass, require check clean

---

## Session 15 — What Was Built

### IIFE Node.js Compatibility Fix (`4e41d9d`)
- Fixed `window is not defined` crash in `src/story/story-engine.js` and `src/story/class-abilities.js`
- Added dual browser/Node.js export pattern: `window` for browser, `module.exports` for Node.js
- Both files now work in both environments without breaking existing browser behavior

### Test Suite Expansion (`0ddcf50`)
- Added 17 previously-existing test files to npm test script that weren't being run:
  - browser-tts, coin-engine-rubric, coin-notifications-calibration, e2e-extended, e2e-smoke, e2e-voice-image, image-dm-integration, phase2-campaign, phase2-e2e, phase2-extended, phase2bcd, pwa, pwa-improvements, shoppe-dd-api, tts-error-recovery, voice-profiles, voice-tts-e2e
- Total test files in npm test: 37 (was 20)

### Browser TTS Structural Fix (`e4713bc`)
- `public/browser-tts.js` had a structural corruption: `module.exports` block was inserted INSIDE the BrowserTTS object literal between `_visualFallback` and `pause` methods
- This split the object: `pause`, `resume`, `isPaused`, `isSpeaking`, `getVoices`, `ready` were orphaned outside the object, and `module.exports` was never closed (SyntaxError)
- Fixed by moving orphaned methods back into BrowserTTS object and properly closing the export block
- All 87 browser-tts tests now pass

### Test Results
- **1,649 tests passing** across **37 suites** (was 1,590 across 21 suites)
- +59 net new tests discovered by adding existing test files to npm script

---

## Blockers Needing Lawman's Input                                 *August 5, 2026*

1. **TTS API key** — Which provider? Novita (wired, voice mapping done), OpenAI TTS, or ElevenLabs? This is the only thing standing between 97% and 100% on TTS.
2. **Image generation API key** — Grok Imagine (XAI_API_KEY) or DALL-E (OPENAI_API_KEY)? Pipeline scaffolded and ready. This is the only thing standing between 92% and 100% on Image.

---

## What's Next                                                    *August 5, 2026*

1. **TTS (97%→100%):** Wire chosen API key, end-to-end voice test with real provider
2. **Image Gen (92%→100%):** Wire chosen provider, end-to-end image test with real generation
3. **PWA (100%):** Already complete — no further work needed
4. **Playtest:** Real LLM play data for coin/DD calibration refinements
