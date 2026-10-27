-- Sending my own record to someone outside its audience: they're asked about first, and if I choose
-- to show it, that message shows them the card (not the record's page, nothing else of mine).
CREATE OR REPLACE FUNCTION dm_messages(p_conv uuid, p_before timestamptz, p_since timestamptz, p_limit int) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members; lim int := least(greatest(coalesce(p_limit, 40), 1), 200);
BEGIN
  mine := dm_me(p_conv, false);
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', x.id, 'sender_id', x.sender_id, 'sender_name', sp.display_name, 'kind', x.kind,
    'body', x.body, 'meta', x.meta, 'created_at', x.created_at, 'updated_at', x.updated_at,
    'edited', x.edited_at IS NOT NULL, 'deleted', x.deleted_at IS NOT NULL,
    'reply', (SELECT jsonb_build_object('id', r.id, 'sender_name', rp.display_name, 'kind', r.kind, 'body', left(r.body, 200), 'deleted', r.deleted_at IS NOT NULL)
              FROM dm_messages r LEFT JOIN profiles rp ON rp.user_id = r.sender_id
              WHERE r.id = x.reply_to AND dm_visible(mine, r.created_at)),
    'record', CASE WHEN x.record_id IS NULL THEN NULL ELSE (
      SELECT CASE
        WHEN e.user_id = me OR memory_shared_session(e.id, me) IS NOT NULL THEN jsonb_build_object(
          'id', e.id, 'mine', e.user_id = me, 'owner_name', op.display_name, 'kind', e.kind,
          'title', CASE WHEN e.reveal_on > current_date THEN NULL ELSE v.title END,
          'body', CASE WHEN e.reveal_on > current_date THEN NULL ELSE left(v.body, 300) END)
        -- Its owner sent it and chose to show it here: the card, for members outside its audience.
        WHEN x.record_shown AND x.sender_id = e.user_id THEN jsonb_build_object(
          'id', e.id, 'mine', false, 'shown', true, 'owner_name', op.display_name, 'kind', e.kind,
          'title', CASE WHEN e.reveal_on > current_date THEN NULL ELSE v.title END,
          'body', CASE WHEN e.reveal_on > current_date THEN NULL ELSE left(v.body, 300) END)
        ELSE jsonb_build_object('hidden', true) END
      FROM memory_entries e
      JOIN memory_entry_versions v ON v.entry_id = e.id AND v.version = e.current_version
      JOIN profiles op ON op.user_id = e.user_id
      WHERE e.id = x.record_id) END,
    'attachments', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'w', a.width, 'h', a.height) ORDER BY a.position), '[]'::jsonb)
                    FROM dm_attachments a WHERE a.message_id = x.id),
    'reactions', (SELECT coalesce(jsonb_agg(jsonb_build_object('user_id', rr.user_id, 'emoji', rr.emoji) ORDER BY rr.created_at), '[]'::jsonb)
                  FROM dm_reactions rr WHERE rr.message_id = x.id))
  FROM (
    SELECT * FROM dm_messages m
    WHERE m.conversation_id = p_conv AND dm_visible(mine, m.created_at)
      AND (p_since IS NULL OR m.updated_at > p_since)
      AND (p_since IS NOT NULL OR p_before IS NULL OR m.created_at < p_before)
    ORDER BY CASE WHEN p_since IS NULL THEN m.created_at END DESC, CASE WHEN p_since IS NOT NULL THEN m.updated_at END ASC, m.id
    LIMIT lim
  ) x
  LEFT JOIN profiles sp ON sp.user_id = x.sender_id;
END $$;
--> statement-breakpoint

-- Which of these people can't see my record (outside its audience): their ids and names.
CREATE OR REPLACE FUNCTION memory_unseen_by(p_entry uuid, p_users uuid[])
RETURNS TABLE (user_id uuid, name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM memory_entries e WHERE e.id = p_entry AND e.user_id = me) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  RETURN QUERY
    SELECT p.user_id, p.display_name FROM profiles p
    WHERE p.user_id = ANY (p_users[1:50]) AND p.user_id <> me AND memory_shared_session(p_entry, p.user_id) IS NULL
    ORDER BY p.display_name;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_unseen_by(uuid, uuid[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION memory_unseen_by(uuid, uuid[]) TO mosaic_app;
--> statement-breakpoint

-- Show my record in a message I sent (after I was asked).
CREATE OR REPLACE FUNCTION dm_show_record(p_message uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE dm_messages x SET record_shown = true, updated_at = now()
  WHERE x.id = p_message AND x.sender_id = me AND x.deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM memory_entries e WHERE e.id = x.record_id AND e.user_id = me);
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION dm_show_record(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION dm_show_record(uuid) TO mosaic_app;
