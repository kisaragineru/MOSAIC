-- A box handed over as a book first can later go to the child's account too (from 13, as the
-- terms of use say): its owner issues a receive code as for an open box, and receiving copies its
-- growth records and letters into the child's records. The box stays "handed over as a book"
-- (delivered_via = 'pdf'), so its owner still reads all of it; delivered_to says the child has it.

CREATE OR REPLACE FUNCTION gift_code_issue(p_box uuid, p_code_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE b gift_boxes;
BEGIN
  b := gift_box_for(p_box, true, false);
  IF NOT (b.status = 'open' OR (b.delivered_via = 'pdf' AND b.delivered_to IS NULL)) THEN RAISE EXCEPTION 'gift_delivered' USING ERRCODE = 'P0001'; END IF;
  IF b.deliver_on > current_date THEN RAISE EXCEPTION 'not_yet' USING ERRCODE = 'P0001'; END IF;
  IF NOT gift_old_enough(b) THEN RAISE EXCEPTION 'gift_too_young' USING ERRCODE = 'P0001'; END IF;
  UPDATE gift_boxes SET receive_code_hash = p_code_hash, receive_code_expires_at = now() + interval '30 days', updated_at = now() WHERE id = p_box;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION gift_receive(p_code_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); b gift_boxes%ROWTYPE;
BEGIN
  SELECT * INTO b FROM gift_boxes WHERE receive_code_hash = p_code_hash FOR UPDATE;
  IF NOT FOUND OR NOT (b.status = 'open' OR (b.delivered_via = 'pdf' AND b.delivered_to IS NULL))
     OR b.receive_code_expires_at < now() OR b.deliver_on > current_date THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM gift_writers WHERE box_id = b.id AND user_id = me) THEN RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'P0001'; END IF;
  IF NOT gift_old_enough(b) THEN RAISE EXCEPTION 'gift_too_young' USING ERRCODE = 'P0001'; END IF;
  IF b.status = 'open' THEN
    UPDATE gift_boxes SET status = 'delivered', delivered_to = me, delivered_via = 'account', delivered_at = now(),
      receive_code_hash = NULL, receive_code_expires_at = NULL, updated_at = now() WHERE id = b.id;
    UPDATE gift_invites SET expires_at = least(expires_at, now()) WHERE box_id = b.id AND used_at IS NULL;
  ELSE
    -- Already a book: it reaches the child's account too; when it was handed over stays as it was.
    UPDATE gift_boxes SET delivered_to = me, receive_code_hash = NULL, receive_code_expires_at = NULL, updated_at = now() WHERE id = b.id;
  END IF;
  PERFORM gift_copy_to_records(b.id, me);
  RETURN b.id;
END $$;
--> statement-breakpoint

-- As before, saying whether the child has it in their account (for a box handed over as a book).
CREATE OR REPLACE FUNCTION gift_box_read(p_box uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); b gift_boxes%ROWTYPE; role text; everything boolean;
BEGIN
  SELECT * INTO b FROM gift_boxes WHERE id = p_box;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF b.delivered_to = me THEN role := 'child';
  ELSIF EXISTS (SELECT 1 FROM gift_writers WHERE box_id = p_box AND user_id = me AND removed_at IS NULL) THEN
    role := CASE WHEN b.owner_id = me THEN 'owner' ELSE 'writer' END;
  ELSE RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  everything := role = 'child' OR (role = 'owner' AND b.delivered_via = 'pdf');
  RETURN jsonb_build_object(
    'id', b.id, 'child_name', b.child_name, 'child_birthday', b.child_birthday, 'deliver_on', b.deliver_on,
    'status', b.status, 'delivered_via', b.delivered_via, 'delivered_at', b.delivered_at,
    'code_active', b.receive_code_hash IS NOT NULL AND b.receive_code_expires_at > now(),
    'received', b.delivered_to IS NOT NULL,
    'my_role', role, 'me', me,
    'owner_name', (SELECT display_name FROM profiles WHERE user_id = b.owner_id),
    'writers', coalesce((SELECT jsonb_agg(jsonb_build_object('user_id', w.user_id, 'name', p.display_name, 'role', w.role, 'label', w.label,
                                  'owner', w.user_id = b.owner_id, 'removed', w.removed_at IS NOT NULL) ORDER BY w.joined_at)
                         FROM gift_writers w JOIN profiles p ON p.user_id = w.user_id
                         WHERE w.box_id = p_box AND (w.removed_at IS NULL OR everything
                               OR EXISTS (SELECT 1 FROM gift_entries e WHERE e.box_id = p_box AND e.author_id = w.user_id AND e.kind = 'growth'))), '[]'::jsonb),
    'entries', coalesce((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'author_id', e.author_id, 'author_label', e.author_label, 'author_role', e.author_role,
                                  'kind', e.kind, 'occurred_on', e.occurred_on,
                                  'title', e.title, 'body', e.body, 'created_at', e.created_at) ORDER BY coalesce(e.occurred_on, e.created_at::date), e.created_at)
                         FROM gift_entries e
                         WHERE e.box_id = p_box AND (everything OR e.kind = 'growth' OR e.author_id = me)), '[]'::jsonb),
    'views', coalesce((SELECT jsonb_agg(jsonb_build_object('author_id', v.author_id, 'author_label', v.author_label, 'author_role', v.author_role,
                                  'answers', v.answers, 'comment', v.comment))
                       FROM gift_views v WHERE v.box_id = p_box AND (everything OR v.author_id = me)), '[]'::jsonb),
    'hidden_letters', CASE WHEN everything THEN 0 ELSE
       (SELECT count(*) FROM gift_entries e WHERE e.box_id = p_box AND e.kind = 'letter' AND e.author_id IS DISTINCT FROM me) END
  );
END $$;
