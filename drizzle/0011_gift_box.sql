CREATE TABLE "gift_boxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"child_name" text NOT NULL,
	"child_birthday" date,
	"deliver_on" date NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"delivered_to" uuid,
	"delivered_via" text,
	"delivered_at" timestamp with time zone,
	"receive_code_hash" text,
	"receive_code_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_boxes_status_ck" CHECK ("gift_boxes"."status" in ('open','delivered')),
	CONSTRAINT "gift_boxes_via_ck" CHECK ("gift_boxes"."delivered_via" is null or "gift_boxes"."delivered_via" in ('account','pdf')),
	CONSTRAINT "gift_boxes_child_ck" CHECK (char_length("gift_boxes"."child_name") between 1 and 60)
);
--> statement-breakpoint
CREATE TABLE "gift_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"box_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"occurred_on" date,
	"title" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_entries_kind_ck" CHECK ("gift_entries"."kind" in ('growth','letter')),
	CONSTRAINT "gift_entries_title_ck" CHECK ("gift_entries"."title" is null or char_length("gift_entries"."title") <= 120),
	CONSTRAINT "gift_entries_body_ck" CHECK (char_length("gift_entries"."body") between 1 and 5000)
);
--> statement-breakpoint
CREATE TABLE "gift_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"box_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"role" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_by" uuid,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_invites_role_ck" CHECK ("gift_invites"."role" in ('father','mother','parent','grandfather','grandmother','grandparent'))
);
--> statement-breakpoint
CREATE TABLE "gift_views" (
	"box_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"comment" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_views_box_id_author_id_pk" PRIMARY KEY("box_id","author_id"),
	CONSTRAINT "gift_views_comment_ck" CHECK ("gift_views"."comment" is null or char_length("gift_views"."comment") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "gift_writers" (
	"box_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"label" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	CONSTRAINT "gift_writers_box_id_user_id_pk" PRIMARY KEY("box_id","user_id"),
	CONSTRAINT "gift_writers_role_ck" CHECK ("gift_writers"."role" in ('father','mother','parent','grandfather','grandmother','grandparent')),
	CONSTRAINT "gift_writers_label_ck" CHECK ("gift_writers"."label" is null or char_length("gift_writers"."label") <= 20)
);
--> statement-breakpoint
ALTER TABLE "gift_boxes" ADD CONSTRAINT "gift_boxes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_boxes" ADD CONSTRAINT "gift_boxes_delivered_to_users_id_fk" FOREIGN KEY ("delivered_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_entries" ADD CONSTRAINT "gift_entries_box_id_gift_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."gift_boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_entries" ADD CONSTRAINT "gift_entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_invites" ADD CONSTRAINT "gift_invites_box_id_gift_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."gift_boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_invites" ADD CONSTRAINT "gift_invites_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_views" ADD CONSTRAINT "gift_views_box_id_gift_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."gift_boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_views" ADD CONSTRAINT "gift_views_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_writers" ADD CONSTRAINT "gift_writers_box_id_gift_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."gift_boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_writers" ADD CONSTRAINT "gift_writers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gift_boxes_owner_idx" ON "gift_boxes" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_boxes_code_uq" ON "gift_boxes" USING btree ("receive_code_hash");--> statement-breakpoint
CREATE INDEX "gift_entries_box_idx" ON "gift_entries" USING btree ("box_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_invites_code_uq" ON "gift_invites" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "gift_writers_user_idx" ON "gift_writers" USING btree ("user_id");--> statement-breakpoint
-- No direct access for the app role: everything goes through the functions below.
ALTER TABLE gift_boxes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gift_writers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gift_invites ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gift_entries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE gift_views ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gift_me() RETURNS uuid
LANGUAGE plpgsql STABLE AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN me;
END $$;
--> statement-breakpoint
-- The box, locked for update, if I may manage it (owner) or write in it (active writer); else not_found.
CREATE OR REPLACE FUNCTION gift_box_for(p_box uuid, p_owner_only boolean, p_must_be_open boolean) RETURNS gift_boxes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); b gift_boxes%ROWTYPE;
BEGIN
  SELECT * INTO b FROM gift_boxes WHERE id = p_box FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF p_owner_only AND b.owner_id <> me THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF NOT p_owner_only AND NOT EXISTS (SELECT 1 FROM gift_writers w WHERE w.box_id = p_box AND w.user_id = me AND w.removed_at IS NULL) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF p_must_be_open AND b.status <> 'open' THEN RAISE EXCEPTION 'gift_delivered' USING ERRCODE = 'P0001'; END IF;
  RETURN b;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gift_box_create(p_child text, p_birthday date, p_deliver date, p_role text, p_label text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); bid uuid;
BEGIN
  IF (SELECT count(*) FROM gift_boxes WHERE owner_id = me AND status = 'open') >= 10 THEN RAISE EXCEPTION 'too_many_boxes' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO gift_boxes (owner_id, child_name, child_birthday, deliver_on) VALUES (me, btrim(p_child), p_birthday, p_deliver) RETURNING id INTO bid;
  INSERT INTO gift_writers (box_id, user_id, role, label) VALUES (bid, me, p_role, nullif(btrim(p_label), ''));
  RETURN bid;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gift_box_update(p_box uuid, p_child text, p_birthday date, p_deliver date) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE b gift_boxes;
BEGIN
  b := gift_box_for(p_box, true, true);
  UPDATE gift_boxes SET child_name = btrim(p_child), child_birthday = p_birthday, deliver_on = p_deliver,
    -- A new date invalidates a receive code issued for the old one.
    receive_code_hash = CASE WHEN p_deliver = b.deliver_on THEN receive_code_hash END,
    receive_code_expires_at = CASE WHEN p_deliver = b.deliver_on THEN receive_code_expires_at END,
    updated_at = now()
  WHERE id = p_box;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gift_invite_create(p_box uuid, p_role text, p_code_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE b gift_boxes;
BEGIN
  b := gift_box_for(p_box, true, true);
  INSERT INTO gift_invites (box_id, code_hash, role, expires_at) VALUES (p_box, p_code_hash, p_role, now() + interval '14 days');
END $$;
--> statement-breakpoint
-- Join a box as a writer (parents and grandparents only: at most six writers, four grandparents).
CREATE OR REPLACE FUNCTION gift_invite_accept(p_code_hash text, p_label text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); i gift_invites%ROWTYPE; b gift_boxes%ROWTYPE;
BEGIN
  SELECT * INTO i FROM gift_invites WHERE code_hash = p_code_hash FOR UPDATE;
  IF NOT FOUND OR i.used_at IS NOT NULL OR i.expires_at < now() THEN RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO b FROM gift_boxes WHERE id = i.box_id FOR UPDATE;
  IF b.status <> 'open' THEN RAISE EXCEPTION 'gift_delivered' USING ERRCODE = 'P0001'; END IF;
  IF b.delivered_to = me THEN RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'P0001'; END IF;
  IF EXISTS (SELECT 1 FROM gift_writers WHERE box_id = b.id AND user_id = me AND removed_at IS NULL) THEN RAISE EXCEPTION 'already_writer' USING ERRCODE = 'P0001'; END IF;
  IF (SELECT count(*) FROM gift_writers WHERE box_id = b.id AND removed_at IS NULL) >= 6 THEN RAISE EXCEPTION 'too_many_writers' USING ERRCODE = 'P0001'; END IF;
  IF i.role IN ('grandfather','grandmother','grandparent')
     AND (SELECT count(*) FROM gift_writers WHERE box_id = b.id AND removed_at IS NULL AND role IN ('grandfather','grandmother','grandparent')) >= 4 THEN
    RAISE EXCEPTION 'too_many_writers' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO gift_writers (box_id, user_id, role, label) VALUES (b.id, me, i.role, nullif(btrim(p_label), ''))
  ON CONFLICT (box_id, user_id) DO UPDATE SET role = excluded.role, label = excluded.label, removed_at = NULL, joined_at = now();
  UPDATE gift_invites SET used_by = me, used_at = now() WHERE id = i.id;
  RETURN b.id;
END $$;
--> statement-breakpoint
-- The owner removes a writer and decides whether what they wrote stays in the box.
CREATE OR REPLACE FUNCTION gift_writer_remove(p_box uuid, p_user uuid, p_keep boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE b gift_boxes;
BEGIN
  b := gift_box_for(p_box, true, true);
  IF p_user = b.owner_id THEN RAISE EXCEPTION 'cannot_remove_owner' USING ERRCODE = 'P0001'; END IF;
  UPDATE gift_writers SET removed_at = now() WHERE box_id = p_box AND user_id = p_user AND removed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF NOT coalesce(p_keep, true) THEN
    DELETE FROM gift_entries WHERE box_id = p_box AND author_id = p_user;
    DELETE FROM gift_views WHERE box_id = p_box AND author_id = p_user;
  END IF;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gift_entry_save(p_id uuid, p_box uuid, p_kind text, p_occurred date, p_title text, p_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); b gift_boxes; eid uuid;
BEGIN
  b := gift_box_for(p_box, false, true);
  IF p_id IS NULL THEN
    IF (SELECT count(*) FROM gift_entries WHERE box_id = p_box AND author_id = me) >= 500 THEN RAISE EXCEPTION 'too_many_entries' USING ERRCODE = 'P0001'; END IF;
    INSERT INTO gift_entries (box_id, author_id, kind, occurred_on, title, body)
    VALUES (p_box, me, p_kind, p_occurred, nullif(btrim(p_title), ''), btrim(p_body)) RETURNING id INTO eid;
  ELSE
    UPDATE gift_entries SET kind = p_kind, occurred_on = p_occurred, title = nullif(btrim(p_title), ''), body = btrim(p_body), updated_at = now()
    WHERE id = p_id AND box_id = p_box AND author_id = me RETURNING id INTO eid;
    IF eid IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  END IF;
  RETURN eid;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gift_entry_delete(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); e gift_entries%ROWTYPE; b gift_boxes;
BEGIN
  SELECT * INTO e FROM gift_entries WHERE id = p_id;
  IF NOT FOUND OR e.author_id <> me THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  b := gift_box_for(e.box_id, false, true);
  DELETE FROM gift_entries WHERE id = p_id;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gift_view_save(p_box uuid, p_answers jsonb, p_comment text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); b gift_boxes;
BEGIN
  b := gift_box_for(p_box, false, true);
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object'
     OR EXISTS (SELECT 1 FROM jsonb_each(p_answers) e WHERE NOT (e.key = ANY (peer_axis_keys())) OR e.value::text NOT IN ('1','0','-1')) THEN
    RAISE EXCEPTION 'invalid_answers' USING ERRCODE = '22023';
  END IF;
  INSERT INTO gift_views (box_id, author_id, answers, comment) VALUES (p_box, me, p_answers, nullif(btrim(p_comment), ''))
  ON CONFLICT (box_id, author_id) DO UPDATE SET answers = excluded.answers, comment = excluded.comment, updated_at = now();
END $$;
--> statement-breakpoint
-- Once the date has come, the owner issues a one-time code for the child (valid 30 days).
CREATE OR REPLACE FUNCTION gift_code_issue(p_box uuid, p_code_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE b gift_boxes;
BEGIN
  b := gift_box_for(p_box, true, true);
  IF b.deliver_on > current_date THEN RAISE EXCEPTION 'not_yet' USING ERRCODE = 'P0001'; END IF;
  UPDATE gift_boxes SET receive_code_hash = p_code_hash, receive_code_expires_at = now() + interval '30 days', updated_at = now() WHERE id = p_box;
END $$;
--> statement-breakpoint
-- The child receives the box with their own account. After this nobody can write in it.
CREATE OR REPLACE FUNCTION gift_receive(p_code_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := gift_me(); b gift_boxes%ROWTYPE;
BEGIN
  SELECT * INTO b FROM gift_boxes WHERE receive_code_hash = p_code_hash FOR UPDATE;
  IF NOT FOUND OR b.status <> 'open' OR b.receive_code_expires_at < now() OR b.deliver_on > current_date THEN RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'P0001'; END IF;
  IF EXISTS (SELECT 1 FROM gift_writers WHERE box_id = b.id AND user_id = me) THEN RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'P0001'; END IF;
  UPDATE gift_boxes SET status = 'delivered', delivered_to = me, delivered_via = 'account', delivered_at = now(),
    receive_code_hash = NULL, receive_code_expires_at = NULL, updated_at = now() WHERE id = b.id;
  UPDATE gift_invites SET expires_at = least(expires_at, now()) WHERE box_id = b.id AND used_at IS NULL;
  RETURN b.id;
END $$;
--> statement-breakpoint
-- For a child without an account: the owner closes the box and hands it over as a printed book.
CREATE OR REPLACE FUNCTION gift_deliver_pdf(p_box uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE b gift_boxes;
BEGIN
  b := gift_box_for(p_box, true, true);
  IF b.deliver_on > current_date THEN RAISE EXCEPTION 'not_yet' USING ERRCODE = 'P0001'; END IF;
  UPDATE gift_boxes SET status = 'delivered', delivered_via = 'pdf', delivered_at = now(),
    receive_code_hash = NULL, receive_code_expires_at = NULL, updated_at = now() WHERE id = p_box;
  UPDATE gift_invites SET expires_at = least(expires_at, now()) WHERE box_id = p_box AND used_at IS NULL;
END $$;
--> statement-breakpoint
-- Boxes I write in (or wrote in, if still a writer when it was delivered) and boxes I received.
CREATE OR REPLACE FUNCTION gift_boxes_mine()
RETURNS TABLE (id uuid, child_name text, deliver_on date, status text, my_role text, writers int, delivered_at timestamptz, delivered_via text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT b.id, b.child_name, b.deliver_on, b.status,
         CASE WHEN b.delivered_to = gift_me() THEN 'child' WHEN b.owner_id = gift_me() THEN 'owner' ELSE 'writer' END,
         (SELECT count(*)::int FROM gift_writers w2 WHERE w2.box_id = b.id AND w2.removed_at IS NULL),
         b.delivered_at, b.delivered_via
  FROM gift_boxes b
  WHERE b.delivered_to = gift_me()
     OR EXISTS (SELECT 1 FROM gift_writers w WHERE w.box_id = b.id AND w.user_id = gift_me() AND w.removed_at IS NULL)
  ORDER BY b.deliver_on, b.created_at
$$;
--> statement-breakpoint
-- One box as I may see it. Writers see growth records from everyone but letters and views only
-- of their own, before and after delivery. The child sees everything that was kept. The owner,
-- once they have handed the box over as a book, sees everything (to print it).
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
    'entries', coalesce((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'author_id', e.author_id, 'kind', e.kind, 'occurred_on', e.occurred_on,
                                  'title', e.title, 'body', e.body, 'created_at', e.created_at) ORDER BY coalesce(e.occurred_on, e.created_at::date), e.created_at)
                         FROM gift_entries e
                         WHERE e.box_id = p_box AND (everything OR e.kind = 'growth' OR e.author_id = me)), '[]'::jsonb),
    'views', coalesce((SELECT jsonb_agg(jsonb_build_object('author_id', v.author_id, 'answers', v.answers, 'comment', v.comment))
                       FROM gift_views v WHERE v.box_id = p_box AND (everything OR v.author_id = me)), '[]'::jsonb),
    'hidden_letters', CASE WHEN everything THEN 0 ELSE
       (SELECT count(*) FROM gift_entries e WHERE e.box_id = p_box AND e.kind = 'letter' AND e.author_id <> me) END
  );
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION gift_box_for(uuid, boolean, boolean) FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['gift_box_create(text, date, date, text, text)','gift_box_update(uuid, text, date, date)',
    'gift_invite_create(uuid, text, text)','gift_invite_accept(text, text)','gift_writer_remove(uuid, uuid, boolean)',
    'gift_entry_save(uuid, uuid, text, date, text, text)','gift_entry_delete(uuid)','gift_view_save(uuid, jsonb, text)',
    'gift_code_issue(uuid, text)','gift_receive(text)','gift_deliver_pdf(uuid)','gift_boxes_mine()','gift_box_read(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO mosaic_app', f);
  END LOOP;
END $$;
