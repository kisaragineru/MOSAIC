-- Photos and videos on records. The tables are reached only through these functions:
-- the owner always; anyone else only while the record itself is shared with them
-- (memory_shared_session: same rules as reading the record).
ALTER TABLE memory_media ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE memory_media_chunks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION memory_media_visible(p_owner uuid, p_entry uuid, p_complete boolean, p_viewer uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_owner = p_viewer
      OR (p_complete AND p_entry IS NOT NULL AND memory_shared_session(p_entry, p_viewer) IS NOT NULL)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION memory_media_visible(uuid, uuid, boolean, uuid) FROM PUBLIC;
--> statement-breakpoint

-- Start an upload: its details and list picture now, the bytes in chunks after.
CREATE OR REPLACE FUNCTION memory_media_create(p_kind text, p_mime text, p_width int, p_height int, p_duration_ms int, p_size int, p_chunks int, p_thumb bytea) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  -- Uploads never attached to a record are dropped after a day.
  DELETE FROM memory_media WHERE user_id = me AND entry_id IS NULL AND created_at < now() - interval '1 day';
  IF (SELECT count(*) FROM memory_media WHERE user_id = me AND entry_id IS NULL) >= 15 THEN RAISE EXCEPTION 'too_many_uploads' USING ERRCODE = 'P0001'; END IF;
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

-- One part of my upload (4 MiB each, the last one the rest); true once every byte is in.
CREATE OR REPLACE FUNCTION memory_media_put(p_id uuid, p_idx int, p_bytes bytea) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); m memory_media; expected int; total bigint; parts int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO m FROM memory_media WHERE id = p_id AND user_id = me FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF m.complete OR p_idx < 0 OR p_idx >= m.chunks THEN RAISE EXCEPTION 'invalid_media' USING ERRCODE = '22023'; END IF;
  expected := CASE WHEN p_idx = m.chunks - 1 THEN m.size - 4194304 * (m.chunks - 1) ELSE 4194304 END;
  IF octet_length(p_bytes) <> expected THEN RAISE EXCEPTION 'invalid_media' USING ERRCODE = '22023'; END IF;
  INSERT INTO memory_media_chunks (media_id, idx, bytes) VALUES (p_id, p_idx, p_bytes)
  ON CONFLICT (media_id, idx) DO UPDATE SET bytes = excluded.bytes;
  SELECT count(*), coalesce(sum(octet_length(bytes)), 0) INTO parts, total FROM memory_media_chunks WHERE media_id = p_id;
  IF parts = m.chunks AND total = m.size THEN
    UPDATE memory_media SET complete = true WHERE id = p_id;
    RETURN true;
  END IF;
  RETURN false;
END $$;
--> statement-breakpoint

-- The record's photos and videos, in this order (at most 5, uploads of mine that are complete);
-- any it had that aren't in the list are deleted. Letters to the future take none.
CREATE OR REPLACE FUNCTION memory_media_attach(p_entry uuid, p_ids uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id(); e memory_entries; ids uuid[] := coalesce(p_ids, '{}'); i int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO e FROM memory_entries WHERE id = p_entry AND user_id = me;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF cardinality(ids) > 5 OR (SELECT count(DISTINCT x) FROM unnest(ids) x) <> cardinality(ids) THEN RAISE EXCEPTION 'too_many_media' USING ERRCODE = '22023'; END IF;
  IF cardinality(ids) > 0 AND e.kind = 'letter_to_future' THEN RAISE EXCEPTION 'invalid_media' USING ERRCODE = '22023'; END IF;
  IF (SELECT count(*) FROM memory_media WHERE id = ANY (ids) AND user_id = me AND complete AND (entry_id IS NULL OR entry_id = p_entry)) <> cardinality(ids) THEN
    RAISE EXCEPTION 'invalid_media' USING ERRCODE = '22023';
  END IF;
  DELETE FROM memory_media WHERE entry_id = p_entry AND user_id = me AND NOT (id = ANY (ids));
  FOR i IN 1 .. cardinality(ids) LOOP
    UPDATE memory_media SET entry_id = p_entry, position = i - 1 WHERE id = ids[i];
  END LOOP;
END $$;
--> statement-breakpoint

-- Photos and videos of records I may read (mine, or shared with me), for lists.
CREATE OR REPLACE FUNCTION memory_media_for(p_entries uuid[])
RETURNS TABLE (id uuid, entry_id uuid, "position" smallint, kind text, mime text, width int, height int, duration_ms int, size int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT m.id, m.entry_id, m.position, m.kind, m.mime, m.width, m.height, m.duration_ms, m.size
    FROM memory_media m
    WHERE m.entry_id = ANY (p_entries[1:500]) AND m.complete AND memory_media_visible(m.user_id, m.entry_id, m.complete, me)
    ORDER BY m.entry_id, m.position;
END $$;
--> statement-breakpoint

-- One item's details, its list picture, and a part of its bytes, under the same rule.
CREATE OR REPLACE FUNCTION memory_media_get(p_id uuid)
RETURNS TABLE (kind text, mime text, size int, chunks smallint, complete boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT m.kind, m.mime, m.size, m.chunks, m.complete FROM memory_media m
    WHERE m.id = p_id AND memory_media_visible(m.user_id, m.entry_id, m.complete, me);
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION memory_media_thumb(p_id uuid) RETURNS bytea
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN (SELECT m.thumb FROM memory_media m WHERE m.id = p_id AND memory_media_visible(m.user_id, m.entry_id, m.complete, me));
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION memory_media_chunk(p_id uuid, p_idx int) RETURNS bytea
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN (SELECT c.bytes FROM memory_media m JOIN memory_media_chunks c ON c.media_id = m.id AND c.idx = p_idx
          WHERE m.id = p_id AND m.complete AND memory_media_visible(m.user_id, m.entry_id, m.complete, me));
END $$;
--> statement-breakpoint

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['memory_media_create(text,text,int,int,int,int,int,bytea)','memory_media_put(uuid,int,bytea)','memory_media_attach(uuid,uuid[])',
                           'memory_media_for(uuid[])','memory_media_get(uuid)','memory_media_thumb(uuid)','memory_media_chunk(uuid,int)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
