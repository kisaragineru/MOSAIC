ALTER TABLE "memory_entries" ADD COLUMN "letter_read_at" timestamp with time zone;--> statement-breakpoint
-- Letters that opened before the last few days were announced already; don't bring them back.
UPDATE "memory_entries" SET "letter_read_at" = now() WHERE "kind" = 'letter_to_future' AND "reveal_on" < current_date - 3;
