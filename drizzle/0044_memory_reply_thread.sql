CREATE TABLE "memory_reply_reads" (
	"user_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_reply_reads_user_id_entry_id_pk" PRIMARY KEY("user_id","entry_id")
);
--> statement-breakpoint
ALTER TABLE "memory_replies" ADD COLUMN "author_id" uuid;--> statement-breakpoint
UPDATE "memory_replies" SET "author_id" = "owner_id";--> statement-breakpoint
ALTER TABLE "memory_replies" ALTER COLUMN "author_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "memory_reply_reads" ADD CONSTRAINT "memory_reply_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_reply_reads" ADD CONSTRAINT "memory_reply_reads_entry_id_memory_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."memory_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_replies" ADD CONSTRAINT "memory_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memory_replies_author_idx" ON "memory_replies" USING btree ("author_id");