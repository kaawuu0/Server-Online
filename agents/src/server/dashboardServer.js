// Dashboard HTTP & WebSocket Server for Real-Time Colony Observation
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

class DashboardServer {
  constructor(port, memoryManager, skillManager) {
    this.port = port || 7860;
    this.memory = memoryManager;
    this.skills = skillManager;
    this.agentsState = new Map();

    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    // Serve public frontend
    const publicPath = path.resolve(__dirname, '../../../dashboard/public');
    this.app.use(express.static(publicPath));

    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: { origin: '*' }
    });

    this.setupRoutes();
    this.setupSockets();
  }

  setupRoutes() {
    this.app.get('/api/status', (req, res) => {
      res.json({
        uptime: process.uptime(),
        agents: Array.from(this.agentsState.values()),
        skills: this.skills.getAllData()
      });
    });

    this.app.get('/api/memories', (req, res) => {
      res.json(this.memory.getAllData());
    });

    this.app.get('/api/skills', (req, res) => {
      res.json(this.skills.getAllData());
    });
  }

  setupSockets() {
    this.io.on('connection', (socket) => {
      console.log('[Dashboard] Observer client connected to Mission Control');
      // Send immediate snapshot
      socket.emit('initial_state', {
        agents: Array.from(this.agentsState.values()),
        skills: this.skills.getAllData(),
        memories: this.memory.getAllData()
      });
    });
  }

  emitUpdate(type, data) {
    if (type === 'agent_update') {
      this.agentsState.set(data.name, data);
      this.io.emit('agent_update', data);
    } else if (type === 'chat_message') {
      this.io.emit('chat_message', data);
    } else if (type === 'skill_unlocked') {
      this.io.emit('skill_unlocked', data);
    }
  }

  start() {
    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(` AI COLONY MISSION CONTROL RUNNING AT:`);
      console.log(` -> http://localhost:${this.port}`);
      console.log(` Real-time observation, telemetry, and 3D viewers active!`);
      console.log(`=======================================================`);
    });
  }
}

module.exports = { DashboardServer };
