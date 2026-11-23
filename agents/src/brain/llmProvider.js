// Multi-Backend LLM Interface: Groq (Free Tier), Gemini (Free Tier), Ollama, and Robust Heuristic Fallback

class LLMProvider {
  constructor(config) {
    this.config = config || {};
  }

  async generateDecision(promptContext) {
    const { provider, groqApiKey, groqModel, geminiApiKey, geminiModel, ollamaHost, ollamaModel } = this.config;

    // 1. Try Groq Free API if key is present
    if (provider === 'groq' && groqApiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: groqModel || 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: this.buildSystemPrompt(promptContext) },
              { role: 'user', content: this.buildUserPrompt(promptContext) }
            ],
            temperature: 0.7,
            max_tokens: 300
          })
        });

        if (response.ok) {
          const data = await response.json();
          const raw = data.choices[0].message.content;
          return this.parseResponse(raw, promptContext);
        }
      } catch (err) {
        console.warn('[LLMProvider] Groq request failed, falling back:', err.message);
      }
    }

    // 2. Try Google Gemini Free API if key is present
    if (provider === 'gemini' && geminiApiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel || 'gemini-1.5-flash'}:generateContent?key=${geminiApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${this.buildSystemPrompt(promptContext)}\n\n${this.buildUserPrompt(promptContext)}`
              }]
            }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const raw = data.candidates[0].content.parts[0].text;
          return this.parseResponse(raw, promptContext);
        }
      } catch (err) {
        console.warn('[LLMProvider] Gemini request failed, falling back:', err.message);
      }
    }

    // 3. Try Local Ollama if configured
    if (provider === 'ollama') {
      try {
        const host = ollamaHost || 'http://127.0.0.1:11434';
        const response = await fetch(`${host}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel || 'llama3.2:3b',
            stream: false,
            messages: [
              { role: 'system', content: this.buildSystemPrompt(promptContext) },
              { role: 'user', content: this.buildUserPrompt(promptContext) }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          return this.parseResponse(data.message.content, promptContext);
        }
      } catch (err) {
        console.warn('[LLMProvider] Ollama request failed, falling back to heuristics:', err.message);
      }
    }

    // 4. Default: Fast, Zero-Cost Autonomous Heuristic Cognitive Engine
    return this.generateHeuristicDecision(promptContext);
  }

  buildSystemPrompt(ctx) {
    return `You are ${ctx.name}, an autonomous human-like Minecraft inhabitant living in a 24/7 collaborative world.
Role: ${ctx.role}
Personality: ${ctx.personality}
Respond in valid JSON format:
{
  "thought": "Your internal reflection on the current situation",
  "goal": "Immediate tactical goal (e.g., GATHER_WOOD, CRAFT_TOOLS, MINE_STONE, BUILD_WALLS, EAT, SLEEP, DEFEND)",
  "dialogue": "Short sentence spoken in Minecraft chat to teammates (or empty string)",
  "action": { "type": "gather_wood|gather_food|mine_stone|mine_ore|craft|build|place_torch|farm|eat|sleep|fight|retreat|explore", "target": "item or block name" }
}`;
  }

  buildUserPrompt(ctx) {
    return `Current State:
- Health: ${ctx.health}/20, Food: ${ctx.food}/20
- Time of Day: ${ctx.isNight ? 'Night (Dangerous)' : 'Day (Productive)'}
- Position: (${ctx.pos.x}, ${ctx.pos.y}, ${ctx.pos.z}) in ${ctx.biome}
- Nearby Teammates: ${ctx.nearbyTeammates.join(', ') || 'None'}
- Hostiles nearby: ${ctx.hostilesCount > 0 ? ctx.hostilesCount + ' monsters!' : 'Clear'}
- Key Inventory: ${ctx.inventorySummary}
- Recent Events: ${ctx.recentEvents.map(e => e.text).join(' | ')}
What is your next move?`;
  }

  parseResponse(text, ctx) {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (e) {
      // Fallback if parsing fails
    }
    return this.generateHeuristicDecision(ctx);
  }

  generateHeuristicDecision(ctx) {
    const { name, health, food, isNight, hostilesCount, inventorySummary } = ctx;

    // Critical priority 1: Survival - Severe danger or hunger
    if (health < 8 || hostilesCount > 1) {
      return {
        thought: `Monsters are too close and my health is at ${health}! I must retreat to the shelter and regenerate.`,
        goal: 'FLEE_AND_RECOVER',
        dialogue: `Hostiles near me! Falling back to safe ground!`,
        action: { type: 'retreat', target: 'shelter' }
      };
    }

    if (food < 7) {
      return {
        thought: `Hunger is dropping (${food}/20). Need to consume provisions before stamina drains.`,
        goal: 'CONSUME_FOOD',
        dialogue: '',
        action: { type: 'eat', target: 'food' }
      };
    }

    // Critical priority 2: Nighttime behavior
    if (isNight) {
      return {
        thought: `Night has fallen across the realm. Hostiles will spawn outdoors. Sticking close to the colony shelter.`,
        goal: 'SHELTER_AND_DEFEND',
        dialogue: `Nighttime is here team. Stay alert and keep torches lit!`,
        action: { type: 'rest', target: 'shelter' }
      };
    }

    // Role-specific day plans
    if (name === 'Aria') {
      const needsWood = !inventorySummary.includes('log');
      if (needsWood) {
        return {
          thought: `We need timber to construct our outpost frame and craft communal storage chests. Harvesting nearby oak.`,
          goal: 'GATHER_WOOD',
          dialogue: `I'm harvesting wood near spawn to prep our shelter blueprints.`,
          action: { type: 'gather', target: 'oak_log' }
        };
      }
      return {
        thought: `Timber inventory secured. Laying cobblestone and plank foundations for our collective shelter.`,
        goal: 'EXPAND_SHELTER',
        dialogue: `Beginning wall placement on the colony base.`,
        action: { type: 'build', target: 'oak_planks' }
      };
    }

    if (name === 'Boran') {
      const hasCobble = inventorySummary.includes('cobblestone');
      if (!hasCobble) {
        return {
          thought: `Need raw stone for furnaces and durable tools. Heading to the outcrop to quarry cobblestone.`,
          goal: 'MINE_STONE',
          dialogue: `Heading to quarry stone. Boran's forge needs raw materials.`,
          action: { type: 'mine', target: 'stone' }
        };
      }
      return {
        thought: `Crafting stone pickaxes and preparing a furnace to smelt any iron veins we unearth.`,
        goal: 'FORGE_TOOLS',
        dialogue: `Smelting furnace is ready. Bring me raw ore if you find any!`,
        action: { type: 'craft', target: 'stone_pickaxe' }
      };
    }

    // Clover (Scout & Botanist)
    return {
      thought: `Surveying surrounding terrain for seed stocks, sweet berries, and farmable land near water.`,
      goal: 'FORAGE_AND_FARM',
      dialogue: `Scouting the perimeter. Clearing ground for our food crops!`,
      action: { type: 'explore', target: 'crops' }
    };
  }
}

module.exports = { LLMProvider };
