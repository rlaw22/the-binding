module.exports = {
  scene_05: {
    sceneId: 'scene_05',
    sceneName: 'Arrival at the Hall',
    description: `The drive from the station has wound through a landscape that grows darker with each mile — hedgerows giving way to open moor, the last traces of civilization swallowed by heather and granite. Now the carriage turns between two stone pillars, and Baskerville Hall rises before you like a fist clenched against the sky.

It is older than you expected. The main block is grey stone, blackened by centuries of rain and peat smoke, with a central tower that dates to the Tudors and wings added in later, less certain centuries. Ivy crawls up the façade like veins on an old man's hand. The windows are narrow — defensive, not decorative — and they catch the last of the daylight like flat, watchful eyes.

The front door opens before you knock. Barrymore stands in the threshold — tall, gaunt, immaculate in black, his face as expressionless as the stone behind him. Behind him, half-hidden in the shadows of the hall, his wife watches with red-rimmed eyes. Neither smiles.

Inside, the entrance hall is panelled in dark oak. Portraits line the walls — generations of Baskervilles staring down from heavy gilt frames. You notice one immediately: Hugo Baskerville, the subject of the legend. Long-nosed, dark-eyed, with a cruel mouth twisted into something between a sneer and a smile. The resemblance to someone you have recently met is striking — though you cannot yet place who.`,
    content: [
      {
        id: 'examine_portraits',
        label: 'Study the portraits of the Baskerville family',
        keywords: ['portrait', 'portraits', 'painting', 'wall', 'family', 'baskerville', 'examine', 'study'],
        discovery: 'The portraits span centuries. You trace the family features forward from Hugo — the long nose, the dark, deep-set eyes, the thin mouth — and find them recurring again and again, diluted but persistent. Then you reach a gap. A space on the wall where a portrait once hung, the wallpaper darker around the rectangle. Someone has been removed from the family record. Barrymore notices you looking and turns away quickly.'
      },
      {
        id: 'meet_barrymore',
        label: 'Greet Barrymore and ask about the household',
        keywords: ['barrymore', 'butler', 'greet', 'speak', 'talk', 'ask', 'household'],
        discovery: 'Barrymore is courteous but distant. He answers your questions with the precision of a man who has rehearsed his responses. "The Hall has been closed since Sir Charles\'s death, sir. My wife and I maintained it in readiness." When you ask about Sir Charles\'s final evening, his hand trembles — barely, but you notice. "He went for his customary walk on the moor, sir. He did not return." His wife makes a small sound from the doorway. Barrymore does not turn around.'
      },
      {
        id: 'inspect_hall',
        label: 'Examine the entrance hall and its architecture',
        keywords: ['hall', 'entrance', 'examine', 'architecture', 'stone', 'oak', 'panelled', 'dark'],
        discovery: 'The hall is older than it first appears. The oak panelling is Tudor, but the stone foundations beneath are medieval — you can see where the original arch has been partially blocked to create a doorway. A coat of arms hangs above the main staircase: a hound rampant on a field of azure, with the motto "Sanguine Baskerville" — the blood of the Baskervilles. The motto feels less like a boast and more like a warning.'
      },
      {
        id: 'notice_mrs_barrymore',
        label: 'Watch Mrs. Barrymore in the shadows',
        keywords: ['mrs', 'barrymore', 'wife', 'watch', 'notice', 'shadow', 'weep', 'cry'],
        discovery: 'Mrs. Barrymore stands half-concealed by the corridor that leads to the servants\' quarters. Her face is pale, her eyes swollen from weeping — not the fresh tears of sudden grief, but the chronic redness of someone who has cried every night for weeks. She catches your gaze and flinches, then composes herself with visible effort. "Welcome to Baskerville Hall, sir," she says. Her voice is steady, but her hands twist a handkerchief into knots behind her back.'
      }
    ],
    exitAction: 'explore_hall',
    exitLabel: 'Follow Barrymore to your chambers',
    hardExitNarration: 'Barrymore leads you up the main staircase, past more portraits, past windows that look out onto nothing but moor. "Supper will be at eight, sir," he says, and leaves you in a room where the fire has been lit but cannot quite drive out the cold.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: ['barrymore', 'sir_henry'],
      established: ['arrived at Baskerville Hall', 'the Hall is ancient and imposing', 'portraits line the walls', 'Mrs. Barrymore has been weeping', 'Hugo Baskerville portrait resembles someone']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'moor', 'mire', 'stone circle']
    }
  },
  scene_06: {
    sceneId: 'scene_06',
    sceneName: 'The Barrymores',
    description: `It is the third night at the Hall, and sleep will not come. The wind has been rising since dusk, driving rain against the windows in sheets that sound like fingers tapping on glass. The fire has burned low, and the room is full of shadows that shift and breathe with the drafts.

You have been lying awake for an hour when you hear it — a sound from somewhere in the house. Sobbing. Low, muffled, desperate. Mrs. Barrymore. The sound comes from the east wing, where the servants' quarters are, and it carries through the old walls with terrible clarity.

You rise and pull on your dressing gown. The corridor is dark, lit only by the faint glow of a single gas lamp at the far end. As you move toward the sound, you notice something else: a thin line of light beneath the door of the study at the end of the passage. Someone is in there. At two in the morning.

Through the keyhole, you see Barrymore standing at the window. He holds a candle — not a lamp, a candle — and he is moving it slowly back and forth in front of the dark glass. A signal. Out on the moor, invisible in the rain and darkness, something answers: a faint light, bobbing once, twice, then vanishing.

Barrymore extinguishes the candle and stands motionless at the window for a long time. The sobbing from the east wing continues.`,
    content: [
      {
        id: 'watch_signal',
        label: 'Watch Barrymore signal from the window',
        keywords: ['barrymore', 'candle', 'signal', 'window', 'watch', 'light', 'dark'],
        discovery: 'You press your eye to the keyhole and watch. Barrymore holds the candle steady at the window, then tilts it left — once, twice — then right — once. A pause. Then the same pattern again. From somewhere out on the moor, an answering light appears: a single point of orange, bobbing in the darkness. Left, left, right. The same pattern. Barrymore nods once, as if satisfied, then blows out the candle. The room goes dark. You hear his footsteps crossing the floor, and you retreat into the shadows just before the door opens.'
      },
      {
        id: 'confront_barrymore',
        label: 'Step out and confront Barrymore',
        keywords: ['confront', 'barrymore', 'step', 'accuse', 'question', 'demand', 'speak'],
        discovery: 'You step into the corridor and call his name. Barrymore freezes. For a long moment, he says nothing. Then, slowly, he turns. His face is grey, his eyes hollow. "I was not expecting company, sir," he says quietly. You ask who he is signalling. He shakes his head. "I cannot tell you that, sir. I gave my word." You press him. His jaw tightens. "It is a matter of family, sir. My wife\'s family. I beg you — do not ask me more. Not yet."'
      },
      {
        id: 'listen_to_sobbing',
        label: 'Move toward the sound of Mrs. Barrymore weeping',
        keywords: ['sobbing', 'weeping', 'crying', 'mrs', 'barrymore', 'wife', 'listen', 'sound', 'east'],
        discovery: 'You follow the sound through the dark corridor. It leads to a door at the end of the east wing — the Barrymores\' private quarters. Through the thin oak, you can hear Mrs. Barrymore\'s voice between the sobs, broken and desperate: "Oh, God help him... out there in the cold... if they catch him..." A man\'s voice — Barrymore\'s — murmurs something you cannot make out. The sobbing subsides to a low, continuous moan. Someone in this house is in terrible trouble, and the Barrymores are hiding it.'
      },
      {
        id: 'look_out_window',
        label: 'Go to the study window and look out at the moor',
        keywords: ['window', 'look', 'moor', 'dark', 'outside', 'study', 'search', 'light'],
        discovery: 'You slip into the study and go to the window. The rain has eased to a fine drizzle, and the moor stretches out before you — a vast, featureless darkness. You wait. After several minutes, you see it: a light, faint and distant, somewhere on the high ground to the southwest. It moves — not the steady glow of a farmhouse window, but a shifting, bobbing light, as if someone is walking across the moor with a lantern. It vanishes behind a tor, and does not reappear. Whatever Barrymore is communicating with, it is out there. Alone. In the dark.'
      }
    ],
    exitAction: 'return_to_bed',
    exitLabel: 'Go back to your room and think about what you have seen',
    hardExitNarration: 'You retreat to your room as Barrymore\'s footsteps approach the corridor. The sobbing has stopped. The house is silent again, except for the wind. You lie in the dark and listen to the rain, and you think about signals in the night and secrets in old houses.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: ['barrymore'],
      established: ['Mrs. Barrymore weeps at night', 'Barrymore signals to someone on the moor with a candle', 'someone answers from the darkness', 'the Barrymores are hiding something']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'moor open', 'mire', 'stone circle']
    }
  },
  scene_07: {
    sceneId: 'scene_07',
    sceneName: 'The Moor at Night',
    description: `You cannot sleep. The house presses in around you — its weight, its age, its secrets — and the walls seem to breathe with the wind. At last you rise, dress, and step out through the garden door into the night.

The moor at night is a different world. By day it is desolate but beautiful — purple heather, grey granite, vast skies. By night it is something else entirely. The fog has come in, low and thick, turning the landscape into a featureless grey sea. The tors are islands of black rock, barely visible. The heather is a dark carpet that seems to move and shift at the edges of your vision.

The silence is immense. No birds. No insects. No wind. Just the sound of your own breathing and the soft crunch of your boots on the gravel path. You walk away from the Hall, following the path that leads south toward the moor, and the fog closes behind you like a door.

Then you hear it.

It comes from somewhere to the west — from the direction of the Grimpen Mire. A sound that is not a howl, not a cry, not a bark, but something between all three. Deep. Mournful. Rising and falling with a rhythm that is almost musical, almost human. It echoes off the tors and rolls across the heather like thunder, and when it stops, the silence that follows is worse than the sound.

Your blood has gone cold. Every instinct tells you to run. The sound was not natural. Not a fox. Not a dog. Something larger. Something darker. Something that has been waiting in the fog.`,
    content: [
      {
        id: 'listen_howl',
        label: 'Stand still and listen to the howl',
        keywords: ['howl', 'listen', 'sound', 'hear', 'cry', 'moor', 'night', 'dark'],
        discovery: 'You force yourself to stand still and listen. The howl comes again — closer this time, or perhaps the fog is distorting the distance. It rises from a low moan to a high, keening wail that sets your teeth on edge, then drops to a bass rumble you feel in your chest. It is not the sound of any animal you know. It is too measured, too deliberate. As if whatever is making it wants to be heard. Wants to be feared. The sound fades, and in its wake you hear something else: the rapid pounding of your own heart.'
      },
      {
        id: 'search_source',
        label: 'Move toward the sound to find its source',
        keywords: ['move', 'toward', 'source', 'search', 'find', 'west', 'mire', 'direction'],
        discovery: 'You take three steps toward the sound and stop. The fog is so thick you can barely see your own hands. The ground beneath your feet has changed — the firm gravel path has given way to soft, peaty earth that sucks at your boots. You are on the moor now, truly on it, and the moor at night is a place where sensible men do not walk. Another howl, directly ahead. You freeze. Something is moving in the fog — a dark shape, low to the ground, moving fast. It passes within twenty yards of you and is gone, leaving only the smell of wet fur and something else — something acrid and chemical, like phosphorus.'
      },
      {
        id: 'return_hall',
        label: 'Retreat to the safety of the Hall',
        keywords: ['retreat', 'return', 'hall', 'safety', 'back', 'run', 'door'],
        discovery: 'You turn and walk quickly back toward the Hall. The fog makes navigation difficult, and for a terrible moment you cannot see the building at all — just grey nothing in every direction. Then the Hall looms out of the mist, its windows dark, its stone walls slick with moisture. You reach the garden door and pull it open. Inside, the house is warm and still. But through the window, out on the moor, the howling begins again. Closer now. As if whatever made it has followed you to the door.'
      },
      {
        id: 'examine_ground',
        label: 'Kneel and examine the ground where you heard the creature',
        keywords: ['ground', 'examine', 'kneel', 'footprint', 'track', 'paw', 'print', 'mark'],
        discovery: 'You kneel on the wet earth and strike a match. In the brief flare of light, you see them: paw prints. Enormous. Each one the size of a dinner plate, sunk deep into the peat. The claws have left furrows in the earth. The prints lead from the direction of the Grimpen Mire, pass within yards of where you stand, and continue toward the Hall. Whatever made them was not running. It was walking. Deliberately. Toward the house. The match burns your fingers and goes out. You are alone in the dark with the prints of something that should not exist.'
      }
    ],
    exitAction: 'flee_inside',
    exitLabel: 'Go back inside and bolt the door',
    hardExitNarration: 'You stumble back through the garden door and slam it behind you. The bolt slides home with a sound like a gunshot in the silence. Through the window, the moor is nothing but fog and darkness. But somewhere out there, in the grey nothing, something is moving. You can hear it breathing.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: [],
      established: ['heard a terrible howl on the moor at night', 'the sound was not a natural animal', 'enormous paw prints in the peat', 'something is moving on the moor near the Hall']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'baskerville hall interior', 'mire deep']
    }
  },
  scene_08: {
    sceneId: 'scene_08',
    sceneName: 'The Stapletons',
    description: `The morning after the howling, the sun returns — pale and watery, but welcome. The moor is transformed: the fog has lifted, and the landscape stretches away in bands of purple heather, green moss, and grey granite, beautiful in its desolation. From the Hall, you can see for miles — the dark mass of the Grimpen Mire to the west, the cluster of tors to the south, and the thin ribbon of the road that leads to the village of Grimpen.

A figure is approaching along the path — a man, tall and lean, walking with the easy stride of someone who knows the moor intimately. As he draws closer, you see he is perhaps forty, with a thin, clean-shaven face and sharp, intelligent eyes behind wire-rimmed spectacles. He carries a butterfly net and a collecting box slung over one shoulder. He waves cheerfully as he comes through the gate.

"Sir Henry Baskerville, I presume?" He extends a hand. "Jack Stapleton. I am your nearest neighbour — Merripit House, about two miles east. I am a naturalist by trade and inclination. The moor is my laboratory." His smile is warm, his handshake firm. His eyes, however, do something strange — they flick past you, over your shoulder, scanning the moor behind you as if checking for something.

A woman appears on the path behind him — younger, dark-haired, striking. She moves quickly, almost running, and when she sees you her face goes white. "Go back!" she cries. "Go back to London! Tonight! Before it is too late!" Stapleton turns sharply. "Beryl!" His voice is quiet but carries an edge of steel. She catches herself, composes her face into a smile that does not reach her eyes. "Forgive me," she says. "I thought you were Sir Henry. The moor plays tricks on the mind."`,
    content: [
      {
        id: 'talk_stapleton',
        label: 'Speak with Stapleton about the moor',
        keywords: ['stapleton', 'talk', 'speak', 'naturalist', 'moor', 'ask', 'neighbour'],
        discovery: 'Stapleton is a fund of knowledge about the moor. He speaks with genuine passion about the flora and fauna — the rare butterflies that breed in the mire, the adders that bask on the tors, the archaeological sites that dot the landscape. But when you mention the howling you heard last night, his expression changes. A flicker of something — interest? satisfaction? — crosses his face before he smooths it away. "The moor has many sounds," he says carefully. "The wind, the birds, the shifting of the peat. One must not let the imagination run away with one." His eyes, behind the spectacles, are very bright.'
      },
      {
        id: 'speak_beryl',
        label: 'Approach Beryl Stapleton and ask about her warning',
        keywords: ['beryl', 'sister', 'woman', 'speak', 'approach', 'warning', 'ask', 'go back'],
        discovery: 'You find a moment when Stapleton is distracted by a butterfly and approach Beryl. Her hands are trembling. "I should not have said what I said," she whispers, not meeting your eyes. "My brother — " She stops. Corrects herself. "Mr. Stapleton would be angry if he knew I spoke to you that way." You ask why she is afraid. She glances toward Stapleton, who is pinning a specimen with careful, precise fingers. "This moor is dangerous," she says. "Not just the bogs. Not just the weather. There are things here that — " Stapleton calls her name. She flinches. "Please," she says quickly. "If you have any sense, leave this place."'
      },
      {
        id: 'examine_stapleton',
        label: 'Study Stapleton carefully — his manner, his appearance',
        keywords: ['examine', 'study', 'stapleton', 'observe', 'appearance', 'manner', 'watch'],
        discovery: 'You study Stapleton as he talks. He is lean and energetic, with the weathered skin of a man who spends his life outdoors. His hands are strong and stained with chemicals from his collecting work. But it is his face that holds your attention — the long nose, the thin mouth, the dark, deep-set eyes. You have seen this face before. In a portrait. Hanging in the entrance hall of Baskerville Hall. Hugo Baskerville. The resemblance is unmistakable. Stapleton catches you staring and raises an eyebrow. "Is something wrong?" he asks pleasantly. You shake your head. But the thought lodges in your mind like a splinter.'
      },
      {
        id: 'ask_about_sir_charles',
        label: 'Ask Stapleton about Sir Charles Baskerville',
        keywords: ['sir charles', 'ask', 'stapleton', 'death', 'knew', 'friend', 'baskerville'],
        discovery: 'When you mention Sir Charles, Stapleton\'s manner becomes solemn. "A great loss," he says quietly. "I knew him well. We were... friends, of a sort. He was a kind man, a generous man, but he had one obsession that I could never cure him of." You ask what that was. Stapleton looks out across the moor. "The legend," he says. "The hound. He believed it. He was terrified of the moor after dark. I told him it was nonsense — local superstition, nothing more. But he would not listen." He pauses. "The night he died, he was waiting at the gate of the Hall. Waiting for someone. I have often wondered who."'
      }
    ],
    exitAction: 'stapleton_leaves',
    exitLabel: 'Watch the Stapletons walk back across the moor',
    hardExitNarration: 'Stapleton collects his butterfly net and offers a final warm smile. "You must come to Merripit House for dinner," he says. "We are lonely out here." He takes Beryl\'s arm — firmly, you notice, not gently — and they walk away across the heather. Beryl does not look back. But at the gate, she turns, just for a moment, and her expression is unmistakable: pure, desperate fear.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: [],
      established: ['met Jack Stapleton, naturalist neighbour', 'met Beryl Stapleton (his sister)', 'Beryl warned to leave the moor', 'Stapleton resembles Hugo Baskerville portrait', 'Stapleton knew Sir Charles']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'mire deep', 'stone circle']
    }
  },
  scene_09: {
    sceneId: 'scene_09',
    sceneName: 'The Escaped Convict',
    description: `The news arrives with the morning post: Selden, the Notting Hill murderer, has escaped from Dartmoor Prison. The constabulary has warned all households within ten miles to lock their doors and windows. Barrymore reads the notice aloud at breakfast, his voice flat and professional, but his wife drops a plate. It shatters on the stone floor, and she stands over the pieces, staring down at them as if she has forgotten how to move.

That night, you see the candle again. Barrymore is at the window of the study, moving the light back and forth in its strange, deliberate pattern. This time, you are ready. You have dressed in dark clothes and waited in the corridor. When Barrymore leaves the study, you slip out through the garden door and into the night.

The moor is cold and clear. The moon is up, painting the landscape in silver and black. You can see the answering light — a single point of orange, flickering on the high ground to the southwest. You move toward it, keeping low, using the tors for cover. The ground is treacherous — boggy in places, rocky in others — and twice you nearly turn an ankle.

Then you see him. A figure crouched behind a granite boulder, wrapped in a dark coat, his face gaunt and wild. Selden. The escaped convict. He is eating something — tearing at it with his teeth like an animal. He looks up and sees you, and his eyes are the eyes of a cornered beast.

Behind you, a shout. Sir Henry has followed you. And Selden is running.`,
    content: [
      {
        id: 'pursue_selden',
        label: 'Chase Selden across the moor',
        keywords: ['chase', 'pursue', 'selden', 'run', 'follow', 'convict', 'moor'],
        discovery: 'You run after Selden, but the moor is his territory. He moves through the darkness with the confidence of a man who has spent weeks learning every rock, every bog, every shadow. You stumble, catch yourself, run on. Sir Henry is behind you, breathing hard. Selden reaches a tor and scrambles up it with terrifying speed. At the top, he turns and looks down at you. For a moment, his face is lit by the moon — and you see not a murderer but a man in absolute terror. He is not running from you. He is running from something else. He drops down the far side of the tor and vanishes into the darkness.'
      },
      {
        id: 'observe_selden',
        label: 'Watch Selden from hiding before he sees you',
        keywords: ['watch', 'observe', 'selden', 'hide', 'hiding', 'look', 'study'],
        discovery: 'You crouch behind a boulder and study the convict. He is thin — thinner than a man should be — and his clothes are rags. He has been living rough on the moor for days, perhaps weeks. But it is his expression that strikes you: not the blank menace of a murderer, but the wide-eyed, flinching terror of a hunted animal. He keeps looking over his shoulder, toward the Mire. Not at the prison. Not at the road. At the Mire. As if something out there frightens him more than the law, more than capture, more than the gallows.'
      },
      {
        id: 'confront_barrymore_signal',
        label: 'Return to the Hall and confront Barrymore about the signal',
        keywords: ['confront', 'barrymore', 'return', 'hall', 'signal', 'accuse', 'selden'],
        discovery: 'You burst into the study where Barrymore stands at the window. "Selden," you say. "The escaped convict. You have been signalling to him." Barrymore\'s composure finally breaks. He sinks into a chair and covers his face with his hands. "He is my wife\'s brother," he says, his voice muffled. "Her younger brother. She raised him after their parents died. He is a murderer, yes — I know what he has done. But he is her blood. She begged me. I could not refuse her." He looks up. "He is leaving tomorrow. We have arranged passage on a ship. Please, sir — one more night. That is all we ask."'
      },
      {
        id: 'find_selden_camp',
        label: 'Search the area where Selden was hiding',
        keywords: ['search', 'camp', 'selden', 'area', 'boulder', 'find', 'evidence'],
        discovery: 'You search the area around the boulder where Selden was crouching. The remains of a small fire. A tin of stolen food. A bundle of rags that serves as a bed. And something else: footprints in the soft earth. Not Selden\'s — these are larger, deeper, made by heavy boots. Someone else has been visiting the convict. Someone who brings him food. The prints lead away from the tor, toward the Grimpen Mire, and they are accompanied by a second set of prints — enormous, canine, the same prints you saw outside the Hall. Selden is not the only creature hiding on the moor.'
      }
    ],
    exitAction: 'return_to_hall_night',
    exitLabel: 'Go back to the Hall before dawn',
    hardExitNarration: 'The moor is quiet now. Selden has vanished into the darkness, and the answering light has gone out. You walk back to the Hall through the cold predawn air, your mind racing. Barrymore\'s secret is out. But it does not explain the howling. It does not explain the paw prints. It does not explain the terror on the face of a man who has killed before and fears something worse than death.',
    initialFacts: {
      items: ['webley revolver'],
      metNPCs: ['barrymore'],
      established: ['Selden the convict is on the moor', 'Barrymore signals to Selden', 'Mrs. Barrymore is Selden\'s sister', 'Selden is terrified of something on the moor', 'enormous paw prints near Selden\'s camp']
    },
    locationKeywords: {
      banned: ['baker street', 'london', 'train', 'station', 'baskerville hall interior', 'mire deep']
    }
  }
};
