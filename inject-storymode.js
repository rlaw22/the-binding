/**
 * inject-storymode.js — Adds storyMode fields to all scene manifests
 * Run: node inject-storymode.js
 */
const fs = require('fs');
const path = require('path');

const BASE = __dirname;

// ─── THREAT SCENE MAPPING ────────────────────────────────────────
const THREAT_MAP = {
  dracula: {
    2: 'dr_wolves', 3: 'dr_wolves_ambush', 6: 'dr_sisters',
    8: 'dr_escape', 13: 'dr_ship_dead', 14: 'dr_storm_landing',
    17: 'dr_szgany', 23: 'dr_final_boss'
  },
  frankenstein: {
    4: 'fr_creation_1', 5: 'fr_creation_2', 6: 'fr_creation_3',
    13: 'fr_de_lacey', 15: 'fr_confrontation', 18: 'fr_clerval',
    20: 'fr_wedding'
  },
  holmes: {
    7: 'ho_howl', 9: 'ho_selden', 12: 'ho_mire',
    16: 'ho_hound', 17: 'ho_chase', 18: 'ho_kill',
    19: 'ho_lair'
  }
};

// ─── COLLECTIBLE ITEMS PER ADVENTURE ─────────────────────────────
const COLLECTIBLES = {
  dracula: [
    { id: 'silver_crucifix', label: 'Silver Crucifix' },
    { id: 'garlic_braid', label: 'Garlic Braid' },
    { id: 'stake', label: 'Wooden Stake' },
    { id: 'harkers_journal', label: "Harker's Journal" },
    { id: 'holy_water', label: 'Holy Water' },
    { id: 'wolf_bane', label: 'Wolfsbane' },
    { id: 'mirror_shard', label: 'Silver Mirror Shard' },
    { id: 'dagger', label: 'Silver Dagger' },
    { id: 'rope_coil', label: 'Rope Coil' },
    { id: 'tepid_pass', label: 'Tepid Pass Note' },
    { id: 'ship_log', label: "Captain's Log" },
    { id: 'coat', label: 'Heavy Fur Coat' },
    { id: 'crossbow', label: 'Crossbow' },
    { id: 'map_romania', label: 'Map of Romania' },
    { id: 'bellarmines', label: 'Earth-filled Bellarmines' },
    { id: 'wild_rose', label: 'Wild Rose' },
    { id: 'revolver', label: 'Revolver' },
    { id: 'pouch_gold', label: 'Pouch of Gold' },
    { id: 'ancient_key', label: 'Ancient Iron Key' },
    { id: 'blood_vial', label: 'Vial of Blood' },
    { id: 'torch', label: 'Burning Torch' },
    { id: 'escape_plan', label: 'Escape Route Map' },
    { id: 'boat_hook', label: 'Boat Hook' },
    { id: 'stakes_bundle', label: 'Bundle of Stakes' },
    { id: 'draculas_ring', label: "Dracula's Ring" }
  ],
  frankenstein: [
    { id: 'galvani_treatise', label: "Galvani's Treatise" },
    { id: 'copper_wire', label: 'Copper Wire' },
    { id: 'leyden_jar', label: 'Leyden Jar' },
    { id: 'anatomy_book', label: 'Anatomy Textbook' },
    { id: 'ether_vial', label: 'Ether Vial' },
    { id: 'bone_saw', label: 'Bone Saw' },
    { id: 'specimen_jar', label: 'Specimen Jar' },
    { id: 'forceps', label: 'Steel Forceps' },
    { id: 'notebook', label: 'Lab Notebook' },
    { id: 'fire_starter', label: 'Fire Starter' },
    { id: 'flask_oil', label: 'Flask of Oil' },
    { id: 'compass', label: 'Magnetic Compass' },
    { id: 'letter_from_victor', label: "Victor's Letter" },
    { id: 'clerval_journal', label: "Clerval's Journal" },
    { id: 'village_pass', label: 'Village Pass' },
    { id: 'warm_cloak', label: 'Warm Cloak' },
    { id: 'pistol', label: 'Pistol' },
    { id: 'laboratory_key', label: 'Laboratory Key' },
    { id: 'whetstone', label: 'Whetstone' },
    { id: 'flintlock', label: 'Flintlock' },
    { id: 'sledge', label: 'Dog Sledge' },
    { id: 'blankets', label: 'Warm Blankets' },
    { id: 'marriage_medallion', label: 'Marriage Medallion' },
    { id: 'sailor_spyglass', label: "Sailor's Spyglass" },
    { id: 'final_letter', label: "Elizabeth's Letter" }
  ],
  holmes: [
    { id: 'magnifying_glass', label: 'Magnifying Glass' },
    { id: 'tobacco_pouch', label: 'Tobacco Pouch' },
    { id: 'baker_street_note', label: 'Baker Street Note' },
    { id: 'walking_stick', label: 'Walking Stick' },
    { id: 'gloves', label: 'Leather Gloves' },
    { id: 'cipher_wheel', label: 'Cipher Wheel' },
    { id: 'powder_sample', label: 'Powder Sample' },
    { id: 'photograph', label: 'Old Photograph' },
    { id: 'moor_map', label: 'Map of the Moor' },
    { id: 'bell_pull', label: 'Bell Pull Fragment' },
    { id: 'mortar_round', label: 'Mortar Round' },
    { id: 'opium_pipe', label: 'Opium Pipe' },
    { id: 'telegram', label: 'Urgent Telegram' },
    { id: 'bloodhound_ink', label: 'Bloodhound Ink Print' },
    { id: 'dirk', label: 'Stolen Dirk' },
    { id: 'whistle', label: 'Signal Whistle' },
    { id: 'handkerchief', label: 'Stained Handkerchief' },
    { id: 'revolver_holmes', label: 'Service Revolver' },
    { id: 'fog_lamp', label: 'Fog Lamp' },
    { id: 'tarot_card', label: 'Death Tarot Card' },
    { id: 'gasogene', label: 'Pocket Gasogene' },
    { id: 'scotland_yard_badge', label: 'Scotland Yard Badge' },
    { id: 'chisel', label: 'Cold Chisel' },
    { id: 'luminol', label: 'Luminol Solution' },
    { id: 'devils_foot_powder', label: "Devil's Foot Powder" }
  ]
};

// BAD_CHOICE_TEMPLATES — per adventure, arrays of bad choice objects
const BAD_CHOICE_TEMPLATES = {
  dracula: [
    { id: 'open_coffin', label: 'Open the coffin', consequence: 'A pale hand shoots out and grabs your wrist', coinCost: 3, flagSet: { opened_coffin_early: true } },
    { id: 'ignore_warnings', label: 'Ignore the villagers\' warnings', consequence: 'The road ahead is blocked by wolves', coinCost: 3, flagSet: { ignored_locals: true } },
    { id: 'take_shortcut', label: 'Take the dark shortcut', consequence: 'You stumble into a nest of rats', coinCost: 3, flagSet: { took_dark_path: true } },
    { id: 'read_aloud', label: 'Read the strange text aloud', consequence: 'The words summon a shadowy presence', coinCost: 3, flagSet: { invoked_darkness: true } },
    { id: 'touch_artifact', label: 'Touch the ancient artifact', consequence: 'A cold numbness spreads through your hand', coinCost: 3, flagSet: { touched_cursed_item: true } },
    { id: 'trust_stranger', label: 'Trust the cloaked stranger', consequence: 'The stranger vanishes with your coin purse', coinCost: 3, flagSet: { trusted_deceiver: true } },
    { id: 'explore_alone', label: 'Explore the wing alone', consequence: 'A door slams shut behind you', coinCost: 3, flagSet: { separated_from_group: true } },
    { id: 'drink_offered', label: 'Drink the offered wine', consequence: 'Your vision blurs and your limbs grow heavy', coinCost: 3, flagSet: { drank_suspicious_wine: true } }
  ],
  frankenstein: [
    { id: 'enter_lab', label: 'Enter the forbidden laboratory', consequence: 'The door locks behind you with a click', coinCost: 3, flagSet: { entered_forbidden_lab: true } },
    { id: 'take_notes', label: 'Take Victor\'s private notes', consequence: 'The pages crumble to dust in your hands', coinCost: 3, flagSet: { stole_research: true } },
    { id: 'approach_creature', label: 'Approach the creature directly', consequence: 'It recoils and smashes a nearby table', coinCost: 3, flagSet: { provoked_creature: true } },
    { id: 'light_torch', label: 'Light a torch in the cave', consequence: 'The smoke reveals how small the exit really is', coinCost: 3, flagSet: { revealed_location: true } },
    { id: 'confront_victor', label: 'Confront Victor angrily', consequence: 'He locks himself in his study and refuses to help', coinCost: 3, flagSet: { alienated_victor: true } },
    { id: 'follow_tracks', label: 'Follow the tracks into the storm', consequence: 'Lightning strikes a tree nearby, blocking your path', coinCost: 3, flagSet: { followed_into_storm: true } },
    { id: 'search_graveyard', label: 'Search the graveyard at night', consequence: 'You disturb something that should have stayed buried', coinCost: 3, flagSet: { disturbed_graves: true } },
    { id: 'accept_help', label: 'Accept help from the suspicious villager', consequence: 'They lead you into an ambush', coinCost: 3, flagSet: { accepted_trap: true } }
  ],
  holmes: [
    { id: 'reveal_clue', label: 'Reveal your clue to the suspect', consequence: 'They destroy the evidence before you can act', coinCost: 3, flagSet: { revealed_evidence: true } },
    { id: 'ignore_watson', label: 'Ignore Watson\'s warning', consequence: 'You walk straight into a trap', coinCost: 3, flagSet: { ignored_partner: true } },
    { id: 'take_bribe', label: 'Accept the offered bribe', consequence: 'Lestrade gives you a suspicious look', coinCost: 3, flagSet: { accepted_bribe: true } },
    { id: 'rush_in', label: 'Rush in without a plan', consequence: 'The suspect escapes through the back', coinCost: 3, flagSet: { acted_recklessly: true } },
    { id: 'trust_alibi', label: 'Trust the alibi without checking', consequence: 'The alibi crumbles under scrutiny later', coinCost: 3, flagSet: { trusted_false_alibi: true } },
    { id: 'search_without_warrant', label: 'Search without proper authority', consequence: 'Evidence found is inadmissible', coinCost: 3, flagSet: { illegal_search: true } },
    { id: 'confront_alone', label: 'Confront the criminal alone', consequence: 'They pull a weapon on you', coinCost: 3, flagSet: { confronted_unprepared: true } },
    { id: 'dismiss_witness', label: 'Dismiss the key witness', consequence: 'They leave London and cannot be found', coinCost: 3, flagSet: { lost_witness: true } }
  ]
};

// HEALING_SCENES — scene numbers with rest/recovery per adventure
const HEALING_SCENES = {
  dracula: [3, 8, 14, 22, 31, 40, 48, 55],
  frankenstein: [2, 7, 12, 19, 26, 33, 41, 49],
  holmes: [1, 6, 11, 17, 24, 30, 38, 45, 52]
};

// Main transformation function
function injectStoryMode() {
  const fs = require('fs');
  const path = require('path');
  
  // Define all manifest files
  const manifestFiles = [
    'manifests-act1.js', 'manifests-act2.js', 'manifests-act3.js', 'manifests-act4.js', 'manifests-act5.js',
    'manifests-frankenstein-act1.js', 'manifests-frankenstein-act2.js', 'manifests-frankenstein-act3.js', 'manifests-frankenstein-act4.js', 'manifests-frankenstein-act5.js',
    'manifests-holmes-act1.js', 'manifests-holmes-act2.js', 'manifests-holmes-act3.js', 'manifests-holmes-act4.js', 'manifests-holmes-act5.js'
  ];
  
  let totalScenes = 0;
  let processedScenes = 0;
  
  manifestFiles.forEach(filename => {
    const filePath = path.join(__dirname, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${filename} — file not found`);
      return;
    }
    
    // Determine adventure from filename
    let adventure;
    if (filename.includes('frankenstein')) {
      adventure = 'frankenstein';
    } else if (filename.includes('holmes')) {
      adventure = 'holmes';
    } else {
      adventure = 'dracula';
    }
    
    // Load the manifest
    let manifest;
    try {
      manifest = require(filePath);
    } catch (err) {
      console.error(`Error loading ${filename}:`, err.message);
      return;
    }
    
    // Process each scene
    Object.keys(manifest).forEach(sceneKey => {
      totalScenes++;
      const scene = manifest[sceneKey];
      
      // Extract scene number from key (e.g., 'scene_00' -> 0)
      const sceneNum = parseInt(sceneKey.replace('scene_', ''), 10);
      
      // Look up threat in THREAT_MAP
      const threatEntry = THREAT_MAP[adventure]?.[sceneNum];
      
      // Pick a collectible (cycle through array)
      const collectibles = COLLECTIBLES[adventure];
      const collectibleItem = collectibles[sceneNum % collectibles.length];
      
      // Pick a bad choice template (cycle through array)
      const badChoices = BAD_CHOICE_TEMPLATES[adventure];
      const badChoice = badChoices[sceneNum % badChoices.length];
      
      // Check if healing scene
      const isHealing = HEALING_SCENES[adventure]?.includes(sceneNum) || false;
      
      // Build storyMode object
      const storyMode = {
        collectibleItem,
        badChoice,
        isHealing,
        explorePriority: []
      };
      
      // Add threat if applicable
      if (threatEntry) {
        storyMode.threat = threatEntry;
      }
      
      // Build explorePriority from first 3 content IDs
      if (scene.content && Array.isArray(scene.content)) {
        storyMode.explorePriority = scene.content.slice(0, 3).map(item => item.id);
      }
      
      // Assign storyMode to scene
      scene.storyMode = storyMode;
      processedScenes++;
    });
    
    // Write the modified manifest back
    try {
      let manifestStr = JSON.stringify(manifest, null, 2);
      // Replace the module.exports prefix
      manifestStr = `module.exports = ${manifestStr};\n`;
      fs.writeFileSync(filePath, manifestStr, 'utf8');
      console.log(`Processed ${filename} — ${Object.keys(manifest).length} scenes`);
    } catch (err) {
      console.error(`Error writing ${filename}:`, err.message);
    }
  });
  
  return { totalScenes, processedScenes };
}

// Runner — process all files and report counts
if (require.main === module) {
  console.log('Starting storyMode injection...');
  const result = injectStoryMode();
  console.log(`\nDone! Processed ${result.processedScenes} of ${result.totalScenes} total scenes.`);
}
