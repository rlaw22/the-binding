# The Binding — Multiplayer Roadmap

## Phase 1 (Current): Shared Controller
- Anyone can act, anyone sees everything
- One shared character per session
- Good enough for initial testing
- **Status: Live on Render.com**

## Phase 2 (Next): Host + Spectators
**~2 hours of work. Natural fit for the product.**

- One person is the "player" (host) — they make the final call on actions
- Others join as spectators — they see the full story in real-time
- Spectators can suggest actions via a side panel (like whispering ideas)
- Host sees spectator suggestions but isn't forced to pick them
- Mirrors reading a book together — one person turns the pages, others watch and comment

**Design notes:**
- Session model already supports players array (built from Day 1)
- Need: role field on player (host vs spectator)
- Need: spectator suggestion panel in UI (visible only to spectators)
- Need: host sees suggestions as a "community hints" overlay
- Spectators get their own SSE stream with spectator-only messages
- Host's view stays clean — no UI changes except optional suggestion ticker

**Why this first:** Books have one protagonist. This respects the source material and makes the experience feel intentional rather than chaotic.

## Phase 3 (Later): Full Co-op
**Needs more design work. Rule engine already supports this.**

- Multiple characters in the same adventure
- Turn order (initiative-based or narrative-based)
- Separate inventories, HP, stats per player
- Individual coin tracking per player
- The rule engine already supports this — session model has players array, character sheets, etc.

**Design notes:**
- Need: character creation flow for each player joining
- Need: turn management (whose turn is it?)
- Need: shared vs private information (whisper system already in MessageRouter)
- Need: combat encounters with multiple participants
- Need: co-op specific adventures (written for 1-6 players)

**Why later:** More complex, more engaging, but needs significant design work on how turns work in a narrative context.

---

*Decided: 2026-07-11. Phase 2 next, Phase 3 after testing Phase 2 with users.*
