module.exports = {
  "scene_00": {
    "sceneId": "scene_00",
    "sceneName": "The Letter from Transylvania",
    "description": "The offices of Hawkins & Harker are quiet this late afternoon. The clerks have gone home, and only the scratching of your pen breaks the silence. The gas lamps cast a warm glow over the mahogany desks and legal ledgers. Outside, the London fog presses against the tall windows.\n\nOn your desk lies a letter from your senior partner, Mr. Hawkins. A new client — a Transylvanian nobleman — has purchased an estate in England: Carfax, near Purfleet. The arrangements are unusual. The client has written directly to you, Jonathan Harker, requesting that you travel to his remote castle to finalize the deed.\n\nMr. Hawkins has approved the journey. He presses a purse of gold into your hand and tells you to be careful in the East. His face is unusually grave.",
    "content": [
      {
        "id": "read_letter",
        "label": "Read the client's letter carefully",
        "keywords": [
          "letter",
          "read",
          "client",
          "nobleman",
          "instructions"
        ],
        "discovery": "The letter is written in excellent English, though the phrasing is occasionally archaic. The client, Count Dracula, asks that you arrive before the end of the month. He is precise about routes — take the diligence from Bistritz to the Borgo Pass, where his carriage will meet you. The letter closes: 'I pray that the wolves of my country do not trouble you.'"
      },
      {
        "id": "examine_seal",
        "label": "Examine the wax seal on the letter",
        "keywords": [
          "seal",
          "wax",
          "crest",
          "examine"
        ],
        "discovery": "The seal is deep crimson wax pressed with a coat of arms — a dragon coiled around a cross, with a Latin motto: 'Sanguis est vita.' Blood is life. The wax seems old, harder than modern sealing wax, and catches the light with a faint reddish glint."
      },
      {
        "id": "ask_about_destination",
        "label": "Ask Mr. Hawkins about Transylvania",
        "keywords": [
          "hawkins",
          "transylvania",
          "carfax",
          "ask"
        ],
        "discovery": "Mr. Hawkins removes his spectacles. 'Transylvania is remote, Jonathan. The Carpathians are wild country. And this Count — I have heard of the family. Old. Very old.' He forces a smile. 'Take your reference books. Learn some phrases. And for God's sake, don't arrive at the castle after dark.'"
      },
      {
        "id": "pack_documents",
        "label": "Gather the legal documents for Carfax",
        "keywords": [
          "documents",
          "deed",
          "pack",
          "legal"
        ],
        "discovery": "The surveyor's report on Carfax is thorough but strange — several pages describe the chapel as 'structurally sound but atmospherically oppressive.' The estate is surrounded by a high wall and the iron gate is rusted shut. No one has entered Carfax in living memory."
      }
    ],
    "exitAction": "prepare_journey",
    "exitLabel": "Begin preparations for the journey east",
    "hardExitNarration": "You leave the office as the lamplighter passes on Fleet Street. The fog swallows the buildings behind you. In three days you board the train for Vienna, then to Bistritz, and into the Carpathians. You try not to think about the wax seal. Sanguis est vita. Just an old family motto.",
    "initialFacts": {
      "items": [],
      "metNPCs": [
        "jonathan harker",
        "mr. hawkins"
      ],
      "established": [
        "Harker is a young London solicitor",
        "client is Count Dracula of Transylvania",
        "estate is Carfax near Purfleet"
      ]
    },
    "locationKeywords": {
      "banned": [
        "castle",
        "carpathians",
        "dracula"
      ],
      "valid": ["castle", "dracula", "great hall", "crypt", "tower", "courtyard", "carpathians", "mountain", "forest", "road", "pass"]
    },
    "storyMode": {
      "collectibleItem": {
        "id": "silver_crucifix",
        "label": "Silver Crucifix"
      },
      "badChoice": {
        "id": "open_coffin",
        "label": "Open the coffin",
        "consequence": "The lid scrapes back. Cold air spills out. Something shifts in the dark — then the hand locks around your wrist. The lesson lands before the pain: what is sealed was sealed for a reason.",
        "coinCost": 3,
        "flagSet": {
          "opened_coffin_early": true
        }
      },
      "isHealing": false,
      "explorePriority": [
        "read_letter",
        "examine_seal",
        "ask_about_destination"
      ]
    }
  },
  "scene_01": {
    "sceneId": "scene_01",
    "sceneName": "The Journey East",
    "description": "The train carries you through the heart of Europe — Paris, Strasbourg, Munich, Vienna — and the landscape grows wilder with each passing hour. The gentle green hills of France give way to the dark forests of Germany, and then to the brooding Carpathian foothills that line the horizon like sleeping giants.\n\nAt Bistritz you leave the railway. The innkeeper, a stout woman with worried eyes, prepares a room for you. When you mention your destination, her face drains of color. She presses a crucifix into your hand and whispers that you should not travel after dark. Her husband shakes his head but says nothing.\n\nThe phrasebook you purchased in Vienna is dog-eared and smeared. You practice the words: \"Unde vine? Unde mergeti?\" Where do you come from? Where are you going? Simple questions that suddenly feel enormous.",
    "content": [
      {
        "id": "study_phrasebook",
        "label": "Study the Romanian phrasebook",
        "keywords": [
          "phrasebook",
          "romanian",
          "study",
          "words",
          "language"
        ],
        "discovery": "The phrasebook is rudimentary but useful. Common greetings, directions, pleas for help. One phrase catches your eye: 'Nu va duceti acolo.' Do not go there. It is listed as a warning, not a phrase for travelers. Someone has underlined it in pencil."
      },
      {
        "id": "observe_landscape",
        "label": "Watch the mountains draw closer",
        "keywords": [
          "mountains",
          "landscape",
          "watch",
          "carpathians",
          "view"
        ],
        "discovery": "The Carpathians rise from the plain like a wall of dark stone. Their peaks are lost in cloud, and even in daylight the valleys between them are shadowed and cold. Forests of pine and beech climb their flanks, so dense that no light reaches the ground. You have never seen country so utterly wild."
      },
      {
        "id": "consult_map",
        "label": "Consult the map for the route to the Borgo Pass",
        "keywords": [
          "map",
          "route",
          "borgo",
          "pass",
          "consult"
        ],
        "discovery": "The map shows the road from Bistritz climbing steadily northeast through the Bargau Valley. The Borgo Pass is marked at the top — a narrow saddle between two peaks. Beyond it, the map shows only mountains and forest. The road to the pass is marked as 'impassable in winter.' It is late autumn."
      },
      {
        "id": "speak_to_locals",
        "label": "Ask the innkeeper about the Borgo Pass",
        "keywords": [
          "innkeeper",
          "locals",
          "ask",
          "borgo",
          "pass"
        ],
        "discovery": "The innkeeper wrings her hands. 'The Borgo Pass at night? In his carriage? God protect you, young sir.' She tells you that the wolves in the mountains have been unusually bold this season. Three shepherds have vanished. She crosses herself and adds, 'And the coachman — they say his horses are black as midnight and his face cannot be seen.'"
      }
    ],
    "exitAction": "depart_inn",
    "exitLabel": "Set out for the Borgo Pass at dawn",
    "hardExitNarration": "You rise before light. The innkeeper has left bread and cheese wrapped in cloth at your door, along with a small wooden crucifix and a note: 'For the love of God, keep this with you.' The morning is cold and grey, and the road to the mountains stretches before you like a dark ribbon. The diligence is waiting.",
    "initialFacts": {
      "items": [
        "wooden crucifix"
      ],
      "metNPCs": [
        "jonathan harker",
        "innkeeper"
      ],
      "established": [
        "Harker is in Bistritz, Transylvania",
        "locals fear the Borgo Pass",
        "a carriage from Count Dracula will meet him"
      ]
    },
    "locationKeywords": {
      "banned": [
        "castle",
        "dracula"
      ],
      "valid": ["castle", "dracula", "great hall", "crypt", "tower", "courtyard"]
    },
    "storyMode": {
      "collectibleItem": {
        "id": "garlic_braid",
        "label": "Garlic Braid"
      },
      "badChoice": {
        "id": "ignore_warnings",
        "label": "Ignore the villagers' warnings",
        "consequence": "You push past the advice and press on. The road narrows, the light dies, and shapes move in the trees. The warning was not superstition — it was geography, timing, and a world that punishes haste.",
        "coinCost": 3,
        "flagSet": {
          "ignored_locals": true
        }
      },
      "isHealing": false,
      "explorePriority": [
        "study_phrasebook",
        "observe_landscape",
        "consult_map"
      ]
    }
  },
  "scene_02": {
    "sceneId": "scene_02",
    "sceneName": "Borgo Pass",
    "description": "The road climbs steeply through a gorge. Pine forests close in on both sides, and the air grows colder. Your driver stops the diligence at the base of the pass and points upward — you must go on alone. The Borgo Pass is a narrow saddle between two peaks, and at its summit you see a lone figure standing beside a carriage.\n\nThen the wolves come.\n\nThey emerge from the treeline in silence — grey shapes moving through the dusk like smoke. Their eyes catch the last light. The driver cracks his whip and the horses scream, but the wolves are circling now, tightening the ring. You can hear them breathing. You can smell them.",
    "content": [
      {
        "id": "hold_torch_high",
        "label": "Hold your torch high to drive them back",
        "keywords": [
          "torch",
          "fire",
          "light",
          "hold",
          "drive",
          "wolves"
        ],
        "discovery": "The flames flare and the wolves flinch. Fire — they fear fire. You swing the torch in a wide arc and the nearest wolf yelps and retreats. But there are more now, circling, and the torch is burning low. You need to reach the carriage at the summit."
      },
      {
        "id": "call_for_help",
        "label": "Call out to the figure at the summit",
        "keywords": [
          "call",
          "help",
          "shout",
          "figure",
          "summit"
        ],
        "discovery": "Your voice echoes through the gorge. The figure at the summit raises one arm — a signal. The carriage begins to descend, its lamps cutting through the dark. But the wolves hear you too. They close in, teeth bared, and the nearest one lunges."
      },
      {
        "id": "fire_revolver",
        "label": "Draw your revolver and fire at the nearest wolf",
        "keywords": [
          "revolver",
          "fire",
          "shoot",
          "gun",
          "wolf"
        ],
        "discovery": "The shot cracks through the mountain air. The lead wolf drops and the pack scatters — but only for a moment. They are hungry, and the sound of the gun has only made them angrier. You have five rounds left."
      },
      {
        "id": "climb_tree",
        "label": "Scramble up the nearest pine tree",
        "keywords": [
          "climb",
          "tree",
          "pine",
          "escape",
          "up"
        ],
        "discovery": "You grab a low branch and haul yourself up. The bark tears at your hands. Below, the wolves snap at your boots. The branches are thin this high, and the tree sways in the mountain wind. You can see the carriage now — it is closer, its horses galloping. But you are exposed, and the wolves are patient."
      }
    ],
    "exitAction": "wolves_retreat",
    "exitLabel": "Race for the approaching carriage",
    "hardExitNarration": "The carriage arrives in a thunder of hooves. The driver — cloaked, face hidden — sweeps the wolves back with a crack of his whip and throws open the door. You leap inside. The door slams. The wolves howl outside, but the carriage is moving fast now, climbing toward the summit and the darkness beyond.",
    "initialFacts": {
      "items": [],
      "metNPCs": [
        "jonathan harker",
        "mysterious coachman"
      ],
      "established": [
        "wolves attacked at the Borgo Pass",
        "a mysterious carriage rescued Harker",
        "the coachman is faceless and silent"
      ]
    },
    "locationKeywords": {
      "banned": [
        "castle interior",
        "london"
      ],
      "valid": ["london", "exeter", "office", "hotel", "train"]
    },
    "storyMode": {
      "collectibleItem": {
        "id": "stake",
        "label": "Wooden Stake"
      },
      "badChoice": {
        "id": "take_shortcut",
        "label": "Take the dark shortcut",
        "consequence": "You cut into the shadowed passage and the ground gives way under wet leaves. The air turns sharp with animal musk. You learn the shape of the mistake only after you are inside it: shortcuts through unknown ground trade minutes for risk.",
        "coinCost": 3,
        "flagSet": {
          "took_dark_path": true
        }
      },
      "isHealing": false,
      "explorePriority": [
        "hold_torch_high",
        "call_for_help",
        "fire_revolver"
      ],
      "threat": "dr_wolves"
    }
  },
  "scene_03": {
    "sceneId": "scene_03",
    "sceneName": "The Carriage Ride",
    "description": "The carriage hurtles through the night at impossible speed. The windows are shuttered, but through the cracks you see nothing but darkness and the occasional flash of a gnarled tree trunk. The wheels barely seem to touch the road. Beside you, the cloaked figure sits in absolute silence — you cannot see his face beneath the hood.\n\nOutside, the wolves run alongside the carriage. You can hear their paws on the frozen ground, their panting breath. But they do not attack. They run like escorts, like servants attending their master. The moon breaks through the clouds and you catch a glimpse of the driver's hand on the reins — long fingers, unnaturally pale, the nails dark and sharp.\n\nThe carriage rounds a bend and suddenly the road ends at a massive iron gate. Beyond it, a dark shape looms against the mountain sky — towers, battlements, the jagged outline of an ancient castle. The wolves howl once and scatter into the forest.",
    "content": [
      {
        "id": "examine_driver",
        "label": "Try to see the face of the mysterious driver",
        "keywords": [
          "driver",
          "face",
          "examine",
          "coachman",
          "see"
        ],
        "discovery": "You lean forward and peer through the glass. The coachman turns — just slightly — and for one frozen instant you see the outline of a face: high cheekbones, a thin cruel mouth, eyes that burn like red coals in the lamplight. Then the hood falls back into shadow. Your heart is hammering."
      },
      {
        "id": "check_windows",
        "label": "Check if the carriage windows can be opened",
        "keywords": [
          "windows",
          "open",
          "check",
          "shutter",
          "escape"
        ],
        "discovery": "The shutters are fastened with iron bolts — old bolts, dark with rust, but solid. They cannot be opened from inside. You realize with a chill that this carriage is built to hold its passengers as much as carry them. The crucifix the innkeeper gave you feels warm against your chest."
      },
      {
        "id": "hold_cross",
        "label": "Grip the crucifix and pray",
        "keywords": [
          "crucifix",
          "pray",
          "cross",
          "hold",
          "faith"
        ],
        "discovery": "You clutch the wooden crucifix. It is warm — strangely warm, as if it holds a heat of its own. The cloaked figure beside you shifts, turning away. A low hiss escapes the darkness of its hood. You pray harder, and the carriage seems to slow, just slightly, as if your faith is a drag on its unholy speed."
      },
      {
        "id": "brace_yourself",
        "label": "Brace yourself as the carriage lurches to a stop",
        "keywords": [
          "brace",
          "stop",
          "halt",
          "gate",
          "arrive"
        ],
        "discovery": "The carriage wrenches to a halt with a scream of iron on stone. Through the cracks you see a massive gate, its bars twisted and dark. Beyond it, a courtyard of broken flagstones and the looming bulk of a castle that seems to grow out of the mountain itself. The door swings open and a hand — long-fingered, pale as bone — reaches in to help you out."
      }
    ],
    "exitAction": "enter_castle",
    "exitLabel": "Step out of the carriage into the castle courtyard",
    "hardExitNarration": "A voice — low, cultured, with the faintest accent — speaks from the darkness. \"Welcome to my house. Enter freely and of your own will.\" You step down from the carriage. The air is cold and thin, and the castle rises above you like a cliff face. The gate clangs shut behind you. The wolves are silent now. There is only the wind, and the vast dark patience of the castle.",
    "initialFacts": {
      "items": [],
      "metNPCs": [
        "jonathan harker",
        "count dracula"
      ],
      "established": [
        "Harker arrived at Castle Dracula",
        "the Count is unnaturally pale with sharp nails",
        "the carriage door cannot be opened from inside",
        "the wolves obey the coachman"
      ]
    },
    "locationKeywords": {
      "banned": [
        "london",
        "bistritz",
        "transylvania villages"
      ],
      "valid": ["london", "exeter", "office", "hotel", "train"]
    },
    "storyMode": {
      "collectibleItem": {
        "id": "harkers_journal",
        "label": "Harker's Journal"
      },
      "badChoice": {
        "id": "read_aloud",
        "label": "Read the strange text aloud",
        "consequence": "The syllables leave your mouth before you understand them. The lamplight narrows, the air thickens, and the carriage seems to lean toward the sound. The lesson arrives clean and cold: unknown words are not ornaments — they are keys, and some doors should stay closed.",
        "coinCost": 3,
        "flagSet": {
          "invoked_darkness": true
        }
      },
      "isHealing": true,
      "explorePriority": [
        "examine_driver",
        "check_windows",
        "hold_cross"
      ],
      "threat": "dr_wolves_ambush"
    }
  },
  "scene_04": {
    "sceneId": "scene_04",
    "sceneName": "Castle Dracula",
    "description": "The castle is vast and ancient — older than anything you have seen. The courtyard is paved with cracked flagstones, and the walls rise on all sides like the interior of a dark well. Towers spike upward against the stars. The air smells of stone and age and something faintly sweet, like decaying flowers.\n\nYour host stands framed in the great doorway, illuminated by a lamp held high. He is tall and thin, dressed in black from throat to ankle. His face is pale — deathly pale — with a high aquiline nose and a mouth drawn tight over teeth that are unusually sharp and white. His eyes are dark and burning, set beneath heavy brows. He looks old, impossibly old, yet his body is vital and strong.\n\n\"Welcome,\" he says. His voice is soft and precise. \"I am Dracula. And you, Mr. Harker — you are most welcome to my house.\"",
    "content": [
      {
        "id": "examine_exterior",
        "label": "Study the castle exterior before entering",
        "keywords": [
          "exterior",
          "castle",
          "walls",
          "towers",
          "examine"
        ],
        "discovery": "The castle clings to the cliff edge as if growing from the rock. Parts of the wall are crumbling — ancient stonework patched with newer blocks. No lights burn in the upper windows, but you see movement in the dark — shapes that vanish when you look directly at them. The courtyard well has no rope or bucket. Its mouth is dark and round, and when you listen, you hear nothing. The echo never comes back."
      },
      {
        "id": "enter_courtyard",
        "label": "Step into the courtyard",
        "keywords": [
          "courtyard",
          "enter",
          "step",
          "flagstones"
        ],
        "discovery": "The courtyard is a trap. You realize this as the gate closes behind you. The walls are too high to climb. The single doorway — where Dracula stands — is the only way in or out that you can see. Your footsteps echo off the ancient stone. Somewhere above you, a shutter bangs in the wind. Dracula watches you with those dark burning eyes, patient as a spider."
      },
      {
        "id": "greet_count",
        "label": "Greet Count Dracula formally",
        "keywords": [
          "greet",
          "count",
          "dracula",
          "formal",
          "introduce"
        ],
        "discovery": "You extend your hand and introduce yourself. Dracula takes it — his grip is strong, the skin cold as ice. \"I am glad to meet you face to face, Mr. Harker,\" he says. \"I have waited long for this.\" His accent is refined, old-world. His English is nearly perfect, but he occasionally uses words from another era — thee and thou, constructions that went out of fashion centuries ago."
      },
      {
        "id": "observe_surroundings",
        "label": "Look around the courtyard for signs of life",
        "keywords": [
          "surroundings",
          "life",
          "look",
          "courtyard",
          "signs"
        ],
        "discovery": "No servants are visible. No dogs bark. The courtyard is silent except for the wind and the distant sound of wolves — outside the walls now, their howls echoing from the mountains. In one corner you see a pile of old stone, perhaps from a collapsed tower. Among the rubble you catch the glint of metal — something sharp, buried in the debris. Dracula notices you looking and steps forward. \"Please,\" he says. \"Come inside. You must be tired from your journey.\""
      }
    ],
    "exitAction": "enter_castle_hall",
    "exitLabel": "Follow Dracula inside the castle",
    "hardExitNarration": "Dracula takes your bag himself — no servants appear — and leads you through the great door. The hall beyond is vast and dark, lit by a single candelabra that throws more shadows than light. The door closes behind you with a sound like a coffin lid. You are inside Castle Dracula. There is no way out that does not pass through the Count himself.",
    "initialFacts": {
      "items": [],
      "metNPCs": [
        "jonathan harker",
        "count dracula"
      ],
      "established": [
        "Harker is inside Castle Dracula",
        "the Count is unnaturally strong and pale",
        "no servants are visible",
        "the castle is isolated and the gate is shut"
      ]
    },
    "locationKeywords": {
      "banned": [
        "london",
        "bistritz",
        "purfleet"
      ],
      "valid": ["london", "exeter", "office", "hotel", "train"]
    },
    "storyMode": {
      "collectibleItem": {
        "id": "holy_water",
        "label": "Holy Water"
      },
      "badChoice": {
        "id": "touch_artifact",
        "label": "Touch the ancient artifact",
        "consequence": "Your fingers meet the surface and the cold climbs past skin into bone. The room seems to recede, then return, as if the object measured you before you measured it. The lesson is simple: not every object invites contact, and silence can be consent.",
        "coinCost": 3,
        "flagSet": {
          "touched_cursed_item": true
        }
      },
      "isHealing": false,
      "explorePriority": [
        "examine_exterior",
        "enter_courtyard",
        "greet_count"
      ]
    }
  }
};
