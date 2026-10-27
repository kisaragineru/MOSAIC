-- Accounts that exist now haven't decided (NULL: asked once); new accounts start with type and bio.
ALTER TABLE "profiles" ADD COLUMN "card_items" text[];--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "card_items" SET DEFAULT '{type,bio}'::text[];--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_card_items_ck" CHECK ("card_items" IS NULL OR "card_items" <@ ARRAY['type','bio','summary','likes','manual']::text[]);
