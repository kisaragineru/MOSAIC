CREATE TABLE "memory_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_id" uuid,
	"position" smallint DEFAULT 0 NOT NULL,
	"kind" text NOT NULL,
	"mime" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"duration_ms" integer,
	"size" integer NOT NULL,
	"chunks" smallint NOT NULL,
	"thumb" "bytea" NOT NULL,
	"complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_media_kind_ck" CHECK ("memory_media"."kind" in ('image','video')),
	CONSTRAINT "memory_media_mime_ck" CHECK ("memory_media"."mime" in ('image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm')),
	CONSTRAINT "memory_media_dims_ck" CHECK ("memory_media"."width" between 1 and 10000 and "memory_media"."height" between 1 and 10000)
);
--> statement-breakpoint
CREATE TABLE "memory_media_chunks" (
	"media_id" uuid NOT NULL,
	"idx" smallint NOT NULL,
	"bytes" "bytea" NOT NULL,
	CONSTRAINT "memory_media_chunks_media_id_idx_pk" PRIMARY KEY("media_id","idx")
);
--> statement-breakpoint
ALTER TABLE "memory_entries" DROP CONSTRAINT "memory_kind_ck";--> statement-breakpoint
ALTER TABLE "memory_media" ADD CONSTRAINT "memory_media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_media" ADD CONSTRAINT "memory_media_entry_id_memory_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."memory_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_media_chunks" ADD CONSTRAINT "memory_media_chunks_media_id_memory_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."memory_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memory_media_entry_idx" ON "memory_media" USING btree ("entry_id","position");--> statement-breakpoint
CREATE INDEX "memory_media_user_idx" ON "memory_media" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_kind_ck" CHECK ("memory_entries"."kind" in ('note','thought','feeling','memory','decision','goal','dream','regret','achievement','value','letter_to_future'));