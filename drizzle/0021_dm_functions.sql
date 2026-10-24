-- Direct messages: every read and write goes through these functions.
--
-- Rules:
-- * A direct conversation exists only between two people with an active connection; when the
--   connection ends it stays readable but nobody can send in it.
-- * A group is made of people the person adding them is connected with. Members see messages
--   from when they joined until they left; "delete chat" hides everything up to that moment
--   for that member only.
-- * A shared record shows inside a message only to members who may read that record anyway.
-- * Photos are served only to members who can see the message (and to their uploader).

ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE dm_members ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE dm_reactions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE dm_attachments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Is there an active connection between a and b?
CREATE OR REPLACE FUNCTION dm_connected(a uuid, b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM comparison_sessions s
                 WHERE s.status = 'active' AND ((s.user_a = a AND s.user_b = b) OR (s.user_a = b AND s.user_b = a)))
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION dm_connected(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint

-- My membership, or not_found. p_active: must not have left.
CREATE OR REPLACE FUNCTION dm_me(p_conv uuid, p_active boolean) RETURNS dm_members
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); m dm_members%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO m FROM dm_members WHERE conversation_id = p_conv AND user_id = me;
  IF NOT FOUND OR (p_active AND m.left_at IS NOT NULL) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  RETURN m;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION dm_me(uuid, boolean) FROM PUBLIC;
--> statement-breakpoint

-- Can I write in this conversation right now?
CREATE OR REPLACE FUNCTION dm_can_send(p_conv uuid, p_me uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM dm_conversations c JOIN dm_members m ON m.conversation_id = c.id AND m.user_id = p_me AND m.left_at IS NULL
    WHERE c.id = p_conv
      AND (c.kind = 'group' OR EXISTS (SELECT 1 FROM dm_members o WHERE o.conversation_id = c.id AND o.user_id <> p_me AND dm_connected(p_me, o.user_id))))
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION dm_can_send(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint

-- Is this message within what member m may see?
CREATE OR REPLACE FUNCTION dm_visible(m dm_members, created timestamptz) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT created >= m.joined_at AND (m.hidden_before IS NULL OR created > m.hidden_before) AND (m.left_at IS NULL OR created <= m.left_at)
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_system(p_conv uuid, p_meta jsonb) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  INSERT INTO dm_messages (conversation_id, sender_id, kind, meta) VALUES (p_conv, NULL, 'system', p_meta);
  UPDATE dm_conversations SET last_message_at = now() WHERE id = p_conv;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION dm_system(uuid, jsonb) FROM PUBLIC;
--> statement-breakpoint

-- Open (or create) the one-to-one conversation with someone I'm connected with.
CREATE OR REPLACE FUNCTION dm_open_direct(p_other uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); k text; cid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF p_other IS NULL OR p_other = me THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  k := least(me::text, p_other::text) || ':' || greatest(me::text, p_other::text);
  SELECT id INTO cid FROM dm_conversations WHERE direct_key = k;
  IF cid IS NOT NULL THEN RETURN cid; END IF;
  IF NOT dm_connected(me, p_other) THEN RAISE EXCEPTION 'not_connected' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO dm_conversations (kind, direct_key, created_by) VALUES ('direct', k, me)
  ON CONFLICT (direct_key) DO NOTHING RETURNING id INTO cid;
  IF cid IS NULL THEN SELECT id INTO cid FROM dm_conversations WHERE direct_key = k; END IF;
  INSERT INTO dm_members (conversation_id, user_id, role) VALUES (cid, me, 'member'), (cid, p_other, 'member') ON CONFLICT DO NOTHING;
  RETURN cid;
END $$;
--> statement-breakpoint

-- A group with people I'm connected with (at least two others, at most 30).
CREATE OR REPLACE FUNCTION dm_create_group(p_title text, p_members uuid[]) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); others uuid[]; u uuid; cid uuid; ttl text := nullif(btrim(coalesce(p_title, '')), '');
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT array_agg(DISTINCT x) INTO others FROM unnest(coalesce(p_members, '{}')) x WHERE x <> me;
  IF cardinality(others) IS NULL OR cardinality(others) < 2 OR cardinality(others) > 30 THEN RAISE EXCEPTION 'invalid_group' USING ERRCODE = '22023'; END IF;
  IF ttl IS NOT NULL AND char_length(ttl) > 60 THEN RAISE EXCEPTION 'invalid_title' USING ERRCODE = '22023'; END IF;
  FOREACH u IN ARRAY others LOOP
    IF NOT dm_connected(me, u) THEN RAISE EXCEPTION 'not_connected' USING ERRCODE = 'P0001'; END IF;
  END LOOP;
  INSERT INTO dm_conversations (kind, title, created_by) VALUES ('group', ttl, me) RETURNING id INTO cid;
  INSERT INTO dm_members (conversation_id, user_id, role) VALUES (cid, me, 'owner');
  INSERT INTO dm_members (conversation_id, user_id, role) SELECT cid, x, 'member' FROM unnest(others) x;
  PERFORM dm_system(cid, jsonb_build_object('event', 'created', 'by', me));
  RETURN cid;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_add_members(p_conv uuid, p_members uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members; u uuid; added uuid[] := '{}'; n int;
BEGIN
  mine := dm_me(p_conv, true);
  IF (SELECT kind FROM dm_conversations WHERE id = p_conv) <> 'group' THEN RAISE EXCEPTION 'not_a_group' USING ERRCODE = 'P0001'; END IF;
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

CREATE OR REPLACE FUNCTION dm_leave(p_conv uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members;
BEGIN
  mine := dm_me(p_conv, true);
  IF (SELECT kind FROM dm_conversations WHERE id = p_conv) <> 'group' THEN RAISE EXCEPTION 'not_a_group' USING ERRCODE = 'P0001'; END IF;
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
  IF ttl IS NOT NULL AND char_length(ttl) > 60 THEN RAISE EXCEPTION 'invalid_title' USING ERRCODE = '22023'; END IF;
  UPDATE dm_conversations SET title = ttl WHERE id = p_conv;
  PERFORM dm_system(p_conv, jsonb_build_object('event', 'renamed', 'by', me, 'title', ttl));
END $$;
--> statement-breakpoint

-- A photo for a message I'm about to send (kept unattached until then; stale ones are cleared).
CREATE OR REPLACE FUNCTION dm_upload(p_conv uuid, p_mime text, p_bytes bytea, p_width int, p_height int) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members; new_id uuid;
BEGIN
  mine := dm_me(p_conv, true);
  IF NOT dm_can_send(p_conv, me) THEN RAISE EXCEPTION 'cannot_send' USING ERRCODE = 'P0001'; END IF;
  DELETE FROM dm_attachments WHERE uploader_id = me AND message_id IS NULL AND created_at < now() - interval '1 day';
  IF (SELECT count(*) FROM dm_attachments WHERE uploader_id = me AND message_id IS NULL) >= 12 THEN RAISE EXCEPTION 'too_many_uploads' USING ERRCODE = 'P0001'; END IF;
  IF p_width NOT BETWEEN 1 AND 8000 OR p_height NOT BETWEEN 1 AND 8000 THEN RAISE EXCEPTION 'invalid_image' USING ERRCODE = '22023'; END IF;
  INSERT INTO dm_attachments (conversation_id, uploader_id, mime, bytes, size, width, height)
  VALUES (p_conv, me, p_mime, p_bytes, octet_length(p_bytes), p_width, p_height) RETURNING id INTO new_id;
  RETURN new_id;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_send(p_conv uuid, p_kind text, p_body text, p_reply uuid, p_record uuid, p_attachments uuid[]) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members; b text := nullif(btrim(coalesce(p_body, '')), ''); new_id uuid; n int; rec_owner uuid;
BEGIN
  mine := dm_me(p_conv, true);
  IF NOT dm_can_send(p_conv, me) THEN RAISE EXCEPTION 'cannot_send' USING ERRCODE = 'P0001'; END IF;
  IF b IS NOT NULL AND char_length(b) > 4000 THEN RAISE EXCEPTION 'invalid_message' USING ERRCODE = '22023'; END IF;
  IF p_kind = 'text' THEN
    IF b IS NULL THEN RAISE EXCEPTION 'invalid_message' USING ERRCODE = '22023'; END IF;
  ELSIF p_kind = 'image' THEN
    IF cardinality(p_attachments) IS NULL OR cardinality(p_attachments) NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'invalid_message' USING ERRCODE = '22023'; END IF;
  ELSIF p_kind = 'record' THEN
    SELECT user_id INTO rec_owner FROM memory_entries WHERE id = p_record;
    IF rec_owner IS NULL OR (rec_owner <> me AND memory_shared_session(p_record, me) IS NULL) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  ELSE
    RAISE EXCEPTION 'invalid_message' USING ERRCODE = '22023';
  END IF;
  IF p_reply IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dm_messages WHERE id = p_reply AND conversation_id = p_conv AND dm_visible(mine, created_at)) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO dm_messages (conversation_id, sender_id, kind, body, reply_to, record_id)
  VALUES (p_conv, me, p_kind, b, p_reply, CASE WHEN p_kind = 'record' THEN p_record END) RETURNING id INTO new_id;
  IF p_kind = 'image' THEN
    UPDATE dm_attachments a SET message_id = new_id, position = x.ord - 1
    FROM unnest(p_attachments) WITH ORDINALITY x(id, ord)
    WHERE a.id = x.id AND a.uploader_id = me AND a.conversation_id = p_conv AND a.message_id IS NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> cardinality(p_attachments) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  END IF;
  UPDATE dm_conversations SET last_message_at = now() WHERE id = p_conv;
  UPDATE dm_members SET last_read_at = now(), typing_until = NULL WHERE conversation_id = p_conv AND user_id = me;
  RETURN new_id;
END $$;
--> statement-breakpoint

-- Change my own text message within 15 minutes of sending it.
CREATE OR REPLACE FUNCTION dm_edit(p_msg uuid, p_body text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); m dm_messages%ROWTYPE; b text := nullif(btrim(coalesce(p_body, '')), '');
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO m FROM dm_messages WHERE id = p_msg AND sender_id = me AND deleted_at IS NULL;
  IF NOT FOUND OR m.kind <> 'text' THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF m.created_at < now() - interval '15 minutes' THEN RAISE EXCEPTION 'edit_window_passed' USING ERRCODE = 'P0001'; END IF;
  IF b IS NULL OR char_length(b) > 4000 THEN RAISE EXCEPTION 'invalid_message' USING ERRCODE = '22023'; END IF;
  PERFORM dm_me(m.conversation_id, true);
  UPDATE dm_messages SET body = b, edited_at = now(), updated_at = now() WHERE id = p_msg;
END $$;
--> statement-breakpoint

-- Take back one of my messages for everyone: the words, photos, shared record and reactions go.
CREATE OR REPLACE FUNCTION dm_unsend(p_msg uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE dm_messages SET body = NULL, record_id = NULL, meta = NULL, deleted_at = now(), updated_at = now()
  WHERE id = p_msg AND sender_id = me AND deleted_at IS NULL AND kind <> 'system';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  DELETE FROM dm_attachments WHERE message_id = p_msg;
  DELETE FROM dm_reactions WHERE message_id = p_msg;
END $$;
--> statement-breakpoint

-- React to a message (one reaction per person; NULL takes it away).
CREATE OR REPLACE FUNCTION dm_react(p_msg uuid, p_emoji text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); m dm_messages%ROWTYPE; mine dm_members;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO m FROM dm_messages WHERE id = p_msg AND deleted_at IS NULL AND kind <> 'system';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  mine := dm_me(m.conversation_id, true);
  IF NOT dm_visible(mine, m.created_at) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p_emoji IS NULL OR btrim(p_emoji) = '' THEN
    DELETE FROM dm_reactions WHERE message_id = p_msg AND user_id = me;
  ELSE
    IF char_length(p_emoji) > 16 THEN RAISE EXCEPTION 'invalid_reaction' USING ERRCODE = '22023'; END IF;
    INSERT INTO dm_reactions (message_id, user_id, emoji) VALUES (p_msg, me, p_emoji)
    ON CONFLICT (message_id, user_id) DO UPDATE SET emoji = excluded.emoji, created_at = now();
  END IF;
  UPDATE dm_messages SET updated_at = now() WHERE id = p_msg;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_mark_read(p_conv uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members;
BEGIN
  mine := dm_me(p_conv, false);
  UPDATE dm_members SET last_read_at = now() WHERE conversation_id = p_conv AND user_id = me;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_typing(p_conv uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members;
BEGIN
  mine := dm_me(p_conv, true);
  UPDATE dm_members SET typing_until = now() + interval '6 seconds' WHERE conversation_id = p_conv AND user_id = me;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_set_muted(p_conv uuid, p_muted boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members;
BEGIN
  mine := dm_me(p_conv, false);
  UPDATE dm_members SET muted = coalesce(p_muted, false) WHERE conversation_id = p_conv AND user_id = me;
END $$;
--> statement-breakpoint

-- "Delete chat" for me: everything so far disappears from my side only.
CREATE OR REPLACE FUNCTION dm_hide(p_conv uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members;
BEGIN
  mine := dm_me(p_conv, false);
  UPDATE dm_members SET hidden_before = now(), last_read_at = now() WHERE conversation_id = p_conv AND user_id = me;
END $$;
--> statement-breakpoint

-- The conversation's header: who is in it, read and typing state, whether I can write.
CREATE OR REPLACE FUNCTION dm_conversation(p_conv uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members; c dm_conversations%ROWTYPE;
BEGIN
  mine := dm_me(p_conv, false);
  SELECT * INTO c FROM dm_conversations WHERE id = p_conv;
  RETURN jsonb_build_object(
    'id', c.id, 'kind', c.kind, 'title', c.title,
    'can_send', dm_can_send(p_conv, me),
    'me', jsonb_build_object('role', mine.role, 'left', mine.left_at IS NOT NULL, 'muted', mine.muted, 'joined_at', mine.joined_at),
    'members', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', m.user_id, 'name', p.display_name, 'role', m.role, 'left', m.left_at IS NOT NULL,
        'last_read_at', m.last_read_at, 'typing', m.typing_until > now() AND m.user_id <> me,
        'connected', m.user_id = me OR dm_connected(me, m.user_id)) ORDER BY m.joined_at, m.user_id), '[]'::jsonb)
      FROM dm_members m JOIN profiles p ON p.user_id = m.user_id WHERE m.conversation_id = p_conv));
END $$;
--> statement-breakpoint

-- Messages I may see: the newest before p_before, or (p_since) everything new or changed since then.
CREATE OR REPLACE FUNCTION dm_messages(p_conv uuid, p_before timestamptz, p_since timestamptz, p_limit int) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members; lim int := least(greatest(coalesce(p_limit, 40), 1), 200);
BEGIN
  mine := dm_me(p_conv, false);
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', x.id, 'sender_id', x.sender_id, 'sender_name', sp.display_name, 'kind', x.kind,
    'body', x.body, 'meta', x.meta, 'created_at', x.created_at, 'updated_at', x.updated_at,
    'edited', x.edited_at IS NOT NULL, 'deleted', x.deleted_at IS NOT NULL,
    'reply', (SELECT jsonb_build_object('id', r.id, 'sender_name', rp.display_name, 'kind', r.kind, 'body', left(r.body, 200), 'deleted', r.deleted_at IS NOT NULL)
              FROM dm_messages r LEFT JOIN profiles rp ON rp.user_id = r.sender_id
              WHERE r.id = x.reply_to AND dm_visible(mine, r.created_at)),
    'record', CASE WHEN x.record_id IS NULL THEN NULL ELSE (
      SELECT CASE
        WHEN e.user_id = me OR memory_shared_session(e.id, me) IS NOT NULL THEN jsonb_build_object(
          'id', e.id, 'mine', e.user_id = me, 'owner_name', op.display_name, 'kind', e.kind,
          'title', CASE WHEN e.reveal_on > current_date THEN NULL ELSE v.title END,
          'body', CASE WHEN e.reveal_on > current_date THEN NULL ELSE left(v.body, 300) END)
        ELSE jsonb_build_object('hidden', true) END
      FROM memory_entries e
      JOIN memory_entry_versions v ON v.entry_id = e.id AND v.version = e.current_version
      JOIN profiles op ON op.user_id = e.user_id
      WHERE e.id = x.record_id) END,
    'attachments', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'w', a.width, 'h', a.height) ORDER BY a.position), '[]'::jsonb)
                    FROM dm_attachments a WHERE a.message_id = x.id),
    'reactions', (SELECT coalesce(jsonb_agg(jsonb_build_object('user_id', rr.user_id, 'emoji', rr.emoji) ORDER BY rr.created_at), '[]'::jsonb)
                  FROM dm_reactions rr WHERE rr.message_id = x.id))
  FROM (
    SELECT * FROM dm_messages m
    WHERE m.conversation_id = p_conv AND dm_visible(mine, m.created_at)
      AND (p_since IS NULL OR m.updated_at > p_since)
      AND (p_since IS NOT NULL OR p_before IS NULL OR m.created_at < p_before)
    ORDER BY CASE WHEN p_since IS NULL THEN m.created_at END DESC, CASE WHEN p_since IS NOT NULL THEN m.updated_at END ASC, m.id
    LIMIT lim
  ) x
  LEFT JOIN profiles sp ON sp.user_id = x.sender_id;
END $$;
--> statement-breakpoint

-- My conversations, newest activity first, with a preview and what's unread.
CREATE OR REPLACE FUNCTION dm_inbox()
RETURNS TABLE (id uuid, kind text, title text, others jsonb, last_kind text, last_body text, last_meta jsonb, last_sender uuid, last_sender_name text,
               last_deleted boolean, last_at timestamptz, unread int, muted boolean, can_send boolean, left_group boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT c.id, c.kind, c.title,
         (SELECT coalesce(jsonb_agg(jsonb_build_object('id', o.user_id, 'name', op.display_name) ORDER BY o.joined_at), '[]'::jsonb)
          FROM dm_members o JOIN profiles op ON op.user_id = o.user_id
          WHERE o.conversation_id = c.id AND o.user_id <> me AND o.left_at IS NULL),
         l.kind, CASE WHEN l.deleted_at IS NULL THEN left(l.body, 140) END, l.meta, l.sender_id, lp.display_name, l.deleted_at IS NOT NULL, l.created_at,
         (SELECT count(*)::int FROM dm_messages u
          WHERE u.conversation_id = c.id AND u.sender_id IS DISTINCT FROM me AND u.kind <> 'system' AND u.deleted_at IS NULL
            AND dm_visible(m, u.created_at) AND u.created_at > coalesce(m.last_read_at, m.joined_at)),
         m.muted, dm_can_send(c.id, me), m.left_at IS NOT NULL
  FROM dm_members m
  JOIN dm_conversations c ON c.id = m.conversation_id
  JOIN LATERAL (SELECT * FROM dm_messages z WHERE z.conversation_id = c.id AND dm_visible(m, z.created_at)
                ORDER BY z.created_at DESC, z.id DESC LIMIT 1) l ON true
  LEFT JOIN profiles lp ON lp.user_id = l.sender_id
  WHERE m.user_id = me
  ORDER BY l.created_at DESC;
END $$;
--> statement-breakpoint

-- How many conversations have something new (muted ones aside), for the badge.
CREATE OR REPLACE FUNCTION dm_unread_total() RETURNS int
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RETURN 0; END IF;
  RETURN (SELECT count(*)::int FROM dm_members m
          WHERE m.user_id = me AND NOT m.muted
            AND EXISTS (SELECT 1 FROM dm_messages u
                        WHERE u.conversation_id = m.conversation_id AND u.sender_id IS DISTINCT FROM me AND u.kind <> 'system' AND u.deleted_at IS NULL
                          AND dm_visible(m, u.created_at) AND u.created_at > coalesce(m.last_read_at, m.joined_at)));
END $$;
--> statement-breakpoint

-- A photo, for a member who can see its message (or for whoever uploaded it).
CREATE OR REPLACE FUNCTION dm_attachment(p_id uuid) RETURNS TABLE (mime text, bytes bytea)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT a.mime, a.bytes FROM dm_attachments a
    LEFT JOIN dm_messages x ON x.id = a.message_id
    LEFT JOIN dm_members m ON m.conversation_id = a.conversation_id AND m.user_id = me
    WHERE a.id = p_id
      AND (a.uploader_id = me OR (x.id IS NOT NULL AND x.deleted_at IS NULL AND m.user_id IS NOT NULL AND dm_visible(m, x.created_at)));
END $$;
--> statement-breakpoint

-- What I wrote, for my data export.
CREATE OR REPLACE FUNCTION dm_messages_authored()
RETURNS TABLE (id uuid, conversation_id uuid, kind text, body text, created_at timestamptz, edited_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT m.id, m.conversation_id, m.kind, m.body, m.created_at, m.edited_at FROM dm_messages m
               WHERE m.sender_id = me AND m.deleted_at IS NULL ORDER BY m.created_at;
END $$;
--> statement-breakpoint

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'dm_open_direct(uuid)','dm_create_group(text,uuid[])','dm_add_members(uuid,uuid[])','dm_leave(uuid)','dm_rename(uuid,text)',
    'dm_upload(uuid,text,bytea,int,int)','dm_send(uuid,text,text,uuid,uuid,uuid[])','dm_edit(uuid,text)','dm_unsend(uuid)',
    'dm_react(uuid,text)','dm_mark_read(uuid)','dm_typing(uuid)','dm_set_muted(uuid,boolean)','dm_hide(uuid)',
    'dm_conversation(uuid)','dm_messages(uuid,timestamptz,timestamptz,int)','dm_inbox()','dm_unread_total()',
    'dm_attachment(uuid)','dm_messages_authored()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
