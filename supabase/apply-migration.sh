#!/usr/bin/env bash
set -euo pipefail

# apply-migration.sh
# Safely apply supabase/migrations/001_init.sql to a Postgres database.
# Usage:
#   DATABASE_URL="postgres://..." ./supabase/apply-migration.sh
#   or
#   ./supabase/apply-migration.sh --yes

MIGRATION_FILE="supabase/migrations/001_init.sql"

usage() {
  echo "Usage: DATABASE_URL=postgres://... $0 [--yes]"
  exit 1
}

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is required but not found. Install Postgres client tools."
  exit 2
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Migration file not found: $MIGRATION_FILE"
  exit 3
fi

FORCE_NO_PROMPT=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y) FORCE_NO_PROMPT=1; shift ;;
    --help|-h) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL environment variable is not set. Provide the service-role DATABASE_URL for applying migrations."
  echo "Example: DATABASE_URL=postgres://user:pass@host:5432/db $0"
  exit 4
fi

echo "About to apply: $MIGRATION_FILE"
echo "Target: $DATABASE_URL"

if [ "$FORCE_NO_PROMPT" -ne 1 ]; then
  read -p "Proceed applying migration? (type 'yes' to continue) " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Aborting."
    exit 0
  fi
fi

# Run psql with ON_ERROR_STOP so partial migrations don't silently continue
PSQL_CMD=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$MIGRATION_FILE")

echo "Running migration..."
"${PSQL_CMD[@]}"

echo "Migration complete."
