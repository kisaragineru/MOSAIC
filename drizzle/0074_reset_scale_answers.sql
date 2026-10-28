-- The 1–5 questions are now answered in words chosen per question, so answers given as bare
-- numbers are returned to "not answered yet" (answered and skipped alike), at the operator's request.
-- A copy is kept out of the app's reach (no grants, RLS on with no policies) and goes with the account.
CREATE TABLE "scale_answers_reset_2026_10" AS
  SELECT * FROM "question_responses"
  WHERE "question_id" IN (SELECT DISTINCT "question_id" FROM "question_versions" WHERE "format" = 'scale');
--> statement-breakpoint
ALTER TABLE "scale_answers_reset_2026_10" ADD CONSTRAINT "scale_answers_reset_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "scale_answers_reset_2026_10" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON "scale_answers_reset_2026_10" FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mosaic_app') THEN
    REVOKE ALL ON "scale_answers_reset_2026_10" FROM mosaic_app;
  END IF;
END $$;
--> statement-breakpoint
DELETE FROM "tendency_evidence" WHERE "response_id" IN (SELECT "id" FROM "scale_answers_reset_2026_10");
--> statement-breakpoint
DELETE FROM "question_responses" WHERE "id" IN (SELECT "id" FROM "scale_answers_reset_2026_10");
--> statement-breakpoint
-- Tendencies are rebuilt from the remaining answers by scripts/recompute-tendencies.ts on deploy.
UPDATE "tendency_claims" SET "model_version" = 'stale'
  WHERE "user_id" IN (SELECT DISTINCT "user_id" FROM "scale_answers_reset_2026_10");
