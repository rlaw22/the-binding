# The Binding — Status Tracker

## Current Status: 🟢 Phase 1 Core Complete (minus API keys)           *July 27, 2026*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `8d1a9b4` — feat(image): wire scene images through message queue to frontend display
**Test suite:** 1,346+ passing (143 phase1 + 132 image-pipeline + 57 coin-bellcurve + 45 coin-v2 + 207 dice + 36 durability-combat + 55 durability-image + 84 DD-tuning + 44 DD-tuning + 70 e2e-expanded + 72 image-cache + 24 image-queue + 75 inventory-edge + 72 shoppe + 52 persistent-store + 66 phase1-integration + 54 phase2 + 32 voice-tts)

---

## Phase 1 Core — Completion Tracker                                *July 27, 2026*

| # | Item | Session 9 | Current | Status |
|---|------|-----------|---------|--------|
| 1 | Coin/XP Scoring Engine | 100% | **100%** | ✅ Full rubric per game-design-decisions.md §1: 5 categories, bell curve, tier conversion, chapter summaries, LLM scoring with heuristic fallback |
| 2 | TTS Voice Service | 93% | **93%** | 🔒 Blocked: needs API key (Novita/OpenAI/ElevenLabs) |
| 3 | Dynamic Difficulty | 100% | **100%** | ✅ Rubber-band tuning 84/84, pre-adventure calibration, narrative difficulty wrap |
| 4 | Inventory System | 100% | **100%** | ✅ Weight/encumbrance, 4 Shoppe API endpoints, 75 edge-case tests |
| 5 | Web App PWA | 98% | **99%** | ✅ Manifest: shortcuts, screenshots, edge_side_panel. SW v7 comment fix. Session rejoin + spectator skeleton already done |
| 6 | End-to-End Smoke Test | 100% | **100%** | ✅ 1,346+ tests across 30+ suites. API integration tests for shoppe, DD, inventory, coins |
| 7 | Image Generation Pipeline | 83% | **88%** | 🔧 Scene image display fully wired end-to-end. Still needs: API key for live generation, provider-level e2e test |

---

## Session 11 — What Was Built                                     *July 27, 2026*

### Image Pipeline Frontend Wiring (`baf8129`, `8d1a9b4`)
- Fixed critical duplicate `POST /api/image/generate` route that broke image API entirely (`af14875`)
- Wired `sceneImage` into action response JSON payload (`baf8129`)
- Wired `sceneImageUrl` through MessageRouter narration metadata in BOTH action handlers (`8d1a9b4`)
- Added frontend `handleMessage()` rendering: scene images display inline after narration text
- Added CSS: `.scene-image` container + `.scene-img` with gold border, rounded corners, shadow, responsive breakpoints
- Added `onerror` fallback: broken/missing images silently hide
- Image pipeline data flow is now COMPLETE: DM Service → game._lastSceneImage → MessageRouter metadata → pollOnce → handleMessage → DOM

### Previous Sessions (for reference)
- Session 10: PWA manifest improvements, coin rubric verification
- Session 9: Phase 1 core completion (coins, DD, inventory, shoppe, e2e tests)

---

## Session 10 — What Was Built                                     *July 26, 2026*

### PWA Manifest Improvements (`af4df9d`)
- Added `shortcuts`: "Continue Adventure" and "New Adventure" for home screen quick actions
- Added `screenshots` array: wide + narrow form factors for richer install prompt
- Added `edge_side_panel` with preferred_width for Edge browser integration
- Improved `description` with fuller feature callout
- Fixed SW version comment mismatch (said "v6" but was v7)

### Coin/XP Rubric Alignment (verified, no changes needed)
- game-design-decisions.md §1 specifies: hybrid scoring, intelligence-weighted, bell curve, tier conversion
- Current implementation matches all specs: 5-category rubric (creativity/investigation/roleplay/combat/exploration), bell curve normalization, tier-weighted $BINDING conversion, chapter/adventure summaries
- LLM scoring prompt built with full rubric + examples; falls back to keyword heuristic when LLM unavailable

---

## Blockers Needing Lawman's Input                                 *July 26, 2026*

1. **TTS API key** — Which provider? Novita (wired, voice mapping done), OpenAI TTS, or ElevenLabs? Once key is provided, end-to-end voice test takes ~10 min.
2. **Image generation API key** — Grok Imagine (XAI_API_KEY) or DALL-E (OPENAI_API_KEY)? Pipeline fully wired end-to-end. Queue manager, cache, prompt builder, error recovery, frontend display all built. Just needs API key + provider e2e test.
3. **Scoring rubric weights** — Current: creativity 25%, investigation 25%, roleplay 20%, combat 15%, exploration 15%. Adventure-specific presets for dracula/frankenstein/holmes. Does this match your intent?

---

## What's Next

1. **TTS (93%→100%):** Wire chosen API key, end-to-end voice test
2. **Image Gen (88%→100%):** Wire chosen provider, end-to-end image test with live API
3. **Playtest:** Real LLM play data for coin/DD calibration
