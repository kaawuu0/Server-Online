// Combat System: Threat Detection, Weapon Equip, Attack, Retreat
const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

const HOSTILES = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'witch', 'drowned', 'husk', 'stray', 'phantom', 'pillager', 'vindicator', 'ravager', 'warden', 'cave_spider'];
const CREEPER_SAFE_DIST = 5;

function detectThreats(bot) {
  const pos = bot.entity.position;
  const threats = Object.values(bot.entities)
    .filter(e => {
      if (!e || !e.position || !e.name) return false;
      const dist = e.position.distanceTo(pos);
      return HOSTILES.includes(e.name) && dist < 20;
    })
    .map(e => ({
      entity: e,
      name: e.name,
      distance: e.position.distanceTo(pos),
      pos: e.position
    }))
    .sort((a, b) => a.distance - b.distance);

  return threats;
}

async function fightNearest(bot, memory, agentName) {
  const threats = detectThreats(bot);
  if (threats.length === 0) return { success: false, reason: 'no_threats' };

  const target = threats[0];

  // NEVER fight creepers up close — flee instead
  if (target.name === 'creeper' && target.distance < CREEPER_SAFE_DIST) {
    return await flee(bot, target.entity.position);
  }

  // Equip best weapon
  equipBestWeapon(bot);

  try {
    // If close enough, attack
    if (target.distance < 3.5) {
      bot.attack(target.entity);
      memory.addEvent(agentName, `Attacked ${target.name} at distance ${target.distance.toFixed(1)}`, 'combat');
      return { success: true, action: 'attack', target: target.name, distance: target.distance };
    }

    // Chase the target
    await bot.pathfinder.goto(new goals.GoalNear(target.pos.x, target.pos.y, target.pos.z, 2));
    bot.attack(target.entity);
    memory.addEvent(agentName, `Chased and attacked ${target.name}`, 'combat');
    return { success: true, action: 'chase_attack', target: target.name };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

async function flee(bot, threatPos) {
  // Run in opposite direction from threat
  const pos = bot.entity.position;
  const dx = pos.x - threatPos.x;
  const dz = pos.z - threatPos.z;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  const fleeTarget = pos.offset((dx / len) * 15, 0, (dz / len) * 15);

  try {
    bot.pathfinder.setGoal(new goals.GoalNear(fleeTarget.x, fleeTarget.y, fleeTarget.z, 2));
    return { success: true, action: 'flee' };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

async function defendArea(bot, center, radius, memory, agentName) {
  const threats = detectThreats(bot).filter(t => t.pos.distanceTo(center) < radius);
  if (threats.length === 0) return { success: false, reason: 'area_clear' };

  equipBestWeapon(bot);
  const target = threats[0];

  try {
    await bot.pathfinder.goto(new goals.GoalNear(target.pos.x, target.pos.y, target.pos.z, 2));
    bot.attack(target.entity);
    memory.addEvent(agentName, `Defended colony from ${target.name}!`, 'combat');
    return { success: true, action: 'defend', target: target.name };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

function equipBestWeapon(bot) {
  const weapons = ['diamond_sword', 'iron_sword', 'stone_sword', 'wooden_sword', 'diamond_axe', 'iron_axe', 'stone_axe'];
  for (const w of weapons) {
    const item = bot.inventory.items().find(i => i.name === w);
    if (item) {
      try { bot.equip(item, 'hand'); } catch (e) {}
      return true;
    }
  }
  return false;
}

function equipShield(bot) {
  const shield = bot.inventory.items().find(i => i.name === 'shield');
  if (shield) {
    try { bot.equip(shield, 'off-hand'); } catch (e) {}
    return true;
  }
  return false;
}

module.exports = { detectThreats, fightNearest, flee, defendArea, equipBestWeapon, equipShield };
