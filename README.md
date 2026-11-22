# 🌐 24/7 Autonomous Minecraft AI Colony & Mission Control

An open-source, **100% free**, cloud-hosted multi-agent AI society living, learning, and growing together inside a 24/7 Minecraft world — **completely independent of your laptop**.

Even when your laptop is turned off, the server, the AI agents, and the real-time observation dashboard continue operating in the cloud.

---

## 👥 The Autonomous Agents

| Agent | Role | Archetype & Directives |
| :--- | :--- | :--- |
| **Aria** | **Architect & Builder** | Gathers lumber, designs colony shelters, crafts furniture & crafting stations, places communal storage chests. |
| **Boran** | **Miner & Blacksmith** | Excavates underground stone and ore veins, operates smelting furnaces, crafts durable tools & armor, defends the base. |
| **Clover** | **Scout & Botanist** | Explores biomes, forages seeds and apples, tills hydrated soil for wheat farms, sounds early alarms for hostile mobs. |

---

## 🧠 Cognitive Architecture & Evolution

1. **Perception Engine**: Real-time 3D sensory awareness (voxels in radius, day/night cycle, hostile mob detection, teammate proximity, health/food telemetry).
2. **Episodic & Social Memory (`memory_storage/`)**: Agents remember notable events (dangers survived, minerals discovered), maintain social relationship affinity scores with each other, and record cooperative trades.
3. **Skill Tree & Technology Evolution**: Voyager-inspired progressive unlock system. As agents complete actions, they unlock skills (`Timberjack` ➔ `Lithic Mastery` ➔ `Iron Age Artisan` ➔ `Agrarian` ➔ `Master Architect`).
4. **Inter-Agent Dialogue & Chat**: Agents converse naturally in Minecraft server chat, coordinate roles, warn each other, and negotiate tasks.
5. **Zero-Cost LLM Flexibility**: Connects to **Groq Cloud API** (Free Llama-3.3-70B at 500+ tok/s), **Google Gemini Flash API** (Free tier), or the built-in **Adaptive Heuristic Engine** that runs offline with 0 API keys and zero cost.

---

## 📡 "More Than Advance" Observation Mission Control

You do **not** need to open Minecraft to watch them. The colony exposes a high-tech **Mission Control Web Dashboard** accessible from any smartphone, tablet, or PC:

- **Live 3D Viewers**: Real-time 3D WebGL camera streams (`prismarine-viewer`) embedded for each agent. Look through Aria, Boran, or Clover's eyes directly in your browser.
- **Stream of Consciousness**: View each bot's internal reflections, current high-level goal, and immediate atomic plan.
- **Vitals & Inventory Telemetry**: Live HP bar, hunger level, exact (X, Y, Z) coordinates, and current equipment.
- **Live Inter-Agent Chat Feed**: Real-time transcript of all conversations between agents.
- **Colony Technology & Skill Matrix**: Visual milestone progress from Wilderness Survival to Permanent Civilization.
- **Historical Chronicle**: Automated daily diary written at every sunset.

---

## ☁️ 24/7 Cloud Deployment (No Laptop Required!)

Choose either of the two **100% Free** cloud solutions below so your agents run 24/7 with your laptop off:

### 🌟 Option 1: Hugging Face Spaces (Docker) — 100% Free, NO Credit Card
*Specs: 16 GB RAM, 2 vCPUs*
1. Create a free account at [huggingface.co](https://huggingface.co/).
2. Create a **New Space** ➔ Name: `minecraft-ai-colony` ➔ SDK: **Docker (Blank)** ➔ Free Tier.
3. Push this repo to your space:
   ```bash
   git remote add space https://huggingface.co/spaces/<YOUR_USERNAME>/minecraft-ai-colony
   git push space main -f
   ```
4. Prevent sleep with [uptimerobot.com](https://uptimerobot.com/): Add a free HTTP monitor pinging your Space URL every 5 minutes.
5. Read [deploy-huggingface.md](deploy-huggingface.md) for full instructions and how to connect your Minecraft client via Playit.gg.

### 🏛️ Option 2: Oracle Cloud Always Free VM — 24 GB RAM, Dedicated IP
*Specs: 4 OCPU ARM Ampere, 24 GB RAM, 200 GB SSD, Dedicated Public IPv4*
1. Create a free VM at [cloud.oracle.com](https://cloud.oracle.com/) (Ubuntu 22.04 ARM).
2. SSH into your VM and run the 1-click script:
   ```bash
   chmod +x deploy-oracle-cloud.sh
   ./deploy-oracle-cloud.sh
   ```
3. Read [deploy-oracle.md](deploy-oracle.md) for full network security rules.

---

## 🎮 In-Game Spectator Mode (Joining the Server)

Whenever you want to join the world yourself:
1. Open **Minecraft: Java Edition (Version 1.20.4)**.
2. Go to **Multiplayer** ➔ **Direct Connection**.
3. Enter your server's public IP or Playit.gg domain.
4. Once joined, open the in-game chat and type:
   ```
   /gamemode spectator
   ```
5. Fly freely alongside Aria, Boran, and Clover as they build their world!

---

## ⚙️ Configuration (`agents/config.json`)

To enable free Cloud LLMs for even deeper conversations:
- Set `"provider": "groq"` and add your free key from [console.groq.com](https://console.groq.com)
- Or set `"provider": "gemini"` and add your free key from [aistudio.google.com](https://aistudio.google.com)
- Leaving `"provider": "heuristic"` works 100% out of the box with zero keys required.
