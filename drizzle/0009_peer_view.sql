CREATE TABLE "peer_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"responder_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone,
	CONSTRAINT "peer_requests_status_ck" CHECK ("peer_requests"."status" in ('pending','answered','declined','cancelled','withdrawn')),
	CONSTRAINT "peer_requests_not_self_ck" CHECK ("peer_requests"."owner_id" <> "peer_requests"."responder_id")
);
--> statement-breakpoint
CREATE TABLE "peer_responses" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"anonymous" boolean NOT NULL,
	"answers" jsonb NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "peer_responses_comment_ck" CHECK ("peer_responses"."comment" is null or char_length("peer_responses"."comment") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "peer_requests" ADD CONSTRAINT "peer_requests_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_requests" ADD CONSTRAINT "peer_requests_responder_id_users_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_requests" ADD CONSTRAINT "peer_requests_session_id_comparison_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."comparison_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_responses" ADD CONSTRAINT "peer_responses_request_id_peer_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."peer_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "peer_requests_owner_idx" ON "peer_requests" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "peer_requests_responder_idx" ON "peer_requests" USING btree ("responder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "peer_requests_one_pending_uq" ON "peer_requests" USING btree ("owner_id","responder_id") WHERE "peer_requests"."status" = 'pending';--> statement-breakpoint
-- No direct access for the app role: every read and write goes through the functions below.
ALTER TABLE peer_requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE peer_responses ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION peer_axis_keys() RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY['social_energy','planning','novelty','calm','pace','decision_style','risk','independence','detail',
               'expressiveness','conflict','closeness','care_style','giving','saving','ambition','tradition']::text[]
$$;
--> statement-breakpoint
-- Ask the other participant of a (not ended) connection. Reuses a pending request.
CREATE OR REPLACE FUNCTION peer_request_create(p_session uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; other uuid; rid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status = 'revoked' THEN RAISE EXCEPTION 'connection_ended' USING ERRCODE = 'P0001'; END IF;
  other := CASE WHEN me = s.user_a THEN s.user_b ELSE s.user_a END;
  SELECT id INTO rid FROM peer_requests WHERE owner_id = me AND responder_id = other AND status = 'pending';
  IF FOUND THEN RETURN rid; END IF;
  INSERT INTO peer_requests (owner_id, responder_id, session_id) VALUES (me, other, p_session) RETURNING id INTO rid;
  RETURN rid;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION peer_request_answer(p_request uuid, p_anonymous boolean, p_answers jsonb, p_comment text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); r peer_requests%ROWTYPE; st text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM peer_requests WHERE id = p_request FOR UPDATE;
  IF NOT FOUND OR r.responder_id <> me THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  SELECT status INTO st FROM comparison_sessions WHERE id = r.session_id;
  IF st = 'revoked' THEN RAISE EXCEPTION 'connection_ended' USING ERRCODE = 'P0001'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'not_pending' USING ERRCODE = 'P0001'; END IF;
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object'
     OR NOT EXISTS (SELECT 1 FROM jsonb_each(p_answers))
     OR EXISTS (SELECT 1 FROM jsonb_each(p_answers) e
                WHERE NOT (e.key = ANY (peer_axis_keys())) OR e.value::text NOT IN ('1','0','-1')) THEN
    RAISE EXCEPTION 'invalid_answers' USING ERRCODE = '22023';
  END IF;
  INSERT INTO peer_responses (request_id, anonymous, answers, comment)
  VALUES (p_request, coalesce(p_anonymous, true), p_answers, nullif(btrim(p_comment), ''));
  UPDATE peer_requests SET status = 'answered', answered_at = now() WHERE id = p_request;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION peer_request_decline(p_request uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE peer_requests SET status = 'declined' WHERE id = p_request AND responder_id = me AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION peer_request_cancel(p_request uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE peer_requests SET status = 'cancelled' WHERE id = p_request AND owner_id = me AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
END $$;
--> statement-breakpoint
-- The responder can take back what they said at any time.
CREATE OR REPLACE FUNCTION peer_response_withdraw(p_request uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE peer_requests SET status = 'withdrawn' WHERE id = p_request AND responder_id = me AND status = 'answered';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  DELETE FROM peer_responses WHERE request_id = p_request;
END $$;
--> statement-breakpoint
-- Requests I made (role owner) and requests made to me (role responder). The owner is not told
-- whether a responder chose to stay anonymous.
CREATE OR REPLACE FUNCTION peer_requests_mine()
RETURNS TABLE (id uuid, role text, other_id uuid, other_name text, session_id uuid, status text,
               created_at timestamptz, answered_at timestamptz, anonymous boolean, comment text, answers jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT r.id, 'owner'::text, r.responder_id, p.display_name, r.session_id,
           CASE WHEN r.status = 'pending' AND s.status = 'revoked' THEN 'cancelled' ELSE r.status END,
           r.created_at, r.answered_at, NULL::boolean, NULL::text, NULL::jsonb
    FROM peer_requests r JOIN profiles p ON p.user_id = r.responder_id JOIN comparison_sessions s ON s.id = r.session_id
    WHERE r.owner_id = me
    UNION ALL
    SELECT r.id, 'responder'::text, r.owner_id, p.display_name, r.session_id,
           CASE WHEN r.status = 'pending' AND s.status = 'revoked' THEN 'cancelled' ELSE r.status END,
           r.created_at, r.answered_at, x.anonymous, x.comment, x.answers
    FROM peer_requests r JOIN profiles p ON p.user_id = r.owner_id JOIN comparison_sessions s ON s.id = r.session_id
    LEFT JOIN peer_responses x ON x.request_id = r.id
    WHERE r.responder_id = me;
END $$;
--> statement-breakpoint
-- What others said about me. Each responder counts once (their latest answer). Named answers come
-- one by one; anonymous ones only as per-axis counts plus unordered comments, and only when at
-- least three anonymous answers exist — otherwise just how many are waiting.
CREATE OR REPLACE FUNCTION peer_results()
RETURNS TABLE (kind text, responder_name text, answers jsonb, comment text, answered_at timestamptz, n int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); anon_n int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    WITH latest AS (
      SELECT DISTINCT ON (r.responder_id) r.responder_id, r.id AS request_id, x.anonymous, x.answers, x.comment, r.answered_at
      FROM peer_requests r JOIN peer_responses x ON x.request_id = r.id
      WHERE r.owner_id = me AND r.status = 'answered'
      ORDER BY r.responder_id, r.answered_at DESC
    )
    SELECT 'named'::text, p.display_name, l.answers, l.comment, l.answered_at, 1
    FROM latest l JOIN profiles p ON p.user_id = l.responder_id
    WHERE NOT l.anonymous;
  SELECT count(*) INTO anon_n FROM (
    SELECT DISTINCT ON (r.responder_id) x.anonymous
    FROM peer_requests r JOIN peer_responses x ON x.request_id = r.id
    WHERE r.owner_id = me AND r.status = 'answered'
    ORDER BY r.responder_id, r.answered_at DESC
  ) l WHERE l.anonymous;
  IF anon_n >= 3 THEN
    RETURN QUERY
      WITH latest AS (
        SELECT DISTINCT ON (r.responder_id) r.id AS request_id, x.anonymous, x.answers, x.comment
        FROM peer_requests r JOIN peer_responses x ON x.request_id = r.id
        WHERE r.owner_id = me AND r.status = 'answered'
        ORDER BY r.responder_id, r.answered_at DESC
      ), anon AS (SELECT * FROM latest WHERE anonymous)
      SELECT 'anon_summary'::text, NULL::text,
             (SELECT jsonb_object_agg(q.k, jsonb_build_array(q.pos, q.neu, q.neg)) FROM (
                SELECT e.key AS k,
                       count(*) FILTER (WHERE e.value::text = '1')::int AS pos,
                       count(*) FILTER (WHERE e.value::text = '0')::int AS neu,
                       count(*) FILTER (WHERE e.value::text = '-1')::int AS neg
                FROM anon a, jsonb_each(a.answers) e GROUP BY e.key) q),
             NULL::text, NULL::timestamptz, anon_n
      UNION ALL
      SELECT 'anon_comment'::text, NULL::text, NULL::jsonb, a.comment, NULL::timestamptz, 1
      FROM (SELECT a.comment, a.request_id FROM anon a WHERE a.comment IS NOT NULL ORDER BY md5(a.request_id::text)) a;
  ELSIF anon_n > 0 THEN
    RETURN QUERY SELECT 'anon_pending'::text, NULL::text, NULL::jsonb, NULL::text, NULL::timestamptz, anon_n;
  END IF;
END $$;
--> statement-breakpoint
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'peer_request_create(uuid)','peer_request_answer(uuid,boolean,jsonb,text)','peer_request_decline(uuid)',
    'peer_request_cancel(uuid)','peer_response_withdraw(uuid)','peer_requests_mine()','peer_results()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
