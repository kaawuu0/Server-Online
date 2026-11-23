// Building System: Shelter Construction with Blueprint Patterns
const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

// Simple 5x5x4 shelter blueprint (relative to corner origin)
// Each entry: [dx, dy, dz, blockName]
const SHELTER_BLUEPRINT = generateShelterBlueprint();

function generateShelterBlueprint() {
  const blocks = [];
  const W = 5, D = 5, H = 4;

  // Floor
  for (let x = 0; x < W; x++) {
    for (let z = 0; z < D; z++) {
      blocks.push([x, 0, z, 'oak_planks']);
    }
  }

  // Walls (y = 1 to H-1)
  for (let y = 1; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (let z = 0; z < D; z++) {
        // Only edges (walls), skip interior and door position
        if (x === 0 || x === W - 1 || z === 0 || z === D - 1) {
          // Leave door opening at (2, 1, 0) and (2, 2, 0)
          if (x === 2 && z === 0 && y <= 2) continue;
          blocks.push([x, y, z, 'cobblestone']);
        }
      }
    }
  }

  // Roof
  for (let x = 0; x < W; x++) {
    for (let z = 0; z < D; z++) {
      blocks.push([x, H, z, 'oak_planks']);
    }
  }

  return blocks;
}

async function buildShelter(bot, memory, agentName, origin) {
  const mcData = require('minecraft-data')(bot.version);

  if (!origin) {
    // Choose build site near current position
    origin = bot.entity.position.offset(3, 0, 3).floored();
    // Find ground level
    while (bot.blockAt(origin)?.name === 'air' && origin.y > 0) {
      origin = origin.offset(0, -1, 0);
    }
    origin = origin.offset(0, 1, 0); // Build on top of ground
  }

  let placed = 0;
  let failed = 0;

  for (const [dx, dy, dz, blockName] of SHELTER_BLUEPRINT) {
    const targetPos = origin.offset(dx, dy, dz);

    // Check if already built
    const existing = bot.blockAt(targetPos);
    if (existing && existing.name !== 'air' && existing.name !== 'water') continue;

    // Check if we have the material
    const item = bot.inventory.items().find(i => i.name === blockName || i.name.includes(blockName.split('_')[0]));
    if (!item) {
      failed++;
      continue;
    }

    try {
      // Need an adjacent solid block to place against
      const adjacentOffsets = [[0, -1, 0], [0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
      let placedBlock = false;

      for (const [ox, oy, oz] of adjacentOffsets) {
        const adj = bot.blockAt(targetPos.offset(ox, oy, oz));
        if (adj && adj.name !== 'air' && adj.name !== 'water') {
          await bot.pathfinder.goto(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 3));
          await bot.equip(item, 'hand');
          await bot.placeBlock(adj, new Vec3(-ox, -oy, -oz));
          placed++;
          placedBlock = true;
          break;
        }
      }

      if (!placedBlock) failed++;
    } catch (e) {
      failed++;
    }

    // Don't try to place too many in one cycle (performance)
    if (placed >= 5) break;
  }

  if (placed > 0) {
    memory.addEvent(agentName, `Placed ${placed} blocks for shelter construction`, 'build');
    memory.recordPOI('mainShelter', origin);
  }

  return { success: placed > 0, placed, failed, origin };
}

async function placeTorch(bot, memory, agentName) {
  const mcData = require('minecraft-data')(bot.version);
  const torch = bot.inventory.items().find(i => i.name === 'torch');
  if (!torch) return { success: false, reason: 'no_torches' };

  // Find a solid block nearby at eye level to place torch on
  const pos = bot.entity.position.floored();
  const directions = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];

  for (const [dx, dy, dz] of directions) {
    const wall = bot.blockAt(pos.offset(dx, 1, dz));
    if (wall && wall.name !== 'air' && wall.name !== 'water') {
      const airPos = bot.blockAt(pos.offset(0, 1, 0));
      if (airPos && airPos.name === 'air') {
        try {
          await bot.equip(torch, 'hand');
          await bot.placeBlock(wall, new Vec3(-dx, 0, -dz));
          memory.addEvent(agentName, `Placed torch for illumination`, 'build');
          return { success: true };
        } catch (e) {
          continue;
        }
      }
    }
  }

  // Place on ground as floor torch
  const ground = bot.blockAt(pos.offset(0, -1, 0));
  if (ground && ground.name !== 'air') {
    try {
      await bot.equip(torch, 'hand');
      await bot.placeBlock(ground, new Vec3(0, 1, 0));
      return { success: true };
    } catch (e) {}
  }

  return { success: false, reason: 'no_suitable_surface' };
}

async function placeBlock(bot, blockName, position) {
  const item = bot.inventory.items().find(i => i.name === blockName || i.name.includes(blockName));
  if (!item) return { success: false, reason: 'no_block_in_inventory' };

  try {
    await bot.pathfinder.goto(new goals.GoalNear(position.x, position.y, position.z, 3));
    await bot.equip(item, 'hand');

    const below = bot.blockAt(position.offset(0, -1, 0));
    if (below && below.name !== 'air') {
      await bot.placeBlock(below, new Vec3(0, 1, 0));
      return { success: true };
    }
  } catch (e) {
    return { success: false, reason: e.message };
  }
  return { success: false, reason: 'no_reference_block' };
}

module.exports = { buildShelter, placeTorch, placeBlock, SHELTER_BLUEPRINT };
