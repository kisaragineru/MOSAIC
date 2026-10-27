-- Connecting no longer needs something to compare: agreeing with nothing chosen connects you.
CREATE OR REPLACE FUNCTION comparison_give_consent(p_session uuid, p_scopes text[], p_text_version text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; n int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session FOR UPDATE;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status = 'revoked' THEN RAISE EXCEPTION 'revoked' USING ERRCODE = 'P0001'; END IF;
  -- An empty choice is allowed: connected, with nothing compared yet (each can choose later).
  IF p_scopes IS NULL OR NOT (p_scopes <@ ARRAY['tuvi','tuvi_detail','preferences','values']::text[]) THEN
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
