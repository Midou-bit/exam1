# Mise en production — journal de préparation

Application MERN fournie (frontend React, backend Express/Mongoose, gateway, microservices notifications et stock-management), à déployer sur Render (offre gratuite) avec MongoDB Atlas, en deux environnements :

| Environnement | Branche Git | Usage |
|---|---|---|
| Préproduction | `develop` | validation avant mise en production |
| Production | `main` | utilisateurs finaux |

Architecture et ports :

| Service | Dossier | Port local | Point d'entrée |
|---|---|---|---|
| Frontend (nginx) | `frontend/` | 3000 (80 dans le conteneur) | build CRA |
| Backend API | `backend/` | 5000 | `server.js` |
| Gateway | `gateway/` | 8000 | `server.js` |
| Notifications | `microservices/notifications/` | 4002 | `index.js` |
| Stock-management | `microservices/stock-management/` | 4003 | `index.js` |
| MongoDB | — | 27018 (compose) / Atlas | — |

Flux : navigateur → backend (`/api/...`) → gateway (`/notify`, `/update-stock`) → microservices.

---

## Étape 1 — Git et secrets

**Fait**
- Suppression du dépôt Git imbriqué `frontend/.git`.
- `.gitignore` : `node_modules/`, `.env`, `.env.*`, `*.env*` (sauf `.env.example`), `logs/`, `*.log`, `build/`.
- Vérification qu'aucun `.env` n'était indexé.
- Création d'un `.env.example` (clés sans valeurs, commentées) à la racine et dans chaque service.

**Pourquoi**
- Un dossier contenant son propre `.git` est enregistré comme un sous-module : sur GitHub, le frontend aurait été un lien vide et ni la CI ni Render n'auraient pu le construire.
- Les secrets (URI Atlas, JWT, mot de passe Gmail) ne doivent jamais être versionnés : ils sont saisis dans les variables d'environnement Render. Les `.env.example` documentent les variables attendues sans exposer de valeur.

**Commandes**
```bash
rm -rf frontend/.git
git rm --cached -f frontend          # retire l'entrée "sous-module" de l'index
git ls-files | grep -i env           # aucun .env indexé
git check-ignore -v .env backend/.env gateway/.env microservices/notifications/.env
```

## Étape 2 — Configuration par variables d'environnement

**Fait**
- Frontend : `src/config.js` exporte `API_URL` (`REACT_APP_API_URL`, défaut `http://localhost:5000/api`), utilisé par `services/api.js`, `services/adminApi.js`, `pages/Login.js`, `pages/Register.js`. Suppression du log du token.
- Backend : `GATEWAY_URL` (défaut `http://localhost:8000`) dans `orderController.js` et `adminController.js` (l'URL morte `localhost:3001` est remplacée) ; `NOTIFY_ADMIN_EMAIL` remplace l'adresse codée en dur.
- Backend et gateway : `helmet`, `app.set('trust proxy', 1)`. Backend : `cors` limité à `CORS_ORIGIN` (liste séparée par des virgules, défaut `http://localhost:3000`).
- Ports : chaque service écoute d'abord sur `PORT`, puis sur son port historique (backend 5000, gateway `GATEWAY_PORT`/8000, notifications `NOTIFI_PORT`/4002, stock-management 4003).
- Gateway : `NOTIFI_SERVICE_URL` et `STOCK_SERVICE_URL` conservées, avec une valeur locale par défaut.
- Chaque service charge son propre `.env` (`path.join(__dirname, '.env')`) : sinon, lancé depuis la racine, il lirait le `.env` racine qui contient `PORT` et tous les services tenteraient d'écouter sur le même port.
- `config/db.js` : options Mongoose obsolètes et log de l'URI supprimés. `notifications/index.js` : log des identifiants Gmail supprimé.

**Pourquoi**
- Le même code doit tourner en local, en préprod et en prod : seules les variables changent (principe « 12-factor »).
- Render impose le port d'écoute via `PORT` et place les services derrière un proxy HTTPS (`trust proxy` donne la vraie IP client dans les logs).
- `helmet` ajoute les en-têtes de sécurité ; restreindre CORS empêche un site tiers d'appeler l'API depuis le navigateur.
- Le frontend CRA intègre `REACT_APP_API_URL` **au moment du build** : chaque environnement Render doit donc être construit avec sa propre URL d'API.
- Gateway : aucun middleware CORS ajouté, car elle n'est appelée que par le backend (serveur à serveur) ; sans CORS, les navigateurs ne peuvent pas la lire, ce qui est le réglage le plus restrictif.

**Commandes**
```bash
cd backend && npm install helmet
cd gateway && npm install helmet
grep -rn "localhost" --include=*.js --include=*.yml . | grep -v node_modules   # uniquement des valeurs par défaut
```

## Étape 3 — Endpoint `/health`

**Fait** : `GET /health` sur backend, gateway, notifications et stock-management :
```json
{"status":"ok","service":"backend","env":"production","uptime":21.4,"mongo":1}
```
Le backend renvoie `mongo` (`mongoose.connection.readyState`, 1 = connecté) et répond **503** si MongoDB n'est pas connecté.

**Pourquoi** : Render utilise un « health check path » pour décider si un déploiement est sain (et ne bascule le trafic qu'après un succès) ; Uptime Kuma interroge ces mêmes routes pour la supervision et l'alerte. Le 503 côté backend signale une panne de base de données, pas seulement un processus vivant.

**Commandes**
```bash
curl -i http://localhost:5000/health
curl -i http://localhost:8000/health
curl -i http://localhost:4002/health
curl -i http://localhost:4003/health
```

## Étape 4 — Journalisation (Winston) et audit HTTP (morgan)

**Fait**
- Un `logger.js` par service : format JSON horodaté, champ `service`, niveau `LOG_LEVEL` (défaut `info`), transports Console + `logs/error.log` + `logs/combined.log`.
- Tous les `console.log` / `console.error` du backend, de la gateway et des microservices remplacés par le logger (`info`, `warn`, `error`, `debug` pour le détail).
- morgan branché sur Winston : une entrée JSON par requête (`method`, `url`, `status`, `responseTimeMs`, `ip`). Les sondes `/health` réussies ne sont pas journalisées pour ne pas noyer les logs.
- Plus aucun mot de passe, token, hash ou URI de connexion dans les logs (`authController.js`, `authMiddleware.js`, `db.js`, `notifications/index.js`).

**Pourquoi**
- Render collecte la sortie standard : la console est le canal principal. Le JSON permet de filtrer par niveau, service ou statut HTTP.
- Les fichiers servent en local et dans Docker (le disque Render gratuit est éphémère).
- L'audit HTTP permet de tracer qui a appelé quoi, avec quel résultat et en combien de temps (diagnostic, sécurité).
- Des secrets dans les logs sont une fuite de données (RGPD, compromission de comptes).

**Commandes**
```bash
npm install winston morgan        # dans chaque service Node
LOG_LEVEL=debug node backend/server.js
```

Exemple de log :
```json
{"http":{"ip":"::ffff:172.26.0.6","method":"POST","responseTimeMs":15.3,"status":200,"url":"/update-stock"},"level":"info","message":"requete HTTP","service":"stock-management","timestamp":"2026-11-03T09:00:42.973Z"}
```

## Étape 5 — Seeder

**Fait** : `backend/seeder.js` lit `MONGO_URI`, insère les 5 produits de démonstration et crée un compte admin depuis `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (rôle `admin`, mot de passe hashé par le hook du modèle `User`). Idempotent : un produit existant (même nom) n'est ni dupliqué ni écrasé, l'admin n'est pas recréé. Script `npm run seed`.

**Pourquoi** : chaque environnement (préprod, prod) démarre sur une base Atlas vide ; il faut pouvoir l'initialiser de façon reproductible et relancer la commande sans risque (l'ancienne version supprimait tous les produits).

**Commandes**
```bash
cd backend
npm run seed                                   # avec MONGO_URI et ADMIN_* dans backend/.env
docker compose exec -e ADMIN_USERNAME=admin -e ADMIN_EMAIL=admin@test.local -e ADMIN_PASSWORD=... backend node seeder.js
```
Test local (2 exécutions) : `inserted: 5` puis `inserted: 0` et « Compte admin déjà présent ».

## Étape 6 — Conteneurisation

**Fait**
- Dockerfile par service Node : `node:20-alpine`, `NODE_ENV=production`, `npm ci --omit=dev`, utilisateur non-root `node`, `EXPOSE`, `HEALTHCHECK` sur `/health`, `CMD ["node", "..."]`.
- Frontend : Dockerfile multi-stage (build CRA avec `ARG REACT_APP_API_URL`, puis `nginx:alpine`) ; `nginx.conf` renvoie `index.html` pour toute route inconnue (fallback SPA : `/cart`, `/admin`…).
- `.dockerignore` par service (`node_modules`, `.env`, `logs`, `build`).
- `docker-compose.yml` réécrit : `mongo:7` + volume nommé `mongo-data`, les 5 services, `env_file` (facultatifs) + `environment` pour les adresses du réseau Docker, healthchecks, `depends_on` avec `condition: service_healthy`.
- Racine : `npm-run-all` en devDependency ; scripts `start:*` en `node --watch` (nodemon n'est pas installé).

**Pourquoi**
- L'image est identique en local, en CI et sur Render : fin du « ça marche sur ma machine ».
- `npm ci` installe exactement les versions du `package-lock.json` ; `--omit=dev` réduit la taille et la surface d'attaque ; un utilisateur non-root limite l'impact d'une compromission.
- Le `HEALTHCHECK` et `depends_on: service_healthy` garantissent l'ordre de démarrage (Mongo → microservices → gateway → backend → frontend).
- Une SPA servie par nginx sans fallback renverrait 404 sur un rafraîchissement de `/cart`.

**Commandes**
```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend
docker compose down          # ajouter -v pour supprimer aussi la base locale
```

## Étape 7 — Vérification

```bash
# Lockfiles synchronisés (indispensable pour npm ci)
npm ci --dry-run   # dans chaque package : OK
# Syntaxe
node --check backend/server.js   # etc. : OK
# Build frontend
cd frontend && REACT_APP_API_URL=http://localhost:5000/api npm run build   # OK (1 warning ESLint préexistant)
# Stack Docker
docker compose up --build -d   # 6 conteneurs "healthy"
curl localhost:5000/health     # {"status":"ok","service":"backend","env":"production",...,"mongo":1} 200
curl localhost:8000/health     # 200
curl localhost:4002/health     # 200
curl localhost:4003/health     # 200
curl -o /dev/null -w "%{http_code}" localhost:3000/       # 200
curl localhost:3000/cart       # index.html (fallback SPA)
docker compose down
```
Test de bout en bout : connexion admin, création d'une commande (201), appel backend → gateway → notifications tracé dans les logs des trois services.

## Étape 8 — Git

```bash
git branch -m development develop
git branch main develop
git log --format='%an <%ae>' | sort -u   # un seul auteur attendu
```

## Étape 9 — Déblocage de la CI

**Fait**
- `Register.js` : le message d'erreur s'affiche dans le formulaire via `setError` (la variable était déclarée mais jamais utilisée).
- `App.test.js` : le test généré par CRA (« learn react ») est remplacé par un test de fumée qui monte l'application avec `CartProvider` et vérifie l'affichage de « Mon Application ». axios est simulé : aucun appel réseau pendant le test.
- `/health` renvoie `appEnv` (variable `APP_ENV` : `local`, `preprod`, `prod`).
- Notification de commande : timeout de 5 s sur l'appel à la gateway.

**Pourquoi**
- En CI, `CI=true` transforme les warnings ESLint en erreurs : un seul warning bloque le build, donc tout le pipeline.
- Un test qui échoue en permanence ne protège rien ; un test de fumée vérifie au minimum que l'application démarre.
- `appEnv` permet de voir dans Uptime Kuma quel environnement répond (une préprod branchée par erreur sur la prod se repère tout de suite).
- Render gratuit bloque le SMTP sortant : sans timeout, l'envoi d'email pourrait faire attendre l'utilisateur plusieurs minutes. L'échec est journalisé en `warn` et la commande est quand même enregistrée (201).

**Commandes**
```bash
cd frontend
CI=true npm test -- --watchAll=false                                       # 1 test passé
CI=true REACT_APP_API_URL=https://api.example.invalid/api npm run build    # Compiled successfully
```

## Étape 10 — Pipeline CI/CD GitHub Actions

Fichier : `.github/workflows/ci-cd.yml`. Il se déclenche sur les push et les pull requests vers `develop` et `main`. Un nouveau push annule le run en cours sur la même branche (`concurrency`).

| Job | Rôle | Quand |
|---|---|---|
| `backend-services` (matrice x4) | `npm ci`, `node --check` sur tous les .js, `npm audit --audit-level=critical` (informatif) | toujours |
| `frontend` | `npm ci`, tests, build avec `CI=true` | toujours |
| `integration` | génère des `.env` factices depuis les `.env.example`, `docker compose up --build --wait`, `curl -f` des 4 `/health` et du front, logs si échec, `down` | après les 2 jobs précédents |
| `docker-push` (matrice x5) | build et push sur `ghcr.io/<owner>/<repo>-<service>` avec les tags `preprod`/`prod` + SHA court | push sur develop/main uniquement |
| `deploy` | appelle le Deploy Hook Render s'il est défini en secret (`RENDER_DEPLOY_HOOK_PREPROD` / `_PROD`), sinon "skipped" | après `docker-push` |

**Pourquoi**
- Chaque modification est vérifiée automatiquement avant d'atteindre un environnement : syntaxe, dépendances, tests, build, et démarrage réel de toute la stack.
- Le test d'intégration rejoue en CI ce qui a été validé en local : si un conteneur ne passe pas healthy, le pipeline échoue et affiche les logs.
- Les images versionnées (tag d'environnement + SHA) sont traçables et permettent un retour arrière sur une version précise.
- Aucun vrai secret dans la CI : seules des valeurs factices sont générées ; ghcr.io utilise le `GITHUB_TOKEN` éphémère.
- Render déploie depuis le dépôt dès que tous les checks du commit sont verts (`checksPass`) : c'est la CI qui conditionne la mise en production. Les Deploy Hooks ne sont qu'une alternative ; si tu les utilises, passe `autoDeployTrigger` à `off` pour éviter un double déploiement.

## Étape 11 — Infrastructure en code (Blueprint Render)

Fichier : `render.yaml` (syntaxe vérifiée sur https://render.com/docs/blueprint-spec).

- Projet `exam1`, avec deux environnements : `preprod` (branche `develop`) et `prod` (branche `main`).
- Par environnement :
  - un Static Site `midou-exam1-<env>-frontend` (`rootDir: frontend`, `npm ci && npm run build`, publication de `build`, réécriture `/*` vers `/index.html`, en-têtes `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) ;
  - 4 web services Docker gratuits à Francfort, avec `healthCheckPath: /health`, `autoDeployTrigger: checksPass`, et un `buildFilter` pour ne reconstruire un service que si son dossier change.
- Variables :
  - non secrètes en clair (`NODE_ENV`, `APP_ENV`, `LOG_LEVEL`, URLs publiques entre services) ;
  - secrets en `sync: false`, saisis dans le dashboard (`MONGO_URI`, `NOTIFY_ADMIN_EMAIL`, `EMAIL_USER`, `EMAIL_APPLICATION_PASSWORD`) ;
  - `JWT_SECRET` en `generateValue: true`.

**Pourquoi / adaptations à la doc**
- L'infrastructure est décrite, versionnée et reproductible : recréer les deux environnements revient à rejouer le Blueprint.
- `fromService` ne fournit que l'hôte du réseau privé (`host`, `hostport`), et les instances gratuites ne reçoivent pas le trafic privé. Les liens entre services utilisent donc les URLs publiques `https://<nom>.onrender.com`. Un Static Site ne peut d'ailleurs pas être référencé par `fromService`.
- `region` et `plan` ne sont pas acceptés pour un Static Site (servi par un CDN mondial) : ils ne sont définis que sur les services Docker.
- `JWT_SECRET` est généré par Render (valeur aléatoire de 256 bits, différente par service, donc par environnement) plutôt que saisi à la main.
- Chaque environnement pointe vers sa propre base Atlas (`exam1_preprod`, `exam1_prod`) via son `MONGO_URI`.

**Limites de l'offre gratuite**
- Les services s'endorment après 15 min d'inactivité ; le premier appel prend environ une minute.
- Le quota est de 750 h d'instance par mois pour tout le workspace. 8 services maintenus éveillés en continu le dépasseraient en 4 jours environ : il faut espacer les sondes Uptime Kuma, ou ne garder la supervision continue que pendant la démonstration.
- Le SMTP sortant est bloqué : les emails échouent (journalisés en `warn`).

## Étape 12 — Seed des bases Atlas

**Fait**
- Deux bases distinctes sur le cluster Atlas : `exam1_preprod` et `exam1_prod`.
- Un utilisateur Atlas par environnement (`exam1_preprod_user`, `exam1_prod_user`), chacun limité au rôle `readWrite` sur **sa** base (moindre privilège).
- Les identifiants (URI Atlas, compte admin applicatif) sont stockés **hors du dépôt**, dans `~/.exam1-secrets/atlas.env` (dossier en `chmod 700`, fichier en `chmod 600`).
- Les mots de passe admin sont générés aléatoirement, un par environnement.
- Le seeder (`npm run seed`) a été lancé depuis le poste sur chaque base, les variables étant injectées dans le seul processus, sans jamais être affichées.
- Une vérification indépendante a suivi : 5 produits et 1 compte `role: admin` par base.

**Pourquoi**
- Isoler preprod et prod : un test en préproduction ne peut ni lire ni modifier les données de production, et une fuite d'identifiants de préprod n'expose pas la prod.
- Moindre privilège : l'application n'a besoin que de lire et écrire dans sa base, pas d'administrer le cluster.
- Secrets hors dépôt : ils ne doivent apparaître ni dans Git, ni dans les logs, ni dans la CI. Render les reçoit via ses variables d'environnement (`MONGO_URI`, en `sync: false`).
- Le seeder est idempotent : il peut être relancé sans créer de doublon ni écraser les données.

**Commandes** (valeurs jamais affichées)
```bash
mkdir -p ~/.exam1-secrets && chmod 700 ~/.exam1-secrets
chmod 600 ~/.exam1-secrets/atlas.env
openssl rand -base64 18 | tr -d '/+='            # mot de passe admin, un par environnement

# Chargement ligne à ligne (les URI contiennent des "&", incompatibles avec un "source")
cd backend
( while IFS='=' read -r k v; do [ -n "$k" ] && export "$k=$v"; done < ~/.exam1-secrets/atlas.env
  MONGO_URI="$MONGO_URI_PREPROD" ADMIN_EMAIL="$ADMIN_EMAIL_PREPROD" ADMIN_PASSWORD="$ADMIN_PASSWORD_PREPROD" npm run seed )
# idem avec les variables _PROD
```

Résultat : `Produits vérifiés {inserted: 5, total: 5}` et `Compte admin créé` sur chaque base ; vérification : `exam1_preprod | produits: 5 | admins: 1` et `exam1_prod | produits: 5 | admins: 1`.

---

## Variables d'environnement par service

| Service | Variables |
|---|---|
| backend | `NODE_ENV`, `APP_ENV`, `PORT`, `MONGO_URI`, `JWT_SECRET`, `GATEWAY_URL`, `NOTIFY_ADMIN_EMAIL`, `CORS_ORIGIN`, `LOG_LEVEL`, `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (seed) |
| gateway | `NODE_ENV`, `APP_ENV`, `PORT`, `GATEWAY_PORT`, `NOTIFI_SERVICE_URL`, `STOCK_SERVICE_URL`, `LOG_LEVEL` (`AUTH_SERVICE_URL` non utilisée) |
| notifications | `NODE_ENV`, `APP_ENV`, `PORT`, `NOTIFI_PORT`, `EMAIL_USER`, `EMAIL_APPLICATION_PASSWORD`, `LOG_LEVEL` |
| stock-management | `NODE_ENV`, `APP_ENV`, `PORT`, `LOG_LEVEL` |
| frontend (build) | `REACT_APP_API_URL` |
| racine (compose) | `REACT_APP_API_URL`, `CORS_ORIGIN` |
