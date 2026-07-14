# The Binding — Status Tracker

## Current Status: 🟢 Beta Launch Ready                          *July 14, 2026 16:37 UTC*

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `f3188a6` — fix: full end-to-end narrative audit — Dracula, Frankenstein, Holmes
**Beta tokens:** 20 generated (beta-wave-1), ready to distribute

---

## Completed Features                                         *July 14, 2026 16:37 UTC*

### Core Engine                                               *July 14, 2026 16:37 UTC*
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

### Adventures                                                *July 14, 2026 16:37 UTC*
- [x] Dracula — 25 scenes, 5 acts (Bram Stoker's Dracula)
- [x] Frankenstein — 25 scenes, 5 acts (Mary Shelley's Frankenstein)
- [x] Holmes — 25 scenes, 5 acts (The Hound of the Baskervilles)
- [x] Adventure selector (dropdown in start screen)
- [x] Dynamic difficulty system

### Narrative System                                          *July 14, 2026 16:37 UTC*
- [x] AI DM with rich, evocative prose
- [x] Discovery texts for exploration actions (15 added in Act 1-3 fixes)
- [x] Pressure system (background → gentle → strong → forced)
- [x] Option B: AI contextual actions merged into button list (commit `1ddb2ed`)

### Beta Launch Infrastructure                                *July 14, 2026 16:37 UTC*
- [x] Beta token gate (NDA acceptance + questionnaire)
- [x] Admin API (token generation, feedback review)
- [x] Feedback system — Report Issue button + `/api/feedback` endpoint (commit `6031a8c`)
- [x] Error recovery UI — Reconnect banner + retry on connection loss (commit `6031a8c`)
- [x] PWA support (manifest.json + service worker)
- [x] Rejoin codes for multi-device play
- [x] Voice/TTS support (Novita provider)
- [x] CORS configured

### Bug Fixes                                                  *July 14, 2026 16:37 UTC*

**Dracula — Full Narrative Audit (commits `614c8d8`, `7ae9ddb`, `f3188a6`):**
- [x] 17 exit labels rewritten across all5 acts (board→get on, arrive→go, retire→go, finish→stop/kill, prepare→get ready, escape→run through, push→walk, witness→watch)
- [x] 13 missing discovery texts added (talk_innkeeper, enter_great_hall, ask_about_england, compliment_wine, fight_sisters, flee_the_room, use_journal, approach_monastery, read_journal_again, plan_next_move, show_journal, ask_what_to_do, describe_escape)
- [x] 6 NPC tracking fixes (van_helsing consistency across Acts 3-5, dracula spoiler removed, lucy removed after death, jonathan harker removed)
- [x] 3 initialFacts corrected (items found during scene removed from starting inventory)
- [x] Banned keywords added to scene_01
- [x] Narrative bridge from scene_05→scene_06

**Frankenstein — Full Narrative Audit (commit `f3188a6`):**
- [x] 6 exit labels rewritten (devote→study, flee→run, continue→keep working, return→go back, close→put down, prepare→get ready)

**Holmes — Full Narrative Audit (commit `f3188a6`):**
- [x] 6 initialFacts items removed (walking stick, manuscript, warning letter, revolver, breeding notebook, satchel)
- [x] 4 NPC tracking fixes (stapleton, beryl, selden, holmes, laura_lyons removed from metNPCs before meeting)
- [x] 11 exit labels rewritten (consider→think about, return→go back, retreat→fall back, retire→go to bed, step off→get off, settle back→sit back)
- [x] 10 item tracking fixes (webley revolver added to scenes 05-14)

### Tests                                                      *July 14, 2026 16:37 UTC*
- [x] 142/142 tests passing

---

## Architecture: How Actions Work (Option B)                  *July 14, 2026 16:37 UTC*

**Before:** `generateSceneActions()` overwrote the AI DM's suggested actions with only manifest content items. If the AI narrated "the innkeeper offers garlic oil," the player had no button for "Take the vial."

**After:** The AI DM's suggestions are preserved, deduplicated against manifest content items, and merged into the action list. Players now see:
1. **Exploration actions** — manifest content items (what the scene author defined)
2. **Contextual actions** — AI DM's creative suggestions (what the narrative created)
3. **Exit action** — always last (or first under strong/forced pressure)

**Dedup logic:** Word-level overlap — if >50% of an AI suggestion's significant words match an existing content item, it's filtered as a duplicate.

**Files changed:** `src/ai-dm/dm-service.js` (30 lines added, 5 removed)

---

## Beta Launch Checklist                                       *July 14, 2026 16:37 UTC*

- [x] LLM_API_KEY set on Render
- [x] LLM_BASE_URL set on Render
- [x] LLM_MODEL set on Render
- [x] ADMIN_KEY set on Render
- [x] Health check confirms `betaEnabled: true`
- [x] 20 beta tokens generated (beta-wave-1)
- [ ] Distribute tokens to testers
- [ ] Monitor feedback via `/api/admin/feedback`

---

## Known Issues                                                *July 14, 2026 16:37 UTC*

### Gameplay
- [ ] Scene_12 `ask_about_lucy_renfield` — Renfield dialogue could be richer
- [ ] Some LOW-severity exit labels still narrow (BUG-31 through BUG-39, Dracula Acts 1-3)
- [ ] Frankenstein scene_05 content duplication with scene_04 (near-identical content items)

### Architecture
- [ ] No unit tests for `generateSceneActions` merge logic specifically
- [ ] AI contextual actions are not persisted across sessions (regenerated each turn)
- [ ] No max cap on contextual actions (AI could suggest many)
- [ ] Feedback stored in-memory only (last 500 entries, lost on restart)

---

## Next Steps                                                   *July 14, 2026 16:37 UTC*

- [ ] Playtest full adventures end-to-end with real LLM
- [ ] Monitor first wave of beta tester feedback
- [ ] Add unit tests for the Option B merge logic
- [ ] Consider adding "garlic oil" as a tracked inventory item
- [ ] Consider persisting feedback to disk for durability
- [ ] Rotate ADMIN_KEY after initial testing confirms everything works
