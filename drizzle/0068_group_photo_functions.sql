-- A group's photo: any member may set or remove it (the change is told in the conversation). For a
-- group MOSAIC runs, only when the app says the person may (an admin): p_managed_ok.
CREATE OR REPLACE FUNCTION dm_group_photo_set(p_conv uuid, p_mime text, p_bytes bytea, p_managed_ok boolean) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members; v int;
BEGIN
  mine := dm_me(p_conv, true);
  IF (SELECT kind FROM dm_conversations WHERE id = p_conv) <> 'group' THEN RAISE EXCEPTION 'not_a_group' USING ERRCODE = 'P0001'; END IF;
  IF (SELECT system_key FROM dm_conversations WHERE id = p_conv) IS NOT NULL AND NOT p_managed_ok THEN RAISE EXCEPTION 'system_group' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO dm_group_photos (conversation_id, mime, bytes, size, version) VALUES (p_conv, p_mime, p_bytes, octet_length(p_bytes), 1)
  ON CONFLICT (conversation_id) DO UPDATE SET mime = excluded.mime, bytes = excluded.bytes, size = excluded.size,
    version = dm_group_photos.version + 1, updated_at = now()
  RETURNING version INTO v;
  PERFORM dm_system(p_conv, jsonb_build_object('event', 'photo', 'by', me));
  RETURN v;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_group_photo_remove(p_conv uuid, p_managed_ok boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members;
BEGIN
  mine := dm_me(p_conv, true);
  IF (SELECT system_key FROM dm_conversations WHERE id = p_conv) IS NOT NULL AND NOT p_managed_ok THEN RAISE EXCEPTION 'system_group' USING ERRCODE = 'P0001'; END IF;
  DELETE FROM dm_group_photos WHERE conversation_id = p_conv;
  IF FOUND THEN PERFORM dm_system(p_conv, jsonb_build_object('event', 'photo', 'by', me, 'removed', true)); END IF;
END $$;
--> statement-breakpoint

-- The photo, for anyone who is or was in the group.
CREATE OR REPLACE FUNCTION dm_group_photo_get(p_conv uuid) RETURNS TABLE (mime text, bytes bytea, version int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT g.mime, g.bytes, g.version FROM dm_group_photos g
   WHERE g.conversation_id = p_conv
     AND EXISTS (SELECT 1 FROM dm_members m WHERE m.conversation_id = p_conv AND m.user_id = app_current_user_id());
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_group_photo_versions(p_convs uuid[]) RETURNS TABLE (conversation_id uuid, version int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT g.conversation_id, g.version FROM dm_group_photos g
   WHERE g.conversation_id = ANY (p_convs[1:200])
     AND EXISTS (SELECT 1 FROM dm_members m WHERE m.conversation_id = g.conversation_id AND m.user_id = app_current_user_id());
$$;
--> statement-breakpoint

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['dm_group_photo_set(uuid,text,bytea,boolean)','dm_group_photo_remove(uuid,boolean)','dm_group_photo_get(uuid)','dm_group_photo_versions(uuid[])'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
