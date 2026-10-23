CREATE TABLE "audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "birth_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"calendar_input" text NOT NULL,
	"solar_date" date,
	"lunar_year" integer,
	"lunar_month" smallint,
	"lunar_day" smallint,
	"lunar_leap" boolean DEFAULT false NOT NULL,
	"birth_time" time,
	"time_known" boolean DEFAULT false NOT NULL,
	"time_zone" text NOT NULL,
	"place_label" text,
	"sex" text DEFAULT 'unspecified' NOT NULL,
	"late_rat_hour" text,
	"leap_month_rule" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "birth_profiles_owner_uq" UNIQUE("id","user_id"),
	CONSTRAINT "birth_calendar_ck" CHECK ("birth_profiles"."calendar_input" in ('solar','lunar')),
	CONSTRAINT "birth_sex_ck" CHECK ("birth_profiles"."sex" in ('male','female','unspecified')),
	CONSTRAINT "birth_late_rat_ck" CHECK ("birth_profiles"."late_rat_hour" is null or "birth_profiles"."late_rat_hour" in ('next_day','same_day')),
	CONSTRAINT "birth_leap_rule_ck" CHECK ("birth_profiles"."leap_month_rule" is null or "birth_profiles"."leap_month_rule" in ('same_month','next_month','split_15')),
	CONSTRAINT "birth_time_known_ck" CHECK (("birth_profiles"."time_known" and "birth_profiles"."birth_time" is not null) or (not "birth_profiles"."time_known" and "birth_profiles"."birth_time" is null))
);
--> statement-breakpoint
CREATE TABLE "comparison_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"scopes" text[] NOT NULL,
	"consent_text_version" text NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "comparison_results" (
	"session_id" uuid PRIMARY KEY NOT NULL,
	"engine_version" text NOT NULL,
	"result" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparison_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"share_id" uuid,
	"user_a" uuid NOT NULL,
	"user_b" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comparison_status_ck" CHECK ("comparison_sessions"."status" in ('pending','active','revoked')),
	CONSTRAINT "comparison_distinct_ck" CHECK ("comparison_sessions"."user_a" <> "comparison_sessions"."user_b")
);
--> statement-breakpoint
CREATE TABLE "daily_question_assignments" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"slot" smallint NOT NULL,
	"question_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_question_assignments_user_id_day_slot_pk" PRIMARY KEY("user_id","day","slot")
);
--> statement-breakpoint
CREATE TABLE "data_export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"format" text DEFAULT 'json' NOT NULL,
	"byte_size" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "export_status_ck" CHECK ("data_export_jobs"."status" in ('running','completed','failed'))
);
--> statement-breakpoint
CREATE TABLE "gift_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"item" text NOT NULL,
	"occasion" text,
	"given_on" date,
	"price_amount" integer,
	"price_currency" text,
	"reaction" text DEFAULT 'unknown' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_reaction_ck" CHECK ("gift_records"."reaction" in ('loved','liked','neutral','disliked','unknown'))
);
--> statement-breakpoint
CREATE TABLE "important_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"person_id" uuid,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"month" smallint NOT NULL,
	"day" smallint NOT NULL,
	"year" integer,
	"remind_days_before" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "important_dates_kind_ck" CHECK ("important_dates"."kind" in ('birthday','anniversary','custom')),
	CONSTRAINT "important_dates_md_ck" CHECK ("important_dates"."month" between 1 and 12 and "important_dates"."day" between 1 and 31),
	CONSTRAINT "important_dates_remind_ck" CHECK ("important_dates"."remind_days_before" is null or "important_dates"."remind_days_before" between 0 and 60)
);
--> statement-breakpoint
CREATE TABLE "memory_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"occurred_on" date,
	"reveal_on" date,
	"visibility" text DEFAULT 'private' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_entries_owner_uq" UNIQUE("id","user_id"),
	CONSTRAINT "memory_kind_ck" CHECK ("memory_entries"."kind" in ('thought','feeling','memory','decision','goal','dream','regret','achievement','value','letter_to_future')),
	CONSTRAINT "memory_visibility_ck" CHECK ("memory_entries"."visibility" in ('private'))
);
--> statement-breakpoint
CREATE TABLE "memory_entry_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"reason" text,
	"mood" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_mood_ck" CHECK ("memory_entry_versions"."mood" is null or "memory_entry_versions"."mood" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "memory_people" (
	"entry_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "memory_people_entry_id_person_id_pk" PRIMARY KEY("entry_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "memory_tags" (
	"entry_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tag" text NOT NULL,
	CONSTRAINT "memory_tags_entry_id_tag_pk" PRIMARY KEY("entry_id","tag")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"daily_question" boolean DEFAULT false NOT NULL,
	"date_reminders" boolean DEFAULT true NOT NULL,
	"channel" text DEFAULT 'in_app' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nickname" text NOT NULL,
	"relationship" text DEFAULT 'other' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_owner_uq" UNIQUE("id","user_id"),
	CONSTRAINT "people_relationship_ck" CHECK ("people"."relationship" in ('partner','family','friend','colleague','other'))
);
--> statement-breakpoint
CREATE TABLE "preference_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"label" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preference_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"person_id" uuid,
	"category_id" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pref_items_owner_uq" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "preference_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"sentiment" text NOT NULL,
	"source" text NOT NULL,
	"note" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pref_sentiment_ck" CHECK ("preference_values"."sentiment" in ('love','like','neutral','dislike','avoid','wants','owns')),
	CONSTRAINT "pref_source_ck" CHECK ("preference_values"."source" in ('self_stated','person_stated','observed','guess','ai_suggested','unverified'))
);
--> statement-breakpoint
CREATE TABLE "profile_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"label" text,
	"expires_at" timestamp with time zone NOT NULL,
	"max_uses" integer,
	"use_count" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"time_zone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"sensitivity" text DEFAULT 'low' NOT NULL,
	"comparable" boolean DEFAULT false NOT NULL,
	"follow_up_only" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"current_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_sensitivity_ck" CHECK ("question_definitions"."sensitivity" in ('low','medium','high'))
);
--> statement-breakpoint
CREATE TABLE "question_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"question_version" integer NOT NULL,
	"status" text NOT NULL,
	"answer" jsonb,
	"change_kind" text DEFAULT 'first' NOT NULL,
	"previous_response_id" uuid,
	"purpose" text DEFAULT 'self_understanding' NOT NULL,
	"privacy" text DEFAULT 'private' NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "responses_owner_uq" UNIQUE("id","user_id"),
	CONSTRAINT "responses_status_ck" CHECK ("question_responses"."status" in ('answered','skipped')),
	CONSTRAINT "responses_change_ck" CHECK ("question_responses"."change_kind" in ('first','reanswer','changed_mind','correction')),
	CONSTRAINT "responses_privacy_ck" CHECK ("question_responses"."privacy" in ('private','comparable')),
	CONSTRAINT "responses_answer_ck" CHECK (("question_responses"."status" = 'skipped') = ("question_responses"."answer" is null))
);
--> statement-breakpoint
CREATE TABLE "question_versions" (
	"question_id" text NOT NULL,
	"version" integer NOT NULL,
	"format" text NOT NULL,
	"prompt" jsonb NOT NULL,
	"options" jsonb,
	"scale" jsonb,
	"follow_ups" jsonb,
	"signals" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_versions_question_id_version_pk" PRIMARY KEY("question_id","version"),
	CONSTRAINT "question_format_ck" CHECK ("question_versions"."format" in ('single','multi','scale','short','free'))
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"source" text NOT NULL,
	"occurred_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rel_entries_kind_ck" CHECK ("relationship_entries"."kind" in ('conversation','joy','wish_together','note')),
	CONSTRAINT "rel_entries_source_ck" CHECK ("relationship_entries"."source" in ('self_stated','person_stated','observed','guess','ai_suggested','unverified'))
);
--> statement-breakpoint
CREATE TABLE "relationship_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"place" text,
	"occurred_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tendency_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"claim_key" text NOT NULL,
	"direction" smallint NOT NULL,
	"model_version" text NOT NULL,
	"evidence_count" integer NOT NULL,
	"support_count" integer NOT NULL,
	"contradict_count" integer NOT NULL,
	"newest_evidence_at" timestamp with time zone,
	"confidence" real NOT NULL,
	"user_status" text DEFAULT 'proposed' NOT NULL,
	"user_note" text,
	"is_valid" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tendency_claims_owner_uq" UNIQUE("id","user_id"),
	CONSTRAINT "tendency_status_ck" CHECK ("tendency_claims"."user_status" in ('proposed','confirmed','rejected','corrected')),
	CONSTRAINT "tendency_direction_ck" CHECK ("tendency_claims"."direction" in (-1, 1))
);
--> statement-breakpoint
CREATE TABLE "tendency_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"response_id" uuid NOT NULL,
	"polarity" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tuvi_charts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"birth_profile_id" uuid NOT NULL,
	"ruleset_id" text NOT NULL,
	"engine_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"chart" jsonb NOT NULL,
	"year_stem" smallint NOT NULL,
	"year_branch" smallint NOT NULL,
	"nap_am_element" text NOT NULL,
	"menh_branch" smallint,
	"cuc_number" smallint,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tuvi_charts_owner_uq" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tuvi_interpretations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chart_id" uuid NOT NULL,
	"section" text NOT NULL,
	"locale" text NOT NULL,
	"rule_ids" text[] NOT NULL,
	"body" text NOT NULL,
	"source" text DEFAULT 'rules' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tuvi_interp_source_ck" CHECK ("tuvi_interpretations"."source" in ('rules','ai'))
);
--> statement-breakpoint
CREATE TABLE "tuvi_ruleset_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"rules" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"password_changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birth_profiles" ADD CONSTRAINT "birth_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_consents" ADD CONSTRAINT "comparison_consents_session_id_comparison_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."comparison_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_consents" ADD CONSTRAINT "comparison_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_results" ADD CONSTRAINT "comparison_results_session_id_comparison_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."comparison_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_sessions" ADD CONSTRAINT "comparison_sessions_share_id_profile_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."profile_shares"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_sessions" ADD CONSTRAINT "comparison_sessions_user_a_users_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_sessions" ADD CONSTRAINT "comparison_sessions_user_b_users_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_question_assignments" ADD CONSTRAINT "daily_question_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_question_assignments" ADD CONSTRAINT "daily_question_assignments_question_id_question_definitions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_export_jobs" ADD CONSTRAINT "data_export_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_records" ADD CONSTRAINT "gift_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_records" ADD CONSTRAINT "gift_records_person_fk" FOREIGN KEY ("person_id","user_id") REFERENCES "public"."people"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "important_dates" ADD CONSTRAINT "important_dates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "important_dates" ADD CONSTRAINT "important_dates_person_fk" FOREIGN KEY ("person_id","user_id") REFERENCES "public"."people"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_entry_versions" ADD CONSTRAINT "memory_entry_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_entry_versions" ADD CONSTRAINT "memory_versions_entry_fk" FOREIGN KEY ("entry_id","user_id") REFERENCES "public"."memory_entries"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_people" ADD CONSTRAINT "memory_people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_people" ADD CONSTRAINT "memory_people_entry_fk" FOREIGN KEY ("entry_id","user_id") REFERENCES "public"."memory_entries"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_people" ADD CONSTRAINT "memory_people_person_fk" FOREIGN KEY ("person_id","user_id") REFERENCES "public"."people"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_tags" ADD CONSTRAINT "memory_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_tags" ADD CONSTRAINT "memory_tags_entry_fk" FOREIGN KEY ("entry_id","user_id") REFERENCES "public"."memory_entries"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preference_items" ADD CONSTRAINT "preference_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preference_items" ADD CONSTRAINT "preference_items_category_id_preference_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."preference_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preference_items" ADD CONSTRAINT "pref_items_person_fk" FOREIGN KEY ("person_id","user_id") REFERENCES "public"."people"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preference_values" ADD CONSTRAINT "preference_values_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preference_values" ADD CONSTRAINT "pref_values_item_fk" FOREIGN KEY ("item_id","user_id") REFERENCES "public"."preference_items"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_shares" ADD CONSTRAINT "profile_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_question_id_question_definitions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_question_id_question_definitions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_entries" ADD CONSTRAINT "relationship_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_entries" ADD CONSTRAINT "rel_entries_person_fk" FOREIGN KEY ("person_id","user_id") REFERENCES "public"."people"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_events" ADD CONSTRAINT "relationship_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_events" ADD CONSTRAINT "rel_events_person_fk" FOREIGN KEY ("person_id","user_id") REFERENCES "public"."people"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tendency_claims" ADD CONSTRAINT "tendency_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tendency_evidence" ADD CONSTRAINT "tendency_evidence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tendency_evidence" ADD CONSTRAINT "tendency_evidence_claim_fk" FOREIGN KEY ("claim_id","user_id") REFERENCES "public"."tendency_claims"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tendency_evidence" ADD CONSTRAINT "tendency_evidence_response_fk" FOREIGN KEY ("response_id","user_id") REFERENCES "public"."question_responses"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuvi_charts" ADD CONSTRAINT "tuvi_charts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuvi_charts" ADD CONSTRAINT "tuvi_charts_ruleset_id_tuvi_ruleset_versions_id_fk" FOREIGN KEY ("ruleset_id") REFERENCES "public"."tuvi_ruleset_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuvi_charts" ADD CONSTRAINT "tuvi_charts_birth_fk" FOREIGN KEY ("birth_profile_id","user_id") REFERENCES "public"."birth_profiles"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuvi_interpretations" ADD CONSTRAINT "tuvi_interpretations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuvi_interpretations" ADD CONSTRAINT "tuvi_interp_chart_fk" FOREIGN KEY ("chart_id","user_id") REFERENCES "public"."tuvi_charts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_user_idx" ON "audit_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "birth_profiles_user_uq" ON "birth_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comparison_consents_active_uq" ON "comparison_consents" USING btree ("session_id","user_id") WHERE "comparison_consents"."withdrawn_at" is null;--> statement-breakpoint
CREATE INDEX "comparison_sessions_a_idx" ON "comparison_sessions" USING btree ("user_a");--> statement-breakpoint
CREATE INDEX "comparison_sessions_b_idx" ON "comparison_sessions" USING btree ("user_b");--> statement-breakpoint
CREATE UNIQUE INDEX "comparison_sessions_open_pair_uq" ON "comparison_sessions" USING btree ("user_a","user_b") WHERE "comparison_sessions"."status" <> 'revoked';--> statement-breakpoint
CREATE INDEX "gift_records_person_idx" ON "gift_records" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "important_dates_user_idx" ON "important_dates" USING btree ("user_id","month","day");--> statement-breakpoint
CREATE INDEX "memory_entries_user_created_idx" ON "memory_entries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "memory_entries_user_occurred_idx" ON "memory_entries" USING btree ("user_id","occurred_on");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_versions_entry_version_uq" ON "memory_entry_versions" USING btree ("entry_id","version");--> statement-breakpoint
CREATE INDEX "memory_versions_user_idx" ON "memory_entry_versions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memory_people_person_idx" ON "memory_people" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "memory_tags_user_tag_idx" ON "memory_tags" USING btree ("user_id","tag");--> statement-breakpoint
CREATE INDEX "people_user_idx" ON "people" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pref_items_user_person_idx" ON "preference_items" USING btree ("user_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pref_items_uq" ON "preference_items" USING btree ("user_id",coalesce("person_id", '00000000-0000-0000-0000-000000000000'::uuid),"category_id",lower("label"));--> statement-breakpoint
CREATE INDEX "pref_values_item_idx" ON "preference_values" USING btree ("item_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_shares_token_uq" ON "profile_shares" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "profile_shares_user_idx" ON "profile_shares" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "responses_user_question_idx" ON "question_responses" USING btree ("user_id","question_id","answered_at");--> statement-breakpoint
CREATE INDEX "responses_user_time_idx" ON "question_responses" USING btree ("user_id","answered_at");--> statement-breakpoint
CREATE INDEX "rel_entries_person_idx" ON "relationship_entries" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "rel_events_person_idx" ON "relationship_events" USING btree ("person_id","occurred_on");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tendency_claims_user_key_uq" ON "tendency_claims" USING btree ("user_id","claim_key");--> statement-breakpoint
CREATE INDEX "tendency_evidence_claim_idx" ON "tendency_evidence" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "tendency_evidence_response_idx" ON "tendency_evidence" USING btree ("response_id");--> statement-breakpoint
CREATE INDEX "tuvi_charts_user_idx" ON "tuvi_charts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tuvi_charts_current_uq" ON "tuvi_charts" USING btree ("user_id") WHERE "tuvi_charts"."is_current";--> statement-breakpoint
CREATE INDEX "tuvi_interp_chart_idx" ON "tuvi_interpretations" USING btree ("chart_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));