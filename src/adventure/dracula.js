/**
 * Dracula Adventure — Curated Scene Graph (Layer 1 Backbone)
 * 
 * 25 scenes forming the curated backbone. Scenes are connected by edges.
 * The AI DM handles transitions, procedural content (Layer 2), and surface variation (Layer 3).
 * 
 * Story structure: 5 acts, faithful to Bram Stoker's Dracula.
 */

const DraculaAdventure = {
  id: 'dracula',
  name: 'Dracula',
  author: 'Bram Stoker',
  description: 'The classic tale of terror. Arrive in the Carpathian mountains, uncover the dark secret of Castle Dracula, and race across Europe to stop an ancient evil from spreading to the world.',
  tone: 'gothic, suspenseful, mysterious, with moments of desperate action',
  setting: 'Transylvania and England, 1893',
  difficulty: 'medium',
  estimatedLength: '8-12 hours',
  totalScenes: 25,

  // Coin pool config
  coinPoolConfig: {
    totalScenes: 25,
    difficulty: 'medium',
    adventureId: 'dracula'
  },

  // Key NPCs for the AI DM
  keyNPCs: [
    { id: 'dracula', name: 'Count Dracula', role: 'Antagonist', description: 'An ancient vampire lord. Charismatic, terrifying, and ruthlessly intelligent. He is seeking to spread his dark influence to England.' },
    { id: 'van_helsing', name: 'Abraham Van Helsing', role: 'Ally', description: 'A Dutch doctor and vampire hunter. Brilliant, eccentric, and deeply knowledgeable about the occult. He becomes the player\'s mentor.' },
    { id: 'mina', name: 'Mina Murray', role: 'Ally', description: 'A intelligent, resourceful young woman. She becomes central to the plot as Dracula targets her.' },
    { id: 'lucy', name: 'Lucy Westenra', role: 'Ally (in danger)', description: 'Mina\'s vivacious friend. She falls under Dracula\'s influence and becomes a victim.' },
    { id: 'renfield', name: 'R.M. Renfield', role: 'Complex', description: 'An asylum patient who worships Dracula. He eats flies and spiders, believing he absorbs their life force. Sometimes helpful, sometimes dangerous.' },
    { id: 'jonathan', name: 'Jonathan Harker', role: 'Ally', description: 'A young solicitor who traveled to Castle Dracula and barely escaped. His journal contains crucial information.' },
    { id: 'seward', name: 'Dr. John Seward', role: 'Ally', description: 'Runs the asylum near Carfax. Lucy\'s suitor. Provides medical knowledge and access to Renfield.' },
    { id: 'innkeeper', name: 'The Golden Krone Innkeeper', role: 'Minor', description: 'A worried innkeeper in Bistritz who tries to warn the player about Castle Dracula.' },
    { id: 'driver', name: 'The Coachman', role: 'Mysterious', description: 'A mysterious figure who drives the coach to Castle Dracula through the night. May not be entirely human.' }
  ],

  // Act structure for the adventure outline
  acts: [
    { id: 'act1', name: 'The Journey', scenes: [0, 1, 2, 3, 4], summary: 'Travel through Transylvania, arrive at Castle Dracula, meet the Count.' },
    { id: 'act2', name: 'The Castle', scenes: [5, 6, 7, 8, 9], summary: 'Explore the castle, discover Dracula\'s nature, escape.' },
    { id: 'act3', name: 'The Horror Spreads', scenes: [10, 11, 12, 13, 14], summary: 'Dracula arrives in England. Lucy falls ill. Investigate and gather allies.' },
    { id: 'act4', name: 'The Hunt', scenes: [15, 16, 17, 18, 19], summary: 'Track Dracula across London. Confront his agents. Save Mina.' },
    { id: 'act5', name: 'The Final Battle', scenes: [20, 21, 22, 23, 24], summary: 'Chase Dracula back to Transylvania. Final confrontation at Castle Dracula.' }
  ],

  // Scene manifests — discoverable content per scene for the scene engine
  sceneManifests: {
    scene_00: {
      sceneId: 'scene_00',
      sceneName: 'The Golden Krone Inn',
      // D&D-style scene description — the DM narrates this BEFORE showing any actions.
      // Every element mentioned here can become a suggested action.
      description: `The Golden Krone Inn is warm and dim, lit by a crackling fireplace against the far wall. Wooden benches line the walls around rough-hewn tables. A long bar runs along the back, where a stout innkeeper stands wringing his hands. The air smells of pine smoke and old ale.

In the far corner, partially hidden in shadow, you notice an old woman sitting alone — nursing a cup of something dark. She hasn't looked up.

Near the fireplace, a folded shawl lies discarded on one of the benches. A small brass crucifix sits heavy in your palm — the innkeeper pressed it into your hands the moment you mentioned Castle Dracula.

Through a back window, you can see the stable yard. A nervous horse stamps in its stall. The coach has not yet arrived — but the innkeeper says it will come at sundown.

The innkeeper watches you with a mixture of pity and alarm. "Surely you do not mean to go there tonight?" he says. "The castle is far, and the roads... the roads are not safe after dark."`,
      content: [
        { id: 'talk_innkeeper', label: 'Ask the innkeeper about Castle Dracula', keywords: ['innkeeper', 'ask', 'tell', 'dracula', 'castle', 'speak', 'talk'] },
        { id: 'examine_crucifix', label: 'Examine the brass crucifix', keywords: ['crucifix', 'cross', 'examine', 'inspect', 'hold', 'brass'] },
        { id: 'find_old_woman', label: 'Approach the old woman in the corner', keywords: ['approach', 'woman', 'corner', 'old', 'talk', 'speak'], discovery: 'You approach the old woman slowly. Her eyes snap up — sharp, knowing, afraid. She whispers something you can\'t hear, then looks away quickly. Her hands tremble around her cup.' },
        { id: 'check_stables', label: 'Look out the back window at the stable yard', keywords: ['stable', 'stables', 'window', 'coach', 'horse', 'yard', 'outside', 'back'] },
        { id: 'read_letter', label: 'Search the bench near the fireplace where the shawl lies', keywords: ['search', 'bench', 'benches', 'fire', 'shawl', 'letter', 'hidden', 'under', 'near'], discovery: 'You lift the folded shawl on the bench near the fire. Beneath it, a letter. The handwriting is hurried, desperate: "To whoever finds this — do NOT travel to the Borgo Pass after dark. The wolves are not natural. The coachman is not what he seems. God have mercy on Jonathan Harker\'s soul." The letter is dated three months ago. The ink is smeared, as if the writer\'s hands were shaking.' }
      ],
      exitAction: 'board_coach',
      exitLabel: 'Board the coach for Castle Dracula',
      hardExitNarration: 'The innkeeper locks the front door and blows out the last candle. "Your coach awaits, traveler. I pray you return from that place." He ushers you outside into the cold night air.',
      initialFacts: {
        items: ['crucifix'],
        metNPCs: ['innkeeper'],
        established: ['arrived at the Golden Krone Inn in Bistritz', 'evening, last light fading', 'coach will arrive soon']
      },
      locationKeywords: {
        banned: ['great hall', 'castle dracula', 'dining hall', 'carfax abbey', 'london', 'transylvania']
      }
    },
    scene_01: {
      sceneId: 'scene_01',
      sceneName: 'The Coach Ride',
      content: [
        { id: 'talk_driver', label: 'Try to speak with the silent coachman', keywords: ['driver', 'coachman', 'speak', 'talk', 'silent', 'address'] },
        { id: 'watch_landscape', label: 'Watch the dark forest pass by the window', keywords: ['forest', 'window', 'outside', 'look', 'watch', 'trees', 'landscape'] },
        { id: 'notice_wolves', label: 'Listen to the wolves howling in the distance', keywords: ['wolf', 'wolves', 'howl', 'hear', 'listen', 'distant'] },
        { id: 'examine_crucifix_coach', label: 'Clutch the crucifix for comfort', keywords: ['crucifix', 'cross', 'hold', 'clutch', 'comfort', 'pray'] }
      ],
      exitAction: 'arrive_crossroads',
      exitLabel: 'Step out at the crossroads',
      hardExitNarration: 'The coach lurches to a stop. The driver gestures wordlessly toward a second coach waiting in the moonlight. You have no choice but to transfer.',
      initialFacts: {
        items: ['crucifix'],
        metNPCs: ['innkeeper', 'driver'],
        established: ['left the inn', 'riding in a coach at night', 'other passengers present (a priest, two women)']
      },
      locationKeywords: {
        banned: ['great hall', 'castle dracula', 'dining hall', 'carfax abbey', 'london']
      }
    },
    scene_02: {
      sceneId: 'scene_02',
      sceneName: 'The Borgo Pass',
      content: [
        { id: 'observe_coachman', label: 'Study the mysterious new coachman', keywords: ['coachman', 'driver', 'new', 'study', 'watch', 'observe', 'mysterious'] },
        { id: 'watch_wolves', label: 'Watch the wolves that follow the coach', keywords: ['wolf', 'wolves', 'follow', 'surround', 'watch', 'grey'] },
        { id: 'feel_speed', label: 'Grip the seat as the coach races through the dark', keywords: ['fast', 'speed', 'race', 'grip', 'seat', 'racing'] },
        { id: 'notice_eyes', label: 'Peer into the forest and see pairs of glowing eyes', keywords: ['eyes', 'forest', 'glow', 'peer', 'glowing', 'pairs'] }
      ],
      exitAction: 'arrive_castle',
      exitLabel: 'Look up as the castle comes into view',
      hardExitNarration: 'The coach crashes to a halt at the base of a towering cliff. Above you, Castle Dracula looms against the lightning-split sky. The coachman opens the door with a thin smile.',
      initialFacts: {
        items: ['crucifix'],
        metNPCs: ['innkeeper', 'driver', 'dracula'],
        established: ['transferred coaches at Borgo Pass', 'new coachman is Dracula in disguise', 'wolves surround the coach']
      },
      locationKeywords: {
        banned: ['great hall', 'dining hall', 'carfax abbey', 'london', 'the inn', 'bistritz']
      }
    },
    scene_03: {
      sceneId: 'scene_03',
      sceneName: 'Castle Dracula — Arrival',
      content: [
        { id: 'examine_castle', label: 'Study the castle exterior', keywords: ['castle', 'exterior', 'stone', 'look', 'study', 'outside', 'ancient'] },
        { id: 'meet_dracula', label: 'Greet the Count as he welcomes you', keywords: ['count', 'dracula', 'greet', 'welcome', 'english', 'meet', 'man'] },
        { id: 'notice_no_reflection', label: 'Look for a mirror and find none', keywords: ['mirror', 'reflection', 'glass', 'look', 'find', 'absent'] },
        { id: 'enter_great_hall', label: 'Step into the vast, candlelit great hall', keywords: ['hall', 'great', 'enter', 'step', 'candlelit', 'vast', 'door'] }
      ],
      exitAction: 'go_to_dinner',
      exitLabel: 'Follow the Count to the dining hall',
      hardExitNarration: 'The Count extends a pale hand toward a corridor. "You must be famished from your journey. Please — dinner awaits." His tone makes it clear this is not a request.',
      initialFacts: {
        items: ['crucifix'],
        metNPCs: ['innkeeper', 'dracula'],
        established: ['arrived at Castle Dracula', 'the castle is magnificent and terrible', 'no mirrors anywhere', 'Dracula speaks perfect English']
      },
      locationKeywords: {
        banned: ['the inn', 'bistritz', 'coach ride', 'carfax abbey', 'london']
      }
    },
    scene_04: {
      sceneId: 'scene_04',
      sceneName: 'Dinner with the Count',
      content: [
        { id: 'ask_about_england', label: 'Ask the Count about his interest in England', keywords: ['england', 'ask', 'interest', 'count', 'why'] },
        { id: 'notice_no_food', label: 'Notice that no food is set before you', keywords: ['food', 'plate', 'meal', 'notice', 'empty', 'eat'] },
        { id: 'compliment_wine', label: 'Sip the deep red wine and compliment it', keywords: ['wine', 'drink', 'sip', 'compliment', 'red', 'taste'] },
        { id: 'test_dracula', label: 'Mention local legends and watch his reaction', keywords: ['legend', 'local', 'mention', 'watch', 'reaction', 'test'] }
      ],
      exitAction: 'retire_to_room',
      exitLabel: 'Excuse yourself to retire for the night',
      hardExitNarration: 'The Count rises abruptly. "The hour grows late, and you have had a long journey. I shall show you to your chambers." His eyes glitter in the candlelight as he leads you away.',
      initialFacts: {
        items: ['crucifix'],
        metNPCs: ['innkeeper', 'dracula'],
        established: ['dining with the Count', 'no food served for the player', 'deep red wine offered', 'Dracula is interested in England']
      },
      locationKeywords: {
        banned: ['the inn', 'bistritz', 'coach ride', 'carfax abbey', 'london', 'the forbidden wing']
      }
    }
  },

  // Scene definitions — the curated backbone
  scenes: [
    // ACT 1: THE JOURNEY
    {
      id: 'scene_00',
      act: 'act1',
      name: 'The Golden Krone Inn',
      summary: 'The player arrives at an inn in Bistritz on the eve of their journey to Castle Dracula. The innkeeper is nervous and warns against traveling to the castle.',
      npcs: ['innkeeper'],
      flags_set: ['arrived_bistritz'],
      flags_required: [],
      isEntrypoint: true,
      dmGuidance: 'Set the mood: isolation, superstition, unease. The innkeeper should try to dissuade the player from continuing. Give the player a sense of mounting dread. The innkeeper can offer a crucifix as protection.'
    },
    {
      id: 'scene_01',
      act: 'act1',
      name: 'The Coach Ride',
      summary: 'A night coach ride through the Carpathian mountains. Strange lights, wolves, and a mysterious coachman. The player arrives at a crossroads where another coach waits.',
      npcs: ['driver'],
      flags_set: ['on_road_to_castle'],
      flags_required: ['arrived_bistritz'],
      dmGuidance: 'Build tension through atmosphere. The coachman is eerily silent. Wolves howl. St. Elmo\'s fire dances on the horses. Other passengers make the sign of the cross and whisper warnings. The player should feel they are crossing a threshold.'
    },
    {
      id: 'scene_02',
      act: 'act1',
      name: 'The Borgo Pass',
      summary: 'At the crossroads, the player transfers to a second coach driven by Count Dracula himself (disguised). The ride through the dark forest is terrifying — wolves surround the coach.',
      npcs: ['dracula'],
      flags_set: ['met_dracula_disguised', 'reached_borgo_pass'],
      flags_required: ['on_road_to_castle'],
      dmGuidance: 'The coachman is Dracula but the player doesn\'t know yet. He commands the wolves with unnatural authority. The ride is fast, dangerous, exhilarating. The player should feel both fear and awe.'
    },
    {
      id: 'scene_03',
      act: 'act1',
      name: 'Castle Dracula — Arrival',
      summary: 'The coach arrives at Castle Dracula. The player sees a vast, dark fortress perched on a cliff. The coachman (Dracula) opens the door and welcomes them in warm, perfect English.',
      npcs: ['dracula'],
      flags_set: ['arrived_castle'],
      flags_required: ['reached_borgo_pass'],
      dmGuidance: 'The castle should feel both magnificent and terrible. Dracula reveals himself as the host — charming, gracious, and slightly unsettling. He speaks perfect English and is an impeccable host. The player should feel welcomed and uneasy at the same time.'
    },
    {
      id: 'scene_04',
      act: 'act1',
      name: 'Dinner with the Count',
      summary: 'Dracula hosts the player for dinner. He asks probing questions about England, about the player\'s journey, about their knowledge of local legends. He is charming but there are disturbing moments.',
      npcs: ['dracula'],
      flags_set: ['dined_with_dracula', 'dracula_knows_player'],
      flags_required: ['arrived_castle'],
      dmGuidance: 'This is a social encounter. Dracula is testing the player. He is brilliant, charismatic, and subtly manipulative. No food is served for the player (only Dracula). Mirrors are absent. Dracula is interested in England — this is his real goal. Reward clever social play.'
    },

    // ACT 2: THE CASTLE
    {
      id: 'scene_05',
      act: 'act2',
      name: 'The Forbidden Wing',
      summary: 'The player explores the castle while Dracula sleeps during the day. They discover a locked wing and must find a way in. Inside: ancient coffins filled with earth.',
      npcs: [],
      flags_set: ['found_coffins', 'explored_castle'],
      flags_required: ['dined_with_dracula'],
      dmGuidance: 'Exploration and investigation scene. The castle is full of secrets — old paintings, crumbling passages, strange sounds. The locked wing is the key discovery. Finding the coffins is a major revelation. Reward thorough exploration.'
    },
    {
      id: 'scene_06',
      act: 'act2',
      name: 'The Three Sisters',
      summary: 'At night, the player is approached by three beautiful, terrifying vampire women. They try to seduce and attack the player. Dracula intervenes — but not to help the player.',
      npcs: ['dracula'],
      flags_set: ['met_vampire_sisters', 'survived_sisters'],
      flags_required: ['found_coffins'],
      dmGuidance: 'Combat + social encounter. The sisters are seductive and deadly. This is a dangerous fight — the player may need to flee. Dracula\'s intervention reveals his true nature: he is their master. The player should feel genuinely threatened.'
    },
    {
      id: 'scene_07',
      act: 'act2',
      name: 'Jonathan\'s Journal',
      summary: 'The player finds Jonathan Harker\'s journal hidden in the castle. It contains crucial information about Dracula: his weaknesses (sunlight, garlic, crucifixes), his plans to move to England, and a map of his properties.',
      npcs: [],
      flags_set: ['has_jonathan_journal', 'knows_dracula_weaknesses'],
      flags_required: ['met_vampire_sisters'],
      dmGuidance: 'Investigation and lore scene. The journal is a critical plot item. Give the player key information that will be useful later: Dracula\'s weaknesses, his plan, his English properties (Carfax Abbey). Reward thorough reading.'
    },
    {
      id: 'scene_08',
      act: 'act2',
      name: 'Escape from the Castle',
      summary: 'The player must escape Castle Dracula before nightfall. Climbing down the castle walls, navigating the courtyard, and fleeing into the Carpathian mountains with wolves in pursuit.',
      npcs: [],
      flags_set: ['escaped_castle'],
      flags_required: ['has_jonathan_journal'],
      dmGuidance: 'Action and survival scene. The player is racing against time — Dracula will wake at sunset. Make it tense: climbing checks, stealth, then a desperate run. The player should feel they barely made it.'
    },
    {
      id: 'scene_09',
      act: 'act2',
      name: 'The Wilderness',
      summary: 'The player flees through the Carpathian wilderness. Lost, cold, hunted by wolves. They must survive until they reach a monastery or village. Recuperation and reflection on what they learned.',
      npcs: [],
      flags_set: ['reached_safety'],
      flags_required: ['escaped_castle'],
      dmGuidance: 'Survival scene. The player is exhausted and scared. This is a quieter moment to process what happened at the castle. They can reflect on what they learned and plan their next move. A chance for roleplay.'
    },

    // ACT 3: THE HORROR SPREADS
    {
      id: 'scene_10',
      act: 'act3',
      name: 'London — Van Helsing',
      summary: 'The player arrives in London and seeks out Professor Van Helsing, armed with Jonathan\'s journal. Van Helsing confirms the vampire threat and becomes an ally.',
      npcs: ['van_helsing'],
      flags_set: ['met_van_helsing', 'in_london'],
      flags_required: ['reached_safety'],
      dmGuidance: 'Social and exposition scene. Van Helsing is brilliant, eccentric, and deeply concerned. He validates the player\'s experience and provides expert knowledge. He introduces the idea that Dracula is already in England. This is where the player gains their most important ally.'
    },
    {
      id: 'scene_11',
      act: 'act3',
      name: 'Lucy\'s Illness',
      summary: 'The player learns that Lucy Westenra has been falling ill — pale, weak, with mysterious bite marks on her neck. Dr. Seward is treating her but is baffled.',
      npcs: ['lucy', 'seward'],
      flags_set: ['knows_lucy_ill', 'met_seward'],
      flags_required: ['met_van_helsing'],
      dmGuidance: 'Mystery and horror scene. Lucy is visibly declining. Seward is desperate. Van Helsing suspects the truth but doesn\'t say it yet. The player should investigate: examine Lucy, check her room, look for signs of supernatural activity.'
    },
    {
      id: 'scene_12',
      act: 'act3',
      name: 'Renfield\'s Warning',
      summary: 'The player visits the asylum to speak with Renfield. He is erratic but knows things — he can sense Dracula\'s presence and warns that "the Master is coming."',
      npcs: ['renfield', 'seward'],
      flags_set: ['spoke_to_renfield'],
      flags_required: ['knows_lucy_ill'],
      dmGuidance: 'Creepy social encounter. Renfield is insane but not stupid. He alternates between lucid conversation and madness. He eats flies. He knows Dracula is near. He might give useful information if treated with respect. Reward creative social approaches.'
    },
    {
      id: 'scene_13',
      act: 'act3',
      name: 'The Night Watch',
      summary: 'The player and Van Helsing guard Lucy\'s room at night. They witness Dracula (in bat form) trying to enter. They fight him off but Lucy is further weakened.',
      npcs: ['van_helsing', 'lucy', 'dracula'],
      flags_set: ['fought_dracula_london', 'guarded_lucy'],
      flags_required: ['spoke_to_renfield'],
      dmGuidance: 'Combat encounter. Dracula attacks as a swarm of bats or as a shadowy figure. The player must protect Lucy while fighting a supernatural enemy. Van Helsing assists with garlic and crucifixes. Dracula retreats but is not defeated. Lucy is worse.'
    },
    {
      id: 'scene_14',
      act: 'act3',
      name: 'Lucy\'s Death',
      summary: 'Despite their efforts, Lucy dies. But she doesn\'t stay dead — she rises as a vampire. Van Helsing must convince the heartbroken Seward and the player that they must destroy her.',
      npcs: ['van_helsing', 'seward', 'lucy'],
      flags_set: ['lucy_undead', 'confronted_undead_lucy'],
      flags_required: ['guarded_lucy'],
      dmGuidance: 'Emotional and moral horror scene. Lucy\'s death and resurrection is tragic. Van Helsing is gentle but firm. Seward is devastated. The player must make a moral choice: destroy the undead Lucy or try to save her? There is no saving her. This should be gut-wrenching.'
    },

    // ACT 4: THE HUNT
    {
      id: 'scene_15',
      act: 'act4',
      name: 'Lucy\'s Crypt',
      summary: 'The player and allies confront undead Lucy in her tomb. They must perform the ritual to free her soul — staking, decapitation, garlic. A horrifying but necessary act.',
      npcs: ['van_helsing', 'seward'],
      flags_set: ['freed_lucy', 'lucy_at_peace'],
      flags_required: ['confronted_undead_lucy'],
      dmGuidance: 'Dark ritual scene. This is not a combat — it\'s a mercy. Lucy begs and pleads but the player must be strong. Van Helsing guides the ritual. The player should feel the weight of what they\'re doing. Afterward, Lucy is at peace and thanks them.'
    },
    {
      id: 'scene_16',
      act: 'act4',
      name: 'Mina in Danger',
      summary: 'Mina reveals that Dracula has been visiting her. She has bite marks. The player realizes Dracula is creating a new vampire bride. They must act fast.',
      npcs: ['mina', 'van_helsing'],
      flags_set: ['mina_targeted', 'racing_clock'],
      flags_required: ['freed_lucy'],
      dmGuidance: 'Urgency scene. Mina is scared but brave. She shows them the bite marks. Van Helsing is horrified — this is worse than Lucy because Dracula is using Mina as a link to the group. The player must plan a counter-attack. Time is running out.'
    },
    {
      id: 'scene_17',
      act: 'act4',
      name: 'Carfax Abbey',
      summary: 'The player leads an assault on Dracula\'s London base — Carfax Abbey. They must find and destroy his earth boxes (coffins filled with Transylvanian soil) to weaken him.',
      npcs: ['van_helsing'],
      flags_set: ['destroyed_earth_boxes', 'raided_carfax'],
      flags_required: ['mina_targeted'],
      dmGuidance: 'Dungeon crawl / exploration scene. Carfax Abbey is dark, decrepit, and dangerous. Dracula\'s human servants (Szgany) guard it. There are earth boxes to find and destroy. Combat with servants, investigation to find all the boxes, and the constant threat of Dracula returning.'
    },
    {
      id: 'scene_18',
      act: 'act4',
      name: 'Dracula\'s Counter-Attack',
      summary: 'Dracula strikes back. He attacks the group directly, using his powers to create a storm, send his wolves, and assault their safe house. Mina is taken.',
      npcs: ['dracula', 'mina', 'van_helsing'],
      flags_set: ['mina_taken', 'dracula_retreated'],
      flags_required: ['destroyed_earth_boxes'],
      dmGuidance: 'Major combat encounter. Dracula at full power is terrifying. He controls the weather, summons wolves, and is supernaturally strong. The player cannot defeat him here — they can only survive and protect the others. Mina is taken. This is the darkest moment.'
    },
    {
      id: 'scene_19',
      act: 'act4',
      name: 'The Blood Bond',
      summary: 'Van Helsing discovers that Dracula has forced Mina to drink his blood, creating a psychic bond. Mina can sense Dracula\'s location but is slowly transforming. She begs the player to stop Dracula before it\'s too late.',
      npcs: ['mina', 'van_helsing'],
      flags_set: ['mina_blood_bond', 'can_track_dracula'],
      flags_required: ['mina_taken'],
      dmGuidance: 'Emotional scene. Mina is both victim and asset — she can track Dracula but is dying. She is brave and selfless, asking the player to use her to find him. Van Helsing uses a communion wafer to mark her forehead (it burns) to slow the transformation. The clock is ticking.'
    },

    // ACT 5: THE FINAL BATTLE
    {
      id: 'scene_20',
      act: 'act5',
      name: 'The Chase Begins',
      summary: 'Using Mina\'s bond, the group tracks Dracula fleeing England by ship. They must arrange passage and pursue him across Europe back to Transylvania.',
      npcs: ['van_helsing'],
      flags_set: ['pursuing_dracula'],
      flags_required: ['mina_blood_bond'],
      dmGuidance: 'Travel and planning scene. The race is on. The player must organize the pursuit — book passage, gather supplies, plan strategy. Van Helsing is decisive. This is a montage-style scene with key decision points.'
    },
    {
      id: 'scene_21',
      act: 'act5',
      name: 'The Carpathian Mountains',
      summary: 'The group arrives in Transylvania and must traverse the mountains to reach Castle Dracula. Dracula\'s Szgany servants try to stop them. Mina grows weaker.',
      npcs: ['van_helsing', 'mina'],
      flags_set: ['in_transylvania'],
      flags_required: ['pursuing_dracula'],
      dmGuidance: 'Travel + combat scene. The Szgany are human enemies — dangerous but not supernatural. The mountains are harsh. Mina is fading. The player must balance speed against safety. Every hour matters.'
    },
    {
      id: 'scene_22',
      act: 'act5',
      name: 'The Castle Revisited',
      summary: 'The group reaches Castle Dracula again. This time it\'s different — decayed, ruined, crawling with Dracula\'s servants. They must fight their way to Dracula\'s inner sanctum.',
      npcs: ['van_helsing', 'dracula'],
      flags_set: ['at_castle_final'],
      flags_required: ['in_transylvania'],
      dmGuidance: 'Dungeon crawl / combat scene. The castle is a ruin compared to the player\'s first visit. The vampire sisters are here. Szgany guards everywhere. The player must use everything they\'ve learned to get through. This is the gauntlet before the boss.'
    },
    {
      id: 'scene_23',
      act: 'act5',
      name: 'The Three Sisters — Final Battle',
      summary: 'The player must defeat Dracula\'s three vampire brides in the castle\'s great hall while Van Helsing protects Mina. A desperate fight.',
      npcs: ['van_helsing'],
      flags_set: ['defeated_sisters'],
      flags_required: ['at_castle_final'],
      dmGuidance: 'Major combat encounter. Three vampire enemies at once. The player has Van Helsing as an ally but the sisters are powerful. This is the skill test before the final boss. Use everything the player has learned about fighting vampires.'
    },
    {
      id: 'scene_24',
      act: 'act5',
      name: 'Dracula\'s End',
      summary: 'The final confrontation with Count Dracula in his coffin room. He is at full power, desperate, and dangerous. The player must use all their knowledge, allies, and courage to destroy him once and for all.',
      npcs: ['dracula', 'mina', 'van_helsing'],
      flags_set: ['dracula_destroyed', 'adventure_complete'],
      flags_required: ['defeated_sisters'],
      isFinal: true,
      dmGuidance: 'The final boss fight. Dracula is ancient, powerful, and fighting for his existence. He will use every trick — transformation, hypnosis, brute force. The player should use everything they\'ve gathered: crucifixes, garlic, knowledge of his weaknesses, their allies. The kill requires a combination of staking and sunlight or decapitation. After Dracula falls, Mina is freed from the blood bond. The adventure ends with the sun rising over Castle Dracula.'
    }
  ],

  // Starting conditions
  startScene: 'scene_00',

  // Adventure-level summary for the AI DM context
  adventureSummary: 'The player travels to Castle Dracula in Transylvania, discovers the Count is a vampire, barely escapes, pursues him to England, gathers allies (Van Helsing, Seward, Mina), witnesses Dracula\'s horror spreading (Lucy\'s death), and ultimately chases him back to Transylvania for a final confrontation. Themes: gothic horror, good vs. evil, sacrifice, the power of knowledge and courage.'
};

/**
 * Get a scene by ID.
 */
function getScene(sceneId) {
  return DraculaAdventure.scenes.find(s => s.id === sceneId) || null;
}

/**
 * Get the starting scene.
 */
function getStartScene() {
  return getScene(DraculaAdventure.startScene);
}

/**
 * Get available next scenes from current scene.
 */
function getNextScenes(currentSceneId) {
  const current = getScene(currentSceneId);
  if (!current) return [];
  // Scenes are ordered; next scene is available if flags are met
  const currentIndex = DraculaAdventure.scenes.findIndex(s => s.id === currentSceneId);
  if (currentIndex < 0 || currentIndex >= DraculaAdventure.scenes.length - 1) return [];
  const next = DraculaAdventure.scenes[currentIndex + 1];
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
  return DraculaAdventure.acts.map(act =>
    `${act.name} (Scenes ${act.scenes[0]+1}-${act.scenes[act.scenes.length-1]+1}): ${act.summary}`
  ).join('\n');
}

module.exports = {
  DraculaAdventure,
  getScene,
  getStartScene,
  getNextScenes,
  getDMGuidance,
  getAdventureOutline
};
