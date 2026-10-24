ALTER TABLE "profiles" ADD COLUMN "intro" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "intro_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "intro_pieces" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_intro_ck" CHECK ("profiles"."intro" is null or char_length("profiles"."intro") <= 2000);
--> statement-breakpoint
-- The other participant's bio and approved intro, under the same rule as before (0006).
DROP FUNCTION IF EXISTS connection_bio(uuid);
--> statement-breakpoint
CREATE FUNCTION connection_bio(p_session uuid)
RETURNS TABLE (user_id uuid, bio text, intro text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; other uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status = 'revoked' THEN RETURN; END IF;
  other := CASE WHEN me = s.user_a THEN s.user_b ELSE s.user_a END;
  RETURN QUERY
    SELECT p.user_id, nullif(btrim(p.bio), ''), nullif(btrim(p.intro), '') FROM profiles p
    WHERE p.user_id = other AND (nullif(btrim(p.bio), '') IS NOT NULL OR nullif(btrim(p.intro), '') IS NOT NULL)
      AND EXISTS (SELECT 1 FROM comparison_consents c WHERE c.session_id = p_session AND c.user_id = other AND c.withdrawn_at IS NULL
                    AND c.consent_text_version <> 'consent-2026-10');
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION connection_bio(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION connection_bio(uuid) TO mosaic_app;
--> statement-breakpoint
-- The shared manual carries the approved intro too.
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
    'intro', (SELECT nullif(btrim(intro), '') FROM profiles WHERE user_id = other),
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

