/**
 * Continuity Validator — Catches illogical narrative flows before they reach the player.
 *
 * Three layers:
 *   1. FACT TRACKER   — accumulates established facts (items, NPCs met, location)
 *   2. CONTRADICTION  — blocks responses that contradict established facts
 *   3. RELEVANCE      — warns when a response ignores what the player actually did
 *
 * Works for ANY adventure — facts come from scene manifests, not hardcoded per story.
 *
 * Usage:
 *   const validator = createValidator(sceneManifest, openingNarration);
 *   const result = validator.validate(dmResponse, playerAction);
 *   if (!result.valid) { re-pick or regenerate }
 */

/**
 * Create a continuity validator for the current scene.
 *
 * @param {object} manifest — scene manifest with optional `initialFacts`
 * @param {string} openingNarration — the text the player has already seen (for fact extraction)
 */
function createValidator(manifest, openingNarration) {
  // The accumulated facts — what the player has, where they are, who they've met
  const facts = {
    location: manifest ? manifest.sceneName : 'unknown',
    sceneId: manifest ? manifest.sceneId : 'unknown',
    items: [],           // items the player currently has
    metNPCs: [],         // NPCs the player has interacted with
    establishedEvents: [], // narrative events that already happened
    usedResponseKeys: new Set() // track which mock responses have been shown
  };

  // Load initial facts from the manifest
  if (manifest && manifest.initialFacts) {
    const init = manifest.initialFacts;
    if (init.items) facts.items.push(...init.items);
    if (init.metNPCs) facts.metNPCs.push(...init.metNPCs);
    if (init.established) facts.establishedEvents.push(...init.established);
  }

  // Extract facts from the opening narration (the player has already seen this)
  if (openingNarration) {
    extractFactsFromText(openingNarration, facts);
  }

  /**
   * Validate a DM response against established facts.
   *
   * @param {string} dmResponse — the DM's narrative text
   * @param {string} playerAction — what the player actually did/said
   * @returns {{ valid: boolean, violations: string[], warnings: string[], facts: object }}
   */
  function validate(dmResponse, playerAction) {
    const violations = [];  // blocks — response contradicts established facts
    const warnings = [];    // soft — response may be irrelevant or redundant

    if (!dmResponse) {
      return { valid: true, violations, warnings, facts };
    }

    const responseLower = dmResponse.toLowerCase();

    // === LAYER 1: DUPLICATE ITEM DETECTION ===
    // If the response gives the player an item they already have, flag it.
    const givePatterns = [
      /(?:he|she|they|the \w+)?\s*(?:push|press|hand|give|offer|place|set)\w*\s+(?:a |the |your )?(.+?)(?:\s+(?:across|toward|into|over|to|on)\b)/gi,
      /(?:take this|for you|for protection|you will need)[^.]*?([\w\s]+(?:crucifix|cross|letter|journal|key|dagger|sword|map|book|ring|amulet))/gi,
      /(?:receives?|obtains?|gains?|picks? up)\s+(?:a |the )?(.+?)(?:\.|,)/gi
    ];

    for (const pattern of givePatterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(dmResponse)) !== null) {
        const givenItem = match[1] ? match[1].trim().toLowerCase() : '';
        if (givenItem.length > 2 && givenItem.length < 50) {
          // Check if this item was already established
          for (const existingItem of facts.items) {
            if (givenItem.includes(existingItem) || existingItem.includes(givenItem)) {
              violations.push(`DUPLICATE_ITEM: Response gives "${givenItem}" but player already has "${existingItem}"`);
            }
          }
        }
      }
    }

    // === LAYER 2: LOCATION CONTINUITY ===
    // If the response describes a location that doesn't match the current scene, flag it.
    // Only check if we have a scene manifest with location keywords.
    if (manifest && manifest.locationKeywords) {
      const wrongLocations = manifest.locationKeywords.banned || [];
      for (const loc of wrongLocations) {
        if (responseLower.includes(loc.toLowerCase())) {
          violations.push(`LOCATION_JUMP: Response references "${loc}" but player is in "${facts.location}"`);
        }
      }
    }

    // === LAYER 3: ACTION RELEVANCE ===
    // Check if the response relates to what the player actually did.
    // This is a SOFT check — warnings only, not blocking.
    if (playerAction && playerAction.length > 3) {
      const actionWords = playerAction.toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !['about', 'with', 'that', 'this', 'from', 'they', 'them', 'their', 'have', 'will', 'would', 'could', 'should'].includes(w));

      // If the response doesn't contain ANY of the player's action keywords,
      // it might be ignoring what they asked for.
      const responseHasActionContext = actionWords.some(w => responseLower.includes(w));
      if (!responseHasActionContext && actionWords.length >= 2) {
        warnings.push(`RELEVANCE: Response may not address player action "${playerAction.substring(0, 60)}"`);
      }
    }

    // === UPDATE FACTS from the response ===
    extractFactsFromText(dmResponse, facts);

    return {
      valid: violations.length === 0,
      violations,
      warnings,
      facts: { ...facts }
    };
  }

  /**
   * Mark a response key as used (for mock LLM deduplication).
   */
  function markUsed(key) {
    facts.usedResponseKeys.add(key);
  }

  /**
   * Get the current facts state.
   */
  function getFacts() {
    return { ...facts };
  }

  /**
   * Update facts after a scene transition.
   */
  function transitionTo(newManifest, openingNarration) {
    facts.location = newManifest ? newManifest.sceneName : 'unknown';
    facts.sceneId = newManifest ? newManifest.sceneId : 'unknown';
    // Don't clear items — player carries them across scenes
    // Don't clear metNPCs — they remember who they've met
    facts.usedResponseKeys.clear();

    if (newManifest && newManifest.initialFacts) {
      const init = newManifest.initialFacts;
      if (init.items) {
        for (const item of init.items) {
          if (!facts.items.includes(item)) facts.items.push(item);
        }
      }
      if (init.metNPCs) {
        for (const npc of init.metNPCs) {
          if (!facts.metNPCs.includes(npc)) facts.metNPCs.push(npc);
        }
      }
    }

    if (openingNarration) {
      extractFactsFromText(openingNarration, facts);
    }
  }

  /**
   * Accumulate facts from new narrative text (e.g., after a player action).
   * Convenience wrapper around extractFactsFromText.
   */
  function accumulate(text) {
    extractFactsFromText(text, facts);
  }

  const api = { validate, markUsed, getFacts, transitionTo, accumulate };
  // Expose facts directly for easy access
  Object.defineProperty(api, 'facts', { get: () => facts, enumerable: true });
  return api;
}

/**
 * Extract facts from a narrative text.
 * Looks for item transfers, NPC interactions, and narrative events.
 */
function extractFactsFromText(text, facts) {
  if (!text) return;

  const lower = text.toLowerCase();

  // Extract items given/received
  const itemPatterns = [
    /(?:gives?|hands?|press|push|offer)\w*\s+(?:you\s+)?(?:a |the |your |his |her )?([\w\s]+?)(?:\s*[,.\n]|\s+(?:across|toward|to you|for protection|for you))/gi,
    /(?:take this|for protection|you will need)[^.]*?["']?([^"'.\n]+?)(?:["']|\.)/gi,
    /(?:a small|an old|the|your|his|her)\s+(crucifix|cross|letter|journal|key|dagger|sword|map|book|ring|amulet|shawl|cup|bowl|stew)/gi,
    /(?:receive|obtain|gain|pick up|find|discover)\w*\s+(?:a |the )?(\w+(?:\s+\w+)?)(?:\s+(?:from|on|in|with|at|by|for|to|into|onto|under|over|near|behind|beside|toward|through)\b|\s*[,.])/gi
  ];

  for (const pattern of itemPatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const item = match[1] ? match[1].trim().toLowerCase() : '';
      if (item.length > 2 && item.length < 40 && !facts.items.includes(item)) {
        // Filter out common false positives
        const falsePositives = ['the room', 'the door', 'the wall', 'the fire', 'the night', 'the air', 'the road', 'the way'];
        if (!falsePositives.some(fp => item.includes(fp))) {
          facts.items.push(item);
        }
      }
    }
  }

  // Extract NPC interactions
  const npcPatterns = [
    /(?:the |a |an )?(innkeeper|count|dracula|van helsing|mina|lucy|renfield|seward|coachman|driver|priest|woman|man|sister|bride)s?\s+(?:says?|speaks?|whispers?|leans?|looks?|nods?|smiles?|laughs?|crosses?|pushes?|sets?|glances?|watches?|notices?)/gi,
    /(?:says?|speaks?|whispers?|replies?|answers?)\s+(?:the |a )?(innkeeper|count|dracula|van helsing|mina|lucy|renfield|seward|coachman|driver)/gi
  ];

  for (const pattern of npcPatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const npc = match[1] ? match[1].trim().toLowerCase() : '';
      if (npc.length > 2 && !facts.metNPCs.includes(npc)) {
        facts.metNPCs.push(npc);
      }
    }
  }

  // Extract key narrative events (first sentence of key moments)
  const eventPatterns = [
    /(?:you |the player )?(?:arrive|enter|find|discover|learn|hear|see|notice|realize|watch|witness)s?\b[^.]*/gi
  ];

  for (const pattern of eventPatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const event = match[0] ? match[0].trim().substring(0, 100) : '';
      if (event.length > 10) {
        facts.establishedEvents.push(event);
        // Keep bounded
        if (facts.establishedEvents.length > 30) {
          facts.establishedEvents.shift();
        }
      }
    }
  }
}

module.exports = {
  createValidator,
  extractFactsFromText
};
