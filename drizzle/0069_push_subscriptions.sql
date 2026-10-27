CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_ck" CHECK ("push_subscriptions"."endpoint" like 'https://%' and char_length("push_subscriptions"."endpoint") <= 1000),
	CONSTRAINT "push_subscriptions_keys_ck" CHECK (char_length("push_subscriptions"."p256dh") between 1 and 200 and char_length("push_subscriptions"."auth") between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "push_preview" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_uq" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
GRANT SELECT, DELETE ON push_subscriptions TO mosaic_app;
--> statement-breakpoint
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Each sees and removes only their own; adding goes through push_subscribe() (a browser moves to whoever turns it on there).
CREATE POLICY own_rows ON push_subscriptions FOR ALL TO mosaic_app USING (user_id = app_current_user_id()) WITH CHECK (user_id = app_current_user_id());
