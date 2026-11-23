// V2 Cognitive Loop: Event-Driven + Fast Reactive + Smart Decision Making
const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

// Action modules
const { gatherWood, gatherFood, foragePlants } = require('../actions/gather');
const { mineOre, mineStone, stripMine } = require('../actions/mine');
const { detectThreats, fightNearest, flee } = require('../actions/combat');
const { craftItem, decideCraft, getAvailableCrafts } = require('../actions/craft');
const { buildShelter, placeTorch } = require('../actions/build');
const { farmCycle } = require('../actions/farm');
const { eat, sleepInBed, smeltItem, dropItemsForTeammate } = require('../actions/survive');

class CognitiveLoop {
  constructor(bot, persona, memoryManager, skillManager, llmProvider, dashboardEmitter) {
    this.bot = bot;
    this.persona = persona;
    this.memory = memoryManager;
    this.skills = skillManager;
    this.llm = llmProvider;
    this.emitDashboard = dashboardEmitter;

    this.currentGoal = 'INITIALIZING';
    this.currentThought = 'Waking up in the Minecraft world...';
    this.lastDialogue = '';
    this.isBusy = false;
    this.timer = null;
    this.tickCount = 0;
    this.lastCombatCheck = 0;
    this.consecutiveFailures = 0;
    this.taskQueue = []; // Priority task queue
    this.currentAction = null;
  }

  start() {
    // Main cognitive cycle every 4 seconds (was 7s — now much faster)
    this.timer = setInterval(() => this.cycle(), 4000);
    setTimeout(() => this.cycle(), 2000);

    // Register reactive event handlers (respond instantly to threats)
    this.registerReactiveHandlers();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.removeReactiveHandlers();
  }

  registerReactiveHandlers() {
    // Instant combat response when hurt
    this._onHurt = () => {
      if (this.isBusy) return;
      const threats = detectThreats(this.bot);
      if (threats.length > 0) {
        this.memory.addEvent(this.persona.name, `Taking damage! ${threats[0].name} at ${threats[0].distance.toFixed(0)}m!`, 'danger');
        this.taskQueue.unshift({ priority: 10, type: 'FIGHT', target: threats[0].name });
      }
    };

    // React when teammate chats
    this._onChat = (username, message) => {
      if (username === this.persona.name) return;
      if (['Aria', 'Boran', 'Clover'].includes(username)) {
        // Increase affinity when teammates talk
        this.memory.updateAffinity(this.persona.name, username, 1, 'conversation');
        // If teammate says "help", prioritize helping
        if (message.toLowerCase().includes('help') || message.toLowerCase().includes('danger')) {
          this.taskQueue.unshift({ priority: 8, type: 'HELP_TEAMMATE', target: username });
        }
      }
    };

    // Track mob spawns for situational awareness
    this._onEntitySpawn = (entity) => {
      if (!entity || !entity.name) return;
      const hostiles = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'witch'];
      if (hostiles.includes(entity.name) && entity.position) {
        const dist = entity.position.distanceTo(this.bot.entity.position);
        if (dist < 12) {
          this.memory.recordDangerZone(this.persona.name, entity.position, entity.name);
          if (dist < 6) {
            this.taskQueue.unshift({ priority: 9, type: 'FIGHT', target: entity.name });
          }
        }
      }
    };

    this.bot.on('entityHurt', this._onHurt);
    this.bot.on('chat', this._onChat);
    this.bot.on('entitySpawn', this._onEntitySpawn);
  }

  removeReactiveHandlers() {
    if (this._onHurt) this.bot.removeListener('entityHurt', this._onHurt);
    if (this._onChat) this.bot.removeListener('chat', this._onChat);
    if (this._onEntitySpawn) this.bot.removeListener('entitySpawn', this._onEntitySpawn);
  }

  async cycle() {
    if (!this.bot || !this.bot.entity) return;
    if (this.isBusy) return;

    this.isBusy = true;
    this.tickCount++;

    try {
      // === PHASE 1: Perceive ===
      const state = this.perceive();

      // === PHASE 2: Check for high-priority reactive tasks ===
      const reactiveTask = this.taskQueue.shift();
      if (reactiveTask) {
        await this.executeReactiveTask(reactiveTask, state);
        this.emitTelemetry();
        return;
      }

      // === PHASE 3: Survival checks (highest priority, no LLM needed) ===
      const survivalAction = await this.checkSurvivalNeeds(state);
      if (survivalAction) {
        this.emitTelemetry();
        return;
      }

      // === PHASE 4: Smart decision (heuristic or LLM) ===
      const decision = await this.makeDecision(state);

      this.currentThought = decision.thought;
      this.currentGoal = decision.goal;

      // Speak in chat occasionally
      if (decision.dialogue && decision.dialogue !== this.lastDialogue) {
        this.lastDialogue = decision.dialogue;
        try { this.bot.chat(decision.dialogue); } catch (e) {}
        this.memory.addEvent(this.persona.name, `Said: "${decision.dialogue}"`, 'chat');
      }

      // === PHASE 5: Execute action ===
      await this.executeAction(decision.action, state);

      // === PHASE 6: Learn from results ===
      this.evaluateSkillUnlocks();
      this.consecutiveFailures = 0;

    } catch (err) {
      console.error(`[${this.persona.name}] Cognitive error:`, err.message);
      this.consecutiveFailures++;
      // If stuck, try wandering
      if (this.consecutiveFailures > 3) {
        this.wander();
        this.consecutiveFailures = 0;
      }
    } finally {
      this.isBusy = false;
      this.emitTelemetry();
    }
  }

  perceive() {
    const pos = this.bot.entity.position;
    const isNight = this.bot.time.timeOfDay > 13000 && this.bot.time.timeOfDay < 23000;

    // Detect threats
    const threats = detectThreats(this.bot);

    // Detect nearby teammates
    const teammates = Object.values(this.bot.entities).filter(e => {
      if (!e || e === this.bot.entity || !e.username) return false;
      return ['Aria', 'Boran', 'Clover'].includes(e.username) && e.position.distanceTo(pos) < 30;
    }).map(e => ({ name: e.username, distance: Math.round(e.position.distanceTo(pos)), pos: e.position }));

    // Inventory analysis
    const items = this.bot.inventory.items();
    const invSummary = items.map(i => `${i.name}(x${i.count})`).slice(0, 10).join(', ') || 'Empty';
    const hasWeapon = items.some(i => i.name.includes('sword') || i.name.includes('axe'));
    const hasPickaxe = items.some(i => i.name.includes('pickaxe'));
    const hasFood = items.some(i => ['bread', 'apple', 'cooked_beef', 'cooked_porkchop', 'cooked_chicken', 'carrot', 'potato', 'sweet_berries', 'melon_slice'].includes(i.name));
    const woodCount = items.filter(i => i.name.includes('log')).reduce((s, i) => s + i.count, 0);
    const stoneCount = items.filter(i => i.name.includes('cobblestone') || i.name === 'stone').reduce((s, i) => s + i.count, 0);

    // Check light level at current position
    const currentBlock = this.bot.blockAt(pos);
    const lightLevel = currentBlock ? currentBlock.light : 15;

    return {
      name: this.persona.name,
      role: this.persona.role || this.persona.title,
      personality: this.persona.personality || this.persona.temperament,
      health: Math.round(this.bot.health || 20),
      food: Math.round(this.bot.food || 20),
      pos: { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) },
      biome: this.bot.blockAt(pos)?.biome?.name || 'plains',
      isNight,
      lightLevel,
      threats,
      hostilesCount: threats.length,
      teammates,
      nearbyTeammates: teammates.map(t => t.name),
      inventorySummary: invSummary,
      hasWeapon,
      hasPickaxe,
      hasFood,
      woodCount,
      stoneCount,
      recentEvents: this.memory.getAgentMemoryContext(this.persona.name).recentEvents,
      tickCount: this.tickCount
    };
  }

  async checkSurvivalNeeds(state) {
    // Priority 1: Under attack — fight or flee
    if (state.threats.length > 0 && state.threats[0].distance < 6) {
      this.currentGoal = 'COMBAT';
      this.currentThought = `${state.threats[0].name} is ${state.threats[0].distance.toFixed(0)}m away! Fighting!`;

      if (state.health < 6) {
        // Too weak to fight — flee
        await flee(this.bot, state.threats[0].pos);
        this.memory.addEvent(this.persona.name, `Fleeing from ${state.threats[0].name} at low health!`, 'danger');
        return true;
      }

      await fightNearest(this.bot, this.memory, this.persona.name);
      return true;
    }

    // Priority 2: Starving — eat immediately
    if (state.food < 6) {
      this.currentGoal = 'EAT';
      this.currentThought = `Hunger critical (${state.food}/20). Must eat now!`;
      const result = await eat(this.bot, this.memory, this.persona.name);
      if (!result.success && state.food < 3) {
        // Emergency food gathering
        await gatherFood(this.bot, this.memory, this.persona.name);
      }
      return true;
    }

    // Priority 3: Night + low health — find shelter/bed
    if (state.isNight && state.health < 12) {
      this.currentGoal = 'SHELTER';
      this.currentThought = 'Night time and health is low. Seeking shelter.';
      const sleepResult = await sleepInBed(this.bot, this.memory, this.persona.name);
      if (!sleepResult.success) {
        // No bed, just stay near shelter POI or teammates
        const poi = this.memory.getColonyPOI('mainShelter');
        if (poi) {
          try {
            this.bot.pathfinder.setGoal(new goals.GoalNear(poi.x, poi.y, poi.z, 3));
          } catch (e) {}
        }
      }
      return true;
    }

    return false;
  }

  async executeReactiveTask(task, state) {
    switch (task.type) {
      case 'FIGHT':
        this.currentGoal = 'COMBAT_RESPONSE';
        this.currentThought = `Reactive: Engaging ${task.target}!`;
        await fightNearest(this.bot, this.memory, this.persona.name);
        break;

      case 'HELP_TEAMMATE':
        this.currentGoal = 'HELP_FRIEND';
        this.currentThought = `${task.target} needs help! Moving to assist.`;
        const teammate = state.teammates.find(t => t.name === task.target);
        if (teammate) {
          try {
            this.bot.pathfinder.setGoal(new goals.GoalNear(teammate.pos.x, teammate.pos.y, teammate.pos.z, 3));
            this.bot.chat(`Coming to help you, ${task.target}!`);
          } catch (e) {}
        }
        break;
    }
  }

  async makeDecision(state) {
    // Every 10th cycle, try LLM for richer personality
    if (this.tickCount % 10 === 0) {
      try {
        const llmDecision = await this.llm.generateDecision(state);
        if (llmDecision && llmDecision.thought) return llmDecision;
      } catch (e) {}
    }

    // Smart heuristic engine (fast, zero-cost)
    return this.generateSmartDecision(state);
  }

  generateSmartDecision(state) {
    const { name, health, food, isNight, threats, hasWeapon, hasPickaxe, hasFood, woodCount, stoneCount, inventorySummary, teammates } = state;

    // Check if we can craft something useful
    const craftTarget = decideCraft(this.bot);
    if (craftTarget) {
      return {
        thought: `I have materials to craft ${craftTarget}. This will improve our capabilities.`,
        goal: 'CRAFT_' + craftTarget.toUpperCase(),
        dialogue: this.tickCount % 5 === 0 ? `Crafting ${craftTarget} to level up our gear!` : '',
        action: { type: 'craft', target: craftTarget }
      };
    }

    // Night behavior
    if (isNight) {
      if (threats.length > 0) {
        return {
          thought: `Night combat! ${threats[0].name} spotted at ${threats[0].distance.toFixed(0)}m.`,
          goal: 'NIGHT_DEFENSE',
          dialogue: threats[0].distance < 8 ? `Monster spotted! ${threats[0].name} incoming!` : '',
          action: { type: 'fight' }
        };
      }
      return {
        thought: `Night time. Staying close to base and keeping watch.`,
        goal: 'NIGHT_WATCH',
        dialogue: this.tickCount % 8 === 0 ? 'Keeping watch through the night...' : '',
        action: { type: 'sleep' }
      };
    }

    // === ROLE-SPECIFIC DAY PLANS ===
    if (name === 'Aria') return this.ariaDecision(state);
    if (name === 'Boran') return this.boranDecision(state);
    return this.cloverDecision(state); // Clover default
  }

  ariaDecision(state) {
    const { woodCount, stoneCount, inventorySummary } = state;

    // Phase 1: Gather wood if low
    if (woodCount < 8) {
      return {
        thought: `Colony needs timber (${woodCount} logs). Harvesting trees for construction materials.`,
        goal: 'GATHER_WOOD',
        dialogue: this.tickCount % 6 === 0 ? `Gathering wood for our shelter. ${woodCount} logs so far.` : '',
        action: { type: 'gather_wood' }
      };
    }

    // Phase 2: Build shelter if we have materials
    if (woodCount >= 8 && stoneCount >= 4) {
      return {
        thought: `Materials ready! Time to construct our colony shelter with walls and a roof.`,
        goal: 'BUILD_SHELTER',
        dialogue: this.tickCount % 8 === 0 ? `Starting shelter construction! This will keep us safe at night.` : '',
        action: { type: 'build' }
      };
    }

    // Phase 3: Place torches for safety
    const torchCount = this.bot.inventory.items().filter(i => i.name === 'torch').reduce((s, i) => s + i.count, 0);
    if (torchCount > 0) {
      return {
        thought: `Placing torches to illuminate our area and prevent mob spawns.`,
        goal: 'ILLUMINATE',
        dialogue: '',
        action: { type: 'place_torch' }
      };
    }

    return {
      thought: `Exploring to find better building sites and resources.`,
      goal: 'EXPLORE',
      dialogue: this.tickCount % 10 === 0 ? `Scouting for a good building location.` : '',
      action: { type: 'explore' }
    };
  }

  boranDecision(state) {
    const { stoneCount, hasPickaxe, inventorySummary } = state;

    // Phase 1: Mine stone if low
    if (stoneCount < 12) {
      return {
        thought: `Need cobblestone for tools and furnaces. Mining nearby stone deposits.`,
        goal: 'MINE_STONE',
        dialogue: this.tickCount % 6 === 0 ? `Mining stone. ${stoneCount} cobblestone collected.` : '',
        action: { type: 'mine_stone' }
      };
    }

    // Phase 2: Try to find and mine ores
    if (hasPickaxe) {
      return {
        thought: `Got tools ready. Searching for coal and iron ore veins underground.`,
        goal: 'MINE_ORE',
        dialogue: this.tickCount % 8 === 0 ? `Prospecting for ores. The forge needs raw materials!` : '',
        action: { type: 'mine_ore' }
      };
    }

    // Phase 3: Smelt raw ores if we have them
    const rawIron = this.bot.inventory.items().filter(i => i.name === 'raw_iron').reduce((s, i) => s + i.count, 0);
    if (rawIron > 0) {
      return {
        thought: `Got ${rawIron} raw iron. Need to smelt it into ingots!`,
        goal: 'SMELT',
        dialogue: `Firing up the furnace! Smelting ${rawIron} iron ore.`,
        action: { type: 'smelt', target: 'raw_iron' }
      };
    }

    return {
      thought: `Quarrying for more stone and searching for underground caves.`,
      goal: 'MINE',
      dialogue: '',
      action: { type: 'mine_stone' }
    };
  }

  cloverDecision(state) {
    const { food, hasFood } = state;

    // Phase 1: Farm if we have seeds/hoe
    const hasSeeds = this.bot.inventory.items().some(i => i.name.includes('seed') || i.name === 'carrot' || i.name === 'potato');
    if (hasSeeds) {
      return {
        thought: `Got seeds! Setting up our food supply with farming.`,
        goal: 'FARM',
        dialogue: this.tickCount % 6 === 0 ? `Working the farm. Food security is essential!` : '',
        action: { type: 'farm' }
      };
    }

    // Phase 2: Forage for food
    if (!hasFood) {
      return {
        thought: `Colony needs food! Foraging for berries, apples, and hunting animals.`,
        goal: 'FORAGE_FOOD',
        dialogue: this.tickCount % 6 === 0 ? `Hunting for food. Keep hunger at bay!` : '',
        action: { type: 'gather_food' }
      };
    }

    // Phase 3: Share food with hungry teammates
    const hungryTeammate = state.teammates.find(t => {
      const tmBot = Object.values(this.bot.entities).find(e => e.username === t.name);
      return tmBot; // We'll share regardless since we can't see their food
    });
    if (hungryTeammate && state.teammates.length > 0 && this.tickCount % 15 === 0) {
      return {
        thought: `Checking on teammates and sharing supplies.`,
        goal: 'SHARE_RESOURCES',
        dialogue: `Bringing supplies to the team!`,
        action: { type: 'share', target: hungryTeammate.name }
      };
    }

    // Phase 4: Scout the area
    return {
      thought: `Scouting the perimeter for resources, water, and potential dangers.`,
      goal: 'SCOUT',
      dialogue: this.tickCount % 10 === 0 ? `Mapping the area. Found some interesting terrain!` : '',
      action: { type: 'explore' }
    };
  }

  async executeAction(action, state) {
    if (!action) { this.wander(); return; }

    try {
      switch (action.type) {
        case 'gather_wood':
          const woodResult = await gatherWood(this.bot, this.memory, this.persona.name);
          if (!woodResult.success) this.wander();
          break;

        case 'gather_food':
          const foodResult = await gatherFood(this.bot, this.memory, this.persona.name);
          if (!foodResult.success) await foragePlants(this.bot, this.memory, this.persona.name);
          break;

        case 'mine_stone':
          const stoneResult = await mineStone(this.bot, this.memory, this.persona.name);
          if (!stoneResult.success) this.wander();
          break;

        case 'mine_ore':
          const oreResult = await mineOre(this.bot, this.memory, this.persona.name);
          if (!oreResult.success) await mineStone(this.bot, this.memory, this.persona.name);
          break;

        case 'fight':
          await fightNearest(this.bot, this.memory, this.persona.name);
          break;

        case 'craft':
          if (action.target) {
            const craftResult = await craftItem(this.bot, action.target, this.memory, this.persona.name);
            if (craftResult.success) {
              this.memory.addEvent(this.persona.name, `Successfully crafted ${action.target}!`, 'achievement');
            }
          }
          break;

        case 'build':
          await buildShelter(this.bot, this.memory, this.persona.name);
          break;

        case 'place_torch':
          await placeTorch(this.bot, this.memory, this.persona.name);
          break;

        case 'farm':
          await farmCycle(this.bot, this.memory, this.persona.name);
          break;

        case 'eat':
          await eat(this.bot, this.memory, this.persona.name);
          break;

        case 'sleep':
          const sleepResult = await sleepInBed(this.bot, this.memory, this.persona.name);
          if (!sleepResult.success) {
            // Can't sleep, just patrol nearby
            this.wander();
          }
          break;

        case 'smelt':
          if (action.target) {
            await smeltItem(this.bot, this.memory, this.persona.name, action.target);
          }
          break;

        case 'share':
          if (action.target) {
            const tm = state.teammates.find(t => t.name === action.target);
            if (tm) {
              // Share food
              const foodItem = this.bot.inventory.items().find(i =>
                ['bread', 'apple', 'cooked_beef', 'cooked_porkchop', 'carrot'].includes(i.name)
              );
              if (foodItem) {
                await dropItemsForTeammate(this.bot, foodItem.name, Math.min(foodItem.count, 3), tm.pos, this.memory, this.persona.name);
                this.memory.updateAffinity(this.persona.name, action.target, 3, 'shared resources');
              }
            }
          }
          break;

        case 'retreat':
          const safeDir = new Vec3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20);
          const targetPos = this.bot.entity.position.plus(safeDir);
          try {
            this.bot.pathfinder.setGoal(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 2));
          } catch (e) {}
          break;

        case 'gather':
          await gatherWood(this.bot, this.memory, this.persona.name);
          break;

        case 'mine':
          await mineStone(this.bot, this.memory, this.persona.name);
          break;

        case 'explore':
        default:
          this.smartExplore(state);
          break;
      }
    } catch (err) {
      console.warn(`[${this.persona.name}] Action '${action.type}' failed:`, err.message);
      this.wander();
    }
  }

  smartExplore(state) {
    // Explore towards unexplored areas, biased by role
    const pos = this.bot.entity.position;
    let targetX = pos.x + (Math.random() - 0.5) * 30;
    let targetZ = pos.z + (Math.random() - 0.5) * 30;

    // Don't stray too far from spawn/shelter
    const shelter = this.memory.getColonyPOI('mainShelter');
    if (shelter) {
      const distFromShelter = Math.sqrt(Math.pow(targetX - shelter.x, 2) + Math.pow(targetZ - shelter.z, 2));
      if (distFromShelter > 60) {
        // Pull back towards shelter
        targetX = shelter.x + (Math.random() - 0.5) * 40;
        targetZ = shelter.z + (Math.random() - 0.5) * 40;
      }
    }

    try {
      this.bot.pathfinder.setGoal(new goals.GoalNear(targetX, pos.y, targetZ, 2));
    } catch (e) {}
  }

  wander() {
    try {
      const pos = this.bot.entity.position;
      const rx = (Math.random() - 0.5) * 16;
      const rz = (Math.random() - 0.5) * 16;
      this.bot.pathfinder.setGoal(new goals.GoalNear(pos.x + rx, pos.y, pos.z + rz, 1));
    } catch (e) {}
  }

  evaluateSkillUnlocks() {
    const items = this.bot.inventory.items().map(i => i.name);
    const has = (substr) => items.some(n => n.includes(substr));

    const check = (skillId, condition, reason) => {
      if (condition) {
        const res = this.skills.unlock(this.persona.name, skillId, reason);
        if (res && res.event && this.emitDashboard) {
          this.emitDashboard('skill_unlocked', res.event);
          if (res.leveledUp) {
            try { this.bot.chat(`Colony advanced to Tier ${res.event.colonyLevel}: ${res.colonyTier}!`); } catch (e) {}
          }
        }
      }
    };

    check('wood_harvester', has('log'), 'Wood gathered');
    check('workbench_inventor', has('crafting_table') || has('pickaxe'), 'Tool crafted');
    check('stone_age', has('cobblestone') || has('stone'), 'Stone mined');
    check('illumination', has('torch'), 'Torches crafted');
    check('metallurgy', has('iron'), 'Iron refined');
    check('agrarian', has('seed') || has('wheat') || has('apple'), 'Harvested food');
    check('sentinel', has('sword'), 'Combat weapon prepared');

    // Check for social cohesion (teammates nearby)
    const nearbyBots = Object.values(this.bot.entities).filter(e =>
      e && e.username && ['Aria', 'Boran', 'Clover'].includes(e.username) &&
      e.username !== this.persona.name && e.position &&
      e.position.distanceTo(this.bot.entity.position) < 12
    );
    if (nearbyBots.length >= 2) {
      check('social_cohesion', true, 'Full team assembled');
    }
  }

  emitTelemetry() {
    if (!this.bot || !this.bot.entity) return;
    const pos = this.bot.entity.position;
    const payload = {
      name: this.persona.name,
      title: this.persona.title || this.persona.role,
      color: this.persona.color || '#4ade80',
      viewerPort: this.persona.viewerPort,
      health: Math.round(this.bot.health || 20),
      food: Math.round(this.bot.food || 20),
      pos: { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) },
      currentGoal: this.currentGoal,
      currentThought: this.currentThought,
      lastDialogue: this.lastDialogue,
      skills: this.skills.getAgentSkills(this.persona.name),
      inventory: this.bot.inventory.items().map(i => ({ name: i.name, count: i.count })),
      memories: this.memory.getAgentMemoryContext(this.persona.name),
      tickCount: this.tickCount
    };

    if (this.emitDashboard) {
      this.emitDashboard('agent_update', payload);
    }
  }
}

module.exports = { CognitiveLoop };
