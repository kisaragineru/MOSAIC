CREATE TABLE "link_previews" (
	"url_hash" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"status" text NOT NULL,
	"title" text,
	"description" text,
	"site_name" text,
	"image_mime" text,
	"image_bytes" "bytea",
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "link_previews_status_ck" CHECK ("link_previews"."status" in ('ok','empty','failed')),
	CONSTRAINT "link_previews_mime_ck" CHECK ("link_previews"."image_mime" is null or "link_previews"."image_mime" in ('image/jpeg','image/png','image/webp','image/gif'))
);
