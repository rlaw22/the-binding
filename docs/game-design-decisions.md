# The Binding — Game Design Decisions (Confirmed)
Date: 2026-07-11

## 1. Coin/XP System
- Hybrid scoring: real-time subtle notifications + post-chapter breakdown
- Intelligence-weighted: creativity, problem-solving, investigation, roleplay all earn coins
- Theoretical max coin pool per adventure, fixed by story length + difficulty
- Standard bell curve distribution — only 0.01% ever max out
- Post-chapter breakdown shows: "You earned 340/500 coins. Here's where they came from..."

## 2. Tier System
- Bronze: Complete the adventure (~95% of players)
- Silver: 60%+ of max coins (~60% of players)
- Gold: 85%+ of max coins (~15% of players)
- Platinum: 95%+ of max coins AND top 10% completion speed (~1% of players)
- Speed requirement ONLY applies to Platinum tier

## 3. Universal Cross-Book Currency
- All coins are fungible: 1 Dracula coin = 1 Frankenstein coin = 1 Holmes coin
- Tier-weighted conversion to $BINDING:
  - Bronze: 1x conversion rate
  - Silver: 1.5x conversion rate
  - Gold: 2.5x conversion rate
  - Platinum: 5x conversion rate
- Shoppe discounts based on lifetime average tier

## 4. $BINDING Meme Coin + Seasonal Economy
- $BINDING is the ONLY mint source — earned through gameplay, no ICO/presale/airdrop
- 6-month seasons with leaderboard resets
- Each season has a defined coin budget (controls inflation)
- Seasonal items in Shoppe rotate in/out (scarcity)
- Legacy Bonus: players from earlier seasons get permanent +% on future conversions
- Deflationary curve: revenue-to-pool % decreases across eras
- Control mechanisms: seasonal coin budgets, leaderboard resets, era transition checkpoints

## 5. Replayability Engine
- Three-layer model: curated backbone + procedural connective tissue + surface variation
- Adaptive sub-plot generation — learns player style, stretches weak spots
- Hinted transparency: end-of-adventure play style summary
- Challenge escalation: intellectual difficulty increases, content always feels new

## 6. The Shoppe — Full Stack
- Items: cosmetic + gameplay bonus + tradeable NFT
- Anti-pay-to-win: no item replaces playing well
- Tradeable marketplace with small fee
- Seasonal items for scarcity

## 7. Dynamic Difficulty — Rubber-Band Scaling with Power Windows
- 70% of fights scale closely to player level (constant challenge)
- 20% of fights below player level (power windows — feel like a badass)
- 10% of fights above player level (challenge spikes — need creative thinking)
- AI DM controls pacing — knows when to let you feel powerful vs humble you
- Narrative difficulty design, not just math

## 8. Pre-Adventure Difficulty Calc — Invisible with Narrative Wrapper
- Player level determines adventure baseline difficulty before starting
- No visible difficulty numbers or sliders
- AI DM narratively explains why this version is harder
- Difficulty is story, not a number
- Same story/beats, but enemies scaled, puzzles harder, DCs higher

## 9. Campaign Mode (Phase II) — Full DM Replacement
- Standard D&D 5e open-ended play, multi-player (1-6 players per session)
- AI DM acts as full Dungeon Master: rules, narration, pacing, world-building, NPC dialogue
- Two modes in one app:
  - Adventure Mode (book-based, single-player, curated scene graphs)
  - Campaign Mode (open-ended, multi-player, full DM improvisation)
- Theater of the mind (no grid map initially; simple grid added later)
- Session persistence: save/resume across multiple play sessions
- Monster stat block system extends rule engine
- Initiative tracking and turn management for party combat
- DM whisper system: private messages to individual players
- Same coin/tier/$BINDING system applies to Campaign Mode
- Coin pool calculated per session length + difficulty + party size

## 10. Phase 1 Architecture — Future-Proof Abstractions
These 5 patterns are baked into Phase 1 so Phase 2 (Campaign Mode) is purely additive, no rewrites.

### 10a. Session as Top-Level Container
- Session object contains a player array (even in Phase 1, array has 1 element)
- Session has mode field: "adventure" (Phase 1) or "campaign" (Phase 2)
- Session owns world state, scene graph, turn order (null in Phase 1)

### 10b. Player-Tagged Actions
- Every action object includes playerId (even in single-player)
- AI DM is player-aware from Day 1
- Phase 2 just adds more player IDs to the conversation

### 10c. Shared + Private State Separation
- SessionWorldState: shared scene info (NPCs, environment, quests) — everyone sees
- PlayerPrivateState: per-player secrets, clues, personal goals, private inventory
- Phase 1: private state exists but everything is visible (one player)
- Phase 2: router filters private state per player

### 10d. Message Router with Targets
- All AI DM output goes through DmMessage objects with targets array
- DmMessage has type: narration | dice_result | combat_update | whisper
- Phase 1: every message targets ["player_1"] (one recipient)
- Phase 2: router broadcasts shared messages, whispers private ones

### 10e. Rule Engine Stays Player-Count Agnostic
- Combat, skill checks, saving throws accept arrays of actors
- Already works for 1 player or 6 — zero changes needed for Phase 2
