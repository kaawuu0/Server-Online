// Skill Tree and Learning Progression Engine for Minecraft Agents
const fs = require('fs');
const path = require('path');

const ALL_SKILLS = {
  wood_harvester: {
    id: 'wood_harvester',
    title: 'Timberjack',
    category: 'Gathering',
    description: 'Learned the physics of harvesting wood blocks with bare hands.',
    xpValue: 10
  },
  workbench_inventor: {
    id: 'workbench_inventor',
    title: 'Crafting Pioneer',
    category: 'Crafting',
    description: 'Crafted a 3x3 workbench enabling advanced tool production.',
    xpValue: 15
  },
  stone_age: {
    id: 'stone_age',
    title: 'Lithic Mastery',
    category: 'Mining',
    description: 'Transitioned from wood to durable stone tools.',
    xpValue: 20
  },
  spelunker: {
    id: 'spelunker',
    title: 'Deep Spelunker',
    category: 'Exploration',
    description: 'Explored underground caves and extracted fuel resources.',
    xpValue: 25
  },
  illumination: {
    id: 'illumination',
    title: 'Bringer of Light',
    category: 'Survival',
    description: 'Crafted torches to ward off hostile mob spawning.',
    xpValue: 15
  },
  metallurgy: {
    id: 'metallurgy',
    title: 'Iron Age Artisan',
    category: 'Crafting',
    description: 'Smelted raw iron in a blast furnace into solid ingots.',
    xpValue: 35
  },
  agrarian: {
    id: 'agrarian',
    title: 'Green Thumb',
    category: 'Agriculture',
    description: 'Tilled hydrated soil and cultivated wheat for colony bread.',
    xpValue: 20
  },
  architect: {
    id: 'architect',
    title: 'Master Architect',
    category: 'Construction',
    description: 'Erected a structural safehouse with walls, roof, and door.',
    xpValue: 40
  },
  sentinel: {
    id: 'sentinel',
    title: 'Colony Sentinel',
    category: 'Combat',
    description: 'Successfully detected and survived an encounter with monsters.',
    xpValue: 30
  },
  social_cohesion: {
    id: 'social_cohesion',
    title: 'Communal Symbiosis',
    category: 'Social',
    description: 'Exchanged resources and coordinated collective goals with peers.',
    xpValue: 25
  }
};

class SkillManager {
  constructor(storageDir) {
    this.storagePath = path.join(storageDir, 'skills_progress.json');
    this.progress = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
      }
    } catch (e) {
      console.error('Error loading skills file:', e);
    }
    return {
      colonyLevel: 1,
      totalColonyXP: 0,
      agents: {
        Aria: { unlockedSkills: ['wood_harvester'], xp: 10, milestones: [] },
        Boran: { unlockedSkills: ['stone_age'], xp: 20, milestones: [] },
        Clover: { unlockedSkills: ['wood_harvester'], xp: 10, milestones: [] }
      },
      chronicle: []
    };
  }

  save() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.progress, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to persist skills:', e);
    }
  }

  unlock(agentName, skillId, context = '') {
    const skill = ALL_SKILLS[skillId];
    if (!skill) return false;

    if (!this.progress.agents[agentName]) {
      this.progress.agents[agentName] = { unlockedSkills: [], xp: 0, milestones: [] };
    }

    const agentData = this.progress.agents[agentName];
    if (agentData.unlockedSkills.includes(skillId)) return false;

    agentData.unlockedSkills.push(skillId);
    agentData.xp += skill.xpValue;
    this.progress.totalColonyXP += skill.xpValue;
    this.progress.colonyLevel = Math.floor(this.progress.totalColonyXP / 50) + 1;

    const event = {
      timestamp: new Date().toISOString(),
      agent: agentName,
      skillId,
      title: skill.title,
      category: skill.category,
      description: skill.description,
      context
    };

    agentData.milestones.push(event);
    this.progress.chronicle.unshift(event);
    if (this.progress.chronicle.length > 50) this.progress.chronicle.pop();

    this.save();
    return event;
  }

  getAgentSkills(agentName) {
    const data = this.progress.agents[agentName] || { unlockedSkills: [], xp: 0 };
    return data.unlockedSkills.map(id => ALL_SKILLS[id]);
  }

  getAllData() {
    return {
      ...this.progress,
      catalog: ALL_SKILLS
    };
  }
}

module.exports = { SkillManager, ALL_SKILLS };
