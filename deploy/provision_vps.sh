#!/usr/bin/env bash
# =====================================================================
# ZERODAY PEERSERVER — VPS PROVISIONING & DEPLOYMENT SCRIPT
# Tested on Ubuntu 22.04 / 24.04 LTS & Debian 12
# Idempotent: sets up Docker, UFW firewall, systemd service, and Caddy TLS
# =====================================================================

set -euo pipefail

echo "==> [ZeroDay VPS Provisioning] Initializing setup..."

if [ "$EUID" -ne 0 ]; then
  echo "Error: This script must be run as root (or via sudo)." >&2
  exit 1
fi

DOMAIN="${1:-peer.zeroday.gg}"
APP_DIR="/opt/zeroday-signaling"

echo "==> Target Domain: $DOMAIN"
echo "==> Target Directory: $APP_DIR"

# 1. Update OS packages
echo "==> Updating apt repositories..."
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release ufw git

# 2. Install Docker if missing
if ! command -v docker &> /dev/null; then
  echo "==> Installing Docker Engine..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  ARCH=$(dpkg --print-architecture)
  DISTRO=$(lsb_release -is | tr '[:upper:]' '[:lower:]')
  CODENAME=$(lsb_release -cs)

  echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DISTRO} ${CODENAME} stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  echo "==> Docker is already installed."
fi

# 3. Configure UFW Firewall
echo "==> Configuring firewall rules..."
ufw allow 22/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP / ACME Challenge"
ufw allow 443/tcp comment "HTTPS / WSS Signaling"
ufw --force enable

# 4. Clone / Sync Application Code
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "==> Cloning ZeroDay repository into $APP_DIR..."
  git clone https://github.com/MatteAdor/zeroday_app.git .
else
  echo "==> Pulling latest code..."
  git pull origin main || true
fi

# Write runtime .env for compose
cat <<EOF > "$APP_DIR/deploy/.env"
PEER_DOMAIN=${DOMAIN}
PEER_KEY=zeroday-pvp
PEER_ALLOW_ORIGIN=https://zeroday.gg,https://zeroday-app.vercel.app
EOF

# 5. Build and launch services via Docker Compose
echo "==> Building and starting containers..."
cd "$APP_DIR/deploy"
docker compose down || true
docker compose up -d --build

# 6. Install systemd unit for persistent boot management
echo "==> Registering systemd service for auto-restart..."
cat <<EOF > /etc/systemd/system/zeroday-signaling.service
[Unit]
Description=ZeroDay PeerServer & Caddy Reverse Proxy
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR/deploy
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose restart
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable zeroday-signaling.service

echo "==> [SUCCESS] ZeroDay PeerServer is live!"
echo "==> Verify status: curl -I https://${DOMAIN}/peerjs"
