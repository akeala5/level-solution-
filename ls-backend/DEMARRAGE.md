# LS Marketplace — Backend

## Prérequis
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Compte Contabo (VPS)

## Installation

```bash
# 1. Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos vraies clés

# 2. Installer les dépendances
npm install

# 3. Générer le client Prisma
npm run prisma:generate

# 4. Créer la base de données et appliquer les migrations
npm run prisma:migrate

# 5. Insérer les données initiales (admin + catégories + forfaits)
npm run prisma:seed

# 6. Démarrer en développement
npm run start:dev

# 7. Accéder à la documentation API
# http://localhost:3001/api/docs
```

## Variables d'environnement obligatoires

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL PostgreSQL |
| `JWT_SECRET` | Clé secrète JWT (32+ caractères) |
| `JWT_REFRESH_SECRET` | Clé refresh token |
| `FEDAPAY_SECRET_KEY` | Clé secrète FedaPay |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe |
| `SMTP_HOST` / `SMTP_PASS` | Serveur email |
| `S3_*` | Cloudflare R2 ou AWS S3 |

## Architecture API

```
/api/v1/
├── auth/           → Register, Login, 2FA, JWT Refresh
├── users/          → Profils, Favoris, Dashboard, KYC
├── categories/     → Catalogue catégories
├── products/       → Annonces (CRUD, recherche, filtres)
├── orders/         → Commandes, Escrow, Litiges
├── payments/       → Stripe (carte) + FedaPay (Mobile Money)
├── chat/           → Messagerie interne + WebSocket
├── reviews/        → Avis et évaluations
├── notifications/  → Notifications in-app
└── upload/         → Upload images (WebP optimisé)
```

## Déploiement sur Contabo VPS

```bash
# 1. Mettre à jour le serveur
sudo apt update && sudo apt upgrade -y

# 2. Installer Node.js, PostgreSQL, Redis
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql redis-server

# 3. Configurer PM2
npm install -g pm2
npm run build
pm2 start dist/main.js --name ls-backend
pm2 save && pm2 startup

# 4. Configurer Nginx comme reverse proxy
# Pointer votre domaine LWS vers l'IP Contabo
```
