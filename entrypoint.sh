#!/bin/bash
set -e

echo "=========================================================="
echo " Starting 24/7 Minecraft AI Colony Cloud Server..."
echo "=========================================================="

cd /app/server

# Ensure eula.txt is agreed
echo "eula=true" > eula.txt

# Start PaperMC Minecraft Server with optimized memory flags
echo "[Cloud] Launching PaperMC Server on port 25565..."
java -Xms1024M -Xmx3072M -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -jar paper-1.20.4.jar --nogui &
MC_PID=$!

# Wait for Minecraft Server to be ready on port 25565
echo "[Cloud] Awaiting Minecraft Server initialization..."
while ! nc -z 127.0.0.1 25565; do
  sleep 2
done
echo "[Cloud] Minecraft Server is UP and READY on port 25565!"

# Start Playit.gg tunnel for free public external Minecraft IP (optional / automatic)
if command -v playit &> /dev/null; then
  echo "[Cloud] Starting Playit.gg tunnel agent..."
  playit --secret "${PLAYIT_SECRET_KEY:-}" &
fi

# Launch Multi-Agent Society & Mission Control Dashboard
echo "[Cloud] Starting Aria, Boran, Clover & Web Mission Control Dashboard..."
cd /app/agents
node src/index.js
