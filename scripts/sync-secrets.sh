#!/usr/bin/env bash
# Syncs all Doppler secrets (voicebridge/dev) → Vercel production.
# Run this whenever you add or change a secret in Doppler.
set -euo pipefail

DOPPLER_PROJECT=voicebridge
DOPPLER_CONFIG=dev

KEYS=(
  ANTHROPIC_API_KEY
  OPENAI_API_KEY
  GLADIA_API_KEY
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  UPSTASH_VECTOR_REST_URL
  UPSTASH_VECTOR_REST_TOKEN
  CLERK_SECRET_KEY
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REDIRECT_URI
  GOOGLE_ACCESS_TOKEN
)

echo "Fetching secrets from Doppler ($DOPPLER_PROJECT/$DOPPLER_CONFIG)..."

eval "$(DOPPLER_PROJECT=$DOPPLER_PROJECT DOPPLER_CONFIG=$DOPPLER_CONFIG doppler secrets download --no-file --format env)"

for k in "${KEYS[@]}"; do
  v="${!k:-}"
  if [[ -z "$v" ]]; then
    echo "  skip $k (empty in Doppler)"
    continue
  fi
  vercel env rm "$k" production --yes 2>/dev/null || true
  printf "%s" "$v" | vercel env add "$k" production
  echo "  synced $k"
done

echo ""
echo "Done. Redeploy to apply: vercel --prod"
