-- Sign-in with Google or Facebook. A user sees and adds only their own links; finding which user an
-- outside account belongs to (before anyone is signed in) goes through one function.
GRANT SELECT, INSERT, DELETE ON user_identities TO mosaic_app;
--> statement-breakpoint
ALTER TABLE user_identities ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON user_identities FOR ALL TO mosaic_app USING (user_id = app_current_user_id()) WITH CHECK (user_id = app_current_user_id());
--> statement-breakpoint
CREATE OR REPLACE FUNCTION auth_find_identity(p_provider text, p_subject text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT i.user_id FROM user_identities i WHERE i.provider = p_provider AND i.subject = p_subject LIMIT 1
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION auth_find_identity(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION auth_find_identity(text, text) TO mosaic_app;
