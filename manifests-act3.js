module.exports = {
  scene_10: {
    sceneId: "scene_10",
    sceneName: "London — Van Helsing",
    description: "London is grey and wet, a world away from the Carpathian mountains. The cab drops you at a narrow townhouse near the British Museum. The brass nameplate reads: PROFESSOR ABRAHAM VAN HELSING, M.D., Ph.D., D.Litt.\n\nThe man who opens the door is not what you expected. He is older — sixty perhaps — with a broad, kind face and shrewd blue eyes behind wire spectacles. His handshake is firm, his accent thickly Dutch. He listens without interruption as you tell your story.\n\nWhen you produce Harker's journal, his hands tremble. He reads the key passages in silence, then sets the book down. 'So,' he says quietly. 'It is as I feared. The Count is already here.' He opens a map of London. 'Carfax Abbey. I have been there. The stench of evil is upon it. But there is worse news. He has already found a victim. A young woman named Lucy Westenra. She is dying, and no doctor can tell why.'",
    content: [
      {
        id: "show_journal",
        label: "Show Van Helsing Harker's journal",
        keywords: [
          "journal",
          "harker",
          "show",
          "give",
          "share",
          "read"
        ],
        discovery: "You place Harker's journal on Van Helsing's desk. He opens it with trembling hands, his spectacles sliding down his nose. He reads in silence — page after page — and his face changes. The scholarly composure cracks. His breath quickens. When he reaches the passages about the coffins filled with earth, he sets the book down and removes his spectacles. 'Mein Gott,' he whispers. 'This is everything I feared and more.' He looks at you with new eyes — not as a stranger but as a fellow witness. 'You have seen these things yourself? The coffins? The sisters?' When you nod, he grips your hand. 'Then we are brothers in this fight, you and I. And we will need every word this journal contains.'"
      },
      {
        id: "ask_about_lucy",
        label: "Ask about Lucy Westenra's condition",
        keywords: [
          "lucy",
          "westenra",
          "condition",
          "ill",
          "sick",
          "ask",
          "dying"
        ],
        discovery: "Van Helsing's face darkens. 'Lucy is the sweetest soul — bright, kind, beautiful. She has been growing pale, weak. Bite marks on her throat that Dr. Seward dismisses as insect bites. I know better.' He opens a drawer and produces garlic. 'I have been placing these around her room at night. They help — for now. But the creature is persistent.' He looks at you with desperate eyes. 'She is my friend's fiancée. I cannot lose her.'"
      },
      {
        id: "ask_what_to_do",
        label: "Ask Van Helsing what we should do first",
        keywords: [
          "what",
          "do",
          "first",
          "plan",
          "action",
          "help",
          "stop"
        ],
        discovery: "Van Helsing rises and paces the room, his hands clasped behind his back. 'First, we protect the living. Lucy Westenra is dying — the Count has been feeding on her. We must guard her at night with crucifixes, garlic, and holy water. Second, we investigate Carfax Abbey — the Count's English lair. His earth boxes will be there. Without them, he cannot rest. Third, we gather allies. Dr. Seward is a good man but blind to the truth. We must open his eyes.' He stops pacing and faces you. 'And fourth — we prepare to destroy the Count himself. Stake through the heart. Decapitation. Garlic in the mouth. There is no other way.' His voice is steady, but his eyes burn with a fury that is personal. 'He has taken too many already. This ends now.'"
      },
      {
        id: "describe_escape",
        label: "Describe your escape from Castle Dracula in detail",
        keywords: [
          "escape",
          "castle",
          "describe",
          "detail",
          "tell",
          "story",
          "dracula"
        ],
        discovery: "You tell Van Helsing everything — the coach ride, the wolves, the Count's impossible hospitality. The forbidden wing with its coffins of earth. The three sisters and their terrible beauty. The climb down the castle wall in the dark, the wolves at your heels, the crucifix burning in your hand. Van Helsing listens without interruption, his eyes never leaving your face. When you finish, he is silent for a long time. Then he opens a drawer and produces a map of London. 'You climbed the wall,' he says quietly. 'In the dark. With wolves below.' He shakes his head. 'You are either the bravest person I have ever met, or the most foolish. Either way, I am glad you are here.' He taps the map. 'Carfax Abbey. That is where we begin.'"
      }
    ],
    exitAction: "leave_van_helsing",
    exitLabel: "Leave Van Helsing's study to investigate Lucy",
    hardExitNarration: "Van Helsing grips your hand at the door. 'Be careful, my friend. The Count is here, and he knows we are coming.' He presses a small bottle into your hand. 'Holy water. From the Vatican. Use it wisely.'",
    initialFacts: {
      items: [
        "crucifix",
        "jonathan journal"
      ],
      metNPCs: [
        "innkeeper",
        "dracula",
        "van_helsing"
      ],
      established: [
        "arrived in London",
        "met Van Helsing",
        "showed him Harker journal",
        "Lucy Westenra is a victim"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "castle dracula",
        "transylvania"
      ]
    }
  },
  scene_11: {
    sceneId: "scene_11",
    sceneName: "Lucy's Illness",
    description: "Lucy Westenra lies in a canopied bed in a room that smells of lavender and something else — something sweet and metallic that you recognize from the coffins of the forbidden wing. She is beautiful even in illness — golden hair spread across the pillow, skin porcelain-pale.\n\nDr. John Seward stands at her bedside, a young man with the hollow eyes of someone who has not slept in days. 'I don't understand it,' he says. 'Her blood count is abysmal. I've tested for everything — consumption, anaemia, poisoning. Nothing.'\n\nYou notice what Seward does not: the garlic on the windowsill has been moved. The window latch is scratched. And on Lucy's throat, two small wounds — red, inflamed, placed over the artery.",
    content: [
      {
        id: "examine_lucy",
        label: "Examine Lucy's throat wounds closely",
        keywords: [
          "lucy",
          "throat",
          "wound",
          "bite",
          "mark",
          "examine",
          "neck"
        ],
        discovery: "You lean close. Two puncture marks, slightly inflamed, placed precisely over the jugular. Not insect bites. The marks of teeth — driven with a force no human possesses. Lucy's eyes flutter open. 'He comes at night,' she whispers. 'So handsome. So kind. He says he loves me.' Her eyes close again."
      },
      {
        id: "check_window",
        label: "Check the window latch and garlic on the sill",
        keywords: [
          "window",
          "latch",
          "garlic",
          "sill",
          "open",
          "check"
        ],
        discovery: "The window latch has been forced — carefully, from outside. The garlic is wilted and brown, as if exposed to extreme heat. In the soft earth beneath the window, you find footprints — too long, too narrow. The heel marks are deep but the toe marks barely dent the soil, as if the creature was walking on its heels."
      },
      {
        id: "talk_to_seward",
        label: "Ask Dr. Seward about Lucy's nightly visitors",
        keywords: [
          "seward",
          "ask",
          "visitor",
          "night",
          "who",
          "comes"
        ],
        discovery: "You approach Dr. Seward carefully. 'Doctor, have you noticed anything unusual about Lucy's visitors? Anyone coming at night?' Seward's face tightens. 'I've posted a nurse. She reports nothing. But Lucy's condition worsens every morning.' He lowers his voice. 'Between us — I've found marks on the window frame. Scratches. From outside.' He looks haunted. 'What kind of animal scratches a second-story window?'"
      },
      {
        id: "consult_van_helsing",
        label: "Pull Van Helsing aside and share your suspicions",
        keywords: [
          "van helsing",
          "suspect",
          "vampire",
          "pull",
          "aside",
          "tell"
        ],
        discovery: "You pull Van Helsing aside into the corridor. 'Professor, those marks on her throat — they're not insect bites.' Van Helsing's eyes bore into yours. 'No,' he says quietly. 'They are not.' He glances back at Lucy's door. 'I have seen this before. In my country. In the old stories.' He grips your arm. 'We must watch tonight. You and I. And we must bring...' He hesitates, then whispers: 'Garlic. Crucifixes. Holy water.' His face is grim. 'If I am right, we will need them all.'"
      }
    ],
    exitAction: "leave_lucy",
    exitLabel: "Leave Lucy's room to prepare for tonight",
    hardExitNarration: "Van Helsing catches your arm at the door. 'Tonight,' he whispers. 'We watch. We guard. And we see what comes for her.' His eyes are grim.",
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
        "lucy",
        "seward"
      ],
      established: [
        "Lucy is pale and weakening",
        "bite marks on Lucy throat",
        "window latch scratched from outside"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "castle dracula",
        "transylvania"
      ]
    }
  },
  scene_12: {
    sceneId: "scene_12",
    sceneName: "Renfield's Warning",
    description: "Dr. Seward's asylum is a grim building of red brick and iron bars. The corridors smell of carbolic soap and despair. Seward leads you to a private room.\n\n'Renfield is my most puzzling patient,' he explains. 'A gentleman who believes he can extend his life by consuming the life force of other creatures. He eats flies. Spiders. Birds.' Seward pauses. 'He has been agitated for weeks. Screaming about a Master who is coming.'\n\nRenfield sits in the corner, a thin man with wild grey hair and bright, sharp eyes. He looks up and his face breaks into a smile of madness and recognition. 'Ah,' he says. 'The one who escaped the castle. The Master told me you were coming.'",
    content: [
      {
        id: "ask_about_master",
        label: "Ask Renfield about his Master",
        keywords: [
          "master",
          "ask",
          "who",
          "renfield",
          "tell",
          "count"
        ],
        discovery: "Renfield leans forward. 'The Master is ancient. Older than the churches. He speaks to me — in dreams, in the spaces between breaths. He says the time is coming. The boxes are here. The earth is here. England will be his.' He catches a fly and eats it. 'He is grateful to those who serve him. But he is not grateful to those who oppose him. Ask Harker. Oh wait — you already have.'"
      },
      {
        id: "ask_about_lucy_renfield",
        label: "Ask if he knows about Lucy Westenra",
        keywords: [
          "lucy",
          "westenra",
          "ask",
          "know",
          "girl",
          "woman"
        ],
        discovery: "Renfield's eyes widen. Then he laughs — a wet, broken sound. \"Miss Westenra? Oh yes, I know about her. The Master's new pet.\" He licks his lips. \"She is not dead, you know. Not truly. She will rise, as he rises. The beautiful ones always do.\" He leans closer. \"Did you think you could save her with your little crosses and your prayers? The Master is patient. The Master always wins.\""
      },
      {
        id: "ask_about_weakness",
        label: "Ask how the Master can be stopped",
        keywords: [
          "stop",
          "kill",
          "weakness",
          "how",
          "defeat",
          "destroy"
        ],
        discovery: "For a moment, the madness drains from his face. 'Stopped? You cannot stop what has survived for five hundred years. But you can hurt him. Take his earth — the boxes, the soil he brought from home. Without it, he cannot rest. And a vampire without rest is like a fire without fuel.' He grabs your wrist. 'But do it soon. He knows you are here.'"
      },
      {
        id: "offer_compassion",
        label: "Speak to Renfield with kindness",
        keywords: [
          "kind",
          "compassion",
          "understand",
          "sympathy",
          "help"
        ],
        discovery: "You sit on the floor across from Renfield and speak to him as a human being. His eyes fill with tears. 'No one has spoken to me like that in years.' He reaches into his pocket. 'The schedule. The boxes arrive at Carfax by ship — the Vesta, from Varna. Three days from now. Be there when the ship docks.'"
      }
    ],
    exitAction: "leave_asylum",
    exitLabel: "Leave the asylum and get ready for the night watch",
    hardExitNarration: "As you leave, Renfield calls after you: 'Tell the Doctor to guard her tonight! He comes with the dark!' His voice follows you down the corridor.",
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
        "lucy",
        "seward",
        "renfield"
      ],
      established: [
        "met Renfield at asylum",
        "Renfield serves Dracula",
        "earth boxes arriving by ship",
        "Dracula has human servants"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "castle dracula",
        "transylvania"
      ]
    }
  },
  scene_13: {
    sceneId: "scene_13",
    sceneName: "The Night Watch",
    description: "The room is dark except for a single candle and moonlight through lace curtains. Lucy sleeps fitfully, her breathing shallow. You and Van Helsing sit on either side of the door, armed with crucifixes, garlic, and holy water.\n\nPast midnight. Then you hear it. A scratching at the window. The curtains billow inward. A bat clings to the frame, pressing against the glass with impossible strength. The latch bends. The window creaks open.\n\nVan Helsing thrusts the crucifix toward the window and the bat recoils. But it is not alone. The sky outside is alive with them — dozens of bats circling the house, pressing against every window.",
    content: [
      {
        id: "hold_ground",
        label: "Hold the crucifix toward the window",
        keywords: [
          "crucifix",
          "hold",
          "stand",
          "window",
          "guard",
          "protect"
        ],
        discovery: "The crucifix grows warm. The bats shriek and scatter. Then a voice from everywhere: 'Give her to me. She is mine. She has tasted of my blood and I of hers.' The voice is the Count's."
      },
      {
        id: "use_holy_water",
        label: "Splash holy water on the window frame",
        keywords: [
          "holy water",
          "splash",
          "window",
          "frame",
          "bless",
          "water"
        ],
        discovery: "You splash the holy water across the window frame. It sizzles on contact, steaming as if poured on hot iron. Outside, something shrieks — a bat, or not a bat — and the window cracks from top to bottom. The Count's voice comes from the darkness beyond: \"You delay the inevitable, child. The night is long, and I am eternal.\" The smell of burning fills the room."
      },
      {
        id: "check_lucy",
        label: "Rush to Lucy's bedside",
        keywords: [
          "lucy",
          "bed",
          "check",
          "side",
          "wake",
          "condition"
        ],
        discovery: "Lucy's eyes are open but she does not see you. She whispers: 'My love... my dark love... come to me...' Her hand reaches toward the window. On her throat, the bite marks are open, bleeding. She is calling to him."
      },
      {
        id: "fortify_room",
        label: "Place garlic at every opening",
        keywords: [
          "garlic",
          "place",
          "every",
          "window",
          "door",
          "chimney",
          "seal"
        ],
        discovery: "You stuff garlic into every crack and opening — the window frame, the door gap, the chimney. The smell is overwhelming, sharp and ancient. Through the walls, you hear scratching. Then silence. Then a low hiss, like air escaping a tomb. The garlic is holding. For now. You press your back against the wall and wait for dawn."
      }
    ],
    exitAction: "end_night_watch",
    exitLabel: "Wait until dawn breaks",
    hardExitNarration: "Dawn seeps through the curtains and the bats scatter. Van Helsing slumps in his chair. 'He will come again,' he says. 'And he will not stop until she is his — or she is dead.'",
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
        "lucy",
        "seward",
        "renfield"
      ],
      established: [
        "defended Lucy room at night",
        "Dracula attacked as bats",
        "Lucy called to Dracula in trance",
        "crucifix and holy water repelled attack"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "castle dracula",
        "transylvania"
      ]
    }
  },
  scene_14: {
    sceneId: "scene_14",
    sceneName: "Lucy's Death",
    description: "Three nights of watching. And still, Lucy Westenra dies.\n\nIt happens in the early morning of the fourth day. Lucy opens her eyes — clear, blue, lucid — and smiles at Seward. 'John,' she whispers. 'My dear John.' Then her hand goes limp. Her chest stops moving.\n\nSeward screams. Van Helsing crosses himself. You stand frozen, watching the color drain from Lucy's face, watching the wounds on her throat close and seal as if they had never been.\n\nVan Helsing speaks first. 'She will rise,' he says. 'In three days, she will rise. And she will not be Lucy anymore. We must be ready.'",
    content: [
      {
        id: "comfort_seward",
        label: "Put a hand on Seward's shoulder",
        keywords: [
          "seward",
          "comfort",
          "shoulder",
          "hand",
          "grief"
        ],
        discovery: "Seward rounds on you, eyes wild with grief. 'Don't tell me she's at peace.' Then his fury collapses and he is just a young man who has lost the woman he loved. Van Helsing kneels beside him. 'I am sorry, my boy. But what will rise is a monster wearing her face.'"
      },
      {
        id: "agree_with_van_helsing",
        label: "Tell Seward that Van Helsing is right",
        keywords: [
          "right",
          "seen",
          "coffin",
          "castle",
          "agree",
          "true"
        ],
        discovery: "You turn to Seward. 'He's right, John. I've seen what sleeps in those coffins. I've seen the sisters. What rises from that grave will not be Lucy.' Seward's face crumbles. He knows. He has known since the bite marks appeared. But hearing it spoken aloud — confirmed by someone who has witnessed the horror firsthand — breaks something in him. He nods slowly, his jaw tight. 'Then we do what must be done.'"
      },
      {
        id: "examine_lucy_body",
        label: "Examine Lucy's body — note the healed wounds",
        keywords: [
          "examine",
          "body",
          "wound",
          "healed",
          "throat"
        ],
        discovery: "The bite marks are gone — not faded, but sealed as if they never existed. Her skin has a flush that death should not permit. Her lips are red. And her hands have moved — clenched — as if something inside her is already restless."
      },
      {
        id: "prepare_funeral",
        label: "Help prepare for the funeral and the watch that must follow",
        keywords: [
          "funeral",
          "prepare",
          "watch",
          "burial",
          "tomb",
          "crypt"
        ],
        discovery: "Van Helsing lays out the tools on a cloth: a wooden stake, a mallet, garlic bulbs, a consecrated wafer, and a surgeon's saw. The implements of an execution disguised as a funeral. 'We have three days,' he says. 'The body must be watched. Day and night. Garlic around the coffin. Crucifixes at every entrance. And when she rises...' He cannot finish. Seward finishes for him, his voice hollow: 'We destroy her.' The word hangs in the air like smoke."
      }
    ],
    exitAction: "leave_mourning",
    exitLabel: "Leave the room and get ready for what comes next",
    hardExitNarration: "Van Helsing finds you in the corridor. 'Three days,' he says. 'Garlic, crucifixes, a stake of wood, and the courage to use them. Find a consecrated wafer. And a carpenter.'",
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
        "renfield"
      ],
      established: [
        "Lucy has died",
        "lucy (deceased)",
        "bite marks healed at death",
        "Van Helsing says she will rise as vampire"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "castle dracula",
        "transylvania"
      ]
    }
  }
}