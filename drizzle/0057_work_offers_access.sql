-- Offers to connect, from a work someone was handed. Both the writer and the reader can see their
-- offer; it changes only through these functions.
GRANT SELECT ON work_offers TO mosaic_app;
--> statement-breakpoint
ALTER TABLE work_offers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY parties_read ON work_offers FOR SELECT TO mosaic_app USING (app_current_user_id() IN (owner_id, recipient_id));
--> statement-breakpoint

-- I read a work I was handed (signed in, or just signed up from its link): keep the writer's offer.
-- Nothing when the link is gone or closed, or the work is my own.
CREATE OR REPLACE FUNCTION work_offer_record(p_token_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); l work_links%ROWTYPE; oid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO l FROM work_links WHERE token_hash = p_token_hash;
  IF NOT FOUND OR l.owner_id = me OR l.revoked_at IS NOT NULL OR l.expires_at <= now() THEN RETURN NULL; END IF;
  INSERT INTO work_offers (link_id, owner_id, recipient_id) VALUES (l.id, l.owner_id, me)
  ON CONFLICT (link_id, recipient_id) DO NOTHING;
  SELECT id INTO oid FROM work_offers WHERE link_id = l.id AND recipient_id = me;
  RETURN oid;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION work_offer_record(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION work_offer_record(text) TO mosaic_app;
--> statement-breakpoint

-- Take the offer: connected in one step, with nothing shown to each other yet (each chooses later).
-- The writer's agreement is the work they handed over. An existing connection is reused.
CREATE OR REPLACE FUNCTION work_offer_accept(p_offer uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); o work_offers%ROWTYPE; s comparison_sessions%ROWTYPE; sid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO o FROM work_offers WHERE id = p_offer AND recipient_id = me FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO s FROM comparison_sessions
   WHERE status <> 'revoked' AND ((user_a = o.owner_id AND user_b = me) OR (user_a = me AND user_b = o.owner_id))
   LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    sid := s.id;
  ELSE
    INSERT INTO comparison_sessions (user_a, user_b) VALUES (o.owner_id, me) RETURNING id INTO sid;
  END IF;
  -- Whoever hasn't agreed yet agrees to connect, choosing nothing to show.
  INSERT INTO comparison_consents (session_id, user_id, scopes, consent_text_version)
  SELECT sid, u, ARRAY[]::text[], 'work-offer-2026-10'
  FROM unnest(ARRAY[o.owner_id, me]) u
  WHERE NOT EXISTS (SELECT 1 FROM comparison_consents c WHERE c.session_id = sid AND c.user_id = u AND c.withdrawn_at IS NULL);
  UPDATE comparison_sessions SET status = 'active' WHERE id = sid;
  UPDATE work_offers SET accepted_at = coalesce(accepted_at, now()), dismissed_at = NULL, session_id = sid WHERE id = o.id;
  RETURN sid;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION work_offer_accept(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION work_offer_accept(uuid) TO mosaic_app;
--> statement-breakpoint

-- The reader: put the offer aside, or say whether to tell the writer they started their own story.
CREATE OR REPLACE FUNCTION work_offer_update(p_offer uuid, p_dismiss boolean, p_start text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF p_start IS NOT NULL AND p_start NOT IN ('told', 'kept') THEN RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023'; END IF;
  UPDATE work_offers
     SET dismissed_at = CASE WHEN p_dismiss THEN now() ELSE dismissed_at END,
         start_answer = coalesce(p_start, start_answer)
   WHERE id = p_offer AND recipient_id = me;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION work_offer_update(uuid, boolean, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION work_offer_update(uuid, boolean, text) TO mosaic_app;
--> statement-breakpoint

-- The writer has been told (that someone connected, or started their own story): Home says it once.
CREATE OR REPLACE FUNCTION work_offer_seen() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE work_offers SET accepted_seen_at = coalesce(accepted_seen_at, CASE WHEN accepted_at IS NOT NULL THEN now() END),
                         start_seen_at = coalesce(start_seen_at, CASE WHEN start_answer = 'told' THEN now() END)
   WHERE owner_id = app_current_user_id();
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION work_offer_seen() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION work_offer_seen() TO mosaic_app;
--> statement-breakpoint

-- A work I was handed and connected over: still mine to read after the link's time ran out, while
-- we stay connected and the writer hasn't taken the link back.
CREATE OR REPLACE FUNCTION work_offer_read(p_offer uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); o work_offers%ROWTYPE; l work_links%ROWTYPE; w works%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO o FROM work_offers WHERE id = p_offer AND recipient_id = me;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO l FROM work_links WHERE id = o.link_id;
  IF l.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('status', 'closed'); END IF;
  IF l.expires_at <= now() AND NOT (o.session_id IS NOT NULL AND EXISTS (SELECT 1 FROM comparison_sessions s WHERE s.id = o.session_id AND s.status = 'active')) THEN
    RETURN jsonb_build_object('status', 'closed');
  END IF;
  SELECT * INTO w FROM works WHERE id = l.work_id;
  RETURN jsonb_build_object('status', 'open', 'title', w.title, 'locale', w.locale, 'content', w.content, 'note', l.note);
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION work_offer_read(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION work_offer_read(uuid) TO mosaic_app;
--> statement-breakpoint

-- My offers as a reader, with the writer's name and the work's title.
CREATE OR REPLACE FUNCTION work_offers_mine()
RETURNS TABLE (id uuid, owner_name text, title text, created_at timestamptz, dismissed_at timestamptz, accepted_at timestamptz, session_id uuid, start_answer text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT o.id, p.display_name, w.title, o.created_at, o.dismissed_at, o.accepted_at,
           CASE WHEN EXISTS (SELECT 1 FROM comparison_sessions s WHERE s.id = o.session_id AND s.status = 'active') THEN o.session_id END,
           o.start_answer
    FROM work_offers o
    JOIN work_links l ON l.id = o.link_id
    JOIN works w ON w.id = l.work_id
    JOIN profiles p ON p.user_id = o.owner_id
    WHERE o.recipient_id = me
    ORDER BY o.created_at DESC;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION work_offers_mine() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION work_offers_mine() TO mosaic_app;
