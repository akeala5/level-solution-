# ameliorationv2.md

> **Application auditée :** LS Marketplace (`/var/www/shopls-pro`)
> **Stack réelle constatée :** Back-end **NestJS 10 + Prisma 5 + PostgreSQL + Redis** · Front-end **Next.js 14 (App Router) + TypeScript + Tailwind + Zustand + React Query** · Paiements **Stripe + FedaPay (Mobile Money) + Escrow virement** · Recherche **Meilisearch** · Temps réel **Socket.io**
> **Périmètre lu :** `ls-backend/src/**` (auth, orders, payments, webhooks, admin, products, schema Prisma), `ls-frontend/src/**` (checkout, api client, stores, middleware), fichiers d'infra racine.
> **Méthode :** audit lecture par fichier. Chaque constat est référencé `fichier:ligne`. Les points non vérifiables par le code sont explicitement marqués **[Hypothèse]**.
> **Date :** 2026-07-01

---

## AVERTISSEMENT DE LECTURE

Ce document distingue rigoureusement :

- **[Vérifié]** — constat prouvé par lecture directe du code (référence `fichier:ligne`).
- **[Hypothèse]** — déduction raisonnable en l'absence d'accès (ex. contenu `.env` de prod, comportement runtime, captures d'écran non fournies).

Les **captures d'écran, le rendu visuel réel et le contenu du `.env` de production n'ont pas été fournis** : l'audit UI/UX s'appuie sur le code des composants (`ls-frontend/src/components`, `src/app`) et non sur un rendu observé. Les jugements purement esthétiques sont donc marqués **[Hypothèse]** quand ils ne peuvent être tranchés par le code.

Le projet contient déjà un `audit.md` interne se déclarant « 100 % production-ready ». **Cet auto-diagnostic est contredit par plusieurs failles structurelles décrites ci-dessous** (idempotence des webhooks, réservation de stock, absence de portefeuille vendeur, secret en clair). Ce document corrige et complète cet auto-audit.

---

# PARTIE 1 — AUDIT CRITIQUE ET ARCHITECTURE

## 1.0 Synthèse des défauts structurels (les 6 qui comptent)

| # | Défaut | Gravité | Preuve |
|---|--------|---------|--------|
| A | Clés privées en clair dans le repo (`key.txt`) non ignorées par git | `Critique` | `key.txt` présent, absent du `.gitignore` |
| B | Webhook FedaPay confirme un paiement **sans vérifier la signature** si le secret n'est pas configuré | `Critique` | `payments.service.ts:389-398` |
| C | Confirmation de paiement **non idempotente** → double crédit possible sur webhook rejoué/dupliqué | `Critique` | `payments.service.ts:467-479` |
| D | Stock décrémenté **à la création** (avant paiement), sans réservation expirable ni verrou → stock fantôme + double-vente en concurrence | `Critique` | `orders.service.ts:651, 699-702` |
| E | **Aucun portefeuille vendeur ni flux de retrait (payout)** : `sellerAmount` calculé mais jamais versé | `Critique` | schéma Prisma (pas de modèle `Wallet`/`Payout`), `orders.service.ts:833-857` |
| F | Panier « multi-vendeurs » = **N commandes indépendantes créées en boucle** côté client, sans commande-parent ni atomicité | `Élevé` | `checkout/page.tsx:180-187` |

Ces six points sont détaillés et corrigés en Partie 3.

---

## 1.1 Audit UI/UX

> Base : code des composants. Le rendu pixel n'a pas été observé → jugements esthétiques marqués **[Hypothèse]**.

### 1.1.1 Points forts constatés **[Vérifié]**

- Design system embryonnaire présent : `components/ui/` (Badge, Modal, Spinner, EmptyState, Skeleton, StarRating, Avatar).
- Accessibilité amorcée : `layout.tsx` intègre skip-nav, aria-labels sur les boutons-icônes du `Header.tsx`, `aria-live` sur le carrousel `HeroSection.tsx` (confirmé par `audit.md`).
- États de chargement disponibles (`Skeleton.tsx`, `Spinner.tsx`) et vides (`EmptyState.tsx`).
- Internationalisation FR/EN via `next-intl` (`messages/fr.json`, `messages/en.json`).

### 1.1.2 Problèmes identifiés

| Constat | Priorité | Impact | Correction | Difficulté | Dépendances |
|---|---|---|---|---|---|
| **Design system non centralisé en tokens** : couleurs/espacements dispersés en classes Tailwind ad hoc (`bg-emerald-600`, `#1A3C6E` codé en dur dans `main.ts:1110`). Pas de fichier unique de tokens sémantiques. **[Vérifié]** | `Élevé` | Incohérence visuelle, dette au moindre changement de charte | Centraliser dans `tailwind.config.ts` (couleurs sémantiques `primary`/`success`/`danger`/`surface`) + CSS variables pour Dark Mode | Moyenne | Aucune |
| **Dark Mode non natif** : `next-themes` est **absent** du `package.json` back, présent front (`next-themes ^0.2.1`) mais aucun composant `ThemeProvider` constaté dans l'arbo `providers.tsx`. **[Hypothèse]** (à confirmer sur `providers.tsx`) | `Moyen` | Attente 2026 non couverte | Ajouter `ThemeProvider` + variables CSS `--surface`, `--text` en dual scheme | Faible | `next-themes` |
| **Zones de clic mobiles** : plusieurs boutons-icônes (quantité panier, favoris) dépendent d'icônes `lucide-react` 16-20px sans garantie de cible tactile ≥ 44px. **[Hypothèse]** | `Moyen` | Frustration mobile (marché cible : smartphones d'entrée de gamme) | Imposer `min-h-11 min-w-11` (44px) sur toutes les cibles tactiles | Faible | Aucune |
| **Boutons « orphelins » visibles mais non fonctionnels** : « Signaler l'annonce », « Répondre à un avis », « Ouvrir un litige » (toast « bientôt disponible »), toggles notifications, activation 2FA. **[Vérifié via `fonction.md`]** | `Élevé` | Perte de confiance : l'utilisateur clique dans le vide | Masquer les CTA non branchés OU les brancher (voir Partie 2.4) | Faible→Moyenne | Endpoints back correspondants |
| **Messages d'erreur silencieux** : le chat logue les erreurs en `console.error` sans retour visuel. **[Vérifié via `fonction.md`]** | `Moyen` | L'utilisateur ne sait pas qu'une action a échoué | Toaster d'erreur systématique + état « erreur » par composant | Faible | `react-hot-toast` (déjà présent) |
| **Confirmations destructives** basées sur `confirm()` natif (suppression annonce, annulation commande). **[Vérifié via `fonction.md`]** | `Faible` | UX datée, non stylée, non accessible | Remplacer par `Modal` de confirmation (déjà dispo dans `ui/`) | Faible | `Modal.tsx` |

### 1.1.3 Ce qui donne un aspect « amateur » — synthèse **[Hypothèse esthétique]**

Sans captures, les signaux d'amateurisme les plus probables au vu du code : (1) CTA présents mais morts, (2) absence de tokens → micro-incohérences de teintes/rayons entre pages, (3) `confirm()`/`alert()` natifs, (4) états d'erreur invisibles. Ce sont précisément ces 4 points qui empêchent une perception « premium » : un site premium ne montre jamais un bouton qui ne fait rien, et signale toujours ce qui se passe.

---

## 1.2 Audit du parcours client (tunnel de conversion)

### 1.2.1 Rupture majeure — le panier « multi-vendeurs » **[Vérifié]**

`checkout/page.tsx:180-187` :

```ts
for (const item of items) {
  const res = await api.post('/orders', { productId: item.productId, quantity: item.quantity, notes: fullNotes })
  createdOrderIds.push(res.data.data.id)
}
// en cas d'échec paiement :
await Promise.allSettled(createdOrderIds.map((id) => api.patch(`/orders/${id}/cancel`)))
```

**Constat :** chaque **article** (et non chaque vendeur) donne lieu à un appel `POST /orders` séquentiel. Trois articles = trois commandes distinctes, trois lignes de commission, trois numéros. Le regroupement par vendeur n'existe pas.

- **Priorité :** `Critique`
- **Impact :** frais/commissions dupliqués, suivi éclaté pour l'acheteur, incohérence de facturation, et surtout **fenêtre d'incohérence** : si le navigateur se coupe entre la création des commandes (stock déjà décrémenté) et le lancement du paiement, on obtient des commandes `PENDING` orphelines avec stock bloqué.
- **Correction :** endpoint transactionnel unique `POST /orders/checkout` qui reçoit **tout le panier**, groupe par vendeur, crée **une commande-parent + N sous-commandes** dans **une seule transaction Prisma**, puis renvoie un seul `paymentIntent`. Voir Partie 3.4 (modèle) et 3.2 (code).
- **Difficulté :** Élevée
- **Dépendances :** refonte modèle Order (parent/sous-commande), migration DB.

### 1.2.2 Autres points de friction

| Constat | Priorité | Impact | Correction | Difficulté |
|---|---|---|---|---|
| **Callback FedaPay** : le GET de retour navigateur vérifie désormais le statut réel en base (`payments.controller.ts:44-60`) — **bon point**, corrigé depuis l'audit initial. Reste le risque de « race » webhook non arrivé → l'acheteur voit `?payment=pending`. **[Vérifié]** | `Moyen` | Confusion post-paiement Mobile Money (délais réels de confirmation) | Écran « paiement en cours de confirmation » avec polling léger + rassurance explicite | Moyenne |
| **Commande en invité absente** : `middleware.ts` force `/checkout` derrière auth. **[Vérifié]** | `Moyen` | Abandon panier (friction inscription obligatoire sur marché africain) | Autoriser un checkout invité (email + téléphone) créant un compte léger a posteriori | Moyenne |
| **Panier non persistant serveur** : `cart.store.ts` = Zustand localStorage uniquement. **[Vérifié]** | `Faible` | Panier perdu au changement d'appareil | Sync panier serveur pour utilisateurs connectés | Moyenne |
| **Réservation de stock inexistante côté acheteur** : rien n'informe « il reste 2 exemplaires, réservés 15 min ». **[Vérifié — corollaire de 1.4]** | `Moyen` | Sur-vente perçue, déception au paiement | Réservation expirable (voir 1.4/3.2) + affichage compteur | Moyenne |

---

## 1.3 Audit du parcours vendeur

### 1.3.1 Le trou noir : encaissement vendeur **[Vérifié]**

Le calcul financier est correct à la commande (`orders.service.ts:659-666`) : commission dégressive par forfait, `sellerAmount = totalAmount - commissionAmount`. **Mais ce montant n'est jamais versé nulle part.**

`releaseEscrow()` (`orders.service.ts:833-857`) au passage `COMPLETED` :

```ts
await this.prisma.$transaction([
  this.prisma.payment.update({ where: { orderId }, data: { escrowReleasedAt: new Date() } }),
  this.prisma.loyaltyAccount.upsert({ /* points ACHETEUR */ }),
]);
```

Il marque `escrowReleasedAt` et crédite des **points de fidélité à l'acheteur** — **jamais le solde du vendeur**. Il n'existe dans le schéma Prisma **aucun modèle `Wallet`, `SellerBalance`, `Payout` ni `WithdrawalRequest`**.

- **Priorité :** `Critique`
- **Impact métier :** une marketplace qui encaisse mais ne peut pas reverser ses vendeurs n'est pas viable. C'est la fonctionnalité #1 manquante. `fonction.md` confirme que « consultation du solde / demandes de retrait » sont attendues mais non branchées.
- **Correction :** modèle `SellerWallet` + `WalletTransaction` (crédit à la libération escrow) + `PayoutRequest` (demande de retrait vendeur, validation admin, versement FedaPay Payout/virement). Voir Partie 3.4.
- **Difficulté :** Élevée
- **Dépendances :** migration DB, intégration API de payout (FedaPay Payouts ou virement manuel admin).

### 1.3.2 Autres constats vendeur

| Constat | Priorité | Impact | Correction | Difficulté |
|---|---|---|---|---|
| **KYC** présent en back (upload + revue admin) et profil, mais le **gate d'activation vendeur** (interdire la vente tant que KYC non validé) n'est pas imposé à la création produit. **[Hypothèse — à confirmer dans `products.service.ts`]** | `Élevé` | Vendeurs non vérifiés vendant = risque fraude/légal | Bloquer `POST /products` si `sellerProfile.kycStatus !== VERIFIED` | Faible |
| **« Répondre à un avis »** : bouton orphelin (`fonction.md`). Le back `reviews.service.ts` expose pourtant un `reply`. **[Vérifié]** | `Moyen` | Vendeur ne peut pas soigner sa e-réputation | Brancher le bouton sur l'endpoint existant | Faible |
| **Isolation des espaces** : buyer/seller/admin partagent le même front, séparés par `role`. Pas d'espace livreur. **[Vérifié]** | `Moyen` | Confusion de rôles, surface d'erreur | Layouts distincts + guard rôle serveur (voir 1.5) | Moyenne |

---

## 1.4 Audit de la logique métier

### 1.4.1 Stock : réservation absente + race condition **[Vérifié]**

`orders.service.ts:651` puis `:699-702` :

```ts
if (product.quantity < (data.quantity || 1)) throw new BadRequestException('Stock insuffisant');
// ... plus loin, dans la transaction :
await tx.product.update({ where: { id: product.id }, data: { quantity: { decrement: quantity } } });
```

**Deux défauts cumulés :**

1. **Décrément à la création de commande (statut `PENDING`), avant tout paiement.** Si l'acheteur n'achève jamais le paiement, le stock reste décrémenté indéfiniment (aucun job ne restaure le stock des `PENDING` expirées ; la restauration n'existe qu'au `CANCELLED` explicite, `orders.service.ts:780-791`). → **stock fantôme**.
2. **Vérifier-puis-décrémenter n'est pas atomique sous verrou.** Deux commandes simultanées lisent `quantity = 1`, passent le test, décrémentent toutes deux → **stock négatif / double-vente**. La transaction Prisma protège l'écriture mais pas la lecture-conditionnelle (pas de `SELECT ... FOR UPDATE` ni de garde SQL `quantity >= quantity`).

- **Priorité :** `Critique`
- **Impact :** double-vente (litige garanti), stock négatif, catalogue faussé.
- **Correction :** (a) décrément **conditionnel atomique** via `updateMany({ where: { id, quantity: { gte: qty } }, data: { decrement } })` et vérifier `count === 1` ; (b) modèle de **réservation expirable** (`StockReservation` 15 min) libérée par cron ; (c) contrainte applicative + éventuel `CHECK (quantity >= 0)`. Voir Partie 3.2.
- **Difficulté :** Élevée
- **Dépendances :** migration, job cron de libération.

### 1.4.2 Idempotence des webhooks de paiement **[Vérifié]**

`confirmPayment()` (`payments.service.ts:467-479`) et `handleFedaPayCallback` (`:411-415`) / `handleStripeWebhook` (`:94-121`) :

```ts
private async confirmPayment(orderId, providerRef) {
  await this.prisma.$transaction([
    this.prisma.payment.update({ where: { orderId }, data: { status: 'COMPLETED', providerRef } }),
    this.prisma.order.update({ where: { id: orderId }, data: { status: 'PAYMENT_CONFIRMED' } }),
  ]);
}
```

**Aucune garde d'idempotence.** Stripe et FedaPay **rejouent** les webhooks (retries réseau, doublons). Rien ne vérifie que le paiement n'est pas **déjà** `COMPLETED`. Conséquences en cascade si un `order.completed` déclenche une libération escrow / crédit : re-crédit. Aujourd'hui le crédit vendeur n'existe pas (cf. 1.3.1), donc le risque immédiat est limité aux notifications/webhooks vendeur dupliqués — **mais dès qu'on branchera le portefeuille (obligatoire), la double-confirmation deviendra une perte financière directe.**

- **Priorité :** `Critique`
- **Impact :** double crédit vendeur (à venir), notifications/`webhooks.dispatch` dupliqués, `order.paid` émis plusieurs fois.
- **Correction :** (a) table `WebhookEvent` avec `@@unique(provider, eventId)` — ignorer si déjà vu ; (b) transitions gardées : ne confirmer que si `status === 'PENDING'`. Voir Partie 3.2.
- **Difficulté :** Moyenne
- **Dépendances :** migration.

### 1.4.3 Signature webhook FedaPay optionnelle **[Vérifié]**

`payments.service.ts:389-398` :

```ts
const webhookSecret = this.configService.get<string>('fedapay.webhookSecret');
if (webhookSecret && signature) {
  // vérifie HMAC
}
// sinon : AUCUNE vérification, on traite quand même le corps
```

**Si `FEDAPAY_WEBHOOK_SECRET` n'est pas défini en prod, n'importe qui peut POST `/api/v1/payments/fedapay/callback` avec `{ transaction: { id, status: 'approved' } }` et faire passer une commande en `PAYMENT_CONFIRMED` sans avoir payé.** Le `providerRef` doit exister en base, mais il est renvoyé au navigateur à la création de transaction : un acheteur peut le connaître.

- **Priorité :** `Critique`
- **Impact :** confirmation de paiement frauduleuse → livraison sans encaissement.
- **Correction :** rendre la vérification **obligatoire** — rejeter (401) si secret absent OU signature absente/invalide. Voir Partie 3.2.
- **Difficulté :** Faible
- **Dépendances :** garantir `FEDAPAY_WEBHOOK_SECRET` en prod (ops).

### 1.4.4 Commission calculée sur les frais de livraison **[Vérifié]**

`orders.service.ts:655-666` : `totalAmount = subtotal + delivery`, puis `commissionAmount = totalAmount * rate`. La plateforme prélève donc une commission **sur les frais de port** du vendeur.

- **Priorité :** `Moyen`
- **Impact :** litige vendeur, marge faussée, perception d'injustice.
- **Correction :** `commissionAmount = subtotal * rate` (exclure `deliveryAmount`). Décision produit à acter, mais le défaut par défaut est incorrect.
- **Difficulté :** Faible

### 1.4.5 Machine à états des commandes **[Vérifié — plutôt sain]**

`orders.service.ts:732-762` : transitions par rôle bien bornées (`allowedTransitions`), `escrowReleaseAt` posé uniquement au `DELIVERED` (`:770-773`), restauration stock à l'annulation (`:780-791`). **C'est le point le plus solide de la logique métier.** Reste : pas de transition `REFUNDED` déclenchant un remboursement réel (pas de flux refund Stripe/FedaPay implémenté), et `DISPUTED` sans médiation.

| Constat | Priorité | Correction | Difficulté |
|---|---|---|---|
| Remboursement (`REFUNDED`) sans exécution de refund provider ni recrédit stock/portefeuille | `Élevé` | Implémenter `refund()` Stripe + FedaPay + réajustement portefeuille | Élevée |
| Dispute sans workflow (preuves, délais, arbitrage) | `Moyen` | États dispute + notifications + SLA | Moyenne |
| Paiements « reçus plusieurs fois » non détectés | `Critique` | Idempotence (1.4.2) | Moyenne |

---

## 1.5 Audit de l'architecture technique

### 1.5.1 Points forts **[Vérifié]**

- **Séparation nette** front/back, modularité NestJS par domaine (16 modules), Prisma pour l'accès données, guards globaux (`JwtAuthGuard`, `RolesGuard`), filtre d'exception et intercepteur de réponse centralisés (`app.module.ts:30-33`).
- **Sécurité de base présente** : `helmet`, `compression`, `ValidationPipe({ whitelist: true })`, throttler global, refresh token **haché en base** (`auth.service.ts:184-187`), 2FA TOTP chiffré AES-256-GCM, prefix `api/v1`, Swagger protégé par basic-auth en prod (`main.ts:1090-1105`).
- **Indexes DB pertinents** sur `Product` (×5), `Order` (×3), `Message`.
- **Jobs cron** : escrow, expiration abonnement, clôture enchères, alertes recherche.
- **Cache Redis** global + cache catégories.

### 1.5.2 Défauts d'architecture

| Constat | Priorité | Impact | Correction | Difficulté |
|---|---|---|---|---|
| **`key.txt` avec clé privée en clair à la racine du projet**, **non listé dans `.gitignore`** (vérifié : `git check-ignore key.txt` ne le couvre pas). **[Vérifié]** | `Critique` | Fuite de secret ; un `git add .` le committe ; lisible par tout process du serveur | Supprimer le fichier, **révoquer/roter la clé immédiatement**, ajouter au `.gitignore`, migrer vers un gestionnaire de secrets | Faible | Rotation clé côté fournisseur |
| **CORS autorise `localhost` en dur** même hors dev (`main.ts:1026-1035`) | `Moyen` | Surface d'attaque CSRF/dev en prod | Origines pilotées par `FRONTEND_URL` uniquement en prod | Faible | `.env` |
| **Tokens stockés en cookies non-`httpOnly`** : `setTokens` (`lib/api.ts:47-50`) utilise `js-cookie` → l'access & refresh token sont **lisibles en JavaScript** | `Élevé` | Vol de session par XSS | Passer les tokens en cookies `httpOnly` posés par le back ; le middleware Next lit déjà le cookie | Moyenne | Refonte flux auth (back pose le cookie) |
| **Guard produit-propriétaire côté front absent** (`/products/edit/[id]` : redirect useEffect only, `fonction.md`) — délégué au back **[Vérifié]** : acceptable **si** le back vérifie l'ownership sur `PATCH /products/:id`. À confirmer. | `Moyen` | Édition non autorisée si le back ne garde pas | Confirmer garde ownership back + 403 clair | Faible |
| **Pas de file d'attente (queue) réelle** : notifications, webhooks vendeur (`webhooks.dispatch`), emails sont envoyés en `fire-and-forget` `.catch(() => null)` (`orders.service.ts:707-712, 820-828`) | `Moyen` | Perte silencieuse de notifs/webhooks, pas de retry | BullMQ (Redis déjà présent) pour notifs/webhooks/emails avec retry + DLQ | Moyenne | BullMQ |
| **`dist/` commité / présent** dans `ls-backend/dist` | `Faible` | Bruit, risque de servir du code périmé | Ignorer `dist/`, build en CI/CD | Faible |
| **Health check superficiel** : ne teste que la DB (`health.controller.ts`), pas Redis/Meilisearch | `Faible` | Fausse assurance de disponibilité | Ajouter checks Redis + Meilisearch | Faible |
| **Sauvegardes DB non automatisées** (`audit.md` : « hors scope v1 ») | `Élevé` | Perte de données catastrophique | `pg_dump` planifié + rétention + test de restauration | Faible | Cron/ops |

### 1.5.3 Montée en charge **[Hypothèse]**

Architecture globalement scalable (stateless API derrière PM2 cluster, cache Redis, Meilisearch). Les vrais goulots à venir : (1) absence de queue → pics de notifications bloquants, (2) images servies sans CDN garanti **[Hypothèse — R2 mentionné mais diffusion à confirmer]**, (3) `for`-loop de création de commandes côté client qui multiplie les allers-retours réseau sur connexions lentes (marché cible).

---

# PARTIE 2 — STRATÉGIE DE REFONTE & FONCTIONNALITÉS 2026

## 2.1 Direction visuelle & Design System

**Principe directeur :** *mobile-first, sobre, rapide sur réseau lent et smartphone d'entrée de gamme.* Sur le marché cible (Afrique de l'Ouest), la performance perçue prime sur les effets. Glassmorphism et animations = accents discrets, jamais bloquants.

### 2.1.1 Tokens (à placer dans `tailwind.config.ts` + CSS variables)

```ts
// tailwind.config.ts — extrait (theme.extend)
colors: {
  primary:   { DEFAULT: '#1A3C6E', 600: '#16457F', 700: '#123863' }, // bleu LS existant (main.ts:1110)
  accent:    { DEFAULT: '#0E9F6E' },                                  // emerald déjà utilisé au checkout
  success:   '#0E9F6E', warning: '#D97706', danger: '#DC2626', info: '#2563EB',
  surface:   'rgb(var(--surface) / <alpha-value>)',
  fg:        'rgb(var(--fg) / <alpha-value>)',
  muted:     'rgb(var(--muted) / <alpha-value>)',
},
borderRadius: { xl: '0.875rem', '2xl': '1.25rem' },
boxShadow: { card: '0 1px 2px rgb(0 0 0 / 0.04), 0 4px 12px rgb(0 0 0 / 0.06)' },
```

```css
/* globals.css — Dark Mode natif via variables */
:root        { --surface: 255 255 255; --fg: 17 24 39;  --muted: 107 114 128; }
.dark        { --surface: 17 24 39;   --fg: 243 244 246;--muted: 156 163 175; }
```

| Token | Valeur | Usage |
|---|---|---|
| Espacement | échelle 4 px (`0,1,2,3,4,6,8,12`) | grille cohérente |
| Rayons | `lg 12px` (cartes), `xl 14px` (modales), `full` (badges) | homogénéité |
| Typo | `Inter` (déjà web-safe), échelle `12/14/16/20/24/32` | hiérarchie |
| Cibles tactiles | **min 44×44 px** | mobile |
| États | `hover`, `focus-visible` (ring 2px `primary`), `active`, `disabled` (opacity 50 + `cursor-not-allowed`), `loading` (spinner inline), `success`/`error` (bordure sémantique) | tous composants interactifs |

### 2.1.2 Composants à normaliser

`Button` (variants `primary/secondary/ghost/danger`, tailles `sm/md/lg`, état `loading`), `Input`/`Field` (label + hint + erreur), `Card`, `Table` (responsive → cartes empilées sur mobile), `Badge` sémantique (statut commande), `Skeleton` par bloc. La brique existe déjà (`components/ui/`) : la refonte consiste à **unifier les variantes et purger les classes ad hoc**.

## 2.2 Architecture front-end recommandée

**Conserver Next.js 14 App Router + TypeScript + Tailwind + React Query + Zustand.** La stack est moderne et adaptée ; **pas de réécriture**. Améliorations ciblées :

- **Auth par cookie `httpOnly`** (voir 1.5.2) au lieu de `js-cookie`.
- **`useInfiniteQuery`** pour le listing produits (remplacer la pagination classique) → UX mobile fluide.
- **`next/image` + `placeholder="blur"`** systématique (LCP) — à vérifier sur `ProductCard.tsx`.
- **Server Components** pour les pages catalogue/fiche produit (SEO + TTFB), Client Components réservés aux zones interactives.
- **PWA déjà présent** (`sw.js`, `manifest.ts`) : ajouter Background Sync pour le panier hors-ligne.
- Justification : la stack est déjà la bonne ; l'effort doit porter sur **sécurité auth + data-fetching + images**, pas sur un changement de framework.

## 2.3 Architecture back-end recommandée

**Conserver NestJS + Prisma + PostgreSQL + Redis.** Renforcements :

- **Idempotence** des opérations critiques (webhooks, création commande) — table `WebhookEvent`, clés d'idempotence.
- **Queue BullMQ** (Redis déjà là) pour notifications, webhooks sortants, emails, payouts → retry + DLQ.
- **Transactions élargies** : le checkout multi-vendeurs doit être **une seule transaction**.
- **Autorisation** : compléter `RolesGuard` par des guards d'ownership (produit, commande) au niveau service.
- **Secrets** : sortir tout secret du dépôt ; `.env` uniquement + coffre (Doppler/Vault/`.env` chiffré) en prod.
- **REST maintenu** (déjà en place, cohérent, Swagger v2) — GraphQL non justifié ici (surcoût sans besoin avéré).

## 2.4 Fonctionnalités marketplace à compléter (priorisées)

| Fonctionnalité | État réel | Priorité |
|---|---|---|
| **Portefeuille vendeur + retraits (payout)** | **Absent** | `Critique` |
| **Commande-parent / sous-commandes multi-vendeurs** | Absent (N commandes plates) | `Critique` |
| **Réservation de stock expirable** | Absent | `Critique` |
| **Remboursements réels (refund provider)** | Statut `REFUNDED` sans exécution | `Élevé` |
| **Gate KYC avant vente** | Partiel | `Élevé` |
| Signaler annonce / Répondre avis / Ouvrir litige (brancher orphelins) | UI morte | `Moyen` |
| Préférences notifications persistées | Non persistées (`fonction.md`) | `Moyen` |
| Activation 2FA depuis le profil | Orphelin (back prêt) | `Moyen` |
| Recommandations / vus récemment | Partiel (`RecentlyViewedSection` présent) | `Faible` |

## 2.5 Paiements & Mobile Money

Le socle FedaPay/Stripe/Escrow est là. **Manques bloquants :**

1. **Signature webhook obligatoire** (1.4.3).
2. **Idempotence** (1.4.2).
3. **Payout vendeur** (FedaPay Payouts ou virement admin tracé).
4. **Refund** total/partiel.
5. **Expiration des paiements en attente** : cron qui, après X min sans confirmation, passe la commande `CANCELLED` **et libère le stock réservé**.
6. **Rapprochement** : job de réconciliation quotidien paiements ↔ commandes (détecte les `PENDING` fantômes).

UX Mobile Money adaptée aux **confirmations retardées** : écran « en attente de confirmation opérateur » avec polling + notification push/WhatsApp quand `approved`.

## 2.6 Performance, SEO, accessibilité

- **Core Web Vitals** : `next/image` blur, code-splitting déjà natif App Router, lazy des sections home.
- **SEO** : sitemap/robots/OG déjà présents (`audit.md`) — ajouter JSON-LD `Product` sur la fiche produit.
- **Accessibilité WCAG** : poursuivre l'effort amorcé (aria-labels, skip-nav), ajouter `prefers-reduced-motion` sur Framer Motion, focus-visible partout, contrastes AA sur les badges.
- **Réseau lent** : réduire le nombre d'appels du checkout (endpoint unique), compresser images, cache SWR agressif sur listings.

---

# PARTIE 3 — CODE REFACTORISÉ (POINTS CRITIQUES)

> Priorisation stricte : seuls les défauts `Critique`/`Élevé` structurels sont recodés. Le reste relève de la Partie 4 (plan).

## 3.1 Analyse ciblée

Fichiers à corriger en priorité, par ordre de risque :
1. `ls-backend/src/payments/payments.service.ts` — signature webhook + idempotence.
2. `ls-backend/src/orders/orders.service.ts` — décrément stock atomique + réservation.
3. `ls-backend/prisma/schema.prisma` — `SellerWallet`, `WalletTransaction`, `PayoutRequest`, `StockReservation`, `WebhookEvent`, `Order.parentId`.
4. `ls-frontend/src/app/checkout/page.tsx` — remplacer la boucle par un appel unique.
5. `key.txt` — suppression + rotation.

## 3.2 Correctifs back-end

### 3.2.1 Webhook FedaPay — signature obligatoire + idempotence

**Fichier :** `ls-backend/src/payments/payments.service.ts`
**Rôle :** rejeter tout callback non signé et garantir un traitement unique.

```ts
async handleFedaPayCallback(rawBody: Buffer, signature?: string) {
  const webhookSecret = this.configService.get<string>('fedapay.webhookSecret');

  // 1) Signature TOUJOURS obligatoire (fail-closed)
  if (!webhookSecret) {
    this.logger.error('FEDAPAY_WEBHOOK_SECRET manquant — callback rejeté');
    throw new UnauthorizedException('Webhook non configuré');
  }
  if (!signature) throw new UnauthorizedException('Signature manquante');

  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const provided = signature.replace(/^sha256=/, '');
  const ok =
    provided.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!ok) throw new UnauthorizedException('Signature FedaPay invalide');

  const data = JSON.parse(rawBody.toString('utf8'));
  const transaction = data?.transaction;
  if (!transaction?.id) return { received: true };

  // 2) Idempotence : un événement provider n'est traité qu'une fois
  const eventKey = `fedapay:${transaction.id}:${transaction.status}`;
  try {
    await this.prisma.webhookEvent.create({ data: { provider: 'FEDAPAY', eventKey } });
  } catch {
    this.logger.warn(`Webhook FedaPay déjà traité: ${eventKey}`);
    return { received: true, duplicate: true };
  }

  const payments = await this.prisma.payment.findMany({
    where: { providerRef: String(transaction.id) },
  });
  if (!payments.length) return { received: true };

  if (transaction.status === 'approved') {
    await Promise.all(payments.map((p) => this.confirmPayment(p.orderId, String(transaction.id))));
  } else if (['declined', 'canceled', 'cancelled'].includes(transaction.status)) {
    await Promise.all(payments.map((p) => this.failPayment(p.orderId)));
  }
  return { received: true };
}
```

**Confirmation gardée (idempotente) :**

```ts
private async confirmPayment(orderId: string, providerRef: string) {
  // Ne confirme QUE si encore PENDING → rejeu sans effet
  const res = await this.prisma.payment.updateMany({
    where: { orderId, status: 'PENDING' },
    data: { status: 'COMPLETED', providerRef },
  });
  if (res.count === 0) {
    this.logger.warn(`confirmPayment ignoré (déjà traité) order=${orderId}`);
    return;
  }
  await this.prisma.order.updateMany({
    where: { id: orderId, status: 'PENDING' },
    data: { status: 'PAYMENT_CONFIRMED' },
  });
  this.logger.log(`Paiement confirmé (idempotent) order=${orderId}`);
}
```

> **Changements dépendants :** appliquer la même garde d'idempotence dans `handleStripeWebhook` (créer un `WebhookEvent` avec `stripe:${event.id}`). **Migration DB requise** (modèle `WebhookEvent`, cf. 3.4).

### 3.2.2 Stock — décrément atomique + réservation expirable

**Fichier :** `ls-backend/src/orders/orders.service.ts`
**Rôle :** empêcher stock négatif et stock fantôme.

```ts
// Décrément CONDITIONNEL atomique : échoue si stock insuffisant, sans race
const dec = await tx.product.updateMany({
  where: { id: product.id, quantity: { gte: quantity } },
  data: { quantity: { decrement: quantity } },
});
if (dec.count === 0) {
  throw new BadRequestException('Stock insuffisant'); // rollback transaction
}
```

**Réservation au lieu de décrément définitif** (recommandé) — le stock n'est **débité définitivement qu'au `PAYMENT_CONFIRMED`**, sinon libéré par cron :

```ts
// à la création : créer une réservation expirable + décrément atomique
await tx.stockReservation.create({
  data: { productId: product.id, orderId: newOrder.id, quantity, expiresAt: new Date(Date.now() + 15*60*1000) },
});
```

```ts
// ls-backend/src/common/jobs/stock-reservation.job.ts (NOUVEAU)
@Cron(CronExpression.EVERY_5_MINUTES)
async releaseExpiredReservations() {
  const expired = await this.prisma.stockReservation.findMany({
    where: { expiresAt: { lt: new Date() }, releasedAt: null,
             order: { status: 'PENDING' } },
  });
  for (const r of expired) {
    await this.prisma.$transaction([
      this.prisma.product.update({ where: { id: r.productId }, data: { quantity: { increment: r.quantity } } }),
      this.prisma.stockReservation.update({ where: { id: r.id }, data: { releasedAt: new Date() } }),
      this.prisma.order.update({ where: { id: r.orderId }, data: { status: 'CANCELLED', cancellationReason: 'Paiement non finalisé' } }),
    ]);
  }
}
```

> **Changements dépendants :** modèle `StockReservation` (3.4) ; enregistrer le job dans `app.module.ts` ; supprimer le décrément non gardé actuel (`orders.service.ts:699-702`).

### 3.2.3 Commission hors livraison

**Fichier :** `ls-backend/src/orders/orders.service.ts:665`

```ts
- const commissionAmount = totalAmount * commissionRate;
+ const commissionAmount = subtotal * commissionRate; // exclut les frais de port
  const sellerAmount = totalAmount - commissionAmount;
```

### 3.2.4 Portefeuille vendeur — crédit à la libération d'escrow

**Fichier :** `ls-backend/src/orders/orders.service.ts` (`releaseEscrow`)

```ts
private async releaseEscrow(orderId: string) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId }, include: { payment: true },
  });
  if (!order?.payment || order.payment.escrowReleasedAt) return; // idempotent

  await this.prisma.$transaction([
    this.prisma.payment.update({ where: { orderId }, data: { escrowReleasedAt: new Date() } }),
    // Crédit du portefeuille VENDEUR (le montant net lui revient enfin)
    this.prisma.sellerWallet.upsert({
      where: { sellerId: order.sellerId },
      update: { balance: { increment: order.sellerAmount } },
      create: { sellerId: order.sellerId, balance: order.sellerAmount },
    }),
    this.prisma.walletTransaction.create({
      data: { sellerId: order.sellerId, orderId, type: 'CREDIT',
              amount: order.sellerAmount, label: `Vente ${order.orderNumber}` },
    }),
    // Points fidélité acheteur (conservé)
    this.prisma.loyaltyAccount.upsert({
      where: { userId: order.buyerId },
      update: { points: { increment: Math.floor(order.totalAmount / 1000) } },
      create: { userId: order.buyerId, points: Math.floor(order.totalAmount / 1000),
                totalEarned: Math.floor(order.totalAmount / 1000) },
    }),
  ]);
}
```

> **Nouveau module `payouts`** (à créer) : `POST /wallet/payout` (vendeur demande un retrait, débite `balance` sous garde `balance >= amount`, crée `PayoutRequest` en `PENDING`) + endpoints admin de validation/versement. Squelette en 4.4 (Phase 4).

## 3.3 Correctif front-end — checkout en un appel

**Fichier :** `ls-frontend/src/app/checkout/page.tsx` (remplace la boucle `:180-187`)

```ts
// UN SEUL appel transactionnel : le back groupe par vendeur et crée parent + sous-commandes
const { data } = await api.post('/orders/checkout', {
  items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
  addressId, notes: fullNotes,
})
const parentOrderId = data.data.parentOrderId
const orderIds = data.data.orderIds

// puis un seul paiement pour l'ensemble
const pay = await api.post('/payments/fedapay/checkout', {
  orderIds, method, phoneNumber, country,
})
window.location.href = pay.data.data.paymentUrl
```

> **Nouvel endpoint back `POST /orders/checkout`** : valide tout le panier, groupe par `sellerId`, crée en **une transaction** un `Order` parent (`parentId = null`) + N `Order` enfants (`parentId = parent.id`), applique le décrément atomique/réservation par item. Élimine la fenêtre d'incohérence côté client.

## 3.4 Modèle de données — ajouts Prisma

**Fichier :** `ls-backend/prisma/schema.prisma` (nouveaux modèles + champs)

```prisma
// Idempotence des webhooks providers
model WebhookEvent {
  id        String   @id @default(uuid())
  provider  String   // 'STRIPE' | 'FEDAPAY'
  eventKey  String
  createdAt DateTime @default(now())
  @@unique([provider, eventKey])
  @@map("webhook_events")
}

// Réservation de stock expirable
model StockReservation {
  id         String    @id @default(uuid())
  productId  String
  orderId    String
  quantity   Int
  expiresAt  DateTime
  releasedAt DateTime?
  createdAt  DateTime  @default(now())
  order      Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  @@index([expiresAt, releasedAt])
  @@map("stock_reservations")
}

// Portefeuille vendeur
model SellerWallet {
  id        String   @id @default(uuid())
  sellerId  String   @unique
  balance   Float    @default(0)
  currency  String   @default("XOF")
  updatedAt DateTime @updatedAt
  seller    User     @relation(fields: [sellerId], references: [id])
  transactions WalletTransaction[]
  @@map("seller_wallets")
}

model WalletTransaction {
  id        String   @id @default(uuid())
  sellerId  String
  orderId   String?
  type      String   // 'CREDIT' | 'PAYOUT' | 'REFUND_DEBIT'
  amount    Float
  label     String
  createdAt DateTime @default(now())
  wallet    SellerWallet @relation(fields: [sellerId], references: [sellerId])
  @@index([sellerId, createdAt])
  @@map("wallet_transactions")
}

// Demande de retrait vendeur
model PayoutRequest {
  id          String   @id @default(uuid())
  sellerId    String
  amount      Float
  method      String   // 'FEDAPAY' | 'BANK_TRANSFER'
  destination Json     // n° mobile money ou IBAN
  status      String   @default("PENDING") // PENDING | APPROVED | PAID | REJECTED
  processedBy String?
  processedAt DateTime?
  createdAt   DateTime @default(now())
  @@index([sellerId, status])
  @@map("payout_requests")
}

// Commande-parent / sous-commandes (ajouts au modèle Order existant)
model Order {
  // ... champs existants ...
  parentId  String?
  parent    Order?   @relation("OrderChildren", fields: [parentId], references: [id])
  children  Order[]  @relation("OrderChildren")
  reservations StockReservation[]
  @@index([parentId])
}
```

> **Migration :** `prisma migrate dev --name wallet_reservation_idempotency_suborders`. Rétro-compatible (champs nullable). Un script de backfill peut créer des `SellerWallet` vides pour les vendeurs existants.

## 3.5 Sécurité immédiate — secret en clair

```bash
# 1) retirer du disque et de tout futur commit
git rm --cached key.txt 2>/dev/null; rm -f /var/www/shopls-pro/key.txt
echo "key.txt" >> /var/www/shopls-pro/.gitignore
# 2) ROTATION OBLIGATOIRE de la clé exposée côté fournisseur (la considérer compromise)
# 3) déplacer la valeur rotée dans ls-backend/.env (déjà git-ignoré)
```

---

# PARTIE 4 — RECOMMANDATIONS, MICRO-INTERACTIONS & PLAN

## 4.1 Micro-interactions (rapides, discrètes, `prefers-reduced-motion`-aware)

| Action | Retour |
|---|---|
| Ajout au panier | badge panier +1 avec micro-scale 150 ms + toast |
| Suppression article | fade-out ligne + toast « annuler » (5 s) |
| Modif quantité | débounce 300 ms, chiffre qui « tick » |
| Coupon appliqué | ligne total qui recalcule avec surbrillance verte brève |
| Validation formulaire | champ en erreur : shake 1× + bordure `danger` + message |
| Chargement produits | skeleton cards (pas de spinner plein écran) |
| Sélection variante | mise à jour image + prix sans reflow |
| Paiement en attente (Mobile Money) | pulsation douce + texte « confirmation opérateur… » |
| Paiement échoué | icône `danger` + CTA « réessayer » |
| Nouvelle notification | pastille + slide-in panneau |

Toutes : durée ≤ 200 ms, désactivées si `prefers-reduced-motion: reduce`, non bloquantes.

## 4.2 États d'interface obligatoires (par fonctionnalité clé)

Pour **chaque** page transactionnelle : `loading` (skeleton), `success`, `error` (toast + inline), `vide` (EmptyState), `hors-ligne` (page `/offline` déjà présente), `session expirée` (redirect login + `?next=`), `accès refusé` (403 explicite), `paiement en attente`, `paiement échoué`, `stock insuffisant` (message + retrait auto du panier), `action irréversible` (Modal de confirmation), `service externe indisponible` (FedaPay/Stripe down → message + réessai).

## 4.3 Plan d'implémentation chronologique

### Phase 0 — Sécurisation immédiate (1–2 j)
- **Tâches :** supprimer + roter `key.txt` (3.5) ; signature webhook FedaPay obligatoire (3.2.1) ; garde CORS prod (1.5.2) ; sauvegardes `pg_dump` planifiées.
- **Prérequis :** accès fournisseur pour rotation clé.
- **Risques :** rotation clé mal propagée → paiements KO (tester sur sandbox d'abord).
- **Livrables :** secret hors dépôt ; webhook fail-closed.
- **Validation :** POST callback non signé → 401 ; paiement sandbox OK.

### Phase 1 — Stabilisation métier (1–2 sem.)
- **Tâches :** idempotence webhooks Stripe+FedaPay (3.2.1, modèle `WebhookEvent`) ; décrément stock atomique + réservation + cron (3.2.2) ; commission hors livraison (3.2.3) ; expiration paiements en attente ; gate KYC avant vente.
- **Prérequis :** migration Prisma (3.4).
- **Risques :** migration en prod (faire en fenêtre calme, backup préalable).
- **Livrables :** plus de double-vente ni double-confirmation ; plus de stock fantôme.
- **Tests :** test de concurrence (2 achats simultanés du dernier exemplaire) ; rejeu de webhook (doit être no-op) ; abandon panier → stock restauré après 15 min.

### Phase 2 — Portefeuille vendeur & sous-commandes (2–3 sem.)
- **Tâches :** modèles `SellerWallet`/`WalletTransaction`/`PayoutRequest` (3.4) ; crédit à la libération escrow (3.2.4) ; `POST /orders/checkout` transactionnel + parent/enfants ; front checkout en un appel (3.3) ; module `payouts` + UI solde/retrait vendeur ; validation payout admin.
- **Prérequis :** Phase 1.
- **Risques :** cohérence financière → tout sous transaction + idempotence.
- **Livrables :** vendeurs enfin payés ; panier multi-vendeurs cohérent.
- **Tests :** vente → COMPLETED → solde crédité une seule fois ; demande de retrait → débit unique ; commande multi-vendeurs = 1 paiement, N sous-commandes.

### Phase 3 — UX/UI & Design System (2–3 sem.)
- **Tâches :** tokens Tailwind + Dark Mode (2.1) ; unifier `Button/Input/Card/Table/Badge` ; brancher les CTA orphelins (signaler, répondre avis, litige, 2FA, préférences notif) ; états d'interface (4.2) ; micro-interactions (4.1) ; cookies `httpOnly`.
- **Livrables :** cohérence visuelle, zéro bouton mort.
- **Tests :** audit Lighthouse a11y ≥ 95 ; navigation clavier complète.

### Phase 4 — Fonctionnalités avancées (3–4 sem.)
- **Tâches :** refund réel Stripe+FedaPay (total/partiel) ; workflow litiges (preuves, SLA) ; queue BullMQ (notifs/webhooks/emails/payouts) ; `useInfiniteQuery` catalogue ; JSON-LD produit ; recommandations.
- **Livrables :** remboursements opérationnels, notifications fiables (retry).
- **Tests :** refund partiel → portefeuille ajusté ; webhook sortant en échec → retry.

### Phase 5 — Performance & prod (1–2 sem.)
- **Tâches :** CDN images + `next/image` blur ; health check Redis/Meilisearch ; job de réconciliation paiements ; monitoring (Sentry déjà là) + alertes ; tests de charge ; backups testés en restauration.
- **Livrables :** Core Web Vitals verts ; observabilité complète.
- **Tests :** k6/Artillery sur checkout ; restauration DB à blanc réussie.

## 4.4 Conclusion

### Les 10 problèmes les plus urgents
1. `key.txt` : clé privée en clair, non git-ignorée → **roter maintenant**.
2. Webhook FedaPay confirmable **sans signature** si secret absent → confirmation frauduleuse.
3. Confirmation de paiement **non idempotente** → double traitement sur rejeu.
4. Stock décrémenté avant paiement, **sans réservation ni verrou** → stock fantôme + double-vente.
5. **Aucun portefeuille vendeur ni retrait** → vendeurs jamais payés.
6. Panier « multi-vendeurs » = N commandes plates créées en boucle client → incohérence + frais dupliqués.
7. Commission prélevée **sur les frais de livraison**.
8. Tokens en cookies **non-`httpOnly`** → vol par XSS.
9. **Remboursements** `REFUNDED` sans exécution réelle de refund.
10. **Sauvegardes DB** non automatisées.

### Les 10 améliorations à plus fort impact
1. Endpoint `POST /orders/checkout` transactionnel (parent/sous-commandes).
2. Idempotence webhooks (`WebhookEvent`).
3. Décrément stock atomique conditionnel.
4. Réservation de stock expirable + cron.
5. Portefeuille vendeur + module payouts.
6. Signature webhook obligatoire (fail-closed).
7. Queue BullMQ (fiabilité notifs/webhooks/emails).
8. Design system en tokens + Dark Mode natif.
9. Cookies `httpOnly` pour l'auth.
10. Refund + workflow litiges réels.

### Gains attendus
- **UX :** parcours de paiement plus court (1 appel), zéro CTA mort, feedback systématique, fiche produit rapide sur réseau lent.
- **Conversion :** checkout invité + réservation de stock visible + confirmations Mobile Money rassurantes → moins d'abandons.
- **Sécurité :** secret roté, webhooks signés et idempotents, auth `httpOnly` → surface de fraude drastiquement réduite.
- **Maintenabilité :** tokens + composants unifiés + queue + transactions → dette réduite, incidents traçables.

### Décisions d'architecture
- **À conserver :** NestJS + Prisma + PostgreSQL + Redis ; Next.js 14 App Router + React Query + Zustand ; machine à états commandes (`orders.service.ts`) ; guards/filtre/intercepteur globaux ; Meilisearch ; PWA ; i18n.
- **À remplacer progressivement :** auth `js-cookie` → cookies `httpOnly` ; `fire-and-forget` notifs → BullMQ ; pagination classique → infinite query ; `confirm()`/`alert()` → Modals.
- **À reconstruire entièrement :** le **flux financier** (checkout multi-vendeurs, portefeuille, payouts, refunds, idempotence) et la **gestion de stock** (réservation atomique). Ce sont les deux chantiers qui séparent le prototype de la marketplace de production.

---

*Fin de `ameliorationv2.md`. Audit fondé exclusivement sur les fichiers réellement lus du dépôt `/var/www/shopls-pro` ; les jugements non prouvés par le code sont marqués `[Hypothèse]`.*
