-- The other participant's bio, readable once that participant has consented in this connection
-- (an active, non-withdrawn consent given under a text that mentions the bio) and while the connection has not ended. Opening a QR alone
-- never reveals it: the invite still shows only the display name.
CREATE OR REPLACE FUNCTION connection_bio(p_session uuid)
RETURNS TABLE (user_id uuid, bio text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; other uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status = 'revoked' THEN RETURN; END IF;
  other := CASE WHEN me = s.user_a THEN s.user_b ELSE s.user_a END;
  RETURN QUERY
    SELECT p.user_id, p.bio FROM profiles p
    WHERE p.user_id = other AND p.bio IS NOT NULL AND p.bio <> ''
      AND EXISTS (SELECT 1 FROM comparison_consents c WHERE c.session_id = p_session AND c.user_id = other AND c.withdrawn_at IS NULL
                    -- Consents given before the consent text mentioned the bio do not reveal it.
                    AND c.consent_text_version <> 'consent-2026-10');
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION connection_bio(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION connection_bio(uuid) TO mosaic_app;
