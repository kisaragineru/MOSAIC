-- One-time bootstrap, run as a superuser / admin (e.g. `psql -U postgres -f scripts/db-bootstrap.sql`).
-- Creates the two roles and the database. Passwords are supplied with psql variables:
--   psql -v owner_pw=... -v app_pw=... -v dbname=mosaic_dev -f scripts/db-bootstrap.sql
-- Managed providers (Neon, RDS, Cloud SQL, Supabase) — see docs/DEPLOYMENT.md.
SELECT format('CREATE ROLE mosaic_owner LOGIN PASSWORD %L', :'owner_pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mosaic_owner') \gexec
SELECT format('CREATE ROLE mosaic_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD %L', :'app_pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mosaic_app') \gexec
SELECT format('CREATE DATABASE %I OWNER mosaic_owner', :'dbname')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'dbname') \gexec
\connect :dbname
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO mosaic_owner;
GRANT USAGE ON SCHEMA public TO mosaic_app;
