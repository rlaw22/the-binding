/**
 * Frankenstein — Act 2 Manifests: The Creation
 * Scenes 5-9: The creature's first moments, Victor's horror and flight
 */

module.exports = {
  scene_05: {
    sceneId: 'scene_05',
    sceneName: 'The Animation',
    description: `The laboratory is lit by a single oil lamp and the stuttering blue-white glare of the voltaic apparatus. Rain hammers the skylight. The table before you holds the thing you have spent two years building — a body, eight feet tall, assembled from the pieces of the dead. Its skin is yellow and stretched too tight over the massive frame. Its hair is black and lustrous, its teeth white as pearls. But its eyes — you chose the eyes carefully. They are a pale, watery blue.

The electrodes are attached. The galvanic cells are charged. The glass rods of the Leyden jar hum with stored lightning. Everything is ready. Your hand rests on the copper switch that will send the current through the creature's brain and — you pray — spark it into life.

The rain stops. The laboratory falls silent except for the hum of the apparatus and the hammering of your own heart. On the workbench beside you, your journal lies open to the final entry: "Tonight, I shall put the spark of life into this being. God forgive me if I succeed."

The creature's chest rises and falls — not with breath, but with the settling of dead tissue. Its fingers twitch. Or do they? You cannot tell if it is the flickering lamp or something else.

The switch is cold under your hand.`,
    content: [
      {
        id: 'examine_living_creature',
        label: 'Study the creature now that it is alive',
        keywords: ['examine', 'study', 'creature', 'alive', 'look', 'inspect', 'living', 'breathing'],
        discovery: 'You force yourself to look at what you have made. The creature breathes — a wet, rattling sound that fills the laboratory with each inhale. Its skin, which lay flat and waxy on the table, now moves with the pulse of blood beneath. The yellow tint has not faded, but the eyes — those pale, watery eyes — are no longer glass. They track. They focus. They find your face and hold it with an intensity that pins you in place. The creature\'s fingers flex against the table, leaving deep grooves in the wood. Its chest rises and falls with a rhythm that is almost human but too deep, too slow. You study the face you built — the high cheekbones, the straight nose, the lips that now move, forming shapes that are not yet words — and you see something you did not put there. Something behind the eyes. A mind. Awake. Watching you.'
      },
      {
        id: 'back_away_from_creature',
        label: 'Step back from the creature as the horror sets in',
        keywords: ['back', 'away', 'step', 'horror', 'retreat', 'fear', 'creature'],
        discovery: 'You step back. Your hip strikes the workbench and glass jars rattle. The creature flinches at the sound — a full-body shudder that sends it cowering against the wall, arms wrapping around its massive frame. It is afraid. It is eight feet tall and assembled from the dead, and it is afraid of the sound of breaking glass. You stare at it and the revulsion rises in your throat like bile. Two years. Two years of work, of sacrifice, of descent into madness — and this is what you have made. Not a triumph of science. Not a conqueror of death. A terrified, confused creature that looks at you the way a newborn looks at its mother. And you feel nothing for it. Nothing but horror.'
      },
      {
        id: 'listen_to_creature_breathing',
        label: 'Listen to the creature\'s first breaths and sounds',
        keywords: ['listen', 'breathing', 'sounds', 'creature', 'breaths', 'hear', 'noise'],
        discovery: 'You stand frozen and listen. The creature\'s breathing fills the room — wet, labored, each breath a small battle against lungs that have never drawn air. Between the breaths, other sounds: a low moan from deep in its chest, the scrape of its fingers on the table, the creak of its joints as it shifts its massive frame. And then a new sound — not a moan, not a cry, but something shaped. Almost a word. Almost a plea. The creature is trying to speak. In its first minutes of life, with lungs that have never breathed and a tongue that has never moved, it is trying to form language. The sound is terrible and beautiful and it breaks something inside you that you did not know was still intact.'
      },
      {
        id: 'check_switch_position',
        label: 'Look at the switch you just pulled',
        keywords: ['switch', 'look', 'pulled', 'copper', 'position', 'handle', 'examine'],
        discovery: 'You look down at the copper switch. It is in the down position — the circuit closed, the current flowing, the deed done. Your hand is still on it. Your fingers are white-knuckled, locked around the handle as if your body is trying to pull it back, to undo what you have done. But there is no undoing this. The switch is thrown. The current has flowed. The creature is alive. You release the switch and your hand drops to your side, trembling. The copper is warm from your grip. The apparatus hums behind you, its work done, its purpose fulfilled. You wish you had never built it.'
      },
      {
        id: 'search_for_escape',
        label: 'Look for a way out of the laboratory',
        keywords: ['escape', 'way', 'out', 'door', 'exit', 'laboratory', 'leave', 'flee'],
        discovery: 'Your eyes dart around the laboratory. The door — behind you, ten steps, the handle cold brass. The window — too small. The skylight — twenty feet up, the ladder still propped against the wall. The creature watches your eyes move. It tracks each glance with the desperate attention of a creature that has just learned that the world contains things worth watching. It sees you looking at the door. It does not understand what a door is. But it understands — with the instinct of the newly born — that you are thinking about leaving. Its hand reaches toward you. Its lips move. The moan becomes something shaped: a sound like "Mmm..." Not a word. Not yet. But the beginning of one. The beginning of a plea that will haunt you for the rest of your life.'
      }
    ],
    exitAction: 'animate_creature',
    exitLabel: 'Face the horror of what you have created',
    hardExitNarration: 'You stumble backward. The creature breathes. Its eyes follow you. And you know — with a certainty that turns your blood to ice — that you cannot stay here. You cannot be near this thing you have made. The door is behind you. Ten steps. You take them.',
    initialFacts: {
      items: ['journal'],
      metNPCs: ['victor frankenstein', 'elizabeth', 'caroline frankenstein', 'alphonse frankenstein', 'professor waldman', 'professor krempe'],
      established: ['laboratory is ready', 'creature is assembled', 'voltaic apparatus is charged', 'Victor is alone']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'university', 'lecture hall', 'cemetery', 'charnel house', 'de lacey cottage', 'geneva', 'arctic']
    }
  },

  scene_06: {
    sceneId: 'scene_06',
    sceneName: 'The Creature\'s First Moments',
    description: `The creature breathes. Its chest rises and falls with a rhythm that is almost human — but too deep, too slow, as if each breath costs it effort. Its eyes move — not smoothly, but in jerks, like a newborn animal trying to focus on a world it has never seen. The pale blue irises catch the lamplight and reflect it back with a faint, animal luminescence.

It tries to sit up. The movement is clumsy, uncoordinated — massive limbs flailing against the table, fingers gripping the edges with a strength that cracks the wood. It makes a sound. Not a word, not a cry, but a low, guttural moan that rises from somewhere deep in its chest. The sound of a creature that has just discovered it can make sounds.

It looks at you. Not with recognition — it has no memories, no context, no understanding of what it is or who you are. But with something worse: need. The desperate, helpless need of a newborn for the one who made it. Its lips move. The moan becomes something shaped — almost a word, almost a plea. Its hand reaches toward you, fingers spread, trembling.

You back away. Your hip strikes the workbench. Glass jars crash to the floor. The creature flinches at the sound — a full-body shudder that sends it cowering against the wall, arms wrapped around its massive frame, eyes wide with terror.

It is afraid. It is eight feet tall and assembled from the dead, and it is afraid of the sound of breaking glass. And it is looking at you the way a child looks at a parent — for comfort, for safety, for love.

You cannot give it any of those things.`,
    content: [
      {
        id: 'approach_creature',
        label: 'Step forward and try to calm the creature',
        keywords: ['approach', 'calm', 'step', 'forward', 'comfort', 'soothe', 'reach'],
        discovery: 'You take a step forward. The creature watches you with those pale, watery eyes — tracking your movement with the intensity of a lost dog watching its master. You extend your hand. It reaches out — its fingers are long, cold, and strong enough to crush yours like twigs — but the touch is gentle. Tentative. It holds your hand the way a drowning man holds a rope. Then it makes a sound: a soft, questioning hum, almost a purr. It is asking you, in the only language it knows, if it is safe. If you are its friend. If the world is kind. You pull your hand away. The creature\'s face crumples.'
      },
      {
        id: 'flee_creature',
        label: 'Run from the laboratory',
        keywords: ['flee', 'run', 'escape', 'leave', 'door', 'away', 'horror'],
        discovery: 'You turn and run. Your hand finds the door handle — cold brass, solid, real — and you wrench it open. Behind you, the creature makes a sound that stops you in the doorway. Not a moan this time, but a cry — high, thin, heartbreaking. The cry of a newborn abandoned by the one who brought it into the world. You do not look back. You run down the corridor, down the stairs, out into the Ingolstadt night, and you do not stop until the laboratory is a distant light in a window and the creature\'s cry has faded to nothing.'
      },
      {
        id: 'study_creature',
        label: 'Watch the creature\'s behavior and try to understand it',
        keywords: ['study', 'watch', 'observe', 'behavior', 'understand', 'creature', 'analyze'],
        discovery: 'You force yourself to watch. The creature explores its own body with clumsy fascination — touching its face, flexing its fingers, opening and closing its mouth. It discovers its reflection in a glass jar and stares, tilting its massive head. It does not recognize itself. It reaches behind the jar, looking for the other creature it sees, and when it finds nothing, it makes a small, confused sound. Then it looks at you again. And in its eyes, you see something that will haunt you for the rest of your life: the absolute, unquestioning trust of a child for its parent.'
      },
      {
        id: 'speak_to_creature',
        label: 'Try to speak to the creature',
        keywords: ['speak', 'talk', 'say', 'words', 'voice', 'address', 'creature'],
        discovery: 'You open your mouth. What comes out is not words but a croak — dry, terrified, inhuman. The creature tilts its head. It tries to mimic the sound: a low, rough approximation of your voice, shaped by lips and a tongue that have never formed speech. It tries again. And again. Each attempt is closer to something human. It is learning. Already. In its first minutes of life, it is learning. And the thing it is trying to learn is how to speak to you.'
      }
    ],
    exitAction: 'abandon_creature',
    exitLabel: 'Run from the laboratory in horror',
    hardExitNarration: 'You stumble into the corridor and slam the door behind you. The lock clicks. Through the wood, muffled but unmistakable, you hear the creature\'s cry — a long, desolate wail that follows you down the stairs and out into the night. It does not stop. Even when you are three streets away, ears ringing, breath ragged, you can still hear it. You will hear it for the rest of your life.',
    initialFacts: {
      items: ['journal'],
      metNPCs: ['victor frankenstein', 'the creature'],
      established: ['creature is alive', 'creature is afraid', 'creature reaches for Victor', 'Victor has fled the laboratory']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'university', 'cemetery', 'charnel house', 'de lacey cottage', 'geneva', 'arctic']
    }
  },

  scene_07: {
    sceneId: 'scene_07',
    sceneName: 'Victor\'s Collapse',
    description: `The streets of Ingolstadt are slick with rain and empty at this hour. You have been walking for — you do not know how long. Your clothes are soaked through. Your hands shake so badly you cannot grip the railing of the bridge you cross and re-cross, as if the act of walking in circles might somehow undo what you have done.

Henry Clerval finds you at dawn, sitting on the steps of your lodgings, staring at nothing. He is dressed for travel — his trunk is in the cab behind him — and his face is bright with the excitement of a man who has just arrived to visit his dearest friend. The brightness dies when he sees your face.

'Victor!' He kneels beside you. His hand on your forehead is warm, real, human. 'My God, you are burning. What has happened? You look as if you have seen a ghost.' He tries to lift you. You weigh nothing to him — you have not eaten in days. 'Come inside. Come inside at once.'

Your lodgings are a ruin. The bed is unslept in. The desk is covered in papers — your journal, your notes, your sketches of the creature's anatomy. Clerval sees them and his face changes. He does not understand what he is looking at, but he understands that it has broken you.

'Victor,' he says quietly. 'Tell me what has happened.'

You cannot tell him. The words will not come. You open your mouth and the creature's cry comes out instead — that long, desolate wail — and Clerval catches you as you fall.`,
    content: [
      {
        id: 'tell_clerval',
        label: 'Try to tell Clerval what you have done',
        keywords: ['tell', 'clerval', 'explain', 'confess', 'what', 'happened', 'done'],
        discovery: 'You try to speak. The words come out in fragments — "created... life... dead... the body..." — and Clerval\'s face cycles through confusion, disbelief, and finally a pale, sick understanding. He does not believe you. He cannot believe you. But he sees the journal, the sketches, the apparatus notes, and the look in your eyes — the look of a man who has seen something that should not exist. "Victor," he whispers. "Whatever you have done, we will fix it. But first, you must eat. You must sleep. You are dying."'
      },
      {
        id: 'examine_lodgings',
        label: 'Look around your ruined lodgings',
        keywords: ['lodgings', 'room', 'look', 'examine', 'ruin', 'mess', 'papers'],
        discovery: 'Your lodgings tell the story of your descent. The walls are covered in anatomical sketches — muscle groups, nerve pathways, the placement of organs. Books are stacked in precarious towers: Galvani on animal electricity, Paracelsus on the creation of homunculi, Aldini on the reanimation of the dead. The floor is littered with failed experiments — tissue samples in jars, electrodes wrapped in copper wire, a glass plate from a Leyden jar cracked and discarded. And in the corner, half-hidden under a coat, a charnel house spade, its blade still stained with grave earth.'
      },
      {
        id: 'check_journal',
        label: 'Look at your journal to see what you wrote',
        keywords: ['journal', 'read', 'check', 'notes', 'written', 'entries'],
        discovery: 'Your journal lies open on the desk. The last entry is in handwriting you do not recognize — jagged, desperate, the letters growing larger and more erratic as the entry progresses: "It is alive. God help me, it is alive. And it looked at me with the eyes of a child and I ran. I ran from my own creation. What have I done? What have I become?" Below that, in smaller, steadier hand: "I cannot go back to the laboratory. I cannot face it. I cannot face what I have made."'
      },
      {
        id: 'collapse_sleep',
        label: 'Allow Clerval to put you to bed',
        keywords: ['sleep', 'bed', 'rest', 'collapse', 'clerval', 'help', 'lie'],
        discovery: 'Clerval guides you to the bed. You lie down and the room spins. His hand is on your forehead — cool, steady, the hand of a friend who will not leave you. "I am here, Victor," he says. "I will not leave." You close your eyes and the darkness takes you. In your dreams, the creature stands in a field of white flowers, reaching for you with those long, gentle fingers. It is smiling. And behind it, the flowers are dying.'
      }
    ],
    exitAction: 'fall_ill',
    exitLabel: 'Give in to the fever and let collapse take you',
    hardExitNarration: 'The fever takes you like a wave. For weeks, you burn — raving, shaking, calling out names that Clerval does not recognize. He tends you through every hour, changing your sheets, forcing broth between your lips, listening to your nightmares. When you finally wake, clear-headed and weak as a child, the first thing you see is Clerval\'s face, drawn with worry but smiling. "Welcome back," he says. "You have been gone a long time."',
    initialFacts: {
      items: ['journal'],
      metNPCs: ['victor frankenstein', 'the creature', 'henry clerval'],
      established: ['Victor has fled the laboratory', 'creature is alive and abandoned', 'Clerval has found Victor', 'Victor is collapsing from guilt and exhaustion']
    },
    locationKeywords: {
      banned: ['laboratory', 'cemetery', 'charnel house', 'de lacey cottage', 'geneva', 'arctic']
    }
  },

  scene_08: {
    sceneId: 'scene_08',
    sceneName: 'The Laboratory Abandoned',
    description: `Three months have passed since the fever broke. Clerval has nursed you back to health with the patience of a saint and the stubbornness of a mule. You can walk now. You can eat. You can even smile, though the smiles feel like masks.

But you have not returned to the laboratory. You have not dared.

Today, Clerval has gone to the post office. The lodgings are quiet. The spring sun streams through the window, warm and innocent, and you sit at the desk staring at the key to the laboratory. You have carried it in your pocket for three months, turning it over and over in your fingers until the edges are smooth.

The creature is gone. You know this because the university has not reported a monster roaming the halls. No bodies have been found. No screams in the night. Whatever you created, it has vanished into the world — eight feet tall, yellow-skinned, with the eyes of a newborn and the strength of ten men.

You should be relieved. Instead, you are terrified. Because a creature that large, that strange, that new to the world cannot simply disappear. It is somewhere. It is learning. It is growing. And it remembers the face of the one who made it and abandoned it.

The key is warm in your hand. The laboratory is three streets away. You could go. You could see what remains. You could find some trace of where the creature went.

Or you could throw the key in the river and pretend none of it ever happened.`,
    content: [
      {
        id: 'go_to_lab',
        label: 'Take the key and walk to the laboratory',
        keywords: ['laboratory', 'lab', 'go', 'walk', 'key', 'return', 'visit'],
        discovery: 'You walk the three streets to the university with the key clutched in your fist. The laboratory door is exactly as you left it — locked, the wood warped slightly from the rain. You fit the key. The lock turns with a click that echoes in the empty corridor. Inside, the laboratory is dark and still. The voltaic apparatus sits on the workbench, cold and dead. The Leyden jars are empty. The table is bare. No creature. No body. No sign that anything happened here at all — except for the scratches. Deep, parallel grooves in the wooden table, made by fingernails. Ten of them. The creature clawed its way off the table and out of the room. You follow the scratches to the window. It is open. The creature climbed out. Into the night. Into the world.'
      },
      {
        id: 'throw_key',
        label: 'Walk to the river and throw the key in',
        keywords: ['throw', 'key', 'river', 'water', 'discard', 'bridge'],
        discovery: 'You walk to the bridge over the Danube and hold the key over the railing. The water below is dark and fast. You open your fingers. The key falls — a small, bright flash in the sunlight — and the river swallows it without a ripple. It is done. The laboratory is locked forever. Whatever happened in that room will stay in that room. You turn away from the river and walk back to your lodgings with a lighter step and a heavier heart. But as you cross the square, you notice something: scratch marks on the wall of the church. Long, parallel grooves, made by fingernails. The creature passed through here. The creature is still in Ingolstadt.'
      },
      {
        id: 'search_for_creature',
        label: 'Search the streets around the university for signs of the creature',
        keywords: ['search', 'creature', 'signs', 'tracks', 'streets', 'look', 'find'],
        discovery: 'You walk the streets around the university, searching. At first, nothing. Then, in an alley behind the butcher\'s shop, you find a nest — a hollow in the straw where something large has been sleeping. The straw is matted with a substance you recognize: the salve you applied to the creature\'s skin to keep it supple. It was here. Recently. And beside the nest, a half-eaten turnip, stolen from a market stall. The creature is surviving. Barely. On stolen vegetables and scraps. It is alone in a world that will scream at the sight of it, and it is hungry.'
      },
      {
        id: 'burn_notes',
        label: 'Burn your laboratory notes and sketches',
        keywords: ['burn', 'notes', 'sketches', 'papers', 'destroy', 'fire', 'documents'],
        discovery: 'You build a fire in the grate and feed it your notes, one page at a time. The anatomical sketches curl and blacken. The galvanic calculations turn to ash. The creature\'s face — rendered in careful charcoal — stares up at you from the flames until the fire takes it. You burn everything. Every scrap of evidence. Every trace of what you did. When Clerval returns, the grate is full of ash and you are sitting at the desk with empty hands and a face like stone. He does not ask what you burned. He knows. He sits beside you and puts his hand on your shoulder, and you both stare at the ashes in silence.'
      }
    ],
    exitAction: 'leave_lab_behind',
    exitLabel: 'Leave the laboratory and its horrors behind',
    hardExitNarration: 'You close the door of the laboratory for the last time. The lock clicks. The key is at the bottom of the Danube. The notes are ashes. The creature is gone — somewhere in the world, alone, learning, growing, remembering. You walk back to your lodgings in the spring sunshine, and you tell yourself that it is over. You know it is a lie.',
    initialFacts: {
      items: ['journal'],
      metNPCs: ['victor frankenstein', 'the creature', 'henry clerval'],
      established: ['three months have passed', 'Victor has recovered from fever', 'creature has escaped the laboratory', 'creature is somewhere in Ingolstadt', 'Victor has not told anyone the truth']
    },
    locationKeywords: {
      banned: ['cemetery', 'charnel house', 'de lacey cottage', 'geneva', 'arctic']
    }
  },

  scene_09: {
    sceneId: 'scene_09',
    sceneName: 'The Letter from Geneva',
    description: `The letter arrives on a Tuesday. The handwriting on the envelope is your father's — careful, measured, the hand of a man who has written many letters and never wasted a word. You break the seal with a trembling finger.

"Victor, my son — I write with heavy heart. Your brother William is dead."

The words blur. You read them again. They do not change.

"William went missing from the garden three nights ago. We searched until dawn. Elizabeth found his body at the edge of the woods. He had been —" The next word is crossed out, replaced with: "strangled. His neck bore marks that were not human. The servants found Justine Moritz asleep in a nearby barn, a locket belonging to William in her pocket. She has been arrested for his murder. She protests her innocence, but the evidence is damning. Come home, Victor. Come home at once."

The letter falls from your hands. William. Little William, with his bright eyes and his laugh that sounded like bells. Dead. Strangled. With marks that were not human.

You know what killed him. You know with a certainty that turns your blood to ice. The creature. Your creature. The thing you made and abandoned and set loose upon the world. It has found your family. It has killed your brother. And Justine — innocent, kind Justine — will hang for a crime your creation committed.

Clerval finds you staring at the letter. He reads it over your shoulder. His hand finds yours. "Victor," he says. "We leave for Geneva tonight."`,
    content: [
      {
        id: 'read_letter',
        label: 'Read the letter again, searching for details',
        keywords: ['letter', 'read', 'again', 'details', 'father', 'william'],
        discovery: 'You read the letter again, forcing yourself to absorb every word. William disappeared at dusk. The search lasted all night. Elizabeth found the body — your father could not bring himself to describe what she saw. The marks on William\'s neck were "not human" — too wide, too strong, made by hands not fingers. Justine was found with the locket, asleep, remembering nothing. She claims she was visiting her mother and fell asleep in the barn. No one believes her. Your father writes: "I do not believe Justine capable of this crime, but the magistrate is certain of her guilt. She will be tried within the fortnight."'
      },
      {
        id: 'blame_yourself',
        label: 'Acknowledge to yourself that this is your fault',
        keywords: ['fault', 'blame', 'guilt', 'my', 'responsibility', 'caused', 'created'],
        discovery: 'You sit at the desk and the truth settles over you like a shroud. You created the creature. You abandoned it. You set it loose upon a world that would recoil from it in horror. And now it has killed — not randomly, not in desperation, but deliberately. It found your family. It killed your brother. It is punishing you. The way a child punishes a parent who abandoned it. The guilt is a physical weight — pressing on your chest, closing your throat, blurring your vision. You cannot breathe. You cannot think. You can only sit and stare at the letter and know that every death from this moment forward is on your hands.'
      },
      {
        id: 'console_elizabeth',
        label: 'Think of Elizabeth and what she must be feeling',
        keywords: ['elizabeth', 'think', 'feel', 'grief', 'loss', 'william', 'comfort'],
        discovery: 'Elizabeth. She found the body. She held William\'s broken form in her arms and called for help that came too late. You know her — her gentleness, her love for the children, her quiet strength. This will have destroyed her. And she does not know what you know. She does not know that the monster that killed William was not a man, not a beast, but something in between — something you made. You will have to face her. You will have to look into her eyes and keep the secret that would shatter her if she knew.'
      },
      {
        id: 'pack_for_geneva',
        label: 'Begin packing for the journey to Geneva',
        keywords: ['pack', 'prepare', 'geneva', 'journey', 'leave', 'travel', 'go'],
        discovery: 'You move through the lodgings like a ghost, gathering clothes, money, the few possessions you have not burned. Clerval packs his own bag with quiet efficiency. He does not speak. He knows there are no words for this. As you close your trunk, your hand brushes something hard at the bottom — a notebook you forgot to burn. Inside, in your own handwriting, the creature\'s measurements, its construction, the details of its animation. You stare at it for a long moment. Then you close the trunk on it and carry it downstairs. You cannot burn it. Not yet. It is the only proof that the creature exists. And you may need it.'
      }
    ],
    exitAction: 'depart_for_geneva',
    exitLabel: 'Leave for Geneva with Clerval',
    hardExitNarration: 'The coach pulls away from the lodgings in the grey light of early morning. Clerval sits beside you, silent, his hand on your arm. The road to Geneva stretches south through the German countryside — green, peaceful, indifferent to the grief that fills the coach like smoke. You do not speak. You stare at the passing landscape and see nothing but the face of a creature with pale blue eyes, reaching for you with gentle hands. And behind it, smaller, stiller, the face of a boy who will never laugh again.',
    initialFacts: {
      items: ['journal', 'father\'s letter'],
      metNPCs: ['victor frankenstein', 'the creature', 'henry clerval'],
      established: ['William is dead', 'Justine is accused of the murder', 'Victor knows the creature killed William', 'Victor is consumed by guilt', 'traveling to Geneva']
    },
    locationKeywords: {
      banned: ['laboratory', 'cemetery', 'charnel house', 'de lacey cottage', 'arctic']
    }
  }
};
