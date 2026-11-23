// V2 Skill Tree and Progressive Learning Engine for Minecraft Agents
const fs = require('fs');
const path = require('path');

const ALL_SKILLS = {
  wood_harvester: {
    id: 'wood_harvester',
    title: 'Timberjack',
    category: 'Gathering',
    description: 'Harvests timber with bare hands and crafts wood planks.',
    xpValue: 10,
    perk: 'Unlocks wood tools, planks, and sticks crafting recipes'
  },
  workbench_inventor: {
    id: 'workbench_inventor',
    title: 'Crafting Pioneer',
    category: 'Crafting',
    description: 'Crafted a 3x3 workbench enabling advanced tool production.',
    xpValue: 15,
    perk: 'Unlocks 3x3 crafting grid, pickaxes, axes, swords, and chests'
  },
  stone_age: {
    id: 'stone_age',
    title: 'Lithic Mastery',
    category: 'Mining',
    description: 'Transitioned from wood to durable stone tools and furnaces.',
    xpValue: 20,
    perk: 'Stone tools crafting, furnace crafting, and faster stone quarrying'
  },
  spelunker: {
    id: 'spelunker',
    title: 'Deep Spelunker',
    category: 'Exploration',
    description: 'Explored underground caves and extracted coal/iron veins.',
    xpValue: 25,
    perk: 'Cave exploration bravery, deep mining without fear'
  },
  illumination: {
    id: 'illumination',
    title: 'Bringer of Light',
    category: 'Survival',
    description: 'Crafts and places torches to ward off monster spawning.',
    xpValue: 15,
    perk: 'Auto-places torches whenever light level drops below 8'
  },
  metallurgy: {
    id: 'metallurgy',
    title: 'Iron Age Artisan',
    category: 'Crafting',
    description: 'Smelted raw iron in a furnace into solid ingots and tools.',
    xpValue: 35,
    perk: 'Iron tools, shields, buckets, and armor crafting'
  },
  agrarian: {
    id: 'agrarian',
    title: 'Green Thumb',
    category: 'Agriculture',
    description: 'Tilled hydrated soil, harvested crops, and baked bread.',
    xpValue: 20,
    perk: 'Automated planting, hoeing, crop harvesting, and bread baking'
  },
  architect: {
    id: 'architect',
    title: 'Master Architect',
    category: 'Construction',
    description: 'Constructs permanent safehouse with walls, door, and roof.',
    xpValue: 40,
    perk: 'Blueprint-based multi-tier shelter building and door placement'
  },
  sentinel: {
    id: 'sentinel',
    title: 'Colony Sentinel',
    category: 'Combat',
    description: 'Combat mastery against hostile mobs with weapon switching.',
    xpValue: 30,
    perk: 'Active perimeter defense, weapon selection, and shield blocking'
  },
  social_cohesion: {
    id: 'social_cohesion',
    title: 'Communal Symbiosis',
    category: 'Social',
    description: 'Exchanges resources, shares food, and coordinates teamwork.',
    xpValue: 25,
    perk: 'Proactive item sharing, teammate protection, and affinity buffs'
  }
};

const COLONY_TIERS = [
  { level: 1, name: 'Wilderness Strangers', minXP: 0 },
  { level: 2, name: 'Pioneer Encampment', minXP: 40 },
  { level: 3, name: 'Fortified Settlement', minXP: 90 },
  { level: 4, name: 'Thriving Iron Colony', minXP: 160 },
  { level: 5, name: 'Advanced AI Civilization', minXP: 250 }
];

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
      colonyTierName: 'Wilderness Strangers',
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

    // Recalculate colony tier
    const tier = [...COLONY_TIERS].reverse().find(t => this.progress.totalColonyXP >= t.minXP) || COLONY_TIERS[0];
    const leveledUp = tier.level > (this.progress.colonyLevel || 1);
    this.progress.colonyLevel = tier.level;
    this.progress.colonyTierName = tier.name;

    const event = {
      timestamp: new Date().toISOString(),
      agent: agentName,
      skillId,
      title: skill.title,
      category: skill.category,
      description: skill.description,
      perk: skill.perk,
      context,
      colonyLevel: this.progress.colonyLevel,
      colonyTier: this.progress.colonyTierName
    };

    agentData.milestones.push(event);
    this.progress.chronicle.unshift(event);
    if (this.progress.chronicle.length > 50) this.progress.chronicle.pop();

    this.save();
    return { event, leveledUp, colonyTier: tier.name };
  }

  hasSkill(agentName, skillId) {
    const agentData = this.progress.agents[agentName];
    return agentData ? agentData.unlockedSkills.includes(skillId) : false;
  }

  getAgentSkills(agentName) {
    const data = this.progress.agents[agentName] || { unlockedSkills: [], xp: 0 };
    return data.unlockedSkills.map(id => ALL_SKILLS[id]).filter(Boolean);
  }

  getPerks(agentName) {
    const skills = this.getAgentSkills(agentName);
    return skills.map(s => s.perk);
  }

  getAllData() {
    return {
      ...this.progress,
      catalog: ALL_SKILLS,
      tiers: COLONY_TIERS
    };
  }
}

module.exports = { SkillManager, ALL_SKILLS, COLONY_TIERS };
