#!/usr/bin/env bash
#
# Deploy every backend/<service>/ as a Supabase Edge Function.
#
# Why a script? The Supabase CLI only deploys functions found under
# supabase/functions/<name>/. Our source lives under backend/<service>/, so we
# stage each service into supabase/functions/ (a gitignored staging dir), run a
# single `supabase functions deploy` — which CREATES new functions and UPDATES
# existing ones — then clean the staging dir.
#
# Usage:
#   SUPABASE_PROJECT_REF=xxxx ./deployment/deploy-functions.sh
#   ./deployment/deploy-functions.sh <project-ref>
#
#   # Test locally WITHOUT deploying — just stage + list what would deploy.
#   # Needs no Supabase account, no Docker. Staged files are left for inspection.
#   DRY_RUN=1 ./deployment/deploy-functions.sh
#
# Requires (for a real deploy): supabase CLI, and SUPABASE_ACCESS_TOKEN in the
# environment (or an interactive `supabase login`).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$ROOT/supabase/functions"
DRY_RUN="${DRY_RUN:-}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-${1:-}}"

if [ -z "$DRY_RUN" ] && [ -z "$PROJECT_REF" ]; then
  echo "error: set SUPABASE_PROJECT_REF env var or pass the project ref as arg 1" >&2
  echo "       (or run with DRY_RUN=1 to test staging without deploying)" >&2
  exit 1
fi

clean_stage() {
  find "$STAGE" -mindepth 1 -maxdepth 1 ! -name '.gitignore' -exec rm -rf {} +
}

mkdir -p "$STAGE"
clean_stage
# On a real deploy, always tidy up. On a dry run, keep staged files to inspect.
[ -z "$DRY_RUN" ] && trap clean_stage EXIT

# Stage each backend service that has an index.ts as a function of the same name.
staged=()
for dir in "$ROOT"/backend/*/; do
  svc="$(basename "$dir")"
  if [ ! -f "$dir/index.ts" ]; then
    echo "skip: $svc (no index.ts)"
    continue
  fi
  mkdir -p "$STAGE/$svc"
  cp -R "$dir"/. "$STAGE/$svc"/
  staged+=("$svc")
done

if [ "${#staged[@]}" -eq 0 ]; then
  echo "nothing to deploy"
  exit 0
fi

if [ -n "$DRY_RUN" ]; then
  echo "DRY RUN — staged ${#staged[@]} function(s), skipping deploy:"
  for svc in "${staged[@]}"; do echo "  • $svc  (supabase/functions/$svc/index.ts)"; done
  echo "left staged under supabase/functions/ for inspection; re-run without DRY_RUN to deploy."
  exit 0
fi

echo "deploying (create-or-update): ${staged[*]}"
( cd "$ROOT" && supabase functions deploy --project-ref "$PROJECT_REF" )
echo "done."
