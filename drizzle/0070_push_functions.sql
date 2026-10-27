-- Push notifications for messages.

-- Turn them on in this browser. A browser belongs to whoever turned them on there last (the same
-- browser signed in as someone else takes the row over).
CREATE OR REPLACE FUNCTION push_subscribe(p_endpoint text, p_p256dh text, p_auth text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (me, p_endpoint, p_p256dh, p_auth)
  ON CONFLICT (endpoint) DO UPDATE SET user_id = me, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
END $$;
--> statement-breakpoint

-- Who to tell about a message I just sent: the other members still in the conversation who
-- haven't muted it, one row per browser of theirs. The text only for those who chose to see it.
CREATE OR REPLACE FUNCTION dm_push_targets(p_msg uuid) RETURNS TABLE (
  user_id uuid, locale text, endpoint text, p256dh text, auth text,
  conversation_id uuid, conv_kind text, conv_title text, sender_name text, msg_kind text, body text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT m.user_id, p.locale, s.endpoint, s.p256dh, s.auth,
         c.id, c.kind, c.title, sp.display_name, msg.kind,
         CASE WHEN coalesce(np.push_preview, false) THEN left(msg.body, 200) END
    FROM dm_messages msg
    JOIN dm_conversations c ON c.id = msg.conversation_id
    JOIN dm_members m ON m.conversation_id = c.id AND m.user_id <> msg.sender_id AND m.left_at IS NULL AND NOT m.muted
    JOIN push_subscriptions s ON s.user_id = m.user_id
    JOIN profiles p ON p.user_id = m.user_id
    LEFT JOIN profiles sp ON sp.user_id = msg.sender_id
    LEFT JOIN notification_preferences np ON np.user_id = m.user_id
   WHERE msg.id = p_msg AND msg.sender_id = app_current_user_id() AND msg.kind <> 'system' AND msg.deleted_at IS NULL;
$$;
--> statement-breakpoint

-- A browser the push service says is gone (404/410): forget it, whoever's it was.
CREATE OR REPLACE FUNCTION push_forget(p_endpoint text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  DELETE FROM push_subscriptions WHERE endpoint = p_endpoint;
$$;
--> statement-breakpoint

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['push_subscribe(text,text,text)','dm_push_targets(uuid)','push_forget(text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
