# The Binding — Status Tracker

## Current Status: 🟢 Phase 1 Core Complete (minus API keys)           *July 25, 2026*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `34e3a9f` — test(api): add shoppe + DD + inventory weight integration tests (31/31)
**Test suite:** 1,346/1,346 passing (142 phase1 + 132 image-pipeline + 57 coin-bellcurve + 45 coin-v2 + 207 dice + 36 durability-combat + 55 durability-image + 128 DD-tuning + 70 e2e-expanded + 72 image-cache + 24 image-queue + 75 inventory-edge + 72 shoppe + 52 persistent-store + 66 phase1-integration + 54 phase2 + 32 voice-tts + 31 shoppe-dd-api)

---

## Phase 1 Core — Completion Tracker                                *July 25, 2026*

| # | Item | Session 8 | Current | Status |
|---|------|-----------|---------|--------|
| 1 | Coin/XP Scoring Engine | 99% | **100%** | ✅ convertToBinding wired into coins API endpoint with tier calculation |
| 2 | TTS Voice Service | 93% | **93%** | 🔒 Blocked: needs API key (Novita/OpenAI/ElevenLabs) |
| 3 | Dynamic Difficulty | 99% | **100%** | ✅ getDifficultyBucket + narrativeDifficultyWrap wired into action processing |
| 4 | Inventory System | 99% | **100%** | ✅ Weight/encumbrance in inventory GET, 4 Shoppe API endpoints (catalog/buy/sell/haggle) |
| 5 | Web App PWA | 98% | **98%** | ✅ SW v7 reconnect monitor, spectator mode skeleton — no changes this session |
| 6 | End-to-End Smoke Test | 99% | **100%** | ✅ 31 new API integration tests (shoppe + DD + inventory weight + coins + error handling) |
| 7 | Image Generation Pipeline | 83% | **83%** | 🔒 Blocked: needs API key (XAI/OPENAI) |

---

## Session 9 — What Was Built                                      *July 25, 2026*

### API Wiring (`6378e53`)
- `convertToBinding()`: wired into `/api/sessions/:id/coins` — now returns `tier`, `bindingAmount`, `conversionRate`
- `preAdventureDifficulty()`: wired into session creation — silently calibrates difficulty baseline per adventure
- `getInventoryWeight()`, `getCapacity()`, `getEncumbranceStatus()`: wired into `/api/sessions/:id/inventory` — now returns `weight`, `capacity`, `encumbrance`

### Shoppe API Endpoints (`b158d50`)
- `GET /api/sessions/:id/shoppe` — full catalog, recommendations, transaction log
- `POST /api/sessions/:id/shoppe/buy` — purchase items with coin balance
- `POST /api/sessions/:id/shoppe/sell` — sell items for coin
- `GET /api/sessions/:id/shoppe/haggle/:itemId` — charisma-based price haggling

### DD Action Processing Integration (`b158d50`)
- `getDifficultyBucket()` called per-action with scene position and total scenes
- `narrativeDifficultyWrap()` generates adventure-specific difficulty flavor text
- Result includes `difficulty` metadata: `{ bucket, intensity, narrative }`

### API Integration Tests (`34e3a9f`)
- New `tests/shoppe-dd-api.test.js` — 31/31 passing
- Covers: shoppe catalog, buy, sell, haggle, inventory weight, coins $BINDING, DD action processing, error handling (bad sessions)
- Tests spin up real server, make real HTTP requests, verify response shapes

---

## Blockers Needing Lawman's Input                                 *July 25, 2026*

1. **TTS API key** — Which provider? Novita (wired, voice mapping done), OpenAI TTS, or ElevenLabs?
2. **Image generation API key** — Grok Imagine (XAI_API_KEY) or DALL-E (OPENAI_API_KEY)? Pipeline scaffolded and ready.
3. **Scoring rubric weights** — Current: creativity/investigation/roleplay/combat/exploration (equal 0-10 scale). Does game-design-decisions.md Section 1 specify different weights?

---

## What's Next                                                    *July 25, 2026*

1. **TTS (93%→100%):** Wire chosen API key, end-to-end voice test
2. **Image Gen (83%→100%):** Wire chosen provider, end-to-end image test
3. **PWA (98%→100%):** Full offline manifest, mobile polish
4. **Playtest:** Real LLM play data for coin/DD calibration
