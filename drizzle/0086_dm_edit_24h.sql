-- A message can be edited for 24 hours after it was sent (was 15 minutes): a typo is often
-- noticed the next morning. After that, what was said stays as it was.
CREATE OR REPLACE FUNCTION dm_edit(p_msg uuid, p_body text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); m dm_messages%ROWTYPE; b text := nullif(btrim(coalesce(p_body, '')), '');
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO m FROM dm_messages WHERE id = p_msg AND sender_id = me AND deleted_at IS NULL;
  IF NOT FOUND OR m.kind <> 'text' THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF m.created_at < now() - interval '24 hours' THEN RAISE EXCEPTION 'edit_window_passed' USING ERRCODE = 'P0001'; END IF;
  IF b IS NULL OR char_length(b) > 4000 THEN RAISE EXCEPTION 'invalid_message' USING ERRCODE = '22023'; END IF;
  PERFORM dm_me(m.conversation_id, true);
  UPDATE dm_messages SET body = b, edited_at = now(), updated_at = now() WHERE id = p_msg;
END $$;
