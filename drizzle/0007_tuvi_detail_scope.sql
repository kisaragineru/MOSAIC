-- New comparison scope 'tuvi_detail': the whole chart (palaces, stars, Mệnh/Thân, Cục, Đại Hạn).
-- Same consent rules as the other scopes; only the intersection of both people's scopes is used.
CREATE OR REPLACE FUNCTION comparison_give_consent(p_session uuid, p_scopes text[], p_text_version text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; n int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session FOR UPDATE;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status = 'revoked' THEN RAISE EXCEPTION 'revoked' USING ERRCODE = 'P0001'; END IF;
  IF p_scopes IS NULL OR cardinality(p_scopes) = 0
     OR NOT (p_scopes <@ ARRAY['tuvi','tuvi_detail','preferences','values']::text[]) THEN
    RAISE EXCEPTION 'invalid_scopes' USING ERRCODE = '22023';
  END IF;
  UPDATE comparison_consents SET withdrawn_at = now()
   WHERE session_id = p_session AND user_id = me AND withdrawn_at IS NULL;
  INSERT INTO comparison_consents (session_id, user_id, scopes, consent_text_version)
  VALUES (p_session, me, p_scopes, p_text_version);
  -- Scope changed => any stored result is stale.
  DELETE FROM comparison_results WHERE session_id = p_session;
  SELECT count(DISTINCT user_id) INTO n FROM comparison_consents
   WHERE session_id = p_session AND withdrawn_at IS NULL;
  IF n = 2 THEN
    UPDATE comparison_sessions SET status = 'active' WHERE id = p_session;
    RETURN 'active';
  END IF;
  RETURN 'pending';
END $$;
--> statement-breakpoint
-- Both current charts, only when both agreed to 'tuvi_detail'. The server strips the birth
-- date, time and day pillar before anything is stored in the comparison result.
CREATE OR REPLACE FUNCTION comparison_tuvi_details(p_session uuid)
RETURNS TABLE (user_id uuid, chart jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s comparison_sessions%ROWTYPE;
BEGIN
  IF NOT ('tuvi_detail' = ANY (comparison_agreed_scopes(p_session))) THEN RETURN; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  RETURN QUERY
    SELECT c.user_id, c.chart FROM tuvi_charts c WHERE c.is_current AND c.user_id IN (s.user_a, s.user_b);
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION comparison_tuvi_details(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION comparison_tuvi_details(uuid) TO mosaic_app;
