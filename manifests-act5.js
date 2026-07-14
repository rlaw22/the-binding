module.exports = {
  scene_20: {
    sceneId: "scene_20",
    sceneName: "The Chase Begins",
    description: `Dawn breaks over the London docks in bands of copper and grey. The Thames is a sheet of hammered pewter, still as death, and the masts of a hundred ships stand like a winter forest against the brightening sky. Gulls wheel and cry overhead. The air tastes of salt, coal smoke, and something else — something from the Transylvanian earth that clings to Mina Harker like a perfume she cannot wash away.

Mina stands at the edge of the wharf, her face pale in the early light, her eyes distant and unfocused. She has been like this since the night Van Helsing used the sacred wafer to mark her forehead — the mark burned and scarred, and through it, she can feel the Count. He is moving. He is afraid. And he is running home.

'There,' she says, lifting one trembling hand to point east, toward the mouth of the Thames and the grey sea beyond. 'He is on the water. A ship called the Czarina Catherine, bound for Varna. He travels in a box of earth — his coffin — in the hold.' Her voice breaks. 'I can feel his hunger. He is feeding on the crew.'

Van Helsing stands beside you, his coat flapping in the river wind, a leather satchel over his shoulder containing crucifixes, garlic bulbs, and the last of the Vatican holy water. Jonathan Harker paces the wharf, his jaw set, his hand resting on the wooden stake tucked inside his coat. Dr. Seward checks his medical bag — silver lancets, bandages, a flask of brandy. Lord Godalming has arranged a train to catch a steamer from the Continent. The plan is simple and desperate: race Dracula to his homeland and destroy him before he reaches the sanctuary of Castle Dracula.

A dockworker approaches — a thick man with a tarred cap and suspicious eyes. 'You the ones who need passage to Varna? There's a fast steamer, the Orion, leaving on the tide. Captain's a hard man but he owes me a favor.' He scratches his jaw. 'You'll need gold. And nerve. The Black Sea crossing won't be kind.'`,
    content: [
      {
        id: "consult_mina",
        label: "Ask Mina what she senses from Dracula",
        keywords: ["mina", "sense", "feel", "dracula", "blood", "bond", "ask"],
        discovery: `Mina closes her eyes and sways. 'He is... angry. Terrified. He knows we are coming. The box — his coffin — is surrounded by earth from home. He has not left it since he boarded. But the crew...' Her eyes snap open, wet with tears. 'The crew is dying. One by one. He feeds and throws them overboard. The captain does not know what is happening. In four days, five at most, the ship will reach Varna. If we leave now, we can beat him there — or intercept him at the port.' She grips your arm. 'He is weakening me. Every time he feeds, I feel it too. We must hurry.'`
      },
      {
        id: "talk_strategy",
        label: "Gather the group and discuss the pursuit plan",
        keywords: ["plan", "strategy", "discuss", "group", "gather", "talk", "approach"],
        discovery: `You draw the group into a huddle beneath a warehouse overhang. Van Helsing unfolds a map of the Continent. 'We take the train to Paris, then the Orient Express to Varna. We arrive before the ship — barely. At the port, we wait for the Czarina Catherine and find the box.' Jonathan's jaw tightens. 'I know the castle. I know the passes. If he makes it back to Transylvania, we follow him there.' Van Helsing nods. 'If he reaches the castle, he regains his power. Every mile closer to his native soil makes him stronger. We must end this in Varna — or on the road.' Seward checks his bag. 'I have enough supplies for a siege. And Godalming has money.' Lord Godalming produces a leather pouch heavy with coin. 'Whatever it takes.'`
      },
      {
        id: "examine_ship",
        label: "Inspect the steamer Orion at the dock",
        keywords: ["ship", "steamer", "orion", "inspect", "examine", "boat", "vessel"],
        discovery: `The Orion is a lean, black-hulled steamer built for speed, not comfort. Her smokestacks are clean, her rigging tight. The captain — a weathered man named Donelson — meets you at the gangplank. 'Varna in four days if the weather holds. Fifty pounds for the lot of you, payable in advance. No questions asked, no questions answered.' He looks at your group — your grim faces, your leather bags, your haunted eyes. 'I've carried worse cargo,' he mutters. Below decks, the cabins are cramped but clean. The hold is deep enough to conceal equipment. And the bow faces east — toward the rising sun, and toward Transylvania.`
      },
      {
        id: "prepare_supplies",
        label: "Buy or gather final supplies for the journey",
        keywords: ["supplies", "buy", "gather", "prepare", "garlic", "stakes", "provisions"],
        discovery: `You split up along the docks. Jonathan finds a ship's carpenter who sells him a bundle of oak dowels — thick, straight, and hard as iron. Van Helsing returns from a nearby church with a jar of consecrated communion wafers and a second flask of holy water, blessed by a priest who crossed himself when he saw the Professor's face. Seward buys medical supplies — morphine, bandages, a surgeon's saw. And you find a chandler's shop that sells garlic by the pound. You fill a sack. The shopkeeper gives you an odd look. 'Planning a feast?' 'Something like that,' you reply.`
      }
    ],
    exitAction: "board_orion",
    exitLabel: "Board the Orion and sail for Varna",
    hardExitNarration: `The Orion's horn sounds across the Thames. You stand at the rail as London falls away behind you — the grey towers, the smoking chimneys, the bridges dissolving into mist. Mina grips your hand, her skin cold, her eyes fixed east. Van Helsing stands at the bow, Bible in hand, muttering prayers in Latin. The open water stretches ahead, grey and endless, and somewhere on it — in a box of Transylvanian earth — the Count is waiting.`,
    initialFacts: {
      items: ["crucifix", "jonathan journal", "holy water", "wooden cross"],
      metNPCs: ["innkeeper", "dracula", "van_helsing", "seward", "renfield", "mina"],
      established: [
        "Dracula fleeing England by ship",
        "blood bond lets Mina sense Dracula",
        "racing to Varna to intercept him",
        "Mina weakening as Dracula feeds",
        "group pursuing with full knowledge"
      ]
    },
    locationKeywords: {
      banned: ["bistritz", "coach ride", "castle dracula", "transylvania", "carfax abbey", "the inn"]
    }
  },
  scene_21: {
    sceneId: "scene_21",
    sceneName: "The Carpathian Mountains",
    description: `The mountains rise before you like the broken teeth of some buried giant. Snow clings to the peaks in grey tongues, and the passes between them are choked with ice and dead timber. The wind comes from the north — a blade that cuts through coats, through skin, through bone. You have been walking since dawn and the castle is still a shadow on the horizon, half-hidden by cloud.

Mina walks in silence, her steps growing slower with each mile. The scar on her forehead — the mark of the wafer — pulses faintly in the cold air, a bruise that will not heal. She has not eaten in two days. Her lips are blue. Her eyes are glassy. But she presses forward, one foot in front of the other, guided by the blood bond that connects her to the Count like a thread of ice through her heart.

Van Helsing walks at the rear, his crucifix held before him, his lips moving in constant prayer. Jonathan Harker leads, his journal open in one frozen hand, navigating by the landmarks he recorded three years ago on his first journey to this cursed land. Seward and Godalming carry the heavy bags — the stakes, the garlic, the holy water, the tools of an execution disguised as a pilgrimage.

Then the singing starts.

It comes from the rocks above — a high, ululating cry in a language you do not recognize. Torches flare on the ridge line. Dark shapes move between the trees. The Szgany — Dracula's gypsy servants — pour down the mountainside like water, curved blades flashing, eyes wild with devotion. They have been sent to guard the approach. To slow you. To kill you if they can.`,
    content: [
      {
        id: "defend_mina",
        label: "Shield Mina and draw your weapon",
        keywords: ["mina", "shield", "protect", "weapon", "defend", "draw", "guard"],
        discovery: `You pull Mina behind you and draw the oak stake from your belt. The first Szgany reaches you — a wiry man with a scarred face and a curved knife. He swings wide. You catch his wrist and heave him into the rock face. A second comes from the left. Van Helsing steps forward, crucifix blazing, and the gypsy recoils with a shriek, crossing himself and stumbling backward into his comrades. The crucifix burns the faithful and the damned alike when Van Helsing holds it.`
      },
      {
        id: "use_holy_water",
        label: "Throw holy water to scatter the attackers",
        keywords: ["holy water", "throw", "splash", "scatter", "attackers", "flask", "water"],
        discovery: `You uncap the flask and hurl its contents at the nearest cluster of Szgany. The holy water catches one full in the face. He screams — not because it burns him, but because the splash hits the amulet around his neck, a twisted thing of bone and iron, and the amulet shatters. The gypsy drops to his knees, clutching his chest. His companions hesitate. In that hesitation, Godalming fires his revolver into the air. The Szgany scatter like startled crows, melting back into the rocks, their war cries fading to whispers on the wind.`
      },
      {
        id: "find_cover",
        label: "Take cover behind the rocks and regroup",
        keywords: ["cover", "rocks", "regroup", "hide", "shelter", "take", "position"],
        discovery: `You pull the group behind a shelf of granite. The wind hammers the rocks around you. The Szgany are circling — you can see their torches moving on the ridge above. 'They will not attack again,' Van Helsing says, breathing hard. 'Not in daylight. They fear the sun as their master does.' Jonathan points to a narrow defile between two cliff faces. 'There. That pass leads to the castle. I remember it. But it is narrow — a perfect place for an ambush.' Seward checks Mina's pulse. 'She is fading. Whatever the Count is doing, it is killing her slowly.'`
      },
      {
        id: "examine_szgany",
        label: "Search the fallen Szgany for information or supplies",
        keywords: ["search", "szgany", "fallen", "body", "gypsy", "examine", "find"],
        discovery: `You kneel beside the fallen gypsy with the shattered amulet. He is alive — unconscious, breathing shallowly. In his belt pouch, you find a crude map drawn on leather: the path to the castle, marked with symbols — wolves at the forest edge, crosses at the bridge, a skull at the castle gate. And a note in broken English: 'Master comes by the old road. Keep the hunters from the mountain. Fail and die.' Dracula sent them. He knows you are close.`
      },
      {
        id: "encourage_mina",
        label: "Speak quietly to Mina and steady her resolve",
        keywords: ["mina", "speak", "encourage", "steady", "talk", "comfort", "strength"],
        discovery: `You take Mina's hands. They are ice. 'I can hear him,' she whispers. 'He is in the castle. He is afraid. He has called the sisters to guard him. He has sealed the doors.' Her eyes find yours. 'But he is also hungry. Desperate. He has not fed since the ship. He is growing weak — that is why I am growing weak. The bond works both ways.' She straightens. 'I will not die in these mountains. I will see him destroyed.'`
      }
    ],
    exitAction: "traverse_pass",
    exitLabel: "Walk through the mountain pass toward the castle",
    hardExitNarration: `You press into the narrow defile, single file, weapons drawn. The walls of rock close in until you can touch both sides with outstretched arms. Snow falls in a fine curtain, erasing the world behind you. Ahead, the pass opens onto a frozen plateau — and beyond it, silhouetted against a sky the color of bruises, the broken towers of Castle Dracula rise from the cliff edge like a crown of bone. You are here. The end begins.`,
    initialFacts: {
      items: ["crucifix", "jonathan journal", "holy water", "wooden cross"],
      metNPCs: ["innkeeper", "dracula", "van_helsing", "seward", "renfield", "mina"],
      established: [
        "arrived in Transylvania",
        "crossing Carpathian mountains",
        "Szgany servants ambushed the group",
        "Mina weakening from blood bond",
        "Dracula has called the sisters to guard him",
        "castle is close and heavily defended"
      ]
    },
    locationKeywords: {
      banned: ["the inn", "bistritz", "coach ride", "carfax abbey", "london", "the ship"]
    }
  },
  scene_22: {
    sceneId: "scene_22",
    sceneName: "The Castle Revisited",
    description: `Castle Dracula stands on the cliff edge like a fist raised against God. The towers are cracked, their battlements crumbled into the chasm below. The great iron gate hangs from a single hinge, rusted to the color of dried blood. Ivy — black, leafless, dead — crawls over every surface, and the stones themselves seem to sweat a dark moisture that never dries.

It is different from the castle you remember. Three years ago, the Count maintained it — kept it as a trap, a parlor, a stage for his games. Now it is abandoned to ruin. The courtyard is ankle-deep in dead leaves and bones — animal bones, mostly, though some of them are too large and too shaped to be anything but human. The fountain is dry and cracked, filled with a black residue that smells of old copper.

Jonathan stops at the gate. His face is white. 'This is where I entered,' he whispers. 'Through that door. He was waiting for me. He smiled. He said: Welcome to my house. Enter freely and of your own will.' His hand finds yours and grips until the knuckles go pale.

Van Helsing steps through the gate first, crucifix raised. The cross glows faintly — a pale, pulsing light that pushes back the shadows. 'He is here,' the Professor says. 'Deep below. I can feel the evil like a pressure against my skull.' Mina gasps and clutches her forehead. The scar is blazing red. 'He knows we are inside. He is calling them — the sisters, the servants. He is calling everything he has.'

The castle door is ajar. Beyond it, a corridor stretches into blackness. Something moves in the darkness — a rustle of fabric, a whisper of breath, the click of nails on stone. The castle is not empty. It has been waiting.`,
    content: [
      {
        id: "enter_castle",
        label: "Push open the castle door and step inside",
        keywords: ["door", "enter", "push", "castle", "step", "inside", "open"],
        discovery: `The door groans open on hinges that have not moved in months. The corridor beyond is lined with stone, hung with tapestries that have rotted to threads. The air is thick and cold, tasting of earth and decay. Torches flicker in wall sconces — impossible, since no one lit them. They burn with a blue-green flame that casts no warmth. The corridor branches ahead: left, toward a staircase spiraling upward into the towers; right, toward a heavy wooden door with iron bands.`
      },
      {
        id: "fortify_entrance",
        label: "Place garlic and crosses at the entrance behind you",
        keywords: ["garlic", "crosses", "entrance", "place", "fortify", "protect", "seal"],
        discovery: `You crush garlic bulbs along the threshold and press the wooden cross into the mortar above the door frame. The effect is immediate — the shadows at the far end of the corridor recoil, pulling back like tide from shore. Van Helsing nods approvingly. 'Good. That will slow them — the sisters, at least. The Count himself will not be stopped by garlic, but his servants will think twice.' Seward ties a string of garlic around Mina's neck. She does not flinch. She is beyond flinching.`
      },
      {
        id: "examine_courtyard",
        label: "Search the courtyard for signs of recent activity",
        keywords: ["courtyard", "search", "signs", "tracks", "bones", "recent", "examine"],
        discovery: `Among the bones and dead leaves, you find fresh tracks — bare feet, narrow, elongated, pressed deep into the mud. Three sets, all women's. The sisters have been pacing the courtyard. In the fountain's basin, beneath the black residue, you find a woman's ring — gold, set with a ruby. Engraved inside: L.W. Lucy Westenra. Your stomach turns. She wore this in her coffin. Someone has brought it here.`
      },
      {
        id: "listen_to_castle",
        label: "Press against the wall and listen to the castle sounds",
        keywords: ["listen", "sound", "wall", "whisper", "footsteps", "noise", "hear"],
        discovery: `You press your ear to the stone. Below — far below — you hear chanting. Not words but sounds, a guttural rhythm that predates language. And above it, clearer, closer: the soft pad of bare feet on stone. Multiple footsteps. Circling. Coming from above, from the tower staircase. And from behind the iron-banded door, a sound that stops your heart — breathing. Slow. Deep. Hungry.`
      },
      {
        id: "consult_harker_map",
        label: "Ask Jonathan to recall the castle layout from his journal",
        keywords: ["jonathan", "harker", "layout", "journal", "map", "recall", "castle"],
        discovery: `Jonathan closes his eyes. 'The great hall is through that iron door. It connects to the chapel — destroyed now, I'd guess. Below the chapel are the crypts. The Count's personal chamber is in the deepest crypt, sealed with earth from his homeland. There is a servants' stair from the great hall that descends — narrow, dark, straight down.' He opens his eyes. 'I walked every inch of this place in terror. I know it better than any living man.' Van Helsing grips his shoulder. 'Then lead us, Jonathan. Lead us to his heart.'`
      }
    ],
    exitAction: "descend_to_great_hall",
    exitLabel: "Open the iron-banded door and enter the great hall",
    hardExitNarration: `The iron door swings open with a shriek that echoes through the castle like a scream. Beyond it, the great hall yawns — vast, dark, its vaulted ceiling lost in shadow. The remnants of a long table lie splintered across the floor. Tapestries hang in shreds. And at the far end, arranged in a semicircle around the cold hearth, three shapes materialize from the darkness. The sisters have been waiting.`,
    initialFacts: {
      items: ["crucifix", "jonathan journal", "holy water", "wooden cross"],
      metNPCs: ["innkeeper", "dracula", "van_helsing", "seward", "renfield", "mina"],
      established: [
        "entered Castle Dracula",
        "castle is decayed and ruined",
        "sisters are guarding the castle",
        "Dracula is in the deepest crypt",
        "garlic and crosses slow vampire servants",
        "found Lucy ring in courtyard fountain"
      ]
    },
    locationKeywords: {
      banned: ["the inn", "bistritz", "carfax abbey", "london", "the ship", "mountain pass"]
    }
  },
  scene_23: {
    sceneId: "scene_23",
    sceneName: "The Three Sisters — Final Battle",
    description: `The great hall of Castle Dracula is a cathedral of ruin. The vaulted ceiling arches overhead like the ribcage of some immense dead beast, stone ribs converging in the darkness above. The floor is a mosaic of cracked tile and dried blood. The long table — once set with silver and crystal for the Count's terrible hospitality — lies in splinters, scattered across the hall like the bones of a dragon.

Three women stand at the far end, arranged in a loose triangle. They are as beautiful as you remember — more beautiful, if beauty can exist in something so wrong. Their gowns are white, their skin porcelain, their lips the red of fresh wounds. The tallest stands slightly forward — the leader, the eldest. Her eyes are ancient and amused. The second holds a curved blade, her smile sharp as its edge. The third — the youngest — says nothing. She just watches, as she always has, with a hunger that makes the air taste of copper.

Behind you, Van Helsing has formed a protective circle around Mina — garlic, crucifixes, holy water laid out on the floor in a pattern that glows faintly. Mina kneels in the center, clutching the wooden cross, her eyes closed, her lips moving in prayer. The scar on her forehead burns like a brand. She is your compass and your vulnerability, and the sisters know it.

The eldest sister steps forward. Her voice is music played on broken strings. 'You have come a long way to die.' She extends her hands, and the shadows in the hall twist toward you like reaching fingers. 'The Master is below. He will feast on your blood before dawn. But first — we will have our fun.'

The hall fills with the sound of wings. Bats — hundreds of them — pour from the rafters in a living cyclone.`,
    content: [
      {
        id: "hurl_holy_water",
        label: "Throw holy water at the eldest sister",
        keywords: ["holy water", "throw", "splash", "eldest", "sister", "first", "flask"],
        discovery: `You hurl the flask of holy water and it strikes the eldest sister full in the chest. The effect is volcanic. She screams — a sound that cracks the window glass and sends the bats scattering in panic. Where the holy water touches her, her flesh boils and peels, revealing something ancient and black beneath. She staggers back, clawing at herself, her beauty dissolving like wax held to flame. 'Impossible,' she hisses. 'You have no power here.' But the burns spread, smoking, and she falls to one knee.`
      },
      {
        id: "thrust_crucifix",
        label: "Advance with the crucifix held before you",
        keywords: ["crucifix", "advance", "hold", "forward", "push", "cross", "ward"],
        discovery: `You raise the crucifix and step forward. The light blazes — white, searing, casting shadows that are wrong because they point toward the vampires, not away from the light source. The second sister and the third recoil, hissing, their arms raised to shield their faces. The eldest, already burning, screeches and throws herself backward through the air, landing on the far wall like a spider. 'Kill the one holding it!' she screams. 'Kill the mortal! The Master demands it!'`
      },
      {
        id: "drive_stake",
        label: "Rush the youngest sister with an oak stake",
        keywords: ["stake", "rush", "youngest", "oak", "drive", "heart", "attack"],
        discovery: `You charge the youngest — the silent one, the watcher — and she turns to face you with something like surprise. She is fast — impossibly fast — but she is also the youngest, the least experienced. Your oak stake finds her chest just below the collarbone. She shrieks and grabs your wrist with hands of iron. The stake is not deep enough. You drive it harder, putting your weight behind it, and the point scrapes against bone, then slides between her ribs and into her heart. She goes rigid. Her mouth opens in a silent scream. Her body turns to ash from the center outward, crumbling, scattering, until nothing remains but the stake in your hand and a scatter of pale dust on the broken tiles. One down.`
      },
      {
        id: "protect_mina_circle",
        label: "Stand over Mina and reinforce the protective circle",
        keywords: ["mina", "protect", "circle", "stand", "guard", "defend", "garlic"],
        discovery: `You throw yourself back toward Mina. The garlic perimeter is holding — the second sister circles it like a wolf testing a fire, her curved blade flashing. Van Helsing is chanting in Latin, his crucifix extended, his face streaming with sweat. Mina opens her eyes. 'He is coming up,' she gasps. 'The Count — he heard the screaming. He is rising from the crypt. We have minutes.' Seward draws his silver lancet and takes position beside you. Godalming fires his revolver at the second sister. The bullet passes through her shoulder — she does not bleed, but she flinches. 'Useful,' Van Helsing notes. 'They can feel impact. Pin her with a stake while she is stunned.'`
      },
      {
        id: "fight_second_sister",
        label: "Engage the second sister with blade and cross",
        keywords: ["second", "sister", "fight", "blade", "cross", "engage", "attack"],
        discovery: `The second sister is the fighter — fast, vicious, her curved blade singing as she slashes at your throat. You parry with the crucifix and the blade shatters against it in a burst of sparks. She hisses, bare-handed now, and lunges. Jonathan appears from your left, stake raised, and drives it into her back. She twists, catching the stake and snapping it. But the distraction is enough. You press the crucifix to her forehead and she screams, stumbling backward into the garlic perimeter. The garlic burns her feet like coals and she falls. Van Helsing is there in an instant, a fresh stake in his hands, and he pins her to the floor with a single devastating blow. She dissolves. Two down.`
      }
    ],
    exitAction: "defeat_sisters",
    exitLabel: "Finish the last sister and press toward the crypt stairs",
    hardExitNarration: `The eldest sister — the last — hovers at the ceiling, her ruined face a mask of fury and terror. 'You cannot kill what has lived for centuries,' she whispers. But the crucifix in your hand is blazing and Van Helsing's voice fills the hall with prayer. She turns to flee. Jonathan Harker is waiting. His stake catches her in the back as she passes. She crumbles to dust on the wind, and the great hall falls silent. The hearth fire has died. The bats are gone. From below — far below — you hear a sound: the grinding of a stone lid opening. Dracula is awake. Dracula is rising.`,
    initialFacts: {
      items: ["crucifix", "jonathan journal", "holy water", "wooden cross"],
      metNPCs: ["innkeeper", "dracula", "van_helsing", "seward", "renfield", "mina"],
      established: [
        "destroyed all three vampire sisters",
        "holy water burns vampires severely",
        "oak stake through heart destroys vampire",
        "crucifix repels and burns vampires",
        "Dracula is rising from the crypt below",
        "garlic perimeter protects Mina",
        "Mina senses Dracula is near and hungry"
      ]
    },
    locationKeywords: {
      banned: ["the inn", "bistritz", "carfax abbey", "london", "the ship", "mountain pass", "courtyard"]
    }
  },
  scene_24: {
    sceneId: "scene_24",
    sceneName: "Dracula's End",
    isFinal: true,
    exitLabel: "Watch the dawn break over the castle",
    exitAction: "dawn_breaks",
    description: `The stairs descend into the earth itself. Each step is carved from living rock, worn smooth by centuries of something other than feet. The air grows colder with every descent, thicker, heavy with the smell of turned soil and old blood. Van Helsing's crucifix throws dancing shadows on the walls — but the shadows are wrong. They move independently, reaching for you with fingers that have no source.

The crypt is a cathedral of death. The ceiling is supported by pillars of black stone, carved with figures from a history older than Christendom — warriors and victims, intertwined, their mouths open in eternal screams. The floor is not stone but earth — Transylvanian earth, shipped across the sea in boxes, packed and tamped until it forms a carpet of native soil ten feet deep. And in the center of that earth, on a stone plinth, lies a coffin.

The lid is open.

He stands behind the coffin.

Count Dracula is not what you expected. Three years ago, he was the gracious host — tall, elegant, silver-tongued, his age apparent only in his eyes. Now he is stripped of pretense. He is tall — taller than any living man — and gaunt, his cheekbones sharp as blades beneath skin the color of old parchment. His eyes burn red in the crucifix light, not with anger but with a hunger so vast it seems to distort the air around him. He wears black — a coat that moves like smoke despite the still air — and his hands end in nails as long as knives, curved and yellowed.

'I told you once,' he says, and his voice fills the crypt like the tolling of a bell, 'that I have the strength of twenty men.' He smiles, and his teeth are not the teeth of a human being. 'I was modest.'

Behind you, Mina sways on her feet. The scar on her forehead is a line of fire. She is staring at Dracula — and he at her — and in that look you see the blood bond that connects them, a thread of dark light stretching from his heart to hers. 'Come to me, my bride,' he whispers. 'It is time.' Mina takes a step forward. You catch her arm.

Van Helsing steps between them, crucifix raised. The cross blazes — and for the first time, Dracula does not recoil. He laughs. 'Your trinkets have power over my children. But I am not a child. I am the father of the dark. I am ancient when your God was young.' He extends one hand, and the crucifix in Van Helsing's grip cracks. A fissure runs through the silver. The old professor stumbles.

The first light of dawn creeps through a crack in the crypt ceiling — a hairline fracture in the stone, barely wider than a blade, but through it, a single shaft of grey light falls across the earth floor. It is not enough to destroy him. But it is enough to weaken him. He flinches.

Jonathan Harker draws his stake and hammer. You ready the crucifix. Seward opens his bag. Godalming checks his revolver. And Mina — Mina closes her eyes and pushes back against the bond with everything she has left.

'This ends tonight,' you say. Dracula's red eyes fix on yours. 'Yes,' he says. 'It does.'`,
    content: [
      {
        id: "drive_final_stake",
        label: "Rush Dracula with the oak stake and hammer",
        keywords: ["stake", "rush", "drive", "hammer", "heart", "oak", "attack"],
        discovery: `You charge. Dracula moves — not like a man but like smoke, like shadow, like darkness given form — and his hand catches your throat and lifts you from the ground. Your feet kick air. His face is inches from yours, and his breath is the grave. 'You think a stick of wood can end me?' He throws you. You hit the stone pillar and taste blood. But Jonathan is behind you. He is already moving, stake in one hand, hammer in the other, and as Dracula turns, Jonathan drives the stake into the Count's chest with a scream of rage three years in the making. The stake bites deep. Dracula's mouth opens — a howl that shakes dust from the ceiling, that cracks the stone pillars, that sends the bats shrieking from every shadow. But the stake is not in his heart. Not yet. It has pierced his lung. He staggers. Jonathan raises the hammer again. Dracula catches his wrist and snaps it like a twig. Jonathan screams and falls.`
      },
      {
        id: "hold_crucifix_forward",
        label: "Thrust the crucifix directly at Dracula's face",
        keywords: ["crucifix", "thrust", "hold", "face", "forward", "press", "brand"],
        discovery: `You press forward, crucifix extended. Dracula snarls — not in fear but in rage. The cross sears his skin, blistering the pale flesh, and he recoils with a cry that is almost human. 'Your God's symbols mean nothing to me!' But they do. You can see it — the burns spreading across his face, the smoke rising from his flesh. Van Helsing is beside you now, his own crucifix raised, and together you drive the Count back toward the shaft of dawn light. 'The coffin!' Van Helsing shouts. 'Pin him to the coffin!'`
      },
      {
        id: "use_remaining_holy_water",
        label: "Empty the last holy water onto Dracula's earth",
        keywords: ["holy water", "earth", "soil", "empty", "pour", "desecrate", "coffin"],
        discovery: `You pull the last flask of holy water from your coat and hurl it not at Dracula but at the earth around his coffin. The effect is catastrophic. Where the holy water touches the Transylvanian soil, it ignites — not with fire but with light, a white blazing light that rises from the ground like steam. The earth screams. You can hear it — the soil itself, crying out in agony, burning, purifying. Dracula staggers as if struck. 'My earth!' he howls. 'My home!' He claws at the burning soil, trying to scoop it back into his coffin, but it turns to ash in his hands. Without his native earth, he cannot rest. Without rest, he cannot regenerate. He is mortal.`
      },
      {
        id: "call_mina_strength",
        label: "Call to Mina to break the blood bond",
        keywords: ["mina", "call", "break", "bond", "blood", "strength", "resist"],
        discovery: `'Mina!' you shout. Her eyes snap open. They are red — Dracula's red — and for a terrible moment you think she is lost. Then she blinks. The red fades. Her own eyes return — brown, fierce, burning with a will that has endured months of darkness and hunger and the constant whisper of the dead in her blood. She holds the wooden cross to her chest. 'No,' she says. The word is quiet but it fills the crypt. 'I am not yours. I was never yours.' Dracula turns to face her. 'You are mine. You have tasted of my blood —' 'And I reject it,' she says. 'I reject you. I reject the darkness. I choose the dawn.' The scar on her forehead blazes white — not red, white — and a crack appears in the air between them. The blood bond shatters like glass. Dracula staggers as if struck by a physical blow. For the first time in five hundred years, he is alone.`
      },
      {
        id: "drag_into_sunlight",
        label: "Force Dracula toward the shaft of dawn light",
        keywords: ["sunlight", "drag", "force", "light", "dawn", "push", "shaft"],
        discovery: `You grab Dracula's arm. It is like grabbing marble — cold, hard, impossibly strong. But he is weakened now — his earth burning, his bond broken, the stake wound in his chest pouring dark blood that steams in the cold air. Jonathan, broken wrist and all, grabs the other arm. Godalming throws his weight against the Count's back. Together you drag him — inch by screaming inch — toward the shaft of dawn light. Dracula fights. He throws Godalming across the crypt. He rakes Jonathan's face with his nails. But you do not let go. You hold the crucifix to his chest and you push, and the light touches his hand and his skin ignites, burning white, spreading up his arm. 'In the name of God!' Van Helsing roars, and he drives the stake home — through the Count's ribs, through the black and dead thing inside him that serves as a heart, pinning him to the stone plinth behind. Dracula's scream is the sound of centuries ending.`
      }
    ],
    exitAction: "witness_sunrise",
    exitLabel: "Watch the dawn break",
    hardExitNarration: `The shaft of dawn light widens. Through the crack in the stone ceiling, the sun itself begins to pour — first a thread, then a river, then a torrent of gold that floods the crypt with warmth. Dracula burns. Not like paper or wood but like a dark star collapsing inward, his form turning to ash and shadow and memory. His red eyes find yours one last time, and in them you see not rage but something like relief — the look of a creature that has existed for five centuries and, at the very end, is grateful for the ending.

Then he is gone. The ash scatters in the light. The crypt falls silent.

Mina drops the wooden cross. She falls to her knees and weeps — not in grief but in release, in the sudden absence of a voice that has whispered in her blood for months. The scar on her forehead fades. The redness drains. Her skin warms. She looks up at you with her own eyes — clear, brown, human — and she is Mina again. Whole. Free.

Van Helsing drops his shattered crucifix and sinks against a pillar, old and exhausted and smiling through his tears. 'It is done,' he says. 'God help us. It is done.' Jonathan cradles his broken wrist and stares at the empty plinth where the Count lay, and says nothing. Seward tends to Jonathan's wounds with hands that do not shake for the first time in months. Godalming reloads his revolver out of habit, then holsters it.

You climb the stairs together. The castle is silent — truly silent, not the silence of something waiting but the silence of something that has ended. The sisters are ash. The servants have fled. The wolves have stopped howling.

You step through the castle gate and into the morning. The Carpathian Mountains stretch before you, peaks white with snow, valleys green with ancient forest, and the sky above is the clean, impossible blue of a world that has been given a second chance. The sun rises over the eastern ridge and its light falls on your faces — warm, golden, merciless in its beauty.

Mina takes your hand. Her grip is warm. Alive.

'The sun,' she says, and her voice is her own. 'I had forgotten what it felt like.'

Behind you, Castle Dracula stands empty against the sky. Already, the wind is erasing the footprints in the courtyard. Already, the ivy is pulling the stones apart. In a year, in ten, the castle will be rubble. In a century, it will be a story parents tell children to keep them indoors after dark.

But that is tomorrow. Today, the sun is warm. The road home is long. And you are alive.

The adventure of Dracula is over.`,
    initialFacts: {
      items: ["crucifix", "jonathan journal", "holy water", "wooden cross"],
      metNPCs: ["innkeeper", "dracula", "van_helsing", "seward", "renfield", "mina"],
      established: [
        "confronted Dracula in his crypt",
        "Dracula destroyed by stake and sunlight",
        "blood bond with Mina is broken",
        "Mina is freed from Dracula influence",
        "all three sisters destroyed",
        "castle is empty and falling to ruin",
        "the adventure is over"
      ]
    },
    locationKeywords: {
      banned: ["the inn", "bistritz", "carfax abbey", "london", "the ship", "mountain pass", "courtyard", "great hall"]
    }
  }
};
