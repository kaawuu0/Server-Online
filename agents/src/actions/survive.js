// Survival Actions: Eat, Sleep, Heal, Smelt, Use Furnace
const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

async function eat(bot, memory, agentName) {
  const foods = ['cooked_beef', 'cooked_porkchop', 'cooked_mutton', 'cooked_chicken', 'bread', 'baked_potato', 'cooked_cod', 'cooked_salmon', 'golden_apple', 'apple', 'melon_slice', 'carrot', 'potato', 'sweet_berries', 'dried_kelp', 'cookie', 'beetroot', 'mushroom_stew'];

  for (const foodName of foods) {
    const food = bot.inventory.items().find(i => i.name === foodName);
    if (food) {
      try {
        await bot.equip(food, 'hand');
        await bot.consume();
        memory.addEvent(agentName, `Ate ${foodName} to restore hunger`, 'survival');
        return { success: true, food: foodName };
      } catch (e) {
        continue;
      }
    }
  }

  // Try raw food as last resort
  const rawFoods = ['beef', 'porkchop', 'mutton', 'chicken', 'cod', 'salmon', 'rabbit'];
  for (const rawFood of rawFoods) {
    const food = bot.inventory.items().find(i => i.name === rawFood);
    if (food) {
      try {
        await bot.equip(food, 'hand');
        await bot.consume();
        memory.addEvent(agentName, `Ate raw ${rawFood} (desperate!)`, 'survival');
        return { success: true, food: rawFood, raw: true };
      } catch (e) {
        continue;
      }
    }
  }

  return { success: false, reason: 'no_food' };
}

async function sleepInBed(bot, memory, agentName) {
  const mcData = require('minecraft-data')(bot.version);
  const bedTypes = ['white_bed', 'red_bed', 'blue_bed', 'green_bed', 'yellow_bed', 'black_bed', 'brown_bed', 'cyan_bed', 'gray_bed', 'light_blue_bed', 'light_gray_bed', 'lime_bed', 'magenta_bed', 'orange_bed', 'pink_bed', 'purple_bed'];

  const bedIds = bedTypes.map(n => mcData.blocksByName[n]?.id).filter(Boolean);

  const bed = bot.findBlock({ matching: bedIds, maxDistance: 24 });

  if (bed) {
    try {
      await bot.pathfinder.goto(new goals.GoalNear(bed.position.x, bed.position.y, bed.position.z, 2));
      await bot.sleep(bed);
      memory.addEvent(agentName, `Sleeping through the night in bed`, 'survival');
      return { success: true };
    } catch (e) {
      // bed might be occupied or not night time
      return { success: false, reason: e.message };
    }
  }

  // Check if we can place a bed from inventory
  const bedItem = bot.inventory.items().find(i => i.name.includes('bed'));
  if (bedItem) {
    const ground = bot.blockAt(bot.entity.position.offset(1, -1, 0));
    if (ground && ground.name !== 'air') {
      try {
        await bot.equip(bedItem, 'hand');
        await bot.placeBlock(ground, new Vec3(0, 1, 0));
        const placedBed = bot.findBlock({ matching: bedIds, maxDistance: 3 });
        if (placedBed) {
          await bot.sleep(placedBed);
          memory.addEvent(agentName, `Placed and slept in bed`, 'survival');
          return { success: true };
        }
      } catch (e) {
        return { success: false, reason: e.message };
      }
    }
  }

  return { success: false, reason: 'no_bed' };
}

async function smeltItem(bot, memory, agentName, inputItem, fuelItem) {
  const mcData = require('minecraft-data')(bot.version);
  const furnaceBlock = mcData.blocksByName['furnace'];
  if (!furnaceBlock) return { success: false, reason: 'no_furnace_data' };

  const furnace = bot.findBlock({ matching: furnaceBlock.id, maxDistance: 16 });
  if (!furnace) return { success: false, reason: 'no_furnace_nearby' };

  try {
    await bot.pathfinder.goto(new goals.GoalNear(furnace.position.x, furnace.position.y, furnace.position.z, 2));

    const furnaceEntity = await bot.openFurnace(furnace);

    // Put fuel in
    const fuel = bot.inventory.items().find(i => i.name === (fuelItem || 'coal') || i.name === 'charcoal' || i.name.includes('log') || i.name.includes('planks'));
    if (fuel) {
      await furnaceEntity.putFuel(fuel.type, null, Math.min(fuel.count, 8));
    }

    // Put input in
    const input = bot.inventory.items().find(i => i.name === inputItem);
    if (input) {
      await furnaceEntity.putInput(input.type, null, Math.min(input.count, 8));
    }

    // Wait a bit for smelting (don't block too long)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take output
    const output = furnaceEntity.outputItem();
    if (output) {
      await furnaceEntity.takeOutput();
      memory.addEvent(agentName, `Smelted ${inputItem} → ${output.name}!`, 'crafting');
    }

    furnaceEntity.close();
    return { success: true, input: inputItem };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

async function dropItemsForTeammate(bot, itemName, count, targetPos, memory, agentName) {
  const item = bot.inventory.items().find(i => i.name === itemName);
  if (!item) return { success: false, reason: 'no_item' };

  try {
    await bot.pathfinder.goto(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 2));
    await bot.toss(item.type, null, Math.min(item.count, count));
    memory.addEvent(agentName, `Dropped ${count}x ${itemName} for teammate`, 'social');
    return { success: true, item: itemName, count };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

module.exports = { eat, sleepInBed, smeltItem, dropItemsForTeammate };
