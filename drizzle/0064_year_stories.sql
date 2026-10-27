CREATE TABLE "year_stories" (
	"user_id" uuid NOT NULL,
	"year" smallint NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"paragraphs" jsonb NOT NULL,
	"ai" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "year_stories_user_id_year_locale_pk" PRIMARY KEY("user_id","year","locale")
);
--> statement-breakpoint
ALTER TABLE "year_stories" ADD CONSTRAINT "year_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON year_stories TO mosaic_app;
--> statement-breakpoint
ALTER TABLE year_stories ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY own_rows ON year_stories FOR ALL TO mosaic_app USING (user_id = app_current_user_id()) WITH CHECK (user_id = app_current_user_id());
