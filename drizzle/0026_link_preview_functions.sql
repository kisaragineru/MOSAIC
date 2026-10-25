-- Link previews: a shared cache of public web pages' Open Graph cards. Any signed-in person may
-- read and write it (it holds no personal data, only what the linked page publishes); the app
-- role has no direct access to the table.
ALTER TABLE link_previews ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION link_preview_get(p_hash text)
RETURNS TABLE (url text, status text, title text, description text, site_name text, has_image boolean, fetched_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF app_current_user_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT l.url, l.status, l.title, l.description, l.site_name, l.image_bytes IS NOT NULL, l.fetched_at FROM link_previews l WHERE l.url_hash = p_hash;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION link_preview_put(p_hash text, p_url text, p_status text, p_title text, p_description text, p_site text, p_mime text, p_bytes bytea)
RETURNS TABLE (url text, status text, title text, description text, site_name text, has_image boolean, fetched_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF app_current_user_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF p_hash !~ '^[0-9a-f]{64}$' OR char_length(p_url) > 2048 OR coalesce(octet_length(p_bytes), 0) > 2500000 THEN
    RAISE EXCEPTION 'invalid_preview' USING ERRCODE = '22023';
  END IF;
  INSERT INTO link_previews AS l (url_hash, url, status, title, description, site_name, image_mime, image_bytes, fetched_at)
  VALUES (p_hash, p_url, p_status, left(p_title, 200), left(p_description, 300), left(p_site, 80), CASE WHEN p_bytes IS NULL THEN NULL ELSE p_mime END, p_bytes, now())
  ON CONFLICT (url_hash) DO UPDATE SET url = excluded.url, status = excluded.status, title = excluded.title, description = excluded.description,
    site_name = excluded.site_name, image_mime = excluded.image_mime, image_bytes = excluded.image_bytes, fetched_at = now();
  RETURN QUERY SELECT l.url, l.status, l.title, l.description, l.site_name, l.image_bytes IS NOT NULL, l.fetched_at FROM link_previews l WHERE l.url_hash = p_hash;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION link_preview_image(p_hash text) RETURNS TABLE (mime text, bytes bytea)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF app_current_user_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT l.image_mime, l.image_bytes FROM link_previews l WHERE l.url_hash = p_hash AND l.image_bytes IS NOT NULL;
END $$;
--> statement-breakpoint

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['link_preview_get(text)','link_preview_put(text,text,text,text,text,text,text,bytea)','link_preview_image(text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
