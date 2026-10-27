CREATE TABLE "work_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"recipient" text NOT NULL,
	"note" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"opened_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_links_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "work_links_recipient_ck" CHECK (char_length("work_links"."recipient") between 1 and 60),
	CONSTRAINT "work_links_note_ck" CHECK ("work_links"."note" IS NULL OR char_length("work_links"."note") <= 300)
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"locale" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "works_title_ck" CHECK (char_length("works"."title") between 1 and 80)
);
--> statement-breakpoint
ALTER TABLE "work_links" ADD CONSTRAINT "work_links_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_links" ADD CONSTRAINT "work_links_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_links_owner_idx" ON "work_links" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "works_owner_idx" ON "works" USING btree ("owner_id","created_at");