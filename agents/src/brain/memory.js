// V2 Memory System: Spatial Memory, Danger Zones, Resource Locations, Learning from Failure
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
        const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
        // Migrate old format to new
        for (const name of Object.keys(data.agents || {})) {
          if (!data.agents[name].resourceLocations) data.agents[name].resourceLocations = {};
          if (!data.agents[name].dangerZones) data.agents[name].dangerZones = [];
          if (!data.agents[name].failedActions) data.agents[name].failedActions = [];
          if (!data.agents[name].successfulActions) data.agents[name].successfulActions = {};
        }
        return data;
      }
    } catch (e) {
      console.error('Error loading memory file:', e);
    }
    return this.defaultMemory();
  }

  defaultMemory() {
    const makeAgent = (affinities) => ({
      recentEvents: [],
      episodicMemories: [],
      socialAffinities: affinities,
      locations: {},
      journal: [],
      resourceLocations: {},  // { 'wood': [{x,y,z,time}], 'iron_ore': [{x,y,z,time}] }
      dangerZones: [],        // [{x,y,z,threat,time}]
      failedActions: [],      // [{action,reason,time}]
      successfulActions: {}   // { 'mine_stone': count, 'gather_wood': count }
    });

    return {
      agents: {
        Aria: makeAgent({ Boran: 80, Clover: 85 }),
        Boran: makeAgent({ Aria: 85, Clover: 75 }),
        Clover: makeAgent({ Aria: 85, Boran: 80 })
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
    const agent = this.ensureAgent(agentName);
    const item = {
      timestamp: new Date().toISOString(),
      type,
      text
    };

    agent.recentEvents.push(item);
    if (agent.recentEvents.length > 25) {
      agent.recentEvents.shift();
    }

    // High significance events become episodic (long-term) memories
    if (['discovery', 'achievement', 'danger', 'milestone', 'combat', 'build'].includes(type)) {
      agent.episodicMemories.unshift(item);
      if (agent.episodicMemories.length > 50) agent.episodicMemories.pop();
      this.save();
    }
  }

  // === SPATIAL MEMORY: Remember where resources are ===
  recordResourceLocation(agentName, resourceType, pos) {
    const agent = this.ensureAgent(agentName);
    if (!agent.resourceLocations[resourceType]) {
      agent.resourceLocations[resourceType] = [];
    }

    // Don't duplicate nearby locations
    const existing = agent.resourceLocations[resourceType];
    const nearby = existing.find(loc =>
      Math.abs(loc.x - pos.x) < 5 && Math.abs(loc.z - pos.z) < 5
    );

    if (!nearby) {
      existing.push({
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        z: Math.round(pos.z),
        time: Date.now()
      });
      // Keep max 10 locations per resource type
      if (existing.length > 10) existing.shift();
      this.save();
    }
  }

  getResourceLocations(agentName, resourceType) {
    const agent = this.ensureAgent(agentName);
    return agent.resourceLocations[resourceType] || [];
  }

  getNearestResource(agentName, resourceType, currentPos) {
    const locations = this.getResourceLocations(agentName, resourceType);
    if (locations.length === 0) return null;

    return locations.reduce((nearest, loc) => {
      const dist = Math.sqrt(Math.pow(loc.x - currentPos.x, 2) + Math.pow(loc.z - currentPos.z, 2));
      if (!nearest || dist < nearest.distance) {
        return { ...loc, distance: dist };
      }
      return nearest;
    }, null);
  }

  // === DANGER ZONES: Remember where threats were encountered ===
  recordDangerZone(agentName, pos, threat) {
    const agent = this.ensureAgent(agentName);

    // Don't duplicate nearby danger zones
    const nearby = agent.dangerZones.find(z =>
      Math.abs(z.x - pos.x) < 8 && Math.abs(z.z - pos.z) < 8
    );

    if (!nearby) {
      agent.dangerZones.push({
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        z: Math.round(pos.z),
        threat,
        time: Date.now()
      });
      if (agent.dangerZones.length > 20) agent.dangerZones.shift();
      this.save();
    }
  }

  isNearDangerZone(agentName, pos, radius = 10) {
    const agent = this.ensureAgent(agentName);
    return agent.dangerZones.some(z =>
      Math.abs(z.x - pos.x) < radius && Math.abs(z.z - pos.z) < radius
    );
  }

  // === LEARNING FROM FAILURE ===
  recordFailure(agentName, action, reason) {
    const agent = this.ensureAgent(agentName);
    agent.failedActions.push({
      action,
      reason,
      time: Date.now()
    });
    if (agent.failedActions.length > 30) agent.failedActions.shift();
  }

  recordSuccess(agentName, action) {
    const agent = this.ensureAgent(agentName);
    agent.successfulActions[action] = (agent.successfulActions[action] || 0) + 1;
  }

  getSuccessRate(agentName, action) {
    const agent = this.ensureAgent(agentName);
    const successes = agent.successfulActions[action] || 0;
    const failures = agent.failedActions.filter(f => f.action === action).length;
    const total = successes + failures;
    return total > 0 ? successes / total : 0.5;
  }

  // === COLONY POI ===
  recordPOI(key, coords) {
    this.memories.colonyPointsOfInterest[key] = {
      x: Math.round(coords.x),
      y: Math.round(coords.y),
      z: Math.round(coords.z),
      recordedAt: new Date().toISOString()
    };
    this.save();
  }

  getColonyPOI(key) {
    return this.memories.colonyPointsOfInterest[key] || null;
  }

  // === JOURNAL ===
  addJournalEntry(agentName, entry) {
    const agent = this.ensureAgent(agentName);
    agent.journal.unshift({
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      entry
    });
    if (agent.journal.length > 30) agent.journal.pop();
    this.save();
  }

  // === SOCIAL ===
  updateAffinity(agentName, targetAgent, delta, reason) {
    const agent = this.ensureAgent(agentName);
    if (agent.socialAffinities[targetAgent] !== undefined) {
      agent.socialAffinities[targetAgent] = Math.min(100, Math.max(0, agent.socialAffinities[targetAgent] + delta));
      this.addEvent(agentName, `Bond with ${targetAgent} ${delta > 0 ? 'strengthened' : 'weakened'} (${delta > 0 ? '+' : ''}${delta}): ${reason}`, 'social');
    }
  }

  // === CONTEXT FOR DECISIONS ===
  getAgentMemoryContext(agentName) {
    const agent = this.ensureAgent(agentName);
    return {
      recentEvents: (agent.recentEvents || []).slice(-8),
      keyMemories: (agent.episodicMemories || []).slice(0, 6),
      affinities: agent.socialAffinities || {},
      colonyPOI: this.memories.colonyPointsOfInterest,
      knownResources: Object.keys(agent.resourceLocations || {}),
      dangerZoneCount: (agent.dangerZones || []).length,
      totalSuccesses: Object.values(agent.successfulActions || {}).reduce((s, v) => s + v, 0)
    };
  }

  ensureAgent(agentName) {
    if (!this.memories.agents[agentName]) {
      this.memories.agents[agentName] = {
        recentEvents: [],
        episodicMemories: [],
        socialAffinities: {},
        locations: {},
        journal: [],
        resourceLocations: {},
        dangerZones: [],
        failedActions: [],
        successfulActions: {}
      };
    }
    return this.memories.agents[agentName];
  }

  getAllData() {
    return this.memories;
  }
}

module.exports = { MemoryManager };
