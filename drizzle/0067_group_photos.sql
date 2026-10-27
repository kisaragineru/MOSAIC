CREATE TABLE "dm_group_photos" (
	"conversation_id" uuid PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"size" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dm_group_photos_mime_ck" CHECK ("dm_group_photos"."mime" in ('image/jpeg','image/png','image/webp')),
	CONSTRAINT "dm_group_photos_size_ck" CHECK ("dm_group_photos"."size" between 1 and 1000000)
);
--> statement-breakpoint
ALTER TABLE "dm_group_photos" ADD CONSTRAINT "dm_group_photos_conversation_id_dm_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."dm_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Read and written only through the functions of 0068 (no policies: closed to direct access).
ALTER TABLE dm_group_photos ENABLE ROW LEVEL SECURITY;
