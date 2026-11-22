// Memory and Cognitive Knowledge Store for Minecraft AI Agents
const fs = require('fs');
const path = require('path');

class MemoryManager {
  constructor(storageDir) {
    this.storagePath = path.join(storageDir, 'agent_memories.json');
    this.memories = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
      }
    } catch (e) {
      console.error('Error loading memory file:', e);
    }
    return {
      agents: {
        Aria: {
          recentEvents: [],
          episodicMemories: [],
          socialAffinities: { Boran: 80, Clover: 85 },
          locations: {},
          journal: []
        },
        Boran: {
          recentEvents: [],
          episodicMemories: [],
          socialAffinities: { Aria: 85, Clover: 75 },
          locations: {},
          journal: []
        },
        Clover: {
          recentEvents: [],
          episodicMemories: [],
          socialAffinities: { Aria: 85, Boran: 80 },
          locations: {},
          journal: []
        }
      },
      colonyPointsOfInterest: {
        spawn: null,
        mainShelter: null,
        mineEntrance: null,
        farmPlot: null,
        communalChest: null
      }
    };
  }

  save() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.memories, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to persist memory:', e);
    }
  }

  addEvent(agentName, text, type = 'observation') {
    if (!this.memories.agents[agentName]) {
      this.memories.agents[agentName] = {
        recentEvents: [],
        episodicMemories: [],
        socialAffinities: {},
        locations: {},
        journal: []
      };
    }

    const item = {
      timestamp: new Date().toISOString(),
      type,
      text
    };

    const agent = this.memories.agents[agentName];
    agent.recentEvents.push(item);
    if (agent.recentEvents.length > 20) {
      agent.recentEvents.shift();
    }

    // High significance events become episodic memories
    if (type === 'discovery' || type === 'achievement' || type === 'danger' || type === 'milestone') {
      agent.episodicMemories.unshift(item);
      if (agent.episodicMemories.length > 40) agent.episodicMemories.pop();
      this.save();
    }
  }

  recordPOI(key, coords) {
    this.memories.colonyPointsOfInterest[key] = {
      x: Math.round(coords.x),
      y: Math.round(coords.y),
      z: Math.round(coords.z),
      recordedAt: new Date().toISOString()
    };
    this.save();
  }

  addJournalEntry(agentName, entry) {
    const agent = this.memories.agents[agentName];
    if (agent) {
      agent.journal.unshift({
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        entry
      });
      if (agent.journal.length > 30) agent.journal.pop();
      this.save();
    }
  }

  updateAffinity(agentName, targetAgent, delta, reason) {
    const agent = this.memories.agents[agentName];
    if (agent && agent.socialAffinities[targetAgent] !== undefined) {
      agent.socialAffinities[targetAgent] = Math.min(
        100,
        Math.max(0, agent.socialAffinities[targetAgent] + delta)
      );
      this.addEvent(
        agentName,
        `Bond with ${targetAgent} adjusted (${delta > 0 ? '+' : ''}${delta}) due to: ${reason}`,
        'social'
      );
    }
  }

  getAgentMemoryContext(agentName) {
    const agent = this.memories.agents[agentName] || {};
    return {
      recentEvents: (agent.recentEvents || []).slice(-6),
      keyMemories: (agent.episodicMemories || []).slice(0, 5),
      affinities: agent.socialAffinities || {},
      colonyPOI: this.memories.colonyPointsOfInterest
    };
  }

  getAllData() {
    return this.memories;
  }
}

module.exports = { MemoryManager };
