-- Accent-insensitive search (Vietnamese diacritics). `unaccent` is a trusted extension
-- (PostgreSQL >= 13), installable by the database owner on managed providers.
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
-- unaccent() is STABLE; this wrapper pins the dictionary so it can be used consistently.
CREATE OR REPLACE FUNCTION mosaic_fold(t text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT lower(public.unaccent('public.unaccent'::regdictionary, replace(replace(coalesce(t, ''), 'đ', 'd'), 'Đ', 'D')))
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION mosaic_fold(text) TO mosaic_app;
