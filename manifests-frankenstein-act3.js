/**
 * Frankenstein — Act 3 Manifests: The Creature's Education
 * Scenes 10-14: The creature's self-education, the De Lacey family, growing despair
 */

module.exports = {
  scene_10: {
    sceneId: 'scene_10',
    sceneName: 'The Forest Awakening',
    description: `You open your eyes to a world of green and gold. Sunlight filters through a canopy of ancient oaks, dappling the forest floor in coins of light. Birds sing — a sound so ordinary, so human, that for a moment you forget what you are. Then you look down at your hands — massive, yellow-skinned, the veins dark beneath translucent flesh — and you remember.

You are in a forest. You do not know how you got here. The last thing you remember is the laboratory — the man with the terrified eyes, the sound of a door slamming, the darkness. You climbed through a window and ran. How far? How long? You do not know. Time means nothing to you yet. You are days old.

The forest is overwhelming. Every sound is new — the rustle of leaves, the crack of a twig, the distant rush of water. Every sensation is raw — the rough bark of the tree you lean against, the cool earth beneath your bare feet, the warmth of sunlight on your skin. You are a giant in a world of small things, and everything is terrifying and beautiful and incomprehensible.

Nearby, a stream catches the light. Your reflection stares back at you from the water — and you recoil. The face is wrong. The skin is wrong. The eyes are wrong. You are wrong. You do not know the word "monster" yet, but you feel it — a deep, instinctive understanding that you do not belong in this world of birdsong and sunlight.

You are hungry. You are cold. You are alone. And somewhere in the distance, you smell smoke.`,
    content: [
      {
        id: 'drink_from_stream',
        label: 'Cup your hands and drink from the stream',
        keywords: ['drink', 'stream', 'water', 'cup', 'hands', 'thirsty', 'cold'],
        discovery: 'You kneel at the stream and cup your hands. The water is cold — shockingly cold — and it tastes of stone and sky. You drink until your stomach aches. As you lean over the water, you see your face again. This time, you do not recoil. You study it. The skin is yellow, like old parchment. The eyes are pale blue, set too deep. The hair is black and lustrous. The features are... not ugly. Not beautiful. Wrong. Assembled. Like a face drawn by someone who has seen the parts but never the whole.'
      },
      {
        id: 'follow_smoke',
        label: 'Follow the smell of smoke through the trees',
        keywords: ['smoke', 'follow', 'smell', 'fire', 'village', 'cottage', 'distance'],
        discovery: 'You rise and follow the scent through the trees. The smoke leads you to the edge of the forest, where a clearing opens onto a small farmstead. A cottage with a thatched roof. A garden. A goat tethered to a post. And through the window, the glow of a fire and the sound of voices — human voices, warm and alive. You crouch behind a tree and watch. A man comes to the door and calls something into the night. A woman answers from inside. The sound of their words means nothing to you, but the tone — the warmth, the familiarity, the love — means everything. You have never heard love before. You do not know what it is. But you know that you want it.'
      },
      {
        id: 'explore_forest',
        label: 'Explore the forest and discover what it offers',
        keywords: ['explore', 'forest', 'walk', 'discover', 'trees', 'animals', 'world'],
        discovery: 'You walk deeper into the forest. Everything is new. A deer startles at your approach and bounds away — the first living creature you have seen that is not human. You follow it, marveling at its grace, its speed, its effortless belonging in this world. A rabbit sits in a patch of sunlight, nose twitching. You reach for it and it bolts. You are too large, too strange, too wrong for this gentle place. But the forest itself does not judge you. The trees stand silent and indifferent. The moss grows on the north side of the trunks. The mushrooms cluster in the shade. The world goes on, and you are part of it, whether it knows it or not.'
      },
      {
        id: 'find_shelter',
        label: 'Search for shelter as night approaches',
        keywords: ['shelter', 'night', 'cold', 'cave', 'hollow', 'tree', 'hide'],
        discovery: 'As the light fades, the forest changes. The birds fall silent. The shadows deepen. The temperature drops and your massive body — built for no climate, for no purpose — begins to shake. You find a hollow beneath a fallen oak, carpeted with dry leaves. It is barely large enough for your frame, but it is shelter. You crawl inside and curl your body around itself, arms wrapped around your knees, and listen to the night. Owls. The distant howl of wolves. The creak of branches in the wind. You do not sleep. You do not know how. You lie in the dark and stare at the stars through a gap in the canopy and wonder what you are.'
      }
    ],
    exitAction: 'discover_fire',
    exitLabel: 'Approach the cottage and discover the warmth of fire',
    hardExitNarration: 'Dawn comes grey and cold. You crawl from your hollow and stand in the forest, stiff and hungry and alone. The smoke from the cottage rises in a thin thread against the pale sky. You follow it. You have nothing else.',
    initialFacts: {
      items: [],
      metNPCs: ['the creature'],
      established: ['creature is alone in the forest', 'creature can see its reflection', 'creature is drawn to human warmth', 'creature does not yet understand language']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'university', 'laboratory', 'de lacey cottage interior', 'geneva', 'arctic']
    }
  },

  scene_11: {
    sceneId: 'scene_11',
    sceneName: 'The De Lacey Cottage',
    description: `The cottage sits at the edge of a wood in the outskirts of a small village. It is modest — two rooms, a thatched roof, a garden fenced with sticks. But to you, it is a cathedral. Through the gaps in the wooden walls, you have watched the family for weeks. You know their rhythms. You know their names — though you learned them by listening, by piecing together sounds and meanings like a puzzle with no picture on the box.

The old man is De Lacey. He is blind. His hands move over a guitar with the confidence of a musician who has played for decades. His voice, when he speaks, is gentle and educated — the voice of a man who once had wealth and lost it.

The young woman is Agatha — his daughter. She is beautiful in a quiet, sorrowful way, with dark eyes and hands that are never still. She cooks, she cleans, she tends the garden, and she sings when she thinks no one is listening.

The young man is Felix — Agatha's brother. He is tall, dark-haired, quick to smile. He teaches the old man to speak French. He chops wood. He carries water. He is the strength of this family, and he carries it without complaint.

And then there is the Arabian. Safie. She arrived three days ago on a horse so tired it could barely stand. She is dark-skinned, dark-eyed, and she speaks no French. Felix teaches her as he teaches his father — with patience, with warmth, with a tenderness that makes your chest ache.

You live in the lean-to attached to the cottage wall. Through a crack in the boards, you watch them. You learn their language. You learn their customs. You learn what it means to be human by watching humans who have no idea you exist.`,
    content: [
      {
        id: 'watch_family',
        label: 'Observe the family through the crack in the wall',
        keywords: ['watch', 'observe', 'family', 'crack', 'wall', 'lean-to', 'look'],
        discovery: 'You press your eye to the crack. The family is gathered around the fire. The old man plays his guitar — a melody you have heard before, soft and sad. Agatha embroiders. Felix reads aloud from a book, translating for Safie, who listens with fierce concentration. The firelight paints their faces in gold and shadow. They are beautiful. Not because they are handsome or pretty, but because they are together. Because they belong to each other. Because they are loved. You press your hand against the wall and feel the warmth of their fire through the wood, and you ache with a loneliness so vast it has no edges.'
      },
      {
        id: 'listen_to_lessons',
        label: 'Listen to Felix teaching Safie French',
        keywords: ['listen', 'learn', 'language', 'french', 'teach', 'felix', 'safie', 'words'],
        discovery: 'Felix points to objects and names them. "La table," he says. "Le feu." "Le pain." Safie repeats each word carefully, her accent thick, her determination fierce. You repeat them too — silently, in the darkness of your lean-to, shaping the sounds with lips and tongue that have never formed French. Table. Fire. Bread. You learn as Safie learns, word by word, building a language from nothing. By the end of the week, you know fifty words. By the end of the month, you know five hundred. And with the words come concepts: love, family, home, beauty, sorrow. The words are keys, and each one unlocks a room in your mind that you did not know existed.'
      },
      {
        id: 'read_books',
        label: 'Take the books Felix leaves on the windowsill',
        keywords: ['books', 'read', 'windowsill', 'take', 'paradise lost', 'plutarch', 'sorrows'],
        discovery: 'Felix leaves books on the windowsill when the weather is fine. You take them at night, careful, silent, and return them before dawn. The first is "The Sorrows of Young Werther" — a story of a man who loves a woman he cannot have and destroys himself for it. You read it by moonlight, sounding out the words, and you weep. You weep because Werther\'s pain is your pain — the pain of wanting something you can never possess. The second book is "Plutarch\'s Lives" — stories of great men who shaped the world. You read about heroes and tyrants, about courage and cruelty, and you wonder which one you are. The third book changes everything: "Paradise Lost" by John Milton. You read it three times. And in Satan\'s words — "Better to reign in Hell than serve in Heaven" — you find a mirror of yourself.'
      },
      {
        id: 'gather_food',
        label: 'Gather nuts and berries from the forest for the family',
        keywords: ['gather', 'food', 'nuts', 'berries', 'forest', 'leave', 'gift'],
        discovery: 'You begin leaving gifts. Nuts, gathered from the forest floor. Berries, plucked from bushes the family does not visit. Firewood, chopped with your bare hands and stacked neatly by the door. The family is puzzled. Agatha crosses herself. Felix examines the wood with a frown. The old man smiles and says, "Perhaps we have a guardian angel." You hear this through the wall and your heart — your strange, borrowed, impossible heart — swells. A guardian angel. That is what you want to be. That is what you are trying to be.'
      },
      {
        id: 'study_own_reflection',
        label: 'Study your reflection in the stream and try to understand what you are',
        keywords: ['reflection', 'stream', 'study', 'face', 'what', 'am', 'understand'],
        discovery: 'You go to the stream and stare at your reflection. The face that stares back is assembled from the dead — you know this now, from the books, from the lessons, from the slow awakening of a mind that was built from nothing. You are not human. You are not animal. You are something else — something made, something crafted, something that should not exist. And yet you do exist. You think. You feel. You ache with loneliness and burn with curiosity and weep at beauty. If that is not being alive, what is? You touch the water and the reflection ripples and breaks. When it reforms, the face is the same. Wrong. Assembled. Yours.'
      }
    ],
    exitAction: 'approach_family',
    exitLabel: 'Plan to approach the family and reveal yourself',
    hardExitNarration: 'You return to your lean-to with a decision made. You will approach the old man — the blind one. He cannot see your face. He cannot recoil from your appearance. He will hear your words, your educated, careful words, and he will judge you by what you say, not by what you look like. Tomorrow. You will go tomorrow.',
    initialFacts: {
      items: ['Paradise Lost', 'Plutarch\'s Lives', 'The Sorrows of Young Werther'],
      metNPCs: ['the creature', 'felix de lacey', 'agatha de lacey', 'de lacey (old man)', 'safie'],
      established: ['creature lives in lean-to beside the cottage', 'creature has learned language by listening', 'creature reads the family\'s books', 'creature leaves gifts for the family', 'creature plans to approach the blind old man']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'university', 'laboratory', 'geneva', 'arctic']
    }
  },

  scene_12: {
    sceneId: 'scene_12',
    sceneName: 'The Old Man\'s Kindness',
    description: `The morning is bright and warm. Through the crack in the wall, you watch Felix, Agatha, and Safie leave for the village market. They will be gone for hours. The old man sits alone by the fire, his guitar across his knees, his sightless eyes turned toward the window where sunlight streams in golden bars.

This is the moment. You have rehearsed it a hundred times in the darkness of your lean-to — the words you will say, the tone you will use, the way you will present yourself. You are terrified. Your hands shake. Your borrowed heart hammers against your borrowed ribs. But the loneliness is worse than the fear. The loneliness is a wound that will not close.

You straighten your massive frame. You smooth the rough cloth you have fashioned into a tunic. You take a breath — the deep, rattling breath of a creature that breathes not because it must but because it has learned to — and you knock on the door.

"Come in," says the old man, turning his head. "Felix? Is that you? You are early."

You open the door. The cottage is warm, close, smelling of bread and herbs and human life. The old man sits in his chair, his face expectant, his blind eyes searching for a sound.

"Sir," you say. Your voice is deep, rough, the voice of a creature that has learned to speak from books and eavesdropping. "I am a traveler. I am tired and friendless. Might I rest in your cottage for a while?"

The old man smiles. "Enter, friend. You are welcome in this house."`,
    content: [
      {
        id: 'speak_to_de_lacey',
        label: 'Sit by the fire and speak with the old man',
        keywords: ['speak', 'talk', 'de lacey', 'old man', 'sit', 'fire', 'conversation'],
        discovery: 'You sit across from the old man and speak. You tell him you are a traveler — alone, without family, without friends. You tell him you have been wandering for months. You tell him you have read books — Milton, Plutarch, Goethe — and his face lights up. "A scholar!" he exclaims. "In these humble surroundings! Tell me, friend, what moved you most in Milton?" You tell him about Satan — about the fallen angel who chose defiance over submission, who would rather reign in Hell than serve in Heaven. The old man listens, his head tilted, his blind eyes bright. "You have a poet\'s soul," he says. "Whatever your circumstances, whatever your appearance, you have a mind that soars." Your eyes fill with tears. No one has ever spoken to you like this. No one has ever seen past the surface to the mind beneath.'
      },
      {
        id: 'ask_about_family',
        label: 'Ask the old man about his family',
        keywords: ['family', 'ask', 'felix', 'agatha', 'tell', 'history', 'story'],
        discovery: 'The old man tells you their story. They were once wealthy — a respected family in Paris. Felix was a young man of promise. Agatha was celebrated for her beauty and kindness. But they were betrayed. A Turkish merchant, accused of crimes, was condemned to death. Felix, moved by justice, helped the merchant\'s daughter escape — Safie. For this, the family was ruined. Stripped of their wealth, imprisoned, exiled. They came here, to this cottage, to live in poverty and obscurity. "But we have each other," the old man says. "And that is wealth enough." He reaches across and pats your hand. His fingers brush your massive, yellow skin. He does not flinch. He cannot see.'
      },
      {
        id: 'ask_for_help',
        label: 'Ask the old man if he will accept you as a friend',
        keywords: ['accept', 'friend', 'help', 'stay', 'ask', 'welcome', 'belong'],
        discovery: 'You gather your courage. "Sir," you say, "I am... different. My appearance is such that people flee from me. I have no friend in the world. I have learned to speak, to read, to think, but I have never had a companion. Would you — could you — accept me? Not as a guest, but as a friend?" The old man is quiet for a long moment. Then he reaches out and finds your hand — his fingers closing around yours, feeling the cold skin, the too-long fingers, the wrongness of it — and he holds it. "My friend," he says, "I am blind. I judge men by their words and their deeds, not by their faces. And your words have been kind, your manner gentle, and your mind sharp. Whatever you look like, you are welcome here."'
      },
      {
        id: 'listen_to_guitar',
        label: 'Ask the old man to play his guitar',
        keywords: ['guitar', 'play', 'music', 'song', 'melody', 'ask', 'hear'],
        discovery: 'The old man smiles and lifts his guitar. "You are a man of taste," he says. He plays — a melody that is sad and beautiful, a song of longing and loss that speaks to something deep in your chest. You close your eyes and listen, and the music fills the cottage like water filling a vessel, finding every corner, every crack, every empty space. When he finishes, you are weeping. The old man hears your breath catch. "Music," he says gently, "is the language of the soul. And your soul, my friend, has much to say."'
      }
    ],
    exitAction: 'family_returns',
    exitLabel: 'Hear the family returning and prepare to meet them',
    hardExitNarration: 'The sound of footsteps on the path. Voices — Felix\'s laugh, Agatha\'s singing, Safie\'s accented French. The old man brightens. "My children return! Come, let me introduce you —" But you are already on your feet, your heart hammering, your hands shaking. The door opens. Felix sees you first. His face goes white. His mouth opens. And then he screams.',
    initialFacts: {
      items: ['Paradise Lost', 'Plutarch\'s Lives', 'The Sorrows of Young Werther'],
      metNPCs: ['the creature', 'felix de lacey', 'agatha de lacey', 'de lacey (old man)', 'safie'],
      established: ['creature spoke with the blind old man', 'old man accepted the creature as a friend', 'old man is blind and cannot see the creature', 'family is returning from the market']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'university', 'laboratory', 'geneva', 'arctic']
    }
  },

  scene_13: {
    sceneId: 'scene_13',
    sceneName: 'The Rejection',
    description: `Felix does not scream for long. The scream becomes a snarl. He seizes a wooden staff from beside the door and strikes you — once, twice, three times — with the desperate strength of a man defending his family from a monster. The blows land on your shoulders, your arms, your back. They hurt. Not the way a weapon hurts, but the way betrayal hurts — sharp, sudden, shattering.

Agatha faints. Safie pulls her from the room. The old man shouts — "Felix! Felix, what is happening?" — but Felix cannot hear him over the roaring in his own blood. He strikes you again and you stumble backward through the door, tripping over the threshold, falling into the garden. The staff breaks across your back. Felix grabs another.

You do not fight back. You could — you are eight feet tall and strong enough to tear the cottage apart — but you do not. You lie in the dirt and take the blows and look up at the face of the man you admired, the man whose family you wanted to join, the man whose kindness you craved like water, and you see nothing in his eyes but horror.

"Monster!" Felix screams. "Abomination! Get away from my family!"

You rise. You look at the cottage — the lean-to where you lived, the crack in the wall where you watched, the door where you knocked. You look at the old man, standing in the doorway, his blind face twisted with confusion and fear. You look at the garden where you left gifts of nuts and berries and firewood.

Then you turn and run. Into the forest. Into the darkness. Into the cold.

Behind you, the cottage door slams shut. And this time, no one opens it.`,
    content: [
      {
        id: 'endure_beating',
        label: 'Lie in the dirt and endure Felix\'s blows',
        keywords: ['endure', 'beat', 'blows', 'dirt', 'lie', 'take', 'suffer'],
        discovery: 'The blows rain down. You count them — not because the pain demands it, but because counting is something you learned from the books, and learning is all you have. One. Two. Three. The staff cracks. Felix grabs another. You could stop him. You could catch the staff in one hand and snap it like a twig. You could rise to your full height and roar and watch him flee. But you do not. Because the books taught you something else: that the measure of a soul is not what it can endure, but what it chooses not to inflict. You lie still. You take the blows. And when Felix finally stops, panting, his staff raised, his eyes wild — you look up at him and say, in your careful, learned voice: "I meant no harm. I only wanted to be your friend."'
      },
      {
        id: 'try_to_explain',
        label: 'Try to explain yourself to Felix',
        keywords: ['explain', 'speak', 'words', 'tell', 'friend', 'mean', 'harm'],
        discovery: 'You raise your hands — open, empty, the universal gesture of peace. "Please," you say. "I am not what you think. I have lived beside your cottage for months. I have listened to your father\'s music. I have read your books. I have learned your language. I left the gifts — the nuts, the berries, the firewood. I only wanted to belong." Felix\'s face contorts. "You — you are the one who has been watching us? Spying on my family?" The horror in his voice is worse than the staff. "You are a demon. A thing of darkness. And if you come near this cottage again, I will kill you."'
      },
      {
        id: 'look_back',
        label: 'Look back at the cottage one last time before fleeing',
        keywords: ['look', 'back', 'cottage', 'last', 'time', 'home', 'goodbye'],
        discovery: 'At the edge of the forest, you turn. The cottage is lit from within — warm, golden, alive. Through the window, you can see the old man sitting in his chair, his face bewildered. Agatha, revived, clings to Felix\'s arm. Safie stands apart, her dark eyes fixed on the doorway where you stood. For one moment — one impossible, heartbreaking moment — her eyes meet yours through the window. She does not scream. She does not recoil. She looks at you with something that might be pity, or understanding, or sorrow. Then Felix pulls the shutters closed, and the light goes out.'
      },
      {
        id: 'rage_in_forest',
        label: 'Give voice to your anguish in the dark forest',
        keywords: ['rage', 'anger', 'scream', 'forest', 'pain', 'grief', 'howl'],
        discovery: 'You run until the cottage is far behind. Then you stop, and the sound that comes from you is not human. It is not animal. It is the howl of a creature that has been given a soul and then shown that the soul is worthless — that no amount of learning, of kindness, of longing can overcome the accident of its appearance. You tear at the trees with your bare hands. You rip bark from trunks and hurl stones into the darkness. You roar until your throat is raw and the forest echoes with your grief. And when the rage passes, you lie on the forest floor and weep, and the weeping is worse than the rage, because the weeping is the sound of hope dying.'
      }
    ],
    exitAction: 'flee_into_night',
    exitLabel: 'Flee deeper into the forest',
    hardExitNarration: 'You run. The forest swallows you — branch and bramble, shadow and stone. You run until your legs buckle and your lungs burn and the cottage is a memory. You collapse beside a frozen stream and stare at the stars, and in their cold, indifferent light, you make a promise. You will find the man who made you. You will find your creator. And you will demand what every creature deserves: a companion. Someone to love. Someone who will not recoil at the sight of you.',
    initialFacts: {
      items: ['Paradise Lost', 'Plutarch\'s Lives', 'The Sorrows of Young Werther'],
      metNPCs: ['the creature', 'felix de lacey', 'agatha de lacey', 'de lacey (old man)', 'safie'],
      established: ['creature was beaten by Felix', 'creature did not fight back', 'family has rejected the creature', 'creature is devastated', 'creature will seek its creator']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'university', 'laboratory', 'geneva', 'arctic']
    }
  },

  scene_14: {
    sceneId: 'scene_14',
    sceneName: 'The Creature\'s Resolve',
    description: `The winter is the cruelest teacher. You learn what cold is — not the mild chill of a forest evening, but the killing cold of a mountain winter that turns your stolen clothes to ice and your breath to crystals. You learn what hunger is — not the mild discomfort of a missed meal, but the gnawing emptiness that makes you eat bark and roots and things that crawl beneath the snow. You learn what loneliness is — not the quiet solitude of your lean-to, but the vast, howling emptiness of a world that has no place for you.

You travel south, following the stars, following the faint thread of memory that leads back to the laboratory, to the man with the terrified eyes, to the place where you were made. You do not know his name. You know only his face — the sharp features, the dark eyes, the expression of horror that greeted your first breath. He made you. He owes you. He owes you a reason for your existence, and he owes you a companion to share it with.

The villages you pass through teach you quickly: do not be seen. A child screams at the sight of you. A farmer fires a gun. A mob with torches and dogs chases you through a field. You are faster, stronger, more enduring than any of them, but you are one and they are many, and the hatred in their eyes burns hotter than any torch.

You learn to travel by night. You learn to avoid roads. You learn to read the signs of human habitation — smoke, dogs, the sound of axes — and give them a wide berth. You are an exile in a world that was made for creatures like you to be born into, not assembled from.

But you do not despair. Not yet. Because you have a purpose now. You have a destination. You will find your creator. And when you do, you will make him understand what he has done.`,
    content: [
      {
        id: 'remember_de_lacey',
        label: 'Remember the old man\'s kindness and hold onto it',
        keywords: ['remember', 'de lacey', 'kindness', 'old man', 'hold', 'memory', 'warm'],
        discovery: 'In the coldest nights, when the wind cuts through your stolen clothes and the snow piles against your shelter, you close your eyes and remember the old man\'s voice. "You have a poet\'s soul." The words are a fire that no wind can extinguish. You replay the conversation — every word, every gesture, the warmth of his hand on yours. He accepted you. For one shining hour, someone saw past the yellow skin and the too-deep eyes and the assembled bones, and saw you. The memory sustains you. It is the only thing that does.'
      },
      {
        id: 'read_paradise_lost',
        label: 'Re-read Paradise Lost by firelight and find yourself in its pages',
        keywords: ['read', 'paradise', 'lost', 'milton', 'satan', 'firelight', 'book'],
        discovery: 'You huddle in a cave and read "Paradise Lost" by the light of a small fire. You read Satan\'s speech — "The mind is its own place, and in itself can make a Heaven of Hell, a Hell of Heaven" — and you understand. You are Satan. Not evil, but fallen. Created by a god who did not think about what he was creating, and then cast out into a world that was not made for you. You read further: "Which way I fly is Hell; myself am Hell." You close the book and stare at the fire. You are Hell. You are also the only creature in the world who knows it.'
      },
      {
        id: 'observe_family',
        label: 'Watch a family through their window and feel the old ache',
        keywords: ['watch', 'family', 'window', 'ache', 'lonely', 'observe', 'warmth'],
        discovery: 'You pass a farmhouse at dusk. Through the window, a family gathers around a table — a mother, a father, three children. The smallest child sits on the father\'s knee, laughing. The mother serves soup. The fire crackles. You stand in the snow and watch, and the ache in your chest is so vast it could swallow the world. You were made to feel. You were given a heart that loves, that yearns, that breaks. And then you were placed in a world where love is impossible for you. This is your creator\'s gift. This is his crime.'
      },
      {
        id: 'plan_confrontation',
        label: 'Plan what you will say to your creator when you find him',
        keywords: ['plan', 'creator', 'say', 'demand', 'find', 'confront', 'words'],
        discovery: 'You rehearse the words as you walk. "You made me. You gave me life — a life of suffering, of loneliness, of rejection. You owe me. You owe me a companion — a creature like me, who will not recoil at my touch, who will look at me and see not a monster but a mate. Create her for me, and I will leave the world of men forever. Refuse, and I will make you understand the depth of my despair." The words are good. Strong. Clear. You have learned from the books — from Werther, from Satan, from Plutarch\'s heroes. You know how to speak. You know how to argue. You know how to beg. And if begging fails, you know how to threaten.'
      }
    ],
    exitAction: 'journey_to_geneva',
    exitLabel: 'Continue the journey toward Geneva and your creator',
    hardExitNarration: 'The mountains rise before you — the Alps, white and terrible, their peaks lost in cloud. Beyond them lies Geneva. Beyond Geneva lies the man who made you. You pull your stolen coat tighter and begin to climb. The snow is deep. The wind is cruel. But you are stronger than the wind, and more enduring than the snow, and more determined than the mountain itself. You will find him. You will make him listen. And if he will not give you what you deserve, you will take what he loves.',
    initialFacts: {
      items: ['Paradise Lost', 'Plutarch\'s Lives', 'The Sorrows of Young Werther'],
      metNPCs: ['the creature', 'felix de lacey', 'agatha de lacey', 'de lacey (old man)', 'safie'],
      established: ['creature was rejected by the De Lacey family', 'creature is traveling to find its creator', 'creature has learned language, reading, and human customs', 'creature plans to demand a companion', 'creature is becoming bitter and desperate']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'university', 'laboratory', 'arctic']
    }
  }
};
