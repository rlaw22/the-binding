/**
 * pregenerate-images.js — Pre-generate all scene images for an adventure.
 *
 * Run automatically on server startup if OPENAI_API_KEY is set,
 * or manually: node scripts/pregenerate-images.js
 *
 * Generates location images from scene manifest descriptions and
 * NPC portraits from ADVENTURE_TEMPLATES. All images are cached
 * in persistent-store so they're generated once and reused forever.
 */

'use strict';

const { buildScenePrompt, buildNPCPortraitPrompt } = require('../src/image/prompt-builder');

// ---------------------------------------------------------------------------
// Adventure scene definitions (from manifests + ADVENTURE_TEMPLATES)
// ---------------------------------------------------------------------------

const ADVENTURE_SCENES = {
  dracula: {
    scenes: [
      { id: 'scene_00', location: 'The Letter from Transylvania', description: 'The offices of Hawkins & Harker are quiet this late afternoon. Gas lamps cast a warm glow over mahogany desks and legal ledgers. Outside, London fog presses against tall windows.' },
      { id: 'scene_01', location: 'The Journey East', description: 'A train carries you through the heart of Europe. The landscape grows wilder — dark forests, distant mountains, villages with wooden churches and pointed spires.' },
      { id: 'scene_02', location: 'Borgo Pass', description: 'The road climbs steeply through a gorge. Pine forests close in on both sides, and the air grows colder. The pass is shrouded in mist and shadow.' },
      { id: 'scene_03', location: 'The Carriage Ride', description: 'A carriage hurtles through the night at impossible speed. Windows are shuttered, but through cracks you see darkness and gnarled tree trunks. Wolves howl alongside.' },
      { id: 'scene_04', location: 'Castle Dracula', description: 'The castle is vast and ancient. The courtyard is paved with cracked flagstones, and walls rise on all sides like the interior of a dark well. Towers spike upward against a starless sky.' },
      { id: 'scene_05', location: 'The Forbidden Wing', description: 'The castle is silent during the day. Halls echo with nothing but footsteps and the distant crying of wind through broken shutters. A heavy door is padlocked.' },
      { id: 'scene_06', location: 'The Three Sisters', description: 'You wake in darkness. The fire has died to embers. The window is open and a cold wind carries the scent of flowers that should not bloom in winter. Three women emerge from shadow.' },
      { id: 'scene_07', location: "Jonathan's Journal", description: "In the grey light of dawn, you sit in the great hall and open Jonathan Harker's journal. The fire has been freshly laid. Ancient portraits line the walls." },
      { id: 'scene_08', location: 'Escape from the Castle', description: 'The sun is setting. You have minutes, not hours. The castle wall drops sheer to the river far below. The only way down is the crumbling outer wall.' },
      { id: 'scene_09', location: 'The Wilderness', description: 'The Carpathian wilderness is a labyrinth of frozen streams, dead trees, and mist. Snow covers everything. Distant wolves howl in the darkness.' },
      { id: 'scene_10', location: 'London — Van Helsing', description: "London is grey and wet. A narrow townhouse near the British Museum. The brass nameplate reads: PROFESSOR ABRAHAM VAN HELSING, M.D., Ph.D., D.Lit." },
      { id: 'scene_11', location: "Lucy's Illness", description: "Lucy Westenra lies in a canopied bed in a room that smells of lavender and something sweet and metallic. She is pale, with dark circles under her eyes. Two small wounds mark her throat." },
      { id: 'scene_12', location: "Renfield's Warning", description: "Dr. Seward's asylum is a grim building of red brick and iron bars. The corridors smell of carbolic soap. A patient reaches through the bars, eyes wild." },
      { id: 'scene_13', location: 'The Night Watch', description: 'The room is dark except for a single candle and moonlight through lace curtains. You sit armed with crucifixes and garlic, watching for something in the night.' },
      { id: 'scene_14', location: "Lucy's Death", description: "Three nights of watching. Lucy Westenra dies in the early morning. The room smells of death and flowers. The crucifix on the wall has fallen." },
      { id: 'scene_15', location: 'Finding Mina', description: "The rain has not stopped for three days. London's streets are rivers of filth and gaslight. A cab rattles through Whitechapel toward lodgings." },
      { id: 'scene_16', location: 'Mina in Danger', description: 'The safe house is a cramped flat above a butcher\'s shop. Garlic strings hang across the windows. The communion wafers around the cot are intact — for now.' },
      { id: 'scene_17', location: 'Carfax Abbey', description: "Dawn bleeds grey through London fog. Carfax Abbey is a great decaying husk of Norman stone and rotting timber, its chapel roof collapsed, its windows like empty eye sockets." },
      { id: 'scene_18', location: "Dracula's Counter-Attack", description: 'The shutters are blown inward and garlic strings scattered across the floor. The door hangs from its hinges. Communion wafers around the cot are blackened.' },
      { id: 'scene_19', location: 'The Blood Bond', description: "The church of St. Michael sits on a hill above Whitby, its graveyard a jagged field of tilted headstones overlooking the grey North Sea. Ancient Norman nave, Saxon tower." },
      { id: 'scene_20', location: 'The Chase Begins', description: "Dawn breaks over the London docks in bands of copper and grey. The Thames is a sheet of hammered pewter. A hundred ships stand like a winter forest." },
      { id: 'scene_21', location: 'The Carpathian Mountains', description: 'The mountains rise like the broken teeth of some buried giant. Snow clings to the peaks and passes are choked with ice and dead timber.' },
      { id: 'scene_22', location: 'The Castle Revisited', description: 'Castle Dracula stands on the cliff edge like a fist raised against God. Towers are cracked, battlements crumbled. The great iron gate hangs from a single hinge.' },
      { id: 'scene_23', location: 'The Three Sisters — Final Battle', description: 'The great hall is a cathedral of ruin. The vaulted ceiling arches overhead like the ribcage of some immense dead beast. The floor is a mosaic of broken stone.' },
      { id: 'scene_24', location: "Dracula's End", description: 'The stairs descend into the earth itself. Each step carved from living rock, worn smooth by centuries. The air grows colder, heavier, thick with the stench of old blood.' },
    ],
    characters: {
      dracula: 'An aristocratic vampire lord. Sharp features, pale skin, burning dark eyes, a thin smile showing very white teeth. Cape with a high collar.',
      van_helsing: 'A Dutch doctor and vampire hunter. Weathered face, silver hair, piercing grey eyes. Carries a bag of garlic, crucifixes, and wooden stakes.',
      mina: 'A young Victorian woman with auburn hair and intelligent eyes. Brave but frightened. A small wound on her neck.',
    },
    moods: {
      // Act-level mood mapping
      default: 'dread',
    },
  },
  // Future: frankenstein, holmes
};

// ---------------------------------------------------------------------------
// Pre-generation logic
// ---------------------------------------------------------------------------

/**
 * Pre-generate all images for an adventure.
 * @param {object} imageService — the image service instance
 * @param {string} adventureId — 'dracula', 'frankenstein', or 'holmes'
 * @returns {Promise<{generated: number, skipped: number, failed: number}>}
 */
async function pregenerateAdventureImages(imageService, adventureId) {
  const adventure = ADVENTURE_SCENES[adventureId];
  if (!adventure) {
    console.log(`  🖼️  No pre-generation data for ${adventureId}`);
    return { generated: 0, skipped: 0, failed: 0 };
  }

  if (!imageService.isEnabled) {
    console.log(`  🖼️  Image service disabled, skipping pre-generation`);
    return { generated: 0, skipped: 0, failed: 0 };
  }

  const total = adventure.scenes.length + Object.keys(adventure.characters).length;
  console.log(`  🖼️  Pre-generating ${adventureId} images: 0/${total}`);

  // Set status for API polling
  imageService._pregenStatus[adventureId] = { status: 'preparing', progress: 0, total };

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  let progress = 0;

  // Generate scene images
  for (const scene of adventure.scenes) {
    try {
      const prompt = buildScenePrompt({
        description: scene.description,
        location: scene.location,
        mood: adventure.moods.default || 'dread',
      });

      // Check if already cached
      const cached = imageService.getCachedImage(prompt);
      if (cached) {
        skipped++;
        progress++;
        imageService._pregenStatus[adventureId].progress = progress;
        continue;
      }

      await imageService.generateScene({
        description: scene.description,
        location: scene.location,
        mood: adventure.moods.default || 'dread',
      });
      generated++;
    } catch (err) {
      console.error(`  🖼️  Failed scene ${scene.location}: ${err.message}`);
      failed++;
    }
    progress++;
    imageService._pregenStatus[adventureId].progress = progress;
  }

  // Generate NPC portraits
  for (const [key, desc] of Object.entries(adventure.characters)) {
    try {
      const prompt = buildNPCPortraitPrompt({ name: key, appearance: desc, mood: 'dread' });
      const cached = imageService.getCachedImage(prompt);
      if (cached) {
        skipped++;
        progress++;
        imageService._pregenStatus[adventureId].progress = progress;
        continue;
      }

      await imageService.generateNpcPortrait({ name: key, appearance: desc, mood: 'dread' });
      generated++;
    } catch (err) {
      console.error(`  🖼️  Failed NPC ${key}: ${err.message}`);
      failed++;
    }
    progress++;
    imageService._pregenStatus[adventureId].progress = progress;
  }

  imageService._pregenStatus[adventureId].status = 'ready';
  console.log(`  🖼️  Pre-generation complete: ${generated} generated, ${skipped} cached, ${failed} failed (${total} total)`);

  return { generated, skipped, failed };
}

module.exports = {
  pregenerateAdventureImages,
  ADVENTURE_SCENES,
};
