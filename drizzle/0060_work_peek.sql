-- Reading a work's link no longer counts as "opened" by itself: link previews (LINE, Slack…)
-- fetch the page too. work_peek() returns what the page shows without noting anything;
-- work_mark_opened() notes the first opening, when the reader actually opens the envelope.
CREATE OR REPLACE FUNCTION work_peek(p_token_hash text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); l work_links%ROWTYPE; w works%ROWTYPE;
BEGIN
  SELECT * INTO l FROM work_links WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF l.revoked_at IS NOT NULL OR l.expires_at <= now() THEN
    RETURN jsonb_build_object('status', 'closed');
  END IF;
  SELECT * INTO w FROM works WHERE id = l.work_id;
  RETURN jsonb_build_object(
    'status', 'open', 'link_id', l.id, 'owner_id', l.owner_id, 'mine', me IS NOT DISTINCT FROM l.owner_id,
    'title', w.title, 'locale', w.locale, 'content', w.content, 'note', l.note, 'expires_at', l.expires_at);
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION work_mark_opened(p_token_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  UPDATE work_links SET opened_at = now()
   WHERE token_hash = p_token_hash AND opened_at IS NULL AND revoked_at IS NULL AND expires_at > now()
     AND owner_id IS DISTINCT FROM me;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION work_peek(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION work_peek(text) TO mosaic_app;
--> statement-breakpoint
REVOKE ALL ON FUNCTION work_mark_opened(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION work_mark_opened(text) TO mosaic_app;
