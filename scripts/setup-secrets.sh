#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.local}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fichier introuvable : $ENV_FILE" >&2
  echo "Copiez .env.example vers .env.local puis renseignez les valeurs localement." >&2
  exit 1
fi

read_env() {
  local name="$1"
  local value
  value="$(grep -E "^${name}=" "$ENV_FILE" | tail -n 1 | cut -d '=' -f 2- || true)"
  if [[ -z "$value" || "$value" == "<"* ]]; then
    echo "Secret ou paramètre manquant : ${name}" >&2
    exit 1
  fi
  printf '%s' "$value"
}

PROJECT_ID="$(read_env SUPABASE_PROJECT_ID)"
ACCESS_TOKEN="$(read_env SUPABASE_ACCESS_TOKEN)"

for name in \
  SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY AI_KEY_ENCRYPTION_SECRET \
  STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET \
  STRIPE_PRICE_ID_PRO_MONTHLY STRIPE_PRICE_ID_PRO_YEARLY \
  STRIPE_PRICE_ID_BUSINESS_MONTHLY STRIPE_PRICE_ID_BUSINESS_YEARLY \
  PEXELS_API_KEY OPENAI_API_KEY APP_URL APP_ORIGIN IDEALY_ALLOWED_ORIGINS; do
  read_env "$name" >/dev/null
done

export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"
npx --yes supabase@latest secrets set \
  --project-ref "$PROJECT_ID" \
  --env-file "$ENV_FILE" \
  --yes

printf 'Secrets serveur configurés pour le projet %s.\n' "$PROJECT_ID"
printf 'Les valeurs n’ont pas été affichées.\n'
