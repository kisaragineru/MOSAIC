CREATE TABLE "memory_tag_notes" (
	"user_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"note" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_tag_notes_user_id_tag_pk" PRIMARY KEY("user_id","tag"),
	CONSTRAINT "memory_tag_notes_note_ck" CHECK (char_length("memory_tag_notes"."note") between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "memory_tag_notes" ADD CONSTRAINT "memory_tag_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Mine only: the same owner rule as the other owner-scoped tables (migration 0001).
ALTER TABLE memory_tag_notes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON memory_tag_notes FOR ALL TO mosaic_app USING (user_id = app_current_user_id()) WITH CHECK (user_id = app_current_user_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON memory_tag_notes TO mosaic_app;
