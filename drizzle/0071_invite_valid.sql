-- Whether a story link or a QR / share link is open (yes or no, nothing else): someone arriving
-- through one was invited by a real person, so they may sign up without the invite code.
CREATE OR REPLACE FUNCTION invite_valid(p_kind text, p_token_hash text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE p_kind
    WHEN 'work' THEN EXISTS (SELECT 1 FROM work_links WHERE token_hash = p_token_hash AND revoked_at IS NULL AND expires_at > now())
    WHEN 'share' THEN EXISTS (SELECT 1 FROM profile_shares WHERE token_hash = p_token_hash AND revoked_at IS NULL AND expires_at > now() AND (max_uses IS NULL OR use_count < max_uses))
    ELSE false
  END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION invite_valid(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION invite_valid(text, text) TO mosaic_app;
