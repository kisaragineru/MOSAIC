#!/usr/bin/env bash
# Logical backup of the MOSAIC database (schema + data + RLS policies + grants).
# Usage: BACKUP_DATABASE_URL=postgres://mosaic_owner:...@host/db scripts/backup.sh [out_dir]
# Optional: BACKUP_GPG_RECIPIENT=<key id> encrypts the dump (recommended: dumps contain diaries).
set -euo pipefail
URL="${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL (owner connection) is required}"
OUT_DIR="${1:-backups}"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/mosaic-$STAMP.dump"
umask 077
pg_dump --format=custom --compress=9 --no-password --dbname="$URL" --file="$FILE"
pg_restore --list "$FILE" > /dev/null   # verify the archive is readable
if [[ -n "${BACKUP_GPG_RECIPIENT:-}" ]]; then
  gpg --batch --yes --encrypt --recipient "$BACKUP_GPG_RECIPIENT" --output "$FILE.gpg" "$FILE"
  rm -f "$FILE"
  FILE="$FILE.gpg"
fi
sha256sum "$FILE" > "$FILE.sha256"
echo "backup written: $FILE"
