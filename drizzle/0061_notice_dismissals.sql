CREATE TABLE "notice_dismissals" (
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"times" smallint DEFAULT 1 NOT NULL,
	"until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notice_dismissals_user_id_key_pk" PRIMARY KEY("user_id","key"),
	CONSTRAINT "notice_dismissals_key_ck" CHECK (char_length("notice_dismissals"."key") between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "notice_dismissals" ADD CONSTRAINT "notice_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON notice_dismissals TO mosaic_app;
--> statement-breakpoint
ALTER TABLE notice_dismissals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY own_rows ON notice_dismissals FOR ALL TO mosaic_app USING (user_id = app_current_user_id()) WITH CHECK (user_id = app_current_user_id());
