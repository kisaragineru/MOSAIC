CREATE TABLE "memory_comment_reads" (
	"user_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_comment_reads_user_id_entry_id_partner_id_pk" PRIMARY KEY("user_id","entry_id","partner_id")
);
--> statement-breakpoint
CREATE TABLE "memory_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_comments_author_ck" CHECK ("memory_comments"."author_id" in ("memory_comments"."owner_id", "memory_comments"."partner_id") and "memory_comments"."owner_id" <> "memory_comments"."partner_id"),
	CONSTRAINT "memory_comments_body_ck" CHECK (char_length("memory_comments"."body") between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "memory_comment_reads" ADD CONSTRAINT "memory_comment_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_comment_reads" ADD CONSTRAINT "memory_comment_reads_entry_id_memory_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."memory_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_comment_reads" ADD CONSTRAINT "memory_comment_reads_partner_id_users_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_comments" ADD CONSTRAINT "memory_comments_entry_id_memory_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."memory_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_comments" ADD CONSTRAINT "memory_comments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_comments" ADD CONSTRAINT "memory_comments_partner_id_users_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_comments" ADD CONSTRAINT "memory_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memory_comments_thread_idx" ON "memory_comments" USING btree ("entry_id","partner_id","created_at");--> statement-breakpoint
CREATE INDEX "memory_comments_owner_idx" ON "memory_comments" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "memory_comments_partner_idx" ON "memory_comments" USING btree ("partner_id","created_at");