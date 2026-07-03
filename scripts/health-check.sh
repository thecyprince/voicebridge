#!/usr/bin/env bash
# health-check.sh — one command answering "is VoiceBridge healthy?"
# Covers every failure mode from the June 2026 incidents:
#   1. prod reachable
#   2. /api/ping — Supabase + Upstash pause state (heartbeat upsert)
#   3. /api/health — empty/missing env vars in Vercel runtime (names only)
#   4. Doppler vs Vercel key-name drift (local CLIs; skipped if not installed)
#
# Exit 0 = healthy, 1 = something needs attention.

set -uo pipefail

PROD="https://voicebridge-one.vercel.app"
FAIL=0

check() { # label url jq_ok_hint
  local label="$1" url="$2"
  local code body
  body=$(curl -sS -m 20 -w '\n%{http_code}' "$url" 2>&1)
  code=$(echo "$body" | tail -1)
  body=$(echo "$body" | sed '$d')
  if [ "$code" = "200" ]; then
    echo "✓ $label OK"
  else
    echo "✗ $label FAILED (HTTP $code): $(echo "$body" | head -c 300)"
    FAIL=1
  fi
}

echo "== VoiceBridge health $(date '+%Y-%m-%d %H:%M') =="
check "prod site   " "$PROD"
check "ping (supabase+vector)" "$PROD/api/ping"
check "env vars    " "$PROD/api/health"

# Doppler ↔ Vercel key-name drift (best effort, local only)
if command -v doppler >/dev/null && command -v vercel >/dev/null; then
  d_keys=$(DOPPLER_PROJECT=voicebridge DOPPLER_CONFIG=dev doppler secrets --only-names --json 2>/dev/null \
           | python3 -c 'import sys,json; print("\n".join(sorted(k for k in json.load(sys.stdin) if not k.startswith("DOPPLER_"))))' 2>/dev/null)
  v_keys=$(vercel env ls production 2>/dev/null | awk 'NR>2 {print $1}' | grep -E '^[A-Z0-9_]+$' | sort -u)
  if [ -n "$d_keys" ] && [ -n "$v_keys" ]; then
    drift=$(comm -23 <(echo "$d_keys") <(echo "$v_keys"))
    if [ -n "$drift" ]; then
      echo "✗ Doppler keys missing from Vercel: $(echo "$drift" | tr '\n' ' ')"
      echo "  → run scripts/sync-secrets.sh"
      FAIL=1
    else
      echo "✓ Doppler↔Vercel key names in sync"
    fi
  else
    echo "· key-drift check skipped (CLI not authenticated)"
  fi
else
  echo "· key-drift check skipped (doppler/vercel CLI not installed)"
fi

[ "$FAIL" = 0 ] && echo "== ALL HEALTHY ==" || echo "== ATTENTION NEEDED =="
exit $FAIL
