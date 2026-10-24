CREATE TABLE "memory_audience" (
	"entry_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_audience_entry_id_session_id_pk" PRIMARY KEY("entry_id","session_id")
);
--> statement-breakpoint
ALTER TABLE "memory_entries" DROP CONSTRAINT "memory_visibility_ck";--> statement-breakpoint
ALTER TABLE "memory_audience" ADD CONSTRAINT "memory_audience_entry_id_memory_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."memory_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_audience" ADD CONSTRAINT "memory_audience_session_id_comparison_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."comparison_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_audience" ADD CONSTRAINT "memory_audience_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memory_audience_session_idx" ON "memory_audience" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_visibility_ck" CHECK ("memory_entries"."visibility" in ('private','connections','selected'));--> statement-breakpoint
-- The owner reads their own audience rows; writes go through memory_set_audience().
GRANT SELECT ON memory_audience TO mosaic_app;
--> statement-breakpoint
ALTER TABLE memory_audience ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_select ON memory_audience FOR SELECT TO mosaic_app USING (owner_id = app_current_user_id());
--> statement-breakpoint
-- Who may read one of my records: nobody (private), everyone I'm connected with, or the
-- connections I pick. Letters to the future always stay private.
CREATE OR REPLACE FUNCTION memory_set_audience(p_entry uuid, p_visibility text, p_sessions uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); e memory_entries%ROWTYPE; sid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO e FROM memory_entries WHERE id = p_entry FOR UPDATE;
  IF NOT FOUND OR e.user_id <> me THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p_visibility NOT IN ('private','connections','selected') THEN RAISE EXCEPTION 'invalid_audience' USING ERRCODE = '22023'; END IF;
  IF e.kind = 'letter_to_future' AND p_visibility <> 'private' THEN RAISE EXCEPTION 'letters_stay_private' USING ERRCODE = 'P0001'; END IF;
  IF p_visibility = 'selected' THEN
    IF coalesce(cardinality(p_sessions), 0) = 0 THEN RAISE EXCEPTION 'invalid_audience' USING ERRCODE = '22023'; END IF;
    FOREACH sid IN ARRAY p_sessions LOOP
      IF NOT EXISTS (SELECT 1 FROM comparison_sessions s WHERE s.id = sid AND me IN (s.user_a, s.user_b) AND s.status = 'active') THEN
        RAISE EXCEPTION 'invalid_audience' USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;
  UPDATE memory_entries SET visibility = p_visibility WHERE id = p_entry;
  DELETE FROM memory_audience WHERE entry_id = p_entry;
  IF p_visibility = 'selected' THEN
    INSERT INTO memory_audience (entry_id, session_id, owner_id) SELECT p_entry, x, me FROM unnest(p_sessions) AS x ON CONFLICT DO NOTHING;
  END IF;
END $$;
--> statement-breakpoint
-- Records the people I'm connected with chose to show me: current text only (no people,
-- tags, mood, reasons or history), never letters, nothing unless the connection is active.
-- Ordered like my own records (effective date, then written time), optionally within a date
-- window (after < effective date <= upto) so a page of mine and theirs can be merged.
CREATE OR REPLACE FUNCTION connection_feed(p_after date, p_upto date, p_offset int, p_limit int)
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
            FROM comparison_sessions s WHERE me IN (s.user_a, s.user_b) AND s.status = 'active') c
      JOIN memory_entries e ON e.user_id = c.other
      JOIN memory_entry_versions v ON v.entry_id = e.id AND v.version = e.current_version
      JOIN profiles p ON p.user_id = c.other
      WHERE e.kind <> 'letter_to_future' AND (e.reveal_on IS NULL OR e.reveal_on <= current_date)
        AND (e.visibility = 'connections'
             OR (e.visibility = 'selected' AND EXISTS (SELECT 1 FROM memory_audience a WHERE a.entry_id = e.id AND a.session_id = c.sid)))
      ORDER BY e.id
    ) x
    WHERE (p_after IS NULL OR x.eff > p_after) AND (p_upto IS NULL OR x.eff <= p_upto)
    ORDER BY x.eff DESC, x.created_at DESC, x.id
    OFFSET greatest(coalesce(p_offset, 0), 0)
    LIMIT least(greatest(coalesce(p_limit, 20), 1), 100);
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_set_audience(uuid, text, uuid[]) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION connection_feed(date, date, int, int) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION memory_set_audience(uuid, text, uuid[]) TO mosaic_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION connection_feed(date, date, int, int) TO mosaic_app;
