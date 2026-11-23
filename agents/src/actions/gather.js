// Fast Resource Gathering (Optimized for Zero-Lag, Real-Time Cadence)
const { goals } = require('mineflayer-pathfinder');

const WOOD_TYPES = ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'cherry_log', 'mangrove_log'];

async function gatherWood(bot, memory, agentName) {
  const mcData = bot.registry || require('minecraft-data')(bot.version);
  const woodIds = WOOD_TYPES.map(n => mcData.blocksByName[n]?.id).filter(Boolean);

  // Fast targeted search: radius 14 max (scans in <5ms instead of 500ms)
  const target = bot.findBlock({
    matching: woodIds,
    maxDistance: 14,
    count: 1
  });

  if (!target) return { success: false, reason: 'no_wood_nearby' };

  memory.recordResourceLocation(agentName, 'wood', target.position);

  try {
    // If not in reach, walk towards target with a 2.5-second cap (never freeze for 8s)
    const dist = bot.entity.position.distanceTo(target.position);
    if (dist > 4.2) {
      await Promise.race([
        bot.pathfinder.goto(new goals.GoalNear(target.position.x, target.position.y, target.position.z, 2)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
      ]);
    }

    // Equip best axe for fast cutting
    equipBestAxe(bot);

    // Look directly at block and dig
    await bot.lookAt(target.position.offset(0.5, 0.5, 0.5));
    if (bot.canDigBlock(target)) {
      await bot.dig(target);
      return { success: true, block: target.name, pos: target.position };
    }
  } catch (e) {
    // If path took too long, try to dig if close enough
    if (bot.entity.position.distanceTo(target.position) <= 4.5 && bot.canDigBlock(target)) {
      try {
        equipBestAxe(bot);
        await bot.dig(target);
        return { success: true, block: target.name, pos: target.position };
      } catch (err) {}
    }
    return { success: false, reason: e.message };
  }
  return { success: false, reason: 'unreachable' };
}

async function gatherFood(bot, memory, agentName) {
  const mcData = bot.registry || require('minecraft-data')(bot.version);
  const crops = ['wheat', 'carrots', 'potatoes', 'beetroots'];
  const cropIds = crops.map(n => mcData.blocksByName[n]?.id).filter(Boolean);

  const crop = bot.findBlock({
    matching: cropIds,
    maxDistance: 14,
    useExtraInfo: (b) => b.metadata >= 7
  });

  if (crop) {
    try {
      if (bot.entity.position.distanceTo(crop.position) > 4) {
        await Promise.race([
          bot.pathfinder.goto(new goals.GoalNear(crop.position.x, crop.position.y, crop.position.z, 2)),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
      }
      await bot.dig(crop);
      memory.recordResourceLocation(agentName, 'farm', crop.position);
      return { success: true, block: crop.name, pos: crop.position };
    } catch (e) {}
  }

  // Hunt passive mobs
  const animals = Object.values(bot.entities).filter(e => {
    if (!e || !e.position) return false;
    const dist = e.position.distanceTo(bot.entity.position);
    return ['cow', 'pig', 'chicken', 'sheep'].includes(e.name) && dist < 12;
  });

  if (animals.length > 0) {
    const target = animals[0];
    try {
      await Promise.race([
        bot.pathfinder.goto(new goals.GoalNear(target.position.x, target.position.y, target.position.z, 2)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
      ]);
      equipBestWeapon(bot);
      bot.attack(target);
      return { success: true, action: 'hunt', target: target.name };
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }

  return { success: false, reason: 'no_food_source' };
}

async function foragePlants(bot, memory, agentName) {
  const mcData = bot.registry || require('minecraft-data')(bot.version);
  const plantTypes = ['dandelion', 'poppy', 'blue_orchid', 'short_grass', 'tall_grass'];
  const plantIds = plantTypes.map(n => mcData.blocksByName[n]?.id).filter(Boolean);

  const plant = bot.findBlock({ matching: plantIds, maxDistance: 12 });
  if (plant) {
    try {
      if (bot.entity.position.distanceTo(plant.position) > 4) {
        await Promise.race([
          bot.pathfinder.goto(new goals.GoalNear(plant.position.x, plant.position.y, plant.position.z, 2)),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
      }
      await bot.dig(plant);
      return { success: true, block: plant.name };
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }
  return { success: false, reason: 'no_plants' };
}

function equipBestAxe(bot) {
  const axes = ['diamond_axe', 'iron_axe', 'stone_axe', 'wooden_axe'];
  for (const a of axes) {
    const item = bot.inventory.items().find(i => i.name === a);
    if (item) {
      try { bot.equip(item, 'hand'); } catch (e) {}
      return true;
    }
  }
  return false;
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

module.exports = { gatherWood, gatherFood, foragePlants, equipBestAxe, equipBestWeapon };
