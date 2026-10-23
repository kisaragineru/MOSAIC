#!/usr/bin/env bash
# Restore a backup made by backup.sh into an EMPTY database owned by mosaic_owner.
# Roles (mosaic_owner, mosaic_app) must already exist (scripts/db-bootstrap.sql).
# Usage: RESTORE_DATABASE_URL=postgres://mosaic_owner:...@host/newdb scripts/restore.sh backups/mosaic-XXXX.dump[.gpg]
set -euo pipefail
URL="${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL (owner connection to an empty database) is required}"
FILE="${1:?backup file required}"
if [[ -f "$FILE.sha256" ]]; then sha256sum --check --status "$FILE.sha256" || { echo "checksum mismatch" >&2; exit 1; }; fi
if [[ "$FILE" == *.gpg ]]; then
  TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
  gpg --batch --yes --decrypt --output "$TMP" "$FILE"
  FILE="$TMP"
fi
TABLES="$(psql "$URL" -Atc "select count(*) from information_schema.tables where table_schema='public'")"
if [[ "$TABLES" != "0" ]]; then echo "target database is not empty; refusing to overwrite" >&2; exit 1; fi
pg_restore --no-password --exit-on-error --single-transaction --dbname="$URL" "$FILE"
echo "restore complete"
