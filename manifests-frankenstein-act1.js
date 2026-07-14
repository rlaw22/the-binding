/**
 * Frankenstein — Act 1 Manifests: The Spark
 * Scenes 0-4: Victor's early life, university, obsession, laboratory, final preparations
 */

module.exports = {
  scene_00: {
    sceneId: 'scene_00',
    sceneName: 'Geneva — The Frankenstein Home',
    description: `The Frankenstein house stands on the edge of Lake Geneva, its stone walls warm with the last light of an autumn evening. Through the tall windows of the sitting room, firelight dances across shelves of books — Pliny, Agrippa, Paracelsus — their spines cracked and gilded. The air smells of beeswax and roasted chestnuts and the faint, clean scent of the lake.

Your father, Alphonse Frankenstein, sits in his armchair reading correspondence, his silver hair catching the lamplight. Your mother, Caroline, embroiders by the fire — her hands quick and sure, her face gentle. She looks up as you enter and smiles the smile that has been the center of your world since before you can remember.

In the window seat, Elizabeth Lavenza reads aloud from a book of poetry. Her voice is clear and warm, and the firelight turns her auburn hair to copper. She pauses when she sees you, and her eyes — grey-green, like the lake in spring — light with affection. "Victor," she says. "Come listen. This verse reminds me of you."

Outside, the sky is darkening. The Alps are silhouettes against the last orange glow. And somewhere over the lake, a storm is gathering — you can feel it in the air, a charge that makes the hairs on your arms stand up. Lightning flickers behind the mountains, silent and distant.

The bookshelves call to you. The old volumes on natural philosophy — their pages filled with diagrams of lightning, of galvanism, of the secret forces that animate the world. You have read them all. You want more.`,
    content: [
      {
        id: 'talk_to_mother',
        label: 'Sit with your mother by the fire',
        keywords: ['mother', 'caroline', 'fire', 'sit', 'talk', 'embroider', 'warm'],
        discovery: 'You sit beside your mother. She puts down her embroidery and takes your hand — her fingers are cool and slender. "Victor," she says softly, "you have been quiet tonight. What occupies your mind?" You try to explain the feeling — the electricity in the air, the questions that burn in you about the nature of life and death. She listens with patient eyes. "Your curiosity is a gift," she says. "But do not let it consume you. There is more to life than knowledge. There is love. There is family." She squeezes your hand and looks toward Elizabeth. "Remember that."'
      },
      {
        id: 'read_agrippa',
        label: 'Pull down the old volume of Agrippa from the shelf',
        keywords: ['agrippa', 'book', 'shelf', 'read', 'volume', 'philosophy', 'natural'],
        discovery: 'You pull down the worn volume of Cornelius Agrippa — "De Occulta Philosophia." The pages fall open to a chapter on the vital force, the spark that separates the living from the dead. Agrippa writes of alchemists who sought to create life from base matter, to imbue the inanimate with the fire of existence. Your father once dismissed these ideas as nonsense, but you have read them a dozen times. Each reading reveals something new — a diagram, a formula, a hint at a deeper truth. The lightning outside flickers again, and for a moment the diagram on the page seems to glow.'
      },
      {
        id: 'speak_to_elizabeth',
        label: 'Join Elizabeth in the window seat',
        keywords: ['elizabeth', 'window', 'seat', 'speak', 'poetry', 'listen', 'talk'],
        discovery: 'You sit beside Elizabeth. She shifts to make room, and her shoulder brushes yours — warm, real, present. She reads aloud: "The world is too much with us; late and soon, getting and spending, we lay waste our powers." She closes the book. "Do you ever feel that way, Victor? That the world demands so much of us that we forget what matters?" You look at her face in the firelight and feel a rush of affection so strong it frightens you. "I feel," you say carefully, "that there are secrets the world is hiding. And I mean to find them." Elizabeth studies you with those grey-green eyes. "Just be careful," she says. "Some secrets are hidden for a reason."'
      },
      {
        id: 'watch_lightning',
        label: 'Go to the window and watch the storm gather over the lake',
        keywords: ['lightning', 'storm', 'window', 'lake', 'watch', 'electricity', 'thunder'],
        discovery: 'You stand at the window. The storm is closer now — a wall of dark cloud rolling across the lake, its underside lit by flickering veins of lightning. The thunder comes seconds later, a deep, rolling crack that shakes the glass. And then a bolt strikes — not the lake, but the old oak tree in the garden. The trunk splits with a sound like a cannon shot, and the tree falls in a shower of sparks and splinters. You stare at the ruined tree, the smoke rising from its shattered heart, and something ignites in your mind. Not fear. Wonder. The raw, irresistible power of electricity — the force that moves through nerves and muscles, that sparks the heart to beat. If that power could be harnessed, directed, controlled — if it could be given to dead matter — you could conquer death itself.'
      },
      {
        id: 'examine_bookshelf',
        label: 'Browse the full bookshelf of natural philosophy',
        keywords: ['bookshelf', 'books', 'browse', 'philosophy', 'natural', 'pliny', 'paracelsus'],
        discovery: 'The bookshelf is a history of obsession. Pliny\'s "Natural History" — thick with descriptions of strange creatures and alchemical processes. Paracelsus on the creation of homunculi — artificial men grown in glass vessels. Albertus Magnus on the philosopher\'s stone. And newer volumes — Galvani\'s treatise on animal electricity, showing how a spark can make dead frog legs twitch. You have read them all. Some you have read so many times the pages are soft as cloth. These are not just books. They are a map — a map of the border between life and death, and you intend to cross it.'
      }
    ],
    exitAction: 'retire_for_night',
    exitLabel: 'Go to your room, your mind ablaze with ideas',
    hardExitNarration: 'Your mother kisses your forehead. "Goodnight, my son. Dream of pleasant things." Elizabeth squeezes your hand as you pass. You climb the stairs to your room, but you do not sleep. You lie in the dark, watching the lightning play across the ceiling, and you think about the oak tree — split open, its heart exposed, the life gone out of it in an instant. And you think: what if it could be put back?',
    initialFacts: {
      items: [],
      metNPCs: ['victor frankenstein', 'elizabeth', 'caroline frankenstein', 'alphonse frankenstein'],
      established: ['Victor is a young man in Geneva', 'family is warm and loving', 'Victor is fascinated by natural philosophy', 'a storm is gathering over the lake', 'Elizabeth is Victor\'s beloved companion']
    },
    locationKeywords: {
      banned: ['ingolstadt', 'university', 'laboratory', 'charnel house', 'arctic', 'orkney']
    }
  },

  scene_01: {
    sceneId: 'scene_01',
    sceneName: 'University of Ingolstadt',
    description: `The University of Ingolstadt is a labyrinth of stone corridors, echoing lecture halls, and laboratories that smell of sulfur and formaldehyde. You arrived three weeks ago, leaving Geneva and Elizabeth and the warmth of your family behind. The city is grey and cold, the buildings ancient and imposing, and the professors speak with a gravity that makes every word feel like a pronouncement.

You sit in the lecture hall of Professor M. Krempe — a squat, loud man with a face like a potato — who has just spent an hour dismissing everything you have read. "Agrippa! Paracelsus! Albertus Magnus!" He spits each name like a curse. "Waste. Nonsense. You have been reading fairy tales, Herr Frankenstein. Modern chemistry is the only path to truth."

But it is Professor Waldman who changes everything. He is tall, silver-haired, with eyes that burn with a quiet fire. His lectures are different — not dismissive but expansive. He speaks of the alchemists with respect, as men who asked the right questions even if they found the wrong answers. "They sought to unlock the secrets of nature," he says, his voice carrying to every corner of the hall. "To penetrate the mysteries of creation. Modern chemistry has given us the tools they lacked. But the ambition — the magnificent, terrible ambition — that is the same."

After the lecture, you approach him. His study is small and warm, lined with books and specimens in glass jars. He looks at you with interest. "You are the one who reads Agrippa," he says. It is not a question.`,
    content: [
      {
        id: 'speak_to_waldman',
        label: 'Tell Waldman about your desire to understand the secret of life',
        keywords: ['waldman', 'speak', 'talk', 'life', 'secret', 'desire', 'ambition'],
        discovery: 'You tell Waldman everything — your fascination with the boundary between life and death, your reading of the alchemists, your belief that modern science could succeed where they failed. He listens without interrupting, his fingers steepled, his eyes never leaving your face. When you finish, he is quiet for a long moment. Then he says: "Victor, the ambition you describe is the noblest a scientist can hold. But I must warn you — the pursuit of the secret of life has destroyed every man who has undertaken it. The question is not whether you can succeed. The question is whether you should." He opens a drawer and hands you a sheaf of papers. "Read these. They are my own notes on galvanism and the reanimation of tissue. Then come back and tell me if you still wish to proceed."'
      },
      {
        id: 'attend_lecture',
        label: 'Listen carefully to Waldman\'s lecture on modern chemistry',
        keywords: ['lecture', 'waldman', 'listen', 'chemistry', 'modern', 'alchemy', 'science'],
        discovery: 'Waldman\'s lecture is a revelation. He speaks of chemistry not as a dry catalogue of substances and reactions, but as a key — a key that could unlock the deepest doors of nature. "While the alchemists sought to turn lead into gold," he says, "the true prize was always the transformation of death into life. Modern chemistry has given us the tools: galvanism, the study of gases, the analysis of tissues. The question that remains is whether we have the courage to use them." He pauses and looks directly at you. "The greatest scientists are those who dare to ask the questions that frighten them." Your heart hammers. He is speaking to you. He is giving you permission to dream.'
      },
      {
        id: 'visit_anatomy_theater',
        label: 'Visit the university\'s anatomy theater and dissection rooms',
        keywords: ['anatomy', 'theater', 'dissection', 'body', 'dead', 'room', 'visit'],
        discovery: 'The anatomy theater is a circular room with tiered wooden benches rising to the ceiling. At the center, a stone slab holds a body under a white sheet. The professor — not Waldman, but a Dr. Nessler — pulls back the sheet with practiced indifference. The body is that of an old man, his skin grey, his chest open, his organs exposed. Nessler lectures on the heart, the lungs, the liver, pointing with a wooden rod. But you barely hear him. You are staring at the body — at the machinery of it, the intricate, beautiful, terrible machinery — and thinking: this is what I must understand. Not the organs. Not the tissues. The force that made them work. The spark that is now absent. Where did it go? And can it be put back?'
      },
      {
        id: 'examine_waldman_study',
        label: 'Study the specimens and instruments in Waldman\'s study',
        keywords: ['study', 'specimens', 'instruments', 'jars', 'glass', 'examine', 'waldman'],
        discovery: 'Waldman\'s study is a cabinet of wonders. Glass jars line the shelves, each containing a specimen preserved in clear fluid: a human heart, a brain, a hand with tendons exposed. On his desk, a voltaic pile — a stack of copper and zinc discs — sits beside a journal filled with notes on galvanic stimulation of dead tissue. You pick up the journal and read: "The frog\'s leg twitched when the current was applied. The muscle responded as if alive, though the animal had been dead for six hours. Conclusion: the galvanic fluid is not life itself, but it may be the medium through which life operates." Your hands tremble. This is it. This is the key. The spark of life is electrical. And electricity can be generated, stored, and applied.'
      }
    ],
    exitAction: 'embrace_chemistry',
    exitLabel: 'Study the chemistry and galvanism you crave',
    hardExitNarration: 'You leave Waldman\'s study with his notes clutched to your chest and a fire in your mind that will never be extinguished. The corridors of the university echo with your footsteps — quick, purposeful, the footsteps of a man who has found his calling. Behind you, Waldman watches from his doorway. He looks older than he did an hour ago. He looks afraid.',
    initialFacts: {
      items: ['Agrippa\'s De Occulta Philosophia'],
      metNPCs: ['victor frankenstein', 'professor waldman', 'professor krempe'],
      established: ['Victor is at the University of Ingolstadt', 'Waldman has inspired Victor', 'Victor is focused on galvanism and the secret of life', 'Victor has access to anatomy facilities']
    },
    locationKeywords: {
      banned: ['geneva', 'frankenstein home', 'laboratory', 'charnel house', 'arctic', 'orkney']
    }
  },

  scene_02: {
    sceneId: 'scene_02',
    sceneName: 'The Obsession Deepens',
    description: `Months have passed. Your lodgings are a ruin of science and madness. Books are stacked in towers that lean like drunkards. The desk is buried under papers — anatomical sketches, galvanic calculations, notes in a handwriting that grows more erratic with each page. The walls are covered in diagrams: the human nervous system, the placement of organs, the flow of blood. In the corner, a voltaic pile hums with stored charge, its copper discs green with verdigris.

You have not written to Elizabeth in six weeks. You have not answered Clerval's last three letters. You have not attended a lecture in a month. Professor Waldman is dead — a sudden fever that took him in the night — and with him died the last voice of reason in your life.

You eat when you remember to eat. You sleep when your body refuses to stay upright. The rest of the time, you work. You work on the thing that consumes you — the project that has swallowed your life whole.

The charnel houses know you now. The sextons at the churchyards turn a blind eye when you come at night with your spade and your sack. The slaughterhouses save their best specimens for the strange young man who pays in gold and asks no questions. You have touched death so many times that it no longer disgusts you. It fascinates you.

On the desk, under a stack of papers, lies a letter from your father. You have not opened it. You know what it will say: "Come home, Victor. We are worried." You cannot go home. Not yet. Not until you have done what no man has ever done.`,
    content: [
      {
        id: 'visit_charnel_house',
        label: 'Go to the charnel house to gather materials',
        keywords: ['charnel', 'house', 'graveyard', 'materials', 'gather', 'dead', 'body', 'night'],
        discovery: 'The charnel house is beneath the church of St. Stephen — a vaulted stone chamber where the bones of the dead are stacked in neat rows along the walls. The air is thick with the smell of lime and decay. The sexton lets you in with a nod and a jingle of the coins you pressed into his palm. You work by candlelight, selecting carefully: a femur of the right length, a section of ribcage with well-preserved cartilage, a hand with intact tendons. You wrap each piece in oilcloth and place it in your sack. The dead do not mind. They have no further use for these parts. But as you climb the stairs back to the street, you catch your reflection in a puddle — gaunt, wild-eyed, your clothes stained with things you prefer not to name — and for a moment you do not recognize yourself.'
      },
      {
        id: 'read_father_letter',
        label: 'Open and read your father\'s letter',
        keywords: ['father', 'letter', 'read', 'open', 'home', 'family', 'worried'],
        discovery: 'You break the seal with trembling fingers. Your father\'s handwriting — careful, measured, the hand of a man who has never wasted a word: "My dear Victor, it has been four months since we last heard from you. Elizabeth tries to hide her worry, but I see it in her eyes. Your mother asks after you every day. Henry Clerval writes that you have not answered his letters. Victor, I beg you — whatever you are doing, whatever has consumed you, remember that you have a family that loves you. Come home. Even for a week. Even for a day. Your loving father." You read the letter twice. Then you fold it carefully and place it in a drawer. You will write back tomorrow. Today, you have work to do.'
      },
      {
        id: 'examine_work',
        label: 'Study your accumulated notes and anatomical sketches',
        keywords: ['notes', 'sketches', 'study', 'examine', 'anatomy', 'work', 'progress'],
        discovery: 'You spread your notes across the desk. Months of work — years, if you count the reading and the research. The anatomical sketches are detailed, clinical, beautiful in their precision. You have mapped every muscle, every nerve, every blood vessel in the human body. You have calculated the galvanic charge required to stimulate each tissue type. You have designed a creature — not from imagination, but from science. Eight feet tall, because the joints are stronger at that scale. Proportions adjusted for optimal galvanic conductivity. A brain built from the finest materials, selected for intelligence and sensitivity. It is a masterpiece of engineering. And it is horrifying.'
      },
      {
        id: 'visit_slaughterhouse',
        label: 'Go to the slaughterhouse for fresh tissue samples',
        keywords: ['slaughterhouse', 'butcher', 'tissue', 'samples', 'fresh', 'organs', 'collect'],
        discovery: 'The slaughterhouse is on the edge of town — a wooden building with a yard full of blood-soaked straw and the sound of animals that do not know they are about to die. The butcher knows you. He has a package waiting: fresh organs, kept on ice, selected to your specifications. "You\'re the medical student, ja?" he says, handing you the package. You nod. He does not ask questions. He does not want to know. As you leave, you pass the pens where the cattle stand, calm and stupid, waiting for the bolt. You look into their eyes and see nothing — no fear, no understanding, no soul. And you think: when I am done, my creation will have all of those things. Fear. Understanding. A soul. Whether the world is ready for it or not.'
      },
      {
        id: 'ignore_clerval',
        label: 'Set aside Clerval\'s unanswered letter and return to work',
        keywords: ['clerval', 'letter', 'ignore', 'work', 'friend', 'unanswered', 'set aside'],
        discovery: 'Clerval\'s letter sits on the corner of the desk, unopened. You know what it says — the same thing it always says: "Victor, write to me. Tell me you are well. Tell me you are eating. Tell me you have not lost your mind." You cannot answer it. Not because you do not love Clerval — you do, more than almost anyone — but because the truth would destroy him. How do you tell your dearest friend that you spend your nights in charnel houses and your days assembling a body from the dead? How do you tell him that you have not slept properly in months, that your hands shake, that you talk to yourself, that you have begun to dream of the creature and it speaks to you in a voice you do not recognize? You cannot. So you set the letter aside and return to work.'
      }
    ],
    exitAction: 'continue_work',
    exitLabel: 'Push deeper into the work that consumes you',
    hardExitNarration: 'The candle burns low. The shadows lengthen. You work through the night, as you have worked through every night for months, and when dawn comes you do not notice. The creature is taking shape. Piece by piece, part by part, assembled from the dead and animated by the science of the living. You are close. So close. And you are so far from the man you used to be that you cannot see him anymore.',
    initialFacts: {
      items: ['Agrippa\'s De Occulta Philosophia', 'Waldman\'s galvanism notes'],
      metNPCs: ['victor frankenstein', 'elizabeth', 'caroline frankenstein', 'alphonse frankenstein', 'professor waldman', 'professor krempe'],
      established: ['months have passed', 'Victor is consumed by obsession', 'Waldman is dead', 'Victor has not contacted his family', 'Victor gathers materials from charnel houses and slaughterhouses', 'the creature is being assembled']
    },
    locationKeywords: {
      banned: ['geneva', 'frankenstein home', 'laboratory', 'arctic', 'orkney']
    }
  },

  scene_03: {
    sceneId: 'scene_03',
    sceneName: 'The Laboratory',
    description: `The laboratory is a rented room at the top of a disused warehouse on the outskirts of Ingolstadt. You chose it for its isolation — no neighbors, no curious eyes, no one to hear the sounds that come from behind the locked door. The room is large, with a skylight that lets in grey northern light and a stone floor that can be scrubbed clean.

The table dominates the center of the room — a massive oak slab, scarred and stained, bolted to the floor. On it lies the creature. Not alive. Not yet. But assembled. Two years of work, of charnel houses and slaughterhouses and midnight grave-robbing, brought together in a form that is almost human. Eight feet tall. The skin is yellow — the color of old parchment — stretched tight over a frame of bone and muscle that is stronger than any living man's. The face is... almost beautiful. High cheekbones, a straight nose, lips that might be handsome on a living man. But the eyes, set too deep in their sockets, and the skin, stretched too tight over the skull, give the whole assembly an air of wrongness.

The voltaic apparatus stands against the far wall — a massive construction of Leyden jars, galvanic cells, copper wires, and glass insulators. It hums with stored charge, a low vibration you can feel in your teeth. The electrodes are ready. The connections are made. Everything is prepared.

You stand over the creature, your shadow falling across its face, and you realize that you have not left this room in three weeks. Your hands shake. Your eyes burn. Your clothes hang on your frame like a scarecrow's. But none of that matters. Because tonight, if the storm comes, you will bring this body to life.`,
    content: [
      {
        id: 'examine_body',
        label: 'Study the assembled creature on the table',
        keywords: ['examine', 'body', 'creature', 'table', 'study', 'look', 'assembled'],
        discovery: 'You lean close and study your creation. The skin is yellow and translucent in places, showing the dark veins beneath. The muscles are well-formed, powerful, but the joints are too large, too prominent, giving the limbs an insectile quality. The hands are enormous — long-fingered, strong enough to crush stone. The feet are flat and wide, built for stability. The chest is deep, housing lungs that have never breathed and a heart that has never beat. You chose every piece. You selected every bone, every muscle, every nerve. And now it lies before you, a monument to your genius and your madness, waiting for the spark that will make it live.'
      },
      {
        id: 'test_apparatus',
        label: 'Verify the voltaic apparatus is fully charged',
        keywords: ['apparatus', 'voltaic', 'test', 'charge', 'leyden', 'jar', 'verify', 'electric'],
        discovery: 'You check each component with the obsessive precision of a man who has checked them a hundred times before. The Leyden jars are full — you charged them this morning from the voltaic pile. The copper wires run from the jars through glass insulators to the electrodes — two pads of copper mesh, designed to deliver the galvanic current to the creature\'s brain and spinal cord. The switch is a simple copper lever, mounted on a wooden handle. You flip it experimentally — a spark leaps between the electrodes with a crack that echoes in the empty room. The apparatus is ready. The creature is ready. The only thing missing is the storm.'
      },
      {
        id: 'read_journal_lab',
        label: 'Re-read your journal entries about the creation process',
        keywords: ['journal', 'read', 'entries', 'notes', 'creation', 'process', 'diary'],
        discovery: 'You flip through your journal. The early entries are clinical, excited: "The muscle tissue responds to galvanic stimulation. The nerve fibers conduct. The brain — I have built a brain from the finest materials." But the later entries grow darker: "I have not left the laboratory in weeks. Clerval visits but I send him away. Elizabeth writes. I do not answer. I dream of the creature and it speaks to me in a voice I do not recognize." The most recent entry, written yesterday: "I have become so consumed by the creation that I have forgotten the creator. What manner of man builds a man from the dead? And what manner of man will that dead man become?"'
      },
      {
        id: 'look_out_window',
        label: 'Look through the skylight at the sky',
        keywords: ['skylight', 'window', 'sky', 'storm', 'clouds', 'look', 'outside'],
        discovery: 'You climb the wooden ladder to the skylight and push it open. The sky is dark — not with night, but with storm clouds, rolling and churning, lit from within by flickering veins of lightning. The wind is rising. Rain spatters your face. And in the distance, growing closer, the deep rumble of thunder. A storm is coming. A real storm — not the mild spring showers that have disappointed you for weeks, but a monster, a wall of black cloud that stretches from horizon to horizon. The lightning is frequent now, bright enough to cast shadows. You can feel the electricity in the air, a charge that makes your hair stand on end and your skin tingle. This is it. This is the storm you have been waiting for.'
      }
    ],
    exitAction: 'prepare_for_animation',
    exitLabel: 'Make the final preparations for the animation',
    hardExitNarration: 'You close the skylight and climb down the ladder. The laboratory is lit by a single oil lamp and the stuttering blue-white glare of the voltaic apparatus. The storm is almost here. The creature lies on the table, waiting. Your hand rests on the copper switch. Your heart hammers. And you think of your mother, dead. Of Elizabeth, waiting. Of the face that will open its eyes and look at you with the trust of a child for its parent. God forgive me, you whisper. And you wait for the lightning.',
    initialFacts: {
      items: ['journal'],
      metNPCs: ['victor frankenstein', 'elizabeth', 'caroline frankenstein', 'alphonse frankenstein', 'professor waldman', 'professor krempe'],
      established: ['the creature is fully assembled', 'the laboratory is ready', 'a storm is approaching', 'Victor is isolated and exhausted', 'the voltaic apparatus is charged']
    },
    locationKeywords: {
      banned: ['geneva', 'frankenstein home', 'charnel house', 'arctic', 'orkney']
    }
  },

  scene_04: {
    sceneId: 'scene_04',
    sceneName: 'The Final Preparations',
    description: `The storm breaks. Rain hammers the skylight with a sound like fists. Lightning splits the sky — a blinding white bolt that turns the laboratory to a photograph for one searing instant, then plunges it back into the blue-white stutter of the voltaic apparatus. Thunder follows, so close and so loud that the glass jars rattle on the shelves and the floor vibrates beneath your feet.

The creature lies on the table, eight feet of assembled dead tissue, waiting. The electrodes are attached — two copper pads, one at the base of the skull, one at the base of the spine, connected by insulated wires to the Leyden jars that hum with stored lightning. The galvanic cells are fresh. The circuit is complete. Everything is ready.

Your journal lies open on the workbench beside you. The final entry, written in a hand you barely recognize: "Tonight, I shall put the spark of life into this being. God forgive me if I succeed."

The creature's chest rises and falls — not with breath, but with the settling of dead tissue. Its fingers twitch. Or do they? You cannot tell if it is the flickering lamp or something else. The lightning flashes again and in that instant you see the creature's face — the yellow skin, the too-deep eyes, the lips that will never smile — and you feel a wave of revulsion so strong it nearly drives you from the room.

But you stay. Because you have spent two years on this. Because you have sacrificed everything — your health, your friendships, your family, your sanity — for this moment. Because the switch is cold under your hand and the storm is screaming and the creature is waiting.

And because you cannot turn back.`,
    content: [
      {
        id: 'pull_switch',
        label: 'Pull the copper switch and send the current through the creature',
        keywords: ['switch', 'pull', 'current', 'electric', 'galvanic', 'activate', 'animate', 'start'],
        discovery: 'You pull the switch. The voltaic apparatus screams — a high, keening whine that fills the laboratory and rattles the glass jars on the shelves. Blue-white lightning arcs between the electrodes and the creature\'s body convulses. Its back arches. Its fingers claw the table. Its chest heaves once, twice, three times — and then it breathes. A rattling, wet intake of air that smells of the grave. The creature\'s eyes open. They are pale, watery, and utterly, horribly alive. They find your face. They focus. And the creature smiles — a hideous, uncertain stretching of dead muscle over living bone. You have done it. You have created life. And in the same instant, you know with absolute certainty that you have made a terrible mistake.'
      },
      {
        id: 'examine_creature_final',
        label: 'Study the creature\'s body one last time before the animation',
        keywords: ['examine', 'study', 'body', 'creature', 'look', 'inspect', 'form', 'final'],
        discovery: 'You lean close and study your creation. The skin is yellow — the color of old parchment — and translucent in places, showing the dark veins beneath. The muscles are well-formed, powerful, but the joints are wrong: too large, too prominent, giving the limbs an insectile quality. The face is... almost beautiful. High cheekbones, a straight nose, lips that might be handsome on a living man. But the eyes, set too deep in their sockets, and the skin, stretched too tight over the skull, give the whole assembly an air of wrongness. Like a painting done by someone who has never seen a human face but has had one described to them.'
      },
      {
        id: 'hesitate',
        label: 'Step back from the switch and reconsider what you are about to do',
        keywords: ['hesitate', 'stop', 'reconsider', 'step', 'back', 'think', 'doubt'],
        discovery: 'Your hand trembles on the switch. You step back. The creature lies still, inert, a collection of dead tissue and stolen parts. You think of your mother, dead. Of the graves you opened, the charnel houses you visited, the things you did in the name of science. And now you stand on the threshold of the greatest achievement in human history — and you are afraid. Not of failure. Of success. What will it think? What will it feel? What have you given it, besides a body made from the dead and a mind that will wake in a world that will recoil from it in horror?'
      },
      {
        id: 'check_apparatus_final',
        label: 'Verify the voltaic apparatus and Leyden jars are properly charged',
        keywords: ['apparatus', 'leyden', 'jar', 'voltaic', 'check', 'charge', 'verify', 'electric'],
        discovery: 'You examine the voltaic apparatus with trembling hands. The galvanic cells are fresh — you replaced them this morning. The Leyden jars hold enough charge to kill a horse. The copper wires run from the jars through a series of glass insulators to the electrodes embedded in the creature\'s skull and spine. The connections are sound. The circuit is complete. Everything is ready. You have spent months ensuring this moment. And now that it is here, you wish you had spent those months doing anything else.'
      },
      {
        id: 'read_final_journal',
        label: 'Re-read your final journal entry',
        keywords: ['journal', 'read', 'entry', 'final', 'notes', 'diary', 'tonight'],
        discovery: 'You read the entry again: "Tonight, I shall put the spark of life into this being. God forgive me if I succeed." The handwriting is yours, but the man who wrote it feels like a stranger. You remember writing it — three hours ago, by candlelight, with the storm building outside. You were calm then. Clinical. A scientist preparing for an experiment. Now your hands shake and your mouth is dry and your heart hammers so hard you can hear it over the thunder. The man who wrote this entry was brave. The man standing here now is terrified. And the difference between them is the distance between the word and the deed.'
      }
    ],
    exitAction: 'animate_creature',
    exitLabel: 'Pull the switch and bring the creature to life',
    hardExitNarration: 'The switch falls. Lightning screams through the apparatus. The creature\'s eyes open — pale, blue, and alive. They find your face. They focus. And in that moment, the laboratory, the university, the world itself contracts to a single point: the horror in those newborn eyes, and the horror in your own.',
    initialFacts: {
      items: ['journal'],
      metNPCs: ['victor frankenstein', 'elizabeth', 'caroline frankenstein', 'alphonse frankenstein', 'professor waldman', 'professor krempe'],
      established: ['the storm has arrived', 'the creature is on the table', 'the voltaic apparatus is ready', 'Victor is alone with his creation', 'the electrodes are attached']
    },
    locationKeywords: {
      banned: ['geneva', 'frankenstein home', 'charnel house', 'arctic', 'orkney']
    }
  }
};
