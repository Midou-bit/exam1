# exam1 — boutique MERN en microservices

Application e-commerce de démonstration : catalogue de produits, panier, commande avec livraison et paiement, espace d'administration (commandes, stocks) et notification par email.

Stack : React (Create React App, Tailwind, Context API), Express / Mongoose, MongoDB Atlas, gateway `express-http-proxy`, microservices Node, Docker, GitHub Actions, Render, Uptime Kuma.

## Architecture

```
Navigateur
   │  HTTPS
   ▼
frontend (React, Static Site / nginx)
   │  REST /api/*  (JWT Bearer)
   ▼
backend (Express, port 5000) ──────────────► MongoDB (Atlas : exam1_preprod / exam1_prod)
   │  en-tête x-internal-key
   ▼
gateway (express-http-proxy, port 8000)
   ├── /notify        ──► notifications (Nodemailer, port 4002)
   └── /update-stock  ──► stock-management (port 4003)
```

Chaque service Node expose `GET /health`, utilisé par Render et Uptime Kuma. Pour le backend, la réponse inclut l'état de MongoDB (503 si la base est indisponible).

## Environnements

| Environnement | Branche   | Frontend                                          | Backend                                          |
| ------------- | --------- | ------------------------------------------------- | ------------------------------------------------ |
| Préproduction | `develop` | https://midou-exam1-preprod-frontend.onrender.com | https://midou-exam1-preprod-backend.onrender.com |
| Production    | `main`    | https://midou-exam1-prod-frontend.onrender.com    | https://midou-exam1-prod-backend.onrender.com    |

Gateway et microservices : `https://midou-exam1-<env>-gateway.onrender.com`, `-notifications`, `-stock-management`.

> **Premier appel lent (~50 s)** : les services gratuits de Render s'endorment après 15 minutes d'inactivité.
> Si l'application ne charge toujours pas, le cluster MongoDB Atlas est peut-être en pause (offre gratuite) : il faut le relancer depuis la console Atlas.

## Lancer en local

Prérequis : Git, Docker (avec Compose v2), Node.js 20.

```bash
git clone https://github.com/Midou-bit/exam1.git
cd exam1

# Variables d'environnement : copier les modèles puis renseigner les valeurs
cp .env.example .env
cp backend/.env.example backend/.env
cp gateway/.env.example gateway/.env
cp microservices/notifications/.env.example microservices/notifications/.env

# Stack complète : MongoDB local, 4 services Node, frontend nginx
docker compose up --build -d --wait

# Données de démonstration (5 produits + compte admin), sur la base locale du compose
docker compose exec -e ADMIN_USERNAME=admin -e ADMIN_EMAIL=admin@local.test -e ADMIN_PASSWORD='<mot de passe>' backend npm run seed
```

L'application est alors disponible sur http://localhost:3000 (API : http://localhost:5000/api).

Pour arrêter : `docker compose down` (ajouter `-v` pour effacer aussi la base locale).

Sans Docker : `npm install` dans chaque dossier, puis `npm run start:all` à la racine. Il faut alors une base MongoDB accessible via `MONGO_URI` (dans `backend/.env`) ; dans ce cas, le seed se lance avec `cd backend && npm run seed`.

## Tests

```bash
# Frontend : test de fumée (Jest / Testing Library)
cd frontend && CI=true npm test -- --watchAll=false

# Non-régression sécurité (stack démarrée et seedée)
ADMIN_USERNAME=admin ADMIN_PASSWORD='<mot de passe>' INTERNAL_API_KEY=dev-internal-key-local scripts/security-smoke.sh
```

Le script rejoue les failles corrigées de l'audit (prix manipulé, injection NoSQL, force brute, accès sans clé interne, etc.) et vérifie les codes HTTP. Il bloque ensuite `/api/auth` pendant 15 minutes (rate limit) : ne pas le lancer sur la production.

## CI/CD

Le workflow `.github/workflows/ci-cd.yml` s'exécute sur chaque push et pull request vers `develop` et `main` :

1. vérification des services Node (`npm ci`, `node --check`, `npm audit`), tests et build du frontend ;
2. intégration : `docker compose up`, sondes `/health`, seed et `scripts/security-smoke.sh` ;
3. publication des images sur ghcr.io (tags `preprod` / `prod` + SHA court).

Render déploie automatiquement `develop` en préproduction et `main` en production, **uniquement si les checks passent** (`autoDeployTrigger: checksPass` dans `render.yaml`, l'infrastructure décrite en code).

## Supervision

Uptime Kuma sonde les `/health` de la préprod et de la prod, envoie les alertes sur ntfy (topic `midou-exam1-alertes`) et publie la page de statut `exam1`. Pour recréer la supervision sur n'importe quel poste :

```bash
# 1. Lancer Uptime Kuma (http://localhost:3001)
docker compose -f monitoring/docker-compose.yml up -d

# 2. Installer la librairie de configuration dans un environnement Python dédié
python3 -m venv monitoring/.venv
monitoring/.venv/bin/pip install uptime-kuma-api

# 3. Configurer : compte admin, alerte ntfy, sondes, page de statut (relançable sans doublon)
KUMA_PASSWORD='<mot de passe choisi>' monitoring/.venv/bin/python monitoring/setup_kuma.py
```

Le mot de passe admin est lu dans la variable `KUMA_PASSWORD`, sinon dans `~/.exam1-secrets/atlas.env` (`UPTIME_KUMA_PASSWORD`), sinon il est demandé au clavier. Au premier lancement, ce mot de passe sert à créer le compte `admin`. Pour recevoir les alertes, il suffit de s'abonner au topic ntfy (application mobile ou https://ntfy.sh/midou-exam1-alertes).

## Documentation

- [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) : journal de mise en production (étapes, justifications, commandes).
- [docs/AUDIT.md](docs/AUDIT.md) : audit fonctionnel et de sécurité, anomalies et statut des corrections.
- [docs/api/index.html](docs/api/index.html) : documentation JSDoc du backend, de la gateway et des microservices (`cd backend && npm run docs` pour la régénérer).
- [CHANGELOG.md](CHANGELOG.md) : historique des versions.
