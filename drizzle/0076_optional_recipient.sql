ALTER TABLE "work_links" DROP CONSTRAINT "work_links_recipient_ck";--> statement-breakpoint
ALTER TABLE "work_links" ALTER COLUMN "recipient" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "work_links" ADD CONSTRAINT "work_links_recipient_ck" CHECK ("work_links"."recipient" is null or char_length("work_links"."recipient") between 1 and 60);