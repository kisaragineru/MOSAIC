CREATE TABLE "work_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dismissed_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"accepted_seen_at" timestamp with time zone,
	"start_answer" text,
	"start_seen_at" timestamp with time zone,
	CONSTRAINT "work_offers_start_ck" CHECK ("work_offers"."start_answer" IS NULL OR "work_offers"."start_answer" in ('told','kept')),
	CONSTRAINT "work_offers_distinct_ck" CHECK ("work_offers"."owner_id" <> "work_offers"."recipient_id")
);
--> statement-breakpoint
ALTER TABLE "work_offers" ADD CONSTRAINT "work_offers_link_id_work_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."work_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_offers" ADD CONSTRAINT "work_offers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_offers" ADD CONSTRAINT "work_offers_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_offers" ADD CONSTRAINT "work_offers_session_id_comparison_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."comparison_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "work_offers_link_recipient_uq" ON "work_offers" USING btree ("link_id","recipient_id");--> statement-breakpoint
CREATE INDEX "work_offers_recipient_idx" ON "work_offers" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "work_offers_owner_idx" ON "work_offers" USING btree ("owner_id");