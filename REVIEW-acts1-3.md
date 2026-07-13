# Dracula Adventure Manifest Review — Acts 1-3
## Complete Bug Report

**Reviewer:** Narrative Bug Hunter (Acts 1-3)
**Files reviewed:**
- `/workspace/the-binding/src/adventure/dracula.js` (Act 1: scene_00–scene_04)
- `/workspace/the-binding/manifests-act2.js` (Act 2: scene_05–scene_09)
- `/workspace/the-binding/manifests-act3.js` (Act 3: scene_10–scene_14)

**Exit label matching logic** (from `dm-service.js:72`):
```js
const exitWords = exitLabel.toLowerCase().split(/\s+/).filter(w => w.length > 3);
const genericVerbs = new Set(['the','and','for','with','from','that','this','your','have','will','into','onto']);
const specific = exitWords.filter(w => !genericVerbs.has(w));
const actionVerb = specific[0]; // MUST be in player input
const matched = specific.filter(w => action.includes(w)).length;
return matched >= Math.min(2, specific.length);
```

---

## 🔴 HIGH SEVERITY — Will cause gameplay bugs

### BUG-01 | scene_04 | EXIT LABEL | "Excuse" is an unnatural action verb
- **exitLabel:** `"Excuse yourself to retire for the night"`
- **specific words:** `["excuse", "yourself", "retire", "night"]`
- **action verb required:** "excuse"
- **Problem:** Players will type "go to bed", "retire for the night", "head to my room", "leave the table" — none contain "excuse". The exit will never trigger for most players.
- **Fix:** Change to `"Retire to your room for the night"` → action verb "retire", natural phrasing.

### BUG-02 | scene_08 | EXIT LABEL | "Plunge" is an extremely rare action verb
- **exitLabel:** `"Plunge into the dark forest and run"`
- **specific words:** `["plunge", "dark", "forest", "run"]`
- **action verb required:** "plunge"
- **Problem:** Players will type "run into the forest", "flee into the trees", "escape into the woods" — none contain "plunge". Exit will almost never trigger.
- **Fix:** Change to `"Run into the dark forest and don't look back"` → action verb "run".

### BUG-03 | scene_05 | EXIT LABEL | "Return" is less natural than "go back"
- **exitLabel:** `"Return upstairs before the Count wakes"`
- **specific words:** `["return", "upstairs", "before", "count", "wakes"]`
- **action verb required:** "return"
- **Problem:** Players will type "go back upstairs", "leave the forbidden wing", "escape before he wakes" — none contain "return".
- **Fix:** Change to `"Go back upstairs before the Count wakes"` → action verb "go".

### BUG-04 | scene_06 | EXIT LABEL | "Escape" doesn't match common player phrasing
- **exitLabel:** `"Escape through the door the Count left open"`
- **specific words:** `["escape", "through", "door", "count", "left", "open"]`
- **action verb required:** "escape"
- **Problem:** Players will type "run through the door", "flee the room", "get out" — none contain "escape". The scene even has a content item called `flee_the_room` with keyword "flee" — but the exit requires "escape".
- **Fix:** Change to `"Run through the door the Count left open"` → action verb "run". Aligns with `flee_the_room` content item.

### BUG-05 | scene_07 | EXIT LABEL | "Close" is an odd action verb for leaving a scene
- **exitLabel:** `"Close the journal and plan your escape"`
- **specific words:** `["close", "journal", "plan", "escape"]`
- **action verb required:** "close"
- **Problem:** Players will type "put the journal away", "stop reading", "plan my escape", "finish reading" — none contain "close". The exit action is about *leaving*, not closing a book.
- **Fix:** Change to `"Finish reading and plan your escape"` → action verb "finish".

### BUG-06 | scene_13 | EXIT LABEL | "Hold" is ambiguous and uncommon
- **exitLabel:** `"Hold out until dawn breaks"`
- **specific words:** `["hold", "until", "dawn", "breaks"]`
- **action verb required:** "hold"
- **Problem:** Players will type "wait for dawn", "survive until morning", "endure the night" — none contain "hold".
- **Fix:** Change to `"Wait until dawn breaks"` → action verb "wait".

### BUG-07 | scene_05 | INITIAL FACTS | "jonathan journal" listed before it's found
- **initialFacts.items:** `['crucifix', 'jonathan journal']`
- **Problem:** The journal is discovered DURING scene_05 via the `find_journal` content item. It should not be in `initialFacts.items` (which represents inventory at scene START). The scene engine may present it as already possessed, spoiling the discovery.
- **Fix:** Change to `items: ['crucifix']`.

### BUG-08 | scene_09 | INITIAL FACTS | "wooden cross" listed before it's found
- **initialFacts.items:** `['crucifix', 'jonathan journal', 'wooden cross']`
- **Problem:** The wooden cross is found during scene_09 via the `rest_by_stream` content item's discovery text. Should not be in initial inventory.
- **Fix:** Change to `items: ['crucifix', 'jonathan journal']`.

### BUG-09 | scene_10 | INITIAL FACTS | "holy water" listed before it's given
- **initialFacts.items:** `['crucifix', 'jonathan journal', 'holy water']`
- **Problem:** The holy water is given by Van Helsing in the `hardExitNarration` — at the END of the scene, not the beginning. Should not be in `initialFacts.items`.
- **Fix:** Change to `items: ['crucifix', 'jonathan journal']`.

---

## 🟡 MEDIUM SEVERITY — Narrative inconsistencies and missing content

### BUG-10 | scene_01 | BANNED KEYWORDS | Missing "the inn" and "bistritz"
- **banned:** `['great hall', 'castle dracula', 'dining hall', 'carfax abbey', 'london']`
- **Problem:** Scene_00 bans "the inn" and "bistritz". Scene_02 bans them too. But scene_01 (the coach ride, player has LEFT the inn) does NOT ban them. The AI DM could narrate the player being back at the inn.
- **Fix:** Add `'the inn'` and `'bistritz'` to scene_01's banned list.

### BUG-11 | scene_02 | INITIAL FACTS | 'dracula' in metNPCs is a spoiler
- **initialFacts.metNPCs:** `['innkeeper', 'driver', 'dracula']`
- **Problem:** The scene description says the coachman's "face is still hidden." The player hasn't confirmed his identity. Including 'dracula' in metNPCs is a spoiler the game engine could leak (e.g., "You recall meeting Dracula...").
- **Fix:** Change to `metNPCs: ['innkeeper', 'driver']`. Keep the deduction only in `established`.

### BUG-12 | scene_06 | NARRATIVE CONTINUITY | Gap between scene_05 and scene_06
- **Problem:** Scene_05 ends with the player running from the forbidden wing. Scene_06 opens "You wake in darkness. The fire in your chamber has died to embers." — no transition explaining how the player got from the forbidden wing to their bedroom and fell asleep.
- **Fix:** Update scene_05's `hardExitNarration` to: `"The light through the corridor windows is fading fast. You race back to your chamber, bar the door, and collapse onto the bed. Sleep comes eventually, fitful and haunted."` OR update scene_06's description to open with a brief transition.

### BUG-13 | scene_06/scene_07 | NPC CONSISTENCY | 'jonathan harker' in metNPCs without physical meeting
- **Problem:** Scene_07 adds 'jonathan harker' to `metNPCs`. The player never physically meets Harker — they only find his journal. Scene_06 doesn't include him. This is inconsistent across scenes and conceptually wrong (reading someone's journal ≠ meeting them).
- **Fix:** Remove 'jonathan harker' from scene_07's `metNPCs`. Keep the journal discovery in `established` only.

### BUG-14 | scene_10 | NPC CONSISTENCY | 'jonathan harker' dropped from metNPCs
- **initialFacts.metNPCs:** `['innkeeper', 'dracula', 'van helsing']`
- **Problem:** If scene_07 added 'jonathan harker' to metNPCs, scene_10 should carry him forward. But scene_10 drops him. (Consistent with Bug-13 fix — he shouldn't be there at all.)
- **Fix:** Resolved by Bug-13 fix (remove from scene_07).

### BUG-15 | scene_14 | INITIAL FACTS | 'lucy' in metNPCs after she dies
- **initialFacts.metNPCs:** `['innkeeper', 'dracula', 'van helsing', 'lucy', 'seward', 'renfield']`
- **Problem:** Lucy just died. Listing her alongside living NPCs could cause the AI DM to narrate her as available for conversation. Need a way to distinguish living from dead NPCs.
- **Fix:** Add `'lucy (deceased)'` to `established` and remove 'lucy' from `metNPCs`. Or add a `deceasedNPCs` field.

### BUG-16 | scene_01 | MISSING DISCOVERY | `watch_landscape` has no discovery text
- **label:** "Watch the dark forest pass by the window"
- **Problem:** The description has rich forest imagery (twisted trees, jagged rocks, gleaming eyes). This content item should return descriptive feedback.
- **Fix:** Add `discovery: 'You press your face to the narrow window. The Carpathian forest is a blur of black shapes — twisted trees with branches like grasping fingers, jagged rocks that loom and vanish. Occasionally, you catch the gleam of eyes reflecting the coach lantern. Not one pair. Dozens. All watching.'`

### BUG-17 | scene_02 | MISSING DISCOVERY | `watch_wolves` has no discovery text
- **label:** "Watch the wolves that follow the coach"
- **Problem:** Wolves are a major atmospheric element. This should yield content.
- **Fix:** Add discovery text about the wolves' disciplined, unnatural behavior.

### BUG-18 | scene_02 | MISSING DISCOVERY | `feel_speed` has no discovery text
- **label:** "Grip the seat as the coach races through the dark"
- **Problem:** The supernatural speed is a key tension element.
- **Fix:** Add discovery text about the impossible speed and the coach's movement.

### BUG-19 | scene_03 | MISSING DISCOVERY | `examine_castle` has no discovery text
- **label:** "Study the castle exterior"
- **Problem:** The description has rich exterior details (turrets, battlements, black stone, moss, ivy, iron gates). First impression of Castle Dracula needs discovery content.
- **Fix:** Add discovery text about the castle's imposing, ancient exterior.

### BUG-20 | scene_03 | MISSING DISCOVERY | `meet_dracula` has no discovery text
- **label:** "Greet the Count as he welcomes you"
- **Problem:** This is the player's FIRST face-to-face meeting with the antagonist — a pivotal narrative moment. Absolutely needs discovery text describing his appearance, cold grip, burning eyes, flawless English.
- **Fix:** Add discovery text, e.g.: `'You extend your hand. The Count takes it — his grip is cold as marble, his skin smooth and pale as bone. Up close, his eyes are extraordinary: dark, deep-set, burning with an intelligence that seems to look through you rather than at you. "Welcome to my home," he says. His English is flawless. His smile is warm. And yet something in the back of your mind screams that you should run.'`

### BUG-21 | scene_05 | MISSING DISCOVERY | `inspect_lock` has no discovery text
- **label:** "Study the iron lock and scratch marks"
- **Problem:** The description mentions "The lock is old but strong. Scratch marks line the jamb — someone tried to get in. Or out." — rich content for discovery.
- **Fix:** Add discovery text about the lock mechanism and whether the scratch marks are from inside or outside.

### BUG-22 | scene_07 | MISSING DISCOVERY | `read_entries` has no discovery text
- **label:** "Read the earlier journal entries in order"
- **Problem:** Reading Harker's full account is a major story moment. Should yield rich content about his descent from professional solicitor to terrified prisoner.
- **Fix:** Add discovery text showing the progression of Harker's entries from calm to terrified.

### BUG-23 | scene_07 | MISSING DISCOVERY | `copy_notes` has no discovery text
- **label:** "Tear out the key pages and keep them"
- **Problem:** A practical action that should confirm the player is taking evidence.
- **Fix:** Add discovery text.

### BUG-24 | scene_08 | MISSING DISCOVERY | `climb_down` has no discovery text
- **label:** "Climb down the castle wall"
- **Problem:** Climbing a hundred-foot castle wall in the dark with wolves below is a dramatic action that needs description.
- **Fix:** Add discovery text about the treacherous climb, raw fingers, and wolves noticing below.

### BUG-25 | scene_08 | MISSING DISCOVERY | `find_path` has no discovery text
- **label:** "Search for the mountain path through the trees"
- **Problem:** Finding the escape route is critical to the scene.
- **Fix:** Add discovery text.

### BUG-26 | scene_12 | MISSING DISCOVERY | `ask_about_lucy_renfield` has no discovery text
- **label:** "Ask if he knows about Lucy Westenra"
- **Problem:** Renfield is Dracula's servant — he would have dark, disturbing knowledge about Lucy's condition. This is a key information-gathering moment.
- **Fix:** Add discovery text with Renfield's creepy, knowing response about Lucy being "the Master's new pet."

### BUG-27 | scene_13 | MISSING DISCOVERY | `use_holy_water` has no discovery text
- **label:** "Splash holy water on the window frame"
- **Problem:** Using a key item in a dramatic defensive moment needs narrative payoff.
- **Fix:** Add discovery text about the holy water sizzling, the bats recoiling, the Count's voice from the darkness.

### BUG-28 | scene_13 | MISSING DISCOVERY | `fortify_room` has no discovery text
- **label:** "Place garlic at every opening"
- **Problem:** A defensive preparation action in a tense scene.
- **Fix:** Add discovery text.

### BUG-29 | scene_00 | MISSING DISCOVERY | `check_stables` has no discovery text
- **label:** "Look out the back window at the stable yard"
- **Problem:** The description mentions a nervous horse, empty yard, darkening sky — should return descriptive content.
- **Fix:** Add discovery text about the nervous horse, the empty yard, the absence of the coach.

### BUG-30 | scene_00 | MISSING DISCOVERY | `examine_crucifix` has no discovery text
- **label:** "Examine the brass crucifix"
- **Problem:** The crucifix is a key item carried through multiple scenes. First discovery should be meaningful.
- **Fix:** Add discovery text about the worn brass, the firelight catching it, the innkeeper watching.

---

## 🟢 LOW SEVERITY — Minor issues and design notes

### BUG-31 | scene_01 | EXIT LABEL | "Step" is somewhat narrow
- **exitLabel:** `"Step out at the crossroads"`
- **specific words:** `["step", "crossroads"]`
- **action verb required:** "step"
- **Problem:** "Get out at the crossroads" or "exit the coach" won't match. "Step" is reasonable but narrow.
- **Fix:** Consider `"Get out at the crossroads"` → action verb "get".

### BUG-32 | scene_02 | EXIT LABEL | "Look" is acceptable but narrow
- **exitLabel:** `"Look up as the castle comes into view"`
- **action verb required:** "look"
- **Problem:** "See the castle" or "spot the castle" won't match. Low risk since "look" is common.
- **Fix:** Low priority.

### BUG-33 | scene_03 | EXIT LABEL | "Follow" is acceptable
- **exitLabel:** `"Follow the Count to the dining hall"`
- **action verb required:** "follow"
- **Problem:** "Go to dinner" or "accept the invitation" won't match. Low risk.
- **Fix:** Consider `"Follow the Count to dinner"` (shorter).

### BUG-34 | scene_09 | EXIT LABEL | "Approach" is somewhat narrow
- **exitLabel:** `"Approach the monastery and seek help"`
- **action verb required:** "approach"
- **Problem:** "Go to the monastery" or "enter the monastery" won't match.
- **Fix:** Consider `"Walk to the monastery and seek help"` → action verb "walk".

### BUG-35 | scene_10/11/12/14 | EXIT LABEL | "Leave" pattern is acceptable
- **exitLabels:** All use "Leave..." as the action verb.
- **Problem:** "Leave" is a very common player verb. Low risk, but players who type "go" or "head out" won't match.
- **Fix:** Low priority. Consider alternating with "Go" for variety.

### BUG-36 | scene_04 | BANNED KEYWORDS | "the forbidden wing" banned before discovery
- **banned:** Includes `'the forbidden wing'`
- **Problem:** Correct forward-looking protection. Not a bug.
- **Fix:** None needed.

### BUG-37 | scene_08 | NPC CONSISTENCY | 'jonathan harker' in metNPCs
- **initialFacts.metNPCs:** `['innkeeper', 'dracula', 'jonathan harker']`
- **Problem:** Same issue as Bug-13. Player never physically met Harker.
- **Fix:** Remove 'jonathan harker' from metNPCs.

### BUG-38 | scene_09 | NPC CONSISTENCY | 'jonathan harker' in metNPCs
- **initialFacts.metNPCs:** `['innkeeper', 'dracula', 'jonathan harker']`
- **Problem:** Same issue as Bug-13/37.
- **Fix:** Remove 'jonathan harker' from metNPCs.

### BUG-39 | scene_02 | EXIT LABEL | "Look" is the action verb for arriving at a castle
- **exitLabel:** `"Look up as the castle comes into view"`
- **Problem:** The exit action is "arrive_castle" but the label is about looking up. A player who types "arrive at the castle" won't trigger it. The label should describe the action of arriving, not observing.
- **Fix:** Consider `"Arrive at the base of the castle"` → action verb "arrive".

---

## SUMMARY TABLE

| Severity | Count | Key Themes |
|----------|-------|------------|
| 🔴 HIGH | 9 | Exit labels with unnatural verbs (excuse, plunge, return, escape, close, hold); initialFacts with items found during scene |
| 🟡 MEDIUM | 21 | Missing discovery texts (15 items); narrative continuity gaps; NPC inconsistencies; banned keyword gaps |
| 🟢 LOW | 9 | Narrow but acceptable exit verbs; minor NPC tracking issues |
| **TOTAL** | **39** | |

## TOP 5 FIXES (Highest Impact)

1. **Fix all exit labels** (BUG-01 through BUG-06, BUG-31-34, BUG-39): Change action verbs to common player words: "go", "run", "walk", "wait", "retire", "finish", "get"
2. **Fix initialFacts.items** (BUG-07, BUG-08, BUG-09): Remove items that are discovered DURING the scene from initial inventory
3. **Add discovery texts** (BUG-16 through BUG-30): 15 content items across 10 scenes are missing discovery text for meaningful exploration actions
4. **Fix scene_05→scene_06 transition** (BUG-12): Add narrative bridge between escaping the forbidden wing and waking in the chamber
5. **Fix NPC tracking** (BUG-11, BUG-13, BUG-14, BUG-15, BUG-37, BUG-38): Remove 'jonathan harker' from metNPCs (never physically met), remove 'dracula' from scene_02 metNPCs (spoiler), handle 'lucy' death in scene_14
