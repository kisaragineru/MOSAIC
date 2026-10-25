-- The text of one message, for a member who can see it (used to translate it on request).
CREATE OR REPLACE FUNCTION dm_message_text(p_msg uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); m dm_messages%ROWTYPE; mine dm_members;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO m FROM dm_messages WHERE id = p_msg AND deleted_at IS NULL AND kind <> 'system';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  mine := dm_me(m.conversation_id, false);
  IF NOT dm_visible(mine, m.created_at) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  RETURN m.body;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION dm_message_text(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION dm_message_text(uuid) TO mosaic_app;
