-- Setting a new password with a one-time link. Links last an hour; a new one replaces any
-- earlier unused one; using one signs the account out everywhere.

-- An admin hands a link over (the app checks who is an admin before calling, like admin_users()).
CREATE OR REPLACE FUNCTION reset_issue_admin(p_user uuid, p_token_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF app_current_user_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  DELETE FROM password_resets WHERE user_id = p_user AND used_at IS NULL;
  INSERT INTO password_resets (user_id, token_hash, via, expires_at) VALUES (p_user, p_token_hash, 'admin', now() + interval '1 hour');
END $$;
--> statement-breakpoint

-- "Forgot my password" by email (before signing in). Returns the name and language to write the
-- mail in, or nothing for an unknown address (the page says the same either way).
CREATE OR REPLACE FUNCTION reset_issue_email(p_email text, p_token_hash text) RETURNS TABLE (display_name text, locale text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE u uuid;
BEGIN
  SELECT id INTO u FROM users WHERE lower(email) = lower(p_email) AND email NOT LIKE '%.invalid';
  IF u IS NULL THEN RETURN; END IF;
  DELETE FROM password_resets WHERE user_id = u AND used_at IS NULL;
  INSERT INTO password_resets (user_id, token_hash, via, expires_at) VALUES (u, p_token_hash, 'email', now() + interval '1 hour');
  RETURN QUERY SELECT p.display_name, p.locale FROM profiles p WHERE p.user_id = u;
END $$;
--> statement-breakpoint

-- Is this link still good? (For showing the form; says nothing else.)
CREATE OR REPLACE FUNCTION reset_valid(p_token_hash text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM password_resets WHERE token_hash = p_token_hash AND used_at IS NULL AND expires_at > now());
$$;
--> statement-breakpoint

-- Use it: the new password (already hashed), the link spent, every session ended. Returns the account.
CREATE OR REPLACE FUNCTION reset_use(p_token_hash text, p_password_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r password_resets%ROWTYPE;
BEGIN
  SELECT * INTO r FROM password_resets WHERE token_hash = p_token_hash AND used_at IS NULL AND expires_at > now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reset_invalid' USING ERRCODE = 'P0001'; END IF;
  UPDATE password_resets SET used_at = now() WHERE id = r.id;
  UPDATE users SET password_hash = p_password_hash, password_changed_at = now() WHERE id = r.user_id;
  DELETE FROM sessions WHERE user_id = r.user_id;
  INSERT INTO audit_events (user_id, action) VALUES (r.user_id, 'account.password_reset_' || r.via);
  RETURN r.user_id;
END $$;
--> statement-breakpoint

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['reset_issue_admin(uuid,text)','reset_issue_email(text,text)','reset_valid(text)','reset_use(text,text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
