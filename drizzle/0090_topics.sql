CREATE TABLE "topic_answers" (
	"prompt_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_answers_prompt_id_user_id_pk" PRIMARY KEY("prompt_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "topic_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"from_user" uuid NOT NULL,
	"to_user" uuid NOT NULL,
	"prompt" text NOT NULL,
	"preset" text,
	"tag" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "topic_prompts_status_ck" CHECK ("topic_prompts"."status" in ('open','answered','passed','canceled')),
	CONSTRAINT "topic_prompts_prompt_ck" CHECK (char_length("topic_prompts"."prompt") between 1 and 80),
	CONSTRAINT "topic_prompts_tag_ck" CHECK (char_length("topic_prompts"."tag") between 1 and 40)
);
--> statement-breakpoint
ALTER TABLE "topic_answers" ADD CONSTRAINT "topic_answers_prompt_id_topic_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."topic_prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_answers" ADD CONSTRAINT "topic_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_answers" ADD CONSTRAINT "topic_answers_entry_id_memory_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."memory_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_prompts" ADD CONSTRAINT "topic_prompts_session_id_comparison_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."comparison_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_prompts" ADD CONSTRAINT "topic_prompts_from_user_users_id_fk" FOREIGN KEY ("from_user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_prompts" ADD CONSTRAINT "topic_prompts_to_user_users_id_fk" FOREIGN KEY ("to_user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "topic_prompts_to_idx" ON "topic_prompts" USING btree ("to_user","status");--> statement-breakpoint
CREATE INDEX "topic_prompts_session_idx" ON "topic_prompts" USING btree ("session_id");--> statement-breakpoint
-- Topics are reached only through these functions (no table access for the app): the other
-- person's answer is read only once both have answered.
ALTER TABLE topic_prompts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE topic_answers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- The other participant of an active connection I'm in, or an error.
CREATE OR REPLACE FUNCTION topic_other(p_session uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status <> 'active' THEN RAISE EXCEPTION 'not_connected' USING ERRCODE = 'P0001'; END IF;
  RETURN CASE WHEN s.user_a = me THEN s.user_b ELSE s.user_a END;
END $$;
--> statement-breakpoint

-- Send a topic with my own answer (a record of mine). At most 3 waiting for the same person.
CREATE OR REPLACE FUNCTION topic_send(p_session uuid, p_prompt text, p_preset text, p_tag text, p_entry uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); other uuid; new_id uuid;
BEGIN
  other := topic_other(p_session);
  IF NOT EXISTS (SELECT 1 FROM memory_entries WHERE id = p_entry AND user_id = me) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF (SELECT count(*) FROM topic_prompts WHERE from_user = me AND to_user = other AND status = 'open') >= 3 THEN
    RAISE EXCEPTION 'topic_limit' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO topic_prompts (session_id, from_user, to_user, prompt, preset, tag)
  VALUES (p_session, me, other, btrim(p_prompt), p_preset, p_tag) RETURNING id INTO new_id;
  INSERT INTO topic_answers (prompt_id, user_id, entry_id) VALUES (new_id, me, p_entry);
  RETURN new_id;
END $$;
--> statement-breakpoint

-- Answer a topic sent to me (with a record of mine): both have answered now.
CREATE OR REPLACE FUNCTION topic_answer(p_prompt uuid, p_entry uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); p topic_prompts%ROWTYPE;
BEGIN
  SELECT * INTO p FROM topic_prompts WHERE id = p_prompt AND to_user = me FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  PERFORM topic_other(p.session_id);
  IF p.status <> 'open' THEN RAISE EXCEPTION 'topic_closed' USING ERRCODE = 'P0001'; END IF;
  IF NOT EXISTS (SELECT 1 FROM memory_entries WHERE id = p_entry AND user_id = me) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO topic_answers (prompt_id, user_id, entry_id) VALUES (p_prompt, me, p_entry);
  UPDATE topic_prompts SET status = 'answered', closed_at = now() WHERE id = p_prompt;
END $$;
--> statement-breakpoint

-- Pass on a topic sent to me, or take back one I sent that isn't answered yet.
CREATE OR REPLACE FUNCTION topic_close(p_prompt uuid, p_how text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); n int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF p_how = 'passed' THEN
    UPDATE topic_prompts SET status = 'passed', closed_at = now() WHERE id = p_prompt AND to_user = me AND status = 'open';
  ELSIF p_how = 'canceled' THEN
    UPDATE topic_prompts SET status = 'canceled', closed_at = now() WHERE id = p_prompt AND from_user = me AND status = 'open';
  ELSE
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
END $$;
--> statement-breakpoint

-- Our topics, newest first. My answer always; theirs only once both have answered (and while
-- their record exists). Taken-back topics are left out.
CREATE OR REPLACE FUNCTION topic_list(p_session uuid)
RETURNS TABLE (id uuid, sent boolean, prompt text, preset text, tag text, status text, created_at timestamptz, closed_at timestamptz,
               my_entry uuid, my_body text, their_answered boolean, their_body text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  PERFORM topic_other(p_session);
  RETURN QUERY
  SELECT p.id, p.from_user = me, p.prompt, p.preset, p.tag, p.status, p.created_at, p.closed_at,
         ma.entry_id, mv.body,
         ta.entry_id IS NOT NULL AND tv.body IS NOT NULL,
         CASE WHEN p.status = 'answered' THEN tv.body END
    FROM topic_prompts p
    LEFT JOIN topic_answers ma ON ma.prompt_id = p.id AND ma.user_id = me
    LEFT JOIN memory_entries me_e ON me_e.id = ma.entry_id
    LEFT JOIN memory_entry_versions mv ON mv.entry_id = me_e.id AND mv.version = me_e.current_version
    LEFT JOIN topic_answers ta ON ta.prompt_id = p.id AND ta.user_id <> me
    LEFT JOIN memory_entries te ON te.id = ta.entry_id
    LEFT JOIN memory_entry_versions tv ON tv.entry_id = te.id AND tv.version = te.current_version
   WHERE p.session_id = p_session AND p.status <> 'canceled'
   ORDER BY coalesce(p.closed_at, p.created_at) DESC;
END $$;
--> statement-breakpoint

-- For home: topics waiting for my answer, and my topics answered in the last two weeks.
CREATE OR REPLACE FUNCTION topic_inbox()
RETURNS TABLE (id uuid, kind text, session_id uuid, other_name text, prompt text, preset text, at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id, CASE WHEN p.status = 'open' THEN 'received' ELSE 'matched' END, p.session_id, op.display_name, p.prompt, p.preset, coalesce(p.closed_at, p.created_at)
    FROM topic_prompts p
    JOIN comparison_sessions s ON s.id = p.session_id AND s.status = 'active'
    JOIN profiles op ON op.user_id = CASE WHEN p.from_user = me THEN p.to_user ELSE p.from_user END
   WHERE (p.status = 'open' AND p.to_user = me)
      OR (p.status = 'answered' AND (p.from_user = me OR p.to_user = me) AND p.closed_at > now() - interval '14 days')
   ORDER BY 7 DESC;
END $$;
--> statement-breakpoint

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['topic_send(uuid,text,text,text,uuid)', 'topic_answer(uuid,uuid)', 'topic_close(uuid,text)', 'topic_list(uuid)', 'topic_inbox()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
  EXECUTE 'REVOKE ALL ON FUNCTION topic_other(uuid) FROM PUBLIC';
END $$;
