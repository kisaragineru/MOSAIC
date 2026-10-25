ALTER TABLE "people" ADD COLUMN "age_band" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_age_band_ck" CHECK ("people"."age_band" is null or "people"."age_band" in ('baby','child','teens','20s','30s','40s','50s','60s','70plus'));--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_gender_ck" CHECK ("people"."gender" is null or "people"."gender" in ('female','male','other'));