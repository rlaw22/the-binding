# The Binding — Status Tracker

## Current Status: ✅ Beta Deployed

**Live URL:** https://the-binding.onrender.com/
**Latest commit:** `1ddb2ed` — feat: merge AI-suggested contextual actions into button list (Option B)

---

## Completed Features

### Core Engine
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

### Adventures
- [x] Dracula — 25 scenes, 5 acts (Bram Stoker's Dracula)
- [x] Frankenstein — 25 scenes, 5 acts (Mary Shelley's Frankenstein)
- [x] Holmes — 25 scenes, 5 acts (The Hound of the Baskervilles)
- [x] Adventure selector (dropdown in start screen)
- [x] Dynamic difficulty system

### Narrative System
- [x] AI DM with rich, evocative prose
- [x] Discovery texts for exploration actions (15 added in Act 1-3 fixes)
- [x] Pressure system (background → gentle → strong → forced)
- [x] **Option B: AI contextual actions merged into button list** ← NEW

### Bug Fixes (commit `614c8d8`)
- [x] 6 exit labels rewritten (excuse→retire, plunge→run, return→go back, etc.)
- [x] 3 initialFacts corrected (items found during scene removed from starting inventory)
- [x] 3 narrow exit labels widened (step→get out, look→arrive, approach→walk to)
- [x] 6 NPC tracking fixes (dracula spoiler, jonathan harker never met, lucy death)
- [x] Banned keywords added to scene_01
- [x] Narrative bridge from scene_05→scene_06

### Tests
- [x] 143/143 tests passing

---

## Architecture: How Actions Work (Option B)

**Before:** `generateSceneActions()` overwrote the AI DM's suggested actions with only manifest content items. If the AI narrated "the innkeeper offers garlic oil," the player had no button for "Take the vial."

**After:** The AI DM's suggestions are preserved, deduplicated against manifest content items, and merged into the action list. Players now see:
1. **Exploration actions** — manifest content items (what the scene author defined)
2. **Contextual actions** — AI DM's creative suggestions (what the narrative created)
3. **Exit action** — always last (or first under strong/forced pressure)

**Dedup logic:** Word-level overlap — if >50% of an AI suggestion's significant words match an existing content item, it's filtered as a duplicate.

**Files changed:** `src/ai-dm/dm-service.js` (30 lines added, 5 removed)

---

## Known Issues

### Gameplay (from REVIEW-acts1-3.md)
- [ ] 15 missing discovery texts in Acts 4-5 (not yet audited)
- [ ] Scene_12 `ask_about_lucy_renfield` — Renfield dialogue could be richer
- [ ] Some LOW-severity exit labels still narrow (BUG-31 through BUG-39)

### Architecture
- [ ] No unit tests for `generateSceneActions` merge logic specifically
- [ ] AI contextual actions are not persisted across sessions (regenerated each turn)
- [ ] No max cap on contextual actions (AI could suggest many)

---

## Next Steps
- [ ] Audit Acts 4-5 manifests for missing discovery texts
- [ ] Add unit tests for the Option B merge logic
- [ ] Playtest full Dracula adventure end-to-end
- [ ] Consider adding "garlic oil" as a tracked inventory item
- [ ] Add voice/TTS integration for narration
