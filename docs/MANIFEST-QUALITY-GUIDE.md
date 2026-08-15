# Manifest Quality Guide

Quality standard for scene manifests used by The Binding's act system. Every scene manifest across all adventures (Dracula, Frankenstein, Holmes) must pass these checks.

## Scene Manifest Structure

Every scene in a manifest file (`manifests-actN.js`, `manifests-{adventure}-actN.js`) is a JSON-like object with these fields:

```js
{
  sceneId: "scene_00",
  sceneName: "The Letter from Transylvania",
  description: "...",                    // Scene narration (≥100 chars)
  content: [ ... ],                      // Player action choices
  initialFacts: { ... },                 // State established in this scene
  locationKeywords: { ... },             // Banned/valid location words
  presentCharacters: [ ... ],            // NPCs in this scene (REQUIRED)
  storyMode: {
    collectibleItem: { id, label },
    badChoice: { id, label, consequence, coinCost, flagSet },
    isHealing: boolean,
    explorePriority: [ ... ]
  }
}
```

---

## Quality Checks (5 Dimensions)

### 1. presentCharacters — Presence & Completeness

**Rule**: Every scene must have a `presentCharacters` array listing NPCs who appear in the scene.

**Why**: Without this field, the scene engine cannot inject NPC context into the LLM prompt, leading to generic or hallucinated character behavior.

**Format**:
```js
presentCharacters: ["jonathan harker", "mr. hawkins"]
```

**Standards**:
- Field must exist and be an array
- Names must be lowercase, matching `keyNPCs[].name` or `keyNPCs[].id` in the adventure definition
- At least one entry per scene (the player character doesn't count)

---

### 2. Bad Choice Uniqueness

**Rule**: Bad choice labels must be unique across the entire adventure (all 5 acts). No recycling.

**Why**: Players who complete Act 1 and enter Act 2 will recognize repeated bad choices. This breaks immersion and removes the sense of discovery.

**What to watch for**:
- Same label appearing in multiple scenes (e.g., "Open the coffin" in scene_00 and scene_08)
- Variations that are essentially the same action (e.g., "Open the coffin" vs "Open a coffin") — use distinct scenarios

**Fix**: Each scene's bad choice should reflect a unique danger specific to that scene's setting and description. If a scene is about a graveyard, the bad choice should involve the graveyard — not a generic "touch the artifact."

---

### 3. Bad Choice Context-Appropriateness

**Rule**: The bad choice label must share at least one meaningful noun with the scene description.

**Why**: A bad choice like "Open the coffin" makes no sense in a scene about a train journey. The bad choice should be a plausible action within the scene's setting.

**How it's checked**: Nouns are extracted from both the scene description and the bad choice label using stop-word filtering. At least one word (3+ characters, not a stop word) must appear in both.

**Examples**:
| Scene Description | Bad Choice | ✅/❌ |
|---|---|---|
| "...the castle courtyard...coffin in the crypt" | "Open the coffin" | ✅ |
| "...the train carries you through Europe" | "Open the coffin" | ❌ |
| "...the library shelves...ancient volume" | "Read the strange text aloud" | ✅ |
| "...wolves circling in the pass" | "Read the strange text aloud" | ❌ |

---

### 4. NPC Introduction Tracking

**Rule**: Every NPC name in `initialFacts.metNPCs` must match a known NPC in the adventure's `keyNPCs` definition.

**Why**: Typos or invented NPC names cause the engine to fail to load character data, leading to generic responses.

**How it's checked**: Names are matched (case-insensitive, with partial matching for compound names like "jonathan harker" matching keyNPC id "jonathan").

**Naming conventions**:
- Use the `keyNPCs[].name` value exactly (e.g., "Count Dracula" → "count dracula")
- Or use the `keyNPCs[].id` value (e.g., "dracula")
- Avoid invented names not in the adventure definition

---

### 5. Content Quality

**Rule**: Each scene must have at least 2 content items (player actions), each with sufficient discovery text.

**Why**: Scenes with only 1 action feel like cutscenes. Short discovery text doesn't give the player enough context to make informed decisions.

**Standards**:
- **Minimum 2 content items** per scene (actions the player can take)
- **Discovery text ≥ 30 characters** per item (enough for a meaningful snippet)
- **Required fields**: `initialFacts` and `locationKeywords` must be present

**Discovery text quality checklist**:
- Tells the player something they didn't know
- Advances the plot or reveals character
- Doesn't repeat the scene description
- Uses sensory detail (sight, sound, smell, touch)

---

## Audit Script

Run the audit with:

```bash
node tests/audit-manifest.js                    # All adventures
node tests/audit-manifest.js --adventure=dracula # Single adventure
node tests/audit-manifest.js --verbose           # Show keyNPCs info
node tests/audit-manifest.js --json              # Machine-readable output
```

**Exit code 1** on any failure — suitable for CI gates.

### Adding a New Adventure

1. Create manifest files: `manifests-{adventure}-act{1-5}.js`
2. Create adventure definition: `src/adventure/{adventure}.js` with `keyNPCs` array
3. Register in `ADVENTURES` object in `tests/audit-manifest.js`
4. Run audit: `node tests/audit-manifest.js --adventure={adventure}`

---

## Checklist for New Scenes

Before committing a new scene manifest, verify:

- [ ] `presentCharacters` array present with all NPCs in the scene
- [ ] `badChoice.label` is unique across the entire adventure
- [ ] `badChoice.label` shares nouns with the scene description
- [ ] `badChoice.consequence` is specific and teaches a lesson (not generic)
- [ ] `badChoice.coinCost` is set (standard: 3)
- [ ] `badChoice.flagSet` sets a meaningful story flag
- [ ] `initialFacts.metNPCs` uses correct NPC names from `keyNPCs`
- [ ] `initialFacts.established` captures key plot points from this scene
- [ ] `content` has ≥ 2 items, each with discovery text ≥ 30 chars
- [ ] `locationKeywords.banned` lists locations NOT yet reachable
- [ ] `locationKeywords.valid` lists locations that ARE reachable
- [ ] Run `node tests/audit-manifest.js` and confirm 0 failures
