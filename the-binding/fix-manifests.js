#!/usr/bin/env node
/**
 * fix-manifests.js — Add presentCharacters + replace badChoices for all 75 scenes
 * Run once, then verify with audit script.
 */
const fs = require('fs');
const path = require('path');

// ────────────────────────────────────────────────────────────
// 1. NPC rosters per adventure (from metNPCs + narrative context)
// ────────────────────────────────────────────────────────────
const NPC_ROSTER = {
  // Dracula adventure (act1-act5)
  dracula: [
    'jonathan harker', 'dracula', 'count dracula', 'mina', 'lucy',
    'van_helsing', 'seward', 'renfield', 'godalming', 'mr. hawkins',
    'innkeeper', 'mysterious coachman', 'quincey morris'
  ],
  // Frankenstein adventure
  frankenstein: [
    'victor frankenstein', 'the creature', 'elizabeth', 'henry clerval',
    'alphonse frankenstein', 'caroline frankenstein', 'captain walton',
    'felix de lacey', 'agatha de lacey', 'de lacey (old man)', 'safie',
    'professor krempe', 'professor waldman', 'justine moritz'
  ],
  // Holmes adventure
  holmes: [
    'holmes', 'watson', 'sir_henry', 'stapleton', 'mortimer',
    'barrymore', 'mrs_barrymore', 'selden', 'lestrade', 'beryl',
    'laura_lyons', 'james wilder'
  ]
};

// ────────────────────────────────────────────────────────────
// 2. Scene → presentCharacters mapping (who is physically there)
// ────────────────────────────────────────────────────────────
const SCENE_CHARACTERS = {
  // ── Dracula ──
  dracula: {
    'scene_00': ['jonathan harker', 'mr. hawkins'],
    'scene_01': ['jonathan harker', 'innkeeper'],
    'scene_02': ['jonathan harker', 'mysterious coachman'],
    'scene_03': ['jonathan harker', 'dracula'],
    'scene_04': ['jonathan harker', 'dracula'],
    'scene_05': ['jonathan harker', 'dracula'],
    'scene_06': ['jonathan harker', 'dracula'],
    'scene_07': ['jonathan harker', 'dracula'],
    'scene_08': ['jonathan harker'],
    'scene_09': ['jonathan harker', 'dracula'],
    'scene_10': ['mina', 'lucy'],
    'scene_11': ['mina', 'lucy', 'seward'],
    'scene_12': ['seward', 'renfield'],
    'scene_13': ['lucy', 'mina', 'seward'],
    'scene_14': ['seward', 'van_helsing', 'lucy'],
    'scene_15': ['mina', 'jonathan harker'],
    'scene_16': ['lucy', 'mina', 'van_helsing'],
    'scene_17': ['seward', 'van_helsing', 'lucy'],
    'scene_18': ['mina', 'dracula'],
    'scene_19': ['mina', 'van_helsing', 'seward'],
    'scene_20': ['mina', 'van_helsing', 'seward', 'godalming'],
    'scene_21': ['mina', 'van_helsing', 'dracula'],
    'scene_22': ['van_helsing', 'mina', 'godalming'],
    'scene_23': ['mina', 'jonathan harker', 'van_helsing', 'dracula'],
    'scene_24': ['mina', 'jonathan harker', 'van_helsing', 'seward', 'dracula']
  },
  // ── Frankenstein ──
  frankenstein: {
    'scene_00': ['captain walton'],
    'scene_01': ['captain walton', 'victor frankenstein'],
    'scene_02': ['victor frankenstein', 'alphonse frankenstein', 'caroline frankenstein'],
    'scene_03': ['victor frankenstein', 'elizabeth', 'alphonse frankenstein'],
    'scene_04': ['victor frankenstein', 'henry clerval'],
    'scene_05': ['victor frankenstein', 'professor krempe'],
    'scene_06': ['victor frankenstein', 'professor waldman'],
    'scene_07': ['victor frankenstein'],
    'scene_08': ['victor frankenstein', 'the creature'],
    'scene_09': ['victor frankenstein'],
    'scene_10': ['victor frankenstein', 'henry clerval'],
    'scene_11': ['victor frankenstein', 'alphonse frankenstein'],
    'scene_12': ['victor frankenstein', 'justine moritz'],
    'scene_13': ['victor frankenstein', 'the creature'],
    'scene_14': ['the creature', 'de lacey (old man)', 'felix de lacey', 'agatha de lacey'],
    'scene_15': ['the creature', 'felix de lacey', 'safie'],
    'scene_16': ['the creature', 'de lacey (old man)'],
    'scene_17': ['the creature', 'felix de lacey'],
    'scene_18': ['the creature'],
    'scene_19': ['victor frankenstein', 'the creature'],
    'scene_20': ['victor frankenstein', 'henry clerval'],
    'scene_21': ['victor frankenstein', 'the creature'],
    'scene_22': ['victor frankenstein', 'elizabeth'],
    'scene_23': ['victor frankenstein', 'elizabeth'],
    'scene_24': ['victor frankenstein', 'captain walton']
  },
  // ── Holmes ──
  holmes: {
    'scene_00': ['mortimer', 'holmes', 'watson'],
    'scene_01': ['holmes', 'watson', 'mortimer'],
    'scene_02': ['holmes', 'watson', 'sir_henry'],
    'scene_03': ['holmes', 'watson', 'sir_henry'],
    'scene_04': ['holmes', 'watson', 'sir_henry', 'barrymore', 'mrs_barrymore'],
    'scene_05': ['holmes', 'watson', 'sir_henry', 'barrymore'],
    'scene_06': ['watson', 'sir_henry', 'stapleton'],
    'scene_07': ['watson', 'selden'],
    'scene_08': ['watson', 'sir_henry', 'barrymore'],
    'scene_09': ['watson', 'stapleton', 'beryl'],
    'scene_10': ['watson', 'laura_lyons'],
    'scene_11': ['watson', 'holmes'],
    'scene_12': ['holmes', 'watson', 'stapleton'],
    'scene_13': ['holmes', 'watson', 'sir_henry', 'stapleton'],
    'scene_14': ['holmes', 'watson', 'lestrade'],
    'scene_15': ['holmes', 'watson'],
    'scene_16': ['holmes', 'watson', 'sir_henry'],
    'scene_17': ['holmes', 'watson', 'stapleton'],
    'scene_18': ['holmes', 'watson'],
    'scene_19': ['holmes', 'watson', 'sir_henry'],
    'scene_20': ['holmes', 'watson', 'lestrade'],
    'scene_21': ['holmes', 'watson'],
    'scene_22': ['holmes', 'watson', 'sir_henry'],
    'scene_23': ['holmes', 'watson', 'sir_henry'],
    'scene_24': ['holmes', 'watson', 'mortimer']
  }
};

// ────────────────────────────────────────────────────────────
// 3. Unique bad choices per scene (context-appropriate)
// ────────────────────────────────────────────────────────────
const BAD_CHOICES = {
  dracula: {
    'scene_00': { id: 'burn_the_letter', label: 'Burn the letter and refuse the commission', consequence: 'Mr. Hawkins is gravely disappointed. The Count will find another solicitor — and you will never know what darkness you escaped.', coinCost: 3, flagSet: { refused_commission: true } },
    'scene_01': { id: 'leave_the_train', label: 'Leave the train at Vienna and turn back', consequence: 'You abandon the journey. The innkeeper at Bistritz waits in vain. The Count sends a cold letter to Mr. Hawkins, and your career suffers.', coinCost: 3, flagSet: { abandoned_journey: true } },
    'scene_02': { id: 'run_from_wolves', label: 'Leap from the carriage and run into the forest', consequence: 'The wolves close in. The coachman\'s whip cracks, but the darkness swallows you whole.', coinCost: 4, flagSet: { lost_in_forest: true } },
    'scene_03': { id: 'shout_at_driver', label: 'Shout at the mysterious driver to stop', consequence: 'The driver turns — his eyes burn red in the moonlight. The horses bolt. You are thrown against the seat as the carriage hurtles onward without mercy.', coinCost: 3, flagSet: { angered_driver: true } },
    'scene_04': { id: 'refuse_entry', label: 'Refuse to enter the castle', consequence: 'Dracula\'s smile fades. "You are already inside, Mr. Harker." The gates slam shut behind you.', coinCost: 4, flagSet: { trapped_courtyard: true } },
    'scene_05': { id: 'explore_dungeon', label: 'Descend into the castle dungeon alone', consequence: 'The stairs spiral downward into impenetrable darkness. Something breathes in the black. You stumble back up, shaken, and find Dracula watching you from the top of the stairs.', coinCost: 3, flagSet: { found_dungeon: true } },
    'scene_06': { id: 'search_draculas_chamber', label: 'Search Dracula\'s private chamber while he sleeps', consequence: 'You find the Count lying in his coffin, eyes open, staring at you. His lips curl into a smile. "Did you find what you were looking for, Mr. Harker?"', coinCost: 4, flagSet: { caught_snooping: true } },
    'scene_07': { id: 'climb_tower_wall', label: 'Scale the castle wall using a rope of bedsheets', consequence: 'The rope snaps. You fall thirty feet onto the hard flagstones below. Your ankle shatters. Dracula appears above, looking down with something like pity.', coinCost: 5, flagSet: { broken_ankle: true } },
    'scene_08': { id: 'open_wrong_door', label: 'Open the forbidden door in the east wing', consequence: 'Inside, dozens of pale figures lie in wooden boxes. They stir. Their eyes open. You slam the door and hear scratching from the other side.', coinCost: 4, flagSet: { saw_brides: true } },
    'scene_09': { id: 'attack_dracula', label: 'Attack Dracula with a stolen knife', consequence: 'The blade passes through him like smoke. He catches your wrist and squeezes until the bone creaks. "Brave," he whispers. "But foolish."', coinCost: 4, flagSet: { attacked_count: true } },
    'scene_10': { id: 'follow_the_fog', label: 'Walk alone into the Whitby fog', consequence: 'The fog is thick as wool. You hear scratching on stone, breathing close to your ear. When it clears, you are standing at the cliff edge, one step from the drop.', coinCost: 3, flagSet: { lost_in_fog: true } },
    'scene_11': { id: 'dismiss_lucys_dreams', label: 'Dismiss Lucy\'s sleepwalking as hysteria', consequence: 'You do nothing. That night, Lucy walks again. By the time Mina finds her on the cliff path, something has already touched her throat.', coinCost: 3, flagSet: { ignored_lucy: true } },
    'scene_12': { id: 'enter_renfields_cell', label: 'Enter Renfield\'s cell without precautions', consequence: 'Renfield lunges. His fingers close around your throat with surprising strength. "He told me you\'d come!" he shrieks. Orderlies drag him off, but your collar is torn and bleeding.', coinCost: 3, flagSet: { renfield_attack: true } },
    'scene_13': { id: 'ignore_the_bite', label: 'Ignore the bite marks on Lucy\'s neck', consequence: 'You tell yourself it is nothing. A rash, perhaps. An allergy. Lucy grows paler each day, and you grow more afraid to look at her throat.', coinCost: 3, flagSet: { denied_bite: true } },
    'scene_14': { id: 'reject_van_helsing', label: 'Reject Van Helsing\'s theories as madness', consequence: '"You are a fool, Doctor," Van Helsing says sadly. "And Lucy will pay for your foolishness." He leaves. Lucy\'s condition worsens overnight.', coinCost: 4, flagSet: { rejected_helsing: true } },
    'scene_15': { id: 'read_draculas_journal', label: 'Read Jonathan\'s stolen journal without permission', consequence: 'The entries describe horrors beyond imagining — rituals, blood, the living dead. Your hands shake so badly you drop the journal. The ink smears, destroying evidence.', coinCost: 3, flagSet: { tampered_evidence: true } },
    'scene_16': { id: 'disturb_the_grave', label: 'Dig up Lucy\'s grave before Van Helsing arrives', consequence: 'You strike the coffin lid with a shovel. It splinters. Inside, something moves. You run, leaving the grave open and the shovel behind.', coinCost: 4, flagSet: { premature_exhumation: true } },
    'scene_17': { id: 'hesitate_at_window', label: 'Hesitate when the dark figure appears at Lucy\'s window', consequence: 'The figure sees you. It turns — its eyes burn like coals. By the time you move, it has dissolved into the night, and Lucy is weaker still.', coinCost: 3, flagSet: { hesitated_again: true } },
    'scene_18': { id: 'open_train_window', label: 'Open the train window to get fresh air', consequence: 'A gust of freezing wind rushes in. Something dark and swift slips through the gap. You slam the window shut, but Mina gasps — she feels a presence now, watching.', coinCost: 4, flagSet: { let_dracula_in: true } },
    'scene_19': { id: 'doubt_mina', label: 'Doubt Mina\'s account of what she saw', consequence: '"You don\'t believe me," Mina says, her voice flat. The hurt in her eyes is worse than any monster. You have broken something between you.', coinCost: 3, flagSet: { mistrusted_mina: true } },
    'scene_20': { id: 'search_alone', label: 'Search Carfax Abbey alone at night', consequence: 'The abbey is a ruin of broken pews and rotting wood. In the crypt below, you hear chanting. Shadows move. You flee, but something follows you home.', coinCost: 4, flagSet: { abbey_shadow: true } },
    'scene_21': { id: 'open_crypt_door', label: 'Force open the sealed crypt door', consequence: 'The door groans and falls inward. Dust and the stench of centuries pour out. In the darkness, dozens of eyes open. You run, slamming doors behind you.', coinCost: 5, flagSet: { breached_crypt: true } },
    'scene_22': { id: 'argue_with_helsing', label: 'Argue with Van Helsing about the plan', consequence: 'Minutes lost in bickering. When you finally agree, the sun has set. Dracula\'s ship has already docked. The advantage is gone.', coinCost: 3, flagSet: { wasted_time: true } },
    'scene_23': { id: 'look_back', label: 'Look back as you flee the castle', consequence: 'You turn. Dracula stands at the gate, watching. His cloak billows in a wind that touches nothing else. He raises one hand — not in threat, but farewell. You will see him again.', coinCost: 3, flagSet: { looked_back: true } },
    'scene_24': { id: 'drop_the_knife', label: 'Drop the consecrated knife in the final moment', consequence: 'The blade clatters on stone. Dracula\'s eyes widen — not with triumph, but surprise. In that instant of hesitation, the dawn breaks. But the cost was nearly everything.', coinCost: 4, flagSet: { dropped_weapon: true } }
  },
  frankenstein: {
    'scene_00': { id: 'refuse_passage', label: 'Refuse to take the stranger aboard', consequence: 'The ice closes in. The man on the floe raises one hand, then slips beneath the water. You sail on, haunted by what you did not do.', coinCost: 3, flagSet: { refused_stranger: true } },
    'scene_01': { id: 'dismiss_victors_story', label: 'Dismiss Victor\'s story as fevered delusion', consequence: '"You think me mad," Victor whispers. He turns to the wall and will not speak again. His warning dies with him.', coinCost: 3, flagSet: { ignored_warning: true } },
    'scene_02': { id: 'steal_the_book', label: 'Steal the forbidden alchemical text', consequence: 'The old volume crumbles in your hands. The knowledge within is dangerous and incomplete — enough to inspire, not enough to warn.', coinCost: 3, flagSet: { stolen_knowledge: true } },
    'scene_03': { id: 'neglect_elizabeth', label: 'Neglect Elizabeth for your experiments', consequence: 'Elizabeth waits alone in the garden. Each night, her window darkens before yours. The distance between you grows like a living thing.', coinCost: 3, flagSet: { neglected_love: true } },
    'scene_04': { id: 'ignore_clervals_concern', label: 'Ignore Clerval\'s concern for your health', consequence: '"You look deathly," Clerval says. You laugh and return to work. Your hands tremble. Your reflection is a stranger.', coinCost: 3, flagSet: { ignored_friend: true } },
    'scene_05': { id: 'mock_krempe', label: 'Mock Professor Krempe\'s caution', consequence: 'Krempe\'s face hardens. "You are not the first arrogant student I have seen destroy himself," he says. He marks your file. Doors begin to close.', coinCost: 3, flagSet: { made_enemy: true } },
    'scene_06': { id: 'skip_the_lecture', label: 'Skip Waldman\'s lecture to work alone', consequence: 'Waldman\'s demonstration of galvanism is legendary — and you miss it. Without his guidance, your early experiments are crude and dangerous.', coinCost: 3, flagSet: { missed_guidance: true } },
    'scene_07': { id: 'work_without_sleep', label: 'Work for seven days without sleep', consequence: 'Your vision blurs. The instruments shake in your hands. You complete the work — but your judgment is gone. Details you should have caught go unnoticed.', coinCost: 4, flagSet: { sleepless_work: true } },
    'scene_08': { id: 'flee_the_creation', label: 'Flee the apartment the moment the creature moves', consequence: 'You run into the rain. Behind you, a hand reaches out from the table — and finds nothing. The creature is alone, confused, newborn. You have already failed it.', coinCost: 4, flagSet: { abandoned_creation: true } },
    'scene_09': { id: 'burn_the_notes', label: 'Burn all your laboratory notes', consequence: 'The flames consume years of work. Without the notes, you can never understand what went wrong — or how to fix it.', coinCost: 3, flagSet: { destroyed_evidence: true } },
    'scene_10': { id: 'tell_clerval_nothing', label: 'Tell Clerval nothing of what you created', consequence: 'Clerval nurses you through your fever, never knowing the truth. The secret festers between you, invisible and corrosive.', coinCost: 3, flagSet: { kept_secret: true } },
    'scene_11': { id: 'blame_alphonse', label: 'Blame your father for not stopping you', consequence: '"I trusted you," Alphonse says quietly. The disappointment in his voice is worse than any accusation. You have wounded the one person who never doubted you.', coinCost: 3, flagSet: { blamed_father: true } },
    'scene_12': { id: 'abandon_justine', label: 'Abandon Justine to her fate', consequence: 'You say nothing at the trial. Justine is convicted. She looks at you once — confused, betrayed — and is led away. The creature watches from the shadows, satisfied.', coinCost: 4, flagSet: { let_justine_die: true } },
    'scene_13': { id: 'refuse_to_listen', label: 'Refuse to listen to the creature\'s story', consequence: '"You will not hear me?" the creature says. Its voice breaks. "Then I will make you listen." It vanishes into the night, and the killing begins.', coinCost: 4, flagSet: { refused_creature: true } },
    'scene_14': { id: 'spy_on_de_lacey', label: 'Spy on the De Lacey family for the creature', consequence: 'You are seen. Felix chases you from the garden, shouting. The creature\'s only hope of companionship is shattered by your clumsiness.', coinCost: 3, flagSet: { exposed_spy: true } },
    'scene_15': { id: 'reveal_creature_to_felix', label: 'Reveal the creature\'s existence to Felix', consequence: 'Felix attacks the creature with a fire poker. Safie screams. The family flees in terror. The creature stands alone in the ruins of its only kindness.', coinCost: 4, flagSet: { triggered_violence: true } },
    'scene_16': { id: 'betray_de_lacey', label: 'Tell the creature where the De Laceys fled', consequence: 'The creature finds them. What happens next you learn only from the newspapers. Three dead. No survivors. Your hands are not clean.', coinCost: 5, flagSet: { caused_deaths: true } },
    'scene_17': { id: 'offer_false_promise', label: 'Promise to make the creature a companion — then plan to destroy it', consequence: 'The creature sees the lie in your eyes. "I will know if you betray me," it says. Its voice is soft, but the threat is absolute.', coinCost: 4, flagSet: { lied_to_creature: true } },
    'scene_18': { id: 'steal_body_parts', label: 'Steal parts from the charnel house at night', consequence: 'The work is sickening. Your hands shake. The parts are wrong — mismatched, decayed. Whatever you build will suffer from the start.', coinCost: 4, flagSet: { corrupted_work: true } },
    'scene_19': { id: 'destroy_half_finished', label: 'Destroy the half-finished female creature in front of the male', consequence: 'The creature watches, silent. When the last piece is torn apart, it speaks: "You have chosen your path. I will choose mine." It disappears. The killing resumes.', coinCost: 5, flagSet: { provoked_creature: true } },
    'scene_20': { id: 'confess_to_authorities', label: 'Confess everything to the authorities', consequence: 'They do not believe you. A judge orders a psychiatric evaluation. Clerval bails you out, but the look on his face tells you he is afraid of you now.', coinCost: 3, flagSet: { discredited: true } },
    'scene_21': { id: 'challenge_creature', label: 'Challenge the creature to a duel', consequence: 'The creature accepts. On the ice field at dawn, you face each other. It is faster, stronger, and tireless. You never had a chance.', coinCost: 5, flagSet: { lost_duel: true } },
    'scene_22': { id: 'refuse_wedding', label: 'Refuse to marry Elizabeth', consequence: '"If not now, when?" Elizabeth asks. Her eyes search yours. You see the hurt, the doubt, the slow erosion of trust. You are losing her without a monster\'s help.', coinCost: 3, flagSet: { refused_marriage: true } },
    'scene_23': { id: 'send_eliizabeth_away', label: 'Send Elizabeth away for her safety', consequence: 'She goes, bewildered and afraid. You watch from the window. The creature is watching too — from the garden wall. It knows where she went.', coinCost: 4, flagSet: { sent_elizabeth_away: true } },
    'scene_24': { id: 'stop_pursuing', label: 'Stop pursuing the creature and accept what happened', consequence: 'You sink to your knees in the snow. The creature pauses, looks back. For a moment, something like regret crosses its face. Then it is gone. You are alone with your guilt.', coinCost: 3, flagSet: { gave_up_pursuit: true } }
  },
  holmes: {
    'scene_00': { id: 'ignore_mortimer', label: 'Ignore Dr. Mortimer\'s strange tale', consequence: '"A hound from hell," Mortimer repeats, desperate. You wave him away. The next morning, Sir Charles Baskerville is found dead on the moor.', coinCost: 3, flagSet: { ignored_mortimer: true } },
    'scene_01': { id: 'refuse_the_case', label: 'Refuse to take the Baskerville case', consequence: 'Holmes stares at you. "Then Sir Henry will face it alone." You see something in his eyes — not judgment, but a quiet certainty that you will regret this.', coinCost: 3, flagSet: { refused_case: true } },
    'scene_02': { id: 'tell_sir_henry_nothing', label: 'Tell Sir Henry nothing about the curse', consequence: 'Sir Henry arrives in London cheerful and unsuspecting. When the first threat comes, he is unprepared. The shock nearly breaks him.', coinCost: 3, flagSet: { withheld_info: true } },
    'scene_03': { id: 'follow_wrong_lead', label: 'Follow the bearded stranger instead of checking the hotel', consequence: 'The stranger leads you through three changes of cab and into a dead end. By the time you return, Sir Henry\'s boot has been stolen from the hotel lobby.', coinCost: 3, flagSet: { wrong_lead: true } },
    'scene_04': { id: 'accuse_barrymore', label: 'Accuse Barrymore of theft without evidence', consequence: 'Barrymore\'s face goes white. "I have served this family for twenty years," he says. Mrs. Barrymore weeps. The staff will not speak to you again.', coinCost: 3, flagSet: { false_accusation: true } },
    'scene_05': { id: 'search_alone_at_night', label: 'Search the Grimpen Mire alone at night', consequence: 'The ground shifts beneath your boots. Suck and pull. You sink to your knees before clawing back to solid ground. Something large moves in the fog — and it has seen you.', coinCost: 4, flagSet: { mire_near_death: true } },
    'scene_06': { id: 'insult_stapleton', label: 'Accuse Stapleton of being the murderer at dinner', consequence: 'Stapleton\'s smile never wavers. "You must be tired from the journey," he says smoothly. But his eyes go cold. You have shown your hand too early.', coinCost: 4, flagSet: { tipped_off_stapleton: true } },
    'scene_07': { id: 'chase_selden', label: 'Chase the escaped convict across the moor', consequence: 'You run into the fog. The ground becomes treacherous — sucking mud, hidden streams. You lose the convict and nearly lose yourself. The mire does not forgive mistakes.', coinCost: 4, flagSet: { lost_on_moor: true } },
    'scene_08': { id: 'confront_barrymore_midnight', label: 'Confront Barrymore about the midnight signal', consequence: 'Barrymore breaks down. "My wife\'s brother — he is starving on the moor!" He begs you not to tell Sir Henry. You have stumbled into someone else\'s secret, not the hound\'s.', coinCost: 3, flagSet: { wrong_secret: true } },
    'scene_09': { id: 'flirt_with_beryl', label: 'Flirt with Beryl Stapleton on the moor', consequence: 'Her face drains of color. "You must never come here alone again," she whispers, then runs. You do not understand her terror — not yet.', coinCost: 3, flagSet: { misunderstood_beryl: true } },
    'scene_10': { id: 'reveal_holmes_location', label: 'Tell Laura Lyons where Holmes is hiding', consequence: 'Laura mentions it to Stapleton. That night, a figure creeps toward the stone hut on the tor. Holmes has to move — and the net closes faster.', coinCost: 4, flagSet: { exposed_holmes: true } },
    'scene_11': { id: 'surprise_at_holmes', label: 'Express shock that Holmes was hiding on the moor', consequence: '"You didn\'t trust me with the plan," you say, stung. Holmes looks at you with something close to apology. "I needed your reactions to be genuine, Watson."', coinCost: 3, flagSet: { felt_betrayed: true } },
    'scene_12': { id: 'demand_arrest_now', label: 'Demand Stapleton be arrested immediately', consequence: '"On what evidence?" Holmes asks. "A legend and a coincidence?" You push. Holmes pushes back. If you arrest Stapleton now, he walks free by morning.', coinCost: 3, flagSet: { premature_arrest: true } },
    'scene_13': { id: 'let_sir_henry_walk_alone', label: 'Let Sir Henry walk home across the moor alone', consequence: 'The fog thickens. From somewhere in the dark, a howl rises — not a dog, not a wolf. Something else. Sir Henry quickens his pace. The ground trembles.', coinCost: 4, flagSet: { abandoned_henry: true } },
    'scene_14': { id: 'fire_too_early', label: 'Fire your revolver before the hound is fully revealed', consequence: 'The bullet whistles into the fog. The hound flinches but does not fall. It turns toward you now, eyes glowing, jaws dripping. You have one shot left.', coinCost: 4, flagSet: { missed_shot: true } },
    'scene_15': { id: 'inspect_wrong_room', label: 'Search Stapleton\'s house instead of the hut on the tor', consequence: 'The house is empty — stripped bare. Stapleton has fled. But the hut on the tor holds the real secret: the hound, starved and maddened, waiting in the dark.', coinCost: 3, flagSet: { wrong_search: true } },
    'scene_16': { id: 'panic_in_fog', label: 'Panic and run when the hound appears', consequence: 'Your feet pound the moor. The fog swallows everything. Behind you, the baying grows louder. You are running toward the Grimpen Mire, not away from it.', coinCost: 4, flagSet: { panicked: true } },
    'scene_17': { id: 'negotiate_with_stapleton', label: 'Try to negotiate with Stapleton', consequence: '"You think you can bargain with me?" Stapleton laughs. The sound is ugly and broken. "I have waited twenty years for this. There is no bargain."', coinCost: 3, flagSet: { bad_negotiation: true } },
    'scene_18': { id: 'disturb_evidence', label: 'Disturb the crime scene before Holmes arrives', consequence: 'You move a stone. You shift a branch. Holmes kneels, frowning. "Someone has been here," he says. The evidence you destroyed might have been the key.', coinCost: 3, flagSet: { tampered_scene: true } },
    'scene_19': { id: 'tell_sir_henry_too_soon', label: 'Tell Sir Henry about Stapleton before the trap is set', consequence: 'Sir Henry goes pale. "My own cousin?" He wants to confront Stapleton immediately. Holmes has to physically restrain him. The plan unravels.', coinCost: 3, flagSet: { spoiled_trap: true } },
    'scene_20': { id: 'leave_early', label: 'Leave Dartmoor before the final confrontation', consequence: 'You pack your bags. Holmes says nothing, but his silence is heavy. That night, on the moor, he faces the hound alone. He survives — barely.', coinCost: 4, flagSet: { abandoned_holmes: true } },
    'scene_21': { id: 'trust_stapleton', label: 'Trust Stapleton\'s claim of innocence', consequence: '"I am a victim of circumstance," Stapleton pleads. You hesitate. In that moment, he slips away into the fog. The hound\'s master is free.', coinCost: 4, flagSet: { fooled_by_stapleton: true } },
    'scene_22': { id: 'miss_the_clue', label: 'Miss the clue hidden in Sir Henry\'s portrait', consequence: 'The painting stares down from the wall. The Baskerville eyes, the cruel mouth — Stapleton\'s face. You look right at it and see nothing. The connection remains hidden.', coinCost: 3, flagSet: { missed_portrait: true } },
    'scene_23': { id: 'delay_returning', label: 'Delay returning to Baker Street', consequence: 'You linger in Devonshire. Holmes sends three telegrams. By the time you return, the case files are closed and the story has moved on without you.', coinCost: 3, flagSet: { late_return: true } },
    'scene_24': { id: 'lose_the_notes', label: 'Lose your case notes on the train back to London', consequence: 'The notebook slips from your pocket between Exeter and Paddington. Without it, the Baskerville case becomes legend instead of evidence. Holmes is quietly furious.', coinCost: 3, flagSet: { lost_notes: true } }
  }
};

// ────────────────────────────────────────────────────────────
// 4. File mapping
// ────────────────────────────────────────────────────────────
const ADV_FILES = {
  dracula: ['manifests-act1.js','manifests-act2.js','manifests-act3.js','manifests-act4.js','manifests-act5.js'],
  frankenstein: ['manifests-frankenstein-act1.js','manifests-frankenstein-act2.js','manifests-frankenstein-act3.js','manifests-frankenstein-act4.js','manifests-frankenstein-act5.js'],
  holmes: ['manifests-holmes-act1.js','manifests-holmes-act2.js','manifests-holmes-act3.js','manifests-holmes-act4.js','manifests-holmes-act5.js']
};

// ────────────────────────────────────────────────────────────
// 5. Process each file
// ────────────────────────────────────────────────────────────
let totalReplaced = 0, totalCharacters = 0, errors = [];

for (const [adv, files] of Object.entries(ADV_FILES)) {
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) { errors.push(`File not found: ${file}`); continue; }

    let content = fs.readFileSync(filePath, 'utf8');
    const sceneIds = [...content.matchAll(/"scene_(\d+)":\s*\{/g)].map(m => m[1]);

    for (const sceneNum of sceneIds) {
      const sceneId = `scene_${sceneNum}`;
      const sceneKey = sceneId;

      // ── Add presentCharacters ──
      const chars = SCENE_CHARACTERS[adv]?.[sceneKey];
      if (!chars) { errors.push(`No character mapping for ${adv}/${sceneKey}`); continue; }

      // Check if presentCharacters already exists
      const sceneStart = content.indexOf(`"${sceneId}":`);
      if (sceneStart === -1) continue;

      // Find the description line for this scene
      const descMatch = content.substring(sceneStart).match(/"description":\s*"([^"]{0,50})/);
      if (!descMatch) continue;

      // Find sceneName line to insert presentCharacters after it
      const sceneNamePattern = new RegExp(`"${sceneId}":\\s*\\{[^}]*"sceneName":\\s*"[^"]*",\\s*`);
      const nameMatch = content.substring(sceneStart).match(sceneNamePattern);

      if (nameMatch) {
        // Insert presentCharacters after sceneName line
        const insertPoint = sceneStart + nameMatch.index + nameMatch[0].length;
        const charStr = JSON.stringify(chars);
        const insertText = `    "presentCharacters": ${charStr},\n    `;
        content = content.substring(0, insertPoint) + insertText + content.substring(insertPoint);
        totalCharacters++;
      }

      // ── Replace badChoice ──
      const badChoiceData = BAD_CHOICES[adv]?.[sceneKey];
      if (!badChoiceData) { errors.push(`No bad choice for ${adv}/${sceneKey}`); continue; }

      // Find the badChoice block for this scene (after presentCharacters insertion)
      const updatedSceneStart = content.indexOf(`"${sceneId}":`);
      if (updatedSceneStart === -1) continue;

      // Find badChoice within this scene's scope (next scene or end of file)
      const nextSceneMatch = content.substring(updatedSceneStart + 1).match(/"scene_\d+":\s*\{/);
      const sceneEnd = nextSceneMatch ? updatedSceneStart + 1 + nextSceneMatch.index : content.length;
      const sceneContent = content.substring(updatedSceneStart, sceneEnd);

      const bcStart = sceneContent.indexOf('"badChoice"');
      if (bcStart === -1) { errors.push(`No badChoice in ${adv}/${sceneKey}`); continue; }

      // Find the opening { after "badChoice":
      const colonIdx = sceneContent.indexOf(':', bcStart);
      const braceStart = sceneContent.indexOf('{', colonIdx);
      let depth = 0, braceEnd = -1;
      for (let i = braceStart; i < sceneContent.length; i++) {
        if (sceneContent[i] === '{') depth++;
        if (sceneContent[i] === '}') { depth--; if (depth === 0) { braceEnd = i + 1; break; } }
      }
      if (braceEnd === -1) { errors.push(`Could not find badChoice end for ${adv}/${sceneKey}`); continue; }

      // Build replacement
      const bc = badChoiceData;
      const newBcStr = JSON.stringify(bc, null, 6).replace(/^/gm, '      ').trim();
      const oldBc = sceneContent.substring(bcStart, braceEnd);
      const newBc = `"badChoice": ${newBcStr}`;

      content = content.substring(0, updatedSceneStart + bcStart) + newBc + content.substring(updatedSceneStart + braceEnd);
      totalReplaced++;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}: processed`);
  }
}

console.log(`\n📊 Results: ${totalCharacters} presentCharacters added, ${totalReplaced} badChoices replaced`);
if (errors.length) console.log(`⚠️  ${errors.length} warnings:`, errors.slice(0, 10).join(', '));
