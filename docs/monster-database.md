# Monster Database — SRD 5.1 Open License

## Overview

The Binding includes a comprehensive monster database built from the **D&D 5.1 Systems Reference Document (SRD)**, licensed under **Creative Commons Attribution 4.0 International (CC-BY-4.0)**. This database powers combat encounters in **Campaign Mode** and **Digital Dungeon Master Mode**.

- **334 creatures** from CR 0 (Awakened Shrub) to CR 30 (Tarrasque)
- All 10 dragon families (Chromatic + Metallic) across 4 age categories (Wyrmling, Young, Adult, Ancient)
- Full stat blocks: abilities, AC, HP, attacks, traits, legendary actions, lair actions
- Encounter balancing using official DMG XP thresholds

> **Future:** The Binding will create its own custom monsters beyond the SRD. Custom creatures will extend the same JSON schema and live in a separate file (`data/monsters/binding-custom.json`).

---

## License & Attribution

**Source:** Systems Reference Document 5.1  
**License:** Creative Commons Attribution 4.0 International (CC-BY-4.0)  
**License URL:** https://creativecommons.org/licenses/by/4.0/legalcode  
**API Source:** https://www.dnd5eapi.co

> *This work includes material from the Systems Reference Document 5.1, available at https://dnd.wizards.com/resources/systems-reference-document, and licensed under Creative Commons Attribution 4.0 International.*

Custom Binding monsters will be released under the project's own license.

---

## Monster Stat Block Schema

Each monster in the database follows this JSON schema:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Creature name (e.g., "Goblin", "Ancient Red Dragon") |
| `source` | string | Always "SRD 5.1" for license compliance |
| `license` | string | Always "CC-BY-4.0" |
| `cr` | number | Challenge Rating (0, 0.125, 0.25, 0.5, 1–30) |
| `xp` | number | XP value corresponding to CR |
| `type` | string | Creature type (beast, undead, dragon, fiend, etc.) |
| `subtype` | string\|null | Subtype (goblinoid, elf, shapechanger, etc.) |
| `size` | string | Tiny, Small, Medium, Large, Huge, Gargantuan |
| `alignment` | string | Typical alignment |
| `ac` | number | Armor Class |
| `ac_type` | string | Source of AC (natural armor, leather armor, etc.) |
| `hp` | number | Average hit points |
| `hp_formula` | string | Hit dice formula (e.g., "2d6", "17d12+119") |
| `speed` | object | Movement speeds: `{ walk, fly, swim, climb, burrow }` (ft.) |
| `abilities` | object | `{ str, dex, con, int, wis, cha }` |
| `skills` | object | Skill bonuses (e.g., `{ stealth: 6, perception: 3 }`) |
| `senses` | string[] | Special senses (darkvision, blindsight, etc.) |
| `languages` | string[] | Known languages |
| `traits` | object[] | Special abilities: `[{ name, description }]` |
| `actions` | object[] | Actions/attacks: `[{ name, attack_bonus?, damage?, damage_type?, description }]` |
| `reactions` | object[] | Reactions: `[{ name, description }]` |
| `legendary_actions` | object[] | Legendary actions (dragons, liches, etc.) |
| `lair_actions` | object[] | Lair actions (if any) |
| `damage_immunities` | string[] | Damage type immunities |
| `damage_resistances` | string[] | Damage type resistances |
| `damage_vulnerabilities` | string[] | Damage type vulnerabilities |
| `condition_immunities` | string[] | Condition immunities |
| `tags` | string[] | Additional tags |
| `environment` | string[] | Environments where found |
| `tactics` | string | Brief tactical description |

---

## Challenge Rating & Encounter Building

### CR to XP Table

| CR | XP | | CR | XP | | CR | XP |
|----|-----|-|----|-----|-|----|-----|
| 0 | 10 | | 5 | 1,800 | | 13 | 10,000 |
| 1/8 | 25 | | 6 | 2,300 | | 14 | 11,500 |
| 1/4 | 50 | | 7 | 2,900 | | 15 | 13,000 |
| 1/2 | 100 | | 8 | 3,900 | | 16 | 15,000 |
| 1 | 200 | | 9 | 5,000 | | 17 | 18,000 |
| 2 | 450 | | 10 | 5,900 | | 18 | 20,000 |
| 3 | 700 | | 11 | 7,200 | | 19 | 22,000 |
| 4 | 1,100 | | 12 | 8,400 | | 20–30 | 25,000–155,000 |

### Encounter Difficulty Thresholds (per character level)

| Level | Easy | Medium | Hard | Deadly |
|-------|------|--------|------|--------|
| 1 | 25 | 50 | 75 | 100 |
| 2 | 50 | 100 | 150 | 200 |
| 3 | 75 | 150 | 225 | 400 |
| 4 | 125 | 250 | 375 | 500 |
| 5 | 250 | 500 | 750 | 1,100 |
| 10 | 600 | 1,200 | 1,900 | 2,800 |
| 15 | 1,400 | 2,800 | 4,300 | 6,400 |
| 20 | 2,800 | 5,700 | 8,500 | 12,700 |

### Encounter Multipliers (DMG p.82)

| # of Monsters | Multiplier |
|---------------|-----------|
| 1 | ×1 |
| 2 | ×1.5 |
| 3–6 | ×2 |
| 7–10 | ×2.5 |
| 11–14 | ×3 |
| 15+ | ×4 |

**Party size adjustment:** Party of 1–2 → multiplier increases one step. Party of 6+ → multiplier decreases one step.

### How The Binding Uses This

The encounter builder (`MonsterManual.buildRandomEncounter()`) automatically:
1. Selects monsters appropriate for the party's level and environment
2. Calculates raw XP from selected creatures
3. Applies the encounter multiplier
4. Compares against DMG thresholds to determine difficulty
5. Returns a balanced encounter tagged as trivial/easy/medium/hard/deadly

---

## Monster Types

| Type | Count | Examples |
|------|-------|---------|
| Beast | 87 | Wolf, Giant Eagle, T. Rex |
| Humanoid | 50 | Goblin, Bandit, Mage |
| Dragon | 43 | Ancient Red Dragon, Wyrmling Blue |
| Monstrosity | 39 | Basilisk, Medusa, Hydra |
| Fiend | 23 | Pit Fiend, Balor, Imp |
| Undead | 20 | Zombie, Lich, Vampire |
| Elemental | 16 | Fire Elemental, Djinni |
| Swarm | 10 | Swarm of Rats, Swarm of Bats |
| Giant | 10 | Hill Giant, Storm Giant |
| Construct | 9 | Iron Golem, Shield Guardian |
| Plant | 6 | Shambling Mound, Treant |
| Fey | 6 | Dryad, Satyr, Sprite |
| Celestial | 6 | Planetar, Solar, Deva |
| Aberration | 5 | Aboleth, Mind Flayer |
| Ooze | 4 | Black Pudding, Gelatinous Cube |

---

## Environment Distribution

Monsters are tagged by their natural environments, which the encounter builder uses to generate thematic encounters:

- **Arctic** — Polar Bear, Ice Mephit, Remorhaz, Frost Giant
- **Coastal** — Giant Crab, Merfolk, Reef Shark, Harpy
- **Desert** — Camel, Jackal, Mummy, Lamia
- **Forest** — Wolf, Goblin, Treant, Dryad, Owlbear
- **Grassland** — Elk, Lion, Gnoll, Giant Eagle
- **Hill** — Orc, Bugbear, Hill Giant, Ogre
- **Mountain** — Eagle, Giant Goat, Stone Giant, Galeb Duhr
- **Swamp** — Crocodile, Shambling Mound, Green Hag, Yuan-ti
- **Underdark** — Mind Flayer, Roper, Hook Horror, Purple Worm
- **Underwater** — Kraken, Dragon Turtle, Aboleth, Giant Shark
- **Urban** — Commoner, Spy, Ghost, Doppelganger

---

## Usage in The Binding

### Campaign Mode
- The Digital DM uses the monster database to create encounters that fit the narrative
- Encounters are balanced to the party's level using DMG thresholds
- The DM selects monsters based on environment, theme, and story context
- Combat uses full 5e stat blocks — AC, HP, attacks, abilities, and special traits

### Digital DM Mode
- Full access to all 334 SRD monsters
- Can create custom encounters with any combination of creatures
- Legendary monsters (dragons, liches) have legendary actions and lair actions
- The DM can scale encounters up or down by adding/removing creatures

### Storyline Mode
- Adventures reference specific monsters by name in their scene definitions
- Stat blocks are pulled from this database during combat scenes
- Pre-built encounters in adventures use the same balancing system

---

## Database Statistics

| Metric | Value |
|--------|-------|
| Total Monsters | 334 |
| CR Range | 0 – 30 |
| Dragon Families | 10 types × 4 ages = 40 variants |
| Legendary Creatures | ~20 (dragons, liches, etc.) |
| Creature Types | 15 |
| File Size | ~764 KB |
| License | CC-BY-4.0 |

### CR Distribution (Top 10)

| CR | Count |
|----|-------|
| 2 | 43 |
| 1/2 | 33 |
| 1/4 | 32 |
| 0 | 29 |
| 5 | 27 |
| 1 | 25 |
| 3 | 22 |
| 1/8 | 19 |
| 4 | 15 |
| 8 | 10 |

---

## Future: Custom Monsters

The Binding plans to extend beyond the SRD with original creatures:

- **Binding-native monsters** — Original designs that fit The Binding's unique settings
- **Community contributions** — Player-submitted monsters reviewed for balance
- **Blockchain integration** — Unique monster ownership concepts (future exploration)
- **Adaptive encounters** — Monsters that learn from player behavior

Custom monsters will use the same JSON schema as the SRD database, stored in a separate file (`data/monsters/binding-custom.json`). The Monster Manual module will automatically merge both databases.

---

## Technical Reference

| Component | Location |
|-----------|----------|
| SRD Monster Database | `data/monsters/srd-monsters.json` |
| Custom Monsters (future) | `data/monsters/binding-custom.json` |
| Monster Manual Module | `src/campaign/monster-manual.js` |
| Database Generator | `data/monsters/build_monster_db.py` |
| Campaign Mode Plan | `docs/campaign-mode-plan.md` |
| API Endpoints | See campaign-mode-plan.md for combat routes |
