#!/bin/bash
# ─── DÉPLOIEMENT NATIF — LS Marketplace ───────────────────────────────────────
# Usage : bash deploy.sh
# Prérequis : Node 20, PM2, PostgreSQL, Redis installés sur le serveur

set -e

APP_ROOT="/var/www/ls-marketplace"
LOG="[deploy]"

echo "$LOG ─── Démarrage du déploiement ───────────────────────────────────────"
cd "$APP_ROOT"

# ─── 1. MISE À JOUR DU CODE ────────────────────────────────────────────────────
echo "$LOG Récupération du code..."
git pull origin main

# ─── 2. BACKEND ────────────────────────────────────────────────────────────────
echo "$LOG Build Backend NestJS..."
cd "$APP_ROOT/ls-backend"
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run build
echo "$LOG Backend compilé."

# ─── 3. FRONTEND ───────────────────────────────────────────────────────────────
echo "$LOG Build Frontend Next.js..."
cd "$APP_ROOT/ls-frontend"
npm ci --omit=dev
npm run build
echo "$LOG Frontend compilé."

# ─── 4. REDÉMARRAGE PM2 ────────────────────────────────────────────────────────
echo "$LOG Redémarrage des processus PM2..."
cd "$APP_ROOT"
pm2 startOrReload ecosystem.config.js --env production --update-env
pm2 save

# ─── 5. RELOAD APACHE ──────────────────────────────────────────────────────────
echo "$LOG Reload Apache..."
sudo systemctl reload apache2 || sudo apachectl graceful

echo "$LOG ─── Déploiement terminé le $(date) ──────────────────────────────────"
pm2 status
