CREATE TABLE "manual_share_rewrites" (
	"owner_id" uuid NOT NULL,
	"preset" text NOT NULL,
	"locale" text NOT NULL,
	"sections" jsonb NOT NULL,
	"source_hash" text NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manual_share_rewrites_owner_id_preset_pk" PRIMARY KEY("owner_id","preset"),
	CONSTRAINT "manual_share_rewrites_preset_ck" CHECK ("manual_share_rewrites"."preset" in ('friend','partner'))
);
--> statement-breakpoint
ALTER TABLE "manual_share_rewrites" ADD CONSTRAINT "manual_share_rewrites_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;