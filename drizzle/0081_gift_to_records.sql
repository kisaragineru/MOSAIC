-- Gift boxes as the start of the child's own records:
--  * a writer's words stay in the box when they leave MOSAIC (under the name they wrote as);
--    an open box passes to the next writer, and closes only when nobody else writes in it;
--  * growth records take photos and videos like records do (memory_media.gift_entry_id),
--    read under the box's rules;
--  * receiving the box copies its growth records and letters, with their photos, into the
--    child's records: private, dated, and saying who wrote them;
--  * the box is handed over only from 13, as the terms of use say (when the birthday is known).

-- Who wrote it, kept as the writer leaves; their open boxes pass on; their photos stay with the box.
CREATE OR REPLACE FUNCTION gift_user_leaving() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE b record; heir uuid;
BEGIN
  UPDATE gift_entries e SET author_label = w.label, author_role = w.role
    FROM gift_writers w WHERE w.box_id = e.box_id AND w.user_id = OLD.id AND e.author_id = OLD.id;
  UPDATE gift_views v SET author_label = w.label, author_role = w.role
    FROM gift_writers w WHERE w.box_id = v.box_id AND w.user_id = OLD.id AND v.author_id = OLD.id;
  FOR b IN SELECT id FROM gift_boxes WHERE owner_id = OLD.id AND status = 'open' FOR UPDATE LOOP
    heir := (SELECT user_id FROM gift_writers WHERE box_id = b.id AND user_id <> OLD.id AND removed_at IS NULL ORDER BY joined_at LIMIT 1);
    IF heir IS NULL THEN
      DELETE FROM gift_boxes WHERE id = b.id;
    ELSE
      UPDATE gift_boxes SET owner_id = heir, updated_at = now() WHERE id = b.id;
    END IF;
  END LOOP;
  UPDATE memory_media m
     SET user_id = CASE WHEN bx.owner_id IS NULL OR bx.owner_id = OLD.id THEN bx.delivered_to ELSE bx.owner_id END
    FROM gift_entries e JOIN gift_boxes bx ON bx.id = e.box_id
   WHERE m.gift_entry_id = e.id AND m.user_id = OLD.id
     AND (CASE WHEN bx.owner_id IS NULL OR bx.owner_id = OLD.id THEN bx.delivered_to ELSE bx.owner_id END) IS NOT NULL;
  RETURN OLD;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION gift_user_leaving() FROM PUBLIC;
--> statement-breakpoint
DROP TRIGGER IF EXISTS gift_user_leaving ON users;
--> statement-breakpoint
CREATE TRIGGER gift_user_leaving BEFORE DELETE ON users FOR EACH ROW EXECUTE FUNCTION gift_user_leaving();
--> statement-breakpoint

-- As before, but an ownerless (delivered) box is nobody's to manage.
CREATE OR REPLACE FUNCTION gift_box_for(p_box uuid, p_owner_only boolean, p_must_be_open boolean) RETURNS gift_boxes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); b gift_boxes%ROWTYPE;
BEGIN
  SELECT * INTO b FROM gift_boxes WHERE id = p_box FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p_owner_only AND b.owner_id IS DISTINCT FROM me THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF NOT p_owner_only AND NOT EXISTS (SELECT 1 FROM gift_writers w WHERE w.box_id = p_box AND w.user_id = me AND w.removed_at IS NULL) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF p_must_be_open AND b.status <> 'open' THEN RAISE EXCEPTION 'gift_delivered' USING ERRCODE = 'P0001'; END IF;
  RETURN b;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION gift_box_for(uuid, boolean, boolean) FROM PUBLIC;
--> statement-breakpoint

-- Whether a growth record's photos may be seen: the same rule as reading the record in the box.
CREATE OR REPLACE FUNCTION gift_media_visible(p_gift_entry uuid, p_viewer uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM gift_entries e JOIN gift_boxes b ON b.id = e.box_id
    WHERE e.id = p_gift_entry
      AND (b.delivered_to = p_viewer
           OR (b.owner_id = p_viewer AND b.delivered_via = 'pdf')
           OR ((e.kind = 'growth' OR e.author_id = p_viewer)
               AND EXISTS (SELECT 1 FROM gift_writers w WHERE w.box_id = b.id AND w.user_id = p_viewer AND w.removed_at IS NULL))))
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION gift_media_visible(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint

-- Uploads waiting for a record: those already on a growth record are not waiting.
CREATE OR REPLACE FUNCTION memory_media_create(p_kind text, p_mime text, p_width int, p_height int, p_duration_ms int, p_size int, p_chunks int, p_thumb bytea) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  -- Uploads never attached to a record are dropped after a day.
  DELETE FROM memory_media WHERE user_id = me AND entry_id IS NULL AND gift_entry_id IS NULL AND created_at < now() - interval '1 day';
  IF (SELECT count(*) FROM memory_media WHERE user_id = me AND entry_id IS NULL AND gift_entry_id IS NULL) >= 15 THEN RAISE EXCEPTION 'too_many_uploads' USING ERRCODE = 'P0001'; END IF;
  IF p_kind NOT IN ('image', 'video')
     OR (p_kind = 'image' AND (p_mime NOT IN ('image/jpeg','image/png','image/webp') OR p_size > 4194304 OR p_chunks <> 1))
     OR (p_kind = 'video' AND (p_mime NOT IN ('video/mp4','video/quicktime','video/webm') OR p_size > 31457280 OR p_chunks <> ceil(p_size / 4194304.0)))
     OR p_size < 1 OR octet_length(p_thumb) NOT BETWEEN 1 AND 300000
     OR p_width NOT BETWEEN 1 AND 10000 OR p_height NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'invalid_media' USING ERRCODE = '22023';
  END IF;
  INSERT INTO memory_media (user_id, kind, mime, width, height, duration_ms, size, chunks, thumb)
  VALUES (me, p_kind, p_mime, p_width, p_height, CASE WHEN p_kind = 'video' THEN greatest(p_duration_ms, 0) END, p_size, p_chunks, p_thumb)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;
--> statement-breakpoint

-- As before; a photo already on a growth record can't be moved onto a record.
CREATE OR REPLACE FUNCTION memory_media_attach(p_entry uuid, p_ids uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); e memory_entries; ids uuid[] := coalesce(p_ids, '{}'); i int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO e FROM memory_entries WHERE id = p_entry AND user_id = me;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF cardinality(ids) > 5 OR (SELECT count(DISTINCT x) FROM unnest(ids) x) <> cardinality(ids) THEN RAISE EXCEPTION 'too_many_media' USING ERRCODE = '22023'; END IF;
  IF cardinality(ids) > 0 AND e.kind = 'letter_to_future' THEN RAISE EXCEPTION 'invalid_media' USING ERRCODE = '22023'; END IF;
  IF (SELECT count(*) FROM memory_media WHERE id = ANY (ids) AND user_id = me AND complete AND gift_entry_id IS NULL AND (entry_id IS NULL OR entry_id = p_entry)) <> cardinality(ids) THEN
    RAISE EXCEPTION 'invalid_media' USING ERRCODE = '22023';
  END IF;
  DELETE FROM memory_media WHERE entry_id = p_entry AND user_id = me AND NOT (id = ANY (ids));
  FOR i IN 1 .. cardinality(ids) LOOP
    UPDATE memory_media SET entry_id = p_entry, position = i - 1 WHERE id = ids[i];
  END LOOP;
END $$;
--> statement-breakpoint

-- Reading one item: a record's rule, or the gift box's for a growth record's photo.
CREATE OR REPLACE FUNCTION memory_media_get(p_id uuid)
RETURNS TABLE (kind text, mime text, size int, chunks smallint, complete boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT m.kind, m.mime, m.size, m.chunks, m.complete FROM memory_media m
    WHERE m.id = p_id AND (memory_media_visible(m.user_id, m.entry_id, m.complete, me)
                           OR (m.complete AND m.gift_entry_id IS NOT NULL AND gift_media_visible(m.gift_entry_id, me)));
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION memory_media_thumb(p_id uuid) RETURNS bytea
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN (SELECT m.thumb FROM memory_media m WHERE m.id = p_id
          AND (memory_media_visible(m.user_id, m.entry_id, m.complete, me)
               OR (m.complete AND m.gift_entry_id IS NOT NULL AND gift_media_visible(m.gift_entry_id, me))));
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION memory_media_chunk(p_id uuid, p_idx int) RETURNS bytea
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN (SELECT c.bytes FROM memory_media m JOIN memory_media_chunks c ON c.media_id = m.id AND c.idx = p_idx
          WHERE m.id = p_id AND m.complete
            AND (memory_media_visible(m.user_id, m.entry_id, m.complete, me)
                 OR (m.gift_entry_id IS NOT NULL AND gift_media_visible(m.gift_entry_id, me))));
END $$;
--> statement-breakpoint

-- A growth record or letter, now like a record: a growth record may be photos alone (up to 5,
-- my own finished uploads, in this order); a letter is words only.
CREATE OR REPLACE FUNCTION gift_entry_save(p_id uuid, p_box uuid, p_kind text, p_occurred date, p_title text, p_body text, p_media uuid[]) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); b gift_boxes; eid uuid; ids uuid[] := coalesce(p_media, '{}'); v_body text := btrim(coalesce(p_body, '')); i int;
BEGIN
  b := gift_box_for(p_box, false, true);
  IF cardinality(ids) > 5 OR (SELECT count(DISTINCT x) FROM unnest(ids) x) <> cardinality(ids) THEN RAISE EXCEPTION 'too_many_media' USING ERRCODE = '22023'; END IF;
  IF p_kind = 'letter' AND cardinality(ids) > 0 THEN RAISE EXCEPTION 'invalid_media' USING ERRCODE = '22023'; END IF;
  IF v_body = '' AND cardinality(ids) = 0 THEN RAISE EXCEPTION 'empty_record' USING ERRCODE = '22023'; END IF;
  IF p_id IS NULL THEN
    IF (SELECT count(*) FROM gift_entries WHERE box_id = p_box AND author_id = me) >= 500 THEN RAISE EXCEPTION 'too_many_entries' USING ERRCODE = 'P0001'; END IF;
    INSERT INTO gift_entries (box_id, author_id, kind, occurred_on, title, body)
    VALUES (p_box, me, p_kind, p_occurred, nullif(btrim(p_title), ''), v_body) RETURNING id INTO eid;
  ELSE
    UPDATE gift_entries SET kind = p_kind, occurred_on = p_occurred, title = nullif(btrim(p_title), ''), body = v_body, updated_at = now()
    WHERE id = p_id AND box_id = p_box AND author_id = me RETURNING id INTO eid;
    IF eid IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  END IF;
  IF (SELECT count(*) FROM memory_media WHERE id = ANY (ids) AND user_id = me AND complete AND entry_id IS NULL AND (gift_entry_id IS NULL OR gift_entry_id = eid)) <> cardinality(ids) THEN
    RAISE EXCEPTION 'invalid_media' USING ERRCODE = '22023';
  END IF;
  DELETE FROM memory_media WHERE gift_entry_id = eid AND NOT (id = ANY (ids));
  FOR i IN 1 .. cardinality(ids) LOOP
    UPDATE memory_media SET gift_entry_id = eid, position = i - 1 WHERE id = ids[i];
  END LOOP;
  RETURN eid;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION gift_entry_delete(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); e gift_entries%ROWTYPE; b gift_boxes;
BEGIN
  SELECT * INTO e FROM gift_entries WHERE id = p_id;
  IF NOT FOUND OR e.author_id IS DISTINCT FROM me THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  b := gift_box_for(e.box_id, false, true);
  DELETE FROM gift_entries WHERE id = p_id;
END $$;
--> statement-breakpoint

-- The photos and videos of a box's records that I may see.
CREATE OR REPLACE FUNCTION gift_media_for(p_box uuid)
RETURNS TABLE (id uuid, entry_id uuid, "position" smallint, kind text, width int, height int, duration_ms int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me();
BEGIN
  RETURN QUERY
    SELECT m.id, m.gift_entry_id, m.position, m.kind, m.width, m.height, m.duration_ms
    FROM memory_media m JOIN gift_entries e ON e.id = m.gift_entry_id
    WHERE e.box_id = p_box AND m.complete AND gift_media_visible(e.id, me)
    ORDER BY m.gift_entry_id, m.position;
END $$;
--> statement-breakpoint

-- As before, with who wrote each record or view when the writer has left MOSAIC.
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
--> statement-breakpoint

-- Not before 13 (the terms of use), when the child's birthday is known.
CREATE OR REPLACE FUNCTION gift_old_enough(b gift_boxes) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT b.child_birthday IS NULL OR b.child_birthday <= (current_date - interval '13 years')::date
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION gift_old_enough(gift_boxes) FROM PUBLIC;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION gift_code_issue(p_box uuid, p_code_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE b gift_boxes;
BEGIN
  b := gift_box_for(p_box, true, true);
  IF b.deliver_on > current_date THEN RAISE EXCEPTION 'not_yet' USING ERRCODE = 'P0001'; END IF;
  IF NOT gift_old_enough(b) THEN RAISE EXCEPTION 'gift_too_young' USING ERRCODE = 'P0001'; END IF;
  UPDATE gift_boxes SET receive_code_hash = p_code_hash, receive_code_expires_at = now() + interval '30 days', updated_at = now() WHERE id = p_box;
END $$;
--> statement-breakpoint

-- The box's growth records and letters, with their photos, become the child's own records:
-- private, on the day they happened (a letter: the day it was written), saying who wrote them.
-- Each is copied once; the box keeps its own copy for the book.
CREATE OR REPLACE FUNCTION gift_copy_to_records(p_box uuid, p_child uuid) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE e record; m record; nid uuid; mid uuid; n int := 0;
BEGIN
  FOR e IN
    SELECT ge.*, w.label AS w_label, w.role AS w_role
    FROM gift_entries ge LEFT JOIN gift_writers w ON w.box_id = ge.box_id AND w.user_id = ge.author_id
    WHERE ge.box_id = p_box ORDER BY ge.created_at
  LOOP
    nid := NULL;
    INSERT INTO memory_entries (user_id, kind, occurred_on, visibility, labels, labels_by, from_gift_entry, from_label, from_role, from_kind)
    VALUES (p_child, 'memory', coalesce(CASE WHEN e.kind = 'growth' THEN e.occurred_on END, (e.created_at AT TIME ZONE 'UTC')::date), 'private', '{}', 'user',
            e.id, coalesce(e.w_label, e.author_label), coalesce(e.w_role, e.author_role), e.kind)
    ON CONFLICT (user_id, from_gift_entry) DO NOTHING
    RETURNING id INTO nid;
    CONTINUE WHEN nid IS NULL;
    INSERT INTO memory_entry_versions (entry_id, user_id, version, title, body) VALUES (nid, p_child, 1, e.title, e.body);
    FOR m IN SELECT * FROM memory_media WHERE gift_entry_id = e.id AND complete ORDER BY position LOOP
      INSERT INTO memory_media (user_id, entry_id, position, kind, mime, width, height, duration_ms, size, chunks, thumb, complete)
      VALUES (p_child, nid, m.position, m.kind, m.mime, m.width, m.height, m.duration_ms, m.size, m.chunks, m.thumb, true)
      RETURNING id INTO mid;
      INSERT INTO memory_media_chunks (media_id, idx, bytes) SELECT mid, c.idx, c.bytes FROM memory_media_chunks c WHERE c.media_id = m.id;
    END LOOP;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION gift_copy_to_records(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION gift_receive(p_code_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); b gift_boxes%ROWTYPE;
BEGIN
  SELECT * INTO b FROM gift_boxes WHERE receive_code_hash = p_code_hash FOR UPDATE;
  IF NOT FOUND OR b.status <> 'open' OR b.receive_code_expires_at < now() OR b.deliver_on > current_date THEN RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'P0001'; END IF;
  IF EXISTS (SELECT 1 FROM gift_writers WHERE box_id = b.id AND user_id = me) THEN RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'P0001'; END IF;
  IF NOT gift_old_enough(b) THEN RAISE EXCEPTION 'gift_too_young' USING ERRCODE = 'P0001'; END IF;
  UPDATE gift_boxes SET status = 'delivered', delivered_to = me, delivered_via = 'account', delivered_at = now(),
    receive_code_hash = NULL, receive_code_expires_at = NULL, updated_at = now() WHERE id = b.id;
  UPDATE gift_invites SET expires_at = least(expires_at, now()) WHERE box_id = b.id AND used_at IS NULL;
  PERFORM gift_copy_to_records(b.id, me);
  RETURN b.id;
END $$;
--> statement-breakpoint

-- Boxes already received before this: their records join the child's too.
DO $$
DECLARE b record;
BEGIN
  FOR b IN SELECT id, delivered_to FROM gift_boxes WHERE status = 'delivered' AND delivered_via = 'account' AND delivered_to IS NOT NULL LOOP
    PERFORM gift_copy_to_records(b.id, b.delivered_to);
  END LOOP;
END $$;
--> statement-breakpoint

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['gift_entry_save(uuid, uuid, text, date, text, text, uuid[])','gift_media_for(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
--> statement-breakpoint
-- The old six-argument save is replaced by the one with photos.
DROP FUNCTION IF EXISTS gift_entry_save(uuid, uuid, text, date, text, text);
