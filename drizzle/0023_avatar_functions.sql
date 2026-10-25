-- Profile photos. Visible to their owner, to people with an active connection to them, and to
-- people they share a conversation with (a group can hold people who aren't connected).
ALTER TABLE user_avatars ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION avatar_visible(p_viewer uuid, p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_viewer = p_user
      OR dm_connected(p_viewer, p_user)
      OR EXISTS (SELECT 1 FROM dm_members a JOIN dm_members b ON b.conversation_id = a.conversation_id
                 WHERE a.user_id = p_viewer AND b.user_id = p_user)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION avatar_visible(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint

-- Set or replace my photo; returns its new version (for cache-busting links).
CREATE OR REPLACE FUNCTION avatar_set(p_mime text, p_bytes bytea) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); v int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  INSERT INTO user_avatars (user_id, mime, bytes, size, version) VALUES (me, p_mime, p_bytes, octet_length(p_bytes), 1)
  ON CONFLICT (user_id) DO UPDATE SET mime = excluded.mime, bytes = excluded.bytes, size = excluded.size,
    version = user_avatars.version + 1, updated_at = now()
  RETURNING version INTO v;
  RETURN v;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION avatar_remove() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  DELETE FROM user_avatars WHERE user_id = me;
END $$;
--> statement-breakpoint

-- Someone's photo, if I may see it.
CREATE OR REPLACE FUNCTION avatar_get(p_user uuid) RETURNS TABLE (mime text, bytes bytea, version int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT a.mime, a.bytes, a.version FROM user_avatars a WHERE a.user_id = p_user AND avatar_visible(me, p_user);
END $$;
--> statement-breakpoint

-- Versions of the photos I may see among these people (to build links without fetching bytes).
CREATE OR REPLACE FUNCTION avatar_versions(p_users uuid[]) RETURNS TABLE (user_id uuid, version int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT a.user_id, a.version FROM user_avatars a
               WHERE a.user_id = ANY (p_users[1:200]) AND avatar_visible(me, a.user_id);
END $$;
--> statement-breakpoint

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['avatar_set(text,bytea)','avatar_remove()','avatar_get(uuid)','avatar_versions(uuid[])'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
