CREATE TABLE "memory_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_replies_body_ck" CHECK (char_length("memory_replies"."body") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "memory_replies" ADD CONSTRAINT "memory_replies_entry_id_memory_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."memory_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_replies" ADD CONSTRAINT "memory_replies_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memory_replies_entry_idx" ON "memory_replies" USING btree ("entry_id","created_at");