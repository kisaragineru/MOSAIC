-- The calling card (what every connection sees from the start), and the bio and manual following it.
CREATE OR REPLACE FUNCTION connection_bio(p_session uuid)
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
      AND (CASE WHEN p.card_items IS NULL
            -- Not decided yet (accounts from before the card): as before, once they consented with the bio.
            THEN EXISTS (SELECT 1 FROM comparison_consents c WHERE c.session_id = p_session AND c.user_id = other AND c.withdrawn_at IS NULL
                           AND c.consent_text_version <> 'consent-2026-10')
            -- Shown once they agreed to connect (also while the other is still deciding).
            ELSE 'bio' = ANY (p.card_items) AND EXISTS (SELECT 1 FROM comparison_consents c WHERE c.session_id = p_session AND c.user_id = other AND c.withdrawn_at IS NULL) END);
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION manual_shared_with_me(p_session uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; other uuid; ms manual_shares%ROWTYPE; card text[]; parts text[];
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status = 'revoked' THEN RETURN NULL; END IF;
  other := CASE WHEN me = s.user_a THEN s.user_b ELSE s.user_a END;
  SELECT * INTO ms FROM manual_shares WHERE session_id = p_session AND owner_id = other;
  IF NOT FOUND THEN
    -- Not shared with me in particular: what their calling card shows every connection, if anything.
    IF s.status <> 'active' THEN RETURN NULL; END IF;
    SELECT card_items INTO card FROM profiles WHERE user_id = other;
    IF 'manual' = ANY (card) THEN parts := NULL;
    ELSIF card && ARRAY['summary','likes']::text[] THEN parts := ARRAY(SELECT unnest(card) INTERSECT SELECT unnest(ARRAY['summary','likes']));
    ELSE RETURN NULL; END IF;
    ms.preset := 'friend'; ms.updated_at := now();
  END IF;
  RETURN jsonb_build_object(
    'preset', ms.preset,
    'parts', to_jsonb(parts),
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
--> statement-breakpoint
-- The calling card: what one connection shows every connection from the start, for the page about
-- them. The chart goes only to the server, to find the type (it is never shown whole).
CREATE OR REPLACE FUNCTION connection_card(p_session uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; other uuid; p profiles%ROWTYPE; items text[];
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status <> 'active' THEN RETURN NULL; END IF;
  other := CASE WHEN me = s.user_a THEN s.user_b ELSE s.user_a END;
  SELECT * INTO p FROM profiles WHERE user_id = other;
  items := coalesce(p.card_items, ARRAY[]::text[]);
  RETURN jsonb_build_object(
    'items', to_jsonb(items),
    'chart', CASE WHEN 'type' = ANY (items) THEN (SELECT c.chart FROM tuvi_charts c WHERE c.user_id = other AND c.is_current LIMIT 1) END,
    'self_types', CASE WHEN 'type' = ANY (items) THEN to_jsonb(p.self_types) END
  );
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION connection_card(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION connection_card(uuid) TO mosaic_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION manual_share_rewrite_for_me(p_session uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; other uuid; ms manual_shares%ROWTYPE; r manual_share_rewrites%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status = 'revoked' THEN RETURN NULL; END IF;
  other := CASE WHEN me = s.user_a THEN s.user_b ELSE s.user_a END;
  SELECT * INTO ms FROM manual_shares WHERE session_id = p_session AND owner_id = other;
  IF NOT FOUND THEN
    -- Their whole friend manual on the calling card: its approved rewrite goes with it.
    IF s.status = 'active' AND EXISTS (SELECT 1 FROM profiles WHERE user_id = other AND 'manual' = ANY (card_items)) THEN ms.preset := 'friend';
    ELSE RETURN NULL; END IF;
  END IF;
  SELECT * INTO r FROM manual_share_rewrites WHERE owner_id = other AND preset = ms.preset AND approved;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('locale', r.locale, 'sections', r.sections, 'source_hash', r.source_hash);
END $$;
