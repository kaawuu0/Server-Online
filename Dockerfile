# Multi-Stage Dockerfile for 24/7 Free Minecraft AI Colony & Mission Control
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install Java 17, Node.js 20, curl, wget, and networking tools
RUN apt-get update && apt-get install -y \
    openjdk-17-jre-headless \
    curl \
    wget \
    git \
    screen \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install Playit.gg for zero-port-forwarding public Minecraft access
RUN curl -SsL https://playit-cloud.github.io/ppa/key.gpg | gpg --dearmor | tee /etc/apt/trusted.gpg.d/playit.gpg >/dev/null && \
    echo "deb [signed-by=/etc/apt/trusted.gpg.d/playit.gpg] https://playit-cloud.github.io/ppa/data ./" | tee /etc/apt/sources.list.d/playit-cloud.list && \
    apt-get update && apt-get install -y playit && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server and agent code
COPY server/ /app/server/
COPY agents/ /app/agents/
COPY dashboard/ /app/dashboard/
COPY memory_storage/ /app/memory_storage/
COPY entrypoint.sh /app/entrypoint.sh

# Install agent dependencies
WORKDIR /app/agents
RUN npm install --production

WORKDIR /app
RUN chmod +x /app/entrypoint.sh

# Expose Web Mission Control (port 7860 matches Hugging Face Spaces default)
EXPOSE 7860 25565 3001 3002 3003

CMD ["/app/entrypoint.sh"]
