# The Binding — Status Tracker

## Current Status: 🟢 Beta Launch Ready                          *July 14, 2026*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `c4a940b` — docs: update STATUS.md — beta launch ready, all tabs refreshed
**Beta tokens:** 20 generated (beta-wave-1), ready to distribute

---

## Completed Features                                         *July 14, 2026*

### Core Engine                                               *July 14, 2026*
- [x] Dice system (d20, 2d6, advantage/disadvantage, proofs)
- [x] Rule engine (D&D 5e stats, abilities, proficiency, combat)
- [x] Character service (creation, leveling, HP, AC)
- [x] Scene engine (content items, keyword matching, pressure levels, exits)
- [x] Session management (create, rejoin, persistence, auto-save)
- [x] Message router (narration, suggested actions, coin rewards)
- [x] Coin engine (creativity scoring, coin pool)
- [x] Continuity validator
- [x] Context manager (hot buffer, buildContext)
- [x] SSE real-time transport

### Adventures                                                *July 14, 2026*
- [x] Dracula — 25 scenes, 5 acts (Bram Stoker's Dracula)
- [x] Frankenstein — 25 scenes, 5 acts (Mary Shelley's Frankenstein)
- [x] Holmes — 25 scenes, 5 acts (The Hound of the Baskervilles)
- [x] Adventure selector (dropdown in start screen)
- [x] Dynamic difficulty system

### Narrative System                                          *July 14, 2026*
- [x] AI DM with rich, evocative prose
- [x] Discovery texts for exploration actions (15 added in Act 1-3 fixes)
- [x] Pressure system (background → gentle → strong → forced)
- [x] Option B: AI contextual actions merged into button list (commit `1ddb2ed`)

### Beta Launch Infrastructure                                *July 14, 2026*
- [x] Beta token gate (NDA acceptance + questionnaire)
- [x] Admin API (token generation, feedback review)
- [x] Feedback system — Report Issue button + `/api/feedback` endpoint (commit `6031a8c`)
- [x] Error recovery UI — Reconnect banner + retry on connection loss (commit `6031a8c`)
- [x] PWA support (manifest.json + service worker)
- [x] Rejoin codes for multi-device play
- [x] Voice/TTS support (Novita provider)
- [x] CORS configured

### Bug Fixes                                                  *July 14, 2026*

**Acts 1-3 (commit `614c8d8`):**
- [x] 6 exit labels rewritten (excuse→retire, plunge→run, return→go back, etc.)
- [x] 3 initialFacts corrected (items found during scene removed from starting inventory)
- [x] 3 narrow exit labels widened (step→get out, look→arrive, approach→walk to)
- [x] 6 NPC tracking fixes (dracula spoiler, jonathan harker never met, lucy death)
- [x] Banned keywords added to scene_01
- [x] Narrative bridge from scene_05→scene_06

**Acts 4-5 (commit `7ae9ddb`):**
- [x] Removed "lucy" from Act 4 metNPCs (scenes 15-19) — she died in Act 3
- [x] Removed "lucy" and "jonathan harker" from Act 5 metNPCs (scenes 20-24)
- [x] Fixed scene_18 exit label: "Escape" → "Run through"
- [x] Fixed scene_21 exit label: "Push through" → "Walk through"
- [x] Fixed scene_24 exit label: "Witness the dawn" → "Watch the dawn break"

### Tests                                                      *July 14, 2026*
- [x] 143/143 tests passing

---

## Architecture: How Actions Work (Option B)                  *July 14, 2026*

**Before:** `generateSceneActions()` overwrote the AI DM's suggested actions with only manifest content items. If the AI narrated "the innkeeper offers garlic oil," the player had no button for "Take the vial."

**After:** The AI DM's suggestions are preserved, deduplicated against manifest content items, and merged into the action list. Players now see:
1. **Exploration actions** — manifest content items (what the scene author defined)
2. **Contextual actions** — AI DM's creative suggestions (what the narrative created)
3. **Exit action** — always last (or first under strong/forced pressure)

**Dedup logic:** Word-level overlap — if >50% of an AI suggestion's significant words match an existing content item, it's filtered as a duplicate.

**Files changed:** `src/ai-dm/dm-service.js` (30 lines added, 5 removed)

---

## Beta Launch Checklist                                       *July 14, 2026*

- [x] LLM_API_KEY set on Render
- [x] LLM_BASE_URL set on Render
- [x] LLM_MODEL set on Render
- [x] ADMIN_KEY set on Render
- [x] Health check confirms `betaEnabled: true`
- [x] 20 beta tokens generated (beta-wave-1)
- [ ] Distribute tokens to testers
- [ ] Monitor feedback via `/api/admin/feedback`

---

## Known Issues                                                *July 14, 2026*

### Gameplay
- [ ] Frankenstein and Holmes manifests not yet audited for exit label / NPC bugs
- [ ] Scene_12 `ask_about_lucy_renfield` — Renfield dialogue could be richer
- [ ] Some LOW-severity exit labels still narrow (BUG-31 through BUG-39, Acts 1-3)

### Architecture
- [ ] No unit tests for `generateSceneActions` merge logic specifically
- [ ] AI contextual actions are not persisted across sessions (regenerated each turn)
- [ ] No max cap on contextual actions (AI could suggest many)
- [ ] Feedback stored in-memory only (last 500 entries, lost on restart)

---

## Next Steps                                                   *July 14, 2026*

- [ ] Playtest full Dracula adventure end-to-end with real LLM
- [ ] Monitor first wave of beta tester feedback
- [ ] Audit Frankenstein and Holmes manifests for the same bug patterns
- [ ] Add unit tests for the Option B merge logic
- [ ] Consider adding "garlic oil" as a tracked inventory item
- [ ] Consider persisting feedback to disk for durability
- [ ] Rotate ADMIN_KEY after initial testing confirms everything works
