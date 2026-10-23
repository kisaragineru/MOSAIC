-- MOSAIC: Row Level Security, grants and SECURITY DEFINER functions.
--
-- Roles (created by scripts/db-bootstrap.sql, NOT here, because role creation needs
-- CREATEROLE and differs per hosting provider):
--   mosaic_owner : owns every object, runs migrations. Never used by the web app.
--   mosaic_app   : runtime role. NOSUPERUSER, NOBYPASSRLS, not the table owner,
--                  so every policy below is enforced on it.
--
-- Request identity is carried in the transaction-local setting `app.user_id`,
-- set by src/server/db/tx.ts (withUser) via set_config(..., true).

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid
$$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Baseline privileges for the runtime role
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO mosaic_app;
GRANT EXECUTE ON FUNCTION app_current_user_id() TO mosaic_app;

-- Read-only catalogs (question bank, categories, rulesets). No personal data.
GRANT SELECT ON question_definitions, question_versions, preference_categories, tuvi_ruleset_versions TO mosaic_app;

-- Owner-scoped tables: full CRUD, filtered by RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  users, profiles, birth_profiles, tuvi_charts, tuvi_interpretations,
  memory_entries, memory_entry_versions, memory_tags, memory_people,
  question_responses, daily_question_assignments,
  preference_items, preference_values,
  tendency_claims, tendency_evidence,
  people, relationship_entries, relationship_events, gift_records, important_dates,
  profile_shares, notification_preferences, data_export_jobs
TO mosaic_app;

GRANT SELECT, INSERT, DELETE ON sessions TO mosaic_app;
GRANT SELECT, INSERT ON audit_events TO mosaic_app;
GRANT USAGE ON SEQUENCE audit_events_id_seq TO mosaic_app;

-- Comparison tables: reads via RLS; state transitions only via functions below.
GRANT SELECT ON comparison_sessions, comparison_consents TO mosaic_app;
GRANT SELECT, INSERT, UPDATE ON comparison_results TO mosaic_app;
-- rate_limit_buckets: no direct access (rate_limit_hit only).
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere personal data lives
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','sessions','profiles','birth_profiles','tuvi_charts','tuvi_interpretations',
    'memory_entries','memory_entry_versions','memory_tags','memory_people',
    'question_responses','daily_question_assignments',
    'preference_items','preference_values','tendency_claims','tendency_evidence',
    'people','relationship_entries','relationship_events','gift_records','important_dates',
    'profile_shares','comparison_sessions','comparison_consents','comparison_results',
    'notification_preferences','data_export_jobs','audit_events','rate_limit_buckets'
  ] LOOP
    -- Not FORCEd: the owner role (used only by migrations and by the narrow SECURITY
    -- DEFINER functions below) bypasses RLS; mosaic_app never owns tables.
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
--> statement-breakpoint

-- Simple "row belongs to the current user" policy for every owner-scoped table.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sessions','profiles','birth_profiles','tuvi_charts','tuvi_interpretations',
    'memory_entries','memory_entry_versions','memory_tags','memory_people',
    'question_responses','daily_question_assignments',
    'preference_items','preference_values','tendency_claims','tendency_evidence',
    'people','relationship_entries','relationship_events','gift_records','important_dates',
    'profile_shares','notification_preferences','data_export_jobs'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY owner_all ON %I FOR ALL TO mosaic_app USING (user_id = app_current_user_id()) WITH CHECK (user_id = app_current_user_id())',
      t);
  END LOOP;
END $$;
--> statement-breakpoint

CREATE POLICY self_all ON users FOR ALL TO mosaic_app
  USING (id = app_current_user_id()) WITH CHECK (id = app_current_user_id());

CREATE POLICY audit_insert ON audit_events FOR INSERT TO mosaic_app
  WITH CHECK (user_id IS NULL OR user_id = app_current_user_id());
CREATE POLICY audit_select ON audit_events FOR SELECT TO mosaic_app
  USING (user_id = app_current_user_id());

CREATE POLICY participant_select ON comparison_sessions FOR SELECT TO mosaic_app
  USING (app_current_user_id() IN (user_a, user_b));

CREATE POLICY participant_select ON comparison_consents FOR SELECT TO mosaic_app
  USING (EXISTS (
    SELECT 1 FROM comparison_sessions s
    WHERE s.id = comparison_consents.session_id
      AND app_current_user_id() IN (s.user_a, s.user_b)));

-- Results: only participants, only while the session is active (revocation hides them
-- immediately even before the row is deleted).
CREATE POLICY participant_rw ON comparison_results FOR ALL TO mosaic_app
  USING (EXISTS (
    SELECT 1 FROM comparison_sessions s
    WHERE s.id = comparison_results.session_id
      AND s.status = 'active'
      AND app_current_user_id() IN (s.user_a, s.user_b)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM comparison_sessions s
    WHERE s.id = comparison_results.session_id
      AND s.status = 'active'
      AND app_current_user_id() IN (s.user_a, s.user_b)));
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER functions (narrow, audited entry points that must see
-- across users). All pin search_path to avoid hijacking.
-- ---------------------------------------------------------------------------

-- Login: the only way to look up a user by email before identity is known.
CREATE OR REPLACE FUNCTION auth_find_user_by_email(p_email text)
RETURNS TABLE (user_id uuid, password_hash text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT u.id, u.password_hash FROM users u WHERE lower(u.email) = lower(p_email) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION auth_email_taken(p_email text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM users u WHERE lower(u.email) = lower(p_email))
$$;

-- Resolve a session cookie (by token hash). Expired sessions are deleted.
CREATE OR REPLACE FUNCTION auth_resolve_session(p_token_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r sessions%ROWTYPE;
BEGIN
  SELECT * INTO r FROM sessions WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF r.expires_at <= now() THEN
    DELETE FROM sessions WHERE id = r.id;
    RETURN NULL;
  END IF;
  IF r.last_seen_at < now() - interval '5 minutes' THEN
    UPDATE sessions SET last_seen_at = now() WHERE id = r.id;
  END IF;
  RETURN r.user_id;
END $$;

-- Fixed-window rate limiter. Returns true if the hit is allowed.
CREATE OR REPLACE FUNCTION rate_limit_hit(p_key text, p_window_seconds int, p_max int) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c int;
BEGIN
  INSERT INTO rate_limit_buckets AS b (key, window_start, count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    window_start = CASE WHEN b.window_start <= now() - make_interval(secs => p_window_seconds) THEN now() ELSE b.window_start END,
    count = CASE WHEN b.window_start <= now() - make_interval(secs => p_window_seconds) THEN 1 ELSE b.count + 1 END
  RETURNING count INTO c;
  RETURN c <= p_max;
END $$;
--> statement-breakpoint

-- Share link lookup. Requires an authenticated caller; reveals only the owner's
-- display name and whether the link is usable.
CREATE OR REPLACE FUNCTION share_lookup(p_token_hash text)
RETURNS TABLE (share_id uuid, owner_id uuid, owner_display_name text, usable boolean, is_own boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT s.id, s.user_id, p.display_name,
           (s.revoked_at IS NULL AND s.expires_at > now() AND (s.max_uses IS NULL OR s.use_count < s.max_uses)),
           s.user_id = me
    FROM profile_shares s JOIN profiles p ON p.user_id = s.user_id
    WHERE s.token_hash = p_token_hash;
END $$;

-- Open (or reuse) a comparison session from a share token. Does NOT grant any data
-- access: the session stays 'pending' until both participants consent.
CREATE OR REPLACE FUNCTION comparison_open(p_token_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); sh profile_shares%ROWTYPE; sid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO sh FROM profile_shares WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND OR sh.revoked_at IS NOT NULL OR sh.expires_at <= now()
     OR (sh.max_uses IS NOT NULL AND sh.use_count >= sh.max_uses) THEN
    RAISE EXCEPTION 'share_unavailable' USING ERRCODE = 'P0001';
  END IF;
  IF sh.user_id = me THEN RAISE EXCEPTION 'own_share' USING ERRCODE = 'P0001'; END IF;
  SELECT id INTO sid FROM comparison_sessions
   WHERE status <> 'revoked'
     AND ((user_a = sh.user_id AND user_b = me) OR (user_a = me AND user_b = sh.user_id))
   LIMIT 1;
  IF sid IS NOT NULL THEN RETURN sid; END IF;
  INSERT INTO comparison_sessions (share_id, user_a, user_b) VALUES (sh.id, sh.user_id, me) RETURNING id INTO sid;
  UPDATE profile_shares SET use_count = use_count + 1 WHERE id = sh.id;
  RETURN sid;
END $$;

-- Record (or replace) the caller's consent. Activates the session when both consented.
CREATE OR REPLACE FUNCTION comparison_give_consent(p_session uuid, p_scopes text[], p_text_version text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; n int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session FOR UPDATE;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status = 'revoked' THEN RAISE EXCEPTION 'revoked' USING ERRCODE = 'P0001'; END IF;
  IF p_scopes IS NULL OR cardinality(p_scopes) = 0
     OR NOT (p_scopes <@ ARRAY['tuvi','preferences','values']::text[]) THEN
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

-- End a comparison: either participant may do this at any time.
CREATE OR REPLACE FUNCTION comparison_revoke(p_session uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session FOR UPDATE;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status = 'revoked' THEN RETURN; END IF;
  UPDATE comparison_sessions SET status = 'revoked', revoked_at = now(), revoked_by = me WHERE id = p_session;
  UPDATE comparison_consents SET withdrawn_at = now() WHERE session_id = p_session AND withdrawn_at IS NULL;
  DELETE FROM comparison_results WHERE session_id = p_session;
END $$;

-- Revoke a share link and every comparison that was opened through it.
CREATE OR REPLACE FUNCTION share_revoke(p_share uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); sid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE profile_shares SET revoked_at = coalesce(revoked_at, now()) WHERE id = p_share AND user_id = me;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  FOR sid IN SELECT id FROM comparison_sessions WHERE share_id = p_share AND status <> 'revoked' LOOP
    UPDATE comparison_sessions SET status = 'revoked', revoked_at = now(), revoked_by = me WHERE id = sid;
    UPDATE comparison_consents SET withdrawn_at = now() WHERE session_id = sid AND withdrawn_at IS NULL;
    DELETE FROM comparison_results WHERE session_id = sid;
  END LOOP;
END $$;
--> statement-breakpoint

-- Scopes both participants agreed to (intersection) for an ACTIVE session the caller is part of.
CREATE OR REPLACE FUNCTION comparison_agreed_scopes(p_session uuid) RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE; a text[]; b text[];
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.status <> 'active' THEN RETURN ARRAY[]::text[]; END IF;
  SELECT scopes INTO a FROM comparison_consents WHERE session_id = p_session AND user_id = s.user_a AND withdrawn_at IS NULL;
  SELECT scopes INTO b FROM comparison_consents WHERE session_id = p_session AND user_id = s.user_b AND withdrawn_at IS NULL;
  IF a IS NULL OR b IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  RETURN ARRAY(SELECT unnest(a) INTERSECT SELECT unnest(b) ORDER BY 1);
END $$;

CREATE OR REPLACE FUNCTION comparison_participants(p_session uuid)
RETURNS TABLE (user_id uuid, display_name text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); s comparison_sessions%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  IF NOT FOUND OR me NOT IN (s.user_a, s.user_b) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  RETURN QUERY
    SELECT p.user_id, p.display_name, CASE WHEN p.user_id = s.user_a THEN 'a' ELSE 'b' END
    FROM profiles p WHERE p.user_id IN (s.user_a, s.user_b);
END $$;

-- Derived Tử Vi summaries (never birth date/time) when both agreed to 'tuvi'.
CREATE OR REPLACE FUNCTION comparison_tuvi_summaries(p_session uuid)
RETURNS TABLE (user_id uuid, year_stem smallint, year_branch smallint, nap_am_element text, menh_branch smallint, cuc_number smallint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s comparison_sessions%ROWTYPE;
BEGIN
  IF NOT ('tuvi' = ANY (comparison_agreed_scopes(p_session))) THEN RETURN; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  RETURN QUERY
    SELECT c.user_id, c.year_stem, c.year_branch, c.nap_am_element, c.menh_branch, c.cuc_number
    FROM tuvi_charts c WHERE c.is_current AND c.user_id IN (s.user_a, s.user_b);
END $$;

-- Latest answered response per comparable question, only where the respondent marked
-- the answer 'comparable' and the question's scope was agreed by both.
CREATE OR REPLACE FUNCTION comparison_responses(p_session uuid)
RETURNS TABLE (user_id uuid, question_id text, question_version int, answer jsonb, scope text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s comparison_sessions%ROWTYPE; agreed text[];
BEGIN
  agreed := comparison_agreed_scopes(p_session);
  IF cardinality(agreed) = 0 THEN RETURN; END IF;
  SELECT * INTO s FROM comparison_sessions WHERE id = p_session;
  RETURN QUERY
    WITH latest AS (
      SELECT DISTINCT ON (r.user_id, r.question_id) r.*
      FROM question_responses r
      WHERE r.user_id IN (s.user_a, s.user_b)
      ORDER BY r.user_id, r.question_id, r.answered_at DESC, r.id DESC
    )
    SELECT l.user_id, l.question_id, l.question_version, l.answer,
           CASE WHEN q.category = 'values' THEN 'values' ELSE 'preferences' END
    FROM latest l JOIN question_definitions q ON q.id = l.question_id
    WHERE l.status = 'answered' AND l.privacy = 'comparable' AND q.comparable
      AND (CASE WHEN q.category = 'values' THEN 'values' ELSE 'preferences' END) = ANY (agreed);
END $$;
--> statement-breakpoint

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'auth_find_user_by_email(text)','auth_email_taken(text)','auth_resolve_session(text)',
    'rate_limit_hit(text,int,int)','share_lookup(text)','comparison_open(text)',
    'comparison_give_consent(uuid,text[],text)','comparison_revoke(uuid)','share_revoke(uuid)',
    'comparison_agreed_scopes(uuid)','comparison_participants(uuid)',
    'comparison_tuvi_summaries(uuid)','comparison_responses(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
