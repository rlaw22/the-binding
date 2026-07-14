module.exports = {
  scene_15: {
    sceneId: "scene_15",
    sceneName: "Finding Mina",
    description: "The rain has not stopped for three days. London's streets are rivers of filth and gaslight as your cab rattles through Whitechapel toward the lodgings Mina Murray has taken since Jonathan's confinement in Dr. Seward's asylum. Van Helsing sits beside you, his bag on his knees, his face grey with exhaustion. Neither of you has spoken for ten minutes.\n\nThe house is narrow, brick, respectable — the kind a young woman of modest means might afford. The landlady opens the door, wringing her hands. 'She won't eat, sir. Won't speak. Sits at that window staring at the dark like she's waiting for someone.' She lowers her voice. 'And there are marks on her neck. I've asked, but she says it's nothing.'\n\nUpstairs, Mina Murray sits in a wooden chair by the window. She is pale — not the pale of illness but the pale of something being slowly drained from her. Her dark hair is unbound, her eyes red-rimmed but fierce. She wears a high-collared blouse, and her hand drifts to her throat when she sees you. On the sill, a crucifix lies face-down. The curtain is pulled open despite the hour.\n\n'I know why you've come,' she says quietly. Her voice is steady, but her hands are not. 'You know about Lucy. And you suspect the same is happening to me.' She stands and faces Van Helsing. 'Professor. I will not be treated like a child. Tell me the truth — am I becoming what she became?'",
    content: [
      {
        id: "ask_about_marks",
        label: "Ask Mina about the marks on her throat",
        keywords: [
          "marks",
          "throat",
          "bite",
          "neck",
          "ask",
          "wound",
          "tell"
        ],
        discovery: "Mina's hand trembles at her collar. Slowly, deliberately, she unfastens the top button and pulls the fabric aside. Two puncture wounds, red and inflamed, sit over the jugular — the same placement, the same terrible precision as Lucy's. 'He comes at night,' she whispers. 'I cannot see him clearly. But I feel his breath. I feel his teeth. And the worst part —' She closes her eyes. 'The worst part is that part of me does not want him to stop.'"
      },
      {
        id: "ask_about_dracula_visits",
        label: "Ask Mina to describe what happens during the visits",
        keywords: [
          "describe",
          "visits",
          "night",
          "happens",
          "remember",
          "dream",
          "sleep"
        ],
        discovery: "Mina sits back down, her composure cracking. 'I cannot always tell if I am awake or dreaming. He appears as mist first — seeping through the window frame, through the keyhole, through cracks I cannot see. Then he solidifies. He is beautiful. Terrible. He speaks to me in a language I should not understand but do. He says I will be his queen. That we will rule the night together for centuries.' She wipes her eyes. 'Last night he made me drink. From his chest. I fought, but my body would not obey me.'"
      },
      {
        id: "examine_window_and_sill",
        label: "Examine the window, the sill, and the crucifix on it",
        keywords: [
          "window",
          "sill",
          "crucifix",
          "examine",
          "check",
          "inspect",
          "open"
        ],
        discovery: "The window latch is bent outward — forced from outside with inhuman care. The sill is scratched with long grooves, as if claws gripped it. The crucifix you find face-down on the sill is warm to the touch — almost hot — and its surface is tarnished black, as if corroded by an unseen acid. Van Helsing examines it and crosses himself. 'He has been here many times. And he grows bolder. The crucifix repels him, but each night it weakens.'"
      },
      {
        id: "talk_to_van_helsing_plan",
        label: "Pull Van Helsing aside and discuss what must be done",
        keywords: [
          "van helsing",
          "discuss",
          "plan",
          "aside",
          "talk",
          "strategy",
          "what"
        ],
        discovery: "Van Helsing draws you to the landing, out of Mina's earshot. His face is grim. 'She is further along than Lucy ever was. The forced feeding — the blood exchange — it creates a bond. A psychic bond. She can feel him. And he can feel her.' He grips your arm. 'We must move her tonight. Somewhere sacred. A church, perhaps. And we must begin the rituals — garlic, holy water, the Eucharist. We slow the transformation while we find and destroy him. Carfax Abbey. The earth boxes. That is where we strike.'"
      }
    ],
    exitAction: "leave_mina_lodgings",
    exitLabel: "Help Mina gather her things and move to a safer location",
    hardExitNarration: "Mina takes Jonathan's journal from your hands and clutches it to her chest. 'If I become what Lucy became,' she says, 'you must promise me you will do what must be done. Promise me.' Van Helsing puts his hand on her shoulder. 'We will save you, dear lady. But we must go. Now. Before the sun finishes setting.'",
    initialFacts: {
      items: [
        "crucifix",
        "jonathan journal",
        "holy water"
      ],
      metNPCs: [
        "innkeeper",
        "dracula",
        "van_helsing",
        "seward",
        "renfield",
        "mina"
      ],
      established: [
        "Lucy has died",
        "bite marks healed at death",
        "Van Helsing says she will rise as vampire",
        "Mina has bite marks on throat",
        "Dracula visits Mina at night",
        "Mina was forced to drink Dracula blood",
        "crucifix on Mina sill is weakened"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "castle dracula",
        "transylvania",
        "the forbidden wing"
      ]
    }
  },
  scene_16: {
    sceneId: "scene_16",
    sceneName: "Mina in Danger",
    description: "The safe house is a cramped flat above a butcher's shop in Bermondsey — chosen because the smell of blood from below masks Mina's scent from Dracula's preternatural senses. Seward procured it through an asylum contact. The windows are shuttered, the doors bolted, and every surface is lined with garlic — cloves strung on twine, hung from nails, pressed into the window frames. The air is thick with it.\n\nMina lies on a cot in the center of the room. She has deteriorated in the hours since you moved her. Her skin is translucent, her pulse thready, her breathing shallow. The bite marks on her throat have changed — they are no longer inflamed but sealed, clean, almost elegant, as if the wounds are healing into something permanent. Her eyes, when they open, flash with an amber light that was not there yesterday.\n\nVan Helsing works with methodical fury. He has drawn a circle of holy water around the cot. A communion wafer rests on Mina's forehead, and where it touches her skin, the flesh reddens and smokes — a reaction that makes Seward gasp and Mina whimper in her sleep. 'It burns her,' Van Helsing murmurs. 'Which means the infection is advanced. But it does not destroy her. Which means she is not yet lost.'\n\nSeward stands in the corner, his medical bag open but useless. 'I am a doctor,' he says bitterly. 'And I cannot treat what ails her.' Renfield's ravings echo in your mind: the earth boxes, the Master's soil. If you destroy those, Dracula loses his sanctuary. Without rest, he weakens. Without rest, he can be killed.",
    content: [
      {
        id: "examine_mina_condition",
        label: "Examine Mina's condition and the bite marks closely",
        keywords: [
          "mina",
          "condition",
          "examine",
          "bite",
          "marks",
          "throat",
          "check"
        ],
        discovery: "You kneel beside the cot. Mina's skin is cold — not the cold of death but the cold of deep water. The bite marks have sealed into two small scars, silver-white, that pulse faintly when you look at them. As you watch, Mina's lips move. 'The boxes,' she whispers. 'He sleeps in the boxes. The soil from home. He cannot rest without it.' Her eyes snap open — amber, inhuman. 'He is afraid. He knows you are coming.' Then she blinks and her eyes are brown again, and she does not remember what she said."
      },
      {
        id: "ask_van_helsing_ritual",
        label: "Ask Van Helsing what rituals can slow the transformation",
        keywords: [
          "van helsing",
          "ritual",
          "slow",
          "stop",
          "transformation",
          "cure",
          "help"
        ],
        discovery: "Van Helsing lays out his materials on a cloth: communion wafers, a vial of holy water from the Vatican, garlic bulbs, and a small silver knife. 'The wafer burns the unclean flesh. The holy water purifies the blood. Garlic drives the darkness from the body. But these are treatments, not cures. The only cure is to destroy the source — the vampire who made her.' He looks at you with haunted eyes. 'We have days. Perhaps less. When the transformation is complete, she will be like the sisters in Harker's account. Beautiful. Hungry. And gone forever.'"
      },
      {
        id: "ask_seward_medical",
        label: "Ask Dr. Seward if there is anything medical science can do",
        keywords: [
          "seward",
          "medical",
          "science",
          "blood",
          "transfusion",
          "doctor",
          "help"
        ],
        discovery: "Seward opens his bag with shaking hands. 'I can try a blood transfusion. Replacing her blood with healthy blood may slow the — the corruption.' He looks at Van Helsing, who nods slowly. 'From me,' Seward says. 'Take mine.' The procedure is grim and intimate — Seward's blood flowing through a rubber tube into Mina's arm. For a moment, color returns to her cheeks. Then it fades again. 'It helps,' Van Helsing says. 'But it is not enough. We need to strike at the heart.'"
      },
      {
        id: "plan_carfax_assault",
        label: "Begin planning the assault on Carfax Abbey",
        keywords: [
          "plan",
          "carfax",
          "abbey",
          "assault",
          "attack",
          "earth boxes",
          "strategy"
        ],
        discovery: "Van Helsing spreads Harker's map on the table. 'Carfax Abbey. The earth boxes are in the cellar — Harker saw them loaded for shipment. There are fifty of them, filled with Transylvanian soil. Each one must be found, opened, and filled with holy wafers. Without his native earth, the Count cannot rest during the day. Without rest, he is vulnerable.' He draws a rough floor plan. 'But he has servants. Szgany — Romanian gypsies loyal to him. They guard the abbey at night. And the Count himself may be there.' He meets your eyes. 'We go at dawn. When he is weakest.'"
      }
    ],
    exitAction: "leave_safe_house",
    exitLabel: "Rest before the dawn assault on Carfax Abbey",
    hardExitNarration: "Van Helsing takes the first watch. Seward sleeps fitfully in a chair. Mina lies still, the communion wafer on her forehead glowing faintly in the dark. Outside, the rain has stopped. The clouds part and moonlight spills through a crack in the shutters, falling across Mina's face. For a moment — just a moment — she smiles in her sleep, and the smile is not hers.",
    initialFacts: {
      items: [
        "crucifix",
        "jonathan journal",
        "holy water",
        "garlic",
        "communion wafers"
      ],
      metNPCs: [
        "innkeeper",
        "dracula",
        "van_helsing",
        "seward",
        "renfield",
        "mina"
      ],
      established: [
        "Lucy has died",
        "Mina has bite marks on throat",
        "Dracula visits Mina at night",
        "Mina was forced to drink Dracula blood",
        "Mina transformation is advancing",
        "holy wafer burns Mina skin — infection is real",
        "blood transfusion slows but does not cure",
        "Carfax Abbey has earth boxes in cellar",
        "Szgany servants guard the abbey"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "castle dracula",
        "transylvania",
        "the forbidden wing",
        "minas lodgings"
      ]
    }
  },
  scene_17: {
    sceneId: "scene_17",
    sceneName: "Carfax Abbey",
    description: "Dawn bleeds grey through the London fog as you reach the gates of Carfax Abbey. The building is a ruin — a great, decaying husk of Norman stone and rotting timber, its chapel roof collapsed, its windows gaping like empty eye sockets. Ivy strangles the walls. The iron gate hangs from a single hinge. The air smells of wet earth, mildew, and something older — the sweet, coppery stench of the grave.\n\nVan Helsing leads the way, crucifix raised. Seward follows with a wooden stake and mallet. You carry the holy water, the garlic, and Jonathan's journal with its map of the cellar layout. The front doors are unlocked — broken, actually, forced inward as if something large and heavy was carried through them. The entrance hall is a cathedral of dust and shadow. Broken pews line the nave. Rats scatter at your approach. The floor is treacherous — rotten wood over stone, and beneath the stone, you can hear it: a low, rhythmic vibration, as if the earth itself is breathing.\n\n'The cellar,' Van Helsing whispers. 'Below the chapel. Harker's map shows a stair behind the altar.' But between you and the altar, something moves. A shape in the shadows — not one but several, low to the ground, spreading across the nave like oil on water. The Szgany. Dracula's human servants. They carry curved knives and move without sound. Their eyes catch the candlelight and reflect it back, yellow as a cat's.",
    content: [
      {
        id: "confront_szgany",
        label: "Hold up the crucifix and advance toward the Szgany",
        keywords: [
          "crucifix",
          "hold",
          "advance",
          "szgany",
          "servants",
          "ward",
          "push"
        ],
        discovery: "You thrust the crucifix forward and the Szgany recoil — but not as a vampire would. They are human. The crucifix's power over them is fear, not holy force. They mutter in a language you do not understand. One, bolder than the rest, steps forward and spits at the ground. 'Nozferatu,' he hisses. 'Master sleep. You go. Now.' Van Helsing speaks to him in rapid Romanian. The man's eyes widen. He says one word — 'Vanatorul' — the hunter — and the Szgany part like water, melting into the shadows of the nave. They do not leave. They wait."
      },
      {
        id: "descend_to_cellar",
        label: "Search for the cellar stairs behind the chapel altar",
        keywords: [
          "cellar",
          "stairs",
          "stair",
          "altar",
          "chapel",
          "descend",
          "below"
        ],
        discovery: "Behind the ruined altar, a stone staircase spirals downward into perfect darkness. The air rising from below is warm and damp and smells of turned earth — the same smell from the forbidden wing of Castle Dracula. Your candle gutters in a draft that comes from nowhere and everywhere. The stairs are worn smooth by centuries of feet and something else — something dragged. Heavy, rectangular. The earth boxes. You count twenty-three steps before the staircase opens into a low, vaulted chamber. And there they are."
      },
      {
        id: "destroy_earth_boxes",
        label: "Begin opening the earth boxes and filling them with holy wafers",
        keywords: [
          "earth",
          "boxes",
          "open",
          "destroy",
          "wafer",
          "holy",
          "soil"
        ],
        discovery: "The boxes are crude — wooden crates, each six feet long, packed with dark, rich Transylvanian soil. There are fifty of them, stacked two deep along the walls. You pry open the nearest and the stench hits you — not rot, but something vital, alive, wrong. The soil moves. Not much — a tremor, a settling — as if something beneath the surface shifts in its sleep. You drop a communion wafer into the box and the soil screams. A high, thin sound, like a tuning fork struck against bone. The soil blackens and goes still. Van Helsing begins working the other end of the chamber. 'Quickly,' he hisses. 'He will feel each one.'"
      },
      {
        id: "search_for_dracula",
        label: "Search the chamber for signs of Dracula himself",
        keywords: [
          "search",
          "dracula",
          "count",
          "coffin",
          "chamber",
          "signs",
          "look"
        ],
        discovery: "In the far corner, set apart from the others, is a single coffin — not a crate but a genuine coffin, ornate, draped in rotting velvet. The lid is sealed with iron clasps. You approach and press your ear to the wood. Nothing. The coffin is empty. But inside, the earth is warm. Body-warm. And pressed into the soil, the impression of a body — broad shoulders, long limbs. He was here. Recently. And he will return. Scratched into the inner lid, in a hand you recognize from the castle, two words: 'SHE IS MINE.'"
      }
    ],
    exitAction: "leave_carfax",
    exitLabel: "Destroy the last earth boxes and retreat before Dracula returns",
    hardExitNarration: "You have destroyed thirty-seven of the fifty boxes when Van Helsing grabs your arm. 'Enough. Dawn is ending. He will rise soon, and he will come here first.' The soil screams as you drop the last wafer. The sound echoes through the abbey. Above you, the Szgany are running — fleeing through the nave and out the broken doors. They know what is coming. You run too.",
    initialFacts: {
      items: [
        "crucifix",
        "jonathan journal",
        "holy water",
        "garlic",
        "communion wafers"
      ],
      metNPCs: [
        "innkeeper",
        "dracula",
        "van_helsing",
        "seward",
        "renfield",
        "mina"
      ],
      established: [
        "Lucy has died",
        "Mina has bite marks on throat",
        "Mina was forced to drink Dracula blood",
        "Mina transformation is advancing",
        "assaulted Carfax Abbey",
        "destroyed 37 of 50 earth boxes",
        "found Dracula empty coffin with message",
        "Szgany servants fled the abbey",
        "Dracula will know his boxes are destroyed"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "castle dracula",
        "transylvania",
        "the forbidden wing",
        "minas lodgings",
        "bermondsey safe house"
      ]
    }
  },
  scene_18: {
    sceneId: "scene_18",
    sceneName: "Dracula's Counter-Attack",
    description: "You return to the safe house to find the shutters blown inward and the garlic strings scattered across the floor. The door hangs from its hinges. The communion wafers placed around Mina's cot are blackened — every one of them — as if exposed to a blast of furnace heat. The holy water circle is evaporated, leaving a ring of scorched floorboards.\n\nMina is gone.\n\nSeward finds the note pinned to the cot with a surgical needle — his own needle, from his medical bag. The handwriting is elegant, precise, centuries old: 'You have taken my earth. I have taken what is mine. The woman drinks of me now willingly. Come to Whitby if you dare. Bring your crucifixes. Bring your faith. I have lived four hundred years against the prayers of the faithful, and I will live four hundred more. — D.'\n\nThen the storm hits. Not a natural storm — the sky splits with lightning that strikes in the same place three times, and the thunder sounds like laughter. The windows that remain intact shatter inward. A wolf — impossibly large, grey as iron — appears in the doorway, its eyes red, its lips curled back from teeth that gleam in the lightning. Behind it, more shapes in the rain. The wind howls with a human voice. Dracula is sending everything he has.",
    content: [
      {
        id: "defend_against_wolves",
        label: "Barricade the door and use holy water against the wolves",
        keywords: [
          "barricade",
          "door",
          "holy water",
          "wolves",
          "wolf",
          "defend",
          "protect"
        ],
        discovery: "You hurl the last of the holy water at the doorway and the wolf screams — a sound no animal should make — as the water burns through its flesh like acid. It retreats, dragging a melted leg. But there are more. Van Helsing pushes a wardrobe against the door. 'He is toying with us! This is not an attack — it is a message. He wants us to know he can reach us anywhere.' Through the shattered window, you see the wolves circling the building, their red eyes gleaming in the lightning."
      },
      {
        id: "read_dracula_note",
        label: "Study the Count's note for clues about Mina's location",
        keywords: [
          "note",
          "letter",
          "read",
          "study",
          "clue",
          "whitby",
          "message"
        ],
        discovery: "You read the note again. Whitby. The port town on the Yorkshire coast — where the Demeter ran aground carrying Dracula's earth boxes from Varna. Van Helsing's face drains of color. 'He has taken her to the source. Where his ship landed. Where his English campaign began.' He grips the note. 'There is a monastery ruin near Whitby. Holy ground. If he has taken her there, it is a mockery — turning sacred earth into his domain. We must go. Tonight.'"
      },
      {
        id: "search_for_mina_trail",
        label: "Search the room for signs of how Mina was taken",
        keywords: [
          "search",
          "room",
          "signs",
          "mina",
          "trail",
          "drag",
          "taken"
        ],
        discovery: "The cot sheets are twisted and torn. Mina fought. Scratch marks on the floorboards lead to the window — she was dragged. But near the window, the marks stop. No blood. No broken glass. She was carried — lifted through the shattered window as if she weighed nothing. On the windowsill, you find a single lock of her dark hair, still warm. And pressed into the wood, the imprint of hands — large, strong, inhuman — with fingers too long and nails too sharp. He did not break in. He called, and she walked to the window. And then he took her."
      },
      {
        id: "console_seward",
        label: "Stop Seward before he runs into the storm alone",
        keywords: [
          "seward",
          "stop",
          "hold",
          "storm",
          "console",
          "restrain",
          "grab"
        ],
        discovery: "Seward is at the door, stake in hand, eyes wild. 'She's out there! We have to —' You grab his arm. He struggles, then collapses against you, sobbing. 'I couldn't save Lucy. I couldn't save her.' Van Helsing puts his hand on Seward's shoulder. 'You will save Mina. But not like this. Not by dying in a storm while the Count laughs.' He pulls Seward back from the door. 'We go to Whitby. Together. And we end this.'"
      }
    ],
    exitAction: "flee_safe_house",
    exitLabel: "Run through the safe house back door as the wolves close in",
    hardExitNarration: "The wolves breach the front door as you climb through the back window. Rain hammers the streets. Lightning illuminates the alley in strobing white, and for one frozen second, you see him — standing on the roof of the building opposite, his cloak billowing in a wind that touches nothing else. Dracula. Watching. Smiling. Then the lightning dies and he is gone, and you are running through London's midnight streets with the howling at your back.",
    initialFacts: {
      items: [
        "crucifix",
        "jonathan journal",
        "holy water"
      ],
      metNPCs: [
        "innkeeper",
        "dracula",
        "van_helsing",
        "seward",
        "renfield",
        "mina"
      ],
      established: [
        "Lucy has died",
        "Mina was forced to drink Dracula blood",
        "assaulted Carfax Abbey",
        "destroyed 37 of 50 earth boxes",
        "Dracula has taken Mina",
        "Dracula left a note — go to Whitby",
        "Dracula attacked safe house with wolves and storm",
        "garlic and holy water are depleted",
        "Mina may be turning willingly"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "castle dracula",
        "transylvania",
        "the forbidden wing",
        "minas lodgings",
        "carfax abbey"
      ]
    }
  },
  scene_19: {
    sceneId: "scene_19",
    sceneName: "The Blood Bond",
    description: "The church of St. Michael sits on a hill above Whitby, its graveyard a jagged field of tilted headstones overlooking the grey North Sea. The church itself is ancient — Norman nave, Saxon tower — and the stones still carry the weight of centuries of prayer. The air tastes of salt and old incense. It is the only place in Whitby where the shadows feel clean.\n\nYou found Mina at dawn, wandering the cliff path in a white nightgown, barefoot, her lips stained red, her eyes vacant. She walked into the church of her own accord and collapsed at the altar rail. Van Helsing carried her to the vestry, where she lies now on a stone bench beneath a painted window of the Archangel Michael driving his spear through the devil's heart. The irony is not lost on anyone.\n\nVan Helsing has been working for hours. He has placed communion wafers around the bench — and where they touch Mina's skin, the flesh reddens and smokes but does not burn through. He has administered holy water, which she drinks with difficulty, her body convulsing. He has prayed. And now he stands back, his face ashen, and says the words you have been dreading.\n\n'She has been forced to drink his blood. Not once — many times. The bond is complete. She can feel him — his emotions, his location, his hunger. She is connected to him as surely as if a rope were tied between their hearts.' He pauses. 'She is becoming. Slowly. But the sacred ground of this church slows the process. We have time — perhaps two days — before the transformation is irreversible.'\n\nMina's eyes open. They are brown — her own brown — but rimmed with that terrible amber. She reaches for your hand.",
    content: [
      {
        id: "take_mina_hand",
        label: "Take Mina's hand and sit beside her",
        keywords: [
          "take",
          "hand",
          "sit",
          "beside",
          "mina",
          "comfort",
          "hold"
        ],
        discovery: "Her fingers are ice-cold but her grip is strong. 'I can feel him,' she says. Her voice is her own — clear, educated, determined — but beneath it, a harmonic, as if another voice speaks in unison from far away. 'He is in Whitby. Below the cliffs. There are caves — smugglers' caves — and he has brought the remaining earth boxes there. He sleeps during the day, but at night...' She shudders. 'At night, he calls to me. And part of me answers.' A tear slides down her cheek. 'Use me. Use the bond. I can find him. I can lead you to him.'"
      },
      {
        id: "ask_van_helsing_bond",
        label: "Ask Van Helsing to explain the blood bond in detail",
        keywords: [
          "van helsing",
          "blood",
          "bond",
          "explain",
          "detail",
          "psychic",
          "link"
        ],
        discovery: "Van Helsing sits heavily. 'The blood bond is an ancient evil. When a vampire feeds his blood to a mortal — not once, but repeatedly — it creates a sympathetic link. She can sense his emotions. She can see through his eyes, if he allows it. And she can locate him, as a compass needle finds north.' He removes his spectacles and rubs his eyes. 'The bond also accelerates the transformation. Each time she uses it, she comes closer to becoming. It is a tool — perhaps our only tool — but the cost...' He cannot finish the sentence."
      },
      {
        id: "ask_mina_what_she_feels",
        label: "Ask Mina what she senses through the bond right now",
        keywords: [
          "mina",
          "sense",
          "feel",
          "bond",
          "now",
          "location",
          "see"
        ],
        discovery: "Mina closes her eyes. Her breathing slows. When she speaks, her voice is layered — her own, and something else beneath it, something ancient and hungry. 'He is below. In the caves beneath the abbey ruins. The smell of the sea is strong. He is angry. The earth boxes — the ones you destroyed — he felt each one die. He calls it murder.' Her eyes snap open, amber blazing. 'He is afraid. For the first time in four hundred years, he is afraid.' Then the amber fades and she is Mina again, shaking, terrified of what she has become."
      },
      {
        id: "examine_mina_stigmata",
        label: "Examine the marks where the communion wafers touched Mina's skin",
        keywords: [
          "examine",
          "wafer",
          "marks",
          "skin",
          "burn",
          "stigmata",
          "sacred"
        ],
        discovery: "Where the communion wafers touched Mina's skin, the burns have formed a pattern — not random scarring but deliberate marks, like letters in an alphabet you do not recognize. Van Helsing examines them with growing horror. 'These are not burn marks,' he whispers. 'They are the Count's mark. His brand. He is claiming her — not just through the bond but through the sacred elements themselves. Every time we use holy water or a wafer to fight the infection, we also reinforce his claim.' He steps back. 'We need a different approach. We need to break the bond at its source. By destroying him.'"
      }
    ],
    exitAction: "leave_church",
    exitLabel: "Get the group ready for the final hunt into the caves beneath Whitby",
    hardExitNarration: "Mina stands at the church door, wrapped in a borrowed shawl, her face pale but set with iron determination. 'I will lead you to him,' she says. 'And when you find him — when you raise the stake — do not hesitate. Do not look at my face. Because what he shows you will not be me.' She takes your hand one last time. Outside, the sun is setting over the North Sea, painting the sky in blood and gold. The hunt begins at dark.",
    initialFacts: {
      items: [
        "crucifix",
        "jonathan journal",
        "holy water"
      ],
      metNPCs: [
        "innkeeper",
        "dracula",
        "van_helsing",
        "seward",
        "renfield",
        "mina"
      ],
      established: [
        "Lucy has died",
        "assaulted Carfax Abbey",
        "destroyed 37 of 50 earth boxes",
        "Dracula has taken Mina to Whitby",
        "Mina has a blood bond with Dracula",
        "Mina can sense Dracula location through the bond",
        "using the bond accelerates Mina transformation",
        "communion wafers mark Mina with Dracula brand",
        "Dracula sleeps in caves beneath Whitby cliffs",
        "remaining earth boxes are in the caves",
        "two days before Mina transformation is irreversible"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "castle dracula",
        "transylvania",
        "the forbidden wing",
        "minas lodgings",
        "carfax abbey",
        "bermondsey safe house"
      ]
    }
  }
};
