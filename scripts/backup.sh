#!/usr/bin/env bash
# Logical backup of the MOSAIC database (schema + data + RLS policies + grants).
# Usage: BACKUP_DATABASE_URL=postgres://mosaic_owner:...@host/db scripts/backup.sh [out_dir]
# Required: BACKUP_GPG_RECIPIENT=<key id> — dumps contain diaries, birth data and notes about
# other people, so unencrypted output is refused unless ALLOW_UNENCRYPTED_BACKUP=1 is set
# explicitly (local development only).
# Credentials: prefer a ~/.pgpass / PGPASSFILE entry over a password inside the URL, because the
# URL is passed on pg_dump's command line (visible in the process list).
set -euo pipefail
if [[ -z "${BACKUP_GPG_RECIPIENT:-}" && "${ALLOW_UNENCRYPTED_BACKUP:-}" != "1" ]]; then
  echo "refusing to write an unencrypted backup: set BACKUP_GPG_RECIPIENT (or ALLOW_UNENCRYPTED_BACKUP=1 for local dev)" >&2
  exit 2
fi
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
# Checksum by file name so it can be verified from any working directory.
(cd "$(dirname "$FILE")" && sha256sum "$(basename "$FILE")" > "$(basename "$FILE").sha256")
echo "backup written: $FILE"
