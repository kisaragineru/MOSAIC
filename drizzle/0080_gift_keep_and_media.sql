ALTER TABLE "gift_entries" DROP CONSTRAINT "gift_entries_body_ck";--> statement-breakpoint
ALTER TABLE "gift_boxes" DROP CONSTRAINT "gift_boxes_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "gift_entries" DROP CONSTRAINT "gift_entries_author_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "gift_views" DROP CONSTRAINT "gift_views_author_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "gift_views" DROP CONSTRAINT "gift_views_box_id_author_id_pk";--> statement-breakpoint
ALTER TABLE "gift_boxes" ALTER COLUMN "owner_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_entries" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_views" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_entries" ADD COLUMN "author_label" text;--> statement-breakpoint
ALTER TABLE "gift_entries" ADD COLUMN "author_role" text;--> statement-breakpoint
ALTER TABLE "gift_views" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_views" ADD COLUMN "author_label" text;--> statement-breakpoint
ALTER TABLE "gift_views" ADD COLUMN "author_role" text;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD COLUMN "from_gift_entry" uuid;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD COLUMN "from_label" text;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD COLUMN "from_role" text;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD COLUMN "from_kind" text;--> statement-breakpoint
ALTER TABLE "memory_media" ADD COLUMN "gift_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "gift_boxes" ADD CONSTRAINT "gift_boxes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_entries" ADD CONSTRAINT "gift_entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_views" ADD CONSTRAINT "gift_views_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_media" ADD CONSTRAINT "memory_media_gift_entry_id_gift_entries_id_fk" FOREIGN KEY ("gift_entry_id") REFERENCES "public"."gift_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gift_views_box_author_uq" ON "gift_views" USING btree ("box_id","author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_entries_from_gift_uq" ON "memory_entries" USING btree ("user_id","from_gift_entry");--> statement-breakpoint
CREATE INDEX "memory_media_gift_idx" ON "memory_media" USING btree ("gift_entry_id","position");--> statement-breakpoint
ALTER TABLE "gift_entries" ADD CONSTRAINT "gift_entries_body_ck" CHECK (char_length("gift_entries"."body") <= 5000);--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_from_kind_ck" CHECK ("memory_entries"."from_kind" is null or "memory_entries"."from_kind" in ('growth','letter'));