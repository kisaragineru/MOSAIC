ALTER TABLE "work_links" ADD COLUMN "locale" text;--> statement-breakpoint
ALTER TABLE "work_links" ADD CONSTRAINT "work_links_locale_ck" CHECK ("work_links"."locale" is null or "work_links"."locale" in ('ja','en','vi'));--> statement-breakpoint
-- As before, with the reader's language the owner chose for this link.
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
    'title', w.title, 'locale', w.locale, 'link_locale', l.locale, 'content', w.content, 'note', l.note, 'expires_at', l.expires_at);
END $$;
