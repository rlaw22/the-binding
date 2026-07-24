# The Binding — Status Tracker

## Current Status: 🟢 Phase 1 Core Complete (minus API keys)           *July 29, 2026*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `095bf50` — chore: add class-abilities and story-mode tests to npm test script
**Test suite:** 1,556 passing across 19 suites (phase1 + image-pipeline + coin-bellcurve + coin-v2 + dice + durability-combat + durability-image + DD-tuning×2 + e2e-expanded + image-cache + image-queue + inventory-edge + shoppe + persistent-store + phase1-integration + phase2 + voice-tts + class-abilities + story-mode)

---

## Phase 1 Core — Completion Tracker                                *July 29, 2026*

| # | Item | Prior | Current | Status |
|---|------|-------|---------|--------|
| 1 | Coin/XP Scoring Engine | 100% | **100%** | ✅ Full rubric per game-design-decisions.md §1: 5 categories, bell curve, tier conversion, chapter summaries, LLM scoring with heuristic fallback |
| 2 | TTS Voice Service | 93% | **93%** | 🔒 Blocked: needs API key (Novita/OpenAI/ElevenLabs) |
| 3 | Dynamic Difficulty | 100% | **100%** | ✅ Rubber-band tuning 84/84, pre-adventure calibration, narrative difficulty wrap |
| 4 | Inventory System | 100% | **100%** | ✅ Weight/encumbrance, 4 Shoppe API endpoints, 75 edge-case tests |
| 5 | Web App PWA | 99% | **99%** | ✅ Manifest: shortcuts, screenshots, edge_side_panel. Session rejoin + spectator skeleton done |
| 6 | End-to-End Smoke Test | 100% | **100%** | ✅ 1,556 tests across 19 suites. All passing |
| 7 | Image Generation Pipeline | 88% | **88%** | 🔧 Scene image display wired end-to-end. Still needs: API key for live generation, provider-level e2e test |

---

## Session 12 — What Was Built                                     *July 29, 2026*

### Test Suite Expansion & Cleanup
- Rewrote `tests/class-abilities.test.js` from Jest syntax to plain-node convention (148 assertions, no test runner dependency) — `ef79cc5`
- Rewrote `tests/story-mode.test.js` from Jest syntax to plain-node convention (89 assertions, no test runner dependency) — `bb5e24a`
- Added both new test files to `npm test` script — now 19 suites running with plain `node` — `095bf50`
- Full test suite verified: 1,556/1,556 passing across all 19 suites
- No vitest dependency needed for test execution (all tests use custom assert/assertEq/assertClose helpers)

### Prior Sessions (for reference)
- Session 11: Image Pipeline Frontend Wiring
- Session 10: PWA Manifest improvements, coin rubric verification
- Session 9: Phase 1 core completion (coins, DD, inventory, shoppe, e2e tests)

---

## Blockers Needing Lawman's Input                                 *July 29, 2026*

1. **TTS API key** — Which provider? Novita (wired, voice mapping done), OpenAI TTS, or ElevenLabs? Once key is provided, end-to-end voice test takes ~10 min.
2. **Image Generation API key** — Grok Imagine or equivalent provider key needed for live scene image generation. Pipeline is wired end-to-end; just needs the key.
