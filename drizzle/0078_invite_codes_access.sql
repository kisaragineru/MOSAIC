-- Invite codes belong to their maker. Someone signing up uses one only through these functions:
-- whether it is open (yes or no), and taking it for the new account (once, atomically).
GRANT SELECT, INSERT, UPDATE ON invite_codes TO mosaic_app;
--> statement-breakpoint
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON invite_codes FOR ALL TO mosaic_app USING (owner_id = app_current_user_id()) WITH CHECK (owner_id = app_current_user_id());
--> statement-breakpoint
-- Whether an invite code can still be used (yes or no, nothing else).
CREATE OR REPLACE FUNCTION invite_code_open(p_code text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM invite_codes WHERE code = p_code AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now());
$$;
--> statement-breakpoint
-- The new account (the current user) takes the code: true once, false if it was taken meanwhile.
CREATE OR REPLACE FUNCTION invite_code_use(p_code text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); n int;
BEGIN
  IF me IS NULL THEN RETURN false; END IF;
  UPDATE invite_codes SET used_by = me, used_at = now()
    WHERE code = p_code AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now() AND owner_id <> me;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION invite_code_open(text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION invite_code_use(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION invite_code_open(text) TO mosaic_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION invite_code_use(text) TO mosaic_app;
