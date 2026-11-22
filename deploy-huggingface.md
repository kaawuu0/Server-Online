# ☁️ Deploy 24/7 Free to Hugging Face Spaces (No Credit Card Required)

This guide shows you how to run the entire Minecraft Server, 3+ Autonomous AI Agents, and the Web Mission Control Dashboard **24/7 in the cloud for $0**, with **your laptop turned off**.

---

### Why Hugging Face Spaces?
- **100% Free forever** (No credit card or payment info needed).
- **16 GB RAM & 2 vCPUs** (Plenty of headroom for Minecraft PaperMC + 3 AI bots).
- **Permanent Public Web URL**: Check on your agents from your phone or any PC anytime (`https://<username>-minecraft-ai.hf.space`).
- **Laptop Off**: It runs completely on cloud servers.

---

## 🚀 3-Minute Deployment Steps

### Step 1: Create a Free Hugging Face Account & Space
1. Go to [huggingface.co](https://huggingface.co/) and sign up for a free account.
2. Click your profile avatar (top right) ➔ **New Space**.
3. Fill in:
   - **Space name**: `minecraft-ai-colony`
   - **License**: `mit`
   - **Select the Space SDK**: Choose **Docker** ➔ **Blank**.
   - **Space hardware**: Keep the default **Free (2 vCPU · 16 GB RAM)**.
   - **Visibility**: **Public**.
4. Click **Create Space**.

### Step 2: Push This Repository to your Space
In your local workspace terminal, connect your space repository and push:

```bash
git remote add space https://huggingface.co/spaces/<YOUR_HF_USERNAME>/minecraft-ai-colony
git add .
git commit -m "Deploy 24/7 Minecraft AI Colony with 3 bots and Mission Control"
git push space main -f
```

*Hugging Face will automatically build the `Dockerfile`, start the PaperMC server, boot Aria, Boran, and Clover, and launch your Mission Control Dashboard on port 7860.*

---

### Step 3: Keep it Running 24/7 (Prevent Sleeping)
By default, free Hugging Face Spaces sleep after 48 hours of zero web visits. To make it run **24/7 non-stop forever**:

1. Go to [uptimerobot.com](https://uptimerobot.com/) (100% free uptime monitor).
2. Click **Add New Monitor**:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Minecraft AI Colony`
   - **URL**: Your Space URL (e.g. `https://<YOUR_USERNAME>-minecraft-ai-colony.hf.space`)
   - **Monitoring Interval**: `5 minutes`
3. Click **Create Monitor**.
*Now UptimeRobot pings your mission control every 5 minutes, ensuring your cloud agents never sleep, even when your laptop has been powered off for weeks!*

---

### Step 4: Connect to the Minecraft Server (In-Game Spectator Mode)
Playit.gg is pre-installed in the container.
1. When the container boots, check the Space logs under the **Logs** tab in Hugging Face.
2. It will display a claim link: `https://playit.gg/claim/...`
3. Click the link once to claim your free tunnel. Playit will assign you a permanent free public address (e.g. `colony.auto.playit.gg`).
4. Add that address in Minecraft Java Edition (1.20.4) ➔ Join Server!
5. Type `/gamemode spectator` to fly invisibly alongside Aria, Boran, and Clover!
