#!/bin/bash
# ─── INSTALLATION INITIALE — Serveur LS Marketplace ──────────────────────────
# Ubuntu 22.04 LTS recommandé
# Usage : bash setup.sh (une seule fois sur le serveur)

set -e
LOG="[setup]"

echo "$LOG ─── Installation du serveur LS Marketplace ─────────────────────────"

# ─── NODE.JS 20 (via nvm) ─────────────────────────────────────────────────────
echo "$LOG Installation Node.js 20..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20
echo "$LOG Node $(node -v) installé."

# ─── PM2 ──────────────────────────────────────────────────────────────────────
echo "$LOG Installation PM2..."
npm install -g pm2
pm2 startup
echo "$LOG PM2 installé."

# ─── REDIS ────────────────────────────────────────────────────────────────────
echo "$LOG Installation Redis..."
sudo apt-get update -y
sudo apt-get install -y redis-server
sudo sed -i 's/^# requirepass .*/requirepass changeme_strong_password/' /etc/redis/redis.conf
sudo sed -i 's/^requirepass .*/requirepass changeme_strong_password/' /etc/redis/redis.conf
sudo systemctl enable redis-server
sudo systemctl start redis-server
echo "$LOG Redis installé. Pensez à changer le mot de passe dans /etc/redis/redis.conf"

# ─── APACHE + MODULES ─────────────────────────────────────────────────────────
echo "$LOG Installation Apache..."
sudo apt-get install -y apache2
sudo a2enmod proxy proxy_http proxy_wstunnel ssl rewrite headers deflate expires
sudo systemctl enable apache2

# ─── CERTBOT (Let's Encrypt SSL) ──────────────────────────────────────────────
echo "$LOG Installation Certbot..."
sudo apt-get install -y certbot python3-certbot-apache

# ─── RÉPERTOIRE APP ───────────────────────────────────────────────────────────
echo "$LOG Création du répertoire /var/www/ls-marketplace..."
sudo mkdir -p /var/www/ls-marketplace
sudo chown -R $USER:$USER /var/www/ls-marketplace

# ─── LOGS PM2 ─────────────────────────────────────────────────────────────────
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

echo "$LOG ─── Prochaines étapes ─────────────────────────────────────────────"
echo "  1. Cloner le repo : cd /var/www && git clone <repo> ls-marketplace"
echo "  2. Créer ls-backend/.env (copier .env.example et remplir)"
echo "  3. Créer ls-frontend/.env.local"
echo "  4. Copier apache/vhosts.conf → /etc/apache2/sites-available/ls-marketplace.conf"
echo "  5. sudo a2ensite ls-marketplace && sudo certbot --apache -d ls-marketplace.com"
echo "  6. bash deploy.sh"
echo ""
echo "$LOG Installation terminée."
