-- "Our story": what two connected people have shared, the same for both of them. Only counts and
-- dates of things both already know (when they connected, how many messages and comments passed
-- between them) — never a message's content, and nothing one of them keeps to themself.
CREATE OR REPLACE FUNCTION pair_history(p_session uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; k text; cid uuid; agreed timestamptz; out jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  -- Sharing began when the second of the two current consents was given.
  SELECT CASE WHEN count(*) = 2 THEN max(consented_at) END INTO agreed
    FROM comparison_consents WHERE session_id = p_session AND withdrawn_at IS NULL;
  k := least(s.user_a::text, s.user_b::text) || ':' || greatest(s.user_a::text, s.user_b::text);
  SELECT id INTO cid FROM dm_conversations WHERE direct_key = k;
  SELECT jsonb_build_object(
    'connectedAt', s.created_at,
    'agreedAt', agreed,
    'messages', (SELECT count(*) FROM dm_messages WHERE conversation_id = cid AND deleted_at IS NULL AND kind <> 'system'),
    'firstMessageAt', (SELECT min(created_at) FROM dm_messages WHERE conversation_id = cid AND deleted_at IS NULL AND kind <> 'system'),
    -- When the 100th, 500th and 1000th message was sent (null until then).
    'messageMarks', (
      SELECT coalesce(jsonb_object_agg(n, at), '{}'::jsonb) FROM (
        SELECT rn AS n, created_at AS at FROM (
          SELECT created_at, row_number() OVER (ORDER BY created_at, id) AS rn
          FROM dm_messages WHERE conversation_id = cid AND deleted_at IS NULL AND kind <> 'system'
        ) m WHERE rn IN (100, 500, 1000)
      ) x),
    'comments', (SELECT count(*) FROM memory_comments c
                 WHERE (c.owner_id = s.user_a AND c.partner_id = s.user_b) OR (c.owner_id = s.user_b AND c.partner_id = s.user_a)),
    'firstCommentAt', (SELECT min(created_at) FROM memory_comments c
                 WHERE (c.owner_id = s.user_a AND c.partner_id = s.user_b) OR (c.owner_id = s.user_b AND c.partner_id = s.user_a))
  ) INTO out;
  RETURN out;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION pair_history(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION pair_history(uuid) TO mosaic_app;
