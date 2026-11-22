// Bot Manager: Lifecycle, Reconnects, Pathfinder, Prismarine 3D Viewer
const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { plugin: collectBlock } = require('mineflayer-collectblock');
const { mineflayer: prismarineViewer } = require('prismarine-viewer');
const { CognitiveLoop } = require('./brain/cognitiveLoop');

class BotManager {
  constructor(config, memoryManager, skillManager, llmProvider, dashboardEmitter) {
    this.config = config;
    this.memory = memoryManager;
    this.skills = skillManager;
    this.llm = llmProvider;
    this.emitDashboard = dashboardEmitter;
    this.bots = new Map();
    this.cognitiveLoops = new Map();
  }

  startAll() {
    console.log(`[BotManager] Initializing ${this.config.agents.length} autonomous agents...`);
    this.config.agents.forEach((agentConfig, idx) => {
      // Stagger connections slightly so the server accepts them smoothly
      setTimeout(() => {
        this.spawnBot(agentConfig);
      }, idx * 4000);
    });
  }

  spawnBot(agentConfig) {
    const { name, viewerPort } = agentConfig;
    console.log(`[BotManager] Connecting ${name} to ${this.config.server.host}:${this.config.server.port}...`);

    const bot = mineflayer.createBot({
      host: this.config.server.host,
      port: this.config.server.port,
      username: name,
      version: this.config.server.version || '1.20.4',
      hideErrors: true
    });

    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);

    bot.once('spawn', () => {
      console.log(`[BotManager] ${name} has spawned in the world!`);

      // Initialize pathfinder movements
      const defaultMove = new Movements(bot);
      defaultMove.canDig = true;
      defaultMove.allowSprinting = true;
      defaultMove.allow1by1towers = false;
      bot.pathfinder.setMovements(defaultMove);

      // Start WebGL 3D Viewer for this bot (allows real-time web observation!)
      try {
        prismarineViewer(bot, { port: viewerPort, firstPerson: true });
        console.log(`[Prismarine-Viewer] ${name}'s 3D live camera listening on port ${viewerPort}`);
      } catch (e) {
        console.warn(`[Prismarine-Viewer] Failed to bind viewer on port ${viewerPort}:`, e.message);
      }

      // Record spawn in memory
      this.memory.addEvent(name, `Awakened at coordinates (${Math.round(bot.entity.position.x)}, ${Math.round(bot.entity.position.y)}, ${Math.round(bot.entity.position.z)})`, 'discovery');

      // Start cognitive loop
      const cognitiveLoop = new CognitiveLoop(
        bot,
        agentConfig,
        this.memory,
        this.skills,
        this.llm,
        (data) => this.emitDashboard('agent_update', data)
      );

      this.cognitiveLoops.set(name, cognitiveLoop);
      cognitiveLoop.start();
    });

    // Listen to in-game chat between agents or players
    bot.on('chat', (username, message) => {
      if (username === name) return;
      this.memory.addEvent(name, `Heard ${username}: "${message}"`, 'chat');
      this.emitDashboard('chat_message', {
        sender: username,
        recipient: name,
        message,
        timestamp: new Date().toLocaleTimeString()
      });
    });

    bot.on('death', () => {
      console.warn(`[BotManager] ${name} died and will respawn!`);
      this.memory.addEvent(name, `Fell in battle, reconstructing physical form.`, 'danger');
      setTimeout(() => {
        try { bot.respawn(); } catch (e) {}
      }, 2000);
    });

    bot.on('kicked', (reason) => {
      console.warn(`[BotManager] ${name} was disconnected:`, reason);
      this.handleReconnect(agentConfig);
    });

    bot.on('error', (err) => {
      console.warn(`[BotManager] ${name} connection error:`, err.message);
      this.handleReconnect(agentConfig);
    });

    bot.on('end', () => {
      console.log(`[BotManager] ${name} connection closed. Scheduling auto-reconnect...`);
      this.handleReconnect(agentConfig);
    });

    this.bots.set(name, bot);
  }

  handleReconnect(agentConfig) {
    const loop = this.cognitiveLoops.get(agentConfig.name);
    if (loop) loop.stop();
    this.cognitiveLoops.delete(agentConfig.name);
    this.bots.delete(agentConfig.name);

    // Exponential backoff reconnect
    setTimeout(() => {
      console.log(`[BotManager] Auto-reconnecting ${agentConfig.name} for 24/7 continuity...`);
      this.spawnBot(agentConfig);
    }, 10000);
  }
}

module.exports = { BotManager };
