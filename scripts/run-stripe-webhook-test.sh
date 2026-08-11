#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATUS_FILE="$(mktemp)"
FUNCTION_ENV="$(mktemp)"
FUNCTION_LOG="$(mktemp)"

cleanup() {
  set +e
  if [[ -n "${FUNCTION_PID:-}" ]]; then
    kill "$FUNCTION_PID" 2>/dev/null || true
    wait "$FUNCTION_PID" 2>/dev/null || true
  fi
  (cd "$ROOT_DIR" && supabase stop --no-backup >/dev/null 2>&1) || true
  rm -f "$STATUS_FILE" "$FUNCTION_ENV" "$FUNCTION_LOG"
}
trap cleanup EXIT

command -v supabase >/dev/null || { echo 'supabase CLI is required.' >&2; exit 1; }
command -v docker >/dev/null || { echo 'Docker is required for local Supabase.' >&2; exit 1; }

cd "$ROOT_DIR"
supabase start
supabase db reset --local --yes
supabase status -o env >"$STATUS_FILE"

# status -o env uses API_URL, ANON_KEY and SERVICE_ROLE_KEY for local credentials.
set -a
# shellcheck disable=SC1090
source "$STATUS_FILE"
set +a
: "${API_URL:?supabase status did not provide API_URL}"
: "${SERVICE_ROLE_KEY:?supabase status did not provide SERVICE_ROLE_KEY}"
: "${ANON_KEY:?supabase status did not provide ANON_KEY}"

cat >"$FUNCTION_ENV" <<EOF
SUPABASE_URL=$API_URL
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-whsec_idealy_local_test}
STRIPE_PRICE_ID_PRO=${TEST_STRIPE_PRICE_ID_PRO:-price_test_pro}
STRIPE_PRICE_ID_BUSINESS=${TEST_STRIPE_PRICE_ID_BUSINESS:-price_test_business}
APP_ORIGIN=http://127.0.0.1:3000
EOF

supabase functions serve stripe-webhook \
  --env-file "$FUNCTION_ENV" \
  --no-verify-jwt >"$FUNCTION_LOG" 2>&1 &
FUNCTION_PID=$!

for _ in $(seq 1 30); do
  HTTP_CODE=$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H 'Content-Type: application/json' \
    -H 'stripe-signature: t=0,v1=probe' \
    http://127.0.0.1:54321/functions/v1/stripe-webhook || true)
  if [[ "$HTTP_CODE" != "000" ]]; then
    break
  fi
  sleep 1
done

SUPABASE_URL="$API_URL" \
SUPABASE_ANON_KEY="$ANON_KEY" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-whsec_idealy_local_test}" \
TEST_STRIPE_PRICE_ID_PRO="${TEST_STRIPE_PRICE_ID_PRO:-price_test_pro}" \
TEST_STRIPE_PRICE_ID_BUSINESS="${TEST_STRIPE_PRICE_ID_BUSINESS:-price_test_business}" \
WEBHOOK_URL="http://127.0.0.1:54321/functions/v1/stripe-webhook" \
node scripts/test-stripe-webhook.mjs
