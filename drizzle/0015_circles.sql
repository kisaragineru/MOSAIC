CREATE TABLE "dev_companions" (
	"owner_id" uuid NOT NULL,
	"companion_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dev_companions_owner_id_companion_id_pk" PRIMARY KEY("owner_id","companion_id")
);
--> statement-breakpoint
CREATE TABLE "memory_circles" (
	"entry_id" uuid NOT NULL,
	"circle" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_circles_entry_id_circle_pk" PRIMARY KEY("entry_id","circle"),
	CONSTRAINT "memory_circles_ck" CHECK ("memory_circles"."circle" in ('partner','family','friend','colleague'))
);
--> statement-breakpoint
DROP FUNCTION IF EXISTS memory_set_audience(uuid, text, uuid[]);--> statement-breakpoint
ALTER TABLE "memory_audience" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "memory_audience" CASCADE;--> statement-breakpoint
ALTER TABLE "memory_entries" DROP CONSTRAINT "memory_visibility_ck";--> statement-breakpoint
ALTER TABLE "dev_companions" ADD CONSTRAINT "dev_companions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dev_companions" ADD CONSTRAINT "dev_companions_companion_id_users_id_fk" FOREIGN KEY ("companion_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_circles" ADD CONSTRAINT "memory_circles_entry_id_memory_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."memory_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_circles" ADD CONSTRAINT "memory_circles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Records shared with hand-picked connections become private again (the owner re-chooses by relationship).
UPDATE memory_entries SET visibility = 'private' WHERE visibility NOT IN ('private','connections');--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_visibility_ck" CHECK ("memory_entries"."visibility" in ('private','connections','circles'));
--> statement-breakpoint
GRANT SELECT ON memory_circles TO mosaic_app;
--> statement-breakpoint
ALTER TABLE memory_circles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_select ON memory_circles FOR SELECT TO mosaic_app USING (owner_id = app_current_user_id());
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON dev_companions TO mosaic_app;
--> statement-breakpoint
ALTER TABLE dev_companions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON dev_companions FOR ALL TO mosaic_app USING (owner_id = app_current_user_id()) WITH CHECK (owner_id = app_current_user_id());
--> statement-breakpoint
-- Who may read one of my records: nobody (private), everyone I'm connected with, or the people
-- whose relationship (on the person linked to the connection) is one of the chosen circles.
-- Letters to the future always stay private.
CREATE OR REPLACE FUNCTION memory_set_audience(p_entry uuid, p_visibility text, p_circles text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); e memory_entries%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO e FROM memory_entries WHERE id = p_entry FOR UPDATE;
  IF NOT FOUND OR e.user_id <> me THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p_visibility NOT IN ('private','connections','circles') THEN RAISE EXCEPTION 'invalid_audience' USING ERRCODE = '22023'; END IF;
  IF e.kind = 'letter_to_future' AND p_visibility <> 'private' THEN RAISE EXCEPTION 'letters_stay_private' USING ERRCODE = 'P0001'; END IF;
  IF p_visibility = 'circles' AND (coalesce(cardinality(p_circles), 0) = 0
      OR EXISTS (SELECT 1 FROM unnest(p_circles) x WHERE x NOT IN ('partner','family','friend','colleague'))) THEN
    RAISE EXCEPTION 'choose_audience' USING ERRCODE = '22023';
  END IF;
  UPDATE memory_entries SET visibility = p_visibility WHERE id = p_entry;
  DELETE FROM memory_circles WHERE entry_id = p_entry;
  IF p_visibility = 'circles' THEN
    INSERT INTO memory_circles (entry_id, circle, owner_id) SELECT DISTINCT p_entry, x, me FROM unnest(p_circles) AS x;
  END IF;
END $$;
--> statement-breakpoint
-- Records the people I'm connected with chose to show me: current text only (no people,
-- tags, mood, reasons or history), never letters, nothing unless the connection is active.
-- "circles" records reach me when the owner's person entry linked to our connection has one of
-- the chosen relationships. Ordered like my own records, optionally within a date window.
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
REVOKE ALL ON FUNCTION memory_set_audience(uuid, text, text[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION memory_set_audience(uuid, text, text[]) TO mosaic_app;
