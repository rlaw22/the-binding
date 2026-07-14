/**
 * Frankenstein — Act 5 Manifests: The Chase
 * Scenes 20-24: The wedding night, pursuit, Arctic waste, Walton's ship, the creature's lament
 */

module.exports = {
  scene_20: {
    sceneId: 'scene_20',
    sceneName: 'The Wedding Night',
    description: `The villa on Lake Geneva is small and beautiful — white stone, red tile roof, a garden of roses and jasmine that slopes down to the water's edge. Elizabeth chose it. "A cottage by the lake," she said, her eyes bright with the simple happiness of a woman who has waited long enough. "Just for us. Just for tonight."

The wedding was this morning. Elizabeth wore white. Her auburn hair was braided with flowers. Her grey-green eyes found yours across the aisle and held them — steady, loving, unafraid. She did not know why your hands shook when you placed the ring on her finger. She did not know why you scanned the church doors every time they opened. She did not know that you had a pistol hidden in your coat and a knife strapped to your calf.

Now it is night. The lake is black glass. The moon is a thin crescent, casting just enough light to see the garden path, the roses, the dark shapes of the mountains beyond. Elizabeth stands at the window, looking out at the water. She is still in her white dress. Her hair is down. She turns to you and smiles — the smile that has been the center of your world since childhood.

"Victor," she says. "Come away from the door. There is nothing out there."

But there is. You know there is. The creature promised. The creature keeps its promises.

And then you hear it — a sound from below. A window opening. A footstep on the stairs.`,
    content: [
      {
        id: 'draw_weapon',
        label: 'Draw your pistol and prepare to defend Elizabeth',
        keywords: ['pistol', 'draw', 'weapon', 'defend', 'gun', 'ready', 'fight'],
        discovery: 'You pull the pistol from your coat. The weight is cold and real. Elizabeth sees it and her face changes — the smile fading, replaced by confusion, then fear. "Victor? What are you doing? Why do you have a gun?" You push her behind you. "Stay back," you whisper. "Whatever happens, do not come out." The footsteps on the stairs are slow, deliberate, heavy. The creature is not hiding. It wants you to hear it coming. It wants you to know that it is here, that it has kept its promise, that the wedding night it threatened is now.'
      },
      {
        id: 'protect_elizabeth',
        label: 'Push Elizabeth into the closet and lock the door',
        keywords: ['protect', 'elizabeth', 'closet', 'lock', 'hide', 'safe', 'push'],
        discovery: 'You grab Elizabeth\'s arm and pull her toward the closet. "Get in," you hiss. "Lock the door. Do not come out, no matter what you hear." She resists — not from fear, but from confusion. "Victor, tell me what is happening!" But there is no time. The footsteps are on the landing. You push her into the closet and close the door. The lock clicks. Through the wood, muffled but clear, you hear her voice: "Victor? Victor!" You turn to face the bedroom door. Your pistol is raised. Your heart hammers. And the door opens.'
      },
      {
        id: 'call_out',
        label: 'Shout a challenge to the creature',
        keywords: ['call', 'shout', 'challenge', 'creature', 'voice', 'yell', 'come'],
        discovery: 'You raise your voice. "I know you are there! Come in! Face me!" The footsteps stop. Silence. Then a sound that turns your blood to ice — a low, rumbling laugh, deep as thunder, resonating through the floor and walls. The creature\'s laugh. You have never heard it laugh before. The bedroom door swings open. The creature stands in the doorway — eight feet tall, filling the frame, its yellow skin ghostly in the moonlight, its pale blue eyes burning with an emotion you cannot name. It is not rage. It is not triumph. It is something worse: sorrow. "I told you," it says, its voice quiet and deep. "I told you I would be with you on your wedding night."'
      },
      {
        id: 'search_room',
        label: 'Search the room for another exit or hiding place',
        keywords: ['search', 'room', 'exit', 'window', 'escape', 'hiding', 'place'],
        discovery: 'Your eyes sweep the room. The window — too small for you to fit through, and the drop to the garden is twenty feet. The balcony — accessible, but the creature is between you and the door. The closet — Elizabeth is there. You cannot lead the creature to her. There is no escape. There is no hiding. There is only the creature in the doorway and the pistol in your hand and the knowledge that everything you have feared is about to happen. You raise the pistol. Your hand does not shake. You have been shaking for months, but now, in this moment, you are still. "You will not touch her," you say. The creature tilts its head. "I have already touched her," it says. "I have already been with her. While you were at the wedding, while you were saying your vows, I was here. Waiting."'
      }
    ],
    exitAction: 'creature_strikes',
    exitLabel: 'The creature strikes',
    hardExitNarration: 'The creature moves with a speed that your eyes cannot follow. One moment it is in the doorway. The next, it is beside you, and the pistol is on the floor, and your wrist is broken, and you are on your knees. It does not look at you. It looks toward the closet — toward the sound of Elizabeth\'s voice, muffled, terrified, calling your name. "I told you," it says again. "I told you what I would do." It turns and walks to the closet door. You scream. You scream and you crawl toward it and you try to stand, but your wrist is broken and your legs will not hold you. The creature opens the closet door. Elizabeth stands there, her face white, her eyes wide, her hands raised. The creature reaches for her. And the world ends.',
    initialFacts: {
      items: ['journal', 'elizabeth\'s letter', 'pistol'],
      metNPCs: ['victor frankenstein', 'elizabeth', 'the creature'],
      established: ['Victor and Elizabeth are married', 'they are at a villa on Lake Geneva', 'the creature has come as promised', 'Victor is armed but outmatched', 'Elizabeth is in danger']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'de lacey cottage', 'arctic', 'orkney', 'laboratory']
    }
  },

  scene_21: {
    sceneId: 'scene_21',
    sceneName: 'The Pursuit Begins',
    description: `The funeral is over. Elizabeth lies in the Frankenstein family tomb, beside William, beside Caroline. The stone is fresh-cut, the flowers still bright. Your father could not survive the grief — he died three days after Elizabeth, his heart simply stopping, as if it had decided that a world without his children was not a world worth beating in.

You stand at the grave in the rain. The cemetery is empty. The mourners have gone. You are alone with the dead and the knowledge that you killed them all. William. Justine. Clerval. Elizabeth. Your father. Five lives, taken by a creature you made, because you were too proud to consider the consequences of your ambition.

The creature left a trail. You found it — scratches on the garden wall, footprints in the mud, a tuft of yellow hair caught on a fence post. It wants you to follow. It wants you to chase it. It wants you to suffer the way it has suffered — alone, desperate, driven from place to place, always moving, never at rest.

You will give it what it wants.

You load a pistol. You pack a bag. You write a letter to no one — there is no one left to write to — and leave it on the kitchen table. "I am going to find the creature I made. I am going to kill it, or die trying. If I fail, let this letter stand as a warning: do not play God. Do not create life. Do not presume to know what is best for the dead."

Then you follow the trail north. Into the mountains. Into the cold. Into the dark.`,
    content: [
      {
        id: 'examine_trail',
        label: 'Study the creature\'s trail for clues about its direction',
        keywords: ['trail', 'examine', 'clues', 'direction', 'tracks', 'follow', 'signs'],
        discovery: 'The creature\'s trail is deliberate — too deliberate. It scratches marks on trees. It leaves footprints in soft earth. It tears strips of cloth from its garments and ties them to branches. It wants to be followed. It wants you close enough to see, but never close enough to catch. You read the signs like a language: the scratches point north, toward the Alps. The footprints are deep — the creature is carrying something. The cloth strips are from a garment you recognize — a shirt you made for it in the laboratory. It is wearing the clothes you gave it. It is carrying something you gave it. And it is leading you north, into the cold, into the mountains, into the place where it first confronted you.'
      },
      {
        id: 'visit_graves',
        label: 'Visit each grave and make a silent promise',
        keywords: ['graves', 'visit', 'promise', 'dead', 'family', 'william', 'elizabeth'],
        discovery: 'You walk from grave to grave. William\'s stone is small and simple — a child\'s grave, with a carved lamb at the top. Elizabeth\'s is larger, with her name and dates and the words "Beloved of Victor." Your father\'s is the newest, the earth still soft. You stand before each one and make a promise — not spoken, because words are worthless now, but felt, deep in the place where your heart used to be. I will find it. I will kill it. I will make it pay for what it has done. And if I cannot kill it, I will die trying, and I will die knowing that I tried. The rain falls. The flowers wilt. The dead do not answer. But you feel, for the first time in months, something that is not grief. It is purpose. Cold, hard, sharp as a blade. Purpose.'
      },
      {
        id: 'pack_supplies',
        label: 'Gather weapons and supplies for the pursuit',
        keywords: ['pack', 'supplies', 'weapons', 'gather', 'pistol', 'food', 'prepare'],
        discovery: 'You pack with the efficiency of a man who has nothing left to lose. A pistol — the same one you carried on your wedding night, repaired and loaded. A knife — long, sharp, heavy enough to cut bone. Rope. A compass. Dried food. A blanket. A flask of brandy. And the journal — your journal, the record of everything you did, everything you created, everything you lost. You strap the pistol to your hip. You hang the knife from your belt. You shoulder the pack. You look in the mirror — the last mirror in the Frankenstein house — and see a man you do not recognize. Gaunt, hollow-eyed, grey-haired at thirty. A man who has lost everything and has nothing left to fear. You turn away from the mirror and walk out the door. You do not lock it. There is nothing left to protect.'
      },
      {
        id: 'write_final_letter',
        label: 'Write a final letter explaining everything',
        keywords: ['write', 'letter', 'final', 'explain', 'everything', 'confession', 'warning'],
        discovery: 'You sit at the kitchen table and write. Not a letter — a confession. Everything. The laboratory. The creation. The creature. The demand. The destruction. The murders. You write it all in a hand that does not shake, because the shaking has stopped. When you finish, you read it back. It is twenty pages long. It is the story of a man who tried to conquer death and instead created it. You fold the pages and place them on the table, weighted with a stone. If anyone finds this, they will know the truth. They will know that Victor Frankenstein was not a murderer — he was something worse. He was a creator. And his creation destroyed everything he loved.'
      }
    ],
    exitAction: 'begin_pursuit',
    exitLabel: 'Follow the creature\'s trail into the mountains',
    hardExitNarration: 'You leave Geneva behind. The road climbs into the Alps — grey rock, white snow, the thin air of altitude. The creature\'s trail leads north, always north, through passes and valleys and frozen streams. You follow it with the single-minded determination of a man who has nothing left but the chase. Behind you, the graves of everyone you loved. Before you, the creature. And between them, the road — long, cold, and endless.',
    initialFacts: {
      items: ['journal', 'pistol', 'knife', 'compass'],
      metNPCs: ['victor frankenstein'],
      established: ['Elizabeth is dead', 'Victor\'s father is dead', 'Victor has lost everyone', 'the creature has fled north', 'Victor is pursuing the creature', 'Victor is armed and determined']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'de lacey cottage', 'orkney', 'laboratory']
    }
  },

  scene_22: {
    sceneId: 'scene_22',
    sceneName: 'The Arctic Waste',
    description: `The ice stretches to the horizon — a white desert under a sky the color of lead. The wind cuts like a knife, driving snow horizontally across the flat, featureless waste. You cannot feel your face. You cannot feel your hands. You cannot feel anything except the cold, which has become a part of you — not an external force but an internal state, a coldness that has settled into your bones and will never leave.

The dogs are dead. They died three days ago — the last of them, a strong bitch named Sasha, collapsing in her traces with a sound like a sigh. You unharnessed her and held her until she was still, and then you left her in the snow and walked on. You are alone now. Truly alone. No dogs, no sled, no companion. Just you and the ice and the wind and the trail of the creature, which leads ever northward into the white void.

You should be dead. By any rational measure, you should have died days ago — of cold, of hunger, of exhaustion. But the creature sustains you. Not directly — it does not bring you food or warmth. But it leaves signs. Scratches on ice floes. Footprints in fresh snow. A fire, burning on a distant ridge, visible for hours before you reach it and find it abandoned, the embers still warm. It wants you to follow. It wants you close. It wants you to suffer.

And you suffer. God, how you suffer. Your lips are cracked and bleeding. Your fingers are black with frostbite. Your eyes are swollen nearly shut from the glare of the ice. But you walk. You walk because the creature is ahead, and behind you is nothing — nothing but the graves of everyone you loved and the knowledge that you killed them all.`,
    content: [
      {
        id: 'follow_fire',
        label: 'Follow the distant smoke of the creature\'s fire',
        keywords: ['fire', 'smoke', 'follow', 'distant', 'creature', 'warmth', 'ridge'],
        discovery: 'You see it — a thin column of smoke rising against the grey sky, perhaps five miles ahead. The creature\'s fire. It has been leaving fires for you since you crossed into the Arctic — small blazes of driftwood and ice-bear fat, burning on ridges and ice floes, always just far enough ahead to keep you walking. You follow the smoke. Your legs move mechanically — left, right, left, right — the only rhythm left in a world that has lost all rhythm. When you reach the fire, it is dying. The embers are warm. You kneel beside them and hold your blackened fingers to the heat and feel nothing. The creature has left a scrap of dried meat beside the fire. You eat it. It tastes of salt and smoke and something you cannot name. You eat it because you must. Because the chase is not over. Because the creature is still ahead.'
      },
      {
        id: 'examine_frostbite',
        label: 'Look at your hands and assess the damage',
        keywords: ['hands', 'frostbite', 'damage', 'look', 'black', 'fingers', 'cold'],
        discovery: 'You hold your hands up and look at them in the grey light. The fingers are black — not all of them, but the tips of the first three on each hand, and the little finger on the left. Frostbite. The flesh is dead. It does not hurt anymore — the nerves are gone. You flex your fingers. They move, but slowly, stiffly, like the limbs of a puppet with tangled strings. These are the hands that built a creature from the dead. These are the hands that pulled the switch. These are the hands that tore the female creature apart. And now they are dying, piece by piece, in the Arctic cold. You tuck them into your coat and walk on. The pain is gone. The cold is gone. Everything is gone except the trail and the creature and the white, endless ice.'
      },
      {
        id: 'remember_elizabeth',
        label: 'Remember Elizabeth to keep yourself going',
        keywords: ['remember', 'elizabeth', 'memory', 'keep', 'going', 'face', 'voice'],
        discovery: 'You close your eyes and see her face. Elizabeth. Her grey-green eyes. Her auburn hair. The way she read poetry by the fire, her voice clear and warm, the words falling like rain. "Come away from the door," she said. "There is nothing out there." But there was. There was the creature. There was the monster you made. There was the consequence of your ambition, standing in the doorway with pale blue eyes and a sorrow deeper than the Arctic ice. You open your eyes. The ice stretches to the horizon. The wind howls. And you walk. You walk because Elizabeth would want you to walk. Because she would not want you to lie down and die in the snow. Because she loved you — loved you despite everything, loved you to the last — and you owe her this. You owe her the chase. You owe her the kill. You owe her the creature\'s death.'
      },
      {
        id: 'check_compass',
        label: 'Check your compass and try to determine where the creature is leading you',
        keywords: ['compass', 'check', 'direction', 'north', 'leading', 'where', 'course'],
        discovery: 'You pull out the compass. The needle spins — not settling, not pointing north, but rotating slowly, as if confused by the magnetic fields of the Arctic. You tap the glass. The needle wobbles and settles — pointing not north, but northwest. The creature is leading you somewhere specific. Not randomly, not aimlessly, but with purpose. Northwest. Toward the pole. Toward the place where the ice is thickest and the cold is deepest and no human has ever gone and returned. The creature is leading you to the end of the world. And you follow. Because there is nothing behind you. Because the creature is ahead. Because the chase is all you have left.'
      }
    ],
    exitAction: 'continue_chase',
    exitLabel: 'Press on through the ice toward the creature',
    hardExitNarration: 'You stand. Your legs are stiff. Your hands are black. Your face is a mask of frozen blood and cracked skin. But you stand. And you walk. North. Always north. Toward the creature. Toward the end. The ice stretches before you — white, flat, infinite — and somewhere in that whiteness, the creature walks too. It is waiting for you. It has always been waiting for you. And you will find it. Or you will die trying. Either way, the chase will end.',
    initialFacts: {
      items: ['journal', 'pistol', 'knife', 'compass'],
      metNPCs: ['victor frankenstein'],
      established: ['Victor is in the Arctic', 'his dogs are dead', 'he is alone on the ice', 'the creature is ahead, leaving signs', 'Victor is suffering from frostbite and exhaustion', 'the creature is leading him northwest']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'de lacey cottage', 'orkney', 'laboratory', 'geneva']
    }
  },

  scene_23: {
    sceneId: 'scene_23',
    sceneName: 'Captain Walton\'s Ship',
    description: `The ship is called the Discovery. It is an Arctic exploration vessel, trapped in the ice for three weeks, its crew restless and afraid. Captain Robert Walton stands on the quarterdeck, scanning the ice with his telescope, when he sees something that should not be there.

A man. Walking across the ice. Alone. No sled, no dogs, no supplies. Just a figure — gaunt, staggering, wrapped in frozen rags — moving toward the ship with the mechanical persistence of a wound-up clock. Walton shouts for the crew. They lower a boat and row across the ice, and they bring the man aboard.

He is barely alive. His hands are black with frostbite. His face is a ruin of cracked skin and frozen blood. His eyes are wild — burning with a fever that has nothing to do with infection and everything to do with obsession. They carry him to the captain's cabin and lay him in a bunk and wrap him in blankets and force warm broth between his cracked lips.

When he speaks, his English is perfect, his accent educated, his voice the voice of a man who has been talking to no one for months. "Captain Walton," he says, his eyes finding yours. "I have a story to tell you. A story of creation and destruction, of ambition and consequence, of a man who played God and lost everything. You must hear it. You must understand. Because if you do not learn from my mistakes, you will make them yourself."

His name is Victor Frankenstein. And his story will change everything you believe about the nature of life.`,
    content: [
      {
        id: 'listen_to_story',
        label: 'Sit and listen as Victor tells his story',
        keywords: ['listen', 'story', 'victor', 'tell', 'speak', 'narrate', 'account'],
        discovery: 'Victor speaks for hours. He tells you everything — the laboratory in Ingolstadt, the creation of the creature, the horror of its first breath. He tells you about the creature\'s education, its loneliness, its demand for a companion. He tells you about the murders — William, Justine, Clerval, Elizabeth, his father. He tells you about the chase — across Europe, across the ice, to the end of the world. His voice is steady, his eyes clear, his words precise. He is not raving. He is not mad. He is a man who has done terrible things and is trying, in the only way he knows how, to make sure they are not repeated. When he finishes, the cabin is silent. The ship creaks in the ice. The wind howls outside. And you sit in that silence and try to comprehend what you have heard.'
      },
      {
        id: 'examine_victor',
        label: 'Study Victor\'s condition and tend to his wounds',
        keywords: ['examine', 'victor', 'condition', 'wounds', 'tend', 'frostbite', 'health'],
        discovery: 'Your ship\'s doctor examines Victor and shakes his head. The frostbite has claimed three fingers on each hand. His feet are worse — the toes are black, the soles cracked and bleeding. His lungs are damaged from the cold. His heart is weak. "He should be dead," the doctor whispers. "No man could survive what he has survived. It is as if something kept him alive — some force, some will, some purpose that would not let his body give up." You look at Victor in the bunk — gaunt, broken, burning with fever — and you see what the doctor means. He is alive because he chose to be alive. Because the chase was not over. Because the creature was still out there. And now that the story is told, now that the confession is made, the will that held him together is fading.'
      },
      {
        id: 'ask_about_creature',
        label: 'Ask Victor about the creature — what it is, where it is',
        keywords: ['ask', 'creature', 'what', 'where', 'is', 'still', 'out'],
        discovery: 'You ask the question that burns in your mind: "The creature — is it still out there?" Victor\'s eyes find yours. "Yes," he says. "It is on the ice. It has been following me — or I have been following it. I do not know which anymore. It is out there, Captain. Waiting. Watching. It knows I am on this ship. It knows I am dying. And when I am gone, it will have no reason to stay in this world." He closes his eyes. "Do not look for it. Do not hunt it. Do not try to understand it. Just — let it be. Let it find its own end. It has suffered enough." His voice breaks. And for the first time, you see tears on the face of Victor Frankenstein — not tears of grief, but tears of something deeper. Compassion. For the monster he made.'
      },
      {
        id: 'read_journal_walton',
        label: 'Read Victor\'s journal when he sleeps',
        keywords: ['read', 'journal', 'victor', 'sleeps', 'notes', 'diary', 'account'],
        discovery: 'When Victor sleeps, you take his journal from the table beside his bunk. The pages are worn, stained with water and blood and something you prefer not to identify. You read it from the beginning — the laboratory, the creation, the horror. The handwriting changes as the journal progresses: neat and precise in the early entries, growing more erratic, more desperate, until the final pages, written in the Arctic, are barely legible. But the story is clear. A man of genius, driven by the noblest ambition — to conquer death — who created a living being and then abandoned it, and who spent the rest of his life paying for that abandonment. You close the journal and look at Victor in the bunk. He is sleeping. His face is peaceful. For the first time in months, perhaps years, he is at rest.'
      }
    ],
    exitAction: 'victor_deteriorates',
    exitLabel: 'Watch as Victor\'s condition worsens',
    hardExitNarration: 'The days pass. Victor grows weaker. He speaks less. He eats nothing. He lies in the bunk and stares at the ceiling and sometimes, in the night, you hear him talking — not to you, not to the crew, but to someone who is not there. "I am sorry," he whispers. "I am sorry for what I made you. I am sorry for what I did to you. I am sorry I could not love you." The crew avoids the cabin. They are afraid. Not of Victor — of the story. Of the truth. Of the creature that waits on the ice.',
    initialFacts: {
      items: ['journal', 'pistol', 'knife', 'compass'],
      metNPCs: ['victor frankenstein', 'captain walton'],
      established: ['Victor has been rescued by Walton\'s ship', 'Victor is dying', 'Victor has told his story', 'the creature is on the ice', 'Walton knows the truth']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'de lacey cottage', 'orkney', 'laboratory', 'geneva']
    }
  },

  scene_24: {
    sceneId: 'scene_24',
    sceneName: 'The Creature\'s Lament',
    description: `Victor Frankenstein dies at midnight. He does not die quietly — there is a moment, just before the end, when his eyes open wide and he sits up in the bunk and stares at the cabin door with an expression of absolute terror. "It is here," he whispers. "It has come for me." Then his eyes clear. The terror fades. Something else takes its place — not fear, not peace, but acceptance. "I am ready," he says. And he lies back and closes his eyes and does not open them again.

You sit with him for a long time after. The cabin is quiet. The ship creaks in the ice. The wind howls outside, but inside there is only silence and the smell of death and the weight of a story that has been told and a life that has been lived and a sin that has been paid for.

You are preparing the body for burial when you hear it. A sound from outside — not the wind, not the ice, but a voice. Deep, resonant, inhuman. A voice that sounds like rock grinding on rock, like thunder in a mountain pass, like the earth itself speaking.

You go to the window. And you see it.

The creature stands on the ice, illuminated by the northern lights — green and blue and violet, dancing across the sky like the ghosts of the dead. It is eight feet tall. Its skin is yellow. Its eyes are pale blue. And its face — that terrible, assembled face — is contorted with a grief so vast it has no edges.

It sees you through the window. It does not attack. It does not threaten. It speaks.

"Let me see him," it says. "Let me see my creator."`,
    content: [
      {
        id: 'let_creature_in',
        label: 'Open the door and let the creature see Victor\'s body',
        keywords: ['open', 'door', 'let', 'creature', 'see', 'body', 'allow'],
        discovery: 'You open the door. The creature climbs aboard — the ship groans under its weight — and walks to the cabin with the slow, heavy steps of a mourner. It kneels beside the bunk. It looks at Victor\'s face — the gaunt, peaceful, dead face — and it makes a sound. Not a word. Not a cry. A sound that is older than language, older than grief, older than the world. The sound of a child who has lost its parent. It reaches out and touches Victor\'s cheek with one massive, gentle finger. "I killed him," it says. "I killed everyone he loved. And now he is gone, and I am alone, and the world is empty." It looks up at you. Its eyes are wet — not with tears, because it was not built to weep, but with something deeper, something that has no name. "He made me," it says. "He gave me life. And I repaid him with death. What does that make me?"'
      },
      {
        id: 'confront_creature',
        label: 'Confront the creature about its crimes',
        keywords: ['confront', 'creature', 'crimes', 'murder', 'killed', 'why', 'demand'],
        discovery: 'You stand before the creature and your voice does not shake. "You killed innocent people," you say. "A child. A woman. A man who never harmed you. Why?" The creature looks at you with those pale, ancient eyes. "Because I was alone," it says. "Because the world rejected me. Because the one who made me abandoned me. Because I was given a soul and then shown that the soul was worthless — that no amount of learning, of kindness, of longing could overcome the accident of my appearance." It pauses. "I am not asking for forgiveness. I am not asking for understanding. I am asking only that you know — that someone, somewhere, knows what I am and why I did what I did. I am not evil, Captain. I am alone. And loneliness, given enough time, becomes indistinguishable from evil."'
      },
      {
        id: 'ask_creature_plans',
        label: 'Ask the creature what it will do now',
        keywords: ['ask', 'plans', 'creature', 'do', 'now', 'future', 'end'],
        discovery: 'The creature stands. It is enormous in the small cabin — its head nearly touching the ceiling, its shoulders filling the space. "I will go north," it says. "To the farthest ice. To the place where the world ends. I will build a funeral pyre — driftwood and ice-bear fat and the last of my creator\'s possessions. I will lie upon it. And I will set it alight." Its voice is quiet, steady, final. "I was made from the dead. I will return to the dead. The fire will consume this body — this yellow skin, these pale eyes, these hands that killed — and the ashes will scatter on the wind, and the world will be free of me." It looks at Victor\'s body one last time. "Goodbye, my creator," it says. "I am sorry for what I became. I am sorry for what you made me. I am sorry for everything."'
      },
      {
        id: 'watch_creature_leave',
        label: 'Watch as the creature leaves the ship',
        keywords: ['watch', 'creature', 'leave', 'ship', 'go', 'north', 'ice'],
        discovery: 'The creature walks to the door. It does not look back. It steps onto the ice — the ship rocking under its weight — and begins to walk north. The northern lights paint its yellow skin in shifting colors — green, blue, violet — and for a moment, just a moment, it is beautiful. Not human. Not monster. Something else. Something that should never have existed, and that the world will never see again. You watch it walk across the ice until it is a dark shape against the white, and then a speck, and then nothing. The northern lights fade. The ice stretches to the horizon. And the creature is gone.'
      }
    ],
    exitAction: 'adventure_end',
    exitLabel: 'Put down Victor\'s journal and think about what you have learned',
    hardExitNarration: 'You close the journal. The cabin is quiet. Victor\'s body lies in the bunk, peaceful at last. Outside, the ice creaks and the wind howls and the ship waits for the thaw that will carry you home. You sit at the desk and pick up your pen and begin to write — not to anyone in particular, but to the world. "I have heard a story," you write, "that has changed everything I believe about the nature of life, the limits of ambition, and the consequences of playing God. I tell it now so that others may learn. So that others may be warned. So that the creature\'s suffering — and its creator\'s — will not have been in vain." You write through the night. And when dawn comes, grey and cold over the ice, you are still writing. The story must be told. The lesson must be learned. And the creature — somewhere on the ice, building its pyre — must be remembered.',
    initialFacts: {
      items: ['journal', 'pistol', 'knife', 'compass'],
      metNPCs: ['victor frankenstein', 'captain walton', 'the creature'],
      established: ['Victor is dead', 'the creature has appeared over Victor\'s body', 'the creature is grieving', 'the creature plans to end its own life on a funeral pyre', 'the creature has left the ship heading north', 'Walton has heard the full story']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'de lacey cottage', 'orkney', 'laboratory', 'geneva']
    }
  }
};
