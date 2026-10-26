-- Names in reply threads: someone who isn't connected to me (and shares no conversation with me,
-- the same rule as profile photos: avatar_visible) shows without a name (NULL); the app says
-- "a friend of <owner>". Everyone is connected to the record's owner, so the owner sees every name.
CREATE OR REPLACE FUNCTION memory_reply_thread(p_entry uuid)
RETURNS TABLE (id uuid, author_id uuid, author_name text, body text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT memory_reply_can_see(p_entry, me) THEN RETURN; END IF;
  RETURN QUERY
    SELECT r.id, r.author_id, CASE WHEN avatar_visible(me, r.author_id) THEN p.display_name END, r.body, r.created_at
    FROM memory_replies r JOIN profiles p ON p.user_id = r.author_id
    WHERE r.entry_id = p_entry ORDER BY r.created_at, r.id;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION memory_reply_previews(p_entries uuid[], p_per int)
RETURNS TABLE (entry_id uuid, author_id uuid, author_name text, body text, created_at timestamptz, n int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT x.entry_id, x.author_id, CASE WHEN avatar_visible(me, x.author_id) THEN p.display_name END, x.body, x.created_at, x.n
    FROM (
      SELECT r.*, row_number() OVER (PARTITION BY r.entry_id ORDER BY r.created_at DESC, r.id DESC) AS rn,
             (count(*) OVER (PARTITION BY r.entry_id))::int AS n
      FROM memory_replies r
      WHERE r.entry_id = ANY (p_entries[1:100]) AND memory_reply_can_see(r.entry_id, me)
    ) x
    JOIN profiles p ON p.user_id = x.author_id
    WHERE x.rn <= least(greatest(coalesce(p_per, 2), 1), 5)
    ORDER BY x.entry_id, x.created_at, x.id;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION memory_reply_inbox()
RETURNS TABLE (entry_id uuid, owner_name text, i_own boolean, unread int, last_body text, last_author_name text, last_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    WITH mine AS (
      SELECT DISTINCT r.entry_id, r.owner_id FROM memory_replies r WHERE me IN (r.owner_id, r.author_id)
    ), t AS (
      SELECT m.entry_id, m.owner_id,
             (SELECT count(*)::int FROM memory_replies r
               WHERE r.entry_id = m.entry_id AND r.author_id <> me AND r.created_at > coalesce(rd.read_at, '-infinity')) AS unread
      FROM mine m LEFT JOIN memory_reply_reads rd ON rd.user_id = me AND rd.entry_id = m.entry_id
      WHERE memory_reply_can_see(m.entry_id, me)
    )
    SELECT t.entry_id, po.display_name, t.owner_id = me, t.unread, l.body, CASE WHEN avatar_visible(me, l.author_id) THEN pl.display_name END, l.created_at
    FROM t
    JOIN profiles po ON po.user_id = t.owner_id
    LEFT JOIN LATERAL (SELECT r.body, r.author_id, r.created_at FROM memory_replies r WHERE r.entry_id = t.entry_id AND r.author_id <> me
                       ORDER BY r.created_at DESC, r.id DESC LIMIT 1) l ON true
    LEFT JOIN profiles pl ON pl.user_id = l.author_id
    ORDER BY l.created_at DESC NULLS LAST;
END $$;
