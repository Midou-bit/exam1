# Changelog

Toutes les modifications notables de ce projet sont consignées dans ce fichier.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet suit le [versionnage sémantique](https://semver.org/lang/fr/).

## [Unreleased]

### Ajouté
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
- Plus aucune URL ni port en dur : chaque service écoute sur `PORT` (imposé par Render) puis sur son port historique (5000, 8000 via `GATEWAY_PORT`, 4002 via `NOTIFI_PORT`, 4003).
- Les URLs des microservices de la gateway (`NOTIFI_SERVICE_URL`, `STOCK_SERVICE_URL`) ont une valeur locale par défaut.
- Chaque service charge son propre `.env` (chemin relatif au fichier), quel que soit le dossier de lancement.
- `docker-compose.yml` réécrit : mongo:7 avec volume nommé, tous les services, healthchecks, `depends_on` conditionnés à `service_healthy`, clé `version` supprimée.
- Seeder idempotent : n'ajoute que les produits absents (plus de `deleteMany`), ne recrée pas l'admin.
- Scripts racine `start:*` : `node --watch` à la place de `nodemon` (non installé).
- `backend/config/db.js` : suppression des options Mongoose obsolètes `useNewUrlParser` / `useUnifiedTopology`.
- `console.log` / `console.error` remplacés par le logger Winston dans le backend, la gateway et les microservices.

### Supprimé
- Dépôt Git imbriqué `frontend/.git` (le frontend aurait été poussé comme un sous-module vide).
- URL morte `http://localhost:3001/notify` dans `adminController.js` (remplacée par `GATEWAY_URL`).
- Adresse email codée en dur dans `orderController.js` (remplacée par `NOTIFY_ADMIN_EMAIL`).

### Sécurité
- Suppression des logs exposant des secrets : URI MongoDB, identifiants Gmail, mots de passe, tokens JWT et documents utilisateur (hash inclus) ; suppression du `console.log` du token côté frontend.
- `helmet` (en-têtes HTTP de sécurité) sur le backend et la gateway ; `trust proxy` activé pour Render.
- CORS du backend restreint aux origines de `CORS_ORIGIN`.
- `.gitignore` : tous les `.env*` (sauf `.env.example`), `logs/` et `build/` exclus du dépôt.
- Conteneurs exécutés avec l'utilisateur non-root `node`, dépendances de production uniquement.
