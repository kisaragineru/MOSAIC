-- The admins' list of users and their beta testers. Like admin_stats(), the app checks who is an
-- admin (ADMIN_EMAILS) before calling these; they show who someone is and how much they use
-- MOSAIC, never anything they wrote.
CREATE OR REPLACE FUNCTION admin_users() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb) FROM (
    SELECT jsonb_build_object(
      'id', u.id,
      'name', p.display_name,
      'email', u.email,
      'created_at', u.created_at,
      'last_seen', (SELECT max(s.last_seen_at) FROM sessions s WHERE s.user_id = u.id),
      'records', (SELECT count(*) FROM memory_entries m WHERE m.user_id = u.id),
      'connections', (SELECT count(*) FROM comparison_sessions c WHERE c.status = 'active' AND (c.user_a = u.id OR c.user_b = u.id)),
      'beta', EXISTS (SELECT 1 FROM beta_testers b WHERE b.user_id = u.id),
      'test', u.email LIKE '%@companion.invalid' OR u.email LIKE '%@trial.mosaic.invalid'
    ) AS x
    FROM users u LEFT JOIN profiles p ON p.user_id = u.id
  ) t;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION admin_users() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION admin_users() TO mosaic_app;
--> statement-breakpoint

-- Make someone a beta tester (or not). Every beta tester is in the beta testers' group, which is
-- made on first use with the admin who chose them as its owner; the admin acting is kept in it.
CREATE OR REPLACE FUNCTION admin_set_beta(p_user uuid, p_on boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); cid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  SELECT id INTO cid FROM dm_conversations WHERE system_key = 'beta';
  IF cid IS NULL THEN
    INSERT INTO dm_conversations (kind, title, created_by, system_key) VALUES ('group', 'MOSAIC β', me, 'beta') RETURNING id INTO cid;
    INSERT INTO dm_members (conversation_id, user_id, role) VALUES (cid, me, 'owner');
    PERFORM dm_system(cid, jsonb_build_object('event', 'created', 'by', me));
  ELSIF NOT EXISTS (SELECT 1 FROM dm_members WHERE conversation_id = cid AND user_id = me AND left_at IS NULL) AND (p_on OR p_user <> me) THEN
    INSERT INTO dm_members (conversation_id, user_id, role) VALUES (cid, me, 'owner')
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET left_at = NULL, joined_at = now(), hidden_before = NULL, last_read_at = NULL, role = 'owner';
    PERFORM dm_system(cid, jsonb_build_object('event', 'added', 'by', me, 'users', jsonb_build_array(me)));
  END IF;
  IF p_on THEN
    INSERT INTO beta_testers (user_id, added_by) VALUES (p_user, me) ON CONFLICT (user_id) DO NOTHING;
    IF NOT EXISTS (SELECT 1 FROM dm_members WHERE conversation_id = cid AND user_id = p_user AND left_at IS NULL) THEN
      INSERT INTO dm_members (conversation_id, user_id, role) VALUES (cid, p_user, 'member')
      ON CONFLICT (conversation_id, user_id) DO UPDATE SET left_at = NULL, joined_at = now(), hidden_before = NULL, last_read_at = NULL;
      PERFORM dm_system(cid, jsonb_build_object('event', 'added', 'by', me, 'users', jsonb_build_array(p_user)));
    END IF;
  ELSE
    DELETE FROM beta_testers WHERE user_id = p_user;
    IF EXISTS (SELECT 1 FROM dm_members WHERE conversation_id = cid AND user_id = p_user AND left_at IS NULL) THEN
      PERFORM dm_system(cid, jsonb_build_object('event', 'left', 'by', p_user));
      UPDATE dm_members SET left_at = now(), typing_until = NULL WHERE conversation_id = cid AND user_id = p_user;
    END IF;
  END IF;
  RETURN cid;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION admin_set_beta(uuid, boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION admin_set_beta(uuid, boolean) TO mosaic_app;
--> statement-breakpoint

-- Which group MOSAIC runs this is (null: an ordinary one), for its members.
CREATE OR REPLACE FUNCTION dm_system_key(p_conv uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.system_key FROM dm_conversations c JOIN dm_members m ON m.conversation_id = c.id AND m.user_id = app_current_user_id()
   WHERE c.id = p_conv;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION dm_system_key(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION dm_system_key(uuid) TO mosaic_app;
--> statement-breakpoint

-- A group MOSAIC runs keeps its members and name: they can't leave it, rename it or add to it.
CREATE OR REPLACE FUNCTION dm_leave(p_conv uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members;
BEGIN
  mine := dm_me(p_conv, true);
  IF (SELECT kind FROM dm_conversations WHERE id = p_conv) <> 'group' THEN RAISE EXCEPTION 'not_a_group' USING ERRCODE = 'P0001'; END IF;
  IF (SELECT system_key FROM dm_conversations WHERE id = p_conv) IS NOT NULL THEN RAISE EXCEPTION 'system_group' USING ERRCODE = 'P0001'; END IF;
  PERFORM dm_system(p_conv, jsonb_build_object('event', 'left', 'by', me));
  UPDATE dm_members SET left_at = now(), typing_until = NULL WHERE conversation_id = p_conv AND user_id = me;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_rename(p_conv uuid, p_title text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members; ttl text := nullif(btrim(coalesce(p_title, '')), '');
BEGIN
  mine := dm_me(p_conv, true);
  IF (SELECT kind FROM dm_conversations WHERE id = p_conv) <> 'group' THEN RAISE EXCEPTION 'not_a_group' USING ERRCODE = 'P0001'; END IF;
  IF (SELECT system_key FROM dm_conversations WHERE id = p_conv) IS NOT NULL THEN RAISE EXCEPTION 'system_group' USING ERRCODE = 'P0001'; END IF;
  IF ttl IS NOT NULL AND char_length(ttl) > 60 THEN RAISE EXCEPTION 'invalid_title' USING ERRCODE = '22023'; END IF;
  UPDATE dm_conversations SET title = ttl WHERE id = p_conv;
  PERFORM dm_system(p_conv, jsonb_build_object('event', 'renamed', 'by', me, 'title', ttl));
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_add_members(p_conv uuid, p_members uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members; u uuid; added uuid[] := '{}'; n int;
BEGIN
  mine := dm_me(p_conv, true);
  IF (SELECT kind FROM dm_conversations WHERE id = p_conv) <> 'group' THEN RAISE EXCEPTION 'not_a_group' USING ERRCODE = 'P0001'; END IF;
  IF (SELECT system_key FROM dm_conversations WHERE id = p_conv) IS NOT NULL THEN RAISE EXCEPTION 'system_group' USING ERRCODE = 'P0001'; END IF;
  FOREACH u IN ARRAY coalesce(p_members, '{}') LOOP
    IF u = me OR EXISTS (SELECT 1 FROM dm_members WHERE conversation_id = p_conv AND user_id = u AND left_at IS NULL) THEN CONTINUE; END IF;
    IF NOT dm_connected(me, u) THEN RAISE EXCEPTION 'not_connected' USING ERRCODE = 'P0001'; END IF;
    INSERT INTO dm_members (conversation_id, user_id, role) VALUES (p_conv, u, 'member')
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET left_at = NULL, joined_at = now(), hidden_before = NULL, last_read_at = NULL;
    added := added || u;
  END LOOP;
  SELECT count(*) INTO n FROM dm_members WHERE conversation_id = p_conv AND left_at IS NULL;
  IF n > 31 THEN RAISE EXCEPTION 'invalid_group' USING ERRCODE = '22023'; END IF;
  IF cardinality(added) > 0 THEN PERFORM dm_system(p_conv, jsonb_build_object('event', 'added', 'by', me, 'users', to_jsonb(added))); END IF;
END $$;
--> statement-breakpoint

-- The group MOSAIC runs under this key, if I am in it.
CREATE OR REPLACE FUNCTION dm_system_conversation(p_key text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.id FROM dm_conversations c JOIN dm_members m ON m.conversation_id = c.id AND m.user_id = app_current_user_id() AND m.left_at IS NULL
   WHERE c.system_key = p_key;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION dm_system_conversation(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION dm_system_conversation(text) TO mosaic_app;
