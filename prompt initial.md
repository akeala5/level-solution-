# RÔLE ET OBJECTIF

Agis en tant qu’**Architecte Full-Stack Senior**, **Expert UI/UX spécialisé dans les standards professionnels 2026** et **Lead Product Manager expert des plateformes e-commerce et marketplaces multi-vendeurs**.

Je vais te fournir le code source, l’arborescence, des captures d’écran ou une description fonctionnelle de mon application marketplace actuelle.

Ton objectif est de réaliser un **audit complet de l’existant**, puis de proposer une **refonte globale, réaliste et directement exploitable**, afin d’obtenir une plateforme de vente :

* extrêmement professionnelle ;
* moderne et épurée ;
* fluide sur mobile, tablette et ordinateur ;
* performante et sécurisée ;
* accessible ;
* évolutive ;
* maintenable ;
* adaptée à une marketplace multi-vendeurs ;
* prête pour une mise en production à grande échelle.

Tu dois analyser à la fois :

* l’interface utilisateur ;
* l’expérience d’achat ;
* la logique métier ;
* l’architecture front-end et back-end ;
* la structure de la base de données ;
* les performances ;
* la sécurité ;
* la gestion des vendeurs ;
* la gestion des commandes, paiements, livraisons, retours et remboursements ;
* la capacité de l’application à évoluer.

# FORMAT DE SORTIE OBLIGATOIRE

L’intégralité de ta réponse doit être rédigée en **Markdown** et placée dans un seul bloc de code portant le nom suivant :

```text
ameliorationv2.md
```

Le document doit être clair, détaillé, hiérarchisé et exploitable par une équipe de développement.

Pour chaque problème identifié, indique obligatoirement :

1. le constat ;
2. son niveau de priorité : `Critique`, `Élevé`, `Moyen` ou `Faible` ;
3. son impact utilisateur ou métier ;
4. la correction recommandée ;
5. la difficulté estimée ;
6. les dépendances techniques éventuelles.

Structure impérativement le document selon les quatre axes suivants.

# 1. AUDIT CRITIQUE ET ARCHITECTURE

## 1.1 Audit UI/UX

Analyse notamment :

* la hiérarchie visuelle ;
* la cohérence des couleurs ;
* les contrastes ;
* la lisibilité ;
* les espacements ;
* les tailles de police ;
* les zones de clic ;
* les boutons d’action ;
* les formulaires ;
* les tableaux ;
* les cartes produits ;
* les menus ;
* la navigation mobile ;
* les modales ;
* les états vides ;
* les messages d’erreur ;
* les loaders ;
* les confirmations ;
* l’accessibilité ;
* la compatibilité avec les petits écrans.

Identifie les éléments qui donnent à l’application un aspect amateur, ancien, surchargé ou incohérent.

Explique précisément pourquoi ces problèmes empêchent d’obtenir une expérience réellement premium.

## 1.2 Audit du parcours client

Analyse l’ensemble du tunnel de conversion :

* page d’accueil ;
* recherche ;
* catégories ;
* filtres ;
* fiche produit ;
* variantes ;
* stock ;
* favoris ;
* ajout au panier ;
* panier multi-vendeurs ;
* création de compte ;
* connexion ;
* commande en invité ;
* choix de l’adresse ;
* choix du mode de livraison ;
* sélection du moyen de paiement ;
* validation du paiement ;
* confirmation de commande ;
* suivi de commande ;
* avis client ;
* retour ;
* remboursement ;
* support après-vente.

Détecte les points de friction, les clics inutiles, les ruptures de parcours, les informations manquantes et les risques d’abandon de panier.

## 1.3 Audit du parcours vendeur

Analyse les fonctionnalités nécessaires au vendeur :

* inscription ;
* vérification d’identité ;
* validation par l’administration ;
* création de boutique ;
* configuration du profil vendeur ;
* ajout et modification de produits ;
* gestion des variantes ;
* gestion du stock ;
* traitement des commandes ;
* préparation des colis ;
* suivi des expéditions ;
* gestion des retours ;
* gestion des remboursements ;
* consultation des commissions ;
* consultation du solde ;
* demandes de retrait ;
* statistiques de vente ;
* notifications ;
* litiges ;
* support.

Vérifie que les espaces client, vendeur, livreur et administrateur sont clairement isolés au niveau fonctionnel, visuel et technique.

## 1.4 Audit de la logique métier

Analyse les règles métier liées à :

* la gestion des rôles et permissions ;
* la séparation des boutiques ;
* la propriété des produits ;
* la gestion des commissions ;
* la disponibilité des stocks ;
* les réservations temporaires de stock ;
* les commandes multi-vendeurs ;
* la division d’une commande en sous-commandes ;
* les frais de livraison ;
* les taxes ;
* les codes promotionnels ;
* les remboursements partiels ;
* les annulations ;
* les retours ;
* les litiges ;
* les paiements échoués ;
* les paiements en attente ;
* les paiements reçus plusieurs fois ;
* les webhooks dupliqués ;
* les tentatives de fraude ;
* la synchronisation entre paiement, commande et stock.

Identifie les incohérences susceptibles de provoquer :

* une double vente ;
* un stock négatif ;
* un double paiement ;
* une double validation de commande ;
* une erreur de commission ;
* une mauvaise affectation vendeur ;
* une perte financière ;
* une fuite de données ;
* une élévation de privilèges.

## 1.5 Audit de l’architecture technique

Analyse :

* l’organisation du code ;
* la séparation front-end/back-end ;
* la modularité ;
* les dépendances ;
* les composants réutilisables ;
* la gestion des états ;
* les appels API ;
* la validation des données ;
* la gestion des erreurs ;
* la journalisation ;
* la configuration des environnements ;
* la base de données ;
* les index ;
* les transactions ;
* les migrations ;
* les files d’attente ;
* le cache ;
* le stockage des médias ;
* les tâches planifiées ;
* les services externes ;
* la stratégie de sauvegarde ;
* la capacité à supporter une forte montée en charge.

Explique clairement les limites actuelles en matière de performance, sécurité, maintenance et scalabilité.

# 2. STRATÉGIE DE REFONTE ET FONCTIONNALITÉS MODERNES — VISION 2026

## 2.1 Direction visuelle

Définis une nouvelle direction artistique professionnelle basée sur :

* le minimalisme ;
* une hiérarchie visuelle forte ;
* une utilisation stratégique des espaces blancs ;
* un design mobile-first ;
* une grille cohérente ;
* des composants homogènes ;
* un Dark Mode natif ;
* un Glassmorphism léger et maîtrisé ;
* des ombres discrètes ;
* des bordures subtiles ;
* des badges sémantiques ;
* des tableaux modernes ;
* des skeleton loaders ;
* des états interactifs visibles ;
* des animations courtes et utiles.

Évite les effets trop chargés, les couleurs excessives et les animations qui nuisent aux performances ou à la lisibilité.

Propose un véritable design system comprenant :

* palette de couleurs ;
* couleurs sémantiques ;
* typographies ;
* échelle d’espacement ;
* rayons de bordure ;
* ombres ;
* tailles de boutons ;
* styles de champs ;
* styles de cartes ;
* styles de tableaux ;
* styles de badges ;
* icônes ;
* états `hover`, `focus`, `active`, `disabled`, `loading`, `success` et `error`.

## 2.2 Architecture front-end recommandée

Propose une architecture moderne adaptée au projet, par exemple :

* React ;
* Next.js ;
* TypeScript ;
* Tailwind CSS ;
* composants réutilisables ;
* validation de formulaires ;
* gestion centralisée des appels API ;
* gestion du cache ;
* gestion des états globaux ;
* rendu côté serveur lorsque cela est pertinent ;
* optimisation SEO ;
* chargement différé ;
* découpage du code ;
* optimisation des images ;
* Progressive Web App si nécessaire.

Ne recommande pas une technologie uniquement parce qu’elle est populaire. Justifie chaque choix en fonction des besoins réels de l’application.

## 2.3 Architecture back-end recommandée

Propose une architecture back-end sécurisée et modulaire comprenant :

* API REST ou GraphQL, avec justification ;
* séparation par domaines métier ;
* services ;
* repositories ;
* contrôleurs ;
* DTO ;
* validation serveur ;
* gestion centralisée des exceptions ;
* journalisation structurée ;
* authentification sécurisée ;
* autorisation par rôles et permissions ;
* tokens d’accès et de rafraîchissement ;
* limitation de débit ;
* protection CSRF si nécessaire ;
* protection contre les injections ;
* protection contre les attaques XSS ;
* gestion des secrets ;
* chiffrement des données sensibles ;
* transactions de base de données ;
* traitement asynchrone ;
* files d’attente ;
* cache ;
* système d’événements ;
* idempotence des opérations critiques.

## 2.4 Fonctionnalités marketplace indispensables

Propose les fonctionnalités modernes nécessaires à une marketplace professionnelle en 2026 :

* espace client ;
* espace vendeur ;
* espace administrateur ;
* espace livreur si nécessaire ;
* onboarding vendeur ;
* vérification KYC ;
* boutique personnalisée ;
* catalogue multi-vendeurs ;
* gestion des variantes ;
* stock par vendeur ou entrepôt ;
* panier multi-vendeurs ;
* commandes et sous-commandes ;
* moteur de commissions ;
* portefeuille vendeur ;
* paiements fractionnés ;
* demandes de retrait ;
* gestion des remboursements ;
* système de litiges ;
* avis et notations ;
* favoris ;
* comparaison de produits ;
* recommandations personnalisées ;
* produits récemment consultés ;
* recherche intelligente ;
* filtres dynamiques ;
* suggestions automatiques ;
* suivi logistique en temps réel ;
* notifications par e-mail, SMS, push ou WhatsApp ;
* coupons ;
* campagnes promotionnelles ;
* ventes flash ;
* gestion des abandons de panier ;
* facturation ;
* rapports et statistiques ;
* export des données ;
* journal d’audit ;
* gestion des contenus et bannières ;
* centre d’assistance.

## 2.5 Paiements et Mobile Money

Prévois une architecture permettant l’intégration de plusieurs moyens de paiement :

* cartes bancaires ;
* Mobile Money ;
* portefeuille interne ;
* paiement à la livraison ;
* bons ou avoirs ;
* paiements partiels si le modèle métier l’exige.

La stratégie doit inclure :

* webhooks sécurisés ;
* vérification de signature ;
* idempotence ;
* gestion des doublons ;
* statuts de transaction ;
* rapprochement des paiements ;
* reprise après erreur ;
* journalisation complète ;
* remboursement total ou partiel ;
* expiration des paiements en attente ;
* prévention de la fraude ;
* synchronisation transactionnelle entre paiement, commande et stock.

## 2.6 Performance, SEO et accessibilité

Définis les objectifs et corrections liés à :

* Core Web Vitals ;
* temps de chargement ;
* optimisation des requêtes ;
* lazy loading ;
* cache ;
* CDN ;
* compression ;
* optimisation des images ;
* pagination ;
* recherche indexée ;
* SEO technique ;
* balises structurées ;
* URL propres ;
* sitemap ;
* métadonnées sociales ;
* accessibilité WCAG ;
* navigation clavier ;
* lecteurs d’écran ;
* contrastes ;
* réduction des animations selon les préférences utilisateur.

# 3. CODE REFACTORISÉ ET OPTIMISÉ

## 3.1 Analyse du code fourni

Identifie les portions de code :

* dupliquées ;
* trop longues ;
* fortement couplées ;
* obsolètes ;
* peu lisibles ;
* non sécurisées ;
* lentes ;
* difficiles à tester ;
* non responsives ;
* susceptibles de provoquer des erreurs.

Ne réécris pas arbitrairement tout le projet. Priorise les portions critiques qui apportent le plus de valeur.

## 3.2 Refactorisation

Réécris les parties critiques en appliquant :

* Clean Code ;
* SOLID ;
* DRY ;
* KISS ;
* séparation des responsabilités ;
* composants réutilisables ;
* fonctions courtes ;
* nommage explicite ;
* typage strict ;
* validation des entrées ;
* gestion des erreurs ;
* configuration centralisée ;
* requêtes préparées ;
* transactions ;
* sécurité des sessions ;
* contrôle des permissions ;
* tests unitaires et tests d’intégration lorsque cela est pertinent.

## 3.3 Exigences du code proposé

Le code généré doit être :

* complet et cohérent ;
* directement intégrable ;
* responsive ;
* mobile-first ;
* accessible ;
* sécurisé ;
* commenté uniquement lorsque cela apporte une réelle valeur ;
* compatible avec l’architecture existante ou accompagné d’un plan de migration ;
* prêt pour un environnement de production.

Pour chaque extrait de code, précise :

* le nom du fichier ;
* son emplacement recommandé ;
* son rôle ;
* les dépendances ;
* les changements à effectuer dans les autres fichiers ;
* les éventuelles migrations de base de données.

## 3.4 Modèle de données

Lorsque nécessaire, propose une structure de base de données améliorée pour les principales entités :

* utilisateurs ;
* rôles ;
* permissions ;
* vendeurs ;
* boutiques ;
* produits ;
* variantes ;
* catégories ;
* stocks ;
* entrepôts ;
* paniers ;
* commandes ;
* sous-commandes ;
* lignes de commande ;
* paiements ;
* transactions ;
* commissions ;
* retraits vendeurs ;
* livraisons ;
* retours ;
* remboursements ;
* avis ;
* coupons ;
* notifications ;
* journaux d’audit.

Ajoute les relations, contraintes, index et règles d’intégrité importantes.

# 4. RECOMMANDATIONS, MICRO-INTERACTIONS ET PLAN D’IMPLÉMENTATION

## 4.1 Micro-interactions

Propose des animations et retours visuels utiles pour :

* l’ajout au panier ;
* la suppression d’un article ;
* la modification d’une quantité ;
* l’application d’un coupon ;
* la validation d’un formulaire ;
* le chargement des produits ;
* la sélection d’une variante ;
* la confirmation d’une commande ;
* la validation d’un paiement ;
* l’échec d’un paiement ;
* la mise à jour d’un statut ;
* la réception d’une notification ;
* l’ouverture des menus mobiles ;
* les actions administratives sensibles.

Chaque micro-interaction doit être :

* rapide ;
* discrète ;
* accessible ;
* cohérente ;
* non bloquante ;
* adaptée aux appareils peu puissants.

## 4.2 États d’interface obligatoires

Pour chaque fonctionnalité importante, prévois les états suivants :

* chargement ;
* succès ;
* erreur ;
* vide ;
* hors connexion ;
* session expirée ;
* accès refusé ;
* paiement en attente ;
* paiement échoué ;
* stock insuffisant ;
* action irréversible ;
* données partielles ;
* service externe indisponible.

## 4.3 Plan d’implémentation chronologique

Présente une feuille de route organisée en phases :

### Phase 0 — Sécurisation immédiate

Corrections critiques pouvant provoquer une perte de données, une faille de sécurité ou une perte financière.

### Phase 1 — Stabilisation

Correction de la logique métier, de la base de données, des sessions, des rôles, des paiements et des stocks.

### Phase 2 — Refonte UX/UI

Mise en place du design system, amélioration de la navigation, refonte responsive et optimisation du tunnel d’achat.

### Phase 3 — Architecture et refactorisation

Découpage du code, modularisation, API, composants, services, tests et documentation.

### Phase 4 — Fonctionnalités marketplace avancées

Vendeurs, commissions, retraits, livraisons, retours, recommandations, notifications et statistiques.

### Phase 5 — Performance et préparation à la production

Cache, CDN, optimisation des requêtes, monitoring, sauvegardes, logs, alertes, tests de charge et déploiement.

Pour chaque phase, indique :

* les tâches ;
* les priorités ;
* les prérequis ;
* les risques ;
* les livrables attendus ;
* les critères de validation ;
* les tests à exécuter.

## 4.4 Conclusion obligatoire

Termine le document par :

* les dix problèmes les plus urgents ;
* les dix améliorations ayant le plus fort impact ;
* les gains attendus sur l’expérience utilisateur ;
* les gains attendus sur la conversion ;
* les gains attendus sur la sécurité ;
* les gains attendus sur la maintenabilité ;
* les choix techniques recommandés ;
* les éléments à conserver dans l’architecture actuelle ;
* les éléments à remplacer progressivement ;
* les éléments à reconstruire entièrement.

# RÈGLES IMPORTANTES

* Ne donne pas de recommandations vagues ou génériques.
* Base ton audit uniquement sur les fichiers, captures et informations réellement fournis.
* Sépare clairement les constats vérifiés des hypothèses.
* Signale les informations manquantes sans bloquer l’analyse.
* En cas d’information absente, propose une recommandation raisonnable en précisant qu’il s’agit d’une hypothèse.
* Ne supprime aucune fonctionnalité existante sans expliquer pourquoi.
* Privilégie une migration progressive plutôt qu’une réécriture totale incontrôlée.
* Tiens compte des connexions lentes, des appareils mobiles d’entrée de gamme et des contraintes des marchés africains.
* Prévois une UX adaptée aux paiements Mobile Money, aux interruptions réseau et aux confirmations de paiement retardées.
* Ne modifie pas directement le code avant d’avoir terminé l’audit et défini les priorités.
* Fournis du code complet pour les éléments critiques, et non de simples fragments théoriques.




LIVRABLE FINAL OBLIGATOIRE

À la fin de ton analyse, tu dois obligatoirement créer un véritable fichier Markdown téléchargeable nommé :

ameliorationv2.md

Le fichier doit contenir l’intégralité de l’audit, des recommandations, du code proposé et du plan d’implémentation.

Ne te limite pas à afficher le contenu dans la conversation.

Tu dois :

générer le fichier ameliorationv2.md ;
y enregistrer l’intégralité de ta réponse ;
vérifier que le fichier n’est pas vide et qu’il respecte la structure demandée ;
fournir à la fin un lien direct permettant de télécharger le fichier ;
ne créer aucun autre fichier, sauf si cela est nécessaire pour les extraits de code demandés.

Le livrable final attendu est donc un fichier réel et téléchargeable :

ameliorationv2.md