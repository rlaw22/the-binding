/**
 * Holmes Adventure — Curated Scene Graph (Layer 1 Backbone)
 * 
 * 25 scenes forming the curated backbone. Scenes are connected by edges.
 * The AI DM handles transitions, procedural content (Layer 2), and surface variation (Layer 3).
 * 
 * Story structure: 5 acts, faithful to Arthur Conan Doyle's The Hound of the Baskervilles.
 */

// Scene manifests loaded from per-act files for maintainability
const Act1Manifests = require('../../manifests-holmes-act1');
const Act2Manifests = require('../../manifests-holmes-act2');
const Act3Manifests = require('../../manifests-holmes-act3');
const Act4Manifests = require('../../manifests-holmes-act4');
const Act5Manifests = require('../../manifests-holmes-act5');

const HolmesAdventure = {
  id: 'holmes',
  name: 'The Hound of the Baskervilles',
  author: 'Arthur Conan Doyle',
  description: 'The greatest detective story ever told. Accompany Sherlock Holmes and Dr. Watson to the desolate wilds of Dartmoor, where an ancient curse stalks the Baskerville line and a phantom hound haunts the fog-shrouded mire.',
  tone: 'atmospheric, suspenseful, intellectual, Victorian gothic — with moments of dry wit and creeping dread',
  setting: 'London and Dartmoor, Devonshire, 1889',
  difficulty: 'medium',
  estimatedLength: '8-12 hours',
  totalScenes: 25,

  // Coin pool config
  coinPoolConfig: {
    totalScenes: 25,
    difficulty: 'medium',
    adventureId: 'holmes'
  },

  // Key NPCs for the AI DM
  keyNPCs: [
    { id: 'holmes', name: 'Sherlock Holmes', role: 'Ally', description: 'The world\'s foremost consulting detective. Brilliant, eccentric, and utterly relentless. He disdains sentiment but is fiercely loyal to those he trusts. His methods are observation, deduction, and cold logic — but he is not immune to the atmosphere of the moor.' },
    { id: 'watson', name: 'Dr. John Watson', role: 'Ally (companion)', description: 'Holmes\'s faithful friend and chronicler. A former army surgeon with a steady nerve, a warm heart, and a keen eye for detail. He is the player\'s closest companion throughout the case — brave, practical, and unflinchingly loyal.' },
    { id: 'stapleton', name: 'Jack Stapleton', role: 'Antagonist', description: 'A naturalist and neighbour on the moor. Charming, educated, and seemingly harmless — he collects butterflies and speaks with easy warmth. But beneath the surface lies a cold, patient, ruthless intelligence. He is a Baskerville heir, and he will kill to claim the fortune.' },
    { id: 'beryl', name: 'Beryl Stapleton', role: 'Complex (victim/ally)', description: 'Introduced as Stapleton\'s sister, she is in fact his wife — a prisoner of his will, forced to play a role. She has a conscience and tries to warn Sir Henry, but she lives in terror of Stapleton. Her courage in the face of fear is one of the story\'s quiet triumphs.' },
    { id: 'sir_henry', name: 'Sir Henry Baskerville', role: 'Ally (in danger)', description: 'The last of the Baskervilles. A compact, well-built man from Canada with a direct manner and a stubborn courage. He is the target — the last obstacle between Stapleton and the Baskerville fortune. He is brave, but the moor tests him to his limits.' },
    { id: 'barrymore', name: 'Barrymore', role: 'Complex', description: 'The butler of Baskerville Hall. Tall, gaunt, and immaculate in black, he is a man of rigid propriety harbouring a painful secret: his wife is Selden\'s sister, and he has been signalling to the escaped convict on the moor out of family loyalty.' },
    { id: 'mortimer', name: 'Dr. James Mortimer', role: 'Ally', description: 'A country doctor and friend of the late Sir Charles Baskerville. A man of science who is troubled by what he cannot explain. He brings the case to Holmes and serves as the bridge between the rational world of London and the ancient, unsettling world of Dartmoor.' },
    { id: 'selden', name: 'Selden', role: 'Minor (danger)', description: 'The Notting Hill murderer, escaped from Dartmoor Prison. Mrs. Barrymore\'s younger brother. He is living rough on the moor, fed and sheltered by the Barrymores. He is terrified of something on the moor — something worse than the law.' },
    { id: 'laura_lyons', name: 'Laura Lyons', role: 'Complex', description: 'A typist in the village of Grimpen, daughter of the litigious Frankland. Stapleton seduced her with promises of marriage and used her to lure Sir Charles to the gate on the night of his death. She is a victim of Stapleton\'s manipulation, not a willing accomplice.' },
    { id: 'lestrade', name: 'Inspector Lestrade', role: 'Ally', description: 'Of Scotland Yard. A dogged, unimaginative policeman whom Holmes respects for his tenacity if not his brilliance. He arrives for the climactic ambush on the moor, armed and ready.' }
  ],

  // Act structure for the adventure outline
  acts: [
    { id: 'act1', name: 'The Problem', scenes: [0, 1, 2, 3, 4], summary: 'Baker Street: Dr. Mortimer brings the Baskerville manuscript, Sir Henry arrives, the boot is stolen, and Watson departs for Dartmoor.' },
    { id: 'act2', name: 'The Moor', scenes: [5, 6, 7, 8, 9], summary: 'Baskerville Hall: the Barrymores\' secret, the howl at night, the Stapletons, and the escaped convict Selden.' },
    { id: 'act3', name: 'The Investigation', scenes: [10, 11, 12, 13, 14], summary: 'Holmes revealed on the moor. The Grimpen Mire, Laura Lyons\'s confession, and the portrait that proves Stapleton\'s identity.' },
    { id: 'act4', name: 'The Hunt', scenes: [15, 16, 17, 18, 19], summary: 'The trap is set. The hound appears. The chase across the moor. The kill. Stapleton\'s lair and Beryl\'s rescue.' },
    { id: 'act5', name: 'The Resolution', scenes: [20, 21, 22, 23, 24], summary: 'Stapleton\'s end in the Mire. The Baskerville legacy explained. Beryl freed. Return to London. The fireside at Baker Street.' }
  ],

  // Scene manifests — discoverable content per scene for the scene engine
  sceneManifests: {},

  // Scene definitions — the curated backbone
  scenes: [
    // ACT 1: THE PROBLEM
    {
      id: 'scene_00',
      act: 'act1',
      name: '221B Baker Street',
      summary: 'Dr. Mortimer arrives at Baker Street to consult Holmes about the Baskerville curse. He brings a walking stick and an ancient manuscript.',
      npcs: ['holmes', 'watson', 'mortimer'],
      flags_set: ['mortimer_arrived', 'case_introduced'],
      flags_required: [],
      isEntrypoint: true,
      dmGuidance: 'Set the mood: the familiar Baker Street sitting room, Holmes in his armchair, the fire burning. Mortimer is nervous but determined. Let the player explore the room, examine Mortimer, and notice the walking stick. The scene ends when Mortimer opens the manuscript.'
    },
    {
      id: 'scene_01',
      act: 'act1',
      name: 'The Baskerville Manuscript',
      summary: 'Mortimer reads the ancient manuscript telling the legend of Sir Hugo Baskerville and the supernatural hound. Holmes examines the document.',
      npcs: ['holmes', 'watson', 'mortimer'],
      flags_set: ['manuscript_read', 'legend_known'],
      flags_required: ['mortimer_arrived'],
      dmGuidance: 'This is an exposition scene — let Mortimer read the manuscript in full. The atmosphere should be eerie: the fire dying, the room growing still. Holmes should be intensely interested. Let the player examine the manuscript, ask about Sir Charles\'s death, and question Mortimer about the hound prints. The scene ends when Holmes declares it a "three-pipe problem."'
    },
    {
      id: 'scene_02',
      act: 'act1',
      name: 'Sir Henry Baskerville',
      summary: 'Sir Henry arrives at Baker Street. He is sceptical but uneasy. He reveals an anonymous warning letter he received at his hotel.',
      npcs: ['holmes', 'watson', 'mortimer', 'sir_henry'],
      flags_set: ['sir_henry_met', 'warning_received'],
      flags_required: ['manuscript_read'],
      dmGuidance: 'Sir Henry is direct and likeable — a colonial who finds the curse absurd but is shaken by the warning letter. Let the player observe him carefully, ask about the estate and inheritance, and examine the letter. Holmes should be intrigued by the newspaper-cutting technique. The scene ends when Holmes declares Sir Henry must not go to Dartmoor alone.'
    },
    {
      id: 'scene_03',
      act: 'act1',
      name: 'The Boot Mystery',
      summary: 'At the Northumberland Hotel, Sir Henry discovers a brown boot has been stolen from his room. Holmes investigates.',
      npcs: ['holmes', 'watson', 'sir_henry'],
      flags_set: ['boot_stolen', 'henry_surveilled'],
      flags_required: ['sir_henry_met'],
      dmGuidance: 'A classic locked-room puzzle — no forced entry, only one boot taken. Let the player search the room, question the staff, examine the door, and discuss the significance with Holmes. The boot theft is a clue: someone needs Sir Henry\'s scent for the hound. Holmes should be visibly excited. The scene ends when they return to Baker Street.'
    },
    {
      id: 'scene_04',
      act: 'act1',
      name: 'Departure for Dartmoor',
      summary: 'Holmes sends Watson to Dartmoor with Sir Henry while he remains in London to investigate the London clues. Final instructions and farewells.',
      npcs: ['holmes', 'watson', 'mortimer', 'sir_henry'],
      flags_set: ['departed_for_dartmoor', 'watson_alone'],
      flags_required: ['boot_stolen'],
      dmGuidance: 'An emotional farewell scene. Holmes is unusually serious — he senses real danger. Let the player speak privately with Holmes, check their revolver, talk to Mortimer about the moor, and say goodbye. Holmes\'s instructions are crucial: observe everything, write daily, do not go on the moor at night. The scene ends as the train pulls out of Paddington.'
    },

    // ACT 2: THE MOOR
    {
      id: 'scene_05',
      act: 'act2',
      name: 'Arrival at the Hall',
      summary: 'Watson and Sir Henry arrive at Baskerville Hall. Barrymore greets them. The Hall is ancient and imposing, lined with Baskerville portraits.',
      npcs: ['watson', 'sir_henry', 'barrymore'],
      flags_set: ['arrived_at_hall', 'barrymore_met'],
      flags_required: ['departed_for_dartmoor'],
      dmGuidance: 'Establish the atmosphere of the Hall: ancient, gloomy, oppressive. Barrymore is courteous but distant. Mrs. Barrymore watches from the shadows with red-rimmed eyes. The portraits are important — especially Hugo Baskerville\'s, which resembles someone the player will meet later. Let the player explore, examine the portraits, and notice Mrs. Barrymore\'s distress.'
    },
    {
      id: 'scene_06',
      act: 'act2',
      name: 'The Barrymores',
      summary: 'At night, Watson hears sobbing and discovers Barrymore signalling to someone on the moor with a candle.',
      npcs: ['barrymore'],
      flags_set: ['signal_discovered', 'barrymore_secret_suspected'],
      flags_required: ['arrived_at_hall'],
      dmGuidance: 'A slow-burn mystery scene. The sobbing comes first — Mrs. Barrymore, weeping. Then the candle signal. Let the player watch through the keyhole, confront Barrymore, listen to the sobbing, or look out the window. Barrymore is defensive but not hostile. He is hiding something, but it is not what the player expects.'
    },
    {
      id: 'scene_07',
      act: 'act2',
      name: 'The Moor at Night',
      summary: 'Watson ventures onto the moor at night and hears the terrible howl. Enormous paw prints are found in the peat.',
      npcs: [],
      flags_set: ['howl_heard', 'paw_prints_found'],
      flags_required: ['signal_discovered'],
      dmGuidance: 'Pure atmosphere. The fog, the silence, the darkness — and then the howl. It should be genuinely frightening. Let the player listen, search for the source, examine the ground, or retreat. The paw prints are enormous — dinner-plate sized. The smell of phosphorus should be noted. This scene establishes the supernatural threat.'
    },
    {
      id: 'scene_08',
      act: 'act2',
      name: 'The Stapletons',
      summary: 'Jack Stapleton, a naturalist, introduces himself. Beryl Stapleton warns the player to leave the moor.',
      npcs: ['stapleton', 'beryl'],
      flags_set: ['stapleton_met', 'beryl_warning'],
      flags_required: ['howl_heard'],
      dmGuidance: 'Stapleton is charming, knowledgeable, and likeable — the player should not suspect him yet. But there are clues: his resemblance to Hugo Baskerville, his flicker of interest at the howling, his firm grip on Beryl\'s arm. Beryl\'s warning ("Go back to London!") is desperate and genuine. Let the player talk to both, study Stapleton, and ask about Sir Charles.'
    },
    {
      id: 'scene_09',
      act: 'act2',
      name: 'The Escaped Convict',
      summary: 'Selden the convict has escaped from Dartmoor Prison. Watson discovers Barrymore\'s signal is for Selden — Mrs. Barrymore\'s brother.',
      npcs: ['selden', 'barrymore'],
      flags_set: ['selden_found', 'barrymore_secret_revealed'],
      flags_required: ['stapleton_met'],
      dmGuidance: 'A chase scene on the moor. Selden is terrified — not of the law, but of something else. Let the player pursue, observe, or confront Barrymore. The revelation that Selden is Mrs. Barrymore\'s brother is emotional. The key clue: enormous paw prints near Selden\'s camp. Selden fears the hound more than the gallows.'
    },

    // ACT 3: THE INVESTIGATION
    {
      id: 'scene_10',
      act: 'act3',
      name: 'The Stone Age',
      summary: 'Watson discovers Holmes hiding on the moor in disguise, living in a Bronze Age hut near the stone circle.',
      npcs: ['holmes'],
      flags_set: ['holmes_revealed', 'holmes_on_moor'],
      flags_required: ['selden_found'],
      dmGuidance: 'A wonderful reveal. The player finds a camp in an ancient hut — pipe, newspapers, biscuits — and then Holmes\'s voice behind them. Holmes is disguised as a rough labourer with walnut-stained skin. He has been watching Stapleton for days. Let the player examine the camp, recognize Holmes, and ask what he has learned.'
    },
    {
      id: 'scene_11',
      act: 'act3',
      name: 'Holmes Revealed',
      summary: 'Holmes explains his discoveries: Beryl is Stapleton\'s wife, Stapleton has a large dog hidden in the Mire, and he is likely a Baskerville heir.',
      npcs: ['holmes'],
      flags_set: ['beryl_truth_known', 'stapleton_suspected'],
      flags_required: ['holmes_revealed'],
      dmGuidance: 'Holmes talks rapidly, connecting the dots. Let the player ask about Beryl, the butterflies, the evidence, and Sir Henry\'s safety. Holmes is confident but concerned — this is a dangerous adversary. The scene ends as they walk toward the Grimpen Mire.'
    },
    {
      id: 'scene_12',
      act: 'act3',
      name: 'The Grimpen Mire',
      summary: 'Holmes leads Watson into the deadly Grimpen Mire. They find enormous paw prints, a hidden kennel, and the smell of phosphorus.',
      npcs: ['holmes'],
      flags_set: ['mire_explored', 'kennel_found'],
      flags_required: ['beryl_truth_known'],
      dmGuidance: 'The Mire is terrifying — a bog that swallows a pony before their eyes. Holmes has marked safe paths with cairns. Let the player follow the paw prints, examine the pony\'s death, study the cairns, and notice the phosphorus smell. The kennel is hidden in the centre of the Mire.'
    },
    {
      id: 'scene_13',
      act: 'act3',
      name: 'Laura Lyons',
      summary: 'Watson interviews Laura Lyons, who confesses that Stapleton used her to lure Sir Charles to the gate on the night of his death.',
      npcs: ['laura_lyons'],
      flags_set: ['laura_confession', 'murder_method_known'],
      flags_required: ['mire_explored'],
      dmGuidance: 'An emotional confession scene. Laura is guilt-ridden and exhausted. She trusted Stapleton, he promised marriage, and he used her. Let the player ask about the letter, the relationship, the night Sir Charles died, and examine her cottage. The photograph of Laura and Stapleton is a key detail.'
    },
    {
      id: 'scene_14',
      act: 'act3',
      name: 'The Picture',
      summary: 'Holmes discovers a portrait of Rodger Baskerville that proves Stapleton is a Baskerville heir. The trap is planned.',
      npcs: ['holmes', 'sir_henry'],
      flags_set: ['stapleton_identity_proven', 'trap_planned'],
      flags_required: ['laura_confession'],
      dmGuidance: 'The deduction scene. The portrait of Rodger Baskerville is the key — the resemblance to Stapleton is exact. Let the player study the portrait, ask Holmes about the plan, search the family records, and tell Sir Henry. Sir Henry is brave: "I am a Baskerville. I will not surrender it to a coward with a painted dog."'
    },

    // ACT 4: THE HUNT
    {
      id: 'scene_15',
      act: 'act4',
      name: 'The Trap is Set',
      summary: 'Holmes plans the ambush: Sir Henry will walk the moor alone as bait while Holmes, Watson, and Lestrade wait in position.',
      npcs: ['holmes', 'sir_henry'],
      flags_set: ['ambush_planned', 'lestrade_arrived'],
      flags_required: ['stapleton_identity_proven'],
      dmGuidance: 'A planning scene. Holmes is precise and military. Let the player examine the map, discuss weapons, talk privately with Sir Henry, and review the plan. Sir Henry\'s courage should be evident. The scene ends with the moor howling in the distance.'
    },
    {
      id: 'scene_16',
      act: 'act4',
      name: 'The Hound Appears',
      summary: 'At midnight on the moor, the phosphorescent hound emerges from the mist and pursues Sir Henry.',
      npcs: ['holmes', 'sir_henry'],
      flags_set: ['hound_appeared'],
      flags_required: ['ambush_planned'],
      dmGuidance: 'The most terrifying scene in the adventure. The hound is enormous, glowing, spectral — a thing of pure nightmare. Let the player watch, hold fire, see Sir Henry\'s terror, and ready their revolver. The tension should be unbearable. Holmes\'s signal — the rifle shot — is the climax.'
    },
    {
      id: 'scene_17',
      act: 'act4',
      name: 'The Chase',
      summary: 'A desperate chase across the moor as the hound closes on Sir Henry. Watson fires and wounds it.',
      npcs: ['holmes', 'sir_henry'],
      flags_set: ['hound_wounded'],
      flags_required: ['hound_appeared'],
      dmGuidance: 'Action scene. The chase is frantic — running across treacherous ground in near-total darkness. Let the player fire, chase, shout to Sir Henry, or reload. The hound is hit but keeps coming. Holmes is closing in with the rifle.'
    },
    {
      id: 'scene_18',
      act: 'act4',
      name: 'The Kill',
      summary: 'Holmes kills the hound with a single shot to the skull. It is revealed to be a real mastiff coated in phosphorus — not a supernatural creature.',
      npcs: ['holmes', 'sir_henry'],
      flags_set: ['hound_killed', 'supernatural_disproven'],
      flags_required: ['hound_wounded'],
      dmGuidance: 'The climax. Holmes\'s shot is deafening and final. The hound dies five yards from Sir Henry. Let the player examine the dead hound, check on Sir Henry, talk to Holmes, and collect phosphorus samples. The revelation: it was just a dog. A very large, very carefully prepared dog.'
    },
    {
      id: 'scene_19',
      act: 'act4',
      name: 'The Revelation',
      summary: 'Holmes and Watson find Stapleton\'s lair in the Mire — breeding records, chains, the original hound\'s skeleton. Beryl is found tied to a stake, starved.',
      npcs: ['holmes', 'beryl'],
      flags_set: ['lair_found', 'beryl_rescued'],
      flags_required: ['hound_killed'],
      dmGuidance: 'A dungeon-crawl through the Mire to the lair. The kennel is horrifying — chains, claw marks, the breeding notebook. Let the player search, read the notebook, examine the original hound\'s remains, and find Beryl. Her rescue is emotional — she has been tied up for days. Carry her to safety.'
    },

    // ACT 5: THE RESOLUTION
    {
      id: 'scene_20',
      act: 'act5',
      name: 'Stapleton\'s End',
      summary: 'At dawn, Holmes and Watson track Stapleton to the Mire. He has fallen into the bog and been swallowed. His satchel contains forged documents.',
      npcs: ['holmes'],
      flags_set: ['stapleton_dead', 'forged_documents_found'],
      flags_required: ['beryl_rescued'],
      dmGuidance: 'A sombre scene. The trail leads into the Mire and ends at a patch of treacherous bog. Stapleton went in and did not come out. Let the player listen for sounds, examine the edge, search for evidence, and reflect. The Mire has claimed him. Justice, of a sort.'
    },
    {
      id: 'scene_21',
      act: 'act5',
      name: 'The Baskerville Legacy',
      summary: 'Holmes explains the full story: Stapleton was Rodger Baskerville\'s grandson, educated at Cambridge, who spent three years planning the murders.',
      npcs: ['holmes', 'sir_henry'],
      flags_set: ['full_explanation'],
      flags_required: ['stapleton_dead'],
      dmGuidance: 'The drawing-room explanation. Holmes lays out every piece of the puzzle. Let the player ask about Stapleton\'s past, the hound breeding, Sir Charles\'s death, and the estate\'s future. Sir Henry resolves to be a different kind of Baskerville. A quiet, satisfying scene.'
    },
    {
      id: 'scene_22',
      act: 'act5',
      name: 'Beryl\'s Freedom',
      summary: 'Beryl tells her full story: she was Stapleton\'s wife, forced to play his sister. Holmes arranges passage to her sister in Edinburgh.',
      npcs: ['holmes', 'beryl'],
      flags_set: ['beryl_freed'],
      flags_required: ['full_explanation'],
      dmGuidance: 'An emotional scene. Beryl is recovering but still haunted. Let the player ask about her warning to Sir Henry, her life with Stapleton, and her plans for the future. Holmes is unusually gentle. The scene ends with Beryl weeping with relief — she is free.'
    },
    {
      id: 'scene_23',
      act: 'act5',
      name: 'Return to London',
      summary: 'Holmes and Watson take the train back to London. They discuss the case, read the newspaper report, and plan Watson\'s account.',
      npcs: ['holmes'],
      flags_set: ['returned_to_london'],
      flags_required: ['beryl_freed'],
      dmGuidance: 'A reflective travel scene. The moor recedes, the countryside softens, London returns. Let the player discuss the case with Holmes, read the newspaper, plan the write-up, and watch the countryside. Holmes is content — rare and precious. The scene ends at Paddington Station.'
    },
    {
      id: 'scene_24',
      act: 'act5',
      name: 'The Fireside',
      summary: 'Back at 221B Baker Street. The fire burns, the tea is hot, and Holmes asks: "Do you believe in curses?" The adventure closes.',
      npcs: ['holmes'],
      flags_set: ['adventure_complete'],
      flags_required: ['returned_to_london'],
      isFinal: true,
      dmGuidance: 'The final scene. Baker Street is warm and familiar — a haven after the moor. Holmes is reflective, almost philosophical. Let the player answer his question about curses, discuss the legacy, ask about new cases, and look out the window at London. Holmes picks up his violin. The adventure ends with music and firelight.'
    }
  ],

  // Starting conditions
  startScene: 'scene_00',

  // Adventure-level summary for the AI DM context
  adventureSummary: 'Dr. Mortimer brings a case to Sherlock Holmes: Sir Charles Baskerville has died under mysterious circumstances on Dartmoor, and the family legend speaks of a supernatural hound that haunts the line. Sir Henry Baskerville, the last heir, arrives from Canada. An anonymous warning letter and a stolen boot suggest someone is watching him. Holmes sends Watson to Dartmoor with Sir Henry while he investigates in London. On the moor, Watson discovers the Barrymores\' secret, hears the terrible howl, meets the Stapletons, and encounters the escaped convict Selden. Holmes reveals himself, having been hiding on the moor in disguise. Together they uncover the truth: Jack Stapleton is a Baskerville heir who has bred a phosphorescent mastiff to terrify and kill the main line. The hound is real, not supernatural. In a midnight ambush, Holmes kills the beast. Stapleton flees into the Grimpen Mire and is swallowed by the bog. Beryl Stapleton — his wife, not his sister — is rescued. The case is closed. Themes: reason vs superstition, the power of patient observation, the darkness that hides behind civilised masks, and the ancient, indifferent wildness of the moor.'
};

// Merge all per-act scene manifests into the adventure object
Object.assign(HolmesAdventure.sceneManifests,
  Act1Manifests,
  Act2Manifests,
  Act3Manifests,
  Act4Manifests,
  Act5Manifests
);

console.log(`[Holmes] Loaded ${Object.keys(HolmesAdventure.sceneManifests).length} scene manifests (acts 1-5)`);

/**
 * Get a scene by ID.
 */
function getScene(sceneId) {
  return HolmesAdventure.scenes.find(s => s.id === sceneId) || null;
}

/**
 * Get the starting scene.
 */
function getStartScene() {
  return getScene(HolmesAdventure.startScene);
}

/**
 * Get available next scenes from current scene.
 */
function getNextScenes(currentSceneId) {
  const current = getScene(currentSceneId);
  if (!current) return [];
  // Scenes are ordered; next scene is available if flags are met
  const currentIndex = HolmesAdventure.scenes.findIndex(s => s.id === currentSceneId);
  if (currentIndex < 0 || currentIndex >= HolmesAdventure.scenes.length - 1) return [];
  const next = HolmesAdventure.scenes[currentIndex + 1];
  return [next];
}

/**
 * Get scene guidance for the AI DM.
 */
function getDMGuidance(sceneId) {
  const scene = getScene(sceneId);
  return scene ? scene.dmGuidance : '';
}

/**
 * Get adventure outline for AI DM context.
 */
function getAdventureOutline() {
  return HolmesAdventure.acts.map(act =>
    `${act.name} (Scenes ${act.scenes[0]+1}-${act.scenes[act.scenes.length-1]+1}): ${act.summary}`
  ).join('\n');
}

module.exports = {
  HolmesAdventure,
  getScene,
  getStartScene,
  getNextScenes,
  getDMGuidance,
  getAdventureOutline
};
