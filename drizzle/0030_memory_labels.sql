ALTER TABLE "memory_entries" ADD COLUMN "labels" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD COLUMN "labels_by" text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD COLUMN "feeling" text;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_labels_by_ck" CHECK ("memory_entries"."labels_by" in ('auto','user'));--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_labels_ck" CHECK ("memory_entries"."labels" <@ array['achievement','decision','goal','dream','regret','feeling','value','memory','thought']::text[]);--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_feeling_ck" CHECK ("memory_entries"."feeling" is null or "memory_entries"."feeling" in ('happy','calm','grateful','sad','frustrated','anxious'));--> statement-breakpoint
-- Records written before: the category their writer chose becomes their label (theirs, not a guess).
UPDATE "memory_entries" SET "labels" = ARRAY["kind"], "labels_by" = 'user'
WHERE "kind" IN ('achievement','decision','goal','dream','regret','feeling','value','memory','thought');
