CREATE TABLE "manual_rewrites" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"sections" jsonb NOT NULL,
	"pieces" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manual_rewrites" ADD CONSTRAINT "manual_rewrites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;