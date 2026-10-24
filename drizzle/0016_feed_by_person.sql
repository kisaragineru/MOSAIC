-- The shared-records feed can be narrowed to one connection ("only Sora's").
DROP FUNCTION IF EXISTS connection_feed(date, date, int, int);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION connection_feed(p_after date, p_upto date, p_offset int, p_limit int, p_session uuid)
RETURNS TABLE (id uuid, owner_id uuid, owner_name text, session_id uuid, kind text, title text, body text, occurred_on date, effective_on date, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT x.id, x.user_id, x.display_name, x.sid, x.kind, x.title, x.body, x.occurred_on, x.eff, x.created_at, x.updated_at
    FROM (
      SELECT DISTINCT ON (e.id) e.id, e.user_id, p.display_name, c.sid, e.kind, v.title, v.body, e.occurred_on,
             coalesce(e.occurred_on, (e.created_at AT TIME ZONE 'UTC')::date) AS eff, e.created_at, e.updated_at
      FROM (SELECT s.id AS sid, CASE WHEN s.user_a = me THEN s.user_b ELSE s.user_a END AS other
            FROM comparison_sessions s WHERE me IN (s.user_a, s.user_b) AND s.status = 'active'
                  AND (p_session IS NULL OR s.id = p_session)) c
      JOIN memory_entries e ON e.user_id = c.other
      JOIN memory_entry_versions v ON v.entry_id = e.id AND v.version = e.current_version
      JOIN profiles p ON p.user_id = c.other
      WHERE e.kind <> 'letter_to_future' AND (e.reveal_on IS NULL OR e.reveal_on <= current_date)
        AND (e.visibility = 'connections'
             OR (e.visibility = 'circles' AND EXISTS (
                   SELECT 1 FROM people pe JOIN memory_circles mc ON mc.entry_id = e.id AND mc.circle = pe.relationship
                   WHERE pe.user_id = e.user_id AND pe.connection_session_id = c.sid)))
      ORDER BY e.id
    ) x
    WHERE (p_after IS NULL OR x.eff > p_after) AND (p_upto IS NULL OR x.eff <= p_upto)
    ORDER BY x.eff DESC, x.created_at DESC, x.id
    OFFSET greatest(coalesce(p_offset, 0), 0)
    LIMIT least(greatest(coalesce(p_limit, 20), 1), 100);
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION connection_feed(date, date, int, int, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION connection_feed(date, date, int, int, uuid) TO mosaic_app;
