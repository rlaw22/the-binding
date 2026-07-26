# The Binding — Agent Handoff Guide

> **Read this first if you're picking up this project.** It tells you what The Binding is, what's been built, what's decided, what's open, and how to work with Lawman.

---

## What Is The Binding?

An AI-powered interactive fiction game engine. Players play through classic novels (Dracula, Frankenstein, Sherlock Holmes) while an AI Dungeon Master responds to their actions in real-time.

**Live URL:** https://the-binding.onrender.com/

---

## Current State (as of August 5, 2026)

| Metric | Value |
|--------|-------|
| Status | Phase 1 Core Complete (minus API keys) |
| Test Suite | 1,649 tests passing across 37 suites |
| Source Files | 66 JS files in `src/` |
| Test Files | 37 test files in `tests/` |
| Total LOC | ~29,000 lines of source |
| Deploy | Dockerfile → Render.com auto-deploy from `main` |
| LLM Provider | Novita AI (free tier) — `qwen/qwen3.6-plus` model |
| Frontend | Vanilla HTML/CSS/JS — 2,275 lines, no framework |

### What Works
- 4-action system (4 AI-generated suggestions + open text input per turn)
- Dracula adventure: full 25-scene, 5-act adventure
- Frankenstein and Sherlock Holmes adventures (smaller scope)
- Dice rolls, combat, skill checks, character sheets
- Coin/XP scoring engine with bell curve distribution
- Dynamic difficulty (rubber-band scaling with power windows)
- Inventory system with weight/encumbrance and Shoppe
- TTS voice service (wired for Novita, OpenAI, ElevenLabs — needs API key)
- Image generation pipeline (scaffolded — needs API key)
- PWA with session rejoin, spectator mode, offline fallback
- SSE real-time transport for DM responses

### What's Blocked (Needs Lawman's Input)
1. **TTS API key** — which provider? Novita, OpenAI TTS, or ElevenLabs?
2. **Image generation API key** — Grok Imagine (XAI_API_KEY) or DALL-E (OPENAI_API_KEY)?

---

## Architecture Overview

See `docs/architecture.md` for the full module map and data flow.

**TL;DR:** Server (Fastify) → Session Manager → Adventure/Story Engine → Rule Engine → AI DM Service (LLM) → SSE stream to frontend. Campaign Mode extends the session model for multiplayer.

---

## What's Decided (Don't Re-Litigate)

All 10 major design decisions are documented in `docs/game-design-decisions.md`. The critical ones:

1. **Coin/XP system** — hybrid scoring, intelligence-weighted, bell curve, universal cross-book currency
2. **Tier system** — Bronze/Silver/Gold/Platinum with weighted $BINDING conversion
3. **$BINDING meme coin** — earned through gameplay only, 6-month seasons, deflationary
4. **Dynamic difficulty** — 70% matched / 20% power windows / 10% challenge spikes
5. **Campaign Mode** — full D&D 5e DM replacement, multiplayer 1-6 players, same coin system
6. **Phase 1 architecture** — 5 future-proof abstractions (session container, player-tagged actions, shared/private state, message router, player-agnostic rule engine) so Campaign Mode is purely additive

---

## What's NOT Decided (Open Questions)

| # | Question | Status | Details |
|---|----------|--------|---------|
| 1 | **Frontend architecture for v2** | OPEN | Current: 2,275 lines vanilla JS. Options: (A) keep vanilla, clean up; (B) move to React/Vue/Svelte for multiplayer lobby UI. This blocks Phase 4 but NOT Phases 1-3. |
| 2 | **Gothic Horror as first Campaign theme** | OPEN | Proposed as natural extension of Dracula content. Needs approval or alternative pick. |
| 3 | **Storyline vs Adventure Mode naming** | OPEN | Phase 1 calls it "Adventure Mode." Phase 2 renames to "Storyline Mode." Rename now or keep backward compat? |
| 4 | **Digital DM scope** | OPEN | Scaffolding done. Full build in Phase 2 or keep as scaffolding? |
| 5 | **Campaign session storage** | OPEN | JSON files for beta (consistent with Phase 1). Confirm no DB migration? |
| 6 | **Campaign API auth** | OPEN | Campaign routes have no beta token validation. Add now or later? |

---

## The v2 Rebuild Plan

The decision has been made: **rebuild from scratch rather than refactor.** v1 reached 2,275 lines of frontend and a sprawling backend before the architecture was deemed wrong. This is a re-architecture, not a cleanup.

Full plan in `docs/v2-rebuild-plan.md`.

**Phases:**
- Phase 0: Freeze v1 (tag as legacy, export test suite)
- Phase 1: Core foundation (server, config, rule engine, dice, character, session)
- Phase 2: Story and adventure engine
- Phase 3: AI DM and coin engine
- Phase 4: Frontend (architecture TBD — see open questions)
- Phase 5: Campaign mode (multiplayer)

---

## How to Work With Lawman

Lawman is the project owner. These are durable working agreements, not suggestions:

### Process Rules
1. **SPEC-THEN-BUILD is a hard gate.** Before writing any major new code, confirm the spec together: what it does, interfaces, definition of done. Do not jump to implementation.
2. **Fix issues proactively while testing.** Don't wait until the end or until Lawman hits it.
3. **Challenge Lawman when a path looks problematic.** Don't be a yes-machine — flag architectural concerns before committing work.
4. **Shorter build cycles with checkpoints.** Build one module → verify → then move on. No big-bang builds.
5. **Session handoff summaries at the start of new conversations.** "Here's where we are, here's what's decided, here's the next step."

### Lawman's Constraints
- **No terminal access.** Works through GitHub.com and Render.com web browser interfaces only. When giving instructions, provide step-by-step guidance for web UI actions.
- **Nightly build sessions** between 12am-6am EST.
- **Receives Telegram updates** at @Lawman (chat ID 8411130785).
- **Prefers no color-coding on buttons** — all buttons use the same consistent styling; the player reads label text to understand choices, not color signals.

### Deployment
- **Platform:** Render.com, auto-deploy from GitHub `main` branch
- **Dockerfile:** Render auto-detects it
- **Important:** Never use symlinks in `public/` for Docker/Render deployments — always use real file copies. Symlinks don't survive Docker builds.
- **If files 404 on Render:** Copy real files from `src/` to `public/src/`, commit, push, then "Clear build cache & deploy" on Render.

---

## Key File Reference

| Path | Purpose |
|------|---------|
| `server.js` | Main entry point (Fastify) |
| `src/api/` | API routes (adventure, campaign) |
| `src/ai/` | AI DM service, LLM integration |
| `src/campaign/` | Campaign Mode (16 modules, ~5,000 lines) |
| `src/character/` | Character creation and management |
| `src/coin-engine/` | Coin/XP scoring |
| `src/combat/` | Combat manager |
| `src/dice/` | Dice service, types, deterministic seeding |
| `src/difficulty/` | Dynamic difficulty (rubber-band) |
| `src/image/` | Image generation pipeline |
| `src/inventory/` | Inventory and Shoppe |
| `src/rule-engine/` | D&D 5e rules (stats, classes, races, combat, dice) |
| `src/scene-engine/` | Scene transitions, continuity validation |
| `src/session/` | Session management, message routing, persistence |
| `src/story/` | Story engine, class abilities, threat encounters |
| `src/story-mode/` | Story Mode entry point |
| `src/voice/` | TTS and STT services |
| `public/` | Frontend (vanilla HTML/CSS/JS) |
| `data/monsters/` | SRD 5.1 monster database (334 creatures) |
| `docs/` | All design docs, trackers, catalogs |
| `tests/` | 37 test suites, 1,649 tests |

---

## Quick Reference: Tech Stack

- **Server:** Node.js + Fastify
- **Frontend:** Vanilla HTML/CSS/JS (no framework — v2 decision pending)
- **Transport:** SSE (Server-Sent Events) + HTTP POST
- **LLM:** OpenAI-compatible provider (currently Novita AI, free tier)
- **Adventure Engine:** Scene graph with curated backbone + dynamic DM responses
- **Storage:** JSON files (no database)
- **Deploy:** Docker → Render.com

---

*Last updated: August 6, 2026 — by Gandalf*
