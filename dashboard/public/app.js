// Frontend Real-Time Telemetry and Socket Client
const socket = io();

// Handle initial full snapshot
socket.on('initial_state', (data) => {
  if (data.skills) {
    updateSkillsUI(data.skills);
  }
  if (data.agents && data.agents.length > 0) {
    data.agents.forEach(agent => updateAgentCard(agent));
  }
});

// Real-time agent tick update
socket.on('agent_update', (agent) => {
  updateAgentCard(agent);
});

// Inter-agent chat message
socket.on('chat_message', (chat) => {
  const container = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.className = 'chat-entry';
  el.innerHTML = `
    <span class="chat-time">${chat.timestamp || 'NOW'} [${chat.sender}]</span>
    <span class="chat-body">${escapeHtml(chat.message)}</span>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
});

// Skill unlocked update
socket.on('skill_unlocked', (event) => {
  addChronicleEntry(`Skill Unlocked: ${event.title}`, `${event.agent} unlocked ${event.title} (${event.category}) - ${event.description}`);
});

function updateAgentCard(agent) {
  const name = agent.name;
  const goalEl = document.getElementById(`goal-${name}`);
  const hpEl = document.getElementById(`hp-${name}`);
  const barHpEl = document.getElementById(`bar-hp-${name}`);
  const foodEl = document.getElementById(`food-${name}`);
  const barFoodEl = document.getElementById(`bar-food-${name}`);
  const posEl = document.getElementById(`pos-${name}`);
  const invEl = document.getElementById(`inv-${name}`);
  const thoughtEl = document.getElementById(`thought-${name}`);

  if (goalEl) goalEl.innerText = agent.currentGoal || 'ACTIVE';
  if (hpEl) hpEl.innerText = agent.health !== undefined ? agent.health : 20;
  if (barHpEl) barHpEl.style.width = `${Math.min(100, ((agent.health || 20) / 20) * 100)}%`;
  if (foodEl) foodEl.innerText = agent.food !== undefined ? agent.food : 20;
  if (barFoodEl) barFoodEl.style.width = `${Math.min(100, ((agent.food || 20) / 20) * 100)}%`;

  if (posEl && agent.pos) {
    posEl.innerText = `(${agent.pos.x}, ${agent.pos.y}, ${agent.pos.z})`;
  }

  if (invEl && agent.inventory) {
    const summary = agent.inventory.map(i => `${i.name} (x${i.count})`).slice(0, 4).join(', ');
    invEl.innerText = summary || 'Empty hands';
  }

  if (thoughtEl && agent.currentThought) {
    thoughtEl.innerText = `"${agent.currentThought}"`;
  }
}

function updateSkillsUI(skillsData) {
  const lvlEl = document.getElementById('colony-level');
  const xpEl = document.getElementById('colony-xp');
  const countEl = document.getElementById('skills-count');
  const gridEl = document.getElementById('skills-grid');

  if (lvlEl) lvlEl.innerText = `LVL ${skillsData.colonyLevel || 1}`;
  if (xpEl) xpEl.innerText = `${skillsData.totalColonyXP || 0} XP`;

  const unlockedIds = new Set();
  Object.values(skillsData.agents || {}).forEach(a => {
    (a.unlockedSkills || []).forEach(s => unlockedIds.add(s));
  });

  if (countEl) countEl.innerText = `${unlockedIds.size} UNLOCKED`;

  if (gridEl && skillsData.catalog) {
    gridEl.innerHTML = '';
    Object.values(skillsData.catalog).forEach(skill => {
      const isUnlocked = unlockedIds.has(skill.id);
      const chip = document.createElement('div');
      chip.className = `skill-chip ${isUnlocked ? 'unlocked' : 'locked'}`;
      chip.innerHTML = `
        <span class="skill-name">${skill.title}</span>
        <span class="skill-cat">${skill.category} ${isUnlocked ? '✓' : '🔒'}</span>
      `;
      gridEl.appendChild(chip);
    });
  }

  // Populate chronicle if any
  if (skillsData.chronicle && skillsData.chronicle.length > 0) {
    const feed = document.getElementById('chronicle-feed');
    feed.innerHTML = '';
    skillsData.chronicle.slice(0, 8).forEach(item => {
      addChronicleEntry(`${item.agent} - ${item.title}`, item.description);
    });
  }
}

function addChronicleEntry(title, desc) {
  const feed = document.getElementById('chronicle-feed');
  const el = document.createElement('div');
  el.className = 'chronicle-entry';
  el.innerHTML = `
    <span class="chronicle-time">${title}</span>
    <p>${escapeHtml(desc)}</p>
  `;
  feed.prepend(el);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}
