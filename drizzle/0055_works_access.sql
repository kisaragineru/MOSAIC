-- Works and their links belong to their owner. Someone with a link reads the work only through
-- work_open(), by the link's hash, while the link is neither expired nor taken back.
GRANT SELECT, INSERT, UPDATE, DELETE ON works, work_links TO mosaic_app;
--> statement-breakpoint
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE work_links ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON works FOR ALL TO mosaic_app USING (owner_id = app_current_user_id()) WITH CHECK (owner_id = app_current_user_id());
--> statement-breakpoint
CREATE POLICY owner_all ON work_links FOR ALL TO mosaic_app USING (owner_id = app_current_user_id())
  WITH CHECK (owner_id = app_current_user_id() AND EXISTS (SELECT 1 FROM works w WHERE w.id = work_id AND w.owner_id = app_current_user_id()));
--> statement-breakpoint

-- Open a work by its link (no sign-in needed). Notes when it was first opened by someone other
-- than its owner. Returns only what the page shows; nothing when the link doesn't exist.
CREATE OR REPLACE FUNCTION work_open(p_token_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); l work_links%ROWTYPE; w works%ROWTYPE;
BEGIN
  SELECT * INTO l FROM work_links WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF l.revoked_at IS NOT NULL OR l.expires_at <= now() THEN
    RETURN jsonb_build_object('status', 'closed');
  END IF;
  SELECT * INTO w FROM works WHERE id = l.work_id;
  IF me IS DISTINCT FROM l.owner_id AND l.opened_at IS NULL THEN
    UPDATE work_links SET opened_at = now() WHERE id = l.id;
  END IF;
  RETURN jsonb_build_object(
    'status', 'open', 'link_id', l.id, 'owner_id', l.owner_id, 'mine', me IS NOT DISTINCT FROM l.owner_id,
    'title', w.title, 'locale', w.locale, 'content', w.content, 'note', l.note, 'expires_at', l.expires_at);
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION work_open(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION work_open(text) TO mosaic_app;
