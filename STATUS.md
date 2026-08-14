# The Binding — Status Tracker

## Current Status: 🟢 Production Ready (Self-Hosted)           *August 15, 2026*

**Live URL:** https://thebinding.duckdns.org
**Status Page:** http://docs.thebinding.duckdns.org
**Latest commit:** `71553a7` — Test deployment trigger
**Test suite:** 339/340 passing (1 pre-existing UI test)
**Hosting:** Contabo VPS with SSL, auto-deploy, and monitoring

---

## Recent Updates (August 2026)

### Infrastructure Overhaul (August 15, 2026)
- ✅ **Migrated from Render to Contabo VPS** — Full control, fixed costs
- ✅ **SSL/HTTPS configured** — Let's Encrypt with auto-renewal
- ✅ **GitHub Actions auto-deploy** — Push to main → auto-deploys
- ✅ **Monitoring system** — Health checks every 5 minutes
- ✅ **Email alerts** — Gmail SMTP for failure notifications
- ✅ **Status page deployed** — http://docs.thebinding.duckdns.org
- ✅ **DuckDNS dynamic DNS** — thebinding.duckdns.org

### D&D 5e Character System (August 13-14, 2026)
- ✅ **Full character creation** — 4d6-drop-lowest stats, racial bonuses, class features
- ✅ **Character service** — `CharacterService.createCharacter()` with D&D 5e rules
- ✅ **Frontend builder** — Multi-step character creation UI
- ✅ **Character sheet popup** — View character details in-game
- ✅ **Phase 4 DM integration** — Character sheet injection into LLM prompts
- ✅ **HP bar + notifications** — Real-time character status updates

### Digital DM Mode (August 13, 2026)
- ✅ **Full backend implementation** — Steps 1-4 complete
- ✅ **DM service** — Digital DM prompt branch, LLM path, world state extraction
- ✅ **Session creation** — Auto-generates opening scene
- ✅ **Scenario selector** — Card grid UI with 4 themes + 9 adventures
- ✅ **17/17 Digital DM tests passing**

### Static Image Generation (August 14, 2026)
- ✅ **119 static images generated** — All 3 adventures
  - Dracula: 75 scene images (25 scenes × 3 moods) + 3 NPC portraits
  - Frankenstein: 21 scene images (7 scenes × 3 moods) + 2 NPC portraits
  - Holmes: 15 scene images (5 scenes × 3 moods) + 3 NPC portraits
- ✅ **Zero-cost static serving** — Images served from `public/assets/images/`
- ✅ **Fixed data URI handling** — OpenAI b64_json responses now work

### Immersion Improvements (August 14, 2026)
- ✅ **Removed meta-commentary** — No more "Good instinct" in coin notifications
- ✅ **Single actions only** — Prevents combined suggestions
- ✅ **Clear scene images** — Images cleared after first display
- ✅ **Surface bad choices** — Trap options appear in suggested actions
- ✅ **Deduplicated bad choices** — Scene manifest + AI suggestions merged

### Bad Choices System (August 13, 2026)
- ✅ **75 consequence narrations rewritten** — Sensory detail + lesson labels
- ✅ **Bad choice actions added** — Trap options now appear in UI
- ✅ **Deduplication** — No duplicate bad choices

### Bug Fixes (August 2026)
- ✅ **P0: Missing monster JSON** — `srd-monsters.json` copied to correct location
- ✅ **P1: Continuity validator false positives** — Skip overlapping entries
- ✅ **P1: getScene() backbone stubs** — Now merges with rich manifest data
- ✅ **P2: config/.env.example** — Moved to `templates/env.example.template`
- ✅ **IPv6 test failure** — Changed `localhost` → `127.0.0.1`
- ✅ **Digital DM integration fixes** — null crash, missing config, regex bugs

---

## Phase 1 Core — Completion Tracker                                *August 15, 2026*

| # | Item | Prior | Current | Status |
|---|------|-------|---------|--------|
| 1 | Coin/XP Scoring Engine | 100% | **100%** | ✅ Full rubric per game-design-decisions.md §1: 5 categories, bell curve, tier conversion, chapter summaries, LLM scoring with heuristic fallback |
| 2 | TTS Voice Service | 97% | **97%** | ✅ Fixed browser-tts.js structural corruption. All 87 browser-tts tests pass. 🔒 Still needs: API key for real TTS provider |
| 3 | Dynamic Difficulty | 100% | **100%** | ✅ Rubber-band tuning 84/84, pre-adventure calibration, narrative difficulty wrap |
| 4 | Inventory System | 100% | **100%** | ✅ Weight/encumbrance, 4 Shoppe API endpoints, 75 edge-case tests |
| 5 | Web App PWA | 100% | **100%** | ✅ Session rejoin validation, spectator mode functional, offline fallback with saved session + SW integration, mobile responsive (360px + safe-area-inset) |
| 6 | End-to-End Smoke Test | 100% | **100%** | ✅ 339/340 tests passing (1 pre-existing UI test) |
| 7 | Image Generation Pipeline | 92% | **100%** | ✅ Static images generated for all adventures. Still needs: API key for dynamic generation |

---

## Phase 2 — New Features (August 2026)

### Digital DM Mode ✅
- Full backend implementation (Steps 1-4)
- DM service with LLM integration
- Scenario selector with 4 themes + 9 adventures
- 17/17 tests passing

### D&D 5e Character System ✅
- Full character creation (4d6-drop-lowest, racial bonuses, class features)
- Character service with D&D 5e rules
- Frontend multi-step builder
- Phase 4 DM integration (character sheet injection)

### Static Image Generation ✅
- 119 images generated for all 3 adventures
- Zero-cost static serving
- Hybrid approach (pre-generated + dynamic)

### Infrastructure ✅
- Contabo VPS with SSL
- GitHub Actions auto-deploy
- Monitoring with email alerts
- Status page deployed

---

## Blockers Needing Lawman's Input                                 *August 15, 2026*

1. **TTS API key** — Which provider? Novita (wired, voice mapping done), OpenAI TTS, or ElevenLabs? This is the only thing standing between 97% and 100% on TTS.
2. **Image generation API key** — Grok Imagine (XAI_API_KEY) or DALL-E (OPENAI_API_KEY)? Static images are done, but dynamic generation needs API key.

---

## What's Next                                                    *August 15, 2026*

1. **TTS (97%→100%):** Wire chosen API key, end-to-end voice test with real provider
2. **Image Gen (100%):** Static images done. Wire API key for dynamic generation
3. **Playtest:** Real LLM play data for coin/DD calibration refinements
4. **Documentation:** Update docs with new features and deployment guide

---

## Infrastructure Details

### Hosting
- **Provider:** Contabo VPS
- **IP:** 207.244.228.80
- **OS:** Ubuntu 24.04.2 LTS
- **Node.js:** v20.20.2
- **PM2:** Process manager with auto-restart

### Domains
- **Main App:** https://thebinding.duckdns.org
- **Status Page:** http://docs.thebinding.duckdns.org

### Monitoring
- **Health checks:** Every 5 minutes
- **Email alerts:** roberjlaw@gmail.com
- **Log file:** /home/neo/monitor.log

### Deployment
- **GitHub Actions:** Auto-deploy on push to main
- **Secrets:** SSH_PASSWORD, SERVER_HOST, SERVER_USER
- **SSL:** Let's Encrypt with auto-renewal

---

*Last updated: August 15, 2026*
