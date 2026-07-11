# The Binding — Scene System Design

*Decided with Lawman: 2026-07-11*

## Core Principle

**The DM never advances a scene unless the player chooses to move on OR the story forces it.** Scenes have real weight — the player should feel like they're in a place, not scrolling past it.

## Scene Manifest (defined in adventure engine)

Every scene has a manifest — a checklist of discoverable content:

```
Scene: Golden Krone Inn
Content:
  - talk_to_innkeeper     → "Learn about Castle Dracula and its mysterious owner"
  - examine_crucifix      → "Discover why the locals are so afraid"
  - find_old_woman        → "The woman in the corner knows something about the castle"
  - check_stables         → "The coach is ready. The horses are restless."
  - read_journal          → "Jonathan Harker's journal, left behind on a bench"
Exit:
  - board_coach           → "Leave for Castle Dracula"
Hard_exit:
  - trigger: 4 turns after 75% completion → story forces transition
```

## Completion Tracking

- Engine tracks which content items have been discovered (0-N of total)
- DM tags each response with `[EXPLORED: item1, item2]` — what the player just discovered
- Engine parses tags and updates checklist
- Open text field interactions count — DM judges creative input and tags accordingly
- **NOTHING is exposed to the player** — no progress bars, no counters, no "3/5 explored"

## Exit Pressure Ramps (narrative, not mechanical)

| Completion | Pressure Level | What the Player Experiences |
|---|---|---|
| 0-25% | Background | Exit is one of 4 actions, not highlighted. Rich scene descriptions. |
| 25-50% | Gentle nudge | DM weaves in environmental cues. "The coachman coughs outside." |
| 50-75% | Strong push | World closes in. "The candles burn lower. The coachman calls — he won't wait." |
| 75-100% | Story-driven | Hard exit after 4 turns. "The innkeeper locks the door. Time to go." |

## Suggested Actions (4 total each turn)

- **3 actions:** Things to do HERE at the current scene (prioritize undiscovered content)
- **1 action:** The exit (e.g., "Board the coach for Castle Dracula")
- As completion rises, the exit action moves to slot 1
- The open text field is always available for anything the player wants to do

## DM Prompt (updated each turn)

The system prompt includes:
- Current scene name and description
- Completion score (hidden from player): "3 of 5 explored"
- What's still undiscovered (so the DM can hint at it naturally)
- Exit pressure level: background / gentle / strong / forced
- Instruction: keep the player in this scene, don't advance unless they choose to

## Hard Exit Mechanism

- **Completion-relative, not fixed turn count**
- Hard exit triggers 4 turns AFTER the player hits 75% completion
- A player who explores thoroughly gets more time at the scene
- A player who rushes gets pushed out faster
- The DM narrates the forced exit naturally — no game-y language

## What the Player NEVER Sees

- No progress bars or completion percentages
- No turn counters
- No "3/5 items found" text
- No visible pressure mechanic
- The world just feels like it's winding down naturally

## Open Text Field

- Player can type anything at any time
- DM handles it naturally within the scene context
- DM tags any new discoveries from free-form input via `[EXPLORED: ...]`
- This adds variation — creative players can find content that isn't in the suggested actions

## DM Response Tags (hidden, parsed by engine)

After every response, the DM outputs:
```
[EXPLORED: talk_to_innkeeper, examine_crucifix]
```
Engine parses this, updates the checklist, calculates new completion %, and adjusts prompt for next turn.

---

*This replaces the old approach where the DM just cycled through canned responses and forced scene transitions.*
