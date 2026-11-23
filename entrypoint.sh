#!/bin/bash
set -e

echo "=========================================================="
echo " Starting 24/7 Minecraft AI Colony Cloud Service..."
echo "=========================================================="

# If an external Minecraft server is specified (e.g. Indernos), skip local Paper server
if [ -n "$MC_HOST" ] && [ "$MC_HOST" != "127.0.0.1" ] && [ "$MC_HOST" != "localhost" ]; then
  echo "[Cloud] Connecting AI Bots to external server: $MC_HOST:${MC_PORT:-25565}"
else
  # Otherwise start local PaperMC server
  cd /app/server
  echo "eula=true" > eula.txt
  echo "[Cloud] Launching local PaperMC Server..."
  java -Xms512M -Xmx1024M -jar paper-1.20.4.jar --nogui &
  
  echo "[Cloud] Awaiting Minecraft Server initialization..."
  while ! nc -z 127.0.0.1 25565; do
    sleep 2
  done
  echo "[Cloud] Minecraft Server is UP and READY on port 25565!"
fi

# Launch Multi-Agent Society & Mission Control Dashboard
echo "[Cloud] Starting Aria, Boran, Clover & Web Mission Control Dashboard..."
cd /app/agents
node src/index.js
