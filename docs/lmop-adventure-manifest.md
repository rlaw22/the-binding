# Lost Mine of Phandelver — Adventure Manifest
## Scene Graph Reference for The Binding Engine

---

## 1. OVERVIEW

- **Levels:** 1–5
- **Structure:** 4 Acts (chapters) + 1 town hub + wilderness sandbox
- **Theme:** Rescue, mystery, faction conflict, and the discovery of a lost magical forge
- **Setting:** Sword Coast — town of Phandalin, surrounding wilderness, Wave Echo Cave
- **Primary Antagonist:** The Black Spider (Nezznar), a drow wizard seeking the Forge of Spells
- **Core Loop:** Linear intro → sandbox exploration → dungeon climax

---

## 2. CHAPTER / ACT STRUCTURE

### ACT I: Goblin Arrows (Level 1)
**Type:** Linear dungeon crawl / tutorial
**Goal:** Rescue Sildar Hallwinter and Gundren Rockseyer from goblin captivity

| Scene ID | Location | Summary | Encounters |
|----------|----------|---------|------------|
| `1.0` | **Triboar Trail (Ambush)** | Party finds two dead horses on the road — a goblin ambush. | 4 Goblins (CR 1/4 each) |
| `1.1` | **Cragmaw Hideout — Cave Mouth** | Goblin lair entrance in a cliff face along the Triboar Trail. Stream flows out. | 2 Goblin sentries |
| `1.2` | **Cragmaw Hideout — Kennel** | Wolves kept chained as guard animals. Can be befriended (DC 15 Animal Handling). | 3 Wolves |
| `1.3` | **Cragmaw Hideout — Goblin Blind** | Elevated ledge with goblins who attack from above, flooding the passage below. | 4 Goblins, 1 Goblin Boss |
| `1.4` | **Twin Pools Cave** | Water-filled chamber. Hidden passage leads deeper. | Environmental (drowning risk) |
| `1.5` | **Cragmaw Hideout — Klarg's Lair** | Bugbear boss chamber. Contains Sildar's gear and a map to Cragmaw Castle. | Klarg (Bugbear, CR 1), 1 Wolf, 2 Goblins, 1 Goblin Boss |
| `1.6` | **Cragmaw Hideout — Prisoner Area** | Sildar Hallwinter is held here (if not rescued earlier). Gundren has been taken to Cragmaw Castle. | 1-2 Goblins |

**Key Items Found:** Gundren's map to Wave Echo Cave, Sildar's equipment, Klarg's stash
**Quest Trigger:** Sildar asks party to find Gundren at Cragmaw Castle; mentions he was heading to Phandalin
**Level Up:** Characters reach **Level 2** after this act

---

### ACT II: Phandalin (Level 2) — The Sandbox Hub
**Type:** Town hub / social / quest-gathering
**Goal:** Explore Phandalin, learn about the region's problems, gather quests

| Scene ID | Location | Summary | NPCs |
|----------|----------|---------|------|
| `2.0` | **Phandalin — Town Square** | Small frontier town. ~50 buildings, pop ~100. Mining settlement rebuilding after dragon cult raids. | Various townsfolk |
| `2.1` | **Barthen's Provisions** | General store. Deliver Gundren's supplies for 50gp reward. | Elmar Barthen |
| `2.2` | **Lionshield Coster** | Trading post with a stolen goods subplot. | Linene Liadon |
| `2.3` | **Stonehill Inn** | Town tavern and social hub. Rumors, gossip, quest hooks. | Toblen Stonehill, Trilena, Pip |
| `2.4` | **Townmaster's Hall** | Town leadership. Harbin Wester is cowardly and corrupt-leaning. | Harbin Wester (Townmaster) |
| `2.5` | **Shrine of Luck** | Temple of Tymora. Healing services available. | Sister Garaele |
| `2.6` | **Alderleaf Farm** | Halfling farm on town edge. Key ally location. | Qelline Alderleaf, Carp Alderleaf |
| `2.7` | **The Sleeping Giant** | Rough tavern, Redbrand hangout. Potential combat trigger. | Redbrand Ruffians (3-4) |
| `2.8` | **Tresendar Manor (Ruins)** | Ruined manor on hill above town. Secret entrance to Redbrand Hideout. | — |
| `2.9` | **Redbrand Hideout — Cellar Entrance** | Secret entrance through manor ruins or via Tressendar crypts. | — |

**Quests GATHERED in Phandalin (all feed into Act III and beyond):**

| Quest | Giver | Target | Reward |
|-------|-------|--------|--------|
| Find Gundren Rockseyer | Sildar Hallwinter | Cragmaw Castle | 500gp |
| Clear the Redbrands | Sildar Hallwinter / multiple | Redbrand Hideout | Town safety |
| Sister Garaele's Quest | Sister Garaele | Agatha's Lair (ask a banshee a question) | Potion of Healing + future favor |
| The Banshee's Question | Sister Garaele | Find Bowgentle's spellbook location | — |
| Qelline's Request | Qelline Alderleaf | Recon Redbrand Hideout via her son Carp's knowledge | Safe passage |
| Townmaster's Quest | Harbin Wester | Orclands — clear orcs from Wyvern Tor | 100gp |
| Halia's Request | Halia Thornton | Capture Glasstaff alive | 100gp + Zhentarim favor |
| Reidoth's Location | Various | Find the druid Reidoth in Thundertree | Information on Cragmaw Castle |

---

### ACT II-B: Redbrand Hideout (Level 2–3)
**Type:** Dungeon crawl
**Goal:** Defeat the Redbrand ruffians and their leader Glasstaff (Iarno Albrek)

| Scene ID | Location | Summary | Encounters |
|----------|----------|---------|------------|
| `2.10` | **Redbrand Hideout — Cellar** | Dark cellar beneath Tresendar Manor. Storage and guard post. | 3 Redbrand Ruffians |
| `2.11` | **Redbrand Hideout — Common Room** | Main gathering area for Redbrands. | 3 Redbrand Ruffians, 1 Bugbear (Droop — enslaved, potential ally) |
| `2.12` | **Redbrand Hideout — Crevasse** | Natural chasm with bridge. Trap: pit with spikes below. | Environmental trap (DC 10 Dex save, 2d6 piercing) |
| `2.13` | **Redbrand Hideout — Slave Pens** | Prisoner cells. Mirna Dendrar and her children are held here. | 1 Redbrand Ruffian |
| `2.14` | **Redbrand Hideout — Barracks** | Redbrand sleeping quarters. | 3 Redbrand Ruffians (possibly sleeping) |
| `2.15` | **Redbrand Hideout — Nothic's Lair** | Crevasse area inhabited by a Nothic — a corrupted aberration. Can be bargained with. | Nothic (CR 2) |
| `2.16` | **Redbrand Hideout — Glasstaff's Quarters** | Iarno Albrek's study. Contains evidence of Black Spider correspondence, staff of defense, and a map. | Glasstaff / Iarno Albrek (Evil Mage, CR 2) + Familiar |
| `2.17` | **Redbrand Hideout — Secret Tunnel Exit** | Escape route to the woods outside town. Glasstaff may flee here. | — |

**Key Items:** Staff of Defense, Black Spider's letters (reveals Nezznar's involvement), Tresendar Manor map
**Critical Intel:** Letters reveal the Black Spider is looking for Wave Echo Cave and has agents in the region
**Level Up:** Characters reach **Level 3** after clearing the hideout

---

### ACT III: The Wilderness Sandbox (Level 3–4)
**Type:** Open-world exploration — multiple locations, player-driven order
**Goal:** Find Cragmaw Castle (to rescue Gundren) and/or find Wave Echo Cave

The party has multiple leads pointing to different wilderness locations. They can tackle these in any order.

#### Location A: Triboar Trail Encounters
Random and scripted wilderness encounters while traveling. Bandits, orcs, owlbears, etc.

#### Location B: Old Owl Road / Conyberry — Agatha's Lair
| Scene ID | Location | Summary | Encounters |
|----------|----------|---------|------------|
| `3.0` | **Conyberry Ruins** | Abandoned village. Path to Agatha's Lair. | — |
| `3.1` | **Agatha's Lair** | Ghost of a banshee. Sister Garaele wants the party to ask her a question about Bowgentle's spellbook. Must offer a gift (comb). | Agatha (Banshee, CR 4 — social encounter, not combat unless provoked) |

#### Location C: Thundertree (Dragon Cult / Druid)
| Scene ID | Location | Summary | Encounters |
|----------|----------|---------|------------|
| `3.2` | **Thundertree — Ruined Village** | Ash-ravaged village destroyed by Mt. Hotenow eruption. Now infested with blights and a dragon. | Twig Blights, Ash Zombies |
| `3.3` | **Thundertree — Dragon's Tower** | Ruined tower occupied by a young green dragon. | **Venomfang** (Young Green Dragon, CR 8 — potentially lethal, can be negotiated with or fled from) |
| `3.4` | **Thundertree — Druid's Cottage** | Reidoth the druid lives here, hiding from the dragon. Knows Cragmaw Castle's location. | Reidoth (Druid NPC) |
| `3.5` | **Thundertree — Cult of the Dragon Hideout** | Dragon cultists who worship Venomfang. | 4 Cultists, Dragonclaw (CR 1) |
| `3.6` | **Thundertree — Ruined Manor** | Contains ash zombies and a trapped chest. | 3 Ash Zombies |

**Quest Resolution:** Reidoth tells the party exactly where Cragmaw Castle is.

#### Location D: Wyvern Tor (Orc Quest)
| Scene ID | Location | Summary | Encounters |
|----------|----------|---------|------------|
| `3.7` | **Wyvern Tor — Orc Camp** | Mountain outpost occupied by orcs raiding the region. Harbin Wester's quest target. | 1 Ogre, 6 Orcs (CR 1/2 each) |

#### Location E: Cragmaw Castle (CRITICAL PATH)
| Scene ID | Location | Summary | Encounters |
|----------|----------|---------|------------|
| `3.8` | **Cragmaw Castle — Approach** | Ruined castle in Neverwinter Wood. Goblin lair. Multiple entry points. | Goblin sentries |
| `3.9` | **Cragmaw Castle — Main Entry / Great Hall** | Collapsed main hall. Goblin guards. | 1 Goblin, 1 Hobgoblin |
| `3.10` | **Cragmaw Castle — Barracks** | Hobgoblin and goblin quarters. | 1 Hobgoblin, 3 Goblins |
| `3.11` | **Cragmaw Castle — Dining Hall** | Bugbear feast hall. | 1 Bugbear, 1 Wolf, 2 Goblins |
| `3.12` | **Cragmaw Castle — Priest's Chamber** | Evil priest of Lloth. | **Yegg** (Goblin priest) or Doppleganger in disguise |
| `3.13` | **Cragmaw Castle — King Grol's Chamber** | The bugbear king's throne room. Gundren is here, badly beaten. The doppelganger Vyerith may be present. | **King Grol** (Bugbear Chief, CR 3), **Vyerith** (Doppelganger, CR 3), 1 Wolf |
| `3.14` | **Cragmaw Castle — Treasure Room** | Hidden stash of the Cragmaw tribe. | Loot: gold, gems, + Gundren's map to Wave Echo Cave |

**Critical Resolution:** Rescue Gundren Rockseyer alive. Recover the map to Wave Echo Cave.
**Level Up:** Characters reach **Level 4** after Cragmaw Castle

---

### ACT IV: Wave Echo Cave (Level 4–5)
**Type:** Mega-dungeon crawl — the climax
**Goal:** Find the Forge of Spells, defeat the Black Spider, and claim (or destroy) the Forge

| Scene ID | Location | Summary | Encounters |
|----------|----------|---------|------------|
| `4.0` | **Wave Echo Cave — Entrance** | Hidden cave entrance in the Sword Mountains. Sound of crashing waves echoes within (ancient magic). | Environmental: darkness, echoing sounds |
| `4.1` | **Wave Echo Cave — Mine Tunnels** | Old dwarven mine shafts. Partially flooded. | 6 Giant Bats |
| `4.2` | **Wave Echo Cave — Fungi Cavern** | Cave filled with strange glowing fungi. | 10 Stirges, poisonous gas (DC 12 Con save) |
| `4.3` | **Wave Echo Cave — Old Entrance** | Secondary cave entrance. Overgrown. | 1 Ochre Jelly |
| `4.4` | **Wave Echo Cave — South Passages** | Winding tunnels with undead. | 8 Zombie (dwarven miners, risen) |
| `4.5` | **Wave Echo Cave — Great Cavern** | Massive underground lake. The "wave echo" — magical resonance fills the air. | 2 Ochre Jellies, environmental hazard |
| `4.6` | **Wave Echo Cave — North Passages** | Tunnels leading toward the Forge. | 12 Skeletons (dwarven warriors) |
| `4.7` | **Wave Echo Cave — Black Spider's Camp** | Nezznar's forward operating base. His drow followers and bugbear guards. | 2 Giant Spiders, 4 Bugbears |
| `4.8` | **Wave Echo Cave — The Forge of Spells** | The legendary magical forge. Still radiates powerful enchantment magic. Weapons/armor touched by its light gain +1. | **Spectator** (CR 3 — a beholder-kin bound to guard the Forge, can be negotiated with) |
| `4.9` | **Wave Echo Cave — The Black Spider's Lair** | Final boss chamber. Nezznar has been trying to breach the Forge's guardian. | **Nezznar the Black Spider** (Drow Wizard, CR 2 — but with tactical play, lair advantage, and Giant Spider allies he's more dangerous), 2 Giant Spiders, potentially 4 Giant Spiders as reinforcements |

**Key Items:** Forge of Spells (can enchant weapons/armor permanently), Wave Echo Cave treasure hoard (7,000+ gp in gems and art objects)
**Resolution:** Defeat the Black Spider. The Forge of Spells can be claimed, sealed, or destroyed — major narrative branch.

---

## 3. LEVEL PROGRESSION

| Level | Reached After | Milestone |
|-------|--------------|-----------|
| **1** | Adventure start | Characters begin at Level 1 |
| **2** | Act I complete | Clearing Cragmaw Hideout |
| **3** | Act II-B complete | Clearing Redbrand Hideout |
| **4** | Act III complete | Rescuing Gundren at Cragmaw Castle |
| **5** | Act IV complete | Clearing Wave Echo Cave / defeating Black Spider |

---

## 4. KEY NPCs — COMPLETE ROSTER

### Allies & Quest Givers

| NPC | Role | Location | Quest | Notes |
|-----|------|----------|-------|-------|
| **Gundren Rockseyer** | Dwarf merchant, employer | Captured → Cragmaw Castle → rescued | Main quest hook | Has the map to Wave Echo Cave |
| **Sildar Hallwinter** | Human warrior, Lord's Alliance agent | Cragmaw Hideout → Phandalin | Find Gundren, clear Redbrands | Gruff but honorable; rewards party |
| **Qelline Alderleaf** | Halfling farmer | Alderleaf Farm, Phandalin | Recon Redbrand Hideout | Knows secret entrance; her son Carp saw it |
| **Sister Garaele** | Elf cleric of Tymora | Shrine of Luck, Phandalin | Find Agatha, ask about spellbook | Provides healing services |
| **Reidoth** | Human druid | Thundertree | None (information source) | Knows Cragmaw Castle location; can also help with Wave Echo Cave |
| **Halia Thornton** | Human, Zhentarim agent | Phandalin Townmaster's Hall | Capture Glasstaff alive | Zhentarim faction; morally grey quest giver |
| **Elmar Barthen** | Human shopkeeper | Barthen's Provisions | Deliver supplies | Simple merchant; pays 50gp |
| **Nundro Rockseyer** | Dwarf, Gundren's brother | Wave Echo Cave (prisoner) | — | Found alive in the cave; can share lore about the Forge |
| **Droop** | Goblin slave | Redbrand Hideout | — | Enslaved by Redbrands; can become party's guide/ally |

### Antagonists

| NPC | Role | Location | CR | Notes |
|-----|------|----------|-----|-------|
| **Nezznar the Black Spider** | Drow wizard, main villain | Wave Echo Cave | 2 (but tactically dangerous) | Seeks Forge of Spells; commands drow, spiders, bugbears |
| **Glasstaff / Iarno Albrek** | Human mage, Redbrand leader | Redbrand Hideout | 2 | Sildar's missing companion; defected to Black Spider; has Staff of Defense |
| **King Grol** | Bugbear chief | Cragmaw Castle | 3 | Holds Gundren hostage; commands the Cragmaw tribe |
| **Klarg** | Bugbear | Cragmaw Hideout | 1 | Sub-boss; runs the goblin raiding party |
| **Venomfang** | Young green dragon | Thundertree | 8 | Optional but memorable; territorial, not directly tied to Black Spider |
| **Agatha** | Banshee | Conyberry | 4 | Social encounter; ancient elf spirit; knows secrets |
| **Vyerith** | Doppelganger | Cragmaw Castle | 3 | Shapechanger working for the Black Spider; can impersonate NPCs |
| **Halia Thornton** | Zhentarim agent | Phandalin | — | Potential antagonist depending on player choices |

### Faction Representatives

| Faction | Representative | Goal |
|---------|---------------|------|
| **Lords' Alliance** | Sildar Hallwinter | Restore order to Phandalin region |
| **Zhentarim** | Halia Thornton | Gain influence in Phandalin; control the Forge |
| **Harpers** | Sister Garaele (loosely) | Gather intelligence; find lost magical knowledge |
| **Cult of the Dragon** | Dragon cultists at Thundertree | Recruit Venomfang; tangential to main plot |

---

## 5. MAIN QUEST LINE & SIDE QUESTS

### Main Quest Line (Critical Path)
```
START → Ambush on Triboar Trail
  → Cragmaw Hideout (rescue Sildar, learn Gundren taken to Cragmaw Castle)
    → Travel to Phandalin (gather information and quests)
      → Redbrand Hideout (defeat Glasstaff, learn about Black Spider)
        → Find Cragmaw Castle (via Reidoth in Thundertree, or other leads)
          → Cragmaw Castle (rescue Gundren, recover map)
            → Wave Echo Cave (defeat Black Spider, claim Forge of Spells)
              → END
```

### Side Quests

| Quest | Giver | Location | Reward | XP |
|-------|-------|----------|--------|-----|
| **Sister Garaele's Errand** | Sister Garaele | Agatha's Lair | Potion of Healing + future favor | 300 XP |
| **Orc Trouble** | Harbin Wester | Wyvern Tor | 100 gp | 350 XP |
| **The Dragon of Thundertree** | Self-discovery / Reidoth | Thundertree | Loot from dragon hoard (if killed); Reidoth's info | 3,900 XP (if dragon killed) |
| **Halia's Offer** | Halia Thornton | Phandalin → Redbrand Hideout | 100 gp + Zhentarim favor | 300 XP |
| **Droop the Goblin** | Self-discovery | Redbrand Hideout | Guide/ally | — |
| **The Dendrar Family** | Self-discovery | Redbrand Hideout | Town gratitude | — |
| **Lionshield Coster Stolen Goods** | Linene Liadon | Phandalin | Reward + trade discount | — |

### Faction Quests (Long-term hooks for post-module play)
- **Lords' Alliance:** Sildar may recruit capable PCs for future missions
- **Zhentarim:** Halia offers membership if Glasstaff is captured alive
- **Harpers:** Sister Garaele may invite PCs who complete her quest
- **Order of the Gauntlet:** Potential hook via the orc quest resolution

---

## 6. SCENE GRAPH CONNECTIONS (for engine implementation)

### Entry Points (how players reach each scene)
```
1.0 (Ambush) → 1.1 (Cave Mouth) [follow goblin tracks]
1.1 → 1.2, 1.3, 1.4 [branching paths in cave]
1.2/1.3/1.4 → 1.5 (Klarg) [converge on boss]
1.5/1.3 → 1.6 (Prisoner) [find Sildar]
1.6 → 2.0 (Phandalin) [travel to town]

2.0 → 2.1-2.9 [explore town freely]
2.7 (Sleeping Giant fight) → 2.8/2.9 [Redbrand hideout hook]
2.9 → 2.10-2.17 [dungeon crawl]

2.0 → 3.0-3.7 [wilderness locations, any order]
3.4 (Reidoth) → 3.8 (Cragmaw Castle) [critical path]
3.8-3.14 → 4.0 [Wave Echo Cave]

4.0 → 4.1-4.9 [linear dungeon with branches]
4.9 (Black Spider) → FINALE
```

### Branching Decision Points
1. **Cragmaw Hideout:** Kill Klarg or negotiate? → affects later reputation
2. **Redbrand Hideout:** Kill or capture Glasstaff? → affects Zhentarim quest
3. **Thundertree:** Fight or negotiate with Venomfang? → massive risk/reward
4. **Agatha:** What question to ask? → affects information gathered
5. **Forge of Spells:** Claim, seal, or destroy? → major narrative branch
6. **Nezznar:** Kill or capture? → affects faction outcomes

---

## 7. ENCOUNTER DIFFICULTY REFERENCE

| Encounter | Party Level | Difficulty | Notes |
|-----------|-------------|------------|-------|
| Goblin Ambush (1.0) | 1 | Easy | Tutorial fight |
| Klarg (1.5) | 1 | Hard/Deadly | First boss; can TPK if unprepared |
| Redbrand Ruffians (2.7) | 2 | Medium | Social trigger possible |
| Nothic (2.15) | 2 | Medium | Social encounter option |
| Glasstaff (2.16) | 2-3 | Medium-Hard | May flee |
| Venomfang (3.3) | 3-4 | **Deadly** | Green dragon breath weapon is devastating |
| Wyvern Tor Orcs (3.7) | 3 | Medium | Straightforward combat |
| King Grol (3.13) | 4 | Hard | Multiple enemies |
| Forge Spectator (4.8) | 4 | Medium | Can be negotiated with |
| Nezznar Final (4.9) | 4-5 | Hard | Tactical wizard + spider allies |

---

*Generated for The Binding Engine scene graph implementation.*
*Adventure: Lost Mine of Phandelver (Wizards of the Coast, 2014)*
