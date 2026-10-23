# Deployment, configuration, backup & restore

## Requirements
- Node.js ≥ 22, pnpm 10
- PostgreSQL ≥ 15 (tested on 16) with the `unaccent` extension available (trusted extension; standard on RDS, Cloud SQL, Neon, Supabase)
- An HTTPS reverse proxy / platform that sets `X-Forwarded-For` (for per-IP rate limits)

## Environments
Use **separate databases and separate role passwords** for development, test, E2E and production.
`scripts/db-reset-local.sh` refuses to run against anything but `localhost`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Runtime connection as **`mosaic_app`** (RLS enforced). Never the owner. |
| `MIGRATION_DATABASE_URL` | for migrate/seed | Owner connection (`mosaic_owner`). Only used by `pnpm db:migrate` / `db:seed`. Do not give it to the web process. |
| `APP_ORIGIN` | yes | Public origin, e.g. `https://mosaic.example.com`. Used for share links, cookie `Secure`/`__Host-` prefix, HSTS, export CSRF check. |
| `TRUST_PROXY` | recommended | `1` when behind a proxy that overwrites `X-Forwarded-For`; enables per-IP login/register limits (per-account limits always apply). |
| `RATE_LIMIT_SALT` | recommended | Random secret mixed into hashed rate-limit keys. |
| `DATABASE_POOL_MAX` | no | Pool size (default 10). |
| `ANTHROPIC_API_KEY` | no | Enables optional AI reflections (users must also opt in). Unset → deterministic output only. |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-5-5`. |

Secrets are read only on the server; nothing is prefixed `NEXT_PUBLIC_`.

## First-time database setup
1. As an admin, create roles and the database (passwords via psql variables):
   ```bash
   psql "$ADMIN_URL" -v owner_pw='…' -v app_pw='…' -v dbname=mosaic_prod -f scripts/db-bootstrap.sql
   ```
   On managed providers without `CREATEROLE` for your admin user, create the two roles in the
   provider console with the same attributes: `mosaic_app` must be **NOSUPERUSER NOBYPASSRLS** and
   must not own any table.
2. Migrate and seed (idempotent):
   ```bash
   MIGRATION_DATABASE_URL=postgres://mosaic_owner:…@host/mosaic_prod pnpm db:migrate
   MIGRATION_DATABASE_URL=postgres://mosaic_owner:…@host/mosaic_prod pnpm db:seed
   ```
3. Verify RLS from the app role: `psql "$DATABASE_URL" -c "select count(*) from users"` must return `0`.

## Build & run
```bash
pnpm install --frozen-lockfile
pnpm build
DATABASE_URL=… APP_ORIGIN=https://… TRUST_PROXY=1 pnpm start   # next start, port 3000
```
Any Node host works (VM, container, Render, Fly, Railway…). Serverless platforms work too, but use
a pooled Postgres endpoint (PgBouncer in transaction mode is compatible: identity is set with
`set_config(..., true)` inside each transaction).

Deploy order for upgrades: backup → `db:migrate` → `db:seed` → deploy new build.

## Backups
```bash
BACKUP_DATABASE_URL=postgres://mosaic_owner@host/mosaic_prod \   # password from ~/.pgpass
BACKUP_GPG_RECIPIENT=<key-id> scripts/backup.sh /secure/backups
```
- Encryption is **mandatory**: without `BACKUP_GPG_RECIPIENT` the script refuses (override
  `ALLOW_UNENCRYPTED_BACKUP=1` exists for local development only).
- Key management: generate the backup key pair offline; the backup host holds only the **public**
  key. Keep the private key (passphrase-protected) in two separate secure locations (e.g. a hardware
  token + sealed offline copy) controlled by at least two people; rotate yearly; test decryption in
  every restore drill. Losing the private key makes every backup unrecoverable.
- Keep the DB password out of the command line (`~/.pgpass` / `PGPASSFILE`), since the URL is
  visible in the process list.
- Custom-format `pg_dump` (schema, data, RLS policies, grants, migration history), verified with
  `pg_restore --list`, SHA-256 checksum written alongside, optional GPG encryption
  (strongly recommended: dumps contain diaries and birth data).
- Schedule daily (cron/systemd timer) and copy off-site; keep e.g. 7 daily + 4 weekly + 12 monthly.
- Use your provider's point-in-time recovery in addition, if available.

## Restore
1. Create an **empty** database and the roles (`scripts/db-bootstrap.sql` with a new `dbname`).
2. `RESTORE_DATABASE_URL=postgres://mosaic_owner:…@host/mosaic_restore scripts/restore.sh /secure/backups/mosaic-….dump[.gpg]`
   (checks the checksum, decrypts if needed, refuses non-empty targets, restores in one transaction).
3. Point `DATABASE_URL` at the restored database. Verify `select count(*) from users` as `mosaic_app` returns 0.

Tested: a populated test database was backed up and restored; row counts and an md5 of all memory
text were identical, policies and migration history were preserved, and RLS still applied to `mosaic_app`.
Practice a restore drill regularly in a non-production environment.

## Proxy & host configuration
- `TRUST_PROXY=1` is **required** in production behind a proxy that overwrites `X-Forwarded-For`;
  without it every registration shares one global rate-limit bucket (10/hour for the whole service)
  and there is no per-IP login limit (AUD-03).
- Server Actions compare `Origin` with `Host`/`X-Forwarded-Host`; make the proxy forward the public
  host, or set `experimental.serverActions.allowedOrigins` in `next.config.ts`.

## Housekeeping (schedule daily as the owner role)
```sql
DELETE FROM sessions WHERE expires_at < now();
DELETE FROM rate_limit_buckets WHERE window_start < now() - interval '1 day';
```

## Running the tests
```bash
# once: create local roles + databases mosaic_dev, mosaic_test, mosaic_e2e
for db in mosaic_dev mosaic_test mosaic_e2e; do
  sudo -u postgres psql -v owner_pw=owner_dev_pw -v app_pw=app_dev_pw -v dbname=$db -f scripts/db-bootstrap.sql
done
pnpm test          # unit + integration (real PostgreSQL, migrates & seeds mosaic_test)
pnpm test:e2e      # builds, starts `next start` on :3100 against mosaic_e2e, runs Playwright
pnpm lint && pnpm typecheck
```
If Playwright's bundled browser is unavailable, set `PLAYWRIGHT_CHROMIUM_PATH` to a Chromium binary.
