# Audit fonctionnel et de sécurité (E27 / E28)

Cet audit couvre **uniquement la détection** : aucune correction n'a été appliquée. Les corrections proposées seront traitées dans une étape suivante et tracées dans le CHANGELOG.

## Environnement de test

- Stack locale `docker compose up --build -d` avec une base Mongo locale vierge (`docker compose down -v` au préalable). Les bases Atlas n'ont pas été touchées.
- Seed local : 5 produits et un compte `admin` (mot de passe aléatoire, non versionné).
- Comptes de test créés pendant l'audit : `alice` (user), `bob`, `carl`, `mallory` et deux comptes au nom piégé (XSS).
- Outils :
  - `curl` pour l'API ;
  - Playwright (Chromium headless) pour le parcours du front sur http://localhost:3000 ;
  - `mongosh` pour contrôler ce qui est réellement stocké ;
  - `npm audit` / `npm outdated`.
- Dans les commandes de reproduction : `A=http://localhost:5000/api`. `$TU` et `$TA` désignent un token user et un token admin obtenus via `POST $A/auth/login`. `$P1` est l'ID du produit « Ordinateur Portable » (1000 €), `$OID` l'ID d'une commande. `ADDR='"shippingAddress":{"street":"1 rue A","city":"Paris","postalCode":"75001","country":"FR"}'`.

## Tests fonctionnels

| Fonctionnalité | Scénario | Attendu | Obtenu | Statut |
|---|---|---|---|---|
| Inscription | Cas normal | 201 | 201 « Utilisateur créé avec succès » | OK |
| Inscription | Champs vides / corps `{}` | 400 avec message de validation | 500 « Une erreur est survenue » | KO |
| Inscription | Email invalide (`pas-un-email`) | 400 | 201, compte créé | KO |
| Inscription | Mot de passe d'un caractère | 400 (politique de mot de passe) | 201, compte créé | KO |
| Inscription | Username déjà pris | 400 « nom déjà utilisé » | 500 (erreur Mongo E11000) | KO |
| Inscription | Email déjà pris | 400 | 400 « Cet email est déjà utilisé », affiché dans le formulaire | OK |
| Inscription | `role: "admin"` envoyé dans le corps | Ignoré | Ignoré (rôle `user`) | OK |
| Connexion | Cas normal | 200 + token | 200, `token` / `username` / `role` stockés en localStorage | OK |
| Connexion | Champs vides | 400 | 400 « Utilisateur non trouvé » | OK |
| Connexion | Mauvais mot de passe | 400 avec message générique | 400 « Mot de passe incorrect » (message distinct, voir SEC-07) | OK* |
| Connexion | Utilisateur inconnu | 400 avec message générique | 400 « Utilisateur non trouvé » (message distinct, voir SEC-07) | OK* |
| Produits | Liste | 5 produits | 5 produits affichés | OK |
| Panier | Ajout (2 fois le même produit + 1 autre) | 2 lignes, quantité 2 | 2 lignes, quantité 2 (mais l'état est muté, voir BUG-09) | OK |
| Panier | `+` / `-` (3 fois) | Incrément ; minimum 1 | 3 puis 1 | OK |
| Panier | Retirer / Vider | Ligne retirée / panier vide | Conforme | OK |
| Panier | Rechargement de la page | Panier conservé | Panier vidé | KO |
| Commande | Accès à `/order` sans être connecté | Redirection vers `/login` | Redirection vers `/login` | OK |
| Commande | Parcours sans toucher aux listes livraison / paiement | Commande possible avec les valeurs affichées (Colissimo / Carte bancaire) | Bloqué : « Informations manquantes : méthode de livraison, méthode de paiement » | KO |
| Commande | Adresse vide | Message « adresse incomplète » | Le message sur les listes s'affiche d'abord ; via l'API : 500 au lieu de 400 | KO |
| Commande | Parcours complet (adresse, Chronopost, PayPal) | Commande créée, confirmation | « Commande confirmée avec succès ! », panier vidé, aucune page de confirmation | OK |
| Commande | Quantité 100 000 (stock : 20) | Refus | 201, stock inchangé | KO |
| Commande | Produit inexistant | 400 / 404 | 201 | KO |
| Admin | Liste des commandes | Commandes avec client et produits | Commandes listées (ID, statut) | OK |
| Admin | « Valider la commande » | Statut mis à jour | « En cours de traitement » | OK |
| Admin | Changer l'état en « Expédiée » | Statut mis à jour | Conforme | OK |
| Admin | Détails | Nom des produits | ID techniques des produits affichés | KO |
| Admin | Stock vide / -4 / « abc » (interface) | Refus | Refusé côté interface (« quantité de stock valide ») | OK |
| Admin | Stock `""` / `"abc"` / `null` via l'API | 400 | 500 « Erreur serveur » | KO |
| Admin | Stock `1.5` via l'API | 400 (stock entier) | 200, stock à 1,5 | KO |
| Admin | Stock 0 puis 42 | Mise à jour | Conforme | OK |
| Admin | API `PUT /orders/:id/validate` | Écrit le statut | 200, mais rien n'est écrit en base | KO |
| Admin | API `DELETE /orders/:id` | Suppression (admin) | Aucune réponse (timeout) | KO |
| Déconnexion | Contenu du localStorage | Vide | `role` reste présent (ex. `role=admin`) | KO |
| Robustesse | MongoDB indisponible, `GET /api/products` | 503 rapide, le service reste en vie | Requête pendue 30 s, puis le **processus backend s'arrête** (exit 1) | KO |

\* Fonctionnel, mais révèle une faille (voir SEC-07).

## Anomalies (gravité décroissante)

| ID | Type | Composant / fichier | Description | Reproduction | Impact | Gravité | Correction proposée |
|---|---|---|---|---|---|---|---|
| SEC-01 | Faille | Backend `controllers/orderController.js` (`createOrder`) | Le prix unitaire et le total sont calculés à partir du `price` envoyé par le client. Prix négatif accepté. | `curl -X POST $A/orders -H "Authorization: Bearer $TU" -H 'Content-Type: application/json' -d "{\"items\":[{\"productId\":\"$P1\",\"quantity\":3,\"price\":1}],$ADDR,\"paymentMethod\":\"PayPal\",\"shippingMethod\":\"colissimo\"}"` → 201, total 3 € au lieu de 3000 € ; `price:-500` → total -500 € | Fraude : achat à prix arbitraire, total négatif | Critique | Relire le prix en base (`Product.findById`) et recalculer le total côté serveur ; ignorer `price` et `total` envoyés par le client |
| SEC-02 | Faille | Gateway `/notify`, `/update-stock` ; microservices notifications et stock | Routes sans authentification, publiques sur Render. `/notify` envoie un email à n'importe quel destinataire (relais de mail ouvert) ; `/update-stock` accepte n'importe quelle valeur. | `curl -X POST localhost:8000/notify -H 'Content-Type: application/json' -d '{"to":"victime@example.invalid","subject":"spam","text":"x"}'` ; `curl -X POST localhost:8000/update-stock -d '{"productId":"x","quantity":-999}' -H 'Content-Type: application/json'` → 200 | Spam ou phishing au nom de l'application, blacklistage du compte Gmail, falsification du stock | Critique | Secret partagé entre backend et gateway (en-tête vérifié par un middleware), ou gateway non exposée publiquement ; liste blanche des destinataires |
| BUG-01 | Bug | Backend `productController.getProducts`, `orderController.getOrders` | Pas de try/catch : MongoDB indisponible → requête pendue, puis rejection non gérée → arrêt du processus Node | `docker compose stop mongo` ; `curl -m 30 $A/products` → pas de réponse, puis `docker inspect exam1-backend-1` → `exited`, code 1 | Panne totale de l'API au moindre incident base (déni de service) ; en local, pas de redémarrage automatique | Critique | try/catch (ou wrapper async) + middleware d'erreur Express, réponse 503 ; `restart: unless-stopped` dans le compose |
| SEC-03 | Faille | Backend `authController.login` / `register` | Injection d'opérateurs NoSQL : le `username` (ou l'`email`) objet est passé tel quel à `findOne` | `curl -X POST $A/auth/login -H 'Content-Type: application/json' -d '{"username":{"$ne":null},"password":"x"}'` → « Mot de passe incorrect » (l'opérateur a trouvé le premier compte, l'admin) ; `{"$regex":"^adm"}` → « Mot de passe incorrect », `{"$regex":"^zzz"}` → « Utilisateur non trouvé » | Énumération des comptes ; connexion sur le premier compte (admin) sans connaître son nom si le mot de passe est deviné | Haute | Valider le type des champs (chaînes uniquement, ex. express-validator), `mongoose.set('sanitizeFilter', true)` ou `express-mongo-sanitize` |
| SEC-04 | Faille | Backend `/api/auth/login` | Aucune limitation des tentatives de connexion | 60 tentatives en boucle : `for i in $(seq 60); do curl -s -o /dev/null -w '%{http_code} ' -X POST $A/auth/login -H 'Content-Type: application/json' -d '{"username":"alice","password":"essai'$i'"}'; done` → 60 × 400, aucun blocage | Attaque par force brute ou par dictionnaire (aggravée par les mots de passe faibles acceptés, BUG-05) | Haute | `express-rate-limit` sur `/api/auth/*` (ex. 5 tentatives / 15 min par IP et par compte) |
| BUG-02 | Bug | Front `context/CartContext.js`, `components/ShippingMethodSelection.js`, `handlePaymentChange.js` | `shippingMethod` et `paymentMethod` sont initialisés à `null`, alors que les listes affichent Colissimo / Carte bancaire | Panier → Passer une commande → remplir l'adresse sans toucher aux listes → Confirmer → « Informations manquantes : méthode de livraison, méthode de paiement » | Fonctionnalité principale bloquée tant qu'on ne change pas les listes | Haute | Initialiser à `'colissimo'` / `'Carte bancaire'`, ou ajouter une option vide « Choisir… » |
| BUG-03 | Bug | Backend `orderController.createOrder` | Stock jamais décrémenté ; aucune vérification de disponibilité (appel `update-stock` commenté) | Commande `quantity:100000` sur un produit en stock 20 → 201 ; `db.products.findOne()` → stock toujours 20 | Survente, stock affiché faux | Haute | Vérifier `stock >= quantity` puis décrémenter de façon atomique (`updateOne({_id, stock:{$gte:q}}, {$inc:{stock:-q}})`) |
| BUG-04 | Bug / faille | Backend `orderController.deleteOrder`, `routes/orderRoutes.js` | `deleteOrder` ne renvoie jamais de réponse, lit `req.body.orderId` au lieu de `req.params.id`, et la route n'est pas réservée à l'admin | `curl -m 8 -X DELETE $A/orders/$OID -H "Authorization: Bearer $TU"` → timeout (HTTP 000), même avec un token user | Connexions pendues (épuisement des ressources), suppression impossible, contrôle d'accès incohérent | Haute | Ajouter `isAdmin` et `res.status(204)` ou 404 après `findByIdAndDelete(req.params.id)` |
| SEC-05 | Faille | Dépendances (tous les packages) | Vulnérabilités connues, dont des critiques (`proxy-addr`, `form-data`, `mongoose`) | `npm audit` dans chaque package (voir la section Dépendances) | Exploitation de failles publiques | Haute | `npm audit fix` (correctifs sans version majeure disponibles pour le backend, la gateway et les microservices), puis relancer la CI |
| BUG-05 | Bug | Backend `authController.register`, `models/User.js` | Aucune validation : email au format libre, mot de passe d'un caractère accepté ; champs vides et username en doublon → 500 | `curl -X POST $A/auth/register -H 'Content-Type: application/json' -d '{"username":"bob","email":"pas-un-email","password":"a"}'` → 201 ; `-d '{}'` → 500 ; username existant → 500 (E11000) | Données invalides, comptes faibles, erreurs serveur au lieu de messages clairs | Moyenne | Validation (format de l'email, longueur minimale du mot de passe, champs requis) → 400 ; vérifier l'unicité de l'email et du username |
| SEC-06 | Faille | Backend `orderController.updateOrderStatus` | `findByIdAndUpdate` sans `runValidators` : n'importe quel statut est stocké, HTML compris | `curl -X PUT $A/orders/$OID/status -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{"status":"<img src=x onerror=alert(1)>"}'` → 200, statut stocké tel quel | Données incohérentes, contenu malveillant persistant (XSS potentielle si le statut est rendu ailleurs) | Moyenne | `{ runValidators: true }` ou vérifier la valeur contre l'enum → 400 |
| SEC-07 | Faille | Backend `authController.login` | Messages différents pour « utilisateur inconnu » et « mauvais mot de passe » | Login `nobody` → « Utilisateur non trouvé » ; `alice` + faux mot de passe → « Mot de passe incorrect » | Énumération des comptes existants | Moyenne | Message unique « Identifiants invalides » |
| SEC-08 | Faille | Notifications `index.js` ; erreurs Express ; en-têtes | Fuite d'informations : l'objet `error` SMTP complet est renvoyé au client via la gateway (code EAUTH, réponse Gmail) ; pages HTML Express par défaut (404, JSON invalide) ; `X-Powered-By: Express` sur les ports 4002 et 4003 (pas de helmet) ; version nginx exposée (`Server: nginx/1.31.8`) | `curl -X POST localhost:8000/notify -H 'Content-Type: application/json' -d '{}'` ; `curl $A/inexistant` ; `curl -I localhost:4002/health` ; `curl -I localhost:3000` | Reconnaissance facilitée pour un attaquant | Moyenne | Renvoyer `{message}` seulement et logger le détail ; gestionnaires 404 / erreurs en JSON ; helmet sur les microservices ; `server_tokens off` dans nginx |
| BUG-06 | Bug | Backend `orderController.validateOrder` | Répond « validée avec succès » sans rien écrire en base ; lit `req.body.orderId` ; le statut « Validée » (utilisé par `adminController`) est absent de l'enum | `curl -X PUT $A/orders/$OID/validate -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{}'` → 200 « Commande undefined validée » ; statut inchangé en base | Fausse confirmation à l'administrateur | Moyenne | Mettre à jour `req.params.id` avec un statut de l'enum (« En cours de traitement ») et `runValidators` |
| BUG-07 | Bug | Backend (commande, stock) | Erreurs de validation renvoyées en 500 au lieu de 400 : `quantity` 0 ou négative, adresse vide, livraison / paiement `null`, stock `""` / `"abc"` / `null` ; stock décimal (1.5) accepté | `-d "{\"items\":[{\"productId\":\"$P1\",\"quantity\":0,\"price\":1000}],$ADDR,...}"` → 500 ; `PUT $A/products/$P1/stock -d '{"stock":"abc"}'` → 500 ; `-d '{"stock":1.5}'` → 200 | Messages d'erreur inexploitables, logs d'erreur parasites | Moyenne | Valider les entrées → 400 avec message ; stock entier positif (`Number.isInteger`) |
| BUG-08 | Bug | Backend `orderController.createOrder` | Commande d'un produit inexistant acceptée | `productId:"000000000000000000000000"` → 201 | Commandes impossibles à honorer | Moyenne | Vérifier l'existence du produit (couvert par la correction de SEC-01) |
| SEC-09 | Faille | Front (localStorage, `Navbar.js`, `services/*`) | JWT stocké en localStorage (lisible par tout script en cas de XSS), valable 1 h, sans révocation à la déconnexion ; un token expiré n'est pas détecté par le front (l'utilisateur reste « connecté », appels en 403) | Après connexion : `localStorage` → `role,token,username` ; payload `{role, iat, exp}`, durée 60 min | Vol de session en cas de XSS, mauvaise expérience à l'expiration | Moyenne | Cookie `httpOnly; Secure; SameSite`, ou intercepteur axios qui déconnecte sur 401/403 ; nettoyage complet à la déconnexion |
| SEC-10 | Faille | `docker-compose.yml` (mongo) | MongoDB local publié sur le port 27018 de l'hôte, sans authentification | `docker run --rm --network host mongo:7 mongosh mongodb://127.0.0.1:27018/mydatabase --eval 'db.users.findOne()'` → hash des mots de passe lisibles | Lecture et modification de la base depuis le réseau local (environnement local uniquement ; Atlas est authentifié) | Moyenne | Ne pas publier le port (réseau Docker interne) ou activer `MONGO_INITDB_ROOT_USERNAME` / `PASSWORD` |
| BUG-09 | Bug | Front `context/CartContext.js` (`ADD_TO_CART`) | Le réducteur mute l'objet article existant (`updatedCart[i].quantity += …`) au lieu d'en créer une copie | Test isolé du réducteur : après `ADD_TO_CART`, le même objet est réutilisé et la quantité de l'ancien état passe de 1 à 2 | Rendus incohérents (StrictMode, mémoïsation), quantité doublée en mode développement | Moyenne | `updatedCart[i] = { ...updatedCart[i], quantity: updatedCart[i].quantity + q }` |
| BUG-10 | Bug | Backend `server.js`, `routes/adminRoutes.js`, `controllers/adminController.js` | Routes admin jamais montées (code mort) ; les notifications de ce contrôleur n'envoient ni `to` ni `subject` | `curl $A/admin/orders -H "Authorization: Bearer $TA"` → 404 « Cannot GET » | Code mort trompeur, maintenance plus difficile | Basse | Supprimer `adminRoutes` / `adminController`, ou les monter et les corriger |
| BUG-11 | Bug | Front `components/Navbar.js` | La déconnexion ne supprime pas `role` (ni le panier) | Connexion admin → Déconnexion → `localStorage` contient `role=admin` | Données obsolètes réutilisées à la connexion suivante | Basse | `localStorage.removeItem('role')` (ou `clear()`) et `CLEAR_CART` |
| SEC-11 | Faille | Front `AdminRoute.js` | Rôle admin vérifié côté client uniquement pour l'affichage | Connecté en user : `localStorage.setItem('role','admin')` puis `/admin` → la page s'affiche (vide : l'API renvoie 403) | Aucune donnée exposée (l'API vérifie bien le rôle), mais l'interface admin est visible | Basse | Vérifier le rôle à partir du token (endpoint `/me`) ; gérer le 403 |
| SEC-12 | Faille | Backend (username, adresse) | XSS stockée : `<script>` et `<img onerror>` acceptés et stockés tels quels | Inscription avec username `<img src=x onerror=alert(1)>`, commande avec la même adresse → stockés ; à l'affichage (navbar, admin), React échappe : aucune alerte exécutée | Risque si ces données sont rendues hors React (emails HTML, exports) | Basse | Valider / normaliser les entrées (liste blanche de caractères), encoder à la sortie hors React |
| BUG-12 | Bug | Front `pages/ProductList.js` | `key={product.id}` alors que l'API renvoie `_id` : clé `undefined` | Lecture du code (warning React « unique key » en mode développement) | Rendus de liste inefficaces, avertissements | Basse | `key={product._id}` |
| BUG-13 | Bug | Front `App.js`, `Cart.js`, `Order.js` | Route mal orthographiée `shippig_payment` | Panier → Passer une commande → URL `/shippig_payment` | URL incorrecte, confusion | Basse | Renommer en `shipping-payment` partout |
| BUG-14 | Bug | Front `components/ProductList.js` | Le fichier contient une copie de `ProtectedRoute` (et non une liste de produits) | Lecture du code | Code dupliqué et trompeur | Basse | Supprimer le fichier |
| BUG-15 | Bug | Front `pages/Admin.js` (détails) | L'admin voit l'ID technique du produit au lieu de son nom ; pas de client affiché | Admin → Détails → « Produit ID : 6ae9… » | Commande difficile à traiter | Basse | Utiliser `populate('items.productId', 'name')` côté API et afficher le nom |
| BUG-16 | Bug | Front (`CartContext`, `Order.js`, `Admin.js`) | Panier perdu au rechargement ; après une commande, pas de page de confirmation (`response.error` n'est jamais défini, axios lève une exception) ; `Admin.js` ne gère pas les erreurs de chargement | Ajouter au panier → F5 → panier vide ; commande → message puis panier vide sur `/order` | Expérience utilisateur dégradée | Basse | Persister le panier (localStorage) ; rediriger vers une confirmation ; try/catch dans `Admin.js` |

**Points vérifiés et conformes** :
- tokens falsifiés (autre secret, `alg: none`) rejetés en 403 ;
- 401 sans token, 403 pour un user sur les routes admin ;
- `role` ignoré à l'inscription ;
- CORS : une origine non autorisée ne reçoit pas `Access-Control-Allow-Origin` ;
- en-têtes helmet présents sur le backend et la gateway (CSP, HSTS, `X-Frame-Options`, `nosniff`) ;
- `JWT_SECRET` local de 64 caractères (Render : valeur générée de 256 bits) ;
- aucun mot de passe, token ni URI dans les logs (0 occurrence) ;
- bcrypt (coût 10) pour les mots de passe.

## Dépendances

`npm audit` (nombre de vulnérabilités par gravité) et `npm outdated` (mises à jour majeures disponibles) :

| Package | Critique | Haute | Moyenne | Basse | Principaux paquets | Mises à jour majeures disponibles |
|---|---|---|---|---|---|---|
| racine | 0 | 0 | 2 | 0 | (outillage `npm-run-all`) | aucune |
| backend | 3 | 5 | 2 | 0 | form-data, mongoose, proxy-addr (critiques) ; axios, express, body-parser, jws, path-to-regexp | express 5, mongoose 9, bcryptjs 3, dotenv 18 |
| gateway | 1 | 3 | 1 | 0 | proxy-addr ; express, body-parser, path-to-regexp | express 5, dotenv 18 |
| notifications | 1 | 4 | 1 | 0 | proxy-addr ; nodemailer, express, body-parser | express 5, nodemailer 10, body-parser 2, dotenv 18 |
| stock-management | 1 | 3 | 1 | 0 | proxy-addr ; express, path-to-regexp | express 5 |
| frontend | 4 | 36 | 15 | 19 | form-data, proxy-addr, shell-quote, websocket-driver ; chaîne d'outillage de react-scripts, axios, @remix-run/router | react 19, react-router-dom 7, tailwindcss 4, testing-library |

- **Backend, gateway, stock-management** : toutes les vulnérabilités ont un correctif sans changement de version majeure (`npm audit fix`).
- **Notifications** : même chose, sauf nodemailer, dont le correctif impose la version majeure 10.
- **Frontend** : 51 vulnérabilités se corrigent sans version majeure. Les autres dépendent de `react-scripts` (CRA, abandonné) ; elles concernent surtout l'outillage de build et le serveur de développement, peu le bundle livré.
- **Recommandation** : appliquer `npm audit fix`, puis planifier la sortie de CRA (vers Vite) et les mises à jour majeures dans une itération dédiée, testée par la CI.
