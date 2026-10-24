-- One-to-one comments on shared records. A thread is the record's owner and one other person
-- (partner). Both can read and write it only while the partner can see the record under the
-- shared-feed rules (active connection, record shared with everyone connected or with the
-- partner's relationship). The tables are reachable only through these functions.

-- The active connection through which p_viewer may read p_entry (another person's record), or NULL.
CREATE OR REPLACE FUNCTION memory_shared_session(p_entry uuid, p_viewer uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT s.id
  FROM memory_entries e
  JOIN comparison_sessions s ON s.status = 'active'
   AND ((s.user_a = e.user_id AND s.user_b = p_viewer) OR (s.user_b = e.user_id AND s.user_a = p_viewer))
  WHERE e.id = p_entry AND e.user_id <> p_viewer AND e.kind <> 'letter_to_future'
    AND (e.reveal_on IS NULL OR e.reveal_on <= current_date)
    AND (e.visibility = 'connections'
         OR (e.visibility = 'circles' AND EXISTS (
               SELECT 1 FROM people pe JOIN memory_circles mc ON mc.entry_id = e.id AND mc.circle = pe.relationship
               WHERE pe.user_id = e.user_id AND pe.connection_session_id = s.id)))
  LIMIT 1
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_shared_session(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint

-- One shared record of someone else, if I may read it (same columns as connection_feed).
CREATE OR REPLACE FUNCTION memory_shared_get(p_entry uuid)
RETURNS TABLE (id uuid, owner_id uuid, owner_name text, session_id uuid, kind text, title text, body text, occurred_on date, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); sid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  sid := memory_shared_session(p_entry, me);
  IF sid IS NULL THEN RETURN; END IF;
  RETURN QUERY
    SELECT e.id, e.user_id, p.display_name, sid, e.kind, v.title, v.body, e.occurred_on, e.created_at
    FROM memory_entries e
    JOIN memory_entry_versions v ON v.entry_id = e.id AND v.version = e.current_version
    JOIN profiles p ON p.user_id = e.user_id
    WHERE e.id = p_entry;
END $$;
--> statement-breakpoint

-- Resolve the thread I'm asking about: (partner) when I own the record, myself otherwise.
-- Raises not_found when I'm not in it or the partner can no longer see the record.
CREATE OR REPLACE FUNCTION memory_comment_partner(p_entry uuid, p_partner uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); owner uuid; partner uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT user_id INTO owner FROM memory_entries WHERE id = p_entry;
  IF owner IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  partner := CASE WHEN me = owner THEN p_partner ELSE me END;
  IF partner IS NULL OR partner = owner OR memory_shared_session(p_entry, partner) IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN partner;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_comment_partner(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint

-- Write in a thread. The owner can only answer someone who has written first.
CREATE OR REPLACE FUNCTION memory_comment_add(p_entry uuid, p_partner uuid, p_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); partner uuid; owner uuid; b text := btrim(coalesce(p_body, '')); new_id uuid;
BEGIN
  partner := memory_comment_partner(p_entry, p_partner);
  SELECT user_id INTO owner FROM memory_entries WHERE id = p_entry;
  IF me = owner AND NOT EXISTS (SELECT 1 FROM memory_comments WHERE entry_id = p_entry AND partner_id = partner AND author_id = partner) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF char_length(b) < 1 OR char_length(b) > 2000 THEN RAISE EXCEPTION 'invalid_comment' USING ERRCODE = '22023'; END IF;
  INSERT INTO memory_comments (entry_id, owner_id, partner_id, author_id, body) VALUES (p_entry, owner, partner, me, b) RETURNING id INTO new_id;
  INSERT INTO memory_comment_reads (user_id, entry_id, partner_id, read_at) VALUES (me, p_entry, partner, now())
  ON CONFLICT (user_id, entry_id, partner_id) DO UPDATE SET read_at = now();
  RETURN new_id;
END $$;
--> statement-breakpoint

-- The comments of one thread, oldest first.
CREATE OR REPLACE FUNCTION memory_comment_thread(p_entry uuid, p_partner uuid)
RETURNS TABLE (id uuid, author_id uuid, body text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE partner uuid;
BEGIN
  partner := memory_comment_partner(p_entry, p_partner);
  RETURN QUERY
    SELECT c.id, c.author_id, c.body, c.created_at FROM memory_comments c
    WHERE c.entry_id = p_entry AND c.partner_id = partner
    ORDER BY c.created_at, c.id;
END $$;
--> statement-breakpoint

-- Every thread I'm in that can still be read, newest activity first.
CREATE OR REPLACE FUNCTION memory_comment_inbox()
RETURNS TABLE (entry_id uuid, partner_id uuid, other_id uuid, other_name text, i_own boolean, n int, unread int, last_body text, last_author uuid, last_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    WITH t AS (
      SELECT c.entry_id, c.partner_id, c.owner_id,
             count(*)::int AS n,
             count(*) FILTER (WHERE c.author_id <> me AND c.created_at > coalesce(r.read_at, '-infinity'))::int AS unread,
             max(c.created_at) AS last_at
      FROM memory_comments c
      LEFT JOIN memory_comment_reads r ON r.user_id = me AND r.entry_id = c.entry_id AND r.partner_id = c.partner_id
      WHERE me IN (c.owner_id, c.partner_id)
      GROUP BY c.entry_id, c.partner_id, c.owner_id, r.read_at
    )
    SELECT t.entry_id, t.partner_id,
           CASE WHEN t.owner_id = me THEN t.partner_id ELSE t.owner_id END,
           p.display_name, t.owner_id = me, t.n, t.unread, l.body, l.author_id, t.last_at
    FROM t
    JOIN profiles p ON p.user_id = CASE WHEN t.owner_id = me THEN t.partner_id ELSE t.owner_id END
    JOIN LATERAL (SELECT c.body, c.author_id FROM memory_comments c
                  WHERE c.entry_id = t.entry_id AND c.partner_id = t.partner_id
                  ORDER BY c.created_at DESC, c.id DESC LIMIT 1) l ON true
    WHERE memory_shared_session(t.entry_id, t.partner_id) IS NOT NULL
    ORDER BY t.last_at DESC;
END $$;
--> statement-breakpoint

-- I've read this thread up to now.
CREATE OR REPLACE FUNCTION memory_comment_mark_read(p_entry uuid, p_partner uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); partner uuid;
BEGIN
  partner := memory_comment_partner(p_entry, p_partner);
  INSERT INTO memory_comment_reads (user_id, entry_id, partner_id, read_at) VALUES (me, p_entry, partner, now())
  ON CONFLICT (user_id, entry_id, partner_id) DO UPDATE SET read_at = now();
END $$;
--> statement-breakpoint

-- Take back one of my own comments.
CREATE OR REPLACE FUNCTION memory_comment_delete(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  DELETE FROM memory_comments WHERE id = p_id AND author_id = me;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
END $$;
--> statement-breakpoint

-- What I wrote, for my data export (whatever the record's sharing is now).
CREATE OR REPLACE FUNCTION memory_comments_authored()
RETURNS TABLE (id uuid, entry_id uuid, body text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT c.id, c.entry_id, c.body, c.created_at FROM memory_comments c WHERE c.author_id = me ORDER BY c.created_at;
END $$;
--> statement-breakpoint

ALTER TABLE memory_comments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE memory_comment_reads ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'memory_shared_get(uuid)','memory_comment_add(uuid,uuid,text)','memory_comment_thread(uuid,uuid)',
    'memory_comment_inbox()','memory_comment_mark_read(uuid,uuid)','memory_comment_delete(uuid)','memory_comments_authored()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
