# 🚀 24/7 Free Setup — NO Credit Card & Laptop OFF

If Hugging Face Docker is locked and you do not have a credit card for Oracle Cloud, here are the **two verified 100% free ways** to run your Minecraft server, 3+ AI agents, and web observation dashboard **24/7 with your laptop turned completely off**.

---

## 🌟 Method 1: The Cloud Symbiosis (100% Cloud, No Card)

This setup uses two free cloud platforms that work together:

```
  ┌──────────────────────────────────────────────┐
  │ Free Minecraft Host (FalixNodes/FreeMCServer)│
  │ - Runs PaperMC 1.20.4                        │
  │ - Stays online because 3 bots are in-game!   │
  └──────────────────────▲───────────────────────┘
                         │ (Bot Game Connections)
  ┌──────────────────────┴───────────────────────┐
  │ Render.com (100% Free - NO Credit Card)      │
  │ - Runs Aria, Boran, Clover AI Brains         │
  │ - Hosts Mission Control Dashboard (HTTPS)    │
  │ - Kept awake 24/7 by free UptimeRobot ping   │
  └──────────────────────▲───────────────────────┘
                         │ (Check in from phone/PC)
                  Your Smartphone
```

### Step 1: Create your Free Minecraft Server (Takes 2 mins)
1. Go to [FalixNodes.net](https://falixnodes.net/) or [FreeMCServer.net](https://freemcserver.net/) (Both are 100% free, **no credit card**).
2. Create a **Paper 1.20.4** server.
3. In the server settings / `server.properties`, set:
   - `online-mode=false` (allows our AI agent accounts to connect).
4. Click **Start** and note down your server IP & Port (e.g., `colony123.falixsrv.me` and `25565`).
*(Normally, free hosts shut down when 0 players are online. But because our 3 AI bots stay connected 24/7, the server detects active players and NEVER shuts down!)*

### Step 2: Deploy the AI Agents & Dashboard to Render.com (Free, No Card)
1. Push this project to your GitHub account:
   ```bash
   git add .
   git commit -m "Configure Render free deployment"
   git push origin main
   ```
2. Go to [Render.com](https://render.com/) and click **Sign Up** (Choose "Sign in with GitHub" — **No credit card required**).
3. In the Render Dashboard, click **New +** ➔ **Web Service**.
4. Select your `Server-Online` GitHub repository.
5. Configure:
   - **Name**: `minecraft-ai-colony`
   - **Environment**: `Node`
   - **Region**: Closest to your Minecraft server
   - **Branch**: `main` (or `master`)
   - **Build Command**: `cd agents && npm install`
   - **Start Command**: `cd agents && node src/index.js`
   - **Instance Type**: Select **Free** ($0/month, 512 MB RAM).
6. Under **Environment Variables**, add:
   - `MC_HOST` = `<your-minecraft-server-ip>` (e.g. `colony123.falixsrv.me`)
   - `MC_PORT` = `25565` (or whatever port your free host gave you)
   - `GROQ_API_KEY` = *(Optional free key from [console.groq.com](https://console.groq.com) for Llama-3.3-70B)*
7. Click **Deploy Web Service**!

### Step 3: Keep it Awake 24/7 Forever
1. Render gives you a free public web address: `https://minecraft-ai-colony.onrender.com`.
2. Go to [uptimerobot.com](https://uptimerobot.com/) (100% free).
3. Create a monitor pointing to your Render URL with a **5-minute interval**.
4. **Done!** Turn off your laptop. The AI agents will log into the Minecraft server, prevent it from sleeping, and stream their 3D views and thoughts to your Render dashboard 24/7!

---

## 📱 Method 2: The Old Android Phone 24/7 Micro-Server (Zero Cloud Queues)

If you have an old Android phone or tablet sitting in a drawer:
- It consumes almost zero electricity (~2W, costs pennies per month).
- Has 3GB–4GB of RAM (more than most free cloud tiers!).
- No cloud queues, no session timeouts, no credit cards, permanent 100% control.
- Your laptop stays completely OFF.

### 4-Minute Setup on Android (via Termux):
1. On your old phone, install **Termux** from [F-Droid](https://f-droid.org/packages/com.termux/) or GitHub.
2. Open Termux and run:
   ```bash
   pkg update && pkg install -y openjdk-17 nodejs git
   ```
3. Clone your repository:
   ```bash
   git clone <YOUR_GITHUB_REPO_URL> mc-colony
   cd mc-colony
   ```
4. Start the server & agents:
   ```bash
   # In terminal 1 (Minecraft Server):
   cd server && java -Xms1024M -Xmx2048M -jar paper-1.20.4.jar --nogui

   # In terminal 2 (AI Agents + Dashboard):
   cd agents && npm install && node src/index.js
   ```
5. Install [Playit.gg](https://playit.gg) on the phone: It gives you a free public Minecraft IP and a public link to the web dashboard so you can view it from anywhere in the world!
6. Plug the phone into the charger, connect to Wi-Fi, and let it run 24/7.
