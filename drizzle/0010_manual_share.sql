CREATE TABLE "manual_shares" (
	"session_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"preset" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manual_shares_session_id_owner_id_pk" PRIMARY KEY("session_id","owner_id"),
	CONSTRAINT "manual_shares_preset_ck" CHECK ("manual_shares"."preset" in ('friend','partner'))
);
--> statement-breakpoint
ALTER TABLE "manual_shares" ADD CONSTRAINT "manual_shares_session_id_comparison_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."comparison_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_shares" ADD CONSTRAINT "manual_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- The owner may read their own rows; every write goes through manual_share_set().
GRANT SELECT ON manual_shares TO mosaic_app;
--> statement-breakpoint
ALTER TABLE manual_shares ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_select ON manual_shares FOR SELECT TO mosaic_app USING (owner_id = app_current_user_id());
--> statement-breakpoint
-- Axes a preset shows. friend: temperament and people; partner: all seventeen.
CREATE OR REPLACE FUNCTION manual_preset_keys(p_preset text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_preset
    WHEN 'friend' THEN ARRAY['social_energy','planning','novelty','calm','pace',
                             'expressiveness','conflict','closeness','care_style','giving']::text[]
    WHEN 'partner' THEN peer_axis_keys()
    ELSE ARRAY[]::text[] END
$$;
--> statement-breakpoint
-- Show (preset) or stop showing (NULL) my manual to the other participant of a connection.
CREATE OR REPLACE FUNCTION manual_share_set(p_session uuid, p_preset text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p_preset IS NULL THEN
    DELETE FROM manual_shares WHERE session_id = p_session AND owner_id = me;
    RETURN;
  END IF;
  IF s.status = 'revoked' THEN RAISE EXCEPTION 'connection_ended' USING ERRCODE = 'P0001'; END IF;
  IF p_preset NOT IN ('friend','partner') THEN RAISE EXCEPTION 'invalid_preset' USING ERRCODE = '22023'; END IF;
  INSERT INTO manual_shares (session_id, owner_id, preset) VALUES (p_session, me, p_preset)
  ON CONFLICT (session_id, owner_id) DO UPDATE SET preset = excluded.preset, updated_at = now();
END $$;
--> statement-breakpoint
-- What the other participant chose to show me, or NULL. Only: their name and bio, the tendencies
-- on the preset's axes that they have not rejected (no notes, no evidence), and their answers to
-- "likes" questions that they marked as shown. Nothing once the connection has ended.
CREATE OR REPLACE FUNCTION manual_shared_with_me(p_session uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; other uuid; ms manual_shares%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status = 'revoked' THEN RETURN NULL; END IF;
  other := CASE WHEN me = s.user_a THEN s.user_b ELSE s.user_a END;
  SELECT * INTO ms FROM manual_shares WHERE session_id = p_session AND owner_id = other;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'preset', ms.preset,
    'updated_at', ms.updated_at,
    'name', (SELECT display_name FROM profiles WHERE user_id = other),
    'bio', (SELECT nullif(btrim(bio), '') FROM profiles WHERE user_id = other),
    'claims', coalesce((
      SELECT jsonb_agg(jsonb_build_object('key', c.claim_key, 'direction', c.direction, 'evidence', c.evidence_count,
                                          'support', c.support_count, 'confidence', c.confidence) ORDER BY c.claim_key)
      FROM tendency_claims c
      WHERE c.user_id = other AND c.is_valid AND c.user_status <> 'rejected'
        AND c.claim_key = ANY (manual_preset_keys(ms.preset))), '[]'::jsonb),
    'likes', coalesce((
      SELECT jsonb_agg(jsonb_build_object('question_id', l.question_id, 'answer', l.answer) ORDER BY l.question_id)
      FROM (SELECT DISTINCT ON (r.question_id) r.question_id, r.answer, r.status, r.privacy
            FROM question_responses r WHERE r.user_id = other
            ORDER BY r.question_id, r.answered_at DESC, r.id DESC) l
      JOIN question_definitions q ON q.id = l.question_id
      WHERE l.status = 'answered' AND l.privacy = 'comparable' AND q.category IN ('food','travel','music','hobbies')), '[]'::jsonb)
  );
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION manual_share_set(uuid, text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION manual_shared_with_me(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION manual_share_set(uuid, text) TO mosaic_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION manual_shared_with_me(uuid) TO mosaic_app;
