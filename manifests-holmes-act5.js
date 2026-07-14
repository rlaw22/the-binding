module.exports = {
  scene_20: {
    sceneId: 'scene_20',
    sceneName: "Stapleton's End",
    description: `Dawn breaks over the Grimpen Mire — a thin, grey light that seeps across the heather like watercolour on wet paper. The fog has come in thick overnight, reducing the world to a shifting wall of white. You can see twenty yards in any direction, and no further. The Mire is invisible. The tors are invisible. Even Baskerville Hall, a mile to the northeast, has vanished.

Holmes stands at the edge of the Mire, studying the ground. His face is drawn, his eyes sharp with concentration. "He came this way," he says, pointing to a trail of crushed vegetation and deep footprints in the soft earth. "Running. He knows we have the hound. He knows we have the lair. He has nothing left."

The trail leads into the fog, into the Mire, along a path that only Stapleton would know. Holmes follows it with the careful precision of a bloodhound, stepping from tussock to tussock, reading the broken stems and scuffed earth like a book. You follow, your revolver drawn, Lestrade behind you.

Then Holmes stops. The footprints end at the edge of a patch of ground that looks solid — green, firm, ordinary — but is not. The surface sags slightly, like a mattress. Holmes kneels and presses his hand to it. The earth trembles.

"He went in here," Holmes says quietly. "He tried to cross without the safe path. Perhaps he was running. Perhaps he was desperate. Perhaps he thought he knew the way."

From somewhere beneath the surface, from somewhere deep in the acid peat and the black water, you hear a sound. A cry. Faint, muffled, fading. Then nothing.`,
    content: [
      {
        id: 'listen_for_stapleton',
        label: 'Listen for any sound from beneath the bog',
        keywords: ['listen', 'sound', 'bog', 'beneath', 'stapleton', 'cry', 'hear', 'mire'],
        discovery: 'You press your ear to the ground. The surface is cold and damp, and beneath it you can feel the bog shifting — a slow, liquid movement, like the breathing of something vast and patient. For a moment, you hear it again: a voice, thin and desperate, rising from somewhere below. "Help... help me..." Then the sound thickens, chokes, and stops. The surface of the Mire settles. A bubble rises and bursts, releasing a breath of methane and rot. Holmes stands. "He is gone," he says. There is no satisfaction in his voice. Only a weary finality.'
      },
      {
        id: 'examine_bog_edge',
        label: 'Examine the edge of the bog where Stapleton went in',
        keywords: ['examine', 'edge', 'bog', 'stapleton', 'went in', 'ground', 'surface'],
        discovery: 'You kneel at the edge of the bog and study the ground. The footprints are clear — Stapleton\'s boots, running, the stride lengthening as he accelerated. Then, at the very edge of the treacherous patch, the prints deepen suddenly, as if the ground gave way beneath him. One hand-print in the mud where he grabbed for solid earth. A long furrow where he slid forward. And then nothing. The surface is smooth and green, as if it has been this way for a thousand years. The Mire is patient. It waits. And when something falls in, it does not give it back.'
      },
      {
        id: 'search_for_evidence',
        label: 'Search the area for anything Stapleton dropped',
        keywords: ['search', 'area', 'dropped', 'evidence', 'stapleton', 'belongings', 'find'],
        discovery: 'You search the ground near the edge of the bog. In the heather, ten yards from where the footprints end, you find a leather satchel. Inside: a wallet containing false identity papers — the name "Jack Stapleton" on a forged birth certificate, alongside a second document bearing the name "Rodger Baskerville, Junior." A railway ticket to London, dated yesterday. A handful of gold sovereigns. And a letter, unfinished, addressed to no one: "I was the rightful heir. The fortune should have been mine. I did what any man would do to claim what was stolen from his family." Holmes reads it and places it carefully in his coat pocket. "Evidence," he says. "For the inquest."'
      },
      {
        id: 'reflect_on_justice',
        label: 'Stand at the edge of the Mire and reflect on what has happened',
        keywords: ['reflect', 'stand', 'edge', 'mire', 'justice', 'think', 'happened', 'end'],
        discovery: 'You stand at the edge of the Grimpen Mire and look out into the fog. Somewhere beneath that green, innocent surface, Stapleton lies in the dark, claimed by the same moor he used as his weapon. The Mire was his ally — his hiding place, his kennel, his fortress. And in the end, it was his grave. There is a symmetry to it that feels less like justice and more like the moor itself passing sentence. Holmes stands beside you, silent for a long time. Then he says, "The moor does not forgive, Watson. It does not forget. And it does not distinguish between the innocent and the guilty."'
      }
    ],
    exitAction: 'leave_mire',
    exitLabel: 'Walk back from the Mire with Holmes',
    hardExitNarration: 'Holmes turns from the bog and walks back toward solid ground. You follow. The fog is lifting, and the moor is emerging from the whiteness — the purple heather, the grey tors, the vast, indifferent sky. Behind you, the Grimpen Mire waits, green and silent, keeping its secrets.',
    initialFacts: {
      items: ['webley revolver', 'phosphorus sample'],
      metNPCs: ['holmes', 'lestrade'],
      established: ['Stapleton fell into the Grimpen Mire', 'the Mire has swallowed him', 'Stapleton carried forged identity documents', 'the case is effectively over']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'baskerville hall interior']
    }
  },
  scene_21: {
    sceneId: 'scene_21',
    sceneName: 'The Baskerville Legacy',
    description: `The fire in the study at Baskerville Hall burns high and bright, driving out the October chill. Sir Henry sits in his great-uncle's chair — his chair now — with a glass of brandy that he has not touched. Watson stands by the window, watching the moor darken as the sun sets. Holmes paces before the fire, as he always paces when the case is closing, his long fingers steepled beneath his chin.

"It is over," Holmes says at last. "But you deserve to know everything, Sir Henry. Every piece of it."

He unfolds the story like a map. Rodger Baskerville — the younger son, the one who left for the Americas in 1795 — never crossed the ocean. He settled in England under a false name, married, and had a son. That son grew up on stories of the Baskerville fortune — the vast estates, the wealth, the legacy that should have been his father's. He raised his own son on the same bitter diet: Jack. Jack Stapleton. Or rather, Jack Baskerville.

"Stapleton was educated, intelligent, and consumed by a single obsession," Holmes says. "He believed the Baskerville fortune was stolen from his line. He spent years planning his revenge — not a crime of passion, Sir Henry, but a cold, methodical campaign of extermination. He moved to Dartmoor. He established himself as a naturalist. He bred the hound. He cultivated Laura Lyons to lure Sir Charles to the gate. And when Sir Charles was dead, he waited for you."

Holmes stops pacing and looks at Sir Henry. "The phosphorus was the key. A large dog, painted with phosphorus, running through the dark — it would look exactly like the legend. Exactly like the curse. Stapleton did not just want to kill the Baskervilles. He wanted them to die afraid. He wanted them to believe the curse was real."`,
    content: [
      {
        id: 'ask_about_stapleton_past',
        label: 'Ask Holmes about Stapleton\'s background and education',
        keywords: ['stapleton', 'past', 'background', 'education', 'ask', 'holmes', 'history'],
        discovery: 'Holmes retrieves the forged documents from the satchel. "Stapleton was educated at Cambridge — I have confirmed this through my contacts. He studied natural sciences, which gave him his cover as a naturalist. He was brilliant, by all accounts — a first-class mind wasted on a single, poisonous obsession. After Cambridge, he disappeared. Changed his name. Moved to Dartmoor. Spent three years establishing himself as a harmless eccentric with a butterfly net." He pauses. "The tragedy, Watson, is that he was genuinely talented. His entomological work was published in several journals. He could have had a legitimate career. Instead, he chose murder."'
      },
      {
        id: 'ask_about_hound_breeding',
        label: 'Ask how Stapleton bred and trained the hound',
        keywords: ['hound', 'breeding', 'training', 'ask', 'holmes', 'mastiff', 'phosphorus', 'dog'],
        discovery: '"The notebook tells most of it," Holmes says. "Stapleton purchased the mastiff from a dealer in London — a man who breeds fighting dogs for the underworld. The animal was already large and aggressive. Stapleton kept it in the kennel in the Mire, feeding it on raw meat and training it to follow specific scents. The phosphorus paste was his own invention — a mixture of phosphorus and lard that adheres to the animal\'s coat and glows in the dark. He tested it first on the smaller dog — the original hound — and when that worked, he scaled up." Holmes shakes his head. "The ingenuity of it, Watson. The sheer, wasted ingenuity. If Stapleton had applied that mind to any legitimate pursuit, he would have been a formidable scientist."'
      },
      {
        id: 'ask_about_sir_charles_death',
        label: 'Ask Holmes to explain exactly how Sir Charles died',
        keywords: ['sir charles', 'death', 'died', 'explain', 'ask', 'holmes', 'gate', 'night'],
        discovery: '"Sir Charles died of fright," Holmes says simply. "His heart was already weak — Dr. Mortimer confirmed this. On the night of his death, he went to the garden gate as he often did, to await Laura Lyons — though she never came. Stapleton released the hound. The creature, glowing with phosphorus, came at him out of the dark. Sir Charles saw what he believed was the legend made real — the hellhound of the Baskervilles — and his heart gave out. He ran. He fell. He died." Holmes\'s voice is flat, clinical, but his eyes are not. "Stapleton did not need the hound to touch Sir Charles. He only needed Sir Charles to see it. Terror was the weapon. The hound was merely the delivery mechanism."'
      },
      {
        id: 'consider_the_estate',
        label: 'Discuss the future of the Baskerville estate with Sir Henry',
        keywords: ['estate', 'future', 'sir henry', 'baskerville', 'discuss', 'inheritance', 'land'],
        discovery: 'Sir Henry sets down his untouched brandy. "The estate is mine," he says quietly. "But it does not feel like a victory." He looks at the portraits on the wall — the generations of Baskervilles staring down from their gilt frames. "My great-uncle died on this moor. Stapleton died in the Mire. Two men dead over money and land and a family name." He turns to Holmes. "I intend to be a different kind of Baskerville, Mr. Holmes. I will live here. I will tend the land. And I will make sure that no one dies because of this family again." Holmes nods. "That, Sir Henry, is the best possible outcome."'
      }
    ],
    exitAction: 'leave_study',
    exitLabel: 'Leave Sir Henry to his reflections',
    hardExitNarration: 'Sir Henry stands at the window, looking out at the moor. The last light of day paints the heather in shades of gold and purple. The Hall is quiet. The curse is broken. Holmes touches your arm and nods toward the door. There is nothing more to say.',
    initialFacts: {
      items: ['stapleton satchel', 'forged documents'],
      metNPCs: ['holmes', 'sir_henry'],
      established: ['Stapleton was Rodger Baskerville\'s grandson', 'he changed his name and moved to Dartmoor', 'the hound was bred from a fighting mastiff', 'phosphorus paste was Stapleton\'s invention', 'Sir Charles died of fright', 'Sir Henry will inherit and live at the Hall']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'mire deep']
    }
  },
  scene_22: {
    sceneId: 'scene_22',
    sceneName: "Beryl's Freedom",
    description: `The morning room at Baskerville Hall is the warmest, lightest room in the house — a small mercy in a building designed for defence rather than comfort. Beryl Stapleton sits by the window in a shaft of pale October sunlight, wrapped in a shawl that Mrs. Barrymore has provided. She is still thin — too thin — but the colour has returned to her cheeks, and her eyes, though still haunted, have lost the desperate, hunted look you saw in the Mire.

Holmes sits opposite her, his manner gentler than you have seen it. He has asked her nothing until now — he insisted she eat first, rest first, recover first. But this morning, with your notebook open on your knee, he asks her to tell the story. And she does.

"I met him in London," she begins. "He was charming. Brilliant. He made me feel seen — truly seen — for the first time in my life. We married within six months. I did not know what he was. I did not know what he planned." Her voice is steady, but her hands twist the edge of the shawl. "When we moved to Dartmoor, everything changed. He became obsessed with the moor, with the Baskervilles, with the legend. He told me about his father — about the injustice, the stolen inheritance. He said he was going to take back what was rightfully his."

She pauses. "I was to be his sister. Not his wife. A sister is less threatening, less suspicious. A wife might object. A wife might speak out. A sister is... controllable." The word comes out bitter. "I obeyed. I was afraid. I had seen what he did to the dogs."`,
    content: [
      {
        id: 'ask_about_warning',
        label: 'Ask Beryl about her attempt to warn Sir Henry',
        keywords: ['warn', 'warning', 'sir henry', 'ask', 'beryl', 'letter', 'go back'],
        discovery: 'Beryl\'s eyes fill with tears. "The day Sir Henry arrived, I walked to the Hall. I was going to warn him — to tell him everything. But Stapleton followed me. He saw me speak to Sir Henry. He was furious." She touches her wrist, and you see the faint marks of fingers — bruises, old but not old enough. "That night, he tied me to the stake in the Mire. He said I would stay there until the work was done. Until Sir Henry was dead." She looks at you. "I thought I would die there. I thought no one would find me." Her voice breaks. "Thank you. Thank you for finding me."'
      },
      {
        id: 'ask_about_life_with_stapleton',
        label: 'Ask Beryl about her life with Stapleton on the moor',
        keywords: ['life', 'stapleton', 'ask', 'beryl', 'moor', 'years', 'married', 'fear'],
        discovery: '"The first year was bearable," Beryl says. "He was still the man I married — attentive, intelligent, passionate about his work. But as the plan took shape, he changed. He became consumed. The hound, the breeding, the training — it was all he talked about, all he thought about. I became an accessory. A prop. The \'sister\' who kept the house and smiled at visitors." She pauses. "I tried to leave once. Packed a bag in the night. He found me on the road to Grimpen. He did not hit me. He did not need to. He simply looked at me and said, \'If you leave, I will find you. And then I will find your family.\' I went back. I stayed. I obeyed."'
      },
      {
        id: 'ask_about_future',
        label: 'Ask Beryl what she wants to do now',
        keywords: ['future', 'ask', 'beryl', 'want', 'do', 'now', 'plans', 'free'],
        discovery: 'Beryl looks out the window at the moor — the vast, beautiful, terrible moor that has been her prison for three years. "I want to go somewhere green," she says quietly. "Somewhere with trees and rivers and no heather. Somewhere I can sleep without hearing the hound." She turns to Holmes. "I have a sister in Edinburgh. I have not spoken to her in years — Stapleton forbade it. But she would take me in. I know she would." Holmes nods. "I will arrange it," he says. "You will have funds, a railway ticket, and a letter of introduction. You will never have to set foot on this moor again." Beryl\'s composure finally breaks. She covers her face with her hands and weeps — not the desperate weeping of a prisoner, but the quiet, relieved weeping of a woman who is, at last, free.'
      },
      {
        id: 'offer_comfort',
        label: 'Offer Beryl words of comfort and reassurance',
        keywords: ['comfort', 'offer', 'reassure', 'beryl', 'words', 'kind', 'safe'],
        discovery: 'You speak to Beryl gently, telling her that she is safe now, that Stapleton cannot hurt her, that her courage in trying to warn Sir Henry saved his life. She listens with her head bowed, her hands clasped in her lap. When you finish, she looks up and manages a smile — the first genuine smile you have seen from her. "You are kind, Doctor," she says. "Both of you. Mr. Holmes, Dr. Watson — you have given me back my life. I did not think that was possible." She reaches out and takes your hand. Her grip is fragile but real. "I will remember this," she says. "For as long as I live, I will remember what you did for me."'
      }
    ],
    exitAction: 'leave_morning_room',
    exitLabel: 'Leave Beryl to her rest',
    hardExitNarration: 'Holmes rises and bows — a gesture of respect that you have seen him make perhaps twice in all the years you have known him. "Mrs. Stapleton," he says — using her real title for the first time — "you have nothing to fear. Not anymore." He closes the door quietly behind you. In the corridor, he pauses. "A brave woman, Watson. Braver than she knows. She tried to do the right thing, and she paid for it. We must make sure she is looked after."',
    initialFacts: {
      items: [],
      metNPCs: ['holmes', 'beryl'],
      established: ['Beryl was Stapleton\'s wife, forced to play his sister', 'she tried to warn Sir Henry and was punished', 'she wants to go to her sister in Edinburgh', 'Holmes will arrange her passage and funds', 'Beryl is free']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'mire', 'moor open']
    }
  },
  scene_23: {
    sceneId: 'scene_23',
    sceneName: 'Return to London',
    description: `The train pulls out of Dartmoor station at half past ten, and the moor begins to recede — first the tors, then the heather, then the grey ribbon of the road that leads to Baskerville Hall. Watson watches from the window as the landscape that has dominated his life for the past weeks dissolves into the soft green hills of Devon. Holmes sits opposite, reading a newspaper with the air of a man who has not just solved one of the most extraordinary cases of his career.

The compartment is warm, the rhythm of the wheels is soothing, and for the first time in days, Watson feels the tension leaving his shoulders. The case is closed. Sir Henry is safe. Beryl Stapleton is on her way to Edinburgh. Lestrade has returned to Scotland Yard with enough evidence to satisfy any coroner. The hound is dead. The curse is broken.

"You are quiet, Watson," Holmes observes, lowering his paper. "Are you composing your account of the case already?" Watson admits that he is — or at least, he is thinking about it. Holmes smiles. "You will call it something dramatic, no doubt. 'The Hound of the Baskervilles,' perhaps. Or 'The Curse of the Moor.' I would prefer something more precise. 'The Stapleton Affair' has a certain clinical elegance."

The train gathers speed. The green hills give way to the flatlands of Somerset, and then to the suburbs of London — brick terraces, gas works, railway sidings, the familiar grime of the city. By late afternoon, the train slides into Paddington Station, and the noise and bustle of London closes around them like a warm coat.`,
    content: [
      {
        id: 'discuss_case',
        label: 'Discuss the case with Holmes on the train',
        keywords: ['discuss', 'case', 'train', 'holmes', 'talk', 'review', 'stapleton'],
        discovery: 'Holmes folds his newspaper and regards you with the look that means he is about to be expansive. "The case had everything, Watson. A classic villain — intelligent, patient, methodical. A classic victim — brave, naive, trusting. A classic setting — the moor, the Mire, the Hall. And a classic method — fear. Stapleton understood that the most powerful weapon is not a knife or a gun but an idea. The idea that the Baskerville curse was real. That a hellhound walked the moor. That the dead could reach out and kill the living." He pauses. "It was, in its way, a masterpiece. A terrible, wasted masterpiece."'
      },
      {
        id: 'read_newspaper',
        label: 'Read the newspaper Holmes has been studying',
        keywords: ['newspaper', 'read', 'study', 'paper', 'news', 'article', 'press'],
        discovery: 'Holmes hands you the paper. The headline reads: "MYSTERIOUS DEATH ON DARTMOOR — Naturalist Lost in Bog." The article describes Stapleton as a respected local naturalist who wandered into the Grimpen Mire during fog and was presumed drowned. No mention of the hound, no mention of the Baskerville connection, no mention of murder. Holmes catches your expression. "The official version, Watson. Lestrade has been thorough. The inquest will record an accidental death. Sir Henry\'s name will not appear. The Baskerville legend will fade into the obscurity it deserves." He takes back the paper. "Some truths are better served by discretion than by headlines."'
      },
      {
        id: 'plan_account',
        label: 'Talk with Holmes about how to write up the case',
        keywords: ['plan', 'account', 'write', 'case', 'story', 'publish', 'watson', 'notes'],
        discovery: '"You must write it, Watson," Holmes says firmly. "The world should know — not the sensational details, but the truth. That there was no curse. No supernatural hound. Just a man with a grievance and a dog with phosphorus." He leans forward. "But I ask one thing. Wait a year. Let Sir Henry settle. Let Beryl find her peace. Let the moor forget." He settles back in his seat. "And Watson — when you do write it, do not make me too heroic. I was merely the instrument. The real hero was Sir Henry, who walked that moor knowing what was waiting for him. And you, Watson, who stood your ground when the hound came."'
      },
      {
        id: 'look_out_window',
        label: 'Watch the English countryside pass by the window',
        keywords: ['window', 'watch', 'countryside', 'landscape', 'train', 'pass', 'view'],
        discovery: 'You watch the countryside roll past — green fields, hedgerows, church spires, the gentle, civilised landscape of England. It is a world away from the moor. No heather. No tors. No bogs. No fog. You realise, with a sudden clarity, how much the moor has affected you — how its vastness, its silence, its ancient indifference have seeped into your bones. You are glad to be leaving. You are not sure you will ever go back. Holmes, watching your face, says nothing. But he reaches into his coat pocket, produces his pipe, and begins to fill it with the slow, deliberate care of a man who is, for once, content.'
      }
    ],
    exitAction: 'arrive_paddington',
    exitLabel: 'Step off the train at Paddington Station',
    hardExitNarration: 'The train shudders to a halt. Holmes stands, collects his bag, and steps onto the platform with the easy grace of a man returning to familiar territory. "Come, Watson," he says. "Mrs. Hudson will have tea waiting, and I have a violin that has been neglected for far too long." He strides toward the exit, and you follow, and the noise of London swallows you both.',
    initialFacts: {
      items: [],
      metNPCs: ['holmes'],
      established: ['returned to London by train', 'the case is officially closed', 'Stapleton\'s death recorded as accidental', 'Sir Henry is safe', 'Beryl is on her way to Edinburgh']
    },
    locationKeywords: {
      banned: ['dartmoor', 'moor', 'mire', 'baskerville hall', 'grimpen', 'stone circle']
    }
  },
  scene_24: {
    sceneId: 'scene_24',
    sceneName: 'The Fireside',
    description: `221B Baker Street. The fire is lit, the curtains are drawn, and the familiar room is exactly as you left it — the chemical apparatus on the side table, the violin case propped against the bookshelf, the Persian slipper nailed to the mantelpiece with its cargo of shag tobacco. Mrs. Hudson has brought tea and left it on the low table between the armchairs, and the steam rises in lazy spirals toward the ceiling.

Holmes sits in his chair, his long legs stretched toward the fire, his pipe producing a fragrant cloud that mingles with the coal smoke. He has been silent for twenty minutes — an eternity for Holmes — and you know better than to interrupt. He is thinking. Or perhaps he is simply resting. Even Holmes, you reflect, must rest sometimes.

The case is over. The papers have reported the death of a naturalist on Dartmoor — a tragic accident, a man who knew the moor and yet was claimed by it. No mention of hounds, no mention of curses, no mention of the Baskerville fortune. Sir Henry has written to say he is settling in well. Beryl has written from Edinburgh — a short, grateful letter that Holmes read twice before placing it in his file. Lestrade has sent a bottle of port, which sits unopened on the sideboard.

The fire crackles. The clock ticks. London murmurs outside the window — carriages, voices, the distant clang of a bell. The world is ordinary again. Safe. Predictable.

Holmes removes his pipe and looks at you. "Watson," he says. "Do you believe in curses?"`,
    content: [
      {
        id: 'answer_holmes',
        label: 'Answer Holmes\'s question about curses',
        keywords: ['answer', 'curse', 'curses', 'believe', 'question', 'holmes', 'supernatural'],
        discovery: 'Holmes listens to your answer with his head tilted and his eyes half-closed. Then he nods slowly. "No," he says. "Nor do I. And yet — " He pauses, and for a moment his expression is not that of a scientist or a detective but of a man who has spent too many nights on a dark moor. "And yet, Watson, there are nights when I think the moor itself is alive. Not in any supernatural sense. But in the way that a place can hold a memory. A grief. A violence. The Mire has been swallowing things for ten thousand years. Perhaps it remembers." He shakes himself, and the moment passes. "Nonsense," he says briskly. "Pass the tea."'
      },
      {
        id: 'discuss_legacy',
        label: 'Discuss what the Baskerville case means in the larger picture',
        keywords: ['discuss', 'legacy', 'case', 'larger', 'picture', 'meaning', 'baskerville'],
        discovery: '"Every case teaches something," Holmes says, drawing on his pipe. "The Baskerville case taught me that the most dangerous criminals are not the desperate ones but the patient ones. Stapleton spent three years planning a murder that would look like a supernatural event. He was willing to wait, to endure, to sacrifice — his wife, his career, his identity — for a goal that was, in the end, hollow." He stares into the fire. "The Baskerville fortune is not large, Watson. A few thousand pounds a year. A house on a moor. Stapleton could have earned ten times that with his mind. But the obsession consumed him. It always does." He looks at you. "Remember that, Watson. The next time you are tempted to pursue something with single-minded intensity — remember Stapleton, and the Mire."'
      },
      {
        id: 'ask_about_next_case',
        label: 'Ask Holmes if there are any new cases waiting',
        keywords: ['next', 'case', 'new', 'ask', 'waiting', 'client', 'adventure'],
        discovery: 'Holmes reaches into the pocket of his dressing gown and produces a small stack of letters. "Three," he says. "A missing pearl necklace in Mayfair. A threatening letter received by a bishop in Surrey. And — " he holds up the last letter and you see his eyes gleam " — a most singular communication from a young woman in滠 who claims her fiancé has been replaced by an impostor. An exact physical duplicate, she says, but with a different personality." He sets down his pipe. "The game, Watson, as they say, is afoot." But he does not rise. Not yet. For now, the fire is warm, the tea is hot, and the moor is far away.'
      },
      {
        id: 'reflect_on_moors',
        label: 'Look out the window and think about the moor',
        keywords: ['reflect', 'moor', 'window', 'think', 'dartmoor', 'remember', 'quiet'],
        discovery: 'You rise and draw back the curtain. Outside, Baker Street is wet with evening rain — gas lamps reflecting in puddles, a hansom cab rattling past, a flower girl huddled under an awning. It is as far from Dartmoor as it is possible to be. And yet, for a moment, you can hear it — the wind across the heather, the distant cry of a bird, the silence that is not silence but the absence of everything human. You can smell the peat and the wet earth. You can feel the fog on your face. Then a cab driver shouts, a door slams, and the moor is gone. You let the curtain fall and return to the fire. Holmes is watching you. He says nothing. He does not need to. He was there too. He heard it as well.'
      }
    ],
    exitAction: 'close_adventure',
    exitLabel: 'Sit back by the fire and enjoy the evening',
    hardExitNarration: 'Holmes picks up his violin and draws the bow across the strings — a slow, melancholy air that fills the room and drifts out through the window into the London night. The fire burns low. The tea grows cold. The case of the Hound of the Baskervilles is over. But on still nights, they say, if you stand on the edge of the Grimpen Mire and listen very carefully, you can still hear howling — faint, distant, mournful — rising from the dark heart of the moor.',
    initialFacts: {
      items: [],
      metNPCs: ['holmes'],
      established: ['returned to Baker Street', 'case is fully closed', 'Holmes reflects on curses and obsession', 'the moor is quiet now', 'new cases are waiting']
    },
    locationKeywords: {
      banned: ['dartmoor', 'moor', 'mire', 'baskerville hall', 'grimpen', 'stone circle', 'merripit']
    }
  }
};
