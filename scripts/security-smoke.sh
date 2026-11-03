#!/usr/bin/env bash
# Tests de non-régression sécurité : rejoue les reproductions de docs/AUDIT.md et vérifie les codes HTTP.
# Usage : ADMIN_USERNAME=admin ADMIN_PASSWORD=... scripts/security-smoke.sh
# Prérequis : stack démarrée (docker compose) et base seedée (5 produits + admin).
set -uo pipefail

API="${API_URL:-http://localhost:5000/api}"
GATEWAY="${GATEWAY_URL:-http://localhost:8000}"
NOTIF="${NOTIF_URL:-http://localhost:4002}"
STOCK="${STOCK_URL:-http://localhost:4003}"
: "${ADMIN_USERNAME:?ADMIN_USERNAME requis}" "${ADMIN_PASSWORD:?ADMIN_PASSWORD requis}"

PASS=0; FAIL=0
BODY=$(mktemp); trap 'rm -f "$BODY"' EXIT

# req MÉTHODE URL [JSON] [TOKEN] → affiche le code HTTP, corps dans $BODY
req() {
  local args=(-s -o "$BODY" -w '%{http_code}' -m 20 -X "$1" "$2" -H 'Content-Type: application/json')
  [ -n "${3:-}" ] && args+=(-d "$3")
  [ -n "${4:-}" ] && args+=(-H "Authorization: Bearer $4")
  curl "${args[@]}"
}
# check "libellé" attendu obtenu
check() {
  if [ "$2" = "$3" ]; then PASS=$((PASS + 1)); printf 'PASS  %-62s %s\n' "$1" "$3"
  else FAIL=$((FAIL + 1)); printf 'FAIL  %-62s attendu %s, obtenu %s : %s\n' "$1" "$2" "$3" "$(head -c 200 "$BODY")"; fi
}
json() { python3 -c "import sys,json; d=json.load(open('$BODY')); print($1)"; }

ADDR='"shippingAddress":{"street":"1 rue A","city":"Paris","postalCode":"75001","country":"FR"},"paymentMethod":"PayPal","shippingMethod":"colissimo"'
USER="smoke$(date +%s)"; USER_PASS="Smoke-Pass-123"

echo "== Inscription (BUG-05)"
check "register invalide (email, mot de passe court)" 400 "$(req POST "$API/auth/register" '{"username":"ab","email":"pas-un-email","password":"a"}')"
check "register valide" 201 "$(req POST "$API/auth/register" "{\"username\":\"$USER\",\"email\":\"$USER@test.local\",\"password\":\"$USER_PASS\"}")"
check "register doublon" 409 "$(req POST "$API/auth/register" "{\"username\":\"$USER\",\"email\":\"$USER@test.local\",\"password\":\"$USER_PASS\"}")"

echo "== Connexion (SEC-03, SEC-07)"
check "login user" 200 "$(req POST "$API/auth/login" "{\"username\":\"$USER\",\"password\":\"$USER_PASS\"}")"; UT=$(json "d.get('token','')")
check "login admin" 200 "$(req POST "$API/auth/login" "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")"; AT=$(json "d.get('token','')")
check "injection NoSQL {\$ne:null}" 400 "$(req POST "$API/auth/login" '{"username":{"$ne":null},"password":"x"}')"
check "mauvais mot de passe : message unique" 401 "$(req POST "$API/auth/login" "{\"username\":\"$USER\",\"password\":\"faux-1\"}")"

echo "== Commandes (SEC-01, BUG-03, BUG-07)"
req GET "$API/products" >/dev/null
read -r P1 PRICE STOCK0 < <(json "' '.join(str(x) for x in (d[0]['_id'], d[0]['price'], d[0]['stock']))")
check "prix manipulé (price=1) : commande créée…" 201 "$(req POST "$API/orders" "{\"items\":[{\"productId\":\"$P1\",\"quantity\":2,\"price\":1}],\"total\":2,$ADDR}" "$UT")"
check "… avec le prix réel du produit" "$((PRICE * 2))" "$(json "int(d['order']['total'])")"
req GET "$API/products" >/dev/null
check "stock décrémenté de 2" "$((STOCK0 - 2))" "$(json "[p for p in d if p['_id']=='$P1'][0]['stock']")"
check "quantité négative" 400 "$(req POST "$API/orders" "{\"items\":[{\"productId\":\"$P1\",\"quantity\":-5}],$ADDR}" "$UT")"
check "produit inexistant" 400 "$(req POST "$API/orders" "{\"items\":[{\"productId\":\"000000000000000000000000\",\"quantity\":1}],$ADDR}" "$UT")"
check "stock insuffisant" 409 "$(req POST "$API/orders" "{\"items\":[{\"productId\":\"$P1\",\"quantity\":1000000}],$ADDR}" "$UT")"

echo "== Contrôle d'accès (BUG-04, SEC-06, BUG-07, SEC-09)"
req POST "$API/orders" "{\"items\":[{\"productId\":\"$P1\",\"quantity\":1}],$ADDR}" "$UT" >/dev/null; OID=$(json "d['order']['_id']")
check "DELETE commande par un user" 403 "$(req DELETE "$API/orders/$OID" '' "$UT")"
check "statut hors enum" 400 "$(req PUT "$API/orders/$OID/status" '{"status":"<img src=x onerror=alert(1)>"}' "$AT")"
check "stock non entier (abc)" 400 "$(req PUT "$API/products/$P1/stock" '{"stock":"abc"}' "$AT")"
check "token invalide" 401 "$(req GET "$API/orders" '' "jeton.invalide.test")"
check "DELETE commande par l'admin" 200 "$(req DELETE "$API/orders/$OID" '' "$AT")"
check "DELETE commande déjà supprimée" 404 "$(req DELETE "$API/orders/$OID" '' "$AT")"

echo "== Services internes sans clé (SEC-02)"
check "gateway /notify sans clé" 401 "$(req POST "$GATEWAY/notify" '{"to":"x@example.invalid","subject":"s","text":"t"}')"
check "gateway /update-stock sans clé" 401 "$(req POST "$GATEWAY/update-stock" '{"productId":"x","quantity":1}')"
check "notifications /notify sans clé" 401 "$(req POST "$NOTIF/notify" '{"to":"x@example.invalid","subject":"s","text":"t"}')"
check "stock-management /update-stock sans clé" 401 "$(req POST "$STOCK/update-stock" '{"productId":"x","quantity":1}')"
if [ -n "${INTERNAL_API_KEY:-}" ]; then
  code=$(curl -s -o "$BODY" -w '%{http_code}' -X POST "$GATEWAY/update-stock" -H 'Content-Type: application/json' -H "x-internal-key: $INTERNAL_API_KEY" -d '{"productId":"x","quantity":1}')
  check "gateway /update-stock avec la clé" 200 "$code"
fi
check "/health reste public" 200 "$(req GET "$GATEWAY/health")"

echo "== Force brute (SEC-04) : en dernier, la limite bloque ensuite /api/auth pendant 15 min"
last=""; for _ in $(seq 1 12); do last=$(req POST "$API/auth/login" "{\"username\":\"$USER\",\"password\":\"essai\"}"); [ "$last" = 429 ] && break; done
check "rate limit atteint" 429 "$last"

echo "== Résultat : $PASS réussis, $FAIL en échec"
[ "$FAIL" -eq 0 ]
