/**
 * threat-encounters.js — All 21 threat definitions across 3 adventures
 *
 * Dracula (8 threats):  scenes 02, 03, 06, 08, 13, 14, 17, 23
 * Frankenstein (6):     scenes 04, 05, 06, 13, 15, 18, 20
 * Holmes (7):           scenes 07, 09, 12, 16, 17, 18, 19
 *
 * Each threat defines: id, adventure, scene, name, description, tags,
 * unbypassable flag, outcomes per reaction, class modifiers, required items,
 * and penalty flags set by bad outcomes.
 */

var ThreatEncounters = (function() {
  'use strict';

  // ─── DRACULA THREATS (8) ───────────────────────────────────────────

  var dracula = [
    {
      id: 'dr_wolves',
      adventure: 'dracula',
      scene: 2,
      name: 'Wolf Pack',
      description: 'The carriage is surrounded. Yellow eyes gleam in the treeline and the horses scream as wolves close in.',
      tags: ['physical', 'beast'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 3, coins: 2, text: 'You slash at the wolves. They scatter, but not before raking your arm.' },
        defend:  { damage: 1, coins: 1, text: 'You shelter behind the carriage door. The wolves lose interest as the driver whips the horses forward.' },
        run:     { damage: 0, coins: 0, text: 'You slam the carriage door and the driver cracks the whip. The wolves fall behind.' }
      },
      classModifiers: {
        fighter: { fight: { damage: 1, bonusCoins: 1, text: 'Your blade finds flesh twice. The alpha retreats with a yelp.' } },
        cleric:  { defend: { damage: 0, text: 'Your holy symbol flares. The wolves cower and slink into the forest.' } }
      }
    },
    {
      id: 'dr_wolves_ambush',
      adventure: 'dracula',
      scene: 3,
      name: 'Wolves at the Gate',
      description: 'The wolves have followed to Borgo Pass. They surge toward the lead horse, bringing it down. You must act now.',
      tags: ['physical', 'beast'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 4, coins: 3, text: 'A desperate melee. You save the driver but take deep scratches across your ribs.' },
        defend:  { damage: 2, coins: 1, text: 'You pull the driver behind the wreckage. The wolves feast on the fallen horse.' },
        run:     { damage: 1, coins: 0, text: 'You sprint toward the distant lights of the inn. The wolves are occupied with the kill.' }
      }
    },
    {
      id: 'dr_sisters',
      adventure: 'dracula',
      scene: 6,
      name: 'The Brides of Dracula',
      description: 'Three pale figures glide from the shadows of the castle crypt. Their lips are crimson. They whisper your name.',
      tags: ['undead', 'supernatural'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 5, coins: 4, text: 'You drive them back with fire and blade, but their nails rake deep furrows in your flesh.' },
        defend:  { damage: 3, coins: 1, text: 'You press a crucifix forward. They hiss and recoil, but one bites your shoulder.' },
        run:     { damage: 2, coins: 0, text: 'You flee up the stone stairs. Their laughter follows. One grabs your ankle as you escape.' }
      },
      classModifiers: {
        cleric: { fight: { damage: 2, coins: 6, text: 'Your holy symbol burns white-hot. The sisters shriek and dissolve into mist.' },
                  run:   { damage: 0, text: 'Your faith shields you. They cannot cross the threshold you sanctify.' } },
        rogue:  { run: { damage: 0, coins: 1, text: 'You melt into the shadows. From the corridor, you pocket a silver locket.' } }
      }
    },
    {
      id: 'dr_escape',
      adventure: 'dracula',
      scene: 8,
      name: 'The Castle Escape',
      description: 'Dracula knows you are fleeing. The corridors shift and twist. Behind you, footsteps — unhurried, inevitable.',
      tags: ['supernatural', 'undead'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 4, coins: 2, text: 'You smash through a locked door. The fall from the wall leaves you bruised but free.' },
        defend:  { damage: 2, coins: 0, text: 'You hide in a crypt until dawn. The cold seeps into your bones.' },
        run:     { damage: 1, coins: 1, text: 'You find a servant passage and sprint. The exit opens onto the mountainside.' }
      },
      classModifiers: {
        rogue: { run: { damage: 0, coins: 3, text: 'You find a hidden cache near the exit — coins and a crossbow bolt.' } },
        mage:  { defend: { damage: 0, text: 'Arcane ward. You sleep untouched in the crypt until sunrise.' } }
      }
    },
    {
      id: 'dr_ship_dead',
      adventure: 'dracula',
      scene: 13,
      name: "Ship's Dead",
      description: 'Something moves in the cargo hold. The crew is missing. A body lies in the rigging, throat torn open.',
      tags: ['undead', 'supernatural'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 4, coins: 3, text: 'You confront the vampire in the hold. It dissolves into mist, but not before slashing your chest.' },
        defend:  { damage: 2, coins: 1, text: 'You barricade the hold. The creature feeds on the remaining crew instead.' },
        run:     { damage: 0, coins: 0, text: 'You seal the hatch and retreat to the upper deck. The screaming below stops.' }
      },
      classModifiers: {
        cleric: { fight: { damage: 1, coins: 5, text: 'Turn Undead. Your holy word forces the creature into the sea.' } }
      }
    },
    {
      id: 'dr_storm_landing',
      adventure: 'dracula',
      scene: 14,
      name: 'Storm Landing',
      description: 'The ship runs aground at Whitby. A massive dog leaps from the wreck and vanishes into the storm.',
      tags: ['supernatural', 'physical'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 3, coins: 2, text: 'You chase the creature through the storm. It leads you into a churchyard where it turns on you.' },
        defend:  { damage: 1, coins: 1, text: 'You secure the wreck and wait for dawn. The creature is long gone.' },
        run:     { damage: 0, coins: 0, text: 'You find shelter in Whitby. The creature escapes into the moors.' }
      }
    },
    {
      id: 'dr_szgany',
      adventure: 'dracula',
      scene: 17,
      name: 'The Szgany',
      description: "Dracula's gypsy servants block the mountain road. They carry boxes of Transylvanian earth — and they will die to protect them.",
      tags: ['npc', 'physical'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 4, coins: 3, text: 'A brutal skirmish. You break through, but a knife catches your leg.' },
        defend:  { damage: 2, coins: 1, text: 'You wait for them to pass. They move toward the castle with their cargo.' },
        run:     { damage: 0, coins: 0, text: 'You circle wide through the forest. The delay costs you precious hours.' }
      },
      classModifiers: {
        rogue:   { run: { damage: 0, coins: 2, text: 'You slip past and lift a coin purse from the rearguard.' } },
        fighter: { fight: { damage: 2, bonusCoins: 2, text: 'Your power strike shatters their formation. They scatter.' } }
      }
    },
    {
      id: 'dr_final_boss',
      adventure: 'dracula',
      scene: 23,
      name: "Dracula's Lair",
      description: 'He waits in the great hall, seated on a throne of bones. The Count rises. His eyes are ancient fire. "You have come far to die."',
      tags: ['undead', 'supernatural'],
      unbypassable: true,
      outcomes: {
        fight:   { damage: 6, coins: 8, text: 'The battle is savage. You drive a stake through his heart. The castle shakes as centuries of darkness shatter.' },
        defend:  { damage: 4, coins: 2, text: 'You hold him at bay with crosses and garlic. He retreats deeper into the castle.' },
        run:     { damage: 3, coins: 0, text: 'He catches you at the door. A backhand sends you flying. You crawl into the crypt.' }
      },
      classModifiers: {
        cleric:  { fight: { damage: 3, coins: 12, text: 'Divine fire. Your prayer ignites the holy ground beneath him. Dracula burns.' } },
        fighter: { fight: { damage: 4, coins: 10, text: 'Your blade meets his throat. The Count crumbles to ash.' } }
      },
      requiredItem: 'stake_and_hammer'
    }
  ];

  // ─── FRANKENSTEIN THREATS (6) ──────────────────────────────────────

  var frankenstein = [
    {
      id: 'fr_creation_1',
      adventure: 'frankenstein',
      scene: 4,
      name: 'The Spark of Life',
      description: 'The creature stirs on the slab. Galvanic coils crackle. Its eyes open — yellow, wet, alive. Victor collapses.',
      tags: ['supernatural', 'physical'],
      unbypassable: true,
      outcomes: {
        fight:   { damage: 3, coins: 2, text: 'You grab a scalpel. The creature swats you aside like paper and crashes through the wall.' },
        defend:  { damage: 1, coins: 1, text: 'You shield Victor with your body. The creature stumbles past, confused and afraid.' },
        run:     { damage: 0, coins: 0, text: 'You flee the laboratory. The creature escapes into the night, leaving destruction behind.' }
      },
      classModifiers: {
        mage: { defend: { damage: 0, text: 'Arcane Shield absorbs the creature\'s panicked energy. It pauses, then lumbers away.' } }
      }
    },
    {
      id: 'fr_creation_2',
      adventure: 'frankenstein',
      scene: 5,
      name: 'The Creature Returns',
      description: 'Two nights later, heavy footsteps on the stairs. The door splinters. It stands in the doorway, rain streaming down its scarred face.',
      tags: ['physical', 'npc'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 4, coins: 3, text: 'You drive it back with a fire poker. It howls and retreats, but your arm is dislocated.' },
        defend:  { damage: 2, coins: 1, text: 'You speak calmly. It hesitates, then vanishes into the storm. The night is silent again.' },
        run:     { damage: 1, coins: 0, text: 'You escape through the window. The fall bruises your ankles.' }
      },
      classModifiers: {
        rogue:  { run: { damage: 0, coins: 1, text: 'Shadow Step. You slip past it in the dark hallway. It never sees you.' } },
        cleric: { defend: { damage: 0, text: 'Your calm prayer soothes the creature. It weeps and leaves without violence.' } }
      }
    },
    {
      id: 'fr_creation_3',
      adventure: 'frankenstein',
      scene: 6,
      name: 'Laboratory Ruins',
      description: 'Victor\'s laboratory is destroyed. Equipment lies shattered. On the wall, scratched in chalk: "REMEMBER THAT I AM THY CREATION."',
      tags: ['physical'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 2, coins: 2, text: 'You search the wreckage and fight off rats to recover useful chemicals.' },
        defend:  { damage: 0, coins: 1, text: 'You catalogue the damage carefully, noting what was taken.' },
        run:     { damage: 0, coins: 0, text: 'You leave the ruins untouched. Whatever the creature wanted, it already has.' }
      }
    },
    {
      id: 'fr_de_lacey',
      adventure: 'frankenstein',
      scene: 13,
      name: 'De Lacey\'s Cottage',
      description: 'The blind old man has been talking to someone. His family is terrified. A massive figure crouches in the garden, watching.',
      tags: ['npc', 'physical'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 3, coins: 2, text: 'You confront the creature. It catches your fist and throws you into the fence.' },
        defend:  { damage: 1, coins: 1, text: 'You warn the De Lacey family and barricade the cottage. The creature watches from the woods.' },
        run:     { damage: 0, coins: 0, text: 'You retreat before the creature notices you. The De Laceys are on their own.' }
      },
      classModifiers: {
        rogue:  { run: { damage: 0, coins: 2, text: 'You slip away and find the creature\'s journal hidden in the hedge.' } },
        cleric: { defend: { damage: 0, text: 'You bless the threshold. The creature cannot cross it and eventually leaves.' } }
      }
    },
    {
      id: 'fr_confrontation',
      adventure: 'frankenstein',
      scene: 15,
      name: 'The Creature\'s Demand',
      description: 'It finds you on the mountain pass. "Make me a companion," it says, "or I will destroy everything you love."',
      tags: ['supernatural', 'npc'],
      unbypassable: true,
      outcomes: {
        fight:   { damage: 5, coins: 3, text: 'You attack. The creature is immensely strong. It breaks your ribs and pins you to the rock.' },
        defend:  { damage: 2, coins: 2, text: 'You negotiate. The creature listens, trembling with rage and loneliness.' },
        run:     { damage: 3, coins: 0, text: 'You flee down the mountain. It pursues, hurling stones. One catches your shoulder.' }
      },
      classModifiers: {
        rogue: { defend: { damage: 0, coins: 3, text: 'Silver Tongue. You promise nothing but buy time with honeyed words. It gives you a token of good faith.' } }
      }
    },
    {
      id: 'fr_clerval',
      adventure: 'frankenstein',
      scene: 18,
      name: 'Clerval\'s Murder',
      description: 'Henry Clerval lies dead in the inn. Victor screams. The landlord points at you. "Foreigners! Murderers!"',
      tags: ['npc', 'physical'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 3, coins: 0, text: 'You fight through the mob to escape. Clubs and fists rain down on you.' },
        defend:  { damage: 1, coins: 1, text: 'You demand a trial. The magistrate imprisons you but stops the mob.' },
        run:     { damage: 2, coins: 0, text: 'You vault a wall and run. Pursuit dogs track you for miles.' }
      },
      classModifiers: {
        rogue: { run: { damage: 0, coins: 0, text: 'Shadow Step. You vanish into the crowd and emerge on the docks.' } }
      }
    },
    {
      id: 'fr_wedding',
      adventure: 'frankenstein',
      scene: 20,
      name: 'Wedding Night',
      description: 'A scream from the bridal chamber. You burst in. Elizabeth lies motionless. At the window, the creature holds up Victor\'s ring.',
      tags: ['supernatural', 'physical'],
      unbypassable: true,
      outcomes: {
        fight:   { damage: 5, coins: 4, text: 'You grapple with the creature. It hurls you through the window. You land in the garden, broken.' },
        defend:  { damage: 3, coins: 2, text: 'You pull Elizabeth to safety. The creature watches, then disappears into the night.' },
        run:     { damage: 2, coins: 0, text: 'You flee the room. The creature pursues you down the corridor before vanishing.' }
      },
      classModifiers: {
        fighter: { fight: { damage: 3, bonusCoins: 2, text: 'Power Strike. Your blade catches its arm. The creature howls and drops the ring.' } },
        cleric:  { defend: { damage: 1, text: 'Divine Sense confirms Elizabeth still breathes. You stabilize her with a prayer.' } }
      }
    }
  ];

  // ─── HOLMES THREATS (7) ────────────────────────────────────────────

  var holmes = [
    {
      id: 'ho_howl',
      adventure: 'holmes',
      scene: 7,
      name: 'The Grimpen Howl',
      description: 'A blood-curdling howl rises from the moor. The horses bolt. In the fog, something massive moves — too large for any natural beast.',
      tags: ['beast', 'physical'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 3, coins: 2, text: 'You fire into the mist. The creature yelps and retreats, but its claws have raked your arm.' },
        defend:  { damage: 1, coins: 1, text: 'You shelter behind a tor. The howling passes. The creature moves on toward the village.' },
        run:     { damage: 0, coins: 0, text: 'You sprint for Merripit House. The howl follows but the creature does not.' }
      },
      classModifiers: {
        mage: { defend: { damage: 0, text: 'Reveal. Your spell traces the creature\'s path in phosphorescent light — it came from Baskerville Hall.' } }
      }
    },
    {
      id: 'ho_selden',
      adventure: 'holmes',
      scene: 9,
      name: 'The Convict',
      description: 'A gaunt figure blocks the path to the stone hut. Convict\'s clothes, wild eyes. He has a knife and nothing to lose.',
      tags: ['npc', 'physical'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 3, coins: 1, text: 'You wrestle the knife away. He bites your hand and escapes into the mire.' },
        defend:  { damage: 1, coins: 2, text: 'You offer bread. He snatches it and runs, dropping a crumpled letter in his haste.' },
        run:     { damage: 0, coins: 0, text: 'You circle around. He does not follow.' }
      },
      classModifiers: {
        rogue:  { defend: { damage: 0, coins: 3, text: 'Silver Tongue. You talk him down. He shares the letter willingly and tells you about Barrymore.' } },
        fighter: { fight: { damage: 1, coins: 2, text: 'Your strength ends the fight in seconds. He drops a useful letter in the struggle.' } }
      }
    },
    {
      id: 'ho_mire',
      adventure: 'holmes',
      scene: 12,
      name: 'The Grimpen Mire',
      description: 'The bog swallows everything. Your boot is sinking. The ground groans and bubbles. Another step wrong means death.',
      tags: ['physical', 'environment'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 2, coins: 0, text: 'You haul yourself out with brute force. Your boot is lost in the mire.' },
        defend:  { damage: 0, coins: 1, text: 'You spread your weight and crawl to solid ground. Careful, slow, alive.' },
        run:     { damage: 3, coins: 0, text: 'Panic. You lunge for the path. The bog sucks at your legs. You barely make it.' }
      },
      classModifiers: {
        rogue: { defend: { damage: 0, coins: 2, text: 'Shadow Step. You read the terrain like a map, finding hidden stepping stones. You also find a silver compass.' } }
      }
    },
    {
      id: 'ho_hound',
      adventure: 'holmes',
      scene: 16,
      name: 'The Hound',
      description: 'It erupts from the darkness — enormous, spectral, eyes blazing with phosphorescent fire. The Hound of the Baskervilles is real.',
      tags: ['beast', 'supernatural'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 5, coins: 4, text: 'You stand your ground. Its jaws close on your shoulder before you drive it back with your weapon.' },
        defend:  { damage: 2, coins: 1, text: 'You raise the torch. The creature hesitates, circling. Its glow flickers.' },
        run:     { damage: 1, coins: 0, text: 'You flee across the moor. The hound pursues but the rough terrain slows it.' }
      },
      classModifiers: {
        fighter: { fight: { damage: 3, bonusCoins: 2, text: 'Power Strike. You drive your weapon into its throat. The beast collapses, its glow fading.' } },
        mage: { defend: { damage: 0, text: 'Arcane Shield. Your barrier absorbs the phosphorescent attack. The hound recoils from your magic.' } }
      }
    },
    {
      id: 'ho_chase',
      adventure: 'holmes',
      scene: 17,
      name: 'Pursuit on the Moor',
      description: 'The hound is wounded but not dead. It limps toward the old mine shaft. If it reaches cover, it will recover. You must pursue or let it go.',
      tags: ['beast', 'physical'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 3, coins: 3, text: 'You chase it into the shaft. In the dark, you finish it off. Your reward: the mine is full of stolen goods.' },
        defend:  { damage: 1, coins: 1, text: 'You block the entrance with rubble. The creature starves in the dark.' },
        run:     { damage: 0, coins: 0, text: 'You let it go. Sir Henry will have to wait for another night.' }
      }
    },
    {
      id: 'ho_kill',
      adventure: 'holmes',
      scene: 18,
      name: 'The Stapleton Trap',
      description: 'Stapleton stands at the edge of the mire, rope in hand. Behind you, nets. "You know too much," he says.',
      tags: ['npc', 'physical'],
      unbypassable: false,
      outcomes: {
        fight:   { damage: 4, coins: 3, text: 'You charge. He\'s prepared — the net drops. You tear free but he slashes your arm.' },
        defend:  { damage: 2, coins: 1, text: 'You stall for time. Holmes arrives — you hear the whistle. Stapleton bolts.' },
        run:     { damage: 1, coins: 0, text: 'You dive into the mire rather than face him. The bog is kinder than his blade.' }
      },
      classModifiers: {
        rogue: { run: { damage: 0, coins: 1, text: 'Shadow Step. You vanish. Stapleton searches for you in the fog. You circle behind and pocket his notebook.' } }
      }
    },
    {
      id: 'ho_lair',
      adventure: 'holmes',
      scene: 19,
      name: "Stapleton's Lair",
      description: 'The abandoned tin mine reeks of decay. Bones litter the floor. In the deepest chamber, phosphorescent paint, dog chains, and a dead man.',
      tags: ['physical', 'npc'],
      unbypassable: true,
      outcomes: {
        fight:   { damage: 3, coins: 5, text: 'You search the lair thoroughly, fighting off rats. You recover the Baskerville fortune and proof of Stapleton\'s scheme.' },
        defend:  { damage: 1, coins: 3, text: 'You catalog the evidence. Holmes approves. The case is closed.' },
        run:     { damage: 2, coins: 0, text: 'The stench drives you out. The evidence is lost to the mire.' }
      },
      classModifiers: {
        cleric: { fight: { damage: 1, coins: 7, text: 'Divine Sense reveals a hidden compartment behind the bones — the original Baskerville will.' } },
        mage:   { defend: { damage: 0, coins: 5, text: 'Reveal. Your spell exposes hidden fingerprints and a map of Stapleton\'s escape route.' } }
      }
    }
  ];

  // ─── LOOKUP HELPERS ────────────────────────────────────────────────

  var _all = [].concat(dracula, frankenstein, holmes);
  var _index = {};
  _all.forEach(function(t) { _index[t.id] = t; });

  function getThreat(threatId) {
    return _index[threatId] || null;
  }

  function getThreatForScene(adventure, sceneNumber) {
    for (var i = 0; i < _all.length; i++) {
      if (_all[i].adventure === adventure && _all[i].scene === sceneNumber) {
        return _all[i];
      }
    }
    return null;
  }

  function getThreatsForAdventure(adventure) {
    return _all.filter(function(t) { return t.adventure === adventure; })
               .sort(function(a, b) { return a.scene - b.scene; });
  }

  function getAllThreats() {
    return _all.slice();
  }

  // ─── MODULE EXPORTS ────────────────────────────────────────────────

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      dracula: dracula, frankenstein: frankenstein, holmes: holmes,
      getThreat: getThreat, getThreatForScene: getThreatForScene,
      getThreatsForAdventure: getThreatsForAdventure, getAllThreats: getAllThreats
    };
  }
  if (typeof window !== 'undefined') {
    window.ThreatEncounters = {
      dracula: dracula, frankenstein: frankenstein, holmes: holmes,
      getThreat: getThreat, getThreatForScene: getThreatForScene,
      getThreatsForAdventure: getThreatsForAdventure, getAllThreats: getAllThreats
    };
  }

  return { dracula: dracula, frankenstein: frankenstein, holmes: holmes,
           getThreat: getThreat, getThreatForScene: getThreatForScene,
           getThreatsForAdventure: getThreatsForAdventure, getAllThreats: getAllThreats };
})();
