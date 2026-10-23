-- One-time setup for a managed Postgres where you are NOT a superuser (Neon, Supabase, …).
-- Paste into the provider's SQL editor while connected to the target database (Neon: `neondb`)
-- as the default admin role, after replacing both passwords with long random strings.
-- Result: mosaic_owner (runs migrations, owns all objects) and mosaic_app (runtime, RLS enforced).
CREATE ROLE mosaic_owner LOGIN PASSWORD 'REPLACE_OWNER_PASSWORD';
CREATE ROLE mosaic_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD 'REPLACE_APP_PASSWORD';
-- CREATE on the database: migrations create the `drizzle` bookkeeping schema and the unaccent extension.
GRANT CREATE ON DATABASE neondb TO mosaic_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO mosaic_owner;
GRANT USAGE ON SCHEMA public TO mosaic_app;
