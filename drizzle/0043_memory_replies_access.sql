-- The owner writes and reads follow-ups on their own records (the record must be theirs); the
-- people a record is shared with read them only through memory_replies_shared(), under the same
-- rules as the record itself (memory_shared_session).
GRANT SELECT, INSERT, DELETE ON memory_replies TO mosaic_app;
--> statement-breakpoint
ALTER TABLE memory_replies ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON memory_replies FOR ALL TO mosaic_app
  USING (owner_id = app_current_user_id())
  WITH CHECK (owner_id = app_current_user_id() AND EXISTS (SELECT 1 FROM memory_entries e WHERE e.id = entry_id AND e.user_id = app_current_user_id()));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION memory_replies_shared(p_entry uuid)
RETURNS TABLE (id uuid, body text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF memory_shared_session(p_entry, me) IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT r.id, r.body, r.created_at FROM memory_replies r WHERE r.entry_id = p_entry ORDER BY r.created_at, r.id;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_replies_shared(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION memory_replies_shared(uuid) TO mosaic_app;
