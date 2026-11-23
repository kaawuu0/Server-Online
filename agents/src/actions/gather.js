// Smart Resource Gathering with Spatial Memory
const { goals } = require('mineflayer-pathfinder');

const WOOD_TYPES = ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'cherry_log', 'mangrove_log'];
const FOOD_SOURCES = ['sweet_berry_bush', 'melon', 'pumpkin'];

async function gatherWood(bot, memory, agentName) {
  const mcData = require('minecraft-data')(bot.version);
  const woodIds = WOOD_TYPES.map(n => mcData.blocksByName[n]?.id).filter(Boolean);

  const target = bot.findBlock({
    matching: woodIds,
    maxDistance: 32,
    count: 1
  });

  if (!target) return { success: false, reason: 'no_wood_nearby' };

  // Remember this wood location
  memory.recordResourceLocation(agentName, 'wood', target.position);

  try {
    if (bot.collectBlock) {
      await bot.collectBlock.collect(target, { timeout: 8000 });
    } else {
      await bot.dig(target);
    }
    return { success: true, block: target.name, pos: target.position };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

async function gatherFood(bot, memory, agentName) {
  const mcData = require('minecraft-data')(bot.version);

  // Try to find crops first (wheat, carrots, potatoes, beetroot)
  const crops = ['wheat', 'carrots', 'potatoes', 'beetroots'];
  for (const cropName of crops) {
    const block = mcData.blocksByName[cropName];
    if (!block) continue;
    const crop = bot.findBlock({
      matching: block.id,
      maxDistance: 24,
      useExtraInfo: (b) => b.metadata >= 7 // fully grown
    });
    if (crop) {
      try {
        await bot.dig(crop);
        memory.recordResourceLocation(agentName, 'farm', crop.position);
        return { success: true, block: cropName, pos: crop.position };
      } catch (e) { continue; }
    }
  }

  // Hunt passive mobs for food
  const animals = Object.values(bot.entities).filter(e => {
    if (!e || !e.position) return false;
    const dist = e.position.distanceTo(bot.entity.position);
    return ['cow', 'pig', 'chicken', 'sheep'].includes(e.name) && dist < 20;
  });

  if (animals.length > 0) {
    const target = animals[0];
    try {
      await bot.pathfinder.goto(new goals.GoalNear(target.position.x, target.position.y, target.position.z, 2));
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
  const mcData = require('minecraft-data')(bot.version);

  // Look for flowers, tall_grass (seeds), sugar_cane, etc.
  const plantTypes = ['dandelion', 'poppy', 'blue_orchid', 'sugar_cane', 'bamboo'];
  const plantIds = plantTypes.map(n => mcData.blocksByName[n]?.id).filter(Boolean);

  const plant = bot.findBlock({ matching: plantIds, maxDistance: 24 });
  if (plant) {
    try {
      await bot.dig(plant);
      memory.recordResourceLocation(agentName, 'plants', plant.position);
      return { success: true, block: plant.name };
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }
  return { success: false, reason: 'no_plants' };
}

function equipBestWeapon(bot) {
  const weapons = ['diamond_sword', 'iron_sword', 'stone_sword', 'wooden_sword', 'diamond_axe', 'iron_axe', 'stone_axe', 'wooden_axe'];
  for (const w of weapons) {
    const item = bot.inventory.items().find(i => i.name === w);
    if (item) {
      try { bot.equip(item, 'hand'); } catch (e) {}
      return true;
    }
  }
  return false;
}

module.exports = { gatherWood, gatherFood, foragePlants, equipBestWeapon };
