/**
 * Frankenstein — Act 4 Manifests: The Price
 * Scenes 15-19: The creature's demand, the Orkney workshop, destruction, revenge, Elizabeth's last letter
 */

module.exports = {
  scene_15: {
    sceneId: 'scene_15',
    sceneName: 'The Creature\'s Demand',
    description: `The mountain pass is a wound in the rock — a narrow track carved by centuries of wind and ice, flanked by walls of grey stone that rise to jagged peaks lost in cloud. The air is thin and bitter cold. Your breath comes in white plumes. Below, the Mer de Glace stretches like a frozen river, its surface cracked and blue, its crevasses deep enough to swallow a man whole.

You came here to be alone. To think. To grieve. William is dead. Justine has been executed for a crime she did not commit. And you know — you know with a certainty that eats at your soul like acid — that the creature you made is responsible. You have told no one. The secret burns in your chest like a coal.

You hear him before you see him. A sound like rock sliding on rock — the scrape of massive feet on stone. Then he appears, descending the cliff face with the ease of a spider, his yellow skin stark against the grey granite. He is larger than you remember. More confident. His pale blue eyes find yours and hold them with an intelligence that is no longer newborn but ancient — ancient in the way that suffering makes things ancient.

He drops to the path before you. Eight feet of assembled dead tissue, breathing the mountain air with lungs you built. His lips move. And when he speaks, his voice is deep, resonant, educated — the voice of a creature that has read Milton and Plutarch and Goethe, and has learned from them what it means to be alive and alone.

"You know why I have come," he says.`,
    content: [
      {
        id: 'listen_to_demand',
        label: 'Listen as the creature tells you what he wants',
        keywords: ['listen', 'demand', 'creature', 'want', 'speak', 'tell', 'ask'],
        discovery: 'The creature speaks with the careful precision of someone who has rehearsed this speech a thousand times. "I am alone, Victor. I am the only one of my kind in the world. You made me — you gave me life, and with it, the capacity to feel. And what I feel is loneliness so vast it could swallow the Alps. I have tried to be good. I have tried to be kind. I saved a girl from drowning. I gathered firewood for a blind old man. And for my kindness, I was beaten, shot, driven away like a beast. I need a companion. Someone like me. Someone who will not recoil at my touch. Create her for me, Victor. Create a female, and I will leave the world of men forever. We will vanish into the wilderness and you will never see us again."'
      },
      {
        id: 'refuse_creature',
        label: 'Refuse the creature\'s demand',
        keywords: ['refuse', 'no', 'deny', 'reject', 'never', 'demand', 'creature'],
        discovery: 'You draw yourself up. "I will not," you say. "I will not repeat the mistake I made with you. I will not unleash another monster upon the world." The creature\'s face — that terrible, assembled face — contorts with pain. "Monster," he repeats softly. "Is that what I am to you? Not a son. Not a creation. A monster." He steps closer. His shadow falls over you like a shroud. "Then hear me, my creator. If I cannot have love, I will have revenge. I will be with you on your wedding night. I will take from you what you have taken from me. And you will know — you will know — what it is to lose everything you love."'
      },
      {
        id: 'ask_creature_life',
        label: 'Ask the creature about his life since the laboratory',
        keywords: ['life', 'ask', 'creature', 'since', 'laboratory', 'story', 'tell'],
        discovery: 'The creature tells you his story. The forest. The hunger. The De Lacey cottage — the old blind man who accepted him, the family who beat him. The books he read: Milton, Plutarch, Goethe. The words he learned. The kindness he showed and the cruelty he received. "I saved a girl from drowning," he says, "and her companion shot me. I gathered firewood for a family, and they fled from me in terror. I spoke to a blind man, and his son beat me with a staff. Tell me, Victor — what would you have me do? What would you do, if the world treated you as it has treated me?" His voice breaks. And for a moment — one terrible, fleeting moment — you see not a monster but a child. Your child. Abandoned. Alone. Broken.'
      },
      {
        id: 'consider_demand',
        label: 'Consider the creature\'s ultimatum carefully',
        keywords: ['consider', 'think', 'ultimatum', 'demand', 'careful', 'weigh', 'decide'],
        discovery: 'You look at the creature — really look at him. He is magnificent and terrible. His body is powerful, his mind sharp, his words eloquent. But his eyes — those pale, watery eyes — are the eyes of a creature in agony. You built him to feel, and he feels everything: love, loneliness, rejection, despair. You gave him a soul and then placed him in a world that would never accept him. The guilt is a physical weight. And the threat — "I will be with you on your wedding night" — hangs in the air like the blade of a guillotine. You think of Elizabeth. You think of her grey-green eyes, her gentle hands, her voice reading poetry by the fire. And you know that you cannot risk her life. You cannot risk anyone\'s life. The creature must have what he wants, or he will destroy everything you love.'
      }
    ],
    exitAction: 'agree_to_create',
    exitLabel: 'Reluctantly agree to create a female companion',
    hardExitNarration: 'The creature watches you with those pale, unblinking eyes. "You will do it," he says. It is not a question. "You will create her, and we will leave, and you will be free. But if you betray me — if you destroy her, or refuse, or fail — I will be with you on your wedding night. Remember that, Victor. Remember it well." He turns and climbs the cliff face with terrible grace, and in moments he is gone — vanished into the grey stone and the grey sky, leaving you alone on the mountain with a promise and a threat.',
    initialFacts: {
      items: ['journal'],
      metNPCs: ['victor frankenstein', 'the creature'],
      established: ['creature has found Victor on the mountain', 'creature demands a female companion', 'creature threatens revenge if refused', 'creature has told his story', 'Victor is terrified for Elizabeth']
    },
    locationKeywords: {
      banned: ['laboratory', 'ingolstadt', 'de lacey cottage', 'arctic', 'geneva']
    }
  },

  scene_16: {
    sceneId: 'scene_16',
    sceneName: 'The Orkney Workshop',
    description: `The island is a scrap of rock and heather in the North Sea, three miles across, home to a handful of fishermen who live in stone cottages and speak a language you barely understand. You chose it for its isolation — no curious neighbors, no university colleagues, no one to ask questions about the strange Englishman who has rented the crofter's cottage at the end of the headland and never comes to the village.

The cottage is small and cold, with a stone floor and walls two feet thick. You have turned the main room into a laboratory — a smaller, meaner version of the one in Ingolstadt, but functional. A table. A workbench. Jars of preserving fluid. Electrodes. A voltaic pile, smaller than the first but sufficient. And on the table, under a sheet, the beginnings of a body.

She is smaller than the first creature — seven feet, not eight. You have made her differently: the proportions softer, the features finer, the skin less yellow and more pale. You do not know if the creature will find her beautiful. You do not know if beauty is something that can be built from the dead. But you try.

The work is slower this time. Not because the science is harder — you know the process now, every step, every technique. It is slower because you stop. You stand over the half-finished body and you think about what you are doing. You are creating a second monster. A female. With a mind and a soul and the capacity to feel. And you are giving her to the first monster as a companion, like a farmer breeding livestock.

Outside, the sea crashes against the cliffs. The wind howls. And somewhere on this island, watching from a distance, the creature waits.`,
    content: [
      {
        id: 'work_on_female',
        label: 'Continue assembling the female creature\'s body',
        keywords: ['work', 'assemble', 'female', 'body', 'continue', 'build', 'create'],
        discovery: 'You work with the precision of a man who has done this before. The muscles are easier this time — you know the tension, the placement, the way the fibers interweave. The bones are lighter, the joints more refined. You shape her face with particular care: high cheekbones, a straight nose, lips that curve naturally into something like a smile. But as you work, you catch yourself wondering: what will she think? What will she feel? Will she be grateful for the life you give her, or will she curse you for it, as the first creature has cursed you? And worse — what if they are not compatible? What if she rejects him? What if she is as horrified by him as the rest of the world? You will have created two monsters, both alone, both suffering, both your responsibility.'
      },
      {
        id: 'doubt_morality',
        label: 'Stop work and wrestle with the moral implications',
        keywords: ['doubt', 'moral', 'think', 'stop', 'wrestle', 'right', 'wrong'],
        discovery: 'You set down your tools and stare at the half-finished body on the table. What are you doing? You are creating a living being — a being with a mind and a soul — for the sole purpose of being a companion to another being. She will have no choice in this. No voice. No agency. She will wake in a world she did not ask for, in a body she did not choose, and she will be told: you exist because he needs you. Is that love? Is that justice? Or is it the act of a god playing with lives as carelessly as a child plays with dolls? You think of Elizabeth. Of her independence, her intelligence, her fierce, quiet strength. Would you want Elizabeth to exist solely for your benefit? The answer is no. And yet that is exactly what you are doing to this creature.'
      },
      {
        id: 'check_creature_watching',
        label: 'Look out the window to see if the creature is watching',
        keywords: ['window', 'look', 'creature', 'watching', 'outside', 'see', 'check'],
        discovery: 'You go to the window. The headland stretches out to a point of grey rock where the sea breaks in white spray. And there — standing at the very edge, silhouetted against the grey sky — is the creature. He is watching the cottage. He has been watching the cottage every day since you arrived. He does not approach. He does not speak. He simply stands there, a dark shape against the sky, waiting. Watching. Making sure you keep your promise. The sight of him fills you with a complex emotion — not just fear, not just guilt, but something deeper. He is your creation. Your child. Your sin. And he is waiting for you to give him the only thing in the world that might make his existence bearable.'
      },
      {
        id: 'write_to_elizabeth',
        label: 'Write a letter to Elizabeth, concealing your true work',
        keywords: ['write', 'letter', 'elizabeth', 'conceal', 'true', 'work', 'home'],
        discovery: 'You sit at the small desk and try to write to Elizabeth. The pen hovers over the paper. What can you say? "My dearest Elizabeth, I am well. I am working on a scientific project in Scotland. I will be home soon." The lies taste like ash. You want to tell her everything — the creature, the demand, the threat. But the creature\'s words echo in your mind: "Tell no one." If Elizabeth knew, she would be afraid. If she tried to help, she would be in danger. So you write the lies, seal the letter, and add it to the pile of unanswered truths that grows larger every day. You miss her. You miss her voice, her eyes, the way she reads poetry by the fire. You miss the man you were when you were with her. That man is dead. You killed him in the laboratory in Ingolstadt, on the night you pulled the switch.'
      }
    ],
    exitAction: 'continue_or_stop',
    exitLabel: 'Continue the work despite your doubts',
    hardExitNarration: 'You return to the table. The half-finished body lies under the sheet, waiting. You pull the sheet back and pick up your tools. The work continues. Outside, the creature stands on the headland, watching. The sea crashes. The wind howls. And piece by piece, the female creature takes shape — a body built from the dead, a life waiting to be sparked, a companion for a monster, a sin for a creator.',
    initialFacts: {
      items: ['journal', 'voltaic apparatus'],
      metNPCs: ['victor frankenstein', 'the creature'],
      established: ['Victor is on a remote Scottish island', 'Victor is creating a female creature', 'the creature watches from a distance', 'Victor is wracked with doubt', 'the female creature is half-finished']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'de lacey cottage', 'arctic', 'geneva']
    }
  },

  scene_17: {
    sceneId: 'scene_17',
    sceneName: 'The Destruction',
    description: `The female creature lies on the table, nearly complete. Her eyes are closed. Her chest does not rise. Her skin is pale — not yellow like the first creature, but white as marble, smooth and cold. Her hair is dark, spread across the table like a fan. Her features are delicate, almost beautiful. You have spent months on her — months of doubt, of self-loathing, of quiet horror at what you are doing.

And now, standing over her with the voltaic switch in your hand, you cannot do it.

You look at her face and you see Elizabeth. You see your mother. You see every woman who has ever been loved, and you think: I am about to create a being who will never be loved. Not truly. Not freely. She will exist because a monster demanded her. She will wake in a body made from the dead, in a world that will recoil from her, and she will be given to a creature who will love her with the desperate, consuming love of the utterly alone. And if she does not love him back? If she is as horrified by him as the rest of the world? What then? Two monsters, both suffering, both your responsibility, both cursing your name.

The creature is watching through the window. You can feel his eyes on you — pale, expectant, burning with a hope that makes your stomach turn.

You look at the switch. You look at the body. You look at the window where the creature watches.

And you make your choice.`,
    content: [
      {
        id: 'destroy_female',
        label: 'Tear the female creature apart with your bare hands',
        keywords: ['destroy', 'tear', 'apart', 'rip', 'hands', 'female', 'body', 'dismember'],
        discovery: 'You seize the body and tear it apart. Not with tools — with your bare hands, with a savagery that shocks you. You rip the limbs from the torso. You tear the face from the skull. You scatter the pieces across the laboratory — organs in jars, bones in the fire, skin in the acid bath. It takes minutes. It takes hours. You do not know. When it is done, you stand in the wreckage, breathing hard, your hands covered in preserving fluid and worse, and you feel — nothing. No relief. No triumph. Only the cold, dead certainty that you have just signed someone\'s death warrant. Because the creature is watching. And the creature will not forgive this.'
      },
      {
        id: 'look_at_creature_reaction',
        label: 'Turn to the window and face the creature\'s reaction',
        keywords: ['look', 'creature', 'window', 'reaction', 'face', 'turn', 'see'],
        discovery: 'You turn to the window. The creature is there — pressed against the glass, his face contorted with an emotion you have never seen on a human face. It is beyond rage. Beyond grief. It is the look of a being who has been promised hope and had it torn away, who has been shown the possibility of love and watched it dismembered before his eyes. His mouth opens. The sound that comes out is not a word — it is a howl, a keening, desolate wail that shakes the glass and echoes across the headland. Then he speaks, and his voice is quiet, controlled, and more terrifying than any scream: "You have destroyed her. You have destroyed my last hope. And now I will destroy yours. I will be with you on your wedding night, Victor. Remember that." He turns and walks away. You watch him go — eight feet of assembled dead tissue, walking into the grey mist — and you know that you have just made the worst mistake of your life.'
      },
      {
        id: 'burn_remains',
        label: 'Burn every trace of the female creature',
        keywords: ['burn', 'remains', 'fire', 'destroy', 'trace', 'evidence', 'clean'],
        discovery: 'You build a fire in the grate and feed it everything. The preserved organs. The bones. The skin. The notes. The sketches. The galvanic calculations. Everything that remains of the female creature goes into the flames. The fire burns green and blue — the colors of the preserving chemicals — and the smoke smells of things you prefer not to name. You burn it all. Every trace. Every scrap. When the fire dies, the grate is full of ash and the laboratory is clean and you are alone with the knowledge of what you have done. You have destroyed a life that never was. And in doing so, you have condemned the life that is.'
      },
      {
        id: 'collapse_guilt',
        label: 'Collapse under the weight of what you have done',
        keywords: ['collapse', 'guilt', 'weight', 'done', 'fall', 'floor', 'overwhelm'],
        discovery: 'Your legs give way. You slide to the floor and sit in the wreckage of your laboratory — the torn body, the scattered organs, the broken equipment — and you weep. Not for the female creature. Not even for the first creature. You weep for yourself. For the man you were in Geneva, reading Agrippa by the fire while Elizabeth read poetry. For the student who sat in Waldman\'s lecture hall and dreamed of conquering death. For the son who loved his mother and wanted to bring her back. That man is dead. He died in the laboratory in Ingolstadt, on the night you pulled the switch. And the thing that sits on the floor of this ruined cottage, weeping into its hands, is something else entirely. Something you do not recognize. Something you do not like.'
      }
    ],
    exitAction: 'face_consequences',
    exitLabel: 'Face the consequences of your choice',
    hardExitNarration: 'You leave the cottage. The headland is empty. The creature is gone. The sea crashes against the cliffs below, indifferent to your grief, your guilt, your terror. You stand at the edge and look down at the white water and you think: I could end this now. One step. One moment of falling. And then it would be over. But you do not step. Because Elizabeth is waiting in Geneva. Because Clerval is waiting in England. Because the creature has promised to be with you on your wedding night, and you must be there to face him. You turn away from the cliff and walk back to the cottage. The work is done. The destruction is complete. And the consequences are coming.',
    initialFacts: {
      items: ['journal'],
      metNPCs: ['victor frankenstein', 'the creature'],
      established: ['Victor has destroyed the female creature', 'the creature witnessed the destruction', 'the creature has threatened revenge on Victor\'s wedding night', 'Victor is consumed by guilt and fear']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'de lacey cottage', 'arctic', 'geneva']
    }
  },

  scene_18: {
    sceneId: 'scene_18',
    sceneName: 'The Creature\'s Revenge',
    description: `The shores of Ireland are grey and cold, the water the color of lead. You fled the Orkney island in a small boat, leaving the ruins of your laboratory behind, and the sea carried you here — to a fishing village on the western coast, where the locals speak with an accent you can barely understand and the air smells of salt and peat smoke.

You have been searching for Clerval. He wrote to you months ago — he was traveling, visiting friends in Ireland, waiting for you to finish your "scientific work" and join him. You meant to go to him. You meant to tell him everything. But the creature found you first.

They bring you to the body on the beach. It lies at the waterline, the waves lapping at its feet, the sand darkening around its neck with a stain you recognize. The face is turned toward you. The eyes are open. The expression is one of surprise — not fear, not pain, but simple, startled surprise, as if death came so quickly there was no time for anything else.

It is Clerval.

Your Clerval. Your dearest friend. The man who nursed you through your fever in Ingolstadt. The man who wrote you letters you never answered. The man who loved you unconditionally and without question, and who you abandoned as surely as you abandoned the creature.

His neck bears marks. Not the marks of a man's hands. Something larger. Something stronger. Something that was not born but made.

You fall to your knees beside him. The sand is cold and wet. The waves wash over your legs. And you scream — a sound that is not human, not animal, but the sound of a soul being torn in two.`,
    content: [
      {
        id: 'examine_clerval',
        label: 'Examine Clerval\'s body and the marks on his neck',
        keywords: ['examine', 'clerval', 'body', 'marks', 'neck', 'look', 'death'],
        discovery: 'You force yourself to look. The marks on Clerval\'s neck are deep, parallel grooves — made by fingers, not hands. Two thumbs pressing into the throat, eight fingers gripping the sides. The creature\'s hands. You built those hands. You selected the bones, the tendons, the muscles. You made them strong enough to crush stone. And now they have crushed the life out of the only friend you had left. Clerval\'s face is peaceful. The surprise has faded into something like sleep. His hands are open at his sides, palms up, as if he died reaching for something. You take his hand. It is cold. You hold it and you do not let go.'
      },
      {
        id: 'scream_anguish',
        label: 'Scream your grief and rage at the sky',
        keywords: ['scream', 'grief', 'rage', 'sky', 'cry', 'anguish', 'pain'],
        discovery: 'The scream tears from your throat like something alive — a sound that starts in your chest and erupts through your lips and carries across the beach and out over the grey sea. The fishermen on the shore turn and stare. A dog barks. A child cries. You scream until your throat is raw and your lungs burn and the sound becomes a sob, and the sob becomes a whisper, and the whisper is his name: "Clerval. Clerval. Clerval." You say it like a prayer. You say it like an apology. You say it because it is the only word left in a world that has been emptied of meaning.'
      },
      {
        id: 'blame_yourself_clerval',
        label: 'Acknowledge that this is your fault',
        keywords: ['fault', 'blame', 'guilt', 'my', 'responsibility', 'caused', 'created'],
        discovery: 'The truth settles over you like a burial shroud. You created the creature. You abandoned it. You refused its demand. And now it has taken Clerval — not randomly, not in desperation, but deliberately. It told you: "I will take from you what you have taken from me." It is punishing you. The way a child punishes a parent who abandoned it. And the punishment will not stop here. The creature promised to be with you on your wedding night. Elizabeth. It will come for Elizabeth. And you cannot stop it. You cannot warn her. You cannot protect her. Because the creature is your creation, and everything it does is your fault.'
      },
      {
        id: 'found_unconscious',
        label: 'Allow the darkness to take you',
        keywords: ['collapse', 'unconscious', 'darkness', 'fall', 'pass', 'faint'],
        discovery: 'The world tilts. The beach, the sea, the grey sky — everything rotates slowly, as if the earth itself is turning away from you. You feel the sand against your cheek. You hear voices — distant, urgent, speaking in the Irish accent you cannot understand. Hands lift you. The darkness takes you like a wave, and in the darkness you see Clerval\'s face — surprised, peaceful, dead — and behind it, larger, darker, the face of the creature, watching, waiting, keeping its promise.'
      }
    ],
    exitAction: 'arrested_for_murder',
    exitLabel: 'Wake in a prison cell, accused of Clerval\'s murder',
    hardExitNarration: 'You wake in a stone cell. Iron bars. A window too high to reach. Your clothes are gone, replaced with rough cloth. A guard sits outside the door, reading a newspaper. He sees you stir and stands. "Ah, you\'re back with us," he says. His voice is flat, official. "Victor Frankenstein, you are charged with the murder of Henry Clerval. You will be held until trial." The door closes. The lock turns. And you sit on the cold stone floor and stare at the wall and think: the creature has begun. The creature has begun, and I cannot stop it.',
    initialFacts: {
      items: ['journal'],
      metNPCs: ['victor frankenstein', 'the creature'],
      established: ['Clerval is dead', 'the creature murdered Clerval', 'Victor has been found unconscious beside the body', 'Victor is accused of the murder', 'Victor is imprisoned in Ireland']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'de lacey cottage', 'arctic', 'orkney']
    }
  },

  scene_19: {
    sceneId: 'scene_19',
    sceneName: 'Elizabeth\'s Last Letter',
    description: `The acquittal came after months of imprisonment — months of sitting in a stone cell, staring at the wall, waiting for a trial that might end with your death. Your father arrived. Lawyers were hired. Evidence was presented. The marks on Clerval\'s neck were examined by a physician who declared them "not consistent with human hands." You were released. You were free.

But freedom is a word that means nothing when the creature is still out there.

You are in Paris now, in a small hotel room, recovering from the illness that seized you in prison. Your father sits by the bed, his face aged ten years in the months since you last saw him. He holds your hand and talks about Geneva, about Elizabeth, about the wedding that has been planned for months.

"Elizabeth is waiting for you," he says. "She writes every day. She is worried, Victor. We all are. But the wedding is arranged. Come home. Come home and marry her and be happy."

You take the letter he offers. Elizabeth's handwriting — careful, elegant, the hand of a woman who has written many letters and loved every word. You break the seal.

"My dearest Victor — I count the hours until you return. The house is prepared. The flowers are ordered. Your father has been so kind, but I miss you, Victor. I miss your face, your voice, the way you stare at the lake and think thoughts too large for words. Come home. Come home to me. Whatever troubles you, whatever darkness has touched you, we will face it together. I am yours, now and always. Your Elizabeth."

You fold the letter. You press it to your lips. And you think: the creature promised to be with me on my wedding night.`,
    content: [
      {
        id: 'read_letter_again',
        label: 'Read Elizabeth\'s letter again, memorizing every word',
        keywords: ['read', 'letter', 'elizabeth', 'again', 'memorize', 'words', 'home'],
        discovery: 'You read the letter again. And again. Each reading is a knife — not because the words are painful, but because they are beautiful. "Whatever darkness has touched you, we will face it together." She does not know. She does not know about the creature, about the demand, about the threat. She does not know that the man she loves has created a monster and set it loose upon the world. She does not know that the monster has promised to be with you on your wedding night. And you cannot tell her. Because if you tell her, she will not marry you. And if she does not marry you, the creature will find another way to hurt you. And if she does marry you — you press the letter to your forehead and close your eyes — she will die.'
      },
      {
        id: 'speak_to_father',
        label: 'Talk to your father about the wedding',
        keywords: ['father', 'talk', 'wedding', 'speak', 'home', 'geneva', 'marry'],
        discovery: 'Your father sits by the bed and holds your hand. "Victor," he says gently, "you have been through a terrible ordeal. But it is over now. You are free. You are alive. And Elizabeth is waiting." You look at his face — lined, worried, aged — and you want to tell him everything. But the words will not come. How do you tell your father that his son is a murderer? Not of Clerval — though the world believes it — but of William. Of Justine. Of every death the creature has caused. "I will come home," you say. "I will marry Elizabeth." Your father smiles. It is the first smile you have seen on his face in months. And it breaks your heart.'
      },
      {
        id: 'plan_for_creature',
        label: 'Plan how to protect Elizabeth from the creature',
        keywords: ['plan', 'protect', 'elizabeth', 'creature', 'wedding', 'night', 'defend'],
        discovery: 'You lie in bed and plan. The creature said he would be with you on your wedding night. But what does that mean? Will he come to the wedding? To the bedroom? Will he attack you, or Elizabeth, or both? You think of weapons — pistols, knives, a garrote. You think of guards — hired men, armed, posted at every door. You think of running — taking Elizabeth and fleeing to the farthest corner of the world. But the creature found you on a mountain in the Alps. He found you on an island in the Orkneys. He found you in Ireland. There is no corner of the world far enough. The only way to protect Elizabeth is to face the creature. To be ready. To fight. And if you cannot fight — to die. You will die for her. You will die to protect her. And maybe — maybe — the creature will be satisfied with your death and leave her alive.'
      },
      {
        id: 'write_will',
        label: 'Write a letter to Elizabeth, to be opened only if you die',
        keywords: ['write', 'will', 'letter', 'elizabeth', 'die', 'death', 'open'],
        discovery: 'You sit at the desk and write. Not to Elizabeth — to your father. "Dear Father — if I do not survive my wedding night, please give this letter to Elizabeth. She deserves to know the truth." You write everything. The creature. The laboratory. The creation. The demand. The threat. You write it all in a hand that does not shake, because the shaking has stopped. You are calm now. Calm with the clarity of a man who has accepted his fate. You seal the letter and give it to your father. "Keep this," you say. "Do not open it. But if anything happens to me — give it to Elizabeth." Your father takes the letter with a puzzled frown. "Victor, what is this about?" You smile. It is the saddest smile you have ever smiled. "Insurance," you say.'
      }
    ],
    exitAction: 'return_to_geneva',
    exitLabel: 'Return to Geneva to marry Elizabeth',
    hardExitNarration: 'The coach carries you south through France, through the Jura mountains, into Switzerland. The landscape is beautiful — green valleys, snow-capped peaks, the clean blue of Lake Geneva in the distance. You see none of it. You stare at the road ahead and think about the creature. You think about the wedding night. You think about Elizabeth\'s face — her grey-green eyes, her gentle hands, her voice reading poetry by the fire. And you think: I will protect her. I will die to protect her. The coach crests a hill and Geneva spreads below you — the lake, the old town, the spire of St. Pierre\'s. Home. Elizabeth is there. The creature is there. And somewhere between them, you stand — a man who created life and death in the same breath, and who now must face the consequences of both.',
    initialFacts: {
      items: ['journal', 'elizabeth\'s letter', 'letter to father'],
      metNPCs: ['victor frankenstein', 'alphonse frankenstein'],
      established: ['Victor has been acquitted of Clerval\'s murder', 'Victor is in Paris recovering', 'the wedding to Elizabeth is arranged', 'Victor knows the creature will come on his wedding night', 'Victor has written a confession letter', 'Victor is returning to Geneva']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'de lacey cottage', 'arctic', 'orkney']
    }
  }
};
