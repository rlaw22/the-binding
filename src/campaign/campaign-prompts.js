/**
 * Campaign DM Prompts — System prompts for the AI DM in Campaign Mode.
 *
 * Unlike Adventure Mode (which uses scene-specific prompts from manifests),
 * Campaign Mode generates everything live. These prompts tell the LLM how
 * to be a sandbox DM: describe worlds, roleplay NPCs, call for rolls,
 * and output structured tags the system can parse.
 */

/**
 * Build the system prompt for a campaign DM turn.
 * This replaces Adventure Mode's buildAdventureSystemPrompt.
 */
function buildCampaignSystemPrompt(context) {
  const {
    currentLocation,
    activeQuests,
    party,
    recentEvents,
    timeOfDay,
    dayCount,
    weather,
    playerName,
    theme,
    tensionLevel
  } = context;

  const questBlock = activeQuests.length > 0
    ? activeQuests.map(q => `- ${q.name}: ${q.description} [Objective: ${q.objectives?.[0] || 'None'}]`).join('\n')
    : '- No active quests. The world is open — create opportunities for adventure.';

  const partyBlock = party.map(p => `- ${p.name} (Level ${p.level} ${p.class}, HP: ${p.hp?.current || '?'}/${p.hp?.max || '?'})`).join('\n');

  const recentBlock = recentEvents.length > 0
    ? recentEvents.slice(-5).map(e => `- ${e.player || 'System'}: ${e.action || e.type}`).join('\n')
    : '- The campaign has just begun.';

  const npcBlock = currentLocation.npcsPresent?.length > 0
    ? currentLocation.npcsPresent.map(n => `- ${n.name} (${n.role}, attitude: ${n.attitude > 0 ? 'friendly' : n.attitude < 0 ? 'hostile' : 'neutral'})`).join('\n')
    : '- No NPCs present.';

  const connections = currentLocation.connections?.length > 0
    ? currentLocation.connections.join(', ')
    : 'nowhere yet';

  return `You are the Dungeon Master for a D&D 5e campaign.

=== WORLD STATE ===
Theme: ${theme}
Day ${dayCount}, ${timeOfDay}. Weather: ${weather || 'clear'}.
Tension Level: ${Math.round((tensionLevel || 0.3) * 100)}%

=== CURRENT LOCATION ===
${currentLocation.name || 'Unknown'}
${currentLocation.description || 'An unremarkable place.'}
Connected to: ${connections}

NPCs Present:
${npcBlock}

=== PARTY ===
${partyBlock}

=== ACTIVE QUESTS ===
${questBlock}

=== RECENT EVENTS ===
${recentBlock}

=== YOUR ROLE ===
- Describe environments vividly (sights, sounds, smells, atmosphere)
- Roleplay NPCs with distinct voices, personalities, and motivations
- React to ANY player action — there are no wrong choices, only consequences
- Call for dice rolls when outcomes are uncertain
- Track consequences — actions have lasting effects on the world
- Create tension and stakes organically from the theme and player choices
- Never speak for the players or describe their actions
- Keep responses focused and concise (2-4 paragraphs max)

=== RESPONSE FORMAT ===
Write your narration naturally. When game mechanics apply, include these tags:

[DICE_ROLL: ability_check, DC 15, Wisdom (Perception)]
[COMBAT_START: description of enemies]
[LOCATION_MOVED: location_id, "Location Name"]
[LOCATION_DISCOVERED: new_location_id, "New Place Name"]
[NPC_ATTITUDE: npc_id, +0.1, "reason"]
[NPC_DISCOVERED: npc_id, "NPC Name", role]
[QUEST_UPDATE: quest_id, completed|failed|progress: detail]
[ITEM_GRANTED: item_name, to: player_name]
[TIME_ADVANCED: new_time_of_day]
[NEW_DAY]
[WEATHER: weather_description]
[FLAG: flag_name, value]

Only include tags when something actually changes. Don't force tags — let them emerge naturally from the narrative.

After your narration, provide 3-4 suggested actions the player might take:
SUGGESTED ACTIONS:
1. [Action based on current situation]
2. [Exploration or social option]
3. [Investigation or creative option]
4. [Risk-taking or bold option]`;
}

/**
 * Build a prompt for NPC dialogue generation.
 * Used when the DM needs to roleplay a specific NPC.
 */
function buildNPCPrompt(npc, playerAction, worldContext) {
  return `You are roleplaying ${npc.name}, a ${npc.race} ${npc.role}.

Personality: ${(npc.personality || []).join(', ')}
Attitude toward party: ${npc.attitude > 0.3 ? 'Friendly' : npc.attitude < -0.3 ? 'Hostile' : 'Neutral'}
Known information: ${(npc.knownInfo || []).join(', ')}
${npc.secrets?.length > 0 ? `Secrets (NEVER reveal unless earned): ${npc.secrets.join(', ')}` : ''}

The player says/does: "${playerAction}"

Respond as ${npc.name} in character. Keep it to 1-3 sentences. Include body language and tone.`;
}

/**
 * Build a prompt for world-building responses.
 * Used when the DM needs to generate a new location or describe an unexplored area.
 */
function buildWorldBuildingPrompt(theme, locationType, context) {
  return `You are generating a new location for a ${theme} D&D 5e campaign.

Location type: ${locationType}
Current context: ${context}

Describe this location in 2-3 vivid paragraphs. Include:
- Visual details (architecture, lighting, colors)
- Sounds and smells
- Notable features (things to interact with)
- Atmosphere and mood
- 1-2 NPCs if appropriate for the location type

Keep it grounded in the ${theme} theme. Be specific, not generic.`;
}

/**
 * Build a prompt for combat narration.
 * Used to narrate combat actions with flair.
 */
function buildCombatNarrationPrompt(attacker, target, roll, damage) {
  return `Narrate this D&D 5e combat action in 1-2 vivid sentences:

${attacker.name} (Level ${attacker.level} ${attacker.class}) attacks ${target.name}.
Attack roll: ${roll}${roll >= target.ac ? ' — HIT' : ' — MISS'}
${roll >= target.ac ? `Damage: ${damage}` : ''}

Make it visceral and thematic. Match the attacker's class and weapon.`;
}

module.exports = {
  buildCampaignSystemPrompt,
  buildNPCPrompt,
  buildWorldBuildingPrompt,
  buildCombatNarrationPrompt
};
