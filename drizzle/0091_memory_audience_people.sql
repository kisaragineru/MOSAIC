CREATE TABLE "memory_audience_people" (
	"entry_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_audience_people_entry_id_user_id_pk" PRIMARY KEY("entry_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "memory_audience_people" ADD CONSTRAINT "memory_audience_people_entry_id_memory_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."memory_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_audience_people" ADD CONSTRAINT "memory_audience_people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_audience_people" ADD CONSTRAINT "memory_audience_people_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memory_audience_people_user_idx" ON "memory_audience_people" USING btree ("user_id");--> statement-breakpoint
-- Like memory_circles: written only by memory_set_audience(), readable by the record's owner.
GRANT SELECT ON memory_audience_people TO mosaic_app;
--> statement-breakpoint
ALTER TABLE memory_audience_people ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_select ON memory_audience_people FOR SELECT TO mosaic_app USING (owner_id = app_current_user_id());
--> statement-breakpoint

-- "circles" now means chosen relationships and/or chosen people (at least one of either). People
-- must be connected with me now; a connection that ends stops their reading by itself.
CREATE OR REPLACE FUNCTION memory_set_audience(p_entry uuid, p_visibility text, p_circles text[], p_people uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); e memory_entries%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO e FROM memory_entries WHERE id = p_entry FOR UPDATE;
  IF NOT FOUND OR e.user_id <> me THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p_visibility NOT IN ('private','connections','circles') THEN RAISE EXCEPTION 'invalid_audience' USING ERRCODE = '22023'; END IF;
  IF e.kind = 'letter_to_future' AND p_visibility <> 'private' THEN RAISE EXCEPTION 'letters_stay_private' USING ERRCODE = 'P0001'; END IF;
  IF p_visibility = 'circles' THEN
    IF coalesce(cardinality(p_circles), 0) = 0 AND coalesce(cardinality(p_people), 0) = 0 THEN
      RAISE EXCEPTION 'choose_audience' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM unnest(coalesce(p_circles, '{}')) x WHERE x NOT IN ('partner','family','friend','colleague')) THEN
      RAISE EXCEPTION 'choose_audience' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM unnest(coalesce(p_people, '{}')) x
               WHERE NOT EXISTS (SELECT 1 FROM comparison_sessions s WHERE s.status = 'active'
                                   AND ((s.user_a = me AND s.user_b = x) OR (s.user_b = me AND s.user_a = x)))) THEN
      RAISE EXCEPTION 'not_connected' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  UPDATE memory_entries SET visibility = p_visibility WHERE id = p_entry;
  DELETE FROM memory_circles WHERE entry_id = p_entry;
  DELETE FROM memory_audience_people WHERE entry_id = p_entry;
  IF p_visibility = 'circles' THEN
    INSERT INTO memory_circles (entry_id, circle, owner_id) SELECT DISTINCT p_entry, x, me FROM unnest(coalesce(p_circles, '{}')) AS x;
    INSERT INTO memory_audience_people (entry_id, user_id, owner_id) SELECT DISTINCT p_entry, x, me FROM unnest(coalesce(p_people, '{}')) AS x;
  END IF;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_set_audience(uuid, text, text[], uuid[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION memory_set_audience(uuid, text, text[], uuid[]) TO mosaic_app;
--> statement-breakpoint
-- The older form (relationships only) keeps working: no people chosen.
CREATE OR REPLACE FUNCTION memory_set_audience(p_entry uuid, p_visibility text, p_circles text[]) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT memory_set_audience(p_entry, p_visibility, p_circles, '{}'::uuid[])
$$;
--> statement-breakpoint

-- Reading a shared record (and its replies, photos, its card in messages): chosen people too.
CREATE OR REPLACE FUNCTION memory_shared_session(p_entry uuid, p_viewer uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT s.id
  FROM memory_entries e
  JOIN comparison_sessions s ON s.status = 'active'
   AND ((s.user_a = e.user_id AND s.user_b = p_viewer) OR (s.user_b = e.user_id AND s.user_a = p_viewer))
  WHERE e.id = p_entry AND e.user_id <> p_viewer AND e.kind <> 'letter_to_future'
    AND (e.reveal_on IS NULL OR e.reveal_on <= current_date)
    AND (e.visibility = 'connections'
         OR (e.visibility = 'circles' AND (
               EXISTS (SELECT 1 FROM people pe JOIN memory_circles mc ON mc.entry_id = e.id AND mc.circle = pe.relationship
                       WHERE pe.user_id = e.user_id AND pe.connection_session_id = s.id)
               OR EXISTS (SELECT 1 FROM memory_audience_people ap WHERE ap.entry_id = e.id AND ap.user_id = p_viewer))))
  LIMIT 1
$$;
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
             OR (e.visibility = 'circles' AND (
                   EXISTS (SELECT 1 FROM people pe JOIN memory_circles mc ON mc.entry_id = e.id AND mc.circle = pe.relationship
                           WHERE pe.user_id = e.user_id AND pe.connection_session_id = c.sid)
                   OR EXISTS (SELECT 1 FROM memory_audience_people ap WHERE ap.entry_id = e.id AND ap.user_id = me))))
      ORDER BY e.id
    ) x
    WHERE (p_after IS NULL OR x.eff > p_after) AND (p_upto IS NULL OR x.eff <= p_upto)
    ORDER BY x.eff DESC, x.created_at DESC, x.id
    OFFSET greatest(coalesce(p_offset, 0), 0)
    LIMIT least(greatest(coalesce(p_limit, 20), 1), 100);
END $$;
