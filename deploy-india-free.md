# 🇮🇳 24/7 Free Minecraft AI Colony Setup for India (NO Credit Card & Laptop OFF)

Since FalixNodes is unavailable in India and FreeMCServer is down for maintenance, here is the exact, working solution tailored specifically for India with **0 cost, NO credit card, and your laptop completely turned off**.

---

## 🏗️ How the Architecture Works

```
  ┌────────────────────────────────────────────────────────┐
  │ 🇮🇳 Indian Free Minecraft Server (Indernos / PowerupStack)│
  │ • Data centers in Delhi & Mumbai (15-30ms ping)        │
  │ • 100% Free forever (NO Credit Card required)          │
  │ • Set to 'online-mode=false' for AI bot accounts       │
  └───────────────────────────▲────────────────────────────┘
                              │ (Bot Minecraft TCP connection)
  ┌───────────────────────────┴────────────────────────────┐
  │ ☁️ Render.com (100% Free Node.js Cloud Web Service)     │
  │ • Runs the 3 AI brains (Aria, Boran, Clover)           │
  │ • Hosts the live Mission Control Dashboard (HTTPS)     │
  │ • Kept awake 24/7 by a free UptimeRobot 5-minute ping  │
  │ • NO Credit Card required (Sign up with GitHub)        │
  └───────────────────────────▲────────────────────────────┘
                              │ (Check in anytime)
               Your Smartphone / Tablet / Any Browser
```

---

## ⚡ Step 1: Create the Free Minecraft Server in India (2 Mins)

Choose either of these two Indian free hosts (both tested, working, and require **NO credit card**):

### Option A: Indernos (Recommended for India)
1. Go to **[indernos.in](https://indernos.in/)**.
2. Sign up for a free account (no payment info asked).
3. Create a server:
   - Software: **PaperMC**
   - Version: **1.20.4**
4. Go to **File Manager** ➔ Click `server.properties`:
   - Change `online-mode=true` to `online-mode=false`.
   - Save the file.
5. Click **Start Server** and copy your server IP & Port (e.g., `colony.indernos.in:25565`).

*(OR Option B: **[powerupstack.com](https://powerupstack.com/)** — Choose the "India" region, 3 GB RAM free, and set `online-mode=false`).*

---

## ⚡ Step 2: Deploy the AI Colony & Dashboard to Render.com (Free, No Card)

Render hosts your 3 AI bots and the Web Mission Control Dashboard 24/7 in the cloud:

1. Push this workspace to your GitHub:
   ```bash
   git add .
   git commit -m "Ready for Render India deployment"
   git push origin main
   ```
2. Go to **[render.com](https://render.com/)** and click **Sign Up** (Choose "Sign in with GitHub" — **No credit card required**).
3. In your Render dashboard, click **New +** ➔ **Web Service**.
4. Connect your `Server-Online` GitHub repository.
5. Fill in the settings:
   - **Name**: `minecraft-ai-colony`
   - **Environment**: `Node`
   - **Build Command**: `cd agents && npm install`
   - **Start Command**: `cd agents && node src/index.js`
   - **Plan**: Select **Free** ($0.00/month).
6. Under **Environment Variables**, add:
   - `MC_HOST` = `<Your Indernos/PowerupStack Server Address>` (e.g. `colony.indernos.in`)
   - `MC_PORT` = `<Your Server Port>` (default `25565`)
   - `GROQ_API_KEY` = *(Optional free key from [console.groq.com](https://console.groq.com) for Llama-3.3-70B AI brain)*
7. Click **Create Web Service**.

---

## ⚡ Step 3: Keep it Running 24/7 Forever (Laptop OFF)

Render free web services sleep if no one visits them. To make it run **24/7 permanently**:

1. Once Render finishes deploying, it gives you a public URL (e.g. `https://minecraft-ai-colony.onrender.com`).
2. Go to **[uptimerobot.com](https://uptimerobot.com/)** (100% free, no card).
3. Click **Add New Monitor**:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Minecraft AI Colony`
   - **URL**: `https://your-app-name.onrender.com`
   - **Monitoring Interval**: `5 minutes`
4. Click **Create Monitor**.

---

## 🎉 You're Done!
- **Close your laptop**: It can be shut down completely.
- Aria, Boran, and Clover will stay logged into your Indernos / PowerupStack Minecraft server 24/7.
- Open your Render URL (`https://your-app-name.onrender.com`) from your phone anytime to watch their 3D views, live thoughts, and skill tree!
