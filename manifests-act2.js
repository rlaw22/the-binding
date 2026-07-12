module.exports = {
  scene_05: {
    sceneId: "scene_05",
    sceneName: "The Forbidden Wing",
    description: "The castle is silent during the day. The Count sleeps somewhere in the earth beneath the castle. The servants are gone. The halls echo with nothing but your footsteps and the distant crying of wind through broken shutters.\n\nYou find the wing by accident: a corridor that ends in a heavy oak door, bound with iron. The lock is old but strong. Scratch marks line the jamb — someone tried to get in. Or out. Behind the door, stone stairs descend into cold, stale air that smells of turned soil and something older — something sweet and wrong.\n\nThe forbidden wing opens into a low chamber. Four stone tombs line the walls, their lids carved with ancient symbols. Inside each one, not bodies but earth — rich, dark Transylvanian soil, packed tight as if someone sleeps in it nightly. Claw marks score the inside of one lid. Fresh.\n\nNear the entrance, a leather journal lies half-buried in dust. The name on the cover is nearly worn away, but you can make it out: JONATHAN HARKER.",
    content: [
      {
        id: "examine_coffins",
        label: "Examine the soil-filled tombs",
        keywords: [
          "coffin",
          "tomb",
          "soil",
          "earth",
          "examine",
          "inspect",
          "stone"
        ],
        discovery: "You lean over the nearest tomb and push your hand into the soil. It is warm — body-warm — and damp in a way that earth should not be inside a castle. Your fingers brush something hard beneath the surface. A fingernail. Long, yellowed, curled. You pull your hand back and wipe it on your clothes, but the feeling lingers. Someone — something — has been lying in this earth. Recently."
      },
      {
        id: "find_journal",
        label: "Pick up the leather journal in the dust",
        keywords: [
          "journal",
          "book",
          "leather",
          "dust",
          "read",
          "paper",
          "harker"
        ],
        discovery: "You blow the dust from the journal and open it carefully. The handwriting is steady at first — a young solicitor recording his journey. But as the pages turn, the writing grows jagged, desperate. 'He is not human. I have seen what sleeps in those coffins. I have seen the children in the courtyard — the ones with crimson lips. God help me.' The final entry is dated three months ago. It ends mid-sentence."
      },
      {
        id: "inspect_lock",
        label: "Study the iron lock and scratch marks",
        keywords: [
          "lock",
          "iron",
          "door",
          "scratch",
          "marks",
          "examine",
          "key"
        ]
      },
      {
        id: "listen_at_door",
        label: "Press your ear to the door and listen",
        keywords: [
          "listen",
          "ear",
          "door",
          "sound",
          "silence",
          "quiet"
        ],
        discovery: "You press your ear against the cold oak. At first, nothing. Then — a sound so faint you might have imagined it. Breathing. Slow, deep, rhythmic, coming from somewhere below the floor. It stops. A long silence. Then a voice, muffled by stone and earth, whispers a single word you cannot understand. The hair on your arms stands up."
      }
    ],
    exitAction: "leave_forbidden_wing",
    exitLabel: "Return upstairs before the Count wakes",
    hardExitNarration: "The light through the corridor windows is fading fast. Sunset is minutes away. You hear a sound from deep below — stone grinding on stone. A tomb lid opening. You run.",
    initialFacts: {
      items: [
        "crucifix",
        "jonathan journal"
      ],
      metNPCs: [
        "innkeeper",
        "dracula"
      ],
      established: [
        "explored the forbidden wing",
        "found coffins filled with earth",
        "found Jonathan Harker journal",
        "claw marks inside coffin lid"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "carfax abbey",
        "london",
        "lucy",
        "renfield"
      ]
    }
  },
  scene_06: {
    sceneId: "scene_06",
    sceneName: "The Three Sisters",
    description: "You wake in darkness. The fire in your chamber has died to embers. The window is open — you are certain you closed it — and a cold wind carries the scent of flowers that should not bloom in winter. Something is wrong with the shadows in the corner of the room. They are deeper than they should be. They are moving.\n\nThree women materialize from the darkness like smoke given form. They are beautiful — achingly, impossibly beautiful — with pale skin and crimson lips and eyes that burn like embers. They wear gowns of white that seem to float around them. Their smiles are hungry.\n\n'See,' whispers the first, her voice like silk drawn over a blade. 'He is young.' The second reaches toward your face with fingers that are ice-cold. 'And so warm,' she breathes. The third says nothing. She just watches, her smile wider than the others, and there is something wrong with her teeth.\n\nYou press the crucifix to your chest and they recoil — hissing, snarling, their beauty cracking to reveal something ancient and terrible beneath. But the crucifix is fading. The metal grows hot in your hand. They are testing it. Testing you.",
    content: [
      {
        id: "hold_crucifix",
        label: "Press the crucifix toward the nearest sister",
        keywords: [
          "crucifix",
          "cross",
          "hold",
          "press",
          "ward",
          "protect"
        ],
        discovery: "You thrust the crucifix forward and the nearest sister screams — a sound that is not human, not animal, but something that has no right to come from a beautiful mouth. Her skin blisters where the shadow of the cross falls. But the other two are behind you now. Cold hands grip your shoulders. The crucifix glows white-hot and you nearly drop it. It is working — but it will not last."
      },
      {
        id: "fight_sisters",
        label: "Grab the iron poker from the fireplace and fight",
        keywords: [
          "fight",
          "iron",
          "poker",
          "fireplace",
          "grab",
          "attack",
          "strike",
          "weapon"
        ]
      },
      {
        id: "call_for_dracula",
        label: "Shout for the Count",
        keywords: [
          "count",
          "dracula",
          "shout",
          "call",
          "help",
          "scream"
        ],
        discovery: "You shout the Count's name and the effect is immediate. The three sisters freeze. Their heads snap toward the door in perfect unison. The Count stands in the doorway, his face a mask of cold fury. But the fury is not directed at the sisters — it is directed at you. 'Did I not say the forbidden wing was dangerous?' he says softly. The sisters bow their heads. 'Master,' the first whispers. 'We were hungry.' The Count turns his gaze on you. 'These are my daughters,' he says. 'And you are in their home. I suggest you remember that.'"
      },
      {
        id: "flee_the_room",
        label: "Run for the corridor",
        keywords: [
          "run",
          "flee",
          "escape",
          "door",
          "corridor",
          "hallway"
        ]
      }
    ],
    exitAction: "survive_sisters",
    exitLabel: "Escape through the door the Count left open",
    hardExitNarration: "The Count draws the sisters away with a single gesture. 'Go,' he says to you, without looking back. 'Sleep in the great hall tonight. Lock the door. Do not come upstairs again after dark.' His voice carries the weight of command that is older than language.",
    initialFacts: {
      items: [
        "crucifix",
        "jonathan journal"
      ],
      metNPCs: [
        "innkeeper",
        "dracula"
      ],
      established: [
        "met the three vampire sisters",
        "Dracula calls them his daughters",
        "crucifix repels vampires but grows weaker",
        "forbidden wing has coffins with earth"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "carfax abbey",
        "london"
      ]
    }
  },
  scene_07: {
    sceneId: "scene_07",
    sceneName: "Jonathan's Journal",
    description: "In the grey light of dawn, with the Count sleeping below and the sisters retreated to whatever darkness they call home, you sit in the great hall and open Jonathan Harker's journal. The fire has been rekindled by some unseen servant. The hall is warm but you cannot stop shaking.\n\nThe journal tells a story that matches your own — Harker arrived at this castle as a solicitor, charmed by the Count, welcomed as a guest. But slowly, horrifyingly, he discovered the truth. The Count is not merely eccentric. He is centuries old. He feeds on the living. He sleeps in coffins filled with Transylvanian earth. He has no reflection because he has no soul.\n\nHarker's notes grow meticulous in their desperation. He catalogues the Count's weaknesses: crucifixes, garlic, holy water. Sunlight does not destroy him but weakens him terribly. A stake through the heart will immobilize him. Decapitation will end him.\n\n'The Count has purchased property in England. Carfax Abbey, near London. He intends to move there — to bring his coffins, his earth, his brides. He means to spread his kind to England. This must not happen.'",
    content: [
      {
        id: "read_weaknesses",
        label: "Study the section on vampire weaknesses",
        keywords: [
          "weakness",
          "weaknesses",
          "study",
          "read",
          "vampire",
          "how",
          "kill",
          "destroy"
        ],
        discovery: "You turn to the section Harker titled 'THE CREATURE'S NATURE'. He writes: 'Crucifixes cause pain and retreat. Garlic burns the flesh. Holy water is acid to them. But these are merely deterrents. To destroy one: stake the heart, pin it to the earth. Then decapitate. Then fill the mouth with garlic. There is no other way.'"
      },
      {
        id: "study_map",
        label: "Examine the map of Carfax Abbey",
        keywords: [
          "map",
          "carfax",
          "abbey",
          "london",
          "property",
          "examine",
          "draw"
        ],
        discovery: "Harker has drawn a rough map of Carfax Abbey. The building sits on a hill near the Thames, surrounded by dense trees. He marked: the chapel (sealed), the cellar (where the Count stores his earth boxes), a tunnel connecting to the river, and — circled in red — a room labeled 'DO NOT ENTER.' Below: 'Find the earth boxes and destroy them. Without his native soil, the Count cannot rest. Without rest, he can be killed.'"
      },
      {
        id: "read_entries",
        label: "Read the earlier journal entries in order",
        keywords: [
          "entries",
          "earlier",
          "read",
          "beginning",
          "start",
          "journal",
          "diary"
        ]
      },
      {
        id: "copy_notes",
        label: "Tear out the key pages and keep them",
        keywords: [
          "tear",
          "pages",
          "keep",
          "copy",
          "take",
          "pocket",
          "notes"
        ]
      }
    ],
    exitAction: "close_journal",
    exitLabel: "Close the journal and plan your escape",
    hardExitNarration: "The shadows are growing longer. The Count will wake soon. You cannot be here when he does. You tuck the journal inside your coat and move toward the window.",
    initialFacts: {
      items: [
        "crucifix",
        "jonathan journal"
      ],
      metNPCs: [
        "innkeeper",
        "dracula",
        "jonathan harker"
      ],
      established: [
        "read Harker journal",
        "know Dracula weaknesses",
        "Dracula bought Carfax Abbey in England",
        "earth boxes are key to his power"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "london",
        "carfax abbey exterior"
      ]
    }
  },
  scene_08: {
    sceneId: "scene_08",
    sceneName: "Escape from the Castle",
    description: "The sun is setting. You have minutes, not hours. The Count will rise with the last light, and when he finds you gone — with the journal — there will be no charm in his welcome, no wine in his cup. Only fury.\n\nThe courtyard is a hundred feet below your window. The walls are ancient stone, cracked by centuries of frost, with enough handholds to make the climb possible — barely. Your fingers are raw before you've descended ten feet. The wind tears at you, carrying the first howls of the wolves. They know. Somehow, they know you are fleeing.\n\nBelow, the courtyard gate hangs open. Beyond it, the mountain path descends into a forest so dark the trees seem to absorb the fading light. You can hear the wolves gathering — not one or two, but a pack, circling the base of the castle like grey shadows.",
    content: [
      {
        id: "climb_down",
        label: "Climb down the castle wall",
        keywords: [
          "climb",
          "wall",
          "down",
          "descend",
          "window",
          "stone",
          "handholds"
        ]
      },
      {
        id: "dodge_wolves",
        label: "Sprint through the wolf pack toward the tree line",
        keywords: [
          "sprint",
          "run",
          "wolves",
          "wolf",
          "pack",
          "tree",
          "forest",
          "flee"
        ],
        discovery: "You run. The wolves are startled — you are halfway across the clearing before they react. The crucifix is in your hand, blazing warmth, and the nearest wolf veers away with a yelp. For a moment, the pack scatters. Then they regroup behind you, howling, following, but keeping their distance. The crucifix is holding them. Barely."
      },
      {
        id: "find_path",
        label: "Search for the mountain path through the trees",
        keywords: [
          "path",
          "mountain",
          "forest",
          "search",
          "find",
          "trail",
          "descend"
        ]
      },
      {
        id: "use_journal",
        label: "Follow Harker's escape route from the journal",
        keywords: [
          "harker",
          "journal",
          "escape",
          "route",
          "follow",
          "map",
          "notes"
        ]
      }
    ],
    exitAction: "reach_mountain_path",
    exitLabel: "Plunge into the dark forest and run",
    hardExitNarration: "The castle door crashes open below. You do not look back. You run into the forest, branches tearing at your clothes, the wolves behind you and the darkness ahead, and you do not stop until the castle is a silhouette against the sky and the howling has faded to nothing.",
    initialFacts: {
      items: [
        "crucifix",
        "jonathan journal"
      ],
      metNPCs: [
        "innkeeper",
        "dracula",
        "jonathan harker"
      ],
      established: [
        "escaped Castle Dracula",
        "climbed down the walls",
        "wolves pursued but crucifix held them",
        "took Harker journal"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "london",
        "carfax abbey",
        "lucy",
        "renfield"
      ]
    }
  },
  scene_09: {
    sceneId: "scene_09",
    sceneName: "The Wilderness",
    description: "The Carpathian wilderness is a labyrinth of frozen streams, dead trees, and mist. You have been walking for hours — or days, you cannot tell. Your clothes are torn, your hands are bleeding, and the crucifix in your pocket has gone cold. Dead cold. Its power spent.\n\nThe mountains are behind you now. Ahead, the land levels out into a valley where a thin thread of smoke rises from a cluster of buildings — a monastery, ancient and squat, surrounded by a stone wall. Iron bells hang in a tower above the gate. The sound of chanting drifts through the frozen air.\n\nYou are alive. You escaped Castle Dracula. The journal is safe inside your coat. But the knowledge it contains burns hotter than the crucifix ever did. The Count is coming to England.",
    content: [
      {
        id: "approach_monastery",
        label: "Walk toward the monastery gate",
        keywords: [
          "monastery",
          "gate",
          "approach",
          "walk",
          "enter",
          "door",
          "wall"
        ]
      },
      {
        id: "rest_by_stream",
        label: "Rest by the frozen stream and catch your breath",
        keywords: [
          "rest",
          "stream",
          "water",
          "sit",
          "catch",
          "breath",
          "recover"
        ],
        discovery: "You sit on a rock by the frozen stream and try to stop shaking. You pull out the journal and check it is still intact. The pages are damp but readable. As you tuck it back, you notice something in the stream bed: a small wooden cross, half-buried in ice. Someone dropped it here — a traveler who prayed and then kept walking. You pick it up. A reminder that faith exists outside of vampires and castles and darkness."
      },
      {
        id: "read_journal_again",
        label: "Re-read the key passages from Harker's journal",
        keywords: [
          "read",
          "journal",
          "harker",
          "key",
          "passage",
          "carfax",
          "weakness"
        ]
      },
      {
        id: "plan_next_move",
        label: "Think about what you learned and plan your next move",
        keywords: [
          "plan",
          "think",
          "next",
          "england",
          "london",
          "carfax",
          "strategy"
        ]
      }
    ],
    exitAction: "enter_monastery",
    exitLabel: "Approach the monastery and seek help",
    hardExitNarration: "The monastery gate opens at your knock. A monk takes one look at you — torn clothes, bleeding hands, wild eyes — and pulls you inside without a word. The gate closes behind you. For the first time since Bistritz, you are safe. But safety is temporary. England is waiting.",
    initialFacts: {
      items: [
        "crucifix",
        "jonathan journal",
        "wooden cross"
      ],
      metNPCs: [
        "innkeeper",
        "dracula",
        "jonathan harker"
      ],
      established: [
        "escaped through Carpathian wilderness",
        "reached a monastery",
        "crucifix power is spent",
        "know Dracula plans to move to England"
      ]
    },
    locationKeywords: {
      banned: [
        "the inn",
        "bistritz",
        "coach ride",
        "castle dracula",
        "carfax abbey",
        "london",
        "lucy",
        "renfield"
      ]
    }
  }
};
