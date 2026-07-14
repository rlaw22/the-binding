/**
 * The Hound of the Baskervilles — Act 1 Manifests: The Problem
 * Scenes 0-4: Baker Street introduction, the manuscript, meeting Sir Henry, the boot mystery, departure for Dartmoor
 */

module.exports = {
  scene_00: {
    sceneId: 'scene_00',
    sceneName: '221B Baker Street',
    description: `The sitting room at 221B Baker Street is thick with the fug of shag tobacco and the chemical tang of Holmes's latest experiment — a row of test tubes arranged on the mantelpiece, their contents bubbling gently over a spirit lamp. The fire is banked high against the October chill, and the familiar chaos of the room presses in from every angle: the Persian slipper nailed to the chimney-piece with its cargo of tobacco, the jack-knife pinning correspondence to the mantel with a cleft stick, the stack of newspapers on the side table, the violin case propped against the bookshelf.

Holmes sprawls in his armchair, his long legs stretched toward the hearth, his eyes half-closed in that deceptive languor that precedes either a burst of energy or a week of lethargy. He has been quiet all morning — a dangerous sign. When Holmes is quiet, something is fermenting behind those sharp grey eyes.

Mrs. Hudson's voice rises from the hallway below: "A gentleman to see you, Mr. Holmes. A Dr. Mortimer."

Holmes's eyes open. He does not move, but something in his posture changes — a tightening, like a hound catching a scent. "Mortimer," he repeats. "Mortimer. The name is familiar. Send him up, Mrs. Hudson."

The man who enters is of medium height, with a thin, clean-shaven face and spectacles that catch the firelight. He carries a walking stick in one hand and a leather portfolio under his arm. His manner is that of a man who has rehearsed what he wants to say and is now uncertain how to begin.

"Mr. Holmes," he says. "I have come to consult you on a matter of the most extraordinary nature. A matter that involves the ancient family of Baskerville and a legend that has haunted Dartmoor for two hundred years."`,
    content: [
      {
        id: 'greet_mortimer',
        label: 'Welcome Dr. Mortimer and ask him to sit',
        keywords: ['greet', 'welcome', 'mortimer', 'sit', 'chair', 'please', 'enter'],
        discovery: 'You gesture toward the chair opposite Holmes. Mortimer sits, placing his portfolio on his knees with the careful precision of a man who values order. His hands are steady — a surgeon\'s hands, you note — but there is a tension in his shoulders that speaks of sleepless nights. "Thank you," he says. "I must confess I was not sure whether to come. The matter is so... unusual. I feared you would think me mad." Holmes waves this away with a long, pale hand. "The more unusual, the better, Dr. Mortimer. I am sick of the commonplace. Pray, begin."'
      },
      {
        id: 'examine_mortimer',
        label: 'Study Dr. Mortimer carefully as he enters',
        keywords: ['examine', 'study', 'mortimer', 'observe', 'look', 'appearance', 'manner'],
        discovery: 'You study the newcomer with the eye Holmes has taught you. Dr. Mortimer is a man of science — his bearing, his precise speech, the calluses on his fingers that mark a life of dissection and careful work. But there is something else: a haunted quality in his eyes, the look of a man who has seen something that his rational mind cannot explain. His clothes are well-made but travel-stained. He has come from the country — from Devon, judging by the red mud on his boots. And the portfolio under his arm is old, its leather cracked and faded, as if it contains documents of considerable age.'
      },
      {
        id: 'ask_holmes',
        label: 'Ask Holmes if he knows of the Baskerville family',
        keywords: ['ask', 'holmes', 'baskerville', 'family', 'know', 'familiar', 'name'],
        discovery: 'You catch Holmes\'s eye. He gives the faintest shake of his head — he does not know Mortimer personally, but the name Baskerville has clearly registered. "The Baskervilles," Holmes murmurs, reaching for his pipe. "An old Devonshire family. One of the oldest in England, if I am not mistaken. The estate has been in the family since the reign of Henry the Second." He turns to Mortimer. "You said a legend, Doctor. I am all attention."'
      },
      {
        id: 'examine_stick',
        label: 'Notice the walking stick Mortimer has brought',
        keywords: ['stick', 'walking', 'examine', 'notice', 'mortimer', 'brought', 'cane'],
        discovery: 'Your eye is drawn to the walking stick in Mortimer\'s hand — a handsome object, thick and well-made, with a silver band near the top. On the band, an inscription is visible: "To James Mortimer, M.R.C.S., from his friends of the C.C.H." The stick is old but lovingly maintained, its wood polished to a deep shine. Holmes notices you looking and his eyes narrow — you can see him cataloguing the object, filing it away for later use. "A fine stick, Doctor," he says casually. "The C.C.H. — that would be the Castleton Country Hospital, I presume?"'
      }
    ],
    exitAction: 'hear_mortimer',
    exitLabel: 'Listen as Dr. Mortimer begins his extraordinary tale',
    hardExitNarration: 'Mortimer opens his portfolio with trembling fingers. The paper inside is old — very old — the ink faded to a pale brown, the edges brittle with age. "This manuscript," he says, "was written in 1742 by Sir Hugo Baskerville\'s own hand. It tells the story of how the curse began." He begins to read, and the fire crackles, and the room grows very still.',
    initialFacts: {
      items: [],
      metNPCs: ['holmes', 'watson', 'mortimer'],
      established: ['Dr. Mortimer has come to consult Holmes', 'the matter involves the Baskerville family of Dartmoor', 'Mortimer has brought an old manuscript', 'the case involves a legend two hundred years old']
    },
    locationKeywords: {
      banned: ['dartmoor', 'moor', 'baskerville hall', 'grimpen', 'mire', 'train', 'station']
    }
  },

  scene_01: {
    sceneId: 'scene_01',
    sceneName: 'The Baskerville Manuscript',
    description: `The fire has burned lower. The gas lamps cast a warm amber glow over the sitting room, and outside the window Baker Street is quiet — the evening traffic reduced to the occasional clatter of a hansom cab on wet cobblestones. Dr. Mortimer sits forward in his chair, the ancient manuscript held carefully in both hands, his spectacles reflecting the firelight as he reads.

The manuscript is written in a cramped, angular hand — the script of a man accustomed to recording facts rather than composing prose. The paper is thick, cream-coloured, and water-stained in places, as if it has survived floods or damp cellars. The ink has faded to the colour of old tea, but the words are still legible.

Holmes sits motionless in his chair, his pipe forgotten in his hand, his eyes fixed on Mortimer's face with an intensity that would unsettle a lesser man. You have seen that look before — the look of a bloodhound on the scent. Whatever Mortimer is about to read, Holmes is already hungry for it.

The manuscript tells of Sir Hugo Baskerville — a man of violent temperament and dissolute habits, who lived in the reign of the first Georges. It tells of a young woman stolen from her home and imprisoned in the upper rooms of Baskerville Hall. It tells of Sir Hugo and his companions, drunk and reckless, riding out across the moor on a moonlit night to pursue the escaped girl. And it tells of what they found.

Or rather — what found them.`,
    content: [
      {
        id: 'listen_manuscript',
        label: 'Listen carefully as Mortimer reads the manuscript',
        keywords: ['listen', 'manuscript', 'read', 'mortimer', 'story', 'tale', 'baskerville'],
        discovery: 'Mortimer reads in a low, measured voice: "Sir Hugo and his companions rode out across the moor in pursuit of the girl. The night was clear and the moon full. They heard her scream — and then another sound. A howl. Not of any beast known to natural history. Sir Hugo\'s horse bolted. When his companions found him, he was dead — his face twisted in an expression of such terror that two of the party fainted at the sight. Beside him, on the turf, they saw the marks of an enormous hound. The creature was never seen. But from that night to this, the Baskerville family has been haunted by a hound of supernatural aspect and malevolent purpose." Mortimer lowers the manuscript. The room is silent except for the crackle of the fire.'
      },
      {
        id: 'examine_manuscript',
        label: 'Ask to examine the manuscript closely',
        keywords: ['examine', 'manuscript', 'paper', 'close', 'look', 'ink', 'age', 'ask'],
        discovery: 'Holmes extends a hand and Mortimer passes him the manuscript. Holmes holds it to the light, studying the paper, the ink, the handwriting with the practised eye of a man who has examined hundreds of documents. "The paper is consistent with the mid-eighteenth century," he says. "The ink is iron gall — standard for the period. The handwriting is that of an educated man, probably left-handed, writing in haste." He turns the pages carefully. "There are annotations in the margin — later additions, in a different hand. Someone has been studying this document over the years." He hands it back. "The manuscript is genuine, Dr. Mortimer. Whether the content is factual is, of course, another matter."'
      },
      {
        id: 'ask_about_curse',
        label: 'Ask Mortimer if he believes in the curse',
        keywords: ['curse', 'believe', 'ask', 'mortimer', 'supernatural', 'hound', 'legend'],
        discovery: 'Mortimer removes his spectacles and polishes them — a nervous habit, you suspect. "As a man of science," he says carefully, "I do not believe in the supernatural. As a man who has lived on Dartmoor for twenty years and who knew Sir Charles Baskerville intimately — I am not so certain." He replaces his spectacles. "Sir Charles believed. He believed absolutely. And on the night of May the fourth, he was found dead at the gate of Baskerville Hall with an expression on his face that I have never seen on any corpse in twenty years of medical practice. An expression of pure, absolute terror."'
      },
      {
        id: 'ask_about_sir_charles',
        label: 'Ask about Sir Charles Baskerville\'s death',
        keywords: ['sir charles', 'death', 'died', 'ask', 'mortimer', 'dead', 'gate', 'night'],
        discovery: 'Mortimer\'s voice drops. "Sir Charles was found at the garden gate of the Hall. He was lying face down, his arms extended, his fingers dug into the ground. There were no marks of violence on his body. His heart — which was already weak — had simply stopped. But his face..." He pauses. "His face was contorted into an expression of such horror that I could not bring myself to record it in my official report. I wrote \'heart failure,\' which was technically true. But something killed Sir Charles Baskerville that night, and it was not his heart alone." He looks at Holmes. "Near the body, in the soft earth, I found the prints of an enormous hound."'
      }
    ],
    exitAction: 'consider_case',
    exitLabel: 'Think about the implications of the manuscript',
    hardExitNarration: 'Holmes rises from his chair and stands before the fire, his long shadow stretching across the room. "This is a three-pipe problem," he says, reaching for the Persian slipper. "Dr. Mortimer, you have brought me something genuinely interesting. The question is: is this a case for the police, or for me?" He turns, his eyes gleaming. "I think, Watson, that Dartmoor is calling us."',
    initialFacts: {
      items: ['mortimer walking stick'],
      metNPCs: ['holmes', 'watson', 'mortimer'],
      established: ['the Baskerville family is cursed by a supernatural hound', 'Sir Hugo Baskerville died on the moor two hundred years ago', 'Sir Charles Baskerville died at the gate of the Hall', 'enormous hound prints were found near Sir Charles\'s body', 'Mortimer believes something unnatural is at work']
    },
    locationKeywords: {
      banned: ['dartmoor', 'moor', 'baskerville hall', 'grimpen', 'mire', 'train', 'station']
    }
  },

  scene_02: {
    sceneId: 'scene_02',
    sceneName: 'Sir Henry Baskerville',
    description: `The next morning finds you back at 221B Baker Street. The fire is lit, the breakfast things have been cleared away, and Holmes is pacing before the window with the restless energy of a man who has not slept — which, knowing Holmes, he has not. The ash-tray on the mantelpiece is full, and the air is blue with the ghosts of a dozen pipes.

"He is coming at ten-thirty," Holmes says, without turning from the window. "Sir Henry Baskerville. The heir. Mortimer brought his card yesterday — the young man arrived in London from Canada only two days ago. He is the last of the Baskervilles, Watson. The last link in a chain that stretches back to the reign of Henry the Second."

At precisely half past ten, Mrs. Hudson announces the visitor. Sir Henry Baskerville is a compact, well-built man of about thirty, with a strong, pleasant face and the steady eyes of a man who has spent his life outdoors. His manner is open and direct — the manner of the colonies, where pretence is a luxury few can afford. He is dressed in a tweed suit that is new but already creased, as if he has been sitting in it for hours.

"Mr. Holmes," he says, extending a hand. "Dr. Mortimer tells me you are the man to see about my family's little problem. I must say, I find the whole business rather hard to credit. A ghost dog on a moor? In Canada we would shoot it and have done."

But even as he speaks, his eyes are not entirely steady. There is a tension in his jaw, a tightness around his mouth, that suggests Sir Henry Baskerville is not quite as sceptical as he would like to appear.`,
    content: [
      {
        id: 'greet_sir_henry',
        label: 'Welcome Sir Henry and offer him a seat',
        keywords: ['greet', 'welcome', 'sir henry', 'seat', 'sit', 'offer', 'chair'],
        discovery: 'Sir Henry drops into the armchair with the ease of a man accustomed to rough furniture. He looks around the room with frank curiosity — the chemical apparatus, the violin, the jack-knife in the mantel, the Persian slipper stuffed with tobacco. "Quarters," he says approvingly. "Reminds me of my lodgings in Montreal. Though I didn\'t have a violin." He grins, and for a moment the tension leaves his face. Then it returns. "Mr. Holmes, I\'ll be plain. Dr. Mortimer has told me about the curse. I think it\'s nonsense. But my great-uncle is dead, and I intend to live in the Hall, and I want to know if there is any real danger."'
      },
      {
        id: 'observe_sir_henry',
        label: 'Study Sir Henry carefully as he speaks',
        keywords: ['observe', 'study', 'sir henry', 'watch', 'manner', 'appearance', 'look'],
        discovery: 'You study Sir Henry with the eye Holmes has trained in you. He is strong and fit — the build of a man who has worked with his hands. His face is open and honest, but there is a stubbornness in the set of his jaw that suggests he will not easily be turned from his purpose. His hands are calloused, his skin weathered by outdoor life. He is not a man who frightens easily. But when he mentions the curse, his eyes flicker — just for an instant — toward the window, as if he expects to see something on the street below. He is afraid. He is trying very hard not to show it.'
      },
      {
        id: 'ask_about_inheritance',
        label: 'Ask Sir Henry about the Baskerville estate and inheritance',
        keywords: ['inheritance', 'estate', 'ask', 'sir henry', 'baskerville', 'money', 'property'],
        discovery: 'Sir Henry leans forward. "The estate is considerable — the Hall, the lands, and a fortune of some seven hundred and forty thousand pounds. I am the sole heir. Sir Charles had no children, and I am the last of the direct line." He pauses. "There are other Baskervilles, distant cousins and such, but none with a claim. It all comes to me." He looks at Holmes. "I know what you\'re thinking, Mr. Holmes. That someone might want me out of the way for the money. But who? The estate is entailed — it cannot be sold or divided. If I die without heirs, it goes to some distant relation no one has ever heard of."'
      },
      {
        id: 'ask_about_letters',
        label: 'Ask Sir Henry if he has received any unusual communications',
        keywords: ['letters', 'ask', 'sir henry', 'communications', 'unusual', 'warning', 'threat'],
        discovery: 'Sir Henry reaches into his coat pocket and produces a folded sheet of paper. "I received this at my hotel this morning," he says. "It was among my letters — I cannot think how it came there." He unfolds it and holds it out. The message is composed of words cut from a newspaper and pasted in a rough line: "As you value your life or your reason, keep away from the moor." The words are stark, black, unmistakable. Holmes takes the paper and examines it with intense concentration, holding it close to the lamp. "Interesting," he murmurs. "The words are from yesterday\'s Times. The paste is still fresh. This was assembled last night."'
      }
    ],
    exitAction: 'receive_warning',
    exitLabel: 'Think about the anonymous warning letter',
    hardExitNarration: 'Holmes holds the warning letter to the light, his eyes narrowed. "Someone does not want you to go to Dartmoor, Sir Henry," he says. "The question is: is this a warning from a friend, or a threat from an enemy?" He places the letter carefully on the desk. "Watson, I think our course is clear. Sir Henry must go to Dartmoor — but he must not go alone."',
    initialFacts: {
      items: ['mortimer walking stick', 'baskerville manuscript'],
      metNPCs: ['holmes', 'watson', 'mortimer', 'sir_henry'],
      established: ['Sir Henry Baskerville has arrived from Canada', 'he is the sole heir to the Baskerville estate', 'the estate is worth seven hundred and forty thousand pounds', 'an anonymous warning letter has been received', 'the warning was assembled from newspaper cuttings']
    },
    locationKeywords: {
      banned: ['dartmoor', 'moor', 'baskerville hall', 'grimpen', 'mire', 'train', 'station']
    }
  },

  scene_03: {
    sceneId: 'scene_03',
    sceneName: 'The Boot Mystery',
    description: `The Northumberland Hotel is a grand establishment on the corner of Northumberland Avenue and the Strand — all marble floors, brass fittings, and the hushed efficiency of a place that caters to men of consequence. Sir Henry's rooms are on the second floor: a sitting room and bedroom, comfortable but impersonal, with a view of the street below.

You have come to escort Sir Henry to Baker Street, where Holmes is waiting. But the moment you enter the sitting room, Sir Henry's face is flushed with irritation.

"Someone has been through my things," he says sharply. "I left a boot — a new brown leather boot — on the dressing table this morning. It was there when I went down to breakfast. Now it is gone."

He gestures at the dressing table. It is bare — polished wood, a hairbrush, a comb, a pin tray. No boot. The room has been tidied by the hotel staff, but Sir Henry is adamant: the boot was new, he had worn it only once, and it is not the sort of thing a hotel porter would remove without asking.

Holmes, when you telephone him, is immediately interested. "A boot?" he says. "Which boot? The new one or the old one?" You confirm it is the new brown boot — the one Sir Henry was wearing when he arrived in London yesterday. "Fascinating," Holmes says. "Tell Sir Henry I shall be there directly."

He arrives within the hour, and the examination begins.`,
    content: [
      {
        id: 'search_room',
        label: 'Search the room thoroughly for the missing boot',
        keywords: ['search', 'room', 'boot', 'missing', 'find', 'look', 'thorough', 'under'],
        discovery: 'You search the room with methodical care — under the bed, behind the wardrobe, beneath the cushions, in the wardrobe itself. The boot is not there. Holmes checks the window — it is latched from the inside, three floors above the street. No one could have entered that way. He examines the door lock. "No sign of forced entry," he says. "Whoever took the boot had a key, or was admitted by someone who did." He turns to Sir Henry. "How many boots did you bring from Canada?" Sir Henry counts: "Three pairs. Two old, one new. The new brown pair I was wearing yesterday." Holmes nods slowly. "And now one of the new pair is missing. Only one. Not both."'
      },
      {
        id: 'question_staff',
        label: 'Ask the hotel staff about the missing boot',
        keywords: ['staff', 'ask', 'question', 'boot', 'missing', 'porter', 'maid', 'hotel'],
        discovery: 'The hotel porter — a dignified man with impressive side-whiskers — denies all knowledge. "No one has entered Mr. Baskerville\'s rooms this morning except the chambermaid, and she would not touch a guest\'s belongings, sir." The chambermaid, when questioned, is equally emphatic: she made the bed, dusted the furniture, and did not see any boot on the dressing table. Holmes watches both of them with his head tilted and his eyes half-closed. When they leave, he says: "They are telling the truth, Watson. Neither of them took the boot. Someone else was in this room — someone the staff did not see."'
      },
      {
        id: 'examine_door',
        label: 'Examine the door and lock for signs of entry',
        keywords: ['door', 'lock', 'examine', 'entry', 'signs', 'key', 'forced', 'scratch'],
        discovery: 'Holmes kneels before the door and examines the lock with his lens. The brass is polished, the mechanism smooth. There are no scratches, no signs of picking. "A professional job," he murmurs. "Or someone with a key." He straightens. "Watson, there are only three keys to this room: Sir Henry\'s, the porter\'s, and the master key kept in the hotel office. I have already spoken to the porter. The master key hangs on a hook in the office — anyone could have taken it for a few minutes and returned it without being noticed." He pauses. "The question is not how the boot was taken, but why. A single boot — not a pair, not money, not documents. A single brown leather boot."'
      },
      {
        id: 'discuss_significance',
        label: 'Discuss with Holmes why someone would steal a single boot',
        keywords: ['discuss', 'significance', 'boot', 'single', 'why', 'holmes', 'reason', 'purpose'],
        discovery: 'Holmes paces the room, his hands behind his back. "A single boot," he muses. "Not valuable in itself. Not sentimental. Not containing any hidden document or secret compartment — I have examined the other boot and it is perfectly ordinary." He stops at the window and looks down at the street. "There are two possibilities, Watson. Either the thief wanted something that was on the boot — a scent, a trace, a sample of leather or polish — or the theft was a test. A test to see how Sir Henry would react. To see if he was being watched. To see if he was afraid." He turns. "In either case, it tells us something important: whoever took that boot knows Sir Henry is in London, knows where he is staying, and is paying very close attention to his movements."'
      }
    ],
    exitAction: 'return_baker_street',
    exitLabel: 'Go back to Baker Street with Sir Henry',
    hardExitNarration: 'Holmes ushers you and Sir Henry out of the hotel and into a waiting cab. As the cab rattles toward Baker Street, Holmes is unusually quiet. His eyes are distant, his fingers drumming on his knee. At last he speaks: "Watson, the game is afoot. Someone is watching Sir Henry — watching him closely — and that someone has access to his private rooms. We are not dealing with a legend, Watson. We are dealing with a very real, very present danger."',
    initialFacts: {
      items: ['mortimer walking stick', 'baskerville manuscript'],
      metNPCs: ['holmes', 'watson', 'sir_henry'],
      established: ['a brown boot has been stolen from Sir Henry\'s hotel room', 'only one boot was taken — not a pair', 'no sign of forced entry', 'someone with access to the hotel took it', 'Holmes believes someone is watching Sir Henry closely']
    },
    locationKeywords: {
      banned: ['dartmoor', 'moor', 'baskerville hall', 'grimpen', 'mire', 'train', 'station']
    }
  },

  scene_04: {
    sceneId: 'scene_04',
    sceneName: 'Departure for Dartmoor',
    description: `The cab pulls up outside 221B Baker Street for the last time — for now. The October afternoon is grey and damp, the gas lamps already lit against the early dusk. Inside, the sitting room has the air of a place about to be left: the fire is low, the curtains half-drawn, and Mrs. Hudson has packed a small valise that sits by the door.

Holmes stands at the mantelpiece, his coat already on, his deerstalker hat in his hand. He has been unusually quiet all morning — a sign, you know, that his mind is working at full speed, turning over facts and possibilities like a man shuffling a deck of cards.

"Watson," he says at last. "I have made my decision. You will go to Dartmoor with Sir Henry. I shall remain in London."

You protest — you have been expecting to accompany him, not to go alone. Holmes raises a hand. "There is work to be done here that only I can do. The anonymous letter, the stolen boot, the newspaper from which the words were cut — these are London clues, Watson, and they require London methods. You are the man for Dartmoor. You have the eye, the courage, and the medical training to observe what needs to be observed."

He turns to Sir Henry, who stands by the window looking out at the grey street. "Sir Henry, I must impress upon you one thing above all others. Do not go out on the moor at night. Do not go alone. The moor is dangerous — not because of any curse, but because there is a very real threat, and we do not yet know its shape. Stay in the Hall after dark. Keep your revolver loaded. And write to me — every day, in detail."

Sir Henry nods, his jaw set. "I am not a coward, Mr. Holmes. But I am not a fool either. I will do as you say."

Holmes extends his hand. "Then God speed, Sir Henry. Watson — keep your eyes open. And your revolver closer."`,
    content: [
      {
        id: 'speak_to_holmes',
        label: 'Speak privately with Holmes before departure',
        keywords: ['speak', 'holmes', 'private', 'before', 'departure', 'talk', 'alone', 'instructions'],
        discovery: 'Holmes draws you aside while Sir Henry and Mortimer confer by the window. His voice is low, urgent. "Watson, I am sending you because I trust you absolutely. But I must be frank: this case is unlike any we have handled. There is a human intelligence behind these events — a mind that is patient, methodical, and ruthless. The hound, if it exists, is a tool. The real danger is the hand that wields it." He grips your arm. "Observe everything. Trust no one completely. And Watson — if you see something on the moor at night that defies explanation, do not dismiss it. Record it. The truth is often stranger than the facts."'
      },
      {
        id: 'examine_revolver',
        label: 'Check your revolver and ammunition before the journey',
        keywords: ['revolver', 'check', 'ammunition', 'weapon', 'gun', 'load', 'prepare'],
        discovery: 'You draw your service revolver from the drawer where Holmes keeps it — a Webley Mark I, well-oiled, its cylinder turning smoothly. You check the chambers: six rounds, all loaded. You slip a box of spare cartridges into your coat pocket. Holmes watches you with approval. "Good man," he says. "I do not think you will need it — but if you do, you will need it badly." He pauses. "There is one more thing. I have made enquiries about the Baskerville estate. The heir after Sir Henry, should anything happen to him, is a man named Rodger Baskerville — a distant cousin who lives somewhere in the Americas. Or so the records say." His eyes narrow. "I intend to find out more."'
      },
      {
        id: 'talk_to_mortimer',
        label: 'Speak with Dr. Mortimer about Dartmoor and the Hall',
        keywords: ['mortimer', 'speak', 'dartmoor', 'hall', 'talk', 'moor', 'advice', 'local'],
        discovery: 'Mortimer is eager to help. "The Hall is a fine old house," he says, "though it can be gloomy in winter. The Barrymores — the butler and his wife — are excellent servants, devoted to the family. You will be well looked after." He pauses. "But Dr. Watson, I must warn you: the moor is not like other places. It is vast, and empty, and ancient. There are bogs that can swallow a man whole. There are ruins that predate recorded history. And at night..." He trails off. "At night, the moor belongs to itself. No one who lives near it walks there after dark. No one."'
      },
      {
        id: 'say_farewell',
        label: 'Say goodbye to Holmes and prepare for the journey',
        keywords: ['farewell', 'goodbye', 'holmes', 'prepare', 'journey', 'leave', 'part'],
        discovery: 'You take Holmes\'s hand. His grip is firm, his eyes steady. "Write to me, Watson," he says. "Every detail. What you see, what you hear, what you feel. The smallest observation may be the key to the whole affair." He holds your gaze for a moment longer than usual. "And Watson — be careful. I have a feeling about this case. A feeling I do not often have." He releases your hand and turns to the window. "The game is afoot, Watson. The game is afoot."'
      }
    ],
    exitAction: 'depart_for_dartmoor',
    exitLabel: 'Board the train at Paddington Station',
    hardExitNarration: 'The train pulls out of Paddington at ten-fifteen, and London begins to recede — the grey terraces, the gas works, the spires and chimneys of the city dissolving into the soft green hills of the West Country. Sir Henry sits opposite you, his face set toward the window, watching the countryside change. Beside you, Dr. Mortimer dozes with his chin on his chest. The train gathers speed, and the moor draws closer — mile by mile, station by station, the landscape growing wilder, emptier, darker. By late afternoon, the heather begins. Purple, vast, stretching to the horizon. The moor. And somewhere on it, waiting, the house that has killed one Baskerville and may yet kill another.',
    initialFacts: {
      items: ['mortimer walking stick', 'baskerville manuscript', 'anonymous warning letter', 'webley revolver'],
      metNPCs: ['holmes', 'watson', 'mortimer', 'sir_henry'],
      established: ['Holmes is staying in London to investigate the London clues', 'Watson is going to Dartmoor with Sir Henry', 'Holmes has instructed Watson to observe everything and write daily', 'the moor is dangerous at night', 'the Barrymores are the servants at the Hall', 'Holmes suspects a human intelligence behind the events']
    },
    locationKeywords: {
      banned: ['dartmoor', 'moor', 'baskerville hall', 'grimpen', 'mire', 'stone circle']
    }
  }
};
