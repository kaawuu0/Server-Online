// Smart Crafting with Recipe Awareness and Tool Progression
const { goals } = require('mineflayer-pathfinder');

// Crafting progression: each tier unlocks after having prerequisites
const CRAFT_RECIPES = {
  // Tier 1: Basic (no table needed, 2x2 grid)
  oak_planks:       { need: { oak_log: 1 }, makes: 4, tier: 1 },
  birch_planks:     { need: { birch_log: 1 }, makes: 4, tier: 1 },
  spruce_planks:    { need: { spruce_log: 1 }, makes: 4, tier: 1 },
  stick:            { need: { oak_planks: 2 }, makes: 4, tier: 1 },
  crafting_table:   { need: { oak_planks: 4 }, makes: 1, tier: 1 },

  // Tier 2: Wood tools (needs crafting table)
  wooden_pickaxe:   { need: { oak_planks: 3, stick: 2 }, makes: 1, tier: 2, table: true },
  wooden_axe:       { need: { oak_planks: 3, stick: 2 }, makes: 1, tier: 2, table: true },
  wooden_sword:     { need: { oak_planks: 2, stick: 1 }, makes: 1, tier: 2, table: true },
  wooden_shovel:    { need: { oak_planks: 1, stick: 2 }, makes: 1, tier: 2, table: true },
  wooden_hoe:       { need: { oak_planks: 2, stick: 2 }, makes: 1, tier: 2, table: true },

  // Tier 3: Stone tools
  stone_pickaxe:    { need: { cobblestone: 3, stick: 2 }, makes: 1, tier: 3, table: true },
  stone_axe:        { need: { cobblestone: 3, stick: 2 }, makes: 1, tier: 3, table: true },
  stone_sword:      { need: { cobblestone: 2, stick: 1 }, makes: 1, tier: 3, table: true },
  stone_shovel:     { need: { cobblestone: 1, stick: 2 }, makes: 1, tier: 3, table: true },
  stone_hoe:        { need: { cobblestone: 2, stick: 2 }, makes: 1, tier: 3, table: true },
  furnace:          { need: { cobblestone: 8 }, makes: 1, tier: 3, table: true },

  // Tier 4: Iron tools and utilities
  iron_pickaxe:     { need: { iron_ingot: 3, stick: 2 }, makes: 1, tier: 4, table: true },
  iron_sword:       { need: { iron_ingot: 2, stick: 1 }, makes: 1, tier: 4, table: true },
  iron_axe:         { need: { iron_ingot: 3, stick: 2 }, makes: 1, tier: 4, table: true },
  bucket:           { need: { iron_ingot: 3 }, makes: 1, tier: 4, table: true },
  shield:           { need: { iron_ingot: 1, oak_planks: 6 }, makes: 1, tier: 4, table: true },

  // Utility items
  torch:            { need: { stick: 1, coal: 1 }, makes: 4, tier: 2 },
  chest:            { need: { oak_planks: 8 }, makes: 1, tier: 2, table: true },
  bed:              { need: { oak_planks: 3, white_wool: 3 }, makes: 1, tier: 3, table: true },
  bread:            { need: { wheat: 3 }, makes: 1, tier: 2, table: true },
};

function hasIngredients(bot, recipe) {
  const inv = bot.inventory.items();
  for (const [itemName, count] of Object.entries(recipe.need)) {
    // Allow any plank type to substitute for oak_planks
    let available;
    if (itemName === 'oak_planks') {
      available = inv.filter(i => i.name.includes('planks')).reduce((s, i) => s + i.count, 0);
    } else {
      available = inv.filter(i => i.name === itemName).reduce((s, i) => s + i.count, 0);
    }
    if (available < count) return false;
  }
  return true;
}

function getAvailableCrafts(bot) {
  const available = [];
  for (const [name, recipe] of Object.entries(CRAFT_RECIPES)) {
    if (hasIngredients(bot, recipe)) {
      available.push({ name, ...recipe });
    }
  }
  return available.sort((a, b) => b.tier - a.tier); // Highest tier first
}

async function craftItem(bot, itemName, memory, agentName) {
  const mcData = require('minecraft-data')(bot.version);
  const recipe = CRAFT_RECIPES[itemName];
  if (!recipe) return { success: false, reason: `unknown_recipe: ${itemName}` };

  if (!hasIngredients(bot, recipe)) {
    return { success: false, reason: 'missing_ingredients', need: recipe.need };
  }

  // Check if we need a crafting table
  if (recipe.table) {
    // Find or place a crafting table
    const tableBlock = bot.findBlock({
      matching: mcData.blocksByName['crafting_table']?.id,
      maxDistance: 16
    });

    if (!tableBlock) {
      // Try to place one from inventory
      const tableItem = bot.inventory.items().find(i => i.name === 'crafting_table');
      if (tableItem) {
        // Find ground block to place on
        const ground = bot.blockAt(bot.entity.position.offset(1, -1, 0));
        if (ground && ground.name !== 'air') {
          try {
            await bot.equip(tableItem, 'hand');
            await bot.placeBlock(ground, new (require('vec3'))(0, 1, 0));
          } catch (e) {
            return { success: false, reason: 'cant_place_table' };
          }
        }
      } else {
        // Need to craft a crafting table first
        if (hasIngredients(bot, CRAFT_RECIPES['crafting_table'])) {
          try {
            const tableRecipe = bot.recipesFor(mcData.itemsByName['crafting_table'].id)[0];
            if (tableRecipe) await bot.craft(tableRecipe, 1);
          } catch (e) {
            return { success: false, reason: 'cant_craft_table' };
          }
        } else {
          return { success: false, reason: 'need_crafting_table' };
        }
      }
    }

    // Now try to craft with the table
    const updatedTable = bot.findBlock({
      matching: mcData.blocksByName['crafting_table']?.id,
      maxDistance: 16
    });

    if (updatedTable) {
      try {
        await bot.pathfinder.goto(new goals.GoalNear(updatedTable.position.x, updatedTable.position.y, updatedTable.position.z, 2));
        const targetItem = mcData.itemsByName[itemName];
        if (!targetItem) return { success: false, reason: 'item_not_found_in_data' };

        const recipes = bot.recipesFor(targetItem.id, null, 1, updatedTable);
        if (recipes.length > 0) {
          await bot.craft(recipes[0], 1, updatedTable);
          memory.addEvent(agentName, `Crafted ${itemName}!`, 'achievement');
          return { success: true, item: itemName };
        }
        return { success: false, reason: 'no_valid_recipe' };
      } catch (e) {
        return { success: false, reason: e.message };
      }
    }
  } else {
    // Simple 2x2 crafting (no table needed)
    try {
      const targetItem = mcData.itemsByName[itemName];
      if (!targetItem) return { success: false, reason: 'item_not_found' };

      const recipes = bot.recipesFor(targetItem.id);
      if (recipes.length > 0) {
        await bot.craft(recipes[0], 1);
        memory.addEvent(agentName, `Crafted ${itemName}`, 'achievement');
        return { success: true, item: itemName };
      }
      return { success: false, reason: 'no_recipe_found' };
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }
}

// Smart auto-craft: figure out what we SHOULD craft based on inventory
function decideCraft(bot) {
  const inv = bot.inventory.items();
  const has = (name) => inv.some(i => i.name === name || i.name.includes(name));
  const count = (name) => inv.filter(i => i.name === name || i.name.includes(name)).reduce((s, i) => s + i.count, 0);

  // Priority crafting decisions
  if (!has('pickaxe') && count('planks') >= 3 && count('stick') >= 2) return 'wooden_pickaxe';
  if (!has('sword') && count('planks') >= 2 && count('stick') >= 1) return 'wooden_sword';
  if (!has('axe') && count('planks') >= 3 && count('stick') >= 2) return 'wooden_axe';
  if (count('log') >= 1 && count('planks') < 4) return 'oak_planks';
  if (count('planks') >= 2 && count('stick') < 4) return 'stick';
  if (!has('crafting_table') && count('planks') >= 4) return 'crafting_table';
  if (!has('pickaxe') && count('cobblestone') >= 3 && count('stick') >= 2) return 'stone_pickaxe';
  if (!has('sword') && count('cobblestone') >= 2 && count('stick') >= 1) return 'stone_sword';
  if (!has('furnace') && count('cobblestone') >= 8) return 'furnace';
  if (count('coal') >= 1 && count('stick') >= 1 && count('torch') < 8) return 'torch';
  if (!has('chest') && count('planks') >= 8) return 'chest';
  if (count('wheat') >= 3 && count('bread') < 4) return 'bread';
  if (count('iron_ingot') >= 3 && !has('iron_pickaxe')) return 'iron_pickaxe';
  if (count('iron_ingot') >= 2 && !has('iron_sword')) return 'iron_sword';

  return null;
}

module.exports = { CRAFT_RECIPES, hasIngredients, getAvailableCrafts, craftItem, decideCraft };
