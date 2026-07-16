module.exports = {
  scene_10: {
    sceneId: 'scene_10',
    sceneName: 'The Stone Age',
    description: `The moor in daylight is a landscape from another age. You have been walking for two hours, following a path that Stapleton described — though you no longer trust his descriptions — toward the high ground where the ancient sites cluster like sentinels. The heather is in bloom, a vast carpet of purple that stretches to the horizon, broken only by outcrops of granite that jut from the earth like the bones of some buried giant.

The stone circle stands on a flat ridge, twelve pillars of grey granite arranged in a rough ring, their surfaces carved with spirals and cup-marks that have survived three thousand years of Dartmoor weather. Beyond the circle, the remains of a Bronze Age village — low walls of dry stone, barely knee-high, tracing the outlines of huts that housed people when Rome was still a marsh. And beyond that, burial mounds — long barrows, their grass-covered humps like the spines of sleeping creatures.

In one of the huts, someone has been living. The walls have been patched with heather and turf. A tin of biscuits sits on a flat stone. A pipe — a very particular pipe, with a curved stem and a well-worn bowl — rests beside it. And on a folded blanket in the corner, a pile of newspapers, each one circled and annotated in a handwriting you would know anywhere.

You hear a footstep behind you. "I rather thought you might find your way here, Watson," says a familiar voice. "You were always better at fieldwork than you gave yourself credit for."`,
    content: [
      {
        id: 'recognize_holmes',
        label: 'Turn and face the speaker',
        keywords: ['turn', 'face', 'voice', 'familiar', 'holmes', 'recognize', 'speaker'],
        discovery: 'You turn. The man standing in the doorway of the hut is not Holmes — not as you know him. He is dressed as a rough labourer, with a stained coat, heavy boots, and a wide-brimmed hat pulled low. His skin is darkened with walnut stain, and he wears a grey beard that transforms his face. But the eyes — those sharp, grey, impossibly observant eyes — are unmistakable. Holmes grins at your expression. "A fair disguise, I think. I have been on the moor for three days, living rough, watching Stapleton. He has no idea I am here."'
      },
      {
        id: 'examine_camp',
        label: 'Examine the camp Holmes has made in the hut',
        keywords: ['camp', 'examine', 'hut', 'biscuits', 'pipe', 'newspapers', 'blanket', 'inspect'],
        discovery: 'The camp is characteristically Holmesian — sparse, methodical, every item placed with purpose. The newspapers are from London, each one bearing reports of Sir Henry\'s arrival and the Baskerville case. Holmes has circled every mention of Stapleton and drawn connecting lines in the margins. A pair of binoculars lies beside the pipe. A jar of tobacco — his favourite shag — sits on the wall ledge. "I have been observing Stapleton\'s movements," Holmes says. "He goes to the Grimpen Mire every evening at dusk. Every evening, without fail. I intend to find out why."'
      },
      {
        id: 'ask_about_stapleton',
        label: 'Ask Holmes what he has learned about Stapleton',
        keywords: ['stapleton', 'ask', 'holmes', 'learned', 'observed', 'watching', 'naturalist'],
        discovery: 'Holmes\'s expression sharpens. "Stapleton is not what he appears, Watson. He is a man of education and refinement posing as a simple naturalist. His knowledge of entomology is genuine — he collects butterflies and moths with real expertise — but his interest in the moor goes far beyond science. I have watched him enter the Grimpen Mire by paths that no casual walker would know. He has a hiding place in there — somewhere among the bogs, where no one would think to look. And Watson — " Holmes pauses. "He has a dog. A very large dog. I have not seen it, but I have heard it. At night, from the direction of the Mire."'
      },
      {
        id: 'examine_stone_circle',
        label: 'Walk among the ancient stones and take in the view',
        keywords: ['stone', 'circle', 'ancient', 'walk', 'view', 'tor', 'moor', 'granite'],
        discovery: 'You walk among the standing stones. They are taller than you expected — seven, eight feet high, their surfaces rough with lichen and carved with symbols whose meaning has been lost for millennia. From the centre of the circle, the view is extraordinary. The entire moor spreads before you: the dark mass of the Grimpen Mire to the west, the grey bulk of Baskerville Hall to the northeast, and between them a vast emptiness of heather and granite. You understand now why Holmes chose this spot. From here, with binoculars, he can see everything. Everyone. The moor has no secrets from the stone circle.'
      }
    ],
    exitAction: 'leave_camp',
    exitLabel: 'Leave the camp with Holmes',
    hardExitNarration: 'Holmes gathers his pipe and newspapers with practised efficiency. "Come, Watson. We have work to do. Stapleton will be heading for the Mire soon, and I want to be in position." He pulls his hat low and leads you out of the hut, moving across the moor with the easy stride of a man who has been living on it for days.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: ['holmes'],
      established: ['Holmes has been hiding on the moor in disguise', 'Holmes has been watching Stapleton', 'Stapleton goes to the Grimpen Mire every evening', 'Stapleton has a large dog', 'Holmes found by Watson at Bronze Age hut']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'baskerville hall interior', 'mire deep']
    }
  },
  scene_11: {
    sceneId: 'scene_11',
    sceneName: 'Holmes Revealed',
    description: `You walk together across the moor as the afternoon light turns golden, and Holmes talks. He talks as he always does when the pieces are falling into place — rapidly, intensely, his hands punctuating every sentence. The disguise is remarkable: the walnut-stained skin, the grey beard, the rough clothes. But the mind behind the disguise is racing ahead, connecting facts, building the case.

"I came down secretly, Watson. Forgive me for the deception, but I needed to observe without being observed. Stapleton is clever — cleverer than I first gave him credit for. He has constructed an elaborate fiction: the friendly naturalist, the devoted sister, the quiet life on the moor. All of it is a mask."

He pauses at the top of a tor and looks out across the heather. The wind pulls at his false beard. "Beryl Stapleton is not his sister, Watson. She is his wife. I have proof — a marriage certificate from a registry office in London, dated five years ago. He forces her to play the role of sister because a wife might arouse suspicion, might ask questions, might object to what he is planning. A sister is more... controllable."

He turns to you, and his eyes are hard. "He has been breeding something in the Grimpen Mire, Watson. Something large, something terrible. I believe he has taken the legend of the Baskerville hound and made it real."`,
    content: [
      {
        id: 'ask_beryl',
        label: 'Ask Holmes about Beryl Stapleton\'s situation',
        keywords: ['beryl', 'ask', 'holmes', 'wife', 'sister', 'forced', 'situation', 'woman'],
        discovery: 'Holmes\'s expression softens — as much as Holmes\'s expression ever softens. "She is a prisoner, Watson. Not in chains, but in fear. Stapleton controls her absolutely. She obeys him because she has seen what he is capable of. But she has a conscience — I have watched her from hiding, and I have seen her weep when she thinks no one is watching. She tried to warn Sir Henry. That tells me everything I need to know about her character. When this is over, she will need our protection."'
      },
      {
        id: 'ask_butterflies',
        label: 'Ask about Stapleton\'s butterfly collection',
        keywords: ['butterfly', 'butterflies', 'moths', 'collection', 'ask', 'stapleton', 'naturalist'],
        discovery: 'Holmes nods. "The butterfly collection is genuine — Stapleton is a real entomologist, and a good one. But it serves a purpose beyond science. The Grimpen Mire is one of the few habitats in England for certain rare species. It gives him a reason — an innocent, scholarly reason — to spend hours in the Mire, alone, unmolested. No one questions a naturalist with a collecting net. No one follows him into the bogs. It is the perfect cover for whatever he is really doing in there." Holmes pauses. "I have seen him carry something into the Mire wrapped in sacking. Something heavy. Something that whimpered."'
      },
      {
        id: 'ask_evidence',
        label: 'Ask Holmes what evidence he has gathered',
        keywords: ['evidence', 'proof', 'gathered', 'ask', 'case', 'facts', 'know'],
        discovery: 'Holmes ticks off the points on his long fingers. "One: Stapleton is a Baskerville heir — I am nearly certain of it, though I need one more piece of proof. Two: he has access to a large dog, bred and trained for a purpose. Three: he lured Sir Charles to the gate on the night of his death — I suspect through Laura Lyons, a woman in the village to whom he promised marriage. Four: Beryl Stapleton is his wife, not his sister, and she lives in fear of him. Five: he goes to the Mire every evening to tend to something hidden there. The picture is forming, Watson. But I need to see the dog. I need to see the lair."'
      },
      {
        id: 'express_concern',
        label: 'Express concern for Sir Henry\'s safety',
        keywords: ['concern', 'sir henry', 'safety', 'danger', 'worried', 'protect', 'danger'],
        discovery: 'Holmes places a hand on your shoulder. "Sir Henry is in danger, Watson. Grave danger. But he is safer now than he was before — because now he has us. And we know what we are looking for." He looks out across the moor toward the distant shape of Baskerville Hall. "Stapleton will make his move soon. He must — Sir Henry is the last obstacle between him and the Baskerville fortune. When he strikes, we must be ready. We must be watching. And we must have proof that will stand in a court of law, not just a dead hound and a dead man."'
      }
    ],
    exitAction: 'continue_investigation',
    exitLabel: 'Walk with Holmes toward the Grimpen Mire',
    hardExitNarration: 'Holmes pulls his hat low and sets off across the heather with long, purposeful strides. "Stay close, Watson. And keep your revolver ready. The moor has teeth tonight." You follow him into the gathering dusk, toward the dark mass of the Grimpen Mire.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: ['holmes'],
      established: ['Beryl Stapleton is Stapleton\'s wife, not sister', 'Stapleton is likely a Baskerville heir', 'Stapleton has a large dog hidden in the Mire', 'Holmes suspects Stapleton lured Sir Charles through Laura Lyons', 'Stapleton goes to the Mire every evening']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'baskerville hall interior']
    }
  },
  scene_12: {
    sceneId: 'scene_12',
    sceneName: 'The Grimpen Mire',
    description: `The Grimpen Mire is not a place. It is a trap disguised as a landscape. From a distance, it looks like ordinary moorland — flat, green, unremarkable. But step onto it and the truth reveals itself: beneath the thin crust of vegetation lies a bottomless quagmire that has been swallowing the unwary for centuries.

Holmes leads you along a path that is not a path — a series of tussocks and firmer patches that he has memorised over days of careful exploration. One misstep, he warns, and the bog will take you. He points to a spot where the surface sags and trembles. "Watch." A Dartmoor pony, wild and shaggy, wanders too close to the edge. Its front legs break through the crust. It struggles, screaming — a sound that is horribly human. The bog sucks at it, pulling it down with a patience that is more terrifying than speed. In less than a minute, only its head is visible. In two minutes, it is gone. The surface closes over it like water, smooth and green and innocent.

Holmes marks the safe path with small cairns of stones. "I have been building these for three days," he says. "Every evening, I follow Stapleton's path into the Mire, and every evening I mark it. He goes to the same place — a patch of slightly higher ground in the centre of the bog, where the vegetation is thick enough to hide something large."

He crouches and points. In the soft earth beside the path: paw prints. Enormous. Fresh. Leading deeper into the Mire.`,
    content: [
      {
        id: 'follow_paw_prints',
        label: 'Follow the paw prints deeper into the Mire',
        keywords: ['paw', 'prints', 'follow', 'track', 'mire', 'deeper', 'hound', 'dog'],
        discovery: 'You follow the prints, stepping carefully from tussock to tussock. The prints are enormous — each print as wide as a man\'s spread hand, sunk deep into the peat. Whatever made them is heavy. Very heavy. The prints lead along a winding path that avoids the worst of the bogs, as if the creature knows the Mire intimately. After two hundred yards, the prints stop at the edge of a patch of dense gorse. Beyond the gorse, you can see the faint outline of a structure — a low building, half-buried in the vegetation. A kennel. A very large kennel.'
      },
      {
        id: 'examine_pony_death',
        label: 'Look at the spot where the pony was swallowed',
        keywords: ['pony', 'swallowed', 'bog', 'spot', 'examine', 'look', 'death', 'gone'],
        discovery: 'You go to the edge of the bog where the pony vanished. The surface is smooth and green, as if nothing has happened. But if you look closely, you can see the faint outline of the pony beneath the surface — a dark shape, slowly sinking, already being consumed by the acid peat. The smell is terrible: rotting vegetation, methane, and something else — something chemical and sharp. Holmes kneels and touches the surface with a gloved finger. "Phosphorus," he says quietly. "The same substance that coats the hound. It seeps into the bog from wherever Stapleton keeps the creature."'
      },
      {
        id: 'study_mire_paths',
        label: 'Study the cairns Holmes has placed to mark safe paths',
        keywords: ['cairn', 'cairns', 'path', 'paths', 'safe', 'stones', 'mark', 'study', 'navigate'],
        discovery: 'Holmes\'s cairns are small but precise — three stones stacked on a larger base, placed every twenty yards along the safe route. "The Mire has a logic to it," he explains. "The solid ground follows the old rock formations beneath the surface. Once you learn to read the vegetation — the colour, the density, the species — you can predict where the ground will hold and where it will not. Stapleton has spent years learning these paths. I have had three days. But three days of careful observation are worth more than years of careless habit."'
      },
      {
        id: 'smell_phosphorus',
        label: 'Notice the chemical smell in the air near the Mire',
        keywords: ['smell', 'phosphorus', 'chemical', 'air', 'notice', 'scent', 'acrid'],
        discovery: 'The smell is faint but unmistakable — a sharp, acrid tang that catches in the back of your throat. Phosphorus. Holmes notices you wrinkling your nose. "You smell it too," he says. "It is stronger here, near the centre of the Mire. Whatever Stapleton is keeping in there — the dog, the hound — it is coated in the stuff. That is how he creates the illusion of a supernatural beast. Phosphorus glows in the dark. A large dog, painted with phosphorus, would appear to burn with hellfire. The legend made real. Or rather, the legend made to look real."'
      }
    ],
    exitAction: 'leave_mire',
    exitLabel: 'Go back from the Mire before dark',
    hardExitNarration: 'Holmes checks the sky. The sun is low, the shadows lengthening across the heather. "We must go," he says. "Stapleton will be coming soon, and I do not want him to know we have found his path." He leads you back along the cairned route, each step careful, deliberate, until the solid ground of the moor is beneath your feet again. Behind you, the Mire waits — green, silent, bottomless.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: ['holmes'],
      established: ['the Grimpen Mire is a deadly bog', 'Holmes has marked safe paths with cairns', 'enormous paw prints lead into the Mire', 'a kennel is hidden in the Mire', 'phosphorus smell near the Mire', 'a pony was swallowed by the bog']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'baskerville hall interior']
    }
  },
  scene_13: {
    sceneId: 'scene_13',
    sceneName: 'Laura Lyons',
    description: `The village of Grimpen is a miserable collection of stone cottages huddled around a crossroads, as if the buildings themselves are trying to keep warm. The pub — the Crown — is the only sign of life, its windows steamed with condensation and the smell of beer and peat smoke drifting from the door. But you are not here for the pub.

Laura Lyons lives in a cottage on the far side of the village, set back from the road behind a low stone wall. She is a handsome woman of about thirty, with dark hair and careful eyes that have learned to be wary. She is the daughter of the village builder, Frankland — a litigious old man who has disowned her for her divorce. She works as a typist. She is alone.

When you mention Sir Charles Baskerville, her composure cracks. She sits down heavily and presses a hand to her mouth. "I knew this would come out," she says quietly. "I have been waiting for someone to ask."

She tells you the story in a flat, exhausted voice. Stapleton approached her a year ago. He was kind, attentive, sympathetic. He promised to marry her — promised to free her from poverty and her father's contempt. She trusted him. She confided in him. And on the night Sir Charles died, it was Stapleton who suggested she write to Sir Charles, asking him to meet her at the garden gate of Baskerville Hall at midnight.

"I did not know," she whispers. "I swear I did not know what was waiting for him."`,
    content: [
      {
        id: 'ask_about_letter',
        label: 'Ask Laura about the letter she wrote to Sir Charles',
        keywords: ['letter', 'ask', 'laura', 'sir charles', 'write', 'gate', 'midnight', 'meet'],
        discovery: 'Laura\'s hands tremble as she speaks. "Mr. Stapleton said Sir Charles was a kind man who would help me. He said if I wrote to him, asking for a private meeting at the gate, Sir Charles would come. He said it was about a charitable matter — a donation for my support." She looks up. "I wrote the letter. I asked Sir Charles to meet me at the garden gate at midnight. And then — Stapleton told me not to go. He said he had thought better of it, that it would be improper. I stayed home. And the next morning, Sir Charles was dead." Her voice breaks. "He used me. He used my letter to lure Sir Charles to that gate, and I did not see it until it was too late."'
      },
      {
        id: 'ask_about_stapleton',
        label: 'Ask Laura about her relationship with Stapleton',
        keywords: ['stapleton', 'relationship', 'ask', 'laura', 'promised', 'marriage', 'trust'],
        discovery: '"He was everything a woman could want," Laura says bitterly. "Attentive, intelligent, sympathetic. He listened to my troubles. He promised me a future. He said we would be married as soon as his circumstances improved." She laughs — a short, hard sound. "I believed him. I was lonely and desperate and I believed every word. It was only later — after Sir Charles died — that I began to understand. He never intended to marry me. He needed me for one thing only: to write that letter. To put Sir Charles at the gate at midnight. I was a tool, and he used me and set me aside."'
      },
      {
        id: 'ask_about_meeting',
        label: 'Ask if Stapleton was with her on the night Sir Charles died',
        keywords: ['night', 'stapleton', 'meeting', 'died', 'where', 'ask', 'alibi', 'present'],
        discovery: '"He was not with me," Laura says. "He said he had business in Coombe Tracey. I stayed home alone. I was anxious — I kept thinking about Sir Charles waiting at the gate, and me not coming. I almost went, to apologise, to explain. But Stapleton had told me not to." She pauses. "The next day, when I heard Sir Charles was dead, I was terrified. I went to Stapleton. He was calm. Too calm. He said it was a coincidence, that Sir Charles had died of natural causes. He told me to say nothing about the letter. He said it would only cause trouble." She looks at you with eyes full of guilt. "I have said nothing. Until now."'
      },
      {
        id: 'examine_cottage',
        label: 'Look around Laura Lyons\'s cottage',
        keywords: ['cottage', 'examine', 'look', 'around', 'home', 'room', 'poor', 'modest'],
        discovery: 'The cottage is clean but bare. A typewriter sits on a table by the window, surrounded by stacks of manuscript. Laura\'s work — other people\'s words, transcribed for pennies. On the mantelpiece, a single photograph in a cheap frame: Laura and a man you recognise as Stapleton, standing together on the moor. He has his arm around her. She is smiling. The photograph is dated eighteen months ago. Stapleton is not smiling — he is looking past the camera, past Laura, at something in the distance. His expression is not that of a man in love. It is that of a man with a plan.'
      }
    ],
    exitAction: 'leave_laura',
    exitLabel: 'Leave Laura Lyons and go back to the moor',
    hardExitNarration: 'Laura shows you to the door. Her face is grey, her eyes hollow. "What will happen to me?" she asks. You tell her the truth will protect her. She nods, but she does not look convinced. As you walk back through Grimpen, the evening mist is rising from the Mire, and somewhere in the gathering dark, a dog is barking — deep, resonant, hungry.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: ['laura_lyons'],
      established: ['Laura Lyons wrote to Sir Charles on the night he died', 'Stapleton used Laura to lure Sir Charles to the gate', 'Stapleton promised Laura marriage but never intended it', 'Laura was not at the meeting — she stayed home', 'Stapleton told Laura to keep silent about the letter']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'baskerville hall interior', 'mire deep']
    }
  },
  scene_14: {
    sceneId: 'scene_14',
    sceneName: 'The Picture',
    description: `You return to Baskerville Hall in the late afternoon, Holmes still in his disguise, slipping in through the garden door while Barrymore is occupied in the kitchen. The Hall is quiet — Sir Henry is in the library, reading — and Holmes moves through the entrance hall with the silent efficiency of a cat, his eyes scanning the portraits on the walls.

"Here," he says suddenly. He stops before a portrait you have passed a dozen times without truly seeing it. The painting is old — late eighteenth century — and depicts a man in the dress of the period: powdered wig, velvet coat, lace at the throat. The nameplate reads: "Rodger Baskerville, 1752-1801. Younger son of Sir William Baskerville."

Holmes stares at the portrait for a long time. Then he turns to you, and his eyes are blazing. "Look at the face, Watson. The long nose. The thin mouth. The dark, deep-set eyes. Now think of Stapleton."

You look. The resemblance is not subtle. It is exact. The same bone structure, the same sharp intelligence in the eyes, the same thin-lipped smile that is not quite a smile. Stapleton could be this man's son.

"My God," you whisper.

"Precisely," says Holmes. "Stapleton is a Baskerville. He is Rodger Baskerville's descendant — a younger son's line, disinherited, forgotten, but carrying the same blood. He has been murdering his way through the main line to claim the estate. Sir Charles was first. Sir Henry is next."

He turns from the portrait, and his voice is cold as the moor in winter. "We have him, Watson. Now we must spring the trap."`,
    content: [
      {
        id: 'study_portrait',
        label: 'Study the portrait of Rodger Baskerville closely',
        keywords: ['portrait', 'rodger', 'baskerville', 'study', 'examine', 'painting', 'face', 'resemblance'],
        discovery: 'You stand before the portrait and study it with fresh eyes. Rodger Baskerville was a handsome man — the same dark, aristocratic features that run through the family, but with a sharper edge, a more predatory intelligence. The painter has captured something unsettling in his expression: a patience that borders on cruelty. Beneath the portrait, a small brass plate reads: "Rodger Baskerville. Departed for the Americas, 1795. Presumed died abroad." The Americas. Or perhaps not. Perhaps he simply changed his name and stayed in England, and his descendants — his son — grew up in the shadows, watching the Baskerville fortune pass them by.'
      },
      {
        id: 'ask_holmes_plan',
        label: 'Ask Holmes what the plan is now',
        keywords: ['plan', 'ask', 'holmes', 'trap', 'next', 'strategy', 'what', 'do'],
        discovery: 'Holmes paces the hall, his disguise forgotten, his mind working at full speed. "We need to force Stapleton\'s hand. He has been patient — methodical — picking off the Baskervilles one by one. But if we make Sir Henry vulnerable, visible, alone on the moor at night, Stapleton will not be able to resist. He will send the hound. And we will be waiting." He stops pacing and looks at you. "It is dangerous, Watson. For Sir Henry, for you, for me. But we have no choice. We cannot prove a case based on a portrait and a confession from Laura Lyons. We need to catch him in the act. We need the hound."'
      },
      {
        id: 'examine_family_tree',
        label: 'Look for other Baskerville family records in the Hall',
        keywords: ['family', 'tree', 'records', 'search', 'library', 'baskerville', 'history', 'genealogy'],
        discovery: 'You search the library and find a leather-bound family Bible with a genealogy recorded in fading ink. The main line is clear: from Hugo through to Sir Charles and now Sir Henry. But there are branches — younger sons, lines that died out or moved away. One entry catches your eye: "Rodger Baskerville, second son. Married Maria Concannon, 1790. Issue: one son, name unknown. Departed England, 1795." A son. Name unknown. A son who could have returned, who could have had children, who could have raised a boy on stories of the fortune that should have been his. A boy named Jack.'
      },
      {
        id: 'tell_sir_henry',
        label: 'Go to Sir Henry and explain what you have discovered',
        keywords: ['sir henry', 'tell', 'explain', 'discover', 'warn', 'library', 'speak'],
        discovery: 'You find Sir Henry in the library, poring over estate documents. He looks up as you enter, and you see the toll the past days have taken — the dark circles under his eyes, the tension in his jaw. You explain what you have found: Stapleton\'s true identity, the portrait, the connection to Rodger Baskerville. Sir Henry listens in silence. When you finish, he is quiet for a long time. Then he says, "So the curse is not a ghost. It is a man. A man who wants what is mine." His hands are steady. His voice is steady. "What do we do?" He is braver than you expected. Braver, perhaps, than is wise.'
      }
    ],
    exitAction: 'plan_trap',
    exitLabel: 'Join Holmes in planning the trap',
    hardExitNarration: 'Holmes gathers you and Sir Henry in the study. He closes the curtains, locks the door, and spreads a map of the moor on the desk. "Now," he says, his finger tracing a path from Merripit House to Baskerville Hall, across the open moor. "Here is what we are going to do." The trap is set.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: ['holmes', 'sir_henry'],
      established: ['Stapleton is a Baskerville heir — descended from Rodger Baskerville', 'Stapleton is murdering the main line to claim the estate', 'the portrait proves the family connection', 'Holmes plans to set a trap using Sir Henry as bait']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'mire deep']
    }
  }
};
