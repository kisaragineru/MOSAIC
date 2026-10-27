-- A writer I'm not connected to keeps their name hidden, but their icon shows the first letter of
-- it (as it would without a photo), so the thread tells people apart. Photos stay hidden.
DROP FUNCTION IF EXISTS memory_reply_thread(uuid);
--> statement-breakpoint
CREATE FUNCTION memory_reply_thread(p_entry uuid)
RETURNS TABLE (id uuid, author_id uuid, author_name text, author_initial text, body text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT memory_reply_can_see(p_entry, me) THEN RETURN; END IF;
  RETURN QUERY
    SELECT r.id, r.author_id, CASE WHEN avatar_visible(me, r.author_id) THEN p.display_name END,
           upper(left(btrim(p.display_name), 1)), r.body, r.created_at
    FROM memory_replies r JOIN profiles p ON p.user_id = r.author_id
    WHERE r.entry_id = p_entry ORDER BY r.created_at, r.id;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_reply_thread(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION memory_reply_thread(uuid) TO mosaic_app;
