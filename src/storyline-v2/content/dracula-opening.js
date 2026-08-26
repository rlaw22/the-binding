'use strict';

/** Authored first arc for the Dracula V2 canary. */

function action(actionId, type, category, label, shortLabel, keywords, narration, extra = {}) {
  return {
    actionId, contentId: actionId, type, category, label, shortLabel, keywords,
    resolution: { resultType: extra.resultType || 'discovery', narration,
      ...(extra.discover ? { discover: extra.discover } : {}),
      ...(extra.setFlags ? { setFlags: extra.setFlags } : {}),
      ...(extra.addItems ? { addItems: extra.addItems } : {}) }
  };
}

const ARC = [
  {
    id: 'dracula_full_01', name: 'The Golden Krone Inn', location: ['bistritz_golden_krone', 'The Golden Krone Inn, Bistritz'],
    setting: 'Bistritz, on the eve of the journey through the Borgo Pass.',
    opening: 'The journey east has carried you beyond familiar roads. At Bistritz, the Golden Krone offers one last pool of lamplight before the coach leaves for the Borgo Pass. The inn is warm, but the welcome is uneasy: the landlord watches the clock, the stable-boy avoids your eyes, and every conversation falls silent when the road is mentioned.\n\nYour instructions are simple—reach Count Dracula’s castle and complete the business entrusted to you. Yet the map, the warnings, and the darkness gathering beyond the windows suggest that the journey has already begun to cost more than time.',
    npcs: ['golden_krone_landlord', 'stable_boy'],
    actions: [
      ['route', 'exploration', 'investigation', 'Study the map and the coach route', 'Study the route', ['map', 'route', 'coach', 'study'], 'The route runs east from Bistritz into the Borgo Pass. The last coach leaves at dusk; you mark the pass and keep the map close.', { setFlags: { route_understood: true } }],
      ['landlord', 'exploration', 'social', 'Question the landlord about the Borgo Pass', 'Question the landlord', ['ask', 'landlord', 'borgo', 'warnings'], 'The landlord lowers his voice and presses a small crucifix into your palm. The driver will come when the road is darkest. His fear is not theatrical.', { setFlags: { landlord_warning_heard: true }, addItems: ['protective_crucifix'] }],
      ['stable', 'exploration', 'preparation', 'Inspect the horses and prepare for the night road', 'Prepare the night road', ['stable', 'horses', 'prepare', 'coach'], 'You inspect the harness and secure your belongings. The stable-boy admits the horses have been changed twice today; he refuses to explain why.', { setFlags: { road_prepared: true } }],
      ['continue', 'exit', 'exit', 'Leave with the coach before the last light fails', 'Take the coach', ['leave', 'coach', 'depart', 'travel'], 'The coach pulls away from the Golden Krone. Bistritz falls behind as the road climbs into the Carpathians and the last lights vanish.', { resultType: 'exit', setFlags: { departed_bistritz: true } }]
    ]
  },
  {
    id: 'dracula_full_02', name: 'The Coach Ride', location: ['coach_to_borgo', 'The road to the Borgo Pass'],
    setting: 'A jolting coach carries you east beneath a sky without stars.',
    opening: 'The coach leaves the settled road behind. Villages thin, the forest closes in, and the driver answers every question with a shake of the reins. Around you, passengers make the sign of the cross whenever wolves cry in the distance. The wheels keep turning toward the pass.',
    npcs: ['coach_driver', 'fellow_travellers'],
    actions: [
      ['question_driver', 'exploration', 'social', 'Ask the driver why the road is feared', 'Question the driver', ['ask', 'driver', 'road', 'fear'], 'The driver’s hands tighten on the reins. He says only that the road belongs to the night after the last village.', { setFlags: { driver_questioned: true } }],
      ['watch_forest', 'exploration', 'investigation', 'Watch the forest for signs of pursuit', 'Watch the forest', ['watch', 'forest', 'wolves', 'pursuit'], 'Between the trees, pale shapes pace the coach and disappear whenever you turn your head. Something is keeping pace with you.', { setFlags: { wolves_seen: true } }],
      ['hold_crucifix', 'class', 'protection', 'Keep the landlord’s crucifix ready', 'Keep the crucifix ready', ['crucifix', 'protect', 'prayer', 'ready'], 'The crucifix rests warm against your palm despite the cold. The passengers notice it and draw a little nearer.', { setFlags: { protection_ready: true } }],
      ['continue', 'exit', 'exit', 'Continue into the Borgo Pass', 'Enter the pass', ['continue', 'pass', 'travel'], 'The coach reaches the foot of the Borgo Pass. The driver stops, and a second vehicle waits where no road should be.', { resultType: 'exit', setFlags: { reached_borgo: true } }]
    ]
  },
  {
    id: 'dracula_full_03', name: 'The Borgo Pass', location: ['borgo_pass', 'The Borgo Pass'],
    setting: 'The Borgo Pass, where the ordinary road ends.',
    opening: 'The first coach turns back. A dark carriage waits in the road, its driver wrapped in a long black coat. The horses stamp and steam, though the air is bitter. No one explains who sent it. The driver opens the door and waits for you to decide whether fear is reason enough to remain behind.',
    npcs: ['mysterious_driver'],
    actions: [
      ['inspect_carriage', 'exploration', 'investigation', 'Inspect the waiting carriage before boarding', 'Inspect the carriage', ['inspect', 'carriage', 'horses', 'driver'], 'The carriage bears no crest, but its fittings are too fine for a common mountain route. The horses have no breath in the cold.', { setFlags: { carriage_examined: true } }],
      ['question_driver', 'exploration', 'social', 'Demand the driver name his employer', 'Challenge the driver', ['demand', 'question', 'driver', 'employer'], 'The driver turns his face toward you. In the moonlight, his eyes seem red; when you blink, they are ordinary again. “The Count expects you.”', { setFlags: { count_named: true } }],
      ['board_carriage', 'threat', 'risk', 'Board the carriage and trust the road', 'Board the carriage', ['board', 'carriage', 'trust', 'ride'], 'You climb aboard. The door shuts with a final sound, and the carriage leaps forward without the driver touching the reins.', { setFlags: { carriage_boarded: true } }],
      ['continue', 'exit', 'exit', 'Ride through the pass toward the castle', 'Ride toward the castle', ['ride', 'continue', 'castle', 'pass'], 'The carriage plunges into the pass. Behind you, the road and the first coach disappear; ahead, blue flames flicker among the trees.', { resultType: 'exit', setFlags: { entered_pass: true } }]
    ]
  },
  {
    id: 'dracula_full_04', name: 'The Blue Flame', location: ['carpathian_forest', 'The Carpathian forest'],
    setting: 'A forest road above the Borgo Pass, beneath a cold moon.',
    opening: 'The carriage moves as though drawn by the darkness itself. Blue flames appear beside the road, burning low among the trees. The driver stops at each one, steps down, and returns without explanation. Beyond the carriage window, wolves gather in the shadows but do not cross the road.',
    npcs: ['mysterious_driver', 'wolves'],
    actions: [
      ['watch_flame', 'exploration', 'lore', 'Watch what the driver does at the blue flame', 'Watch the blue flame', ['watch', 'flame', 'blue', 'driver'], 'At the nearest flame, the driver searches the earth as if following a map written in fire. When he returns, a cold blue reflection remains in his eyes.', { setFlags: { blue_flame_witnessed: true } }],
      ['protect_passengers', 'threat', 'protection', 'Keep the wolves from the carriage', 'Protect the carriage', ['wolves', 'protect', 'defend', 'passengers'], 'You raise the crucifix toward the window. The wolves recoil together, not in fear but recognition, and the carriage gains a few more yards of road.', { setFlags: { wolves_repulsed: true } }],
      ['search_carriage', 'exploration', 'investigation', 'Search the carriage for a weapon or escape', 'Search the carriage', ['search', 'weapon', 'escape', 'carriage'], 'Under the seat you find an iron lantern and a broken length of whip. They are poor weapons, but better than empty hands.', { setFlags: { carriage_searched: true }, addItems: ['iron_lantern'] }],
      ['continue', 'exit', 'exit', 'Follow the carriage to its destination', 'Follow the carriage', ['continue', 'destination', 'castle', 'ride'], 'The final blue flame dies behind you. The forest opens, revealing a vast ruined castle whose black windows hold no light.', { resultType: 'exit', setFlags: { castle_revealed: true } }]
    ]
  },
  {
    id: 'dracula_full_05', name: 'Castle Dracula', location: ['castle_dracula_gate', 'The gates of Castle Dracula'],
    setting: 'The gate of a vast ruined castle in the Carpathian mountains.',
    opening: 'The carriage stops before a gate of ancient stone. The driver is gone. The great doors open inward without a hand upon them, revealing a courtyard drowned in shadow. You have reached Count Dracula’s castle, but there is no servant to receive you and no visible path back to the road.',
    npcs: ['count_dracula'],
    actions: [
      ['examine_gate', 'exploration', 'investigation', 'Examine the gate and search for a way back', 'Examine the gate', ['gate', 'examine', 'escape', 'road'], 'The gate is sealed from within. The stone bears a worn device resembling a dragon, and the hinges show no trace of recent use.', { setFlags: { castle_gate_examined: true } }],
      ['enter_courtyard', 'threat', 'risk', 'Enter the courtyard and call for your host', 'Enter the courtyard', ['enter', 'courtyard', 'call', 'host'], 'Your voice crosses the courtyard and returns altered by the stone. Somewhere above, a window closes. You step inside, and the doors shut behind you.', { setFlags: { castle_entered: true } }],
      ['keep_crucifix_ready', 'class', 'protection', 'Keep the crucifix visible as you enter', 'Keep the crucifix ready', ['crucifix', 'enter', 'protect', 'prayer'], 'You keep the crucifix in your hand. The darkness does not retreat, but it seems to hesitate before you cross the threshold.', { setFlags: { castle_protected: true } }],
      ['continue', 'exit', 'exit', 'Enter the castle and meet Count Dracula', 'Meet the Count', ['continue', 'castle', 'dracula', 'enter'], 'A tall man steps from the shadowed hall and bows with grave courtesy. “Welcome to my house. Come freely and of your own will.”', { resultType: 'exit', setFlags: { met_dracula: true } }]
    ]
  }
];

function makeAction(sceneId, spec) { const [id, type, category, label, short, keywords, narration, extra] = spec; return action(`${sceneId}__${id}`, type, category, label, short, keywords, narration, { ...extra, discover: [`${sceneId}__${id}`] }); }
function authorDraculaOpening(manifest) {
  const scenes = manifest.scenes;
  manifest.items = { ...manifest.items, iron_lantern: { itemId: 'iron_lantern', name: 'Iron lantern' } };
  ARC.forEach(authored => {
    const scene = scenes.find(entry => entry.sceneId === authored.id); if (!scene) return;
    scene.name = authored.name; scene.location = { id: authored.location[0], name: authored.location[1] }; scene.setting = authored.setting; scene.openingNarration = authored.opening; scene.presentNpcs = authored.npcs;
    scene.actions = authored.actions.map(spec => makeAction(authored.id, spec));
  });
  const edges = manifest.graph.edges;
  for (let i = 0; i < ARC.length - 1; i += 1) { const from = ARC[i].id; const to = ARC[i + 1].id; const edge = edges.find(item => item.from === from && item.to === to); if (edge) edge.trigger.actionId = `${from}__continue`; }
  return manifest;
}
module.exports = { authorDraculaOpening, ARC };
