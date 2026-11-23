// Fast Quarrying and Mining (Optimized for Zero-Lag, Real-Time Cadence)
const { goals } = require('mineflayer-pathfinder');

const ORE_NAMES = ['diamond_ore', 'deepslate_diamond_ore', 'iron_ore', 'deepslate_iron_ore', 'coal_ore', 'deepslate_coal_ore', 'copper_ore', 'gold_ore'];
const STONE_NAMES = ['stone', 'cobblestone', 'deepslate', 'andesite', 'diorite', 'granite'];

async function mineOre(bot, memory, agentName) {
  const mcData = bot.registry || require('minecraft-data')(bot.version);
  equipBestPickaxe(bot);

  // Single-pass scan for any priority ore within 12 blocks
  const oreIds = ORE_NAMES.map(n => mcData.blocksByName[n]?.id).filter(Boolean);
  const ore = bot.findBlock({ matching: oreIds, maxDistance: 12, count: 1 });

  if (!ore) return { success: false, reason: 'no_ore_nearby' };

  memory.recordResourceLocation(agentName, ore.name, ore.position);

  try {
    const dist = bot.entity.position.distanceTo(ore.position);
    if (dist > 4.2) {
      await Promise.race([
        bot.pathfinder.goto(new goals.GoalNear(ore.position.x, ore.position.y, ore.position.z, 2)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
      ]);
    }

    await bot.lookAt(ore.position.offset(0.5, 0.5, 0.5));
    if (bot.canDigBlock(ore)) {
      await bot.dig(ore);
      return { success: true, ore: ore.name, pos: ore.position };
    }
  } catch (e) {
    if (bot.entity.position.distanceTo(ore.position) <= 4.5 && bot.canDigBlock(ore)) {
      try {
        await bot.dig(ore);
        return { success: true, ore: ore.name, pos: ore.position };
      } catch (err) {}
    }
    return { success: false, reason: e.message };
  }
  return { success: false, reason: 'unreachable' };
}

async function mineStone(bot, memory, agentName) {
  const mcData = bot.registry || require('minecraft-data')(bot.version);
  equipBestPickaxe(bot);

  const stoneIds = STONE_NAMES.map(n => mcData.blocksByName[n]?.id).filter(Boolean);
  const stone = bot.findBlock({ matching: stoneIds, maxDistance: 10, count: 1 });

  if (!stone) return { success: false, reason: 'no_stone_nearby' };

  try {
    const dist = bot.entity.position.distanceTo(stone.position);
    if (dist > 4.2) {
      await Promise.race([
        bot.pathfinder.goto(new goals.GoalNear(stone.position.x, stone.position.y, stone.position.z, 2)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
    }

    await bot.lookAt(stone.position.offset(0.5, 0.5, 0.5));
    if (bot.canDigBlock(stone)) {
      await bot.dig(stone);
      return { success: true, block: stone.name, pos: stone.position };
    }
  } catch (e) {
    if (bot.entity.position.distanceTo(stone.position) <= 4.5 && bot.canDigBlock(stone)) {
      try {
        await bot.dig(stone);
        return { success: true, block: stone.name, pos: stone.position };
      } catch (err) {}
    }
    return { success: false, reason: e.message };
  }
  return { success: false, reason: 'unreachable' };
}

function equipBestPickaxe(bot) {
  const picks = ['diamond_pickaxe', 'iron_pickaxe', 'stone_pickaxe', 'wooden_pickaxe'];
  for (const p of picks) {
    const item = bot.inventory.items().find(i => i.name === p);
    if (item) {
      try { bot.equip(item, 'hand'); } catch (e) {}
      return true;
    }
  }
  return false;
}

module.exports = { mineOre, mineStone, equipBestPickaxe };
