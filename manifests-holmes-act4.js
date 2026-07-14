module.exports = {
  scene_15: {
    sceneId: 'scene_15',
    sceneName: 'The Trap is Set',
    description: `The study at Baskerville Hall is locked, the curtains drawn, the fire built high against the October chill. Holmes stands over the desk, his disguise discarded, his sharp features lit by the lamplight as he traces a route across the map of the moor. Sir Henry sits in the armchair, his face pale but set. Watson stands by the window, checking his revolver for the third time.

"Here is the situation," Holmes says, his voice low and precise. "Stapleton has been patient. He eliminated Sir Charles through cunning and terror. He will try to do the same with Sir Henry — but he needs the hound, and he needs darkness, and he needs his victim alone." He taps the map. "Merripit House, here. The Grimpen Mire, here. Baskerville Hall, here. Between Merripit and the Hall lies a mile of open moor — no cover, no shelter, no escape. That is where he will strike."

He turns to Sir Henry. "Tomorrow evening, you will dine with Stapleton at Merripit House. You will leave at a set time — eleven o'clock — and walk home across the moor. Alone. Unarmed." Sir Henry's jaw tightens, but he does not speak. "Watson and I, and our colleague Inspector Lestrade from Scotland Yard — who arrives by the morning train — will be positioned along the path. When the hound appears, we will be ready."

The room is silent except for the crackle of the fire. Outside, the wind moans across the moor, and somewhere in the darkness, far away and faint, something howls.`,
    content: [
      {
        id: 'examine_map',
        label: 'Study the map of the moor and the planned ambush positions',
        keywords: ['map', 'study', 'examine', 'moor', 'ambush', 'position', 'plan', 'route'],
        discovery: 'Holmes has marked the map with meticulous care. Three positions are circled in red ink: one behind a granite outcrop fifty yards from the path, one in a shallow depression in the heather, and one behind a ruined wall near the Hall grounds. "Watson, you will take the outcrop. Lestrade, the depression. I will be closest to the path, behind the wall." He draws a line from Merripit House to the Hall. "Stapleton will release the hound somewhere along this line. The creature will follow Sir Henry\'s scent. When it passes our positions, we close in." He looks up. "The hound must not reach Sir Henry. That is absolute."'
      },
      {
        id: 'discuss_weapons',
        label: 'Ask Holmes what weapons they should bring',
        keywords: ['weapon', 'weapons', 'gun', 'revolver', 'rifle', 'bring', 'ask', 'holmes'],
        discovery: 'Holmes opens a leather case he has brought from London. Inside, nestled in oilcloth, are two revolvers and a hunting rifle. "The revolvers are for you and Lestrade. The rifle is mine — I am a fair shot, as you know, and at fifty yards I will not miss." He pauses. "But bullets alone may not stop this creature. It is large, it is desperate, and it has been bred for savagery. We must also be prepared for the possibility that it is coated in phosphorus — in which case, a single well-placed shot should ignite the substance and cause the animal considerable distress." He checks the rifle\'s action with practised hands. "Aim for the head, Watson. Always the head."'
      },
      {
        id: 'talk_to_sir_henry',
        label: 'Speak privately with Sir Henry about the danger',
        keywords: ['sir henry', 'speak', 'private', 'danger', 'talk', 'brave', 'concern'],
        discovery: 'You find Sir Henry standing at the window, looking out at the moor. His reflection in the glass is ghostly, transparent. "I know what you\'re going to say, Doctor," he says without turning. "That this is dangerous. That I might die." You confirm both. He nods. "My great-uncle died on this moor. Alone. Afraid. If I run now, I will spend the rest of my life looking over my shoulder." He turns to face you. His eyes are steady. "I am a Baskerville. This is my land. I will not surrender it to a coward with a painted dog." He extends his hand. You shake it. His grip is firm.'
      },
      {
        id: 'review_plan',
        label: 'Go over the plan one more time with Holmes',
        keywords: ['review', 'plan', 'again', 'holmes', 'details', 'timing', 'confirm'],
        discovery: 'Holmes reviews the plan with the precision of a military commander. "Sir Henry dines at Merripit at eight. He leaves at eleven. The walk takes approximately thirty minutes at a normal pace. We take our positions at ten-thirty. No lanterns. No cigarettes. No sound. The moor must be silent — any noise will warn Stapleton." He fixes you with a hard stare. "Watson, I must impress upon you: when the hound appears, do not fire until I do. If we scatter our shots, the creature may reach Sir Henry before we can stop it. Wait for my signal. Then fire for the head." He pauses. "And Watson — if something goes wrong, if the plan fails — get Sir Henry to the Hall and bar the doors. Do not come back for me."'
      }
    ],
    exitAction: 'prepare_for_ambush',
    exitLabel: 'Go to bed early to get ready for tomorrow night',
    hardExitNarration: 'Holmes extinguishes the lamp and opens the curtains. The moor is a vast darkness beyond the glass, featureless and silent. "Sleep well, Watson," he says. "Tomorrow, we end this." You go to your room, but sleep does not come easily. Through the window, the moor waits — patient, ancient, hungry.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: ['holmes', 'sir_henry'],
      established: ['Holmes has devised an ambush plan', 'Sir Henry will walk the moor alone as bait', 'Lestrade from Scotland Yard is arriving', 'positions marked on the map', 'weapons prepared']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'mire deep']
    }
  },
  scene_16: {
    sceneId: 'scene_16',
    sceneName: 'The Hound Appears',
    description: `The moor at midnight is a place of absolute darkness. The moon has not yet risen. The stars are hidden behind a low ceiling of cloud. You lie flat behind the granite outcrop, your revolver in your hand, your heart hammering against the cold stone. The heather presses against your face, damp and fragrant. The silence is total — no wind, no birds, no insects. Just the sound of your own breathing, which you try to still.

From somewhere ahead, the crunch of boots on gravel. Sir Henry, walking the path from Merripit House to Baskerville Hall. Alone. Unarmed. Bait. The footsteps are steady — the man has courage, you will grant him that — but they are too fast. He is afraid. He is trying not to run.

Then you hear it.

Not a howl. Not a growl. A sound that is between a bark and a roar — deep, resonant, vibrating in your chest like the lowest note of a cathedral organ. It comes from the direction of the Mire, from the darkness to the west, and it is moving. Coming closer.

Sir Henry's footsteps stop. Then start again — faster now, almost running.

And then you see it. A shape emerges from the mist — enormous, black, low to the ground. It is the size of a small bear, with a massive head and jaws that could crush bone. Its eyes burn with a pale, phosphorescent light. Its entire body seems to glow — a spectral, greenish-white luminescence that makes it look like something from a nightmare. A hellhound. The hound of the Baskervilles. And it is running — fast, terribly fast — toward Sir Henry.`,
    content: [
      {
        id: 'watch_hound',
        label: 'Watch the hound as it emerges from the mist',
        keywords: ['watch', 'hound', 'emerge', 'mist', 'glow', 'spectral', 'enormous', 'see'],
        discovery: 'You press your eye to the gap between the rocks and watch. The hound is larger than any dog you have ever seen — a massive, barrel-chested mastiff, its coat slick and shining with phosphorescent paint. In the darkness, it is a thing of pure terror: a burning, glowing spectre that seems to have stepped out of the legend itself. Its eyes are two points of pale fire. Its jaws are open, and a low, continuous growl vibrates through the ground. It does not bark. It does not howl. It simply runs — silent, purposeful, deadly — following the scent of Sir Henry Baskerville across the dark moor.'
      },
      {
        id: 'hold_fire',
        label: 'Wait for Holmes\'s signal before firing',
        keywords: ['wait', 'signal', 'holmes', 'fire', 'hold', 'patience', 'ready'],
        discovery: 'You cock the revolver and press your cheek against the cold stone. The hound is fifty yards from Sir Henry now, closing fast. Your finger tightens on the trigger. Every instinct screams at you to fire. But Holmes said wait. Holmes said the signal. You force yourself to breathe. To count. To wait. The hound passes your position — so close you can smell it, a reek of wet fur and phosphorus and something chemical and wrong. Its flank brushes the heather ten yards from where you lie. You could reach out and touch it. You do not move.'
      },
      {
        id: 'see_sir_henry_terror',
        label: 'Look toward Sir Henry and see his reaction',
        keywords: ['sir henry', 'look', 'terror', 'reaction', 'running', 'afraid', 'see'],
        discovery: 'You turn your head and see Sir Henry. He has stopped running. He is standing in the middle of the path, frozen, staring at the glowing shape that bears down on him. His face is white in the phosphorescent light. His mouth is open. He is not screaming — the terror has gone beyond screaming. He is simply standing there, watching death come for him on four legs, and you understand now how Sir Charles died. Not from a wound. Not from a fall. From the sheer, paralysing horror of seeing the impossible — a legend made flesh, a curse made real — running toward him out of the dark.'
      },
      {
        id: 'ready_revolver',
        label: 'Raise your revolver and take aim at the hound',
        keywords: ['revolver', 'aim', 'raise', 'ready', 'point', 'weapon', 'gun', 'target'],
        discovery: 'You raise the revolver and sight along the barrel. The hound is a moving target in near-total darkness, lit only by its own ghastly glow. At this distance — thirty yards, closing — you can see the muscles rippling beneath its phosphorescent coat, the massive jaws, the burning eyes. It is real. It is flesh and blood. But in the darkness, coated in that spectral light, it is also the most terrifying thing you have ever seen. Your hands are steady. Your breathing is steady. You wait for Holmes.'
      }
    ],
    exitAction: 'holmes_signals',
    exitLabel: 'Wait for Holmes to fire first',
    hardExitNarration: 'A shot cracks through the darkness — Holmes\'s rifle, from behind the ruined wall. The signal. You rise from cover and fire.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: ['holmes', 'sir_henry'],
      established: ['the hound has appeared on the moor', 'it is enormous and coated in phosphorus', 'it is pursuing Sir Henry', 'the hound looks supernatural but is a real animal', 'Holmes, Watson, and Lestrade are in ambush positions']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'baskerville hall interior', 'mire deep']
    }
  },
  scene_17: {
    sceneId: 'scene_17',
    sceneName: 'The Chase',
    description: `Holmes fires. The shot echoes across the moor like a thunderclap. The hound yelps — a sound that is almost human — and stumbles, but does not fall. It recovers instantly, turning its burning head toward the source of the shot, then back toward Sir Henry. It chooses the prey. It runs.

You are on your feet now, running across the heather, the revolver bucking in your hand as you fire. The first shot goes wide. The second catches the hound in the flank — you see the impact, see the creature stagger — but it keeps running. Lestrade is up too, crashing through the gorse, firing wildly. The moor is alive with the crack of gunfire and the ghostly glow of the phosphorescent beast.

Sir Henry has found his legs. He is running — not toward the Hall, but along the path, his boots pounding the gravel. The hound is behind him, twenty yards, fifteen, ten. Its jaws are open. Its breath steams in the cold air. It is gaining.

"THE HEAD!" Holmes's voice cuts through the chaos. "AIM FOR THE HEAD!"

You stop. Plant your feet. Raise the revolver with both hands. The hound is a glowing blur in your sights — left, right, left, bobbing as it runs. Sir Henry is just ahead of it. You cannot miss him. You cannot miss the hound. You breathe out slowly and squeeze the trigger.`,
    content: [
      {
        id: 'fire_at_hound',
        label: 'Fire your revolver at the hound',
        keywords: ['fire', 'shoot', 'revolver', 'hound', 'aim', 'trigger', 'fire'],
        discovery: 'The revolver kicks in your hand. The shot takes the hound high in the shoulder and it screams — a terrible, ululating sound that echoes off the tors. It stumbles, rolls, comes up snapping at its own wound. The phosphorus on its coat has smeared where the bullet struck, and the raw flesh beneath is visible — pink, bloody, utterly real. This is not a ghost. Not a demon. Not a legend. It is a dog. A very large, very dangerous dog. And it is wounded. But it is not dead. It turns its burning eyes on you, and for a moment you see something in them that is not animal rage but something worse: purpose. It turns back toward Sir Henry and runs.'
      },
      {
        id: 'chase_on_foot',
        label: 'Sprint after the hound across the moor',
        keywords: ['chase', 'sprint', 'run', 'pursue', 'hound', 'moor', 'after', 'follow'],
        discovery: 'You run. The moor is treacherous in the dark — hidden rocks, sudden dips, patches of bog that suck at your boots. You stumble, recover, run on. Ahead, the hound\'s phosphorescent glow bobs and weaves as it closes on Sir Henry. Holmes is running too, his long legs covering the ground with frightening speed, the rifle in one hand. Lestrade is behind, breathing hard, his revolver empty. The chase is across open ground now — no cover, no concealment, just the vast dark moor and the glowing shape of the hound and the desperate figure of Sir Henry running for his life.'
      },
      {
        id: 'call_to_sir_henry',
        label: 'Shout to Sir Henry to keep running',
        keywords: ['shout', 'call', 'sir henry', 'run', 'keep', 'yell', 'scream'],
        discovery: 'You shout Sir Henry\'s name across the dark moor. "KEEP RUNNING! WE\'RE BEHIND YOU!" Your voice carries in the stillness, and Sir Henry responds — he puts on a burst of speed that pulls him ahead of the hound by a few precious yards. But the hound is relentless. It does not tire. It does not slow. It runs with the mechanical persistence of a machine, its glowing eyes fixed on Sir Henry\'s back, its jaws dripping foam. You fire again. The shot goes wide in the darkness. You are running too fast to aim properly.'
      },
      {
        id: 'reload_revolver',
        label: 'Stop and reload your revolver',
        keywords: ['reload', 'revolver', 'stop', 'bullets', 'ammunition', 'load'],
        discovery: 'You stop running and fumble with the revolver. Your hands are shaking — not from fear, but from the cold and the exertion. The cartridges slide into the cylinder with a satisfying click. Six rounds. You snap the cylinder shut and raise the weapon. The hound is thirty yards ahead, closing on Sir Henry. You have one chance. You sight along the barrel, leading the target, accounting for the bobbing stride of the running beast. You fire. The shot takes the hound in the hindquarters. It yelps, stumbles, but keeps coming. Five rounds left.'
      }
    ],
    exitAction: 'holmes_closes_in',
    exitLabel: 'Watch Holmes close in on the hound',
    hardExitNarration: 'Holmes has outpaced you all. He is running straight at the hound, the rifle at his shoulder, his face a mask of cold concentration. The hound is five yards from Sir Henry. Holmes is ten yards from the hound. Time slows.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: ['holmes', 'sir_henry'],
      established: ['the hound has been hit but keeps coming', 'Watson has fired and wounded it', 'the chase is across open moor', 'the hound is gaining on Sir Henry', 'Holmes is closing in']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'baskerville hall interior', 'mire deep']
    }
  },
  scene_18: {
    sceneId: 'scene_18',
    sceneName: 'The Kill',
    description: `Holmes fires.

The shot is deafening — a flat, authoritative crack that silences the moor. The bullet takes the hound squarely in the skull. The creature's head snaps back. Its legs buckle. It slides across the heather in a smear of phosphorescent light, leaving a glowing trail on the wet grass, and comes to rest five yards from Sir Henry's heels.

For a moment, nothing moves. Sir Henry stands with his back to the fallen beast, his chest heaving, his hands clenched at his sides. Holmes stands with the rifle still raised, a thin curl of smoke rising from the barrel. You stand with your revolver empty, your heart hammering so hard you can hear it in your ears. Lestrade arrives, gasping, his face the colour of old paper.

Then Holmes walks forward and kneels beside the fallen creature. He strikes a match. In the flare of light, the truth is revealed.

It is a dog. A mastiff — the largest you have ever seen, easily the size of a small pony, with a barrel chest and jaws that could take a man's arm off at the shoulder. Its coat is smeared with a thick, greasy paste that glows with a pale, greenish-white light. Phosphorus. Holmes touches it with a gloved finger and holds it up. "Not supernatural," he says quietly. "Not a ghost. Not a demon. Just a dog. A very large, very savage, very carefully prepared dog."

He looks down at the dead hound, and his expression is not triumphant. It is sad. "Stapleton bred it," he says. "Fed it, trained it, painted it with phosphorus, and set it loose on the moor to kill. The legend was his weapon. Fear was his weapon. And it nearly worked."`,
    content: [
      {
        id: 'examine_hound',
        label: 'Examine the dead hound closely',
        keywords: ['examine', 'hound', 'dead', 'dog', 'mastiff', 'close', 'inspect', 'body'],
        discovery: 'You kneel beside the fallen hound. It is enormous — even dead, its body radiates a terrible vitality. The phosphorus paste is thick and greasy, coating every inch of the animal\'s coat. Beneath the paste, the fur is short and brindled — a mastiff, purebred, bred for size and aggression. Its collar is leather, studded with brass, and stamped with a name: "Grim." There are scars on its muzzle and forelegs — old wounds, healed over. This animal has been in fights before. It was not merely a pet. It was a weapon, honed and maintained for a single purpose: to terrify and to kill.'
      },
      {
        id: 'check_sir_henry',
        label: 'Go to Sir Henry and check that he is unharmed',
        keywords: ['sir henry', 'check', 'unharmed', 'safe', 'alive', 'go to', 'examine'],
        discovery: 'You reach Sir Henry and put a hand on his shoulder. He is trembling — not with cold, but with the aftershock of terror. His face is grey, his eyes wide, but he is alive. Unhurt. He looks at you and tries to speak. No words come. He swallows, tries again. "Is it dead?" he whispers. You tell him it is. He nods slowly. Then, very quietly, he says: "My God. I saw it coming and I could not move. I understood then — I understood how my great-uncle felt. The terror. The paralysis." He looks at the fallen hound. "It was just a dog. Just a dog." He says it as if trying to convince himself.'
      },
      {
        id: 'talk_to_holmes',
        label: 'Speak with Holmes about what they have proven',
        keywords: ['holmes', 'speak', 'talk', 'proven', 'evidence', 'case', 'stapleton'],
        discovery: 'Holmes wipes the phosphorus from his glove with a handkerchief. "We have proven that the hound is real — and that it is mortal," he says. "But we have not yet proven that Stapleton set it loose. For that, we need his lair. We need the chains, the kennel, the breeding records. We need evidence that will stand before a judge." He looks toward the Grimpen Mire, a dark mass on the western horizon. "Stapleton will have fled by now. He will have heard the shots. He will know the hound is dead." His eyes narrow. "But he cannot have gone far. Not in the dark. Not on this moor. And I know where he is going."'
      },
      {
        id: 'collect_evidence',
        label: 'Collect samples of the phosphorus from the hound',
        keywords: ['collect', 'sample', 'phosphorus', 'evidence', 'paste', 'coat', 'take'],
        discovery: 'You scrape a sample of the phosphorus paste into a handkerchief and wrap it carefully. Holmes nods approvingly. "Good, Watson. That is evidence. A chemist will confirm it is phosphorus mixed with some kind of greasy base — lard, perhaps, or fish oil — to make it adhere to the animal\'s coat." He takes a second sample himself. "We will also want the collar, the chain marks on its legs — see here, where a heavy chain has worn the fur away — and any other evidence we can find at the kennel. Stapleton was thorough, but he was not thorough enough. He left a trail, and we will follow it."'
      }
    ],
    exitAction: 'pursue_stapleton',
    exitLabel: 'Follow Holmes toward the Grimpen Mire',
    hardExitNarration: 'Holmes straightens and looks west, toward the Mire. "Stapleton is running," he says. "He will try to reach his lair — to destroy the evidence, to cover his tracks. We must move quickly." He sets off across the moor at a pace that forces you and Lestrade to half-run to keep up. Behind you, the hound lies still, its phosphorescent glow fading as the paste dries in the cold air.',
    initialFacts: {
      items: ['webley revolver', 'phosphorus sample'],
      metNPCs: ['holmes', 'sir_henry'],
      established: ['the hound is dead — a real mastiff coated in phosphorus', 'Holmes killed it with a single shot', 'Sir Henry is alive and unharmed', 'Stapleton bred and prepared the hound', 'Stapleton has likely fled toward the Mire']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'baskerville hall interior']
    }
  },
  scene_19: {
    sceneId: 'scene_19',
    sceneName: 'The Revelation',
    description: `The lair is hidden in the deepest part of the Grimpen Mire — a patch of slightly higher ground, accessible only by the path Holmes has been marking for days. It takes twenty minutes of careful stepping from tussock to tussock, the darkness pressing in on all sides, before Holmes raises a hand and stops.

"There," he whispers.

A low structure of stone and turf, half-buried in the vegetation. A kennel — but not an ordinary kennel. The entrance is barred with iron, and heavy chains are bolted to the stone walls inside. The floor is bare earth, trampled and scarred by enormous claws. The smell is indescribable — wet dog, phosphorus, blood, and something older, something that speaks of captivity and rage.

Inside the kennel, you find everything. A heavy chain, still attached to the wall bolt, its links worn smooth by years of use. A metal bowl, crusted with dried food. And in the corner, wrapped in sacking, the skeletal remains of another dog — smaller, older, long dead. The original hound, perhaps. The one Stapleton started with before he bred something larger.

Holmes finds a leather notebook beneath the sacking. He opens it and reads by the light of his lantern. "Breeding records," he says. "Dates, weights, feeding schedules. Stapleton has been at this for three years. He purchased the mastiff from a dealer in London. He has been training it to follow a specific scent — Sir Henry's scent." He closes the notebook. "This is enough. More than enough."

Then, from somewhere deeper in the Mire, a sound. Not the hound. A human voice. Weak, desperate, barely audible. "Help me. Please. Help me."`,
    content: [
      {
        id: 'find_beryl',
        label: 'Follow the voice deeper into the Mire',
        keywords: ['voice', 'follow', 'deeper', 'mire', 'help', 'beryl', 'woman', 'find'],
        discovery: 'You follow the voice through the darkness, stepping carefully from tussock to tussock. Fifty yards from the kennel, in a hollow screened by gorse, you find her. Beryl Stapleton is tied to a stake driven into the earth. Her wrists are raw from the ropes. Her face is gaunt, her lips cracked, her eyes hollow with exhaustion and dehydration. She has been here for days. When she sees you, she begins to cry — not with relief, but with the broken, helpless weeping of someone who has been waiting to die. "He tied me here," she whispers. "He said I betrayed him. He said I would stay here until he was finished." You cut the ropes with your penknife. She collapses against you, light as a bird, and you carry her out of the Mire.'
      },
      {
        id: 'examine_kennel',
        label: 'Search the kennel thoroughly for evidence',
        keywords: ['kennel', 'search', 'evidence', 'examine', 'chain', 'bowl', 'notebook', 'thorough'],
        discovery: 'You search the kennel with the methodical care Holmes has taught you. The chain is heavy — designed to restrain an animal of enormous strength. Claw marks score every surface. The metal bowl is engraved with the name "Grim." Behind a loose stone in the wall, you find a glass jar containing more phosphorus paste, and a brush for applying it. In a second jar, a collection of teeth — human teeth — that make your blood run cold until Holmes identifies them as belonging to the original, smaller hound. "Stapleton kept trophies," he says grimly. "The man is not merely a murderer. He is a sadist."'
      },
      {
        id: 'read_notebook',
        label: 'Read Stapleton\'s breeding notebook',
        keywords: ['notebook', 'read', 'breeding', 'records', 'stapleton', 'journal', 'notes'],
        discovery: 'The notebook is meticulous. Stapleton recorded everything: the mastiff\'s weight, diet, training regimen, and — most chillingly — the dates on which he exposed the animal to Sir Henry\'s scent. A glove, stolen from the Hall. A boot, borrowed and returned. The scent of Sir Henry\'s tobacco. Page after page of careful, methodical preparation for murder. The final entry is dated yesterday: "Tomorrow night. The path from Merripit. The scent is strong. The beast is ready. By morning, the Baskerville line ends." Holmes reads it over your shoulder. "Three years," he says. "Three years of patient, methodical preparation. The man is a monster — but he is a disciplined monster."'
      },
      {
        id: 'examine_original_hound',
        label: 'Look at the remains of the original hound',
        keywords: ['original', 'hound', 'remains', 'skeleton', 'bones', 'examine', 'first', 'dog'],
        discovery: 'The remains are wrapped in sacking — a dog\'s skeleton, smaller than the mastiff, with a heavy skull and powerful jaws. A cross-bred animal, perhaps a bloodhound-mastiff mix. Holmes examines it briefly. "This was his first attempt," he says. "The prototype. He bred it, trained it, and when it was no longer useful — when he had produced something larger, something more terrifying — he killed it and kept the bones. As a reminder. As a trophy." He rewraps the remains carefully. "This will be entered as evidence. Every piece of it."'
      }
    ],
    exitAction: 'carry_beryl_to_safety',
    exitLabel: 'Carry Beryl Stapleton out of the Mire',
    hardExitNarration: 'You carry Beryl out of the Grimpen Mire, Holmes leading the way with his lantern, Lestrade bringing up the rear with the evidence. The Mire is silent now — no howling, no glowing eyes, no spectre from the legend. Just a bog, dark and wet and indifferent. Behind you, the kennel sits empty. The hound is dead. The trap is sprung. But Stapleton is still out there, somewhere in the darkness.',
    initialFacts: {
      items: ['webley revolver', 'phosphorus sample'],
      metNPCs: ['holmes'],
      established: ['found Stapleton\'s lair in the Mire', 'breeding records prove the hound was trained to kill', 'Beryl Stapleton was tied up and starved', 'the original hound\'s remains were found', 'Stapleton has been planning for three years']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'baskerville hall interior']
    }
  }
};
