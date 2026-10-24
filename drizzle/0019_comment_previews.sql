-- The newest comments on several records at once, for the timeline: only the conversations I'm
-- in (as the record's owner, every person's; otherwise mine with the owner), only while the
-- record is still shared with that person. p_per newest per record.
CREATE OR REPLACE FUNCTION memory_comment_previews(p_entries uuid[], p_per int)
RETURNS TABLE (entry_id uuid, partner_id uuid, author_id uuid, author_name text, body text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT x.entry_id, x.partner_id, x.author_id, p.display_name, x.body, x.created_at
    FROM (
      SELECT c.*, row_number() OVER (PARTITION BY c.entry_id ORDER BY c.created_at DESC, c.id DESC) AS rn
      FROM memory_comments c
      WHERE c.entry_id = ANY (p_entries[1:100]) AND me IN (c.owner_id, c.partner_id)
        AND memory_shared_session(c.entry_id, c.partner_id) IS NOT NULL
    ) x
    JOIN profiles p ON p.user_id = x.author_id
    WHERE x.rn <= least(greatest(coalesce(p_per, 2), 1), 5)
    ORDER BY x.entry_id, x.created_at, x.author_id;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_comment_previews(uuid[], int) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION memory_comment_previews(uuid[], int) TO mosaic_app;
