-- The owner reads and writes their own shared rewrites; the other participant of a connection reads
-- one only through manual_share_rewrite_for_me(), and only once the owner approved it.
GRANT SELECT, INSERT, UPDATE, DELETE ON manual_share_rewrites TO mosaic_app;
--> statement-breakpoint
ALTER TABLE manual_share_rewrites ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON manual_share_rewrites FOR ALL TO mosaic_app USING (owner_id = app_current_user_id()) WITH CHECK (owner_id = app_current_user_id());
--> statement-breakpoint
-- The approved rewrite for the preset the other participant shows me, or NULL. The same checks as
-- manual_shared_with_me(): a participant, the connection not ended, the manual actually shared.
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
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO r FROM manual_share_rewrites WHERE owner_id = other AND preset = ms.preset AND approved;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('locale', r.locale, 'sections', r.sections, 'source_hash', r.source_hash);
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION manual_share_rewrite_for_me(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION manual_share_rewrite_for_me(uuid) TO mosaic_app;
