#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATUS_FILE="$(mktemp)"
FUNCTION_ENV="$(mktemp)"
FUNCTION_LOG="$(mktemp)"
SUPABASE_CMD=()

cleanup() {
  set +e
  if [[ -n "${FUNCTION_PID:-}" ]]; then
    kill "$FUNCTION_PID" 2>/dev/null || true
    wait "$FUNCTION_PID" 2>/dev/null || true
  fi
  if [[ -s "$FUNCTION_LOG" && "${TEST_WEBHOOK_PASSED:-0}" != "1" ]]; then
    echo '--- stripe-webhook local log ---' >&2
    tail -n 120 "$FUNCTION_LOG" >&2 || true
  fi
  (cd "$ROOT_DIR" && "${SUPABASE_CMD[@]}" stop --no-backup >/dev/null 2>&1) || true
  rm -f "$STATUS_FILE" "$FUNCTION_ENV" "$FUNCTION_LOG"
}
trap cleanup EXIT

if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CMD=(supabase)
elif command -v pnpm >/dev/null 2>&1; then
  SUPABASE_CMD=(pnpm dlx supabase@latest)
else
  echo 'Supabase CLI or pnpm is required.' >&2
  exit 1
fi
command -v docker >/dev/null || { echo 'Docker is required for local Supabase.' >&2; exit 1; }

cd "$ROOT_DIR"
"${SUPABASE_CMD[@]}" start
"${SUPABASE_CMD[@]}" db reset --local --yes
"${SUPABASE_CMD[@]}" status -o env >"$STATUS_FILE"

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
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-sk_test_idealy_local_webhook_test}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-whsec_idealy_local_test}
STRIPE_PRICE_ID_PRO=${TEST_STRIPE_PRICE_ID_PRO:-price_test_pro}
STRIPE_PRICE_ID_BUSINESS=${TEST_STRIPE_PRICE_ID_BUSINESS:-price_test_business}
STRIPE_CREDIT_PACKS_JSON={"test-credits-25":25}
APP_ORIGIN=http://127.0.0.1:3000
EOF

"${SUPABASE_CMD[@]}" functions serve \
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
TEST_STRIPE_CREDIT_PACK_ID="test-credits-25" \
WEBHOOK_URL="http://127.0.0.1:54321/functions/v1/stripe-webhook" \
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_idealy_local_webhook_test}" \
node scripts/test-stripe-webhook.mjs
TEST_WEBHOOK_PASSED=1
