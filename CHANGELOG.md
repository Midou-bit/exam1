# Changelog

Toutes les modifications notables de ce projet sont consignées dans ce fichier.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet suit le [versionnage sémantique](https://semver.org/lang/fr/).

## [Unreleased]

### Ajouté
- Captures d'écran de la session 2 dans `docs/captures/` (CHANGELOG et AUDIT sur GitHub, JSDoc, tests de sécurité, commande et stock en production).
- BUG-17 documenté : les Static Sites Render servaient encore le frontend v1.0.0 ; code déjà corrigé, redéploiement à faire.

## [1.2.0] - 2026-11-03

Documentation et corrections de gravité basse.

### Ajouté
- JSDoc des fonctions exportées du backend (contrôleurs, middlewares, validateurs, `config/db.js`, `seeder.js`, `logger.js`), de la gateway et des microservices : 53 blocs, un `@module` par fichier.
- Documentation HTML générée dans `docs/api` (`cd backend && npm run docs`, configuration `backend/jsdoc.json`, jsdoc en devDependency).
- `README.md` : architecture, environnements, lancement local, tests, CI/CD, supervision, liens vers la documentation.
- Commentaires d'en-tête des composants et pages React (rôle, props, contexte) et de la logique non évidente (panier, validation de la commande).

### Corrigé
- BUG-09 : le réducteur `ADD_TO_CART` ne modifie plus l'état précédent.
- BUG-12 : clé de liste `key={product._id}` dans ProductList.

### Supprimé
- BUG-14 : fichier dupliqué `components/ProductList.js` (copie de ProtectedRoute, importée nulle part).

## [1.1.0] - 2026-11-03

Corrections issues de l'audit `docs/AUDIT.md` (un commit par anomalie).

### Ajouté
- Audit fonctionnel et de sécurité `docs/AUDIT.md` : 34 tests fonctionnels, 28 anomalies (16 bugs, 12 failles) classées par gravité avec reproduction et correction proposée, état des dépendances (npm audit / outdated).
- Test de non-régression `scripts/security-smoke.sh` (26 vérifications), exécuté par la CI.

### Sécurité
- SEC-01 : prix relus en base et total recalculé par le serveur ; `price` et `total` envoyés par le client ignorés.
- SEC-02 : clé interne `INTERNAL_API_KEY` (en-tête `x-internal-key`, comparaison à temps constant) exigée par la gateway, notifications et stock-management, sauf `/health` ; groupe de variables Render par environnement, valeur générée.
- SEC-03 : validation Joi du login (chaînes uniquement), qui bloque l'injection d'opérateurs NoSQL.
- SEC-04 : limitation à 10 tentatives / 15 min par IP sur `/api/auth` (429 JSON).
- SEC-05 : `npm audit fix` dans les 6 packages, nodemailer 10, react-router-dom 6.30 ; aucune vulnérabilité restante côté serveur.
- SEC-06 : statut de commande limité aux valeurs de l'enum, `runValidators` sur les mises à jour.
- SEC-07 : message unique « Identifiants invalides » (401).
- SEC-08 : plus d'objet `error` SMTP renvoyé au client, `X-Powered-By` désactivé, `server_tokens off` (nginx), erreurs et 404 en JSON.
- SEC-09 : session fermée côté front (localStorage vidé, redirection vers `/login`) quand l'API rejette le token ; l'API répond 401 JSON pour un token manquant, invalide ou expiré.
- SEC-10 : port MongoDB du compose publié uniquement sur 127.0.0.1.

### Corrigé
- BUG-01 : MongoDB indisponible ne bloque plus et n'arrête plus le backend (503 rapide, reconnexion, gestionnaires `unhandledRejection` / `uncaughtException`, middleware d'erreur global).
- BUG-02 : livraison et paiement initialisés à Colissimo / Carte bancaire ; la commande passe sans modifier les listes.
- BUG-03 : stock décrémenté de façon atomique à la commande ; 409 si le stock est insuffisant, avec annulation des décréments déjà faits.
- BUG-04 : `DELETE /api/orders/:id` réservé à l'admin ; la commande est réellement supprimée (404 si absente).
- BUG-05 : validation de l'inscription (username, email, mot de passe d'au moins 8 caractères avec lettre et chiffre) ; doublon en 409.
- BUG-06 : `validateOrder` écrit le statut « En cours de traitement ».
- BUG-07 : erreurs de validation (commande, stock) renvoyées en 400 au lieu de 500 ; stock entier obligatoire.
- BUG-08 : commande d'un produit inexistant refusée (400).
- BUG-11 : la déconnexion supprime aussi le rôle et vide le panier.

### Modifié
- Dépendances : `joi` et `express-rate-limit` (backend) ; nodemailer 6 → 10 ; react-router-dom 6.4 → 6.30.
- `docker-compose.yml` : `restart: unless-stopped`, `INTERNAL_API_KEY` (valeur de développement).
- CI : le job `integration` seede la base et exécute `scripts/security-smoke.sh` (26 vérifications).
- La page Commande affiche le message renvoyé par le serveur (ex. stock insuffisant).

## [1.0.0] - 2026-11-03

Mise en production initiale (Render, MongoDB Atlas, CI/CD, supervision).

### Ajouté
- Supervision Uptime Kuma (`monitoring/docker-compose.yml`, configuration scriptée `monitoring/setup_kuma.py`) : sondes `/health` à mot-clé sur les 4 services et sondes des fronts (avec alerte d'expiration TLS) en preprod (300 s) et prod (120 s), alertes ntfy, page de statut `exam1`.
- Seed des bases Atlas `exam1_preprod` et `exam1_prod` (5 produits et 1 compte admin chacune), avec un utilisateur Atlas à moindre privilège par environnement et des secrets stockés hors du dépôt.
- Pipeline GitHub Actions `.github/workflows/ci-cd.yml` : vérification des services Node (npm ci, node --check, npm audit), tests et build du frontend, test d'intégration docker compose, publication des images sur ghcr.io (tags `preprod`/`prod` + SHA court), déploiement facultatif par Deploy Hooks Render.
- Blueprint Render `render.yaml` : projet `exam1`, environnements `preprod` (develop) et `prod` (main), frontend en Static Site et 4 web services Docker gratuits à Francfort, déploiement automatique seulement si les checks passent.
- Champ `appEnv` (variable `APP_ENV` : local, preprod, prod) dans les réponses `/health`.
- Test de fumée du frontend : l'application démarre et affiche « Mon Application ».
- Endpoint `GET /health` sur backend, gateway, notifications et stock-management (JSON `status`, `service`, `env`, `uptime`) ; le backend renvoie aussi l'état MongoDB et répond 503 s'il n'est pas connecté.
- Journalisation Winston (`logger.js` par service) : JSON horodaté, niveau via `LOG_LEVEL`, sortie console + `logs/error.log` et `logs/combined.log`.
- Audit HTTP avec morgan branché sur Winston (méthode, URL, statut, durée, IP).
- `frontend/src/config.js` : URL de l'API lue depuis `REACT_APP_API_URL`.
- Variables d'environnement `GATEWAY_URL`, `NOTIFY_ADMIN_EMAIL`, `CORS_ORIGIN`, `LOG_LEVEL`, `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
- Fichiers `.env.example` à la racine et pour chaque service.
- Seeder : création d'un compte admin depuis les variables `ADMIN_*` ; script `npm run seed`.
- Dockerfiles (node:20-alpine, utilisateur non-root, HEALTHCHECK) pour backend, gateway, notifications et stock-management ; Dockerfile multi-stage nginx pour le frontend avec fallback SPA (`nginx.conf`) ; `.dockerignore` par service.
- Scripts `start` (node) et `dev` (node --watch) dans les packages ; `npm-run-all` en devDependency à la racine.
- Dépendances : `winston`, `morgan` (tous les services Node), `helmet` (backend, gateway).
- Documentation de mise en production : `docs/DEPLOIEMENT.md`.

### Modifié
- `Register.js` : les erreurs d'inscription s'affichent dans le formulaire (`setError`) au lieu d'une alerte ; corrige le warning ESLint qui bloquait le build en CI.
- Appel de notification lors d'une commande limité à 5 s : un SMTP lent ou bloqué (Render gratuit) ne retarde plus la commande, l'échec reste journalisé en `warn`.
- Plus aucune URL ni port en dur : chaque service écoute sur `PORT` (imposé par Render) puis sur son port historique (5000, 8000 via `GATEWAY_PORT`, 4002 via `NOTIFI_PORT`, 4003).
- Les URLs des microservices de la gateway (`NOTIFI_SERVICE_URL`, `STOCK_SERVICE_URL`) ont une valeur locale par défaut.
- Chaque service charge son propre `.env` (chemin relatif au fichier), quel que soit le dossier de lancement.
- `docker-compose.yml` réécrit : mongo:7 avec volume nommé, tous les services, healthchecks, `depends_on` conditionnés à `service_healthy`, clé `version` supprimée.
- Seeder idempotent : n'ajoute que les produits absents (plus de `deleteMany`), ne recrée pas l'admin.
- Scripts racine `start:*` : `node --watch` à la place de `nodemon` (non installé).
- `backend/config/db.js` : suppression des options Mongoose obsolètes `useNewUrlParser` / `useUnifiedTopology`.
- `console.log` / `console.error` remplacés par le logger Winston dans le backend, la gateway et les microservices.

### Supprimé
- Test obsolète « learn react » de Create React App.
- Dépôt Git imbriqué `frontend/.git` (le frontend aurait été poussé comme un sous-module vide).
- URL morte `http://localhost:3001/notify` dans `adminController.js` (remplacée par `GATEWAY_URL`).
- Adresse email codée en dur dans `orderController.js` (remplacée par `NOTIFY_ADMIN_EMAIL`).

### Sécurité
- Suppression des logs exposant des secrets : URI MongoDB, identifiants Gmail, mots de passe, tokens JWT et documents utilisateur (hash inclus) ; suppression du `console.log` du token côté frontend.
- `helmet` (en-têtes HTTP de sécurité) sur le backend et la gateway ; `trust proxy` activé pour Render.
- CORS du backend restreint aux origines de `CORS_ORIGIN`.
- `.gitignore` : tous les `.env*` (sauf `.env.example`), `logs/` et `build/` exclus du dépôt.
- Conteneurs exécutés avec l'utilisateur non-root `node`, dépendances de production uniquement.

[Unreleased]: https://github.com/Midou-bit/exam1/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/Midou-bit/exam1/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Midou-bit/exam1/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Midou-bit/exam1/releases/tag/v1.0.0
