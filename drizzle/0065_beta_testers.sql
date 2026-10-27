CREATE TABLE "beta_testers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dm_conversations" ADD COLUMN "system_key" text;--> statement-breakpoint
ALTER TABLE "beta_testers" ADD CONSTRAINT "beta_testers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_testers" ADD CONSTRAINT "beta_testers_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dm_conversations_system_uq" ON "dm_conversations" USING btree ("system_key");--> statement-breakpoint
GRANT SELECT ON beta_testers TO mosaic_app;
--> statement-breakpoint
ALTER TABLE beta_testers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Each sees only whether they are one; who is chosen changes only through admin_set_beta().
CREATE POLICY own_row ON beta_testers FOR SELECT TO mosaic_app USING (user_id = app_current_user_id());
