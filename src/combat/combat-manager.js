/**
 * Combat Manager — Turn-based D&D 5e combat for The Binding.
 *
 * Manages initiative, turn order, HP tracking, attack/damage resolution,
 * enemy AI, and combat end conditions. Uses the rule engine for all math.
 */

const RuleEngine = require('../rule-engine');
const { DynamicDifficulty, TIERS, NARRATIVE_WRAPPERS } = require('../difficulty/dynamic-difficulty');
const { damageDurability, damageEquippedDurability } = require('../inventory/inventory');

// ── Enemy Templates ─────────────────────────────────────────────────────────

const ENEMY_TEMPLATES = {
  wolf:           { name: 'Wolf',             hp: 11,  ac: 13, attackBonus: 4, damageDice: '2d4', damageMod: 2, cr: 0.25 },
  giant_spider:   { name: 'Giant Spider',     hp: 26,  ac: 14, attackBonus: 5, damageDice: '1d8', damageMod: 3, poisonDc: 11, cr: 1 },
  cultist:        { name: 'Cultist',           hp: 9,   ac: 12, attackBonus: 3, damageDice: '1d6', damageMod: 1, cr: 0.125 },
  vampire_spawn:  { name: 'Vampire Spawn',    hp: 82,  ac: 15, attackBonus: 6, damageDice: '1d6', damageMod: 4, regeneration: 10, cr: 5 },
  vampire_bride:  { name: "Dracula's Bride",  hp: 82,  ac: 15, attackBonus: 7, damageDice: '2d6', damageMod: 4, regeneration: 10, charmDc: 14, cr: 7 },
  renfield:       { name: 'Renfield',         hp: 33,  ac: 12, attackBonus: 3, damageDice: '1d6', damageMod: 1, cr: 1 },
  dracula:        { name: 'Count Dracula',    hp: 144, ac: 16, attackBonus: 9, damageDice: '3d6', damageMod: 5, regeneration: 20, charmDc: 17, legendary: true, cr: 13 },
  rat_swarm:      { name: 'Swarm of Rats',    hp: 24,  ac: 10, attackBonus: 2, damageDice: '2d6', damageMod: 0, cr: 0.25 },
  gypsy_guard:    { name: 'Gypsy Guard',     hp: 22,  ac: 14, attackBonus: 4, damageDice: '1d8', damageMod: 2, cr: 0.5 },
};

// ── Combat Creation ─────────────────────────────────────────────────────────

/**
 * Start a new combat encounter.
 * @param {object} playerChar — character from the session (needs stats, hp, ac)
 * @param {Array} enemySpecs — [{ template: 'wolf', count: 3 }] or [{ template: 'wolf', name: 'Alpha Wolf', hp: 20 }]
 * @param {DynamicDifficulty} [difficulty] — optional difficulty instance for rubber-band scaling
 * @returns {object} combat state
 */
function startCombat(playerChar, enemySpecs, difficulty, inventory) {
  const enemies = [];
  let enemyIndex = 0;

  for (const spec of enemySpecs) {
    const tmpl = ENEMY_TEMPLATES[spec.template] || ENEMY_TEMPLATES.wolf;
    const count = spec.count || 1;
    for (let i = 0; i < count; i++) {
      const id = `enemy_${enemyIndex++}`;
      const baseHp = spec.hp || tmpl.hp;
      const baseAttackBonus = spec.attackBonus || tmpl.attackBonus;

      enemies.push({
        id,
        name: count > 1 ? `${tmpl.name} ${i + 1}` : (spec.name || tmpl.name),
        template: spec.template,
        hp: { current: baseHp, max: baseHp },
        ac: spec.ac || tmpl.ac,
        attackBonus: baseAttackBonus,
        damageDice: spec.damageDice || tmpl.damageDice,
        damageMod: spec.damageMod || tmpl.damageMod,
        regeneration: tmpl.regeneration || 0,
        charmDc: tmpl.charmDc || 0,
        alive: true
      });
    }
  }

  // Apply difficulty scaling if a DynamicDifficulty instance is provided
  let difficultyTier = null;
  if (difficulty) {
    difficultyTier = difficulty.getNextTier();
    for (const enemy of enemies) {
      switch (difficultyTier) {
        case TIERS.POWER_WINDOW:
          // Reduce enemy HP by 20%, reduce attack bonus by 1
          enemy.hp.max = Math.max(1, Math.floor(enemy.hp.max * 0.8));
          enemy.hp.current = Math.min(enemy.hp.current, enemy.hp.max);
          enemy.attackBonus = Math.max(0, enemy.attackBonus - 1);
          break;
        case TIERS.CHALLENGE:
          // Increase enemy HP by 20%, increase attack bonus by 1
          enemy.hp.max = Math.floor(enemy.hp.max * 1.2);
          enemy.hp.current = enemy.hp.max;
          enemy.attackBonus = enemy.attackBonus + 1;
          break;
        case TIERS.FAIR:
        default:
          // No change
          break;
      }
    }
  }

  // Derive player AC from stats if not set
  const playerDexMod = playerChar.stats
    ? Math.floor(((playerChar.stats.dexterity || playerChar.stats.dex || 10) - 10) / 2)
    : 0;
  const playerAC = playerChar.ac || (10 + playerDexMod);
  const playerAttackBonus = playerChar.attackBonus || (playerDexMod + 2); // proficiency at level 1-4

  const playerCombatant = {
    id: 'player',
    name: playerChar.name || 'Hero',
    hp: { current: playerChar.hp?.current || 10, max: playerChar.hp?.max || 10 },
    ac: playerAC,
    attackBonus: playerAttackBonus,
    damageDice: playerChar.damageDice || '1d8',
    damageMod: playerChar.damageMod || Math.floor(((playerChar.stats?.strength || playerChar.stats?.str || 10) - 10) / 2),
    isPlayer: true,
    alive: true
  };

  // Roll initiative for everyone
  const allCombatants = [playerCombatant, ...enemies];
  const turnOrder = allCombatants.map(c => {
    const dexMod = c.isPlayer
      ? playerDexMod
      : Math.floor((12 - 10) / 2); // default +1 for enemies
    const roll = RuleEngine.rollD20(dexMod);
    return {
      id: c.id,
      name: c.name,
      initiative: roll.total,
      isPlayer: !!c.isPlayer
    };
  }).sort((a, b) => b.initiative - a.initiative);

  const combatLog = [];

  // Add difficulty narrative wrapper as the first log entry
  if (difficultyTier) {
    const wrapper = difficulty.getNarrativeWrapper(difficultyTier);
    combatLog.push({
      actor: 'system',
      action: 'difficulty',
      tier: difficultyTier,
      description: wrapper
    });
  }

  return {
    active: true,
    round: 1,
    currentTurnIndex: 0,
    turnOrder,
    player: playerCombatant,
    enemies,
    log: combatLog,
    outcome: null,
    difficultyTier,
    inventory: inventory || null
  };
}

// ── Turn Processing ─────────────────────────────────────────────────────────

/**
 * Get whose turn it is.
 */
function getCurrentCombatant(combat) {
  if (!combat.active) return null;
  const entry = combat.turnOrder[combat.currentTurnIndex];
  if (!entry) return null;
  if (entry.isPlayer) return combat.player;
  return combat.enemies.find(e => e.id === entry.id) || null;
}

/**
 * Process a player's combat action.
 * @param {object} combat — current combat state
 * @param {string} action — 'attack' | 'defend' | 'cast' | 'flee' | 'use_item'
 * @param {object} [options] — extra data (e.g. { spell: 'sacred_flame', item: 'holy_water' })
 * @param {DynamicDifficulty} [difficulty] — optional difficulty instance to record outcomes
 * @returns {object} { combat, narrative, diceRolls }
 */
function processPlayerAction(combat, action, options = {}, difficulty) {
  if (!combat.active) return { combat, narrative: 'Combat is already over.', diceRolls: [] };

  const log = [];
  const diceRolls = [];
  const player = combat.player;

  // --- Player's Turn ---
  switch (action) {
    case 'attack': {
      // Pick first alive enemy
      const target = combat.enemies.find(e => e.alive);
      if (!target) break;

      const atkRoll = RuleEngine.makeAttackRoll({
        attackBonus: player.attackBonus,
        targetAC: target.ac
      });
      diceRolls.push({ type: 'attack', ...atkRoll });

      if (atkRoll.isHit) {
        const dmg = RuleEngine.rollDamage({ dice: player.damageDice, modifier: player.damageMod });
        diceRolls.push({ type: 'damage', ...dmg });
        target.hp.current = Math.max(0, target.hp.current - dmg.total);
        if (target.hp.current <= 0) target.alive = false;

        // Damage weapon durability on successful hit
        if (combat.inventory && combat.inventory.equipment.weapon) {
          const wpnSlot = combat.inventory.equipment.weapon;
          const wpnDur = damageDurability(combat.inventory, wpnSlot.id, 1);
          if (wpnDur.broke) {
            log.push({
              actor: 'system',
              action: 'item_break',
              target: wpnSlot.name || wpnSlot.id,
              description: `Your ${wpnSlot.name || wpnSlot.id} shatters from the strain of combat!`
            });
          }
        }

        log.push({
          actor: player.name,
          action: 'attack',
          target: target.name,
          hit: true,
          isCrit: atkRoll.isCrit,
          damage: dmg.total,
          description: atkRoll.isCrit
            ? `Critical hit! You strike ${target.name} with devastating force for ${dmg.total} damage!`
            : `You strike ${target.name} for ${dmg.total} damage. ${target.alive ? `${target.name} staggers — ${target.hp.current} HP remaining.` : `${target.name} collapses!`}`
        });
      } else {
        log.push({
          actor: player.name,
          action: 'attack',
          target: target.name,
          hit: false,
          isCrit: false,
          damage: 0,
          description: `Your attack glances off ${target.name}'s defenses. ${atkRoll.isFumble ? 'A fumble!' : 'A near miss.'}`
        });
      }
      break;
    }

    case 'defend': {
      player._defending = true;
      log.push({
        actor: player.name,
        action: 'defend',
        description: 'You raise your guard, bracing for the next attack. Your defenses are bolstered — advantage on your next save.'
      });
      break;
    }

    case 'cast': {
      // Simple sacred flame / fire bolt equivalent
      const target = combat.enemies.find(e => e.alive);
      if (!target) break;

      const spellDc = 8 + 2 + Math.floor(((player.char?.stats?.wisdom || player.char?.stats?.wis || 10) - 10) / 2);
      const saveRoll = RuleEngine.makeSavingThrow({ ability: 'dexterity', dc: spellDc, modifier: 1 });
      diceRolls.push({ type: 'save', ...saveRoll });

      if (!saveRoll.isSave) {
        const dmg = RuleEngine.rollDamage({ dice: '2d6', modifier: 0, type: 'radiant' });
        diceRolls.push({ type: 'damage', ...dmg });
        target.hp.current = Math.max(0, target.hp.current - dmg.total);
        if (target.hp.current <= 0) target.alive = false;
        log.push({
          actor: player.name,
          action: 'cast',
          target: target.name,
          hit: true,
          damage: dmg.total,
          description: `Divine light erupts from your hands, searing ${target.name} for ${dmg.total} radiant damage! ${target.alive ? `${target.hp.current} HP remaining.` : `${target.name} falls!`}`
        });
      } else {
        log.push({
          actor: player.name,
          action: 'cast',
          target: target.name,
          hit: false,
          damage: 0,
          description: `You channel divine energy, but ${target.name} dodges the blast.`
        });
      }
      break;
    }

    case 'flee': {
      // DEX check DC 12
      const fleeDex = Math.floor(((player.char?.stats?.dexterity || player.char?.stats?.dex || 10) - 10) / 2);
      const fleeRoll = RuleEngine.rollD20(fleeDex + 2); // advantage on flee
      diceRolls.push({ type: 'check', ...fleeRoll });

      if (fleeRoll.total >= 12) {
        combat.active = false;
        combat.outcome = 'fled';
        log.push({
          actor: player.name,
          action: 'flee',
          success: true,
          description: `You seize the moment and bolt! (${fleeRoll.total}) The darkness swallows you as you sprint to safety.`
        });
      } else {
        log.push({
          actor: player.name,
          action: 'flee',
          success: false,
          description: `You try to flee but your pursuers cut you off! (${fleeRoll.total}) You're trapped.`
        });
      }
      break;
    }

    default: {
      log.push({
        actor: player.name,
        action: action,
        description: 'You hesitate, unsure what to do. The moment passes.'
      });
    }
  }

  // Check if all enemies are dead
  if (combat.active && combat.enemies.every(e => !e.alive)) {
    combat.active = false;
    combat.outcome = 'victory';
    log.push({
      actor: 'system',
      action: 'victory',
      description: 'The dust settles. You are victorious!'
    });
  }

  // If combat ended (fled or victory), return early — record outcome if difficulty provided
  if (!combat.active) {
    if (difficulty && combat.outcome !== 'fled') {
      difficulty.recordOutcome(combat.outcome, combat.player.hp.current, combat.player.hp.max, combat.enemies.length);
    }
    combat.log.push(...log);
    return { combat, narrative: log.map(l => l.description).join('\n\n'), diceRolls };
  }

  // --- Enemy Turns ---
  // Skip to next enemy after player
  for (const entry of combat.turnOrder) {
    if (entry.isPlayer) continue;
    const enemy = combat.enemies.find(e => e.id === entry.id);
    if (!enemy || !enemy.alive) continue;

    // Regeneration
    if (enemy.regeneration > 0) {
      const oldHp = enemy.hp.current;
      enemy.hp.current = Math.min(enemy.hp.max, enemy.hp.current + enemy.regeneration);
      if (enemy.hp.current > oldHp) {
        log.push({
          actor: enemy.name,
          action: 'regenerate',
          description: `${enemy.name} regenerates ${enemy.hp.current - oldHp} hit points.`
        });
      }
    }

    // Attack the player
    const defMod = player._defending ? 2 : 0;
    const effectiveAC = player.ac + defMod;
    const atkRoll = RuleEngine.makeAttackRoll({
      attackBonus: enemy.attackBonus,
      targetAC: effectiveAC
    });
    diceRolls.push({ type: 'enemy_attack', attacker: enemy.name, ...atkRoll });

    if (atkRoll.isHit) {
      const dmg = RuleEngine.rollDamage({ dice: enemy.damageDice, modifier: enemy.damageMod });
      diceRolls.push({ type: 'enemy_damage', ...dmg });
      player.hp.current = Math.max(0, player.hp.current - dmg.total);

      // Damage armor durability when player is hit
      if (combat.inventory && combat.inventory.equipment.armor) {
        const armSlot = combat.inventory.equipment.armor;
        const armDur = damageEquippedDurability(combat.inventory, 'armor', 1);
        if (armDur.broke) {
          log.push({
            actor: 'system',
            action: 'item_break',
            target: armSlot.name || armSlot.id,
            description: `Your ${armSlot.name || armSlot.id} breaks under the blow!`
          });
        }
      }

      log.push({
        actor: enemy.name,
        action: 'attack',
        target: player.name,
        hit: true,
        isCrit: atkRoll.isCrit,
        damage: dmg.total,
        description: atkRoll.isCrit
          ? `${enemy.name} lands a brutal critical hit on you for ${dmg.total} damage! ${player.hp.current} HP remaining.`
          : `${enemy.name} strikes you for ${dmg.total} damage. ${player.hp.current} HP remaining.`
      });
    } else {
      log.push({
        actor: enemy.name,
        action: 'attack',
        target: player.name,
        hit: false,
        description: `${enemy.name} lunges at you but misses!`
      });
    }

    // Check if player is down
    if (player.hp.current <= 0) {
      combat.active = false;
      combat.outcome = 'defeat';
      log.push({
        actor: 'system',
        action: 'defeat',
        description: 'Darkness closes in around you. You have fallen...'
      });
      // Record defeat outcome if difficulty provided
      if (difficulty) {
        difficulty.recordOutcome('defeat', player.hp.current, player.hp.max, combat.enemies.length);
      }
      break;
    }
  }

  // Clear defend flag after enemy turns
  player._defending = false;

  // Advance round
  combat.round++;

  combat.log.push(...log);
  return { combat, narrative: log.map(l => l.description).join('\n\n'), diceRolls };
}

/**
 * Get a player-friendly summary of the combat state.
 */
function getCombatSummary(combat) {
  return {
    active: combat.active,
    round: combat.round,
    outcome: combat.outcome,
    player: {
      name: combat.player.name,
      hp: combat.player.hp,
      ac: combat.player.ac
    },
    enemies: combat.enemies.map(e => ({
      id: e.id,
      name: e.name,
      hp: e.hp,
      ac: e.ac,
      alive: e.alive
    })),
    turnOrder: combat.turnOrder.map(t => ({
      name: t.name,
      initiative: t.initiative,
      isPlayer: t.isPlayer,
      isCurrent: combat.turnOrder[combat.currentTurnIndex] === t
    }))
  };
}

module.exports = {
  ENEMY_TEMPLATES,
  DynamicDifficulty,
  startCombat,
  getCurrentCombatant,
  processPlayerAction,
  getCombatSummary
};
