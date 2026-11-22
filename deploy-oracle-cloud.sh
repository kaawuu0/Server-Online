#!/bin/bash
# 1-Click Deployment Script for Oracle Cloud Always Free VM (Ubuntu 22.04 / 24.04)
# Run with: curl -sSL <your-raw-github-url>/deploy-oracle-cloud.sh | bash

set -e

echo "=========================================================="
echo " Setting up 24/7 Minecraft AI Colony on Oracle Cloud..."
echo "=========================================================="

sudo apt-get update && sudo apt-get install -y openjdk-17-jre-headless curl git ufw

# Install Node.js 20 & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Open Minecraft and Dashboard Ports in Ubuntu Firewall & iptables
sudo ufw allow 25565/tcp || true
sudo ufw allow 7860/tcp || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 25565 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 7860 -j ACCEPT || true
sudo netfilter-persistent save || true

# Navigate to project
cd "$(dirname "$0")"

# Ensure EULA
echo "eula=true" > server/eula.txt

# Install agent dependencies
cd agents
npm install --production
cd ..

# Start Minecraft Server and Agents under PM2 (24/7 daemon manager)
pm2 delete mc-server || true
pm2 delete mc-agents || true

pm2 start "java -Xms2048M -Xmx8192M -jar server/paper-1.20.4.jar --nogui" --name mc-server --cwd server
sleep 10
pm2 start "node src/index.js" --name mc-agents --cwd agents

# Save PM2 state to resurrect automatically on server reboot
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME || true

echo "=========================================================="
echo " 24/7 MINECRAFT AI COLONY IS NOW LIVE!"
echo " Server IP: $(curl -s ifconfig.me):25565"
echo " Dashboard: http://$(curl -s ifconfig.me):7860"
echo "=========================================================="
