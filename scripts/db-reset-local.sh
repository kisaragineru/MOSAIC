#!/usr/bin/env bash
# DEVELOPMENT ONLY: drops and recreates the public schema of a LOCAL database, then migrates + seeds.
# Refuses to run against non-localhost URLs.
set -euo pipefail
URL="${1:?usage: db-reset-local.sh <owner-database-url>}"
case "$URL" in
  *@localhost:*|*@127.0.0.1:*) ;;
  *) echo "refusing to reset a non-local database" >&2; exit 1 ;;
esac
psql "$URL" -v ON_ERROR_STOP=1 -q -c "DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public; REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO mosaic_app;"
MIGRATION_DATABASE_URL="$URL" npx tsx scripts/migrate.ts
MIGRATION_DATABASE_URL="$URL" npx tsx scripts/seed.ts
