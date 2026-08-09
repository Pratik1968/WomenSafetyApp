#!/usr/bin/env bash
#
# Run the edge functions LOCALLY for testing (Supabase Edge Runtime via Docker).
# Stages backend/<service>/ into supabase/functions/, then serves them so you can
# hit them at http://localhost:54321/functions/v1/<service>.
#
# Usage:
#   ./deployment/serve-functions.sh              # serve all services
#   ./deployment/serve-functions.sh gps-service  # serve one
#
# Requires: supabase CLI + Docker running (`supabase start` first for full stack).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$ROOT/supabase/functions"
ONLY="${1:-}"

clean_stage() {
  find "$STAGE" -mindepth 1 -maxdepth 1 ! -name '.gitignore' -exec rm -rf {} +
}

mkdir -p "$STAGE"
clean_stage
trap clean_stage EXIT

for dir in "$ROOT"/backend/*/; do
  svc="$(basename "$dir")"
  [ -f "$dir/index.ts" ] || continue
  [ -n "$ONLY" ] && [ "$ONLY" != "$svc" ] && continue
  mkdir -p "$STAGE/$svc"
  cp -R "$dir"/. "$STAGE/$svc"/
done

echo "serving on http://localhost:54321/functions/v1/<service> — Ctrl-C to stop"
if [ -n "$ONLY" ]; then
  ( cd "$ROOT" && supabase functions serve "$ONLY" )
else
  ( cd "$ROOT" && supabase functions serve )
fi
