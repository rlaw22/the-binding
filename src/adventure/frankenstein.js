/**
 * Frankenstein Adventure — Curated Scene Graph (Layer 1 Backbone)
 * 
 * 25 scenes forming the curated backbone. Scenes are connected by edges.
 * The AI DM handles transitions, procedural content (Layer 2), and surface variation (Layer 3).
 * 
 * Story structure: 5 acts, faithful to Mary Shelley's Frankenstein.
 */

// Scene manifests loaded from per-act files for maintainability
const Act1Manifests = require('../../manifests-frankenstein-act1');
const Act2Manifests = require('../../manifests-frankenstein-act2');
const Act3Manifests = require('../../manifests-frankenstein-act3');
const Act4Manifests = require('../../manifests-frankenstein-act4');
const Act5Manifests = require('../../manifests-frankenstein-act5');

const FrankensteinAdventure = {
  id: 'frankenstein',
  name: 'Frankenstein',
  author: 'Mary Shelley',
  description: 'The modern Prometheus. A young scientist, driven by ambition and grief, creates life from the dead — and unleashes a tragedy that destroys everything he loves. Follow Victor Frankenstein from the spark of inspiration to the Arctic ice, where creator and creation face each other at the end of the world.',
  tone: 'gothic, philosophical, tragic, deeply emotional — exploring the consequences of unchecked ambition and the loneliness of the outcast',
  setting: 'Geneva, Ingolstadt, the Scottish Highlands, and the Arctic — early 19th century',
  difficulty: 'hard',
  estimatedLength: '10-14 hours',
  totalScenes: 25,

  // Coin pool config
  coinPoolConfig: {
    totalScenes: 25,
    difficulty: 'hard',
    adventureId: 'frankenstein'
  },

  // Key NPCs for the AI DM
  keyNPCs: [
    { id: 'victor', name: 'Victor Frankenstein', role: 'Protagonist', description: 'A brilliant, obsessive young scientist from Geneva. Driven by grief over his mother\'s death to conquer mortality itself. His ambition leads him to create life from the dead, and the consequences destroy everyone he loves. The player experiences the story through Victor\'s eyes.' },
    { id: 'creature', name: 'The Creature', role: 'Tragic Antagonist', description: 'Eight feet tall, assembled from the dead, with yellow skin and pale blue eyes. Intelligent, eloquent, and deeply sensitive — he reads Milton, Plutarch, and Goethe. His loneliness and the world\'s rejection transform him from a gentle being into a vengeful one. He is Victor\'s greatest creation and his greatest sin.' },
    { id: 'elizabeth', name: 'Elizabeth Lavenza', role: 'Ally (in danger)', description: 'Victor\'s beloved companion since childhood. Auburn hair, grey-green eyes, a voice like poetry. She is gentle, intelligent, and fiercely loyal. She represents everything Victor stands to lose — and everything the creature intends to take.' },
    { id: 'clerval', name: 'Henry Clerval', role: 'Ally', description: 'Victor\'s dearest friend. Warm, literary, adventurous. He nurses Victor through his breakdown in Ingolstadt and remains loyal despite not understanding the full truth. His murder by the creature is one of the story\'s cruelest blows.' },
    { id: 'waldman', name: 'Professor Waldman', role: 'Mentor', description: 'A professor of chemistry at the University of Ingolstadt. Tall, silver-haired, with eyes that burn with quiet fire. He inspires Victor to pursue modern chemistry and the secret of life. His death removes the last voice of reason in Victor\'s life.' },
    { id: 'alphonse', name: 'Alphonse Frankenstein', role: 'Ally', description: 'Victor\'s father. A dignified, loving man of careful words and measured judgment. He writes letters begging Victor to come home. His grief at the loss of his children ultimately kills him — his heart stops three days after Elizabeth\'s death.' }
  ],

  // Act structure for the adventure outline
  acts: [
    { id: 'act1', name: 'The Spark', scenes: [0, 1, 2, 3, 4], summary: 'Victor\'s early life in Geneva, his fascination with natural philosophy, his time at the University of Ingolstadt, the deepening obsession, the laboratory, and the final preparations for the animation.' },
    { id: 'act2', name: 'The Creation', scenes: [5, 6, 7, 8, 9], summary: 'The creature is brought to life. Victor\'s horror and abandonment. His collapse and recovery under Clerval\'s care. The laboratory is left behind. A letter from Geneva brings devastating news — William is dead.' },
    { id: 'act3', name: 'The Creature\'s Education', scenes: [10, 11, 12, 13, 14], summary: 'The creature\'s perspective: awakening in the forest, self-education at the De Lacey cottage, the old man\'s kindness, the family\'s violent rejection, and the creature\'s bitter resolve to find his creator.' },
    { id: 'act4', name: 'The Price', scenes: [15, 16, 17, 18, 19], summary: 'The creature demands a female companion. Victor reluctantly begins work in the Orkney Islands, then destroys the female creature. The creature murders Clerval in revenge. Victor is imprisoned, acquitted, and receives Elizabeth\'s last letter before returning to Geneva.' },
    { id: 'act5', name: 'The Chase', scenes: [20, 21, 22, 23, 24], summary: 'The wedding night — the creature kills Elizabeth. Victor pursues the creature across Europe and into the Arctic. He is rescued by Captain Walton\'s ship, tells his story, and dies. The creature appears over Victor\'s body, laments what he has become, and departs north to end his own life on a funeral pyre.' }
  ],

  // Scene manifests — discoverable content per scene for the scene engine
  // Act 1 manifests are defined inline (scene_00 through scene_04)
  sceneManifests: {
    scene_00: Act1Manifests.scene_00,
    scene_01: Act1Manifests.scene_01,
    scene_02: Act1Manifests.scene_02,
    scene_03: Act1Manifests.scene_03,
    scene_04: Act1Manifests.scene_04
  },

  // Scene definitions — the curated backbone
  scenes: [
    // ACT 1: THE SPARK
    {
      id: 'scene_00',
      act: 'act1',
      name: 'Geneva — The Frankenstein Home',
      summary: 'The player (as Victor) is at home in Geneva with their family — father Alphonse, mother Caroline, and beloved Elizabeth. A storm gathers over the lake. The bookshelves call with volumes on natural philosophy, galvanism, and the secret forces of life.',
      npcs: ['victor', 'elizabeth', 'alphonse'],
      flags_set: ['arrived_geneva_home'],
      flags_required: [],
      isEntrypoint: true,
      dmGuidance: 'Set the mood: warmth, love, domestic peace — the calm before the storm. Victor\'s family is everything good in the world. Establish Elizabeth as the center of Victor\'s heart. The storm over the lake should feel symbolic — electricity, the spark of inspiration. Let the player explore the bookshelves and feel the pull of forbidden knowledge. This is the last moment of innocence.'
    },
    {
      id: 'scene_01',
      act: 'act1',
      name: 'University of Ingolstadt',
      summary: 'Victor arrives at the University of Ingolstadt. Professor Krempe dismisses his alchemical interests, but Professor Waldman inspires him with a vision of modern chemistry as the key to unlocking nature\'s deepest secrets. Victor devotes himself to the study of galvanism and the secret of life.',
      npcs: ['victor', 'waldman'],
      flags_set: ['met_waldman', 'studying_chemistry'],
      flags_required: ['arrived_geneva_home'],
      dmGuidance: 'Waldman is the catalyst. His lecture should feel like a revelation — the alchemists asked the right questions, modern chemistry has the tools. Waldman sees Victor\'s potential and is both excited and afraid. The anatomy theater visit should be visceral — the dead body on the slab, the question of where the spark went. Victor\'s obsession begins here. Waldman\'s warning — "the pursuit of the secret of life has destroyed every man who has undertaken it" — should land hard.'
    },
    {
      id: 'scene_02',
      act: 'act1',
      name: 'The Obsession Deepens',
      summary: 'Months have passed. Victor\'s lodgings are a ruin of science and madness. He has not written to Elizabeth in weeks. Waldman is dead. Victor gathers materials from charnel houses and slaughterhouses, assembling a body from the dead. His father\'s letter goes unread.',
      npcs: ['victor'],
      flags_set: ['deeply_obsessed', 'waldman_dead'],
      flags_required: ['studying_chemistry'],
      dmGuidance: 'This is the descent. Victor is gaunt, wild-eyed, unrecognizable. The charnel house and slaughterhouse visits should be disturbing but clinical — Victor no longer flinches at death. The unread letter from his father is a gut punch. Clerval\'s unanswered letters. The creature is taking shape, piece by piece. Victor is no longer the boy from Geneva. Show the cost of obsession.'
    },
    {
      id: 'scene_03',
      act: 'act1',
      name: 'The Laboratory',
      summary: 'The laboratory in a disused warehouse on the outskirts of Ingolstadt. The creature lies on the table — eight feet tall, yellow-skinned, assembled from two years of work. The voltaic apparatus hums with stored charge. A storm is approaching. Everything is ready.',
      npcs: ['victor'],
      flags_set: ['creature_assembled', 'laboratory_ready'],
      flags_required: ['deeply_obsessed'],
      dmGuidance: 'The creature is on the table. Describe it in detail — the yellow skin, the too-deep eyes, the almost-beautiful features that are somehow wrong. The voltaic apparatus should feel like a monster of its own — Leyden jars, copper wires, glass insulators, all humming. Victor has not left the room in three weeks. His hands shake. The storm is coming. This is the last moment before the irreversible act.'
    },
    {
      id: 'scene_04',
      act: 'act1',
      name: 'The Final Preparations',
      summary: 'The storm breaks. Rain hammers the skylight. Lightning splits the sky. The creature lies on the table with electrodes attached. Victor\'s journal entry: "Tonight, I shall put the spark of life into this being. God forgive me if I succeed." The switch is cold under his hand.',
      npcs: ['victor'],
      flags_set: ['storm_arrived', 'ready_to_animate'],
      flags_required: ['laboratory_ready'],
      dmGuidance: 'Pure tension. The storm is here. The apparatus is charged. The creature is waiting. Every detail should build toward the moment of the switch — the flickering lamp, the twitching fingers, the journal entry. Victor hesitates. He thinks of his mother, of Elizabeth. Then he pulls the switch. End the scene on the moment of animation — the eyes opening, the creature\'s first breath. This is the point of no return.'
    },

    // ACT 2: THE CREATION
    {
      id: 'scene_05',
      act: 'act2',
      name: 'The Animation',
      summary: 'The creature is brought to life. The voltaic apparatus screams, lightning arcs, the creature convulses and breathes. Its pale blue eyes open and find Victor\'s face. It smiles. Victor knows immediately he has made a terrible mistake.',
      npcs: ['victor'],
      flags_set: ['creature_alive'],
      flags_required: ['ready_to_animate'],
      dmGuidance: 'The moment of creation should be both triumphant and horrifying. The creature\'s first breath, its first smile — these should feel wrong, uncanny. Victor\'s revulsion is instant and absolute. He spent two years building this and the first thing he feels is horror. The creature reaches for him with gentle, trusting hands. Victor cannot give it what it needs. This scene is about the gap between ambition and consequence.'
    },
    {
      id: 'scene_06',
      act: 'act2',
      name: 'The Creature\'s First Moments',
      summary: 'The creature tries to sit up, makes sounds, reaches for Victor with desperate need. It is afraid of breaking glass. It looks at Victor the way a child looks at a parent — for comfort, for safety, for love. Victor cannot give it any of those things.',
      npcs: ['victor', 'creature'],
      flags_set: ['creature_abandoned'],
      flags_required: ['creature_alive'],
      dmGuidance: 'This is heartbreaking. The creature is a newborn — confused, afraid, reaching for the only person it knows. Victor should feel the pull of responsibility and the push of revulsion simultaneously. The creature\'s cry when Victor pulls away should be devastating. Let the player feel the weight of abandonment. The creature learns to mimic sounds — it is already learning, already trying to connect.'
    },
    {
      id: 'scene_07',
      act: 'act2',
      name: 'Victor\'s Collapse',
      summary: 'Victor wanders the streets of Ingolstadt in a daze. Henry Clerval finds him at dawn, sitting on the steps of his lodgings, staring at nothing. Victor is burning with fever, gaunt, broken. Clerval tends him through weeks of illness.',
      npcs: ['victor', 'clerval'],
      flags_set: ['clerval_found_victor', 'victor_ill'],
      flags_required: ['creature_abandoned'],
      dmGuidance: 'Clerval is the angel of mercy here — warm, practical, unwavering. He sees the ruined lodgings, the scattered papers, the look in Victor\'s eyes, and he does not ask questions. He just helps. Victor tries to tell him fragments — "created... life... dead..." — but cannot form the words. The fever takes Victor for weeks. When he wakes, Clerval is still there. This scene is about the cost of creation and the saving power of friendship.'
    },
    {
      id: 'scene_08',
      act: 'act2',
      name: 'The Laboratory Abandoned',
      summary: 'Three months later. Victor has recovered but has not returned to the laboratory. The creature has escaped — no reports of a monster, no bodies found. Victor holds the key, considers throwing it in the river. The laboratory is empty except for scratch marks on the table.',
      npcs: ['victor', 'clerval'],
      flags_set: ['laboratory_abandoned', 'creature_escaped'],
      flags_required: ['victor_ill'],
      dmGuidance: 'The laboratory is a tomb. The scratch marks on the table — ten parallel grooves made by fingernails — are the only evidence. The creature clawed its way out through the window. Victor can throw the key in the Danube or return to investigate. Either way, the creature is gone, somewhere in the world, alone, learning, growing. The player should feel the dread of what is out there.'
    },
    {
      id: 'scene_09',
      act: 'act2',
      name: 'The Letter from Geneva',
      summary: 'A letter from Alphonse: William is dead. Strangled with marks that were not human. Justine Moritz has been arrested for the murder. Victor knows the creature is responsible but cannot tell anyone. He and Clerval depart for Geneva immediately.',
      npcs: ['victor', 'clerval'],
      flags_set: ['william_dead', 'justine_accused', 'traveling_to_geneva'],
      flags_required: ['creature_escaped'],
      dmGuidance: 'The letter is a knife. William — little William, with his bright eyes and bell-like laugh — is dead. Victor knows the truth but cannot speak it. The guilt is crushing. Elizabeth found the body. Justine will hang for a crime the creature committed. Victor must face his family while hiding the secret that would destroy them. This is the first consequence of creation.'
    },

    // ACT 3: THE CREATURE'S EDUCATION
    {
      id: 'scene_10',
      act: 'act3',
      name: 'The Forest Awakening',
      summary: 'The creature\'s perspective: waking in a forest, overwhelmed by sensation. Discovering its own reflection in a stream — wrong, assembled, not human. Finding shelter, smelling smoke from a distant cottage. The creature is days old, alone, and terrified.',
      npcs: ['creature'],
      flags_set: ['creature_awakened', 'creature_sees_self'],
      flags_required: ['william_dead'],
      dmGuidance: 'Shift perspective to the creature. Everything is new — sunlight, birdsong, the feel of bark, the cold of water. The creature does not yet have language. It thinks in sensations and emotions. The reflection in the stream is a devastating moment — it sees what it is and recoils. The smoke from the cottage draws it like a moth to flame. This is the beginning of the creature\'s education in what it means to be alive and alone.'
    },
    {
      id: 'scene_11',
      act: 'act3',
      name: 'The De Lacey Cottage',
      summary: 'The creature lives in a lean-to attached to the De Lacey cottage. Through a crack in the wall, it watches the family: the blind old man, Agatha, Felix, and the Arabian Safie. It learns French by listening to Felix\'s lessons. It reads their books: Werther, Plutarch, Paradise Lost.',
      npcs: ['creature', 'felix de lacey', 'agatha de lacey', 'de lacey (old man)', 'safie'],
      flags_set: ['creature_learning_language', 'creature_reads_books'],
      flags_required: ['creature_awakened'],
      dmGuidance: 'This is the creature\'s university. It learns as Safie learns — word by word, concept by concept. The books transform it: Werther teaches it about unrequited love, Plutarch about heroism and tyranny, Paradise Lost about exile and defiance. The creature leaves gifts — nuts, berries, firewood. The family thinks they have a guardian angel. Show the creature\'s growing intelligence and empathy.'
    },
    {
      id: 'scene_12',
      act: 'act3',
      name: 'The Old Man\'s Kindness',
      summary: 'The creature approaches the blind old man while the family is away. They speak — the creature is eloquent, educated, gentle. De Lacey accepts it as a friend, judging by words not appearance. "Whatever you look like, you are welcome here."',
      npcs: ['creature', 'de lacey (old man)'],
      flags_set: ['de_lacey_accepted_creature'],
      flags_required: ['creature_reads_books'],
      dmGuidance: 'This is the creature\'s one moment of human connection. The old man cannot see the yellow skin, the too-deep eyes. He hears only the words, the intelligence, the longing. Their conversation should be beautiful — about Milton, about loneliness, about the soul. The old man plays his guitar. The creature weeps. This is the high point before the fall. When the family returns, everything will shatter.'
    },
    {
      id: 'scene_13',
      act: 'act3',
      name: 'The Rejection',
      summary: 'Felix returns and sees the creature. He screams, beats it with a staff. Agatha faints. The creature does not fight back — it lies in the dirt and takes the blows. The cottage door slams shut. The creature flees into the forest, its hope destroyed.',
      npcs: ['creature', 'felix de lacey', 'agatha de lacey', 'de lacey (old man)', 'safie'],
      flags_set: ['creature_rejected', 'creature_becoming_bitter'],
      flags_required: ['de_lacey_accepted_creature'],
      dmGuidance: 'The violence is sudden and brutal. Felix does not hesitate — he sees a monster and attacks. The creature could destroy him easily but does not fight back. It endures. The moment Safie\'s eyes meet the creature\'s through the window — pity, understanding, sorrow — before the shutters close is the last human connection. The creature\'s howl of anguish in the forest should shake the walls. Hope dies here.'
    },
    {
      id: 'scene_14',
      act: 'act3',
      name: 'The Creature\'s Resolve',
      summary: 'The creature survives a harsh winter, traveling south toward Geneva. It reads Paradise Lost by firelight and finds itself in Satan. It watches families through windows and aches with loneliness. It rehearses what it will say to its creator. It will demand a companion.',
      npcs: ['creature'],
      flags_set: ['creature_seeking_creator', 'creature_demands_companion'],
      flags_required: ['creature_rejected'],
      dmGuidance: 'The creature is hardening. Paradise Lost is its mirror — "Better to reign in Hell than serve in Heaven." It has been shot, beaten, driven away. But it still has one hope: its creator owes it a companion. The creature plans its speech, its argument, its ultimatum. It is no longer a child. It is a being with purpose, with grievance, with eloquence. The Alps rise before it. Geneva lies beyond. The creature is coming.'
    },

    // ACT 4: THE PRICE
    {
      id: 'scene_15',
      act: 'act4',
      name: 'The Creature\'s Demand',
      summary: 'The creature confronts Victor on a mountain pass in the Alps. It tells its story — the forest, the De Laceys, the rejection. It demands a female companion. If refused, it threatens: "I will be with you on your wedding night."',
      npcs: ['victor', 'creature'],
      flags_set: ['creature_confronted_victor', 'companion_demanded'],
      flags_required: ['creature_seeking_creator'],
      dmGuidance: 'This is the confrontation between creator and creation. The creature is eloquent, wounded, and terrifying. Its story should move the player to sympathy even as its threat chills them. Victor is torn between guilt and horror. The ultimatum — "I will be with you on your wedding night" — should land like a death sentence. The player must decide: agree to create a female, or refuse and face the consequences.'
    },
    {
      id: 'scene_16',
      act: 'act4',
      name: 'The Orkney Workshop',
      summary: 'Victor has traveled to a remote Scottish island to build a female creature. The work is slower — not because it is harder, but because Victor keeps stopping to think about what he is doing. The creature watches from the headland. Victor writes lies to Elizabeth.',
      npcs: ['victor', 'creature'],
      flags_set: ['female_half_finished', 'victor_doubting'],
      flags_required: ['companion_demanded'],
      dmGuidance: 'The moral crisis. Victor is creating a second being — a female — solely as a companion for the first. She will have no choice, no agency. The creature watches from the cliff, silent, waiting. Victor writes to Elizabeth and the lies taste like ash. Every moment of doubt should feel earned. The question is not whether Victor CAN create her, but whether he SHOULD.'
    },
    {
      id: 'scene_17',
      act: 'act4',
      name: 'The Destruction',
      summary: 'Victor destroys the half-finished female creature with his bare hands. He tears it apart, scatters the pieces. The creature watches through the window, howls with grief, and promises: "I will be with you on your wedding night, Victor."',
      npcs: ['victor', 'creature'],
      flags_set: ['female_destroyed', 'creature_vowed_revenge'],
      flags_required: ['victor_doubting'],
      dmGuidance: 'The destruction is savage and visceral. Victor tears the body apart with his hands. The creature\'s reaction — pressed against the glass, its face contorted beyond rage into something worse — is the moment the creature becomes truly dangerous. Its howl shakes the glass. Its promise is quiet, controlled, and more terrifying than any scream. Victor has just signed someone\'s death warrant. He knows it.'
    },
    {
      id: 'scene_18',
      act: 'act4',
      name: 'The Creature\'s Revenge',
      summary: 'Victor finds Clerval\'s body on an Irish beach. Strangled by the creature. Victor screams, collapses, and is arrested for the murder. Months of imprisonment follow before acquittal.',
      npcs: ['victor', 'clerval'],
      flags_set: ['clerval_dead', 'victor_imprisoned'],
      flags_required: ['female_destroyed'],
      dmGuidance: 'Clerval — warm, loyal, literary Clerval — is dead. The marks on his neck are not human. Victor falls apart. The scream on the beach should be the worst sound the player has ever imagined. Victor is accused of the murder and imprisoned. The creature\'s revenge is surgical: take from Victor what Victor took from the creature. The pattern is clear now. The wedding night is next.'
    },
    {
      id: 'scene_19',
      act: 'act4',
      name: 'Elizabeth\'s Last Letter',
      summary: 'Victor is acquitted and recovering in Paris. His father brings Elizabeth\'s letter — warm, loving, counting the hours until the wedding. Victor knows the creature will come on his wedding night. He writes a confession letter and prepares to return to Geneva.',
      npcs: ['victor', 'alphonse'],
      flags_set: ['returning_to_geneva', 'confession_written'],
      flags_required: ['clerval_dead'],
      dmGuidance: 'Elizabeth\'s letter is beautiful and devastating — "Whatever darkness has touched you, we will face it together." She does not know. Victor plans how to protect her: weapons, guards, running. None of it will work. The creature found him on a mountain, on an island, in Ireland. There is no escape. Victor writes his confession — everything, the whole truth — and gives it to his father. "Insurance," he says. The saddest smile in literature.'
    },

    // ACT 5: THE CHASE
    {
      id: 'scene_20',
      act: 'act5',
      name: 'The Wedding Night',
      summary: 'Victor and Elizabeth are married and at a villa on Lake Geneva. Victor is armed, watching the doors. Elizabeth begs him to come away from the door. Footsteps on the stairs. The creature has come as promised.',
      npcs: ['victor', 'elizabeth', 'creature'],
      flags_set: ['elizabeth_dead', 'creature_struck'],
      flags_required: ['confession_written'],
      dmGuidance: 'The dread is suffocating. Victor has a pistol, a knife, and the knowledge that the creature is coming. Elizabeth is radiant, confused, afraid — not of the creature, but of Victor\'s behavior. The footsteps on the stairs should be the most terrifying sound in the adventure. The creature\'s appearance in the doorway — "I told you I would be with you on your wedding night" — is the culmination of every threat. Elizabeth\'s death happens off-screen but its impact should be absolute.'
    },
    {
      id: 'scene_21',
      act: 'act5',
      name: 'The Pursuit Begins',
      summary: 'Elizabeth is dead. Victor\'s father is dead. Everyone is gone. Victor finds the creature\'s trail — deliberate, leading north. He loads a pistol, packs a bag, writes a final confession, and follows the trail into the Alps.',
      npcs: ['victor'],
      flags_set: ['pursuing_creature', 'all_lost'],
      flags_required: ['elizabeth_dead'],
      dmGuidance: 'Victor has nothing left. Five dead: William, Justine, Clerval, Elizabeth, Alphonse. The creature\'s trail is too deliberate — scratches on trees, footprints, cloth strips. It wants to be followed. Victor visits each grave and makes a silent promise. He packs with the efficiency of a man who has nothing to lose. The chase begins. This is Victor\'s final purpose.'
    },
    {
      id: 'scene_22',
      act: 'act5',
      name: 'The Arctic Waste',
      summary: 'Victor is on the Arctic ice. His dogs are dead. He is alone, frostbitten, starving. The creature leaves signs — fires, footprints, scraps of dried meat — keeping Victor alive but always just out of reach. The creature leads him northwest, toward the end of the world.',
      npcs: ['victor'],
      flags_set: ['on_arctic_ice'],
      flags_required: ['pursuing_creature'],
      dmGuidance: 'The Arctic is a white desert — infinite, indifferent, lethal. Victor\'s frostbitten hands, his dead dogs, the creature\'s fires on distant ridges. The creature sustains him — not out of kindness, but because it wants him to suffer. The compass points northwest. The creature is leading Victor to the end of the world. This is the final gauntlet. Victor walks because there is nothing behind him and the creature is ahead.'
    },
    {
      id: 'scene_23',
      act: 'act5',
      name: 'Captain Walton\'s Ship',
      summary: 'Captain Walton\'s ship, trapped in the ice, rescues Victor. He is barely alive — frostbitten, feverish, dying. He tells Walton his entire story: the creation, the murders, the chase. He begs Walton to learn from his mistakes.',
      npcs: ['victor', 'captain walton'],
      flags_set: ['story_told', 'victor_dying'],
      flags_required: ['on_arctic_ice'],
      dmGuidance: 'Victor tells his story to Walton — hours of narration, every detail. Walton is the audience surrogate. Victor is not raving; he is precise, clear, a man making his confession. The ship doctor says Victor should be dead — something kept him alive, some purpose. Now that the story is told, that purpose is fading. Victor asks Walton to learn from his mistakes. "Do not play God." The creature waits on the ice.'
    },
    {
      id: 'scene_24',
      act: 'act5',
      name: 'The Creature\'s Lament',
      summary: 'Victor dies at midnight. The creature appears over his body, illuminated by the northern lights. It grieves — "I killed him. I killed everyone he loved." It tells Walton it will go north, build a funeral pyre, and end its own life. It walks away across the ice and vanishes.',
      npcs: ['victor', 'captain walton', 'creature'],
      flags_set: ['victor_dead', 'creature_departed', 'adventure_complete'],
      flags_required: ['story_told'],
      isFinal: true,
      dmGuidance: 'The final scene. Victor dies with a moment of terror — "It is here" — then acceptance. The creature climbs aboard the ship. It kneels beside Victor and touches his cheek. Its grief is vast, inhuman, heartbreaking. It tells Walton its plan: a funeral pyre at the end of the world. "I was made from the dead. I will return to the dead." It walks north across the ice, painted by the northern lights, and vanishes. Walton closes the journal and begins to write. The story must be told. The lesson must be learned. End with the dawn over the ice — grey, cold, indifferent, and beautiful.'
    }
  ],

  // Starting conditions
  startScene: 'scene_00',

  // Adventure-level summary for the AI DM context
  adventureSummary: 'The player experiences the story of Victor Frankenstein — a brilliant young scientist who creates life from the dead and unleashes a tragedy that destroys everyone he loves. The adventure alternates between Victor\'s perspective (Acts 1, 2, 4, 5) and the creature\'s perspective (Act 3), building empathy for both creator and creation. Themes: the dangers of unchecked ambition, the responsibility of creators to their creations, the loneliness of the outcast, the consequences of playing God, and the question of what makes us human. The tone is gothic, philosophical, and deeply tragic.'
};

// Merge all per-act scene manifests into the adventure object
Object.assign(FrankensteinAdventure.sceneManifests,
  Act2Manifests,
  Act3Manifests,
  Act4Manifests,
  Act5Manifests
);

console.log(`[Frankenstein] Loaded ${Object.keys(FrankensteinAdventure.sceneManifests).length} scene manifests (acts 1-5)`);

/**
 * Get a scene by ID.
 */
function getScene(sceneId) {
  return FrankensteinAdventure.scenes.find(s => s.id === sceneId) || null;
}

/**
 * Get the starting scene.
 */
function getStartScene() {
  return getScene(FrankensteinAdventure.startScene);
}

/**
 * Get available next scenes from current scene.
 */
function getNextScenes(currentSceneId) {
  const current = getScene(currentSceneId);
  if (!current) return [];
  // Scenes are ordered; next scene is available if flags are met
  const currentIndex = FrankensteinAdventure.scenes.findIndex(s => s.id === currentSceneId);
  if (currentIndex < 0 || currentIndex >= FrankensteinAdventure.scenes.length - 1) return [];
  const next = FrankensteinAdventure.scenes[currentIndex + 1];
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
  return FrankensteinAdventure.acts.map(act =>
    `${act.name} (Scenes ${act.scenes[0]+1}-${act.scenes[act.scenes.length-1]+1}): ${act.summary}`
  ).join('\n');
}

module.exports = {
  FrankensteinAdventure,
  getScene,
  getStartScene,
  getNextScenes,
  getDMGuidance,
  getAdventureOutline
};
