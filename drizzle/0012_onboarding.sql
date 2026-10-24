ALTER TABLE "profiles" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
-- People who were already here have, in effect, onboarded.
UPDATE profiles SET onboarded_at = created_at WHERE onboarded_at IS NULL;
