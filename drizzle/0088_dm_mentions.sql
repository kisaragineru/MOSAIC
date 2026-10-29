ALTER TABLE "dm_messages" ADD COLUMN "mentions" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD COLUMN "mentions_all" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Mentions in group messages: "@name" of a member, or "@all" (全員 / all / tất cả) for everyone.
-- They are read from the body by a trigger, on sending and on editing, so every way of writing a
-- message follows the same rule. A name is matched as written after "@"; when one member's name
-- starts another's ("ハナ" and "ハナコ"), "@ハナコ" mentions only ハナコ (also after ハナコ left).
-- The writer is never mentioned, and only members still in the group can be.
CREATE OR REPLACE FUNCTION dm_mention_count(p_body text, p_name text) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN p_body IS NULL OR p_name IS NULL OR p_name = '' THEN 0
              ELSE (char_length(p_body) - char_length(replace(p_body, '@' || p_name, ''))) / char_length('@' || p_name) END
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_mentions_all(p_body text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT coalesce(p_body ~ '(^|[^A-Za-z0-9_])@全員' OR p_body ~* '(^|[^A-Za-z0-9_])@(all|tất cả)($|[^A-Za-z0-9_])', false)
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_mention_ids(p_conv uuid, p_sender uuid, p_body text) RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  -- Every member's name, those who left included, so "@ハナコ" is never read as "@ハナ" after ハナコ leaves.
  WITH names AS (
    SELECT m.user_id, p.display_name AS name, m.left_at IS NULL AS here
      FROM dm_members m JOIN profiles p ON p.user_id = m.user_id
     WHERE m.conversation_id = p_conv AND coalesce(p.display_name, '') <> ''
  )
  SELECT coalesce(array_agg(DISTINCT a.user_id), '{}'::uuid[])
    FROM names a
   WHERE a.here AND a.user_id IS DISTINCT FROM p_sender
     AND dm_mention_count(p_body, a.name) > coalesce((
           SELECT sum(dm_mention_count(p_body, b.name)) FROM (SELECT DISTINCT name FROM names) b
            WHERE b.name <> a.name AND starts_with(b.name, a.name)), 0)
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dm_messages_set_mentions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.body IS NOT NULL AND NEW.deleted_at IS NULL AND NEW.kind IN ('text', 'image')
     AND EXISTS (SELECT 1 FROM dm_conversations c WHERE c.id = NEW.conversation_id AND c.kind = 'group') THEN
    NEW.mentions := dm_mention_ids(NEW.conversation_id, NEW.sender_id, NEW.body);
    NEW.mentions_all := dm_mentions_all(NEW.body);
  ELSE
    NEW.mentions := '{}'::uuid[];
    NEW.mentions_all := false;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS dm_messages_mentions ON dm_messages;
--> statement-breakpoint
CREATE TRIGGER dm_messages_mentions BEFORE INSERT OR UPDATE OF body, deleted_at ON dm_messages
  FOR EACH ROW EXECUTE FUNCTION dm_messages_set_mentions();
--> statement-breakpoint

-- Messages carry who they mention (names as they are now), for the conversation to show.
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
        -- Its owner sent it and chose to show it here: the card, for members outside its audience.
        WHEN x.record_shown AND x.sender_id = e.user_id THEN jsonb_build_object(
          'id', e.id, 'mine', false, 'shown', true, 'owner_name', op.display_name, 'kind', e.kind,
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
                  FROM dm_reactions rr WHERE rr.message_id = x.id),
    'mentions', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', mp.user_id, 'name', mp.display_name)), '[]'::jsonb)
                 FROM profiles mp WHERE mp.user_id = ANY (x.mentions)),
    'mentions_all', x.mentions_all)
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

-- The inbox says when something unread mentions me (a new column, so the function is replaced).
DROP FUNCTION IF EXISTS dm_inbox();
--> statement-breakpoint
CREATE FUNCTION dm_inbox()
RETURNS TABLE (id uuid, kind text, title text, others jsonb, last_kind text, last_body text, last_meta jsonb, last_sender uuid, last_sender_name text,
               last_deleted boolean, last_at timestamptz, unread int, muted boolean, can_send boolean, left_group boolean, mentioned boolean)
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
         m.muted, dm_can_send(c.id, me), m.left_at IS NOT NULL,
         EXISTS (SELECT 1 FROM dm_messages u
                 WHERE u.conversation_id = c.id AND u.sender_id IS DISTINCT FROM me AND u.kind <> 'system' AND u.deleted_at IS NULL
                   AND dm_visible(m, u.created_at) AND u.created_at > coalesce(m.last_read_at, m.joined_at)
                   AND (me = ANY (u.mentions) OR u.mentions_all))
  FROM dm_members m
  JOIN dm_conversations c ON c.id = m.conversation_id
  JOIN LATERAL (SELECT * FROM dm_messages z WHERE z.conversation_id = c.id AND dm_visible(m, z.created_at)
                ORDER BY z.created_at DESC, z.id DESC LIMIT 1) l ON true
  LEFT JOIN profiles lp ON lp.user_id = l.sender_id
  WHERE m.user_id = me
  ORDER BY l.created_at DESC;
END $$;
--> statement-breakpoint

-- The badge: conversations with something new, muted ones aside unless something new mentions me.
CREATE OR REPLACE FUNCTION dm_unread_total() RETURNS int
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RETURN 0; END IF;
  RETURN (SELECT count(*)::int FROM dm_members m
          WHERE m.user_id = me
            AND EXISTS (SELECT 1 FROM dm_messages u
                        WHERE u.conversation_id = m.conversation_id AND u.sender_id IS DISTINCT FROM me AND u.kind <> 'system' AND u.deleted_at IS NULL
                          AND dm_visible(m, u.created_at) AND u.created_at > coalesce(m.last_read_at, m.joined_at)
                          AND (NOT m.muted OR me = ANY (u.mentions) OR u.mentions_all)));
END $$;
--> statement-breakpoint

-- Push: a muted conversation stays quiet, except for a message that mentions me (operator's decision, 2026-10-29).
DROP FUNCTION IF EXISTS dm_push_targets(uuid);
--> statement-breakpoint
CREATE FUNCTION dm_push_targets(p_msg uuid) RETURNS TABLE (
  user_id uuid, locale text, endpoint text, p256dh text, auth text,
  conversation_id uuid, conv_kind text, conv_title text, sender_name text, msg_kind text, body text, mentioned boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT m.user_id, p.locale, s.endpoint, s.p256dh, s.auth,
         c.id, c.kind, c.title, sp.display_name, msg.kind,
         CASE WHEN coalesce(np.push_preview, false) THEN left(msg.body, 200) END,
         (m.user_id = ANY (msg.mentions) OR msg.mentions_all)
    FROM dm_messages msg
    JOIN dm_conversations c ON c.id = msg.conversation_id
    JOIN dm_members m ON m.conversation_id = c.id AND m.user_id <> msg.sender_id AND m.left_at IS NULL
                     AND (NOT m.muted OR m.user_id = ANY (msg.mentions) OR msg.mentions_all)
    JOIN push_subscriptions s ON s.user_id = m.user_id
    JOIN profiles p ON p.user_id = m.user_id
    LEFT JOIN profiles sp ON sp.user_id = msg.sender_id
    LEFT JOIN notification_preferences np ON np.user_id = m.user_id
   WHERE msg.id = p_msg AND msg.sender_id = app_current_user_id() AND msg.kind <> 'system' AND msg.deleted_at IS NULL;
$$;
--> statement-breakpoint

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['dm_inbox()', 'dm_push_targets(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY['dm_mention_ids(uuid,uuid,text)', 'dm_messages_set_mentions()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
  END LOOP;
END $$;
