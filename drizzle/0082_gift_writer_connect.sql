-- A received gift box: the child can connect with the people who wrote it, in one tap.
-- The writers' agreement is what they wrote for the child; the child taps. Nothing is shown to
-- each other yet (each chooses later). A pair whose connection was ended before is not offered:
-- MOSAIC doesn't bring back what someone ended.

-- The box's writers, for the child who received it into their account: who they are, and whether
-- we are connected (and placed in my People) already.
CREATE OR REPLACE FUNCTION gift_writers_for_child(p_box uuid)
RETURNS TABLE (user_id uuid, name text, label text, role text, session_id uuid, person_id uuid, offer boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM gift_boxes b WHERE b.id = p_box AND b.delivered_to = me) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN QUERY
    SELECT w.user_id, p.display_name, w.label, w.role, s.id,
           (SELECT pe.id FROM people pe WHERE pe.user_id = me AND pe.connection_session_id = s.id LIMIT 1),
           s.id IS NULL AND NOT EXISTS (
             SELECT 1 FROM comparison_sessions r
             WHERE r.status = 'revoked' AND ((r.user_a = w.user_id AND r.user_b = me) OR (r.user_a = me AND r.user_b = w.user_id)))
    FROM gift_writers w
    JOIN profiles p ON p.user_id = w.user_id
    LEFT JOIN LATERAL (
      SELECT cs.id FROM comparison_sessions cs
      WHERE cs.status = 'active' AND ((cs.user_a = w.user_id AND cs.user_b = me) OR (cs.user_a = me AND cs.user_b = w.user_id))
      LIMIT 1
    ) s ON true
    WHERE w.box_id = p_box AND w.removed_at IS NULL AND w.user_id <> me
    ORDER BY w.joined_at;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION gift_writers_for_child(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION gift_writers_for_child(uuid) TO mosaic_app;
--> statement-breakpoint

-- Connect with one of the box's writers: a waiting connection between us is completed, otherwise
-- a new one starts, connected at once with nothing chosen to show. Returns our connection.
CREATE OR REPLACE FUNCTION gift_writer_connect(p_box uuid, p_writer uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); s comparison_sessions%ROWTYPE; sid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM gift_boxes b WHERE b.id = p_box AND b.delivered_to = me)
     OR NOT EXISTS (SELECT 1 FROM gift_writers w WHERE w.box_id = p_box AND w.user_id = p_writer AND w.removed_at IS NULL)
     OR p_writer = me THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO s FROM comparison_sessions
   WHERE status <> 'revoked' AND ((user_a = p_writer AND user_b = me) OR (user_a = me AND user_b = p_writer))
   LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    sid := s.id;
  ELSE
    IF EXISTS (SELECT 1 FROM comparison_sessions r
               WHERE r.status = 'revoked' AND ((r.user_a = p_writer AND r.user_b = me) OR (r.user_a = me AND r.user_b = p_writer))) THEN
      RAISE EXCEPTION 'connection_ended' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO comparison_sessions (user_a, user_b) VALUES (p_writer, me) RETURNING id INTO sid;
  END IF;
  INSERT INTO comparison_consents (session_id, user_id, scopes, consent_text_version)
  SELECT sid, u, ARRAY[]::text[], 'gift-box-2026-10'
  FROM unnest(ARRAY[p_writer, me]) u
  WHERE NOT EXISTS (SELECT 1 FROM comparison_consents c WHERE c.session_id = sid AND c.user_id = u AND c.withdrawn_at IS NULL);
  UPDATE comparison_sessions SET status = 'active' WHERE id = sid;
  RETURN sid;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION gift_writer_connect(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION gift_writer_connect(uuid, uuid) TO mosaic_app;
