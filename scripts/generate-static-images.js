/**
 * generate-static-images.js — One-time static image generator
 *
 * Generates all scene images and NPC portraits for every adventure
 * and saves them as PNG files under public/assets/images/<adventureId>/
 *
 * Run manually: node scripts/generate-static-images.js
 *              node scripts/generate-static-images.js --adventure dracula
 *              node scripts/generate-static-images.js --force  (regenerate even if exists)
 *
 * Once generated, commit the images to the repo. The server will serve them
 * as static files — zero generation cost at runtime.
 *
 * Filename convention:
 *   scene_<NN>_<mood>.png   — scene variant (e.g. scene_00_dread.png)
 *   portrait_<name>.png     — NPC portrait (e.g. portrait_dracula.png)
 */

'use strict';

const path = require('path');
const fs = require('fs');

const { buildScenePrompt, buildNPCPortraitPrompt } = require('../src/image/prompt-builder');

// ---------------------------------------------------------------------------
// Moods — same as SCENE_VARIANTS in pregenerate-images.js
// ---------------------------------------------------------------------------

const MOODS = ['dread', 'mystery', 'eerie'];

const MOOD_DETAILS = {
  dread:   'Variant A — suffocating darkness',
  mystery: 'Variant B — swirling fog and half-seen shapes',
  eerie:   'Variant C — unnatural stillness and distorted shadows',
};

// ---------------------------------------------------------------------------
// Adventure scene definitions (shared with pregenerate-images.js)
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
  },
  frankenstein: {
    scenes: [
      { id: 'scene_00', location: 'Geneva — The Frankenstein Home', description: 'A grand house on the shore of Lake Geneva. The laboratory is cold, filled with glass jars and brass instruments. Lightning flickers beyond tall windows.' },
      { id: 'scene_01', location: 'The University of Ingolstadt', description: 'A dim lecture hall smelling of formaldehyde. Anatomy tables line the walls. Professor Waldman speaks of the secret of life.' },
      { id: 'scene_02', location: 'The Laboratory', description: 'A garret laboratory lit by oil lamps and lightning. Jars of organs, copper wires, glass rods, a slab where something lies under a sheet.' },
      { id: 'scene_03', location: 'The Creation', description: 'The creature opens its eyes. Yellow skin stretches over muscle and bone. Black lips pull back from white teeth. Rain hammers the windows.' },
      { id: 'scene_04', location: 'The Forest', description: 'A dark forest outside Ingolstadt. Frost on dead leaves. The creature has fled into the trees. Footprints in the mud lead deeper into shadow.' },
      { id: 'scene_05', location: 'The De Lacey Cottage', description: 'A humble cottage at the edge of a wood. An old blind man plays a violin. The creature watches from a crack in the wall.' },
      { id: 'scene_06', location: 'The Arctic', description: 'Ice stretches to the horizon. The ship is locked in pack ice. A figure approaches across the frozen waste — vast, misshapen, alone.' },
    ],
    characters: {
      creature: 'A towering figure, eight feet tall. Yellow skin pulled tight over muscle. Black hair, white teeth, watery eyes. Beautiful and terrible.',
      victor: 'A young scientist. Gaunt, wild-eyed, dark circles under his eyes. Hands trembling. The look of a man haunted by what he has created.',
      elizabeth: 'A young woman with auburn hair and grey-green eyes. Gentle, intelligent, radiant. The embodiment of everything Victor stands to lose.',
    },
  },
  holmes: {
    scenes: [
      { id: 'scene_00', location: '221B Baker Street', description: 'A cluttered sitting room. Persian slipper stuffed with tobacco, violin on the mantelpiece, bullet holes in the wall plastered with VR monograms.' },
      { id: 'scene_01', location: 'Dartmoor', description: 'Grimpen Moor stretches bleak and boggy under a grey sky. The Great Grimpen Mire swallows everything. Fog pools in hollows.' },
      { id: 'scene_02', location: 'Baskerville Hall', description: 'A great grey house of granite. Long windows stare like eyes. The yew alley stretches into darkness. A portrait of Hugo Baskerville hangs in the hall.' },
      { id: 'scene_03', location: 'The Grimpen Mire', description: 'Quaking bog. Tufts of grass float on brown water. One misstep means death. The mire bubbles and sighs.' },
      { id: 'scene_04', location: 'The London Fog', description: 'Gas lamps halo in yellow fog. Hansoms splash through rain. A narrow alley off the Strand. A door with a red lamp.' },
    ],
    characters: {
      holmes: 'A tall thin man with hawk-like features, sharp grey eyes, a deerstalker cap, and an Inverness cape. Smoking a curved pipe.',
      watson: 'A solid, reliable man with a moustache. Medical bag, military bearing, warm eyes.',
      stapleton: 'Jack Stapleton. A charming naturalist. Lean, tanned, carrying a butterfly net. Warm smile that does not reach his eyes.',
    },
  },
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const adventureArg = args.find(a => !a.startsWith('--'));
  const force = args.includes('--force');

  const adventures = adventureArg ? [adventureArg] : Object.keys(ADVENTURE_SCENES);

  // Detect API key
  const apiKey = process.env.OPENAI_API_KEY || process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error('❌ No API key found. Set OPENAI_API_KEY or XAI_API_KEY.');
    process.exit(1);
  }

  // Create image service
  const { createImageService } = require('../src/image');
  const imageService = createImageService({ cacheDir: process.env.IMAGE_CACHE_DIR || 'data/images' });
  if (!imageService || !imageService.isEnabled) {
    console.error('❌ Image service failed to initialize. Check your API key.');
    process.exit(1);
  }

  const outputBase = path.join(__dirname, '..', 'public', 'assets', 'images');

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const advId of adventures) {
    const adventure = ADVENTURE_SCENES[advId];
    if (!adventure) {
      console.log(`⚠️  Unknown adventure: ${advId}`);
      continue;
    }

    const outputDir = path.join(outputBase, advId);
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`\n🖼️  ${advId.toUpperCase()}`);
    console.log(`   Output: ${outputDir}`);

    // Generate scene variants
    for (const scene of adventure.scenes) {
      for (const mood of MOODS) {
        const filename = `${scene.id}_${mood}.png`;
        const filepath = path.join(outputDir, filename);

        if (fs.existsSync(filepath) && !force) {
          totalSkipped++;
          continue;
        }

        try {
          const prompt = buildScenePrompt({
            description: scene.description,
            location: scene.location,
            mood: mood,
            details: [MOOD_DETAILS[mood]],
          });

          // Generate via the image service (uses provider API + persistent store)
          const url = await imageService.generateRaw(prompt);
          if (!url) throw new Error('No URL returned');

          // Download and save to static asset path
          const imageData = await downloadImage(url);
          fs.writeFileSync(filepath, imageData);

          totalGenerated++;
          console.log(`   ✅ ${filename}`);
        } catch (err) {
          totalFailed++;
          console.error(`   ❌ ${filename}: ${err.message}`);
        }

        // Rate limit: 1 second between API calls
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Generate NPC portraits
    for (const [name, appearance] of Object.entries(adventure.characters)) {
      const filename = `portrait_${name}.png`;
      const filepath = path.join(outputDir, filename);

      if (fs.existsSync(filepath) && !force) {
        totalSkipped++;
        continue;
      }

      try {
        const prompt = buildNPCPortraitPrompt({ name, appearance, mood: 'dread' });
        const url = await imageService.generateRaw(prompt);
        if (!url) throw new Error('No URL returned');

        const imageData = await downloadImage(url);
        fs.writeFileSync(filepath, imageData);

        totalGenerated++;
        console.log(`   ✅ ${filename}`);
      } catch (err) {
        totalFailed++;
        console.error(`   ❌ ${filename}: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n🖼️  Done: ${totalGenerated} generated, ${totalSkipped} skipped, ${totalFailed} failed`);
  console.log(`   Images saved to public/assets/images/ — commit them to the repo!`);
}

/**
 * Download an image from a URL and return the buffer.
 */
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const transport = url.startsWith('https') ? require('https') : require('http');
    transport.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
