// Cognitive Loop for Autonomous Minecraft Agents
const { goals, pathfinder } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

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
  }

  start() {
    // Run cognitive cycle every 7 seconds
    this.timer = setInterval(() => this.cycle(), 7000);
    setTimeout(() => this.cycle(), 2000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  async cycle() {
    if (!this.bot || !this.bot.entity) return;
    if (this.isBusy) return;

    this.isBusy = true;
    try {
      const state = this.perceive();
      const decision = await this.llm.generateDecision(state);

      this.currentThought = decision.thought;
      this.currentGoal = decision.goal;

      // Speak in chat if dialogue is provided and cooldown passed
      if (decision.dialogue && decision.dialogue !== this.lastDialogue) {
        this.lastDialogue = decision.dialogue;
        try {
          this.bot.chat(decision.dialogue);
          this.memory.addEvent(this.persona.name, `Said: "${decision.dialogue}"`, 'chat');
        } catch (e) {}
      }

      // Record thought in memory
      this.memory.addEvent(this.persona.name, `Thought: ${decision.thought}`, 'thought');

      // Execute physical action
      await this.executeAction(decision.action, state);

      // Check skill unlocks based on inventory and experience
      this.evaluateSkillUnlocks();

    } catch (err) {
      console.error(`[${this.persona.name}] Error in cognitive cycle:`, err.message);
    } finally {
      this.isBusy = false;
      this.emitTelemetry();
    }
  }

  perceive() {
    const pos = this.bot.entity.position;
    const isNight = this.bot.time.timeOfDay > 13000 && this.bot.time.timeOfDay < 23000;

    // Detect nearby hostiles
    const hostiles = Object.values(this.bot.entities).filter(e => {
      if (!e || !e.position) return false;
      const dist = e.position.distanceTo(pos);
      const isMob = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'witch'].includes(e.name);
      return isMob && dist < 16;
    });

    // Detect nearby teammates
    const teammates = Object.values(this.bot.entities).filter(e => {
      if (!e || e === this.bot.entity || !e.username) return false;
      return ['Aria', 'Boran', 'Clover'].includes(e.username) && e.position.distanceTo(pos) < 30;
    }).map(e => e.username);

    // Summarize inventory
    const items = this.bot.inventory.items().map(i => `${i.name} (x${i.count})`);
    const invSummary = items.slice(0, 8).join(', ') || 'Empty hands';

    return {
      name: this.persona.name,
      role: this.persona.title,
      personality: this.persona.personality,
      health: Math.round(this.bot.health || 20),
      food: Math.round(this.bot.food || 20),
      pos: { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) },
      biome: this.bot.blockAt(pos)?.biome?.name || 'plains',
      isNight,
      hostilesCount: hostiles.length,
      nearbyTeammates: teammates,
      inventorySummary: invSummary,
      recentEvents: this.memory.getAgentMemoryContext(this.persona.name).recentEvents
    };
  }

  async executeAction(action, state) {
    if (!action) return;

    // Fast-reactive handling
    if (action.type === 'retreat') {
      // Step back or flee
      const safeDir = new Vec3(Math.floor((Math.random() - 0.5) * 10), 0, Math.floor((Math.random() - 0.5) * 10));
      const targetPos = this.bot.entity.position.plus(safeDir);
      try {
        if (this.bot.pathfinder) {
          this.bot.pathfinder.setGoal(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 2));
        }
      } catch (e) {}
      return;
    }

    if (action.type === 'gather') {
      // Find suitable log or target block
      const targetBlock = this.bot.findBlock({
        matching: (block) => block.name.includes('log') || block.name.includes('wood'),
        maxDistance: 16
      });

      if (targetBlock && this.bot.collectBlock) {
        try {
          await this.bot.collectBlock.collect(targetBlock);
          this.skills.unlock(this.persona.name, 'wood_harvester', 'Harvested natural timber');
        } catch (e) {
          // If collectBlock path is obstructed, wander slightly
          this.wander();
        }
      } else {
        this.wander();
      }
      return;
    }

    if (action.type === 'mine') {
      const stoneBlock = this.bot.findBlock({
        matching: (block) => block.name.includes('stone') || block.name.includes('coal_ore') || block.name.includes('iron_ore'),
        maxDistance: 12
      });

      if (stoneBlock && this.bot.collectBlock) {
        try {
          await this.bot.collectBlock.collect(stoneBlock);
          this.skills.unlock(this.persona.name, 'stone_age', 'Excavated geological formations');
        } catch (e) {
          this.wander();
        }
      } else {
        this.wander();
      }
      return;
    }

    if (action.type === 'build' || action.type === 'craft') {
      // Look around purposefully, jump, place or organize
      this.bot.look(this.bot.entity.yaw + 0.3, 0);
      return;
    }

    // Default gentle exploration wander
    this.wander();
  }

  wander() {
    try {
      const rx = (Math.random() - 0.5) * 14;
      const rz = (Math.random() - 0.5) * 14;
      const current = this.bot.entity.position;
      if (this.bot.pathfinder) {
        this.bot.pathfinder.setGoal(new goals.GoalNear(current.x + rx, current.y, current.z + rz, 1));
      }
    } catch (e) {}
  }

  evaluateSkillUnlocks() {
    const items = this.bot.inventory.items().map(i => i.name);
    if (items.some(n => n.includes('log'))) {
      this.skills.unlock(this.persona.name, 'wood_harvester', 'Wood gathered in inventory');
    }
    if (items.some(n => n.includes('crafting_table') || n.includes('pickaxe'))) {
      this.skills.unlock(this.persona.name, 'workbench_inventor', 'Crafting tool unlocked');
    }
    if (items.some(n => n.includes('cobblestone') || n.includes('stone'))) {
      this.skills.unlock(this.persona.name, 'stone_age', 'Stone mined');
    }
    if (items.some(n => n.includes('torch'))) {
      this.skills.unlock(this.persona.name, 'illumination', 'Torches in inventory');
    }
    if (items.some(n => n.includes('iron'))) {
      this.skills.unlock(this.persona.name, 'metallurgy', 'Iron refined');
    }
    if (items.some(n => n.includes('seed') || n.includes('wheat') || n.includes('apple'))) {
      this.skills.unlock(this.persona.name, 'agrarian', 'Foraged plant life');
    }
  }

  emitTelemetry() {
    if (!this.bot || !this.bot.entity) return;
    const pos = this.bot.entity.position;
    const payload = {
      name: this.persona.name,
      title: this.persona.title,
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
      memories: this.memory.getAgentMemoryContext(this.persona.name)
    };

    if (this.emitDashboard) {
      this.emitDashboard(payload);
    }
  }
}

module.exports = { CognitiveLoop };
