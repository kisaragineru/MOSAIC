ALTER TABLE "profiles" ADD COLUMN "story_pages_seen" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "story_asked_at" timestamp with time zone;