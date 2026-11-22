# 🏛️ Deploy 24/7 Free to Oracle Cloud Always Free Tier (24GB RAM, Dedicated Public IP)

Oracle Cloud Infrastructure (OCI) offers the most powerful **100% free forever** cloud tier in the industry. It gives you a full dedicated Linux Virtual Machine that never sleeps, never shuts down, and has its own permanent public IP address.

---

### Specifications (Always Free Tier)
- **CPU**: 4 Ampere A1 ARM Cores (3.0 GHz)
- **RAM**: 24 GB DDR4 RAM
- **Storage**: 200 GB NVMe SSD
- **Network**: Dedicated Public IPv4 address (port 25565 open directly!)
- **Uptime**: True 24/7/365 without laptop or idle sleep triggers.
- **Cost**: **$0.00 / month forever**.

*(Note: Oracle requires a credit/debit card during registration to verify your identity, but you will never be charged as long as you select "Always Free" resources).*

---

## 🚀 3-Step Setup

### Step 1: Create your Free Oracle Cloud Instance
1. Sign up at [cloud.oracle.com](https://cloud.oracle.com/).
2. In the OCI Console, navigate to **Compute** ➔ **Instances** ➔ **Create Instance**.
3. Configure:
   - **Image**: `Canonical Ubuntu 22.04 Minimal`
   - **Shape**: Click *Change Shape* ➔ Select **Ampere (ARM)** ➔ Choose **4 OCPUs and 24 GB RAM**.
   - **Networking**: Select *Assign a public IPv4 address*.
   - **SSH Keys**: Download and save your private SSH key.
4. Click **Create**. Your VM will be active within 60 seconds!

### Step 2: Open Ports in Oracle Cloud Network Security
In your OCI Console:
1. Go to your Instance details ➔ Click on the **Subnet** link under *Primary VNIC*.
2. Click on the **Default Security List**.
3. Click **Add Ingress Rules**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `25565, 7860`
   - **Description**: `Minecraft Server & AI Mission Control Dashboard`
4. Click **Add Ingress Rules**.

### Step 3: Run the 1-Click Colony Deployment Script
SSH into your Oracle VM from your terminal:
```bash
ssh -i /path/to/your/private_key ubuntu@<YOUR_ORACLE_PUBLIC_IP>
```

Clone your project and run the deployment script:
```bash
git clone https://github.com/<YOUR_GITHUB_USER>/<REPO_NAME>.git mc-colony
cd mc-colony
chmod +x deploy-oracle-cloud.sh
./deploy-oracle-cloud.sh
```

**That's it!**
- PM2 keeps both the Minecraft server and the 3 AI bots running 24/7 in the background.
- If the VM ever reboots, PM2 restarts everything automatically.
- Your laptop can remain completely turned off.
- Connect in Minecraft Java Edition at: `<YOUR_ORACLE_PUBLIC_IP>:25565`
- Open the Mission Control Dashboard from your phone or browser at: `http://<YOUR_ORACLE_PUBLIC_IP>:7860`
