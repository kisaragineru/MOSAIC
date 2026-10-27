-- A work read in the reader's language: translated once per link and language (the note on the
-- cover belongs to the link), kept so it isn't translated again. Read and written only through
-- these functions, by the link, while it's open.
CREATE TABLE work_link_translations (
  link_id uuid NOT NULL REFERENCES work_links(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('en', 'vi', 'ja')),
  title text NOT NULL,
  content jsonb NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (link_id, locale)
);
--> statement-breakpoint
ALTER TABLE work_link_translations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION work_translation_get(p_token_hash text, p_locale text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l work_links%ROWTYPE; tr work_link_translations%ROWTYPE;
BEGIN
  SELECT * INTO l FROM work_links WHERE token_hash = p_token_hash AND revoked_at IS NULL AND expires_at > now();
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO tr FROM work_link_translations WHERE link_id = l.id AND locale = p_locale;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('title', tr.title, 'content', tr.content, 'note', tr.note);
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION work_translation_put(p_token_hash text, p_locale text, p_title text, p_content jsonb, p_note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l work_links%ROWTYPE;
BEGIN
  SELECT * INTO l FROM work_links WHERE token_hash = p_token_hash AND revoked_at IS NULL AND expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO work_link_translations (link_id, locale, title, content, note)
  VALUES (l.id, p_locale, left(p_title, 200), p_content, left(p_note, 600))
  ON CONFLICT (link_id, locale) DO NOTHING;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION work_translation_get(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION work_translation_get(text, text) TO mosaic_app;
--> statement-breakpoint
REVOKE ALL ON FUNCTION work_translation_put(text, text, text, jsonb, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION work_translation_put(text, text, text, jsonb, text) TO mosaic_app;
