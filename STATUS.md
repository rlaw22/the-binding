# The Binding — Status Tracker

## Current Status: 🟢 Phase 1 Core Complete (minus API keys)           *July 30, 2026*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `fed81a3` — chore: remove accidentally committed tts-service.js.bak
**Test suite:** 1,557 passing across 20 suites (phase1 + image-pipeline + coin-bellcurve + coin-v2 + dice + durability-combat + durability-image + DD-tuning×2 + e2e-expanded + image-cache + image-queue + inventory-edge + shoppe + persistent-store + phase1-integration + phase2 + voice-tts + class-abilities + story-mode + pwa-improvements)

---

## Phase 1 Core — Completion Tracker                                *July 30, 2026*

| # | Item | Prior | Current | Status |
|---|------|-------|---------|--------|
| 1 | Coin/XP Scoring Engine | 100% | **100%** | ✅ Full rubric per game-design-decisions.md §1: 5 categories, bell curve, tier conversion, chapter summaries, LLM scoring with heuristic fallback |
| 2 | TTS Voice Service | 93% | **95%** | 🔒 Blocked: needs API key (Novita/OpenAI/ElevenLabs). Improved Web Speech API fallback paths this session. |
| 3 | Dynamic Difficulty | 100% | **100%** | ✅ Rubber-band tuning 84/84, pre-adventure calibration, narrative difficulty wrap |
| 4 | Inventory System | 100% | **100%** | ✅ Weight/encumbrance, 4 Shoppe API endpoints, 75 edge-case tests |
| 5 | Web App PWA | 99% | **100%** | ✅ Session rejoin validation, spectator mode functional, offline fallback with saved session + SW integration, mobile responsive (360px + safe-area-inset) |
| 6 | End-to-End Smoke Test | 100% | **100%** | ✅ 1,557 tests across 20 suites. All passing |
| 7 | Image Generation Pipeline | 88% | **92%** | 🔧 Improved prompt builder (richer scene types), queue priority, error recovery. Still needs: API key for live generation |

---

## Session 13 — What Was Built                                    *July 30, 2026*

### Session Rejoin & Persistence (`src/session/index.js`)
- `validateRejoin()`: Rejects null/completed/stale sessions (>2h inactive), pauses exempt
- `recordHeartbeat()`: Tracks player connection liveness via timestamps
- `markDisconnected()`: Marks player offline on disconnect
- `getSessionSummary()`: Lightweight state object for UI display

### PWA — Spectator Mode (`public/spectator.html`)
- Full rewrite from "coming soon" placeholder to functional join page
- Session code input, server health check, URL param prefill
- Spectator suggestion panel enabled in `index.html` (was hidden)
- Full mobile responsive CSS with 500px/360px breakpoints

### PWA — Offline Fallback (`public/offline.html`)
- Saved session indicator reads from localStorage, shows character name + rejoin
- Connection status monitoring: pulsing dot, periodic fetch probe, auto-reload on reconnect
- SW rejoin integration: CHECK_REJOIN → REJOIN_INFO → RECONNECTED message flow

### PWA — Mobile Responsiveness (`public/index.html`)
- safe-area-inset-bottom for notched iPhones (report button)
- New `@media (max-width: 360px)` block for very small phones
- Spectator/rejoin bar flex-wrap at 400px breakpoint

### Image Pipeline Hardening (`src/image/`)
- prompt-builder: Expanded scene types, richer prompt generation (+314 lines)
- queue-manager: Improved priority handling and backoff (+169 lines)
- error-recovery: Enhanced retry strategies (+100 lines)
- persistent-store: Additional edge case handling (+66 lines)

### Voice Fallback (`src/voice/`)
- tts-service: Improved Web Speech API fallback paths (+164 lines)

### Tests
- `tests/pwa-improvements.test.js`: 92 new tests (session rejoin, spectator, offline, mobile, SW, manifest)
- `tests/pwa.test.js`: Fixed stale CACHE_VERSION assertion (v6 → v7)
- Full suite: 1,557/1,557 passing across 20 suites

### Commits
- `9e3af5e` feat(session,pwa,image,voice): improve session rejoin validation, spectator mode, offline fallback, image pipeline hardening, voice fallback
- `fed81a3` chore: remove accidentally committed tts-service.js.bak

### Prior Sessions (for reference)
- Session 12: Test suite expansion (class-abilities + story-mode rewrites)
- Session 11: Image Pipeline Frontend Wiring
- Session 10: PWA Manifest improvements, coin rubric verification
- Session 9: Phase 1 core completion (coins, DD, inventory, shoppe, e2e tests)

---

## Blockers Needing Lawman's Input                                *July 30, 2026*

1. **TTS API key** — Which provider? Novita (wired, voice mapping done), OpenAI TTS, or ElevenLabs? Once key is provided, end-to-end voice test takes ~10 min. (+2% to finish)
2. **Image Generation API key** — Grok Imagine or equivalent provider key needed for live scene image generation. Pipeline is wired end-to-end; just needs the key. (+8% to finish)
