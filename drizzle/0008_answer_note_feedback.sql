CREATE TABLE "question_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"rating" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_feedback_rating_ck" CHECK ("question_feedback"."rating" in (-1, 1))
);
--> statement-breakpoint
ALTER TABLE "question_responses" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "question_feedback" ADD CONSTRAINT "question_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_feedback" ADD CONSTRAINT "question_feedback_question_id_question_definitions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_feedback_uq" ON "question_feedback" USING btree ("user_id","question_id");--> statement-breakpoint
ALTER TABLE "question_responses" ADD CONSTRAINT "responses_note_ck" CHECK ("question_responses"."note" is null or char_length("question_responses"."note") <= 1000);--> statement-breakpoint
-- Feedback is personal (who rated what): owner-only, like the other owner-scoped tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON question_feedback TO mosaic_app;
--> statement-breakpoint
ALTER TABLE question_feedback ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON question_feedback FOR ALL TO mosaic_app
  USING (user_id = app_current_user_id()) WITH CHECK (user_id = app_current_user_id());
