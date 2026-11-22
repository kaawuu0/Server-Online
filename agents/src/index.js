// Master Entry Point for 24/7 Minecraft AI Multi-Agent Colony
const path = require('path');
const fs = require('fs');
const { BotManager } = require('./botManager');
const { MemoryManager } = require('./brain/memory');
const { SkillManager } = require('./brain/skills');
const { LLMProvider } = require('./brain/llmProvider');
const { DashboardServer } = require('./server/dashboardServer');

// Load configuration
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Allow environment variables to dynamically override config (for Render, Cloud, Docker)
if (process.env.MC_HOST) config.server.host = process.env.MC_HOST;
if (process.env.MC_PORT) config.server.port = parseInt(process.env.MC_PORT, 10);
if (process.env.PORT) config.dashboard.port = parseInt(process.env.PORT, 10);
if (process.env.GROQ_API_KEY) {
  config.llm.provider = 'groq';
  config.llm.groqApiKey = process.env.GROQ_API_KEY;
}
if (process.env.GEMINI_API_KEY) {
  config.llm.provider = 'gemini';
  config.llm.geminiApiKey = process.env.GEMINI_API_KEY;
}

// Storage directory
const storageDir = path.resolve(__dirname, '../../memory_storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Instantiate core subsystems
const memoryManager = new MemoryManager(storageDir);
const skillManager = new SkillManager(storageDir);
const llmProvider = new LLMProvider(config.llm);
const dashboardServer = new DashboardServer(config.dashboard.port, memoryManager, skillManager);

dashboardServer.start();

// Connect bots
const botManager = new BotManager(
  config,
  memoryManager,
  skillManager,
  llmProvider,
  (type, data) => dashboardServer.emitUpdate(type, data)
);

botManager.startAll();

// Graceful shutdown handling to preserve memory state
process.on('SIGINT', () => {
  console.log('\n[System] Saving colony memory & skills state before shutdown...');
  memoryManager.save();
  skillManager.save();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[System] Received SIGTERM, persisting state...');
  memoryManager.save();
  skillManager.save();
  process.exit(0);
});
