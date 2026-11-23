// Smart Mining with Tool Selection and Ore Priority
const { goals } = require('mineflayer-pathfinder');

const ORE_PRIORITY = ['diamond_ore', 'deepslate_diamond_ore', 'emerald_ore', 'gold_ore', 'deepslate_gold_ore', 'iron_ore', 'deepslate_iron_ore', 'copper_ore', 'coal_ore', 'deepslate_coal_ore', 'lapis_ore', 'redstone_ore'];
const STONE_TYPES = ['stone', 'cobblestone', 'deepslate', 'andesite', 'diorite', 'granite'];

async function mineOre(bot, memory, agentName) {
  const mcData = require('minecraft-data')(bot.version);

  // Equip best pickaxe first
  equipBestPickaxe(bot);

  // Try ores in priority order
  for (const oreName of ORE_PRIORITY) {
    const block = mcData.blocksByName[oreName];
    if (!block) continue;

    const ore = bot.findBlock({ matching: block.id, maxDistance: 20 });
    if (ore) {
      memory.recordResourceLocation(agentName, oreName, ore.position);
      try {
        // Navigate close
        await bot.pathfinder.goto(new goals.GoalNear(ore.position.x, ore.position.y, ore.position.z, 2));
        await bot.dig(ore);
        return { success: true, ore: oreName, pos: ore.position };
      } catch (e) {
        return { success: false, reason: e.message };
      }
    }
  }

  return { success: false, reason: 'no_ore_nearby' };
}

async function mineStone(bot, memory, agentName) {
  const mcData = require('minecraft-data')(bot.version);
  equipBestPickaxe(bot);

  const stoneIds = STONE_TYPES.map(n => mcData.blocksByName[n]?.id).filter(Boolean);
  const stone = bot.findBlock({ matching: stoneIds, maxDistance: 16 });

  if (stone) {
    try {
      if (bot.collectBlock) {
        await bot.collectBlock.collect(stone, { timeout: 6000 });
      } else {
        await bot.pathfinder.goto(new goals.GoalNear(stone.position.x, stone.position.y, stone.position.z, 2));
        await bot.dig(stone);
      }
      return { success: true, block: stone.name, pos: stone.position };
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }
  return { success: false, reason: 'no_stone_nearby' };
}

async function stripMine(bot, memory, agentName) {
  // Dig down to y=11 (best diamond level for 1.20.4 is actually y=-59, but above y=0 is safer for bots)
  const pos = bot.entity.position;
  const mcData = require('minecraft-data')(bot.version);
  equipBestPickaxe(bot);

  // If we're on the surface, try to mine 3 blocks forward at current level
  const forward = bot.entity.position.offset(
    Math.round(-Math.sin(bot.entity.yaw)) * 3,
    0,
    Math.round(-Math.cos(bot.entity.yaw)) * 3
  );

  try {
    // Mine a 1x2 tunnel forward
    for (let i = 1; i <= 3; i++) {
      const target = bot.entity.position.offset(
        Math.round(-Math.sin(bot.entity.yaw)) * i,
        0,
        Math.round(-Math.cos(bot.entity.yaw)) * i
      );
      const block = bot.blockAt(target);
      if (block && block.name !== 'air' && block.name !== 'water' && block.name !== 'lava') {
        await bot.dig(block);
      }
      // Mine block above too for head clearance
      const blockAbove = bot.blockAt(target.offset(0, 1, 0));
      if (blockAbove && blockAbove.name !== 'air') {
        await bot.dig(blockAbove);
      }
    }
    return { success: true, action: 'strip_mine' };
  } catch (e) {
    return { success: false, reason: e.message };
  }
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

module.exports = { mineOre, mineStone, stripMine, equipBestPickaxe };
