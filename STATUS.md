# The Binding — Status Tracker

## Current Status: 🟢 Phase 1 Core Complete (minus API keys)           *August 4, 2026*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `eadacc5` — feat: session 14 — story-engine module, image/voice/prompt improvements, 33 new tests
**Test suite:** 1,590 passing across 21 suites (phase1 + image-pipeline + coin-bellcurve + coin-v2 + dice + durability-combat + durability-image + DD-tuning×2 + e2e-expanded + image-cache + image-queue + inventory-edge + shoppe + persistent-store + phase1-integration + phase2 + voice-tts + class-abilities + story-mode + pwa-improvements + session14-improvements)

---

## Phase 1 Core — Completion Tracker                                *August 4, 2026*

| # | Item | Prior | Current | Status |
|---|------|-------|---------|--------|
| 1 | Coin/XP Scoring Engine | 100% | **100%** | ✅ Full rubric per game-design-decisions.md §1: 5 categories, bell curve, tier conversion, chapter summaries, LLM scoring with heuristic fallback |
| 2 | TTS Voice Service | 95% | **95%** | 🔒 Blocked: needs API key (Novita/OpenAI/ElevenLabs). Added browser TTS pause/resume/isSpeaking/getVoices/ready API this session. |
| 3 | Dynamic Difficulty | 100% | **100%** | ✅ Rubber-band tuning 84/84, pre-adventure calibration, narrative difficulty wrap |
| 4 | Inventory System | 100% | **100%** | ✅ Weight/encumbrance, 4 Shoppe API endpoints, 75 edge-case tests |
| 5 | Web App PWA | 100% | **100%** | ✅ Session rejoin validation, spectator mode functional, offline fallback with saved session + SW integration, mobile responsive (360px + safe-area-inset) |
| 6 | End-to-End Smoke Test | 100% | **100%** | ✅ 1,590 tests across 21 suites. All passing |
| 7 | Image Generation Pipeline | 92% | **92%** | 🔧 Improved prompt builder (11 new scene types, 6 mood directions), 408 transient error recovery. Still needs: API key for live generation |

---

## Session 14 — What Was Built                                    *August 4, 2026*

### Story Engine Module (src/story/story-engine.js)
- New deterministic button processing engine for Story Mode
- Handles ALL game logic without LLM involvement — pre-authored content controls "truth"
- Scene engine require path fixed (./story → ../story)

### Browser TTS Improvements (public/browser-tts.js)
- Added pause(), resume(), isPaused(), isSpeaking(), getVoices(), ready() methods
- Volume set on utterance from VOICE_PROFILES
- 12 new tests covering all new API methods

### Image Pipeline Hardening (src/image/)
- prompt-builder: 11 new mock scene categories (ritual, investigation, transformation, escape, dream, death, travel, conversation, discovery, item, background)
- prompt-builder: 6 new mood directions (romantic, chaotic, oppressive, whimsical, sacred, fallback)
- image-service: 408 added to TRANSIENT_STATUS_CODES for better error recovery

### Tests
- tests/session14-improvements.test.js: 33 new tests (mock themes, mood directions, error recovery, browser TTS API)
- Full suite: 1,590/1,590 passing across 21 suites

### Commits
- eadacc5 feat: session 14 — story-engine module, image/voice/prompt improvements, 33 new tests

### Prior Sessions (for reference)
- Session 13: PWA session rejoin, spectator mode, offline fallback, mobile responsiveness, image pipeline hardening, voice fallback
- Session 12: Test suite expansion (class-abilities + story-mode rewrites)
- Session 11: Image Pipeline Frontend Wiring

---

## Blockers Needing Lawman's Input                                *August 4, 2026*

1. **TTS API key** — Which provider? Novita (wired, voice mapping done), OpenAI TTS, or ElevenLabs? Once key is provided, end-to-end voice test takes ~10 min. (+5% to finish)
2. **Image Generation API key** — Grok Imagine or equivalent provider key needed for live scene image generation. Pipeline is wired end-to-end; just needs the key. (+8% to finish)
