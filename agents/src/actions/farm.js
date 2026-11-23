// Farming System: Till, Plant, Harvest, Replant Cycle
const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

async function farmCycle(bot, memory, agentName) {
  const mcData = require('minecraft-data')(bot.version);

  // Step 1: Try to harvest mature crops first
  const harvestResult = await harvestCrops(bot, memory, agentName);
  if (harvestResult.success) return harvestResult;

  // Step 2: Try to plant seeds on farmland
  const plantResult = await plantSeeds(bot, memory, agentName);
  if (plantResult.success) return plantResult;

  // Step 3: Create new farmland by tilling
  const tillResult = await tillSoil(bot, memory, agentName);
  if (tillResult.success) return tillResult;

  return { success: false, reason: 'nothing_to_farm' };
}

async function harvestCrops(bot, memory, agentName) {
  const mcData = require('minecraft-data')(bot.version);

  const cropTypes = [
    { name: 'wheat', mature: 7 },
    { name: 'carrots', mature: 7 },
    { name: 'potatoes', mature: 7 },
    { name: 'beetroots', mature: 3 }
  ];

  for (const crop of cropTypes) {
    const block = mcData.blocksByName[crop.name];
    if (!block) continue;

    const mature = bot.findBlock({
      matching: block.id,
      maxDistance: 20,
      useExtraInfo: (b) => b.metadata >= crop.mature
    });

    if (mature) {
      try {
        await bot.pathfinder.goto(new goals.GoalNear(mature.position.x, mature.position.y, mature.position.z, 2));
        await bot.dig(mature);
        memory.addEvent(agentName, `Harvested mature ${crop.name}!`, 'gathering');
        memory.recordResourceLocation(agentName, 'farm', mature.position);
        return { success: true, action: 'harvest', crop: crop.name };
      } catch (e) {
        continue;
      }
    }
  }

  return { success: false, reason: 'no_mature_crops' };
}

async function plantSeeds(bot, memory, agentName) {
  const mcData = require('minecraft-data')(bot.version);
  const farmlandBlock = mcData.blocksByName['farmland'];
  if (!farmlandBlock) return { success: false, reason: 'no_farmland_data' };

  // Find empty farmland
  const farmland = bot.findBlock({
    matching: farmlandBlock.id,
    maxDistance: 16,
    useExtraInfo: (b) => {
      // Check if the block above is air (empty farmland)
      const above = bot.blockAt(b.position.offset(0, 1, 0));
      return above && above.name === 'air';
    }
  });

  if (!farmland) return { success: false, reason: 'no_empty_farmland' };

  // Find seeds to plant
  const seedTypes = ['wheat_seeds', 'carrot', 'potato', 'beetroot_seeds'];
  const seed = bot.inventory.items().find(i => seedTypes.includes(i.name));
  if (!seed) return { success: false, reason: 'no_seeds' };

  try {
    await bot.pathfinder.goto(new goals.GoalNear(farmland.position.x, farmland.position.y, farmland.position.z, 2));
    await bot.equip(seed, 'hand');
    await bot.placeBlock(farmland, new Vec3(0, 1, 0));
    memory.addEvent(agentName, `Planted ${seed.name} on farmland`, 'farming');
    return { success: true, action: 'plant', seed: seed.name };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

async function tillSoil(bot, memory, agentName) {
  const mcData = require('minecraft-data')(bot.version);

  // Need a hoe
  const hoe = bot.inventory.items().find(i => i.name.includes('hoe'));
  if (!hoe) return { success: false, reason: 'no_hoe' };

  // Find grass/dirt near water
  const dirtTypes = ['grass_block', 'dirt'].map(n => mcData.blocksByName[n]?.id).filter(Boolean);
  const waterBlock = mcData.blocksByName['water'];

  // Find dirt near water (within 4 blocks of water)
  const dirt = bot.findBlock({
    matching: dirtTypes,
    maxDistance: 16,
    useExtraInfo: (b) => {
      // Check if water is nearby (within 4 blocks horizontally)
      if (!waterBlock) return true; // till anyway
      for (let dx = -4; dx <= 4; dx++) {
        for (let dz = -4; dz <= 4; dz++) {
          const check = bot.blockAt(b.position.offset(dx, 0, dz));
          if (check && check.name === 'water') return true;
          const checkBelow = bot.blockAt(b.position.offset(dx, -1, dz));
          if (checkBelow && checkBelow.name === 'water') return true;
        }
      }
      return false;
    }
  });

  if (!dirt) return { success: false, reason: 'no_suitable_dirt' };

  try {
    await bot.pathfinder.goto(new goals.GoalNear(dirt.position.x, dirt.position.y, dirt.position.z, 2));
    await bot.equip(hoe, 'hand');
    // Right-click (activate) the dirt to till it
    await bot.activateBlock(dirt);
    memory.addEvent(agentName, `Tilled soil for farming`, 'farming');
    return { success: true, action: 'till' };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

module.exports = { farmCycle, harvestCrops, plantSeeds, tillSoil };
