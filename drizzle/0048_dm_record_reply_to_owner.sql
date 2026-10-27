-- Someone else's shared record can only be sent to its owner (as a reply), never passed on.
CREATE OR REPLACE FUNCTION dm_send_id(p_id uuid, p_conv uuid, p_kind text, p_body text, p_reply uuid, p_record uuid, p_attachments uuid[]) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); mine dm_members; b text := nullif(btrim(coalesce(p_body, '')), ''); new_id uuid; n int; rec_owner uuid;
BEGIN
  -- Sent before (a retry after a lost answer): the same message, not a second one.
  IF EXISTS (SELECT 1 FROM dm_messages WHERE id = p_id) THEN
    IF EXISTS (SELECT 1 FROM dm_messages WHERE id = p_id AND sender_id = me AND conversation_id = p_conv) THEN RETURN p_id; END IF;
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
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
    -- Someone else's record goes only to its owner, in our one-to-one conversation (a reply to it);
    -- passing it on to third people is not possible. My own records I can send anywhere I may send.
    IF rec_owner <> me AND NOT EXISTS (
      SELECT 1 FROM dm_conversations c JOIN dm_members m ON m.conversation_id = c.id AND m.user_id = rec_owner
      WHERE c.id = p_conv AND c.kind = 'direct'
    ) THEN RAISE EXCEPTION 'record_to_owner_only' USING ERRCODE = 'P0001'; END IF;
  ELSE
    RAISE EXCEPTION 'invalid_message' USING ERRCODE = '22023';
  END IF;
  IF p_reply IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dm_messages WHERE id = p_reply AND conversation_id = p_conv AND dm_visible(mine, created_at)) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO dm_messages (id, conversation_id, sender_id, kind, body, reply_to, record_id)
  VALUES (coalesce(p_id, gen_random_uuid()), p_conv, me, p_kind, b, p_reply, CASE WHEN p_kind = 'record' THEN p_record END) RETURNING id INTO new_id;
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
