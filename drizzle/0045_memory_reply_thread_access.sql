-- One reply thread per record, open to everyone who can see the record: its owner, and the people
-- it is shared with (memory_shared_session). Writing and deleting go through these functions;
-- directly, people only read rows they wrote or that sit under their own records (for export).
REVOKE INSERT, DELETE ON memory_replies FROM mosaic_app;
--> statement-breakpoint
DROP POLICY IF EXISTS owner_all ON memory_replies;
--> statement-breakpoint
CREATE POLICY own_read ON memory_replies FOR SELECT TO mosaic_app USING (owner_id = app_current_user_id() OR author_id = app_current_user_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON memory_reply_reads TO mosaic_app;
--> statement-breakpoint
ALTER TABLE memory_reply_reads ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY own_rows ON memory_reply_reads FOR ALL TO mosaic_app USING (user_id = app_current_user_id()) WITH CHECK (user_id = app_current_user_id());
--> statement-breakpoint
DROP FUNCTION IF EXISTS memory_replies_shared(uuid);
--> statement-breakpoint

-- Whether p_user may see p_entry's thread: their own record (not a letter), or one shared with them.
CREATE OR REPLACE FUNCTION memory_reply_can_see(p_entry uuid, p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM memory_entries e WHERE e.id = p_entry AND e.user_id = p_user AND e.kind <> 'letter_to_future')
      OR memory_shared_session(p_entry, p_user) IS NOT NULL
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_reply_can_see(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION memory_reply_add(p_entry uuid, p_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); owner uuid; b text := btrim(coalesce(p_body, '')); new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT memory_reply_can_see(p_entry, me) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF char_length(b) < 1 OR char_length(b) > 2000 THEN RAISE EXCEPTION 'invalid_comment' USING ERRCODE = '22023'; END IF;
  SELECT user_id INTO owner FROM memory_entries WHERE id = p_entry;
  INSERT INTO memory_replies (entry_id, owner_id, author_id, body) VALUES (p_entry, owner, me, b) RETURNING id INTO new_id;
  INSERT INTO memory_reply_reads (user_id, entry_id, read_at) VALUES (me, p_entry, now())
  ON CONFLICT (user_id, entry_id) DO UPDATE SET read_at = now();
  RETURN new_id;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_reply_add(uuid, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION memory_reply_add(uuid, text) TO mosaic_app;
--> statement-breakpoint

-- The writer, or the record's owner, deletes a reply. Returns the record it was under.
CREATE OR REPLACE FUNCTION memory_reply_delete(p_reply uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); r memory_replies%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM memory_replies WHERE id = p_reply;
  IF NOT FOUND OR me NOT IN (r.author_id, r.owner_id) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  DELETE FROM memory_replies WHERE id = p_reply;
  RETURN r.entry_id;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_reply_delete(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION memory_reply_delete(uuid) TO mosaic_app;
--> statement-breakpoint

-- The whole thread, oldest first (nothing when I may not see the record).
CREATE OR REPLACE FUNCTION memory_reply_thread(p_entry uuid)
RETURNS TABLE (id uuid, author_id uuid, author_name text, body text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT memory_reply_can_see(p_entry, me) THEN RETURN; END IF;
  RETURN QUERY
    SELECT r.id, r.author_id, p.display_name, r.body, r.created_at
    FROM memory_replies r JOIN profiles p ON p.user_id = r.author_id
    WHERE r.entry_id = p_entry ORDER BY r.created_at, r.id;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_reply_thread(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION memory_reply_thread(uuid) TO mosaic_app;
--> statement-breakpoint

-- The newest replies under each of the given records I may see, with each record's total.
CREATE OR REPLACE FUNCTION memory_reply_previews(p_entries uuid[], p_per int)
RETURNS TABLE (entry_id uuid, author_id uuid, author_name text, body text, created_at timestamptz, n int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT x.entry_id, x.author_id, p.display_name, x.body, x.created_at, x.n
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
REVOKE ALL ON FUNCTION memory_reply_previews(uuid[], int) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION memory_reply_previews(uuid[], int) TO mosaic_app;
--> statement-breakpoint

-- Threads I'm in (my records, or ones I replied under) that I can still see, with what's new to me:
-- replies by others since I last read it, and the latest of them (none yet: NULL). Newest first.
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
    SELECT t.entry_id, po.display_name, t.owner_id = me, t.unread, l.body, pl.display_name, l.created_at
    FROM t
    JOIN profiles po ON po.user_id = t.owner_id
    LEFT JOIN LATERAL (SELECT r.body, r.author_id, r.created_at FROM memory_replies r WHERE r.entry_id = t.entry_id AND r.author_id <> me
                       ORDER BY r.created_at DESC, r.id DESC LIMIT 1) l ON true
    LEFT JOIN profiles pl ON pl.user_id = l.author_id
    ORDER BY l.created_at DESC NULLS LAST;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_reply_inbox() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION memory_reply_inbox() TO mosaic_app;
