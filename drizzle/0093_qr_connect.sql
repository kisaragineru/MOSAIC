CREATE TABLE "connection_asks" (
	"session_id" uuid NOT NULL,
	"from_user" uuid NOT NULL,
	"to_user" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connection_asks_session_id_from_user_kind_pk" PRIMARY KEY("session_id","from_user","kind"),
	CONSTRAINT "connection_asks_kind_ck" CHECK ("connection_asks"."kind" in ('tuvi'))
);
--> statement-breakpoint
ALTER TABLE "profile_shares" ADD COLUMN "connect_scopes" text[];--> statement-breakpoint
ALTER TABLE "profile_shares" ADD COLUMN "connect_text_version" text;--> statement-breakpoint
ALTER TABLE "connection_asks" ADD CONSTRAINT "connection_asks_session_id_comparison_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."comparison_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_asks" ADD CONSTRAINT "connection_asks_from_user_users_id_fk" FOREIGN KEY ("from_user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_asks" ADD CONSTRAINT "connection_asks_to_user_users_id_fk" FOREIGN KEY ("to_user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connection_asks_to_idx" ON "connection_asks" USING btree ("to_user");--> statement-breakpoint
-- Asks are read and written only through the functions below.
ALTER TABLE connection_asks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Opening someone's QR: as before, plus — for a QR made to be shown in person (connect_scopes
-- set) — its owner's yes, given by showing it, with what they chose to show.
CREATE OR REPLACE FUNCTION comparison_open(p_token_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); sh profile_shares%ROWTYPE; sid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO sh FROM profile_shares WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND OR sh.revoked_at IS NOT NULL OR sh.expires_at <= now()
     OR (sh.max_uses IS NOT NULL AND sh.use_count >= sh.max_uses) THEN
    RAISE EXCEPTION 'share_unavailable' USING ERRCODE = 'P0001';
  END IF;
  IF sh.user_id = me THEN RAISE EXCEPTION 'own_share' USING ERRCODE = 'P0001'; END IF;
  SELECT id INTO sid FROM comparison_sessions
   WHERE status <> 'revoked'
     AND ((user_a = sh.user_id AND user_b = me) OR (user_a = me AND user_b = sh.user_id))
   LIMIT 1;
  IF sid IS NULL THEN
    INSERT INTO comparison_sessions (share_id, user_a, user_b) VALUES (sh.id, sh.user_id, me) RETURNING id INTO sid;
    UPDATE profile_shares SET use_count = use_count + 1 WHERE id = sh.id;
  END IF;
  IF sh.connect_scopes IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM comparison_consents WHERE session_id = sid AND user_id = sh.user_id AND withdrawn_at IS NULL
  ) THEN
    INSERT INTO comparison_consents (session_id, user_id, scopes, consent_text_version)
    VALUES (sid, sh.user_id, sh.connect_scopes, coalesce(sh.connect_text_version, 'qr'));
  END IF;
  RETURN sid;
END $$;
--> statement-breakpoint
-- Ask the other person once (now: to show their Tử Vi). False when already asked.
CREATE OR REPLACE FUNCTION connection_ask(p_session uuid, p_kind text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; other uuid; n int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status <> 'active' THEN RAISE EXCEPTION 'connection_ended' USING ERRCODE = 'P0001'; END IF;
  IF p_kind NOT IN ('tuvi') THEN RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023'; END IF;
  other := CASE WHEN s.user_a = me THEN s.user_b ELSE s.user_a END;
  INSERT INTO connection_asks (session_id, from_user, to_user, kind) VALUES (p_session, me, other, p_kind)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;
--> statement-breakpoint
-- Asks I sent or received on active connections, with whether the asked-for thing is shown yet.
CREATE OR REPLACE FUNCTION connection_asks_mine()
RETURNS TABLE (session_id uuid, from_me boolean, kind text, created_at timestamptz, other_name text, done boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT a.session_id, a.from_user = app_current_user_id(), a.kind, a.created_at,
         coalesce(p.display_name, ''),
         EXISTS (SELECT 1 FROM comparison_consents c WHERE c.session_id = a.session_id AND c.user_id = a.to_user
                   AND c.withdrawn_at IS NULL AND 'tuvi' = ANY (c.scopes))
    FROM connection_asks a
    JOIN comparison_sessions s ON s.id = a.session_id AND s.status = 'active'
    LEFT JOIN profiles p ON p.user_id = CASE WHEN a.from_user = app_current_user_id() THEN a.to_user ELSE a.from_user END
   WHERE app_current_user_id() IN (a.from_user, a.to_user)
$$;
--> statement-breakpoint
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['connection_ask(uuid,text)', 'connection_asks_mine()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
