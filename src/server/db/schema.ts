/**
 * MOSAIC database schema (source of truth for tables, columns, indexes, FKs).
 *
 * Row Level Security policies, roles, grants and SECURITY DEFINER functions live in
 * hand-written SQL migrations (drizzle/*_rls*.sql) because they are not expressible here.
 *
 * Conventions
 * - Every user-owned row carries `user_id` (denormalised on child tables) so RLS can be a
 *   single equality check and so a forged foreign id never crosses users.
 * - User-owned data is ON DELETE CASCADE from `users` so account deletion is complete.
 * - History is append-only where the product promises "never silently overwrite"
 *   (memory_entry_versions, question_responses, preference_values).
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  customType,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();
/**
 * Composite FK (childCol, user_id) → parent(id, user_id). Foreign-key checks bypass RLS,
 * so this is what prevents a user from attaching rows to another user's parent row.
 */
const ownedFk = (name: string, cols: [any, any], parent: { id: any; userId: any }) =>
  foreignKey({ name, columns: cols, foreignColumns: [parent.id, parent.userId] }).onDelete("cascade");
const ownerUq = (name: string, t: { id: unknown; userId: unknown }) =>
  unique(name).on(t.id as any, t.userId as any);

const userRef = () =>
  uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

// ---------------------------------------------------------------------------
// Identity & auth
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: createdAt(),
    passwordChangedAt: ts("password_changed_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`)],
);

/** Sign-in with Google or Facebook: which outside account belongs to which user. */
export const userIdentities = pgTable(
  "user_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    provider: text("provider").notNull(),
    /** The provider's own, stable id for the account (never the email). */
    subject: text("subject").notNull(),
    email: text("email"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("user_identities_provider_subject_uq").on(t.provider, t.subject),
    index("user_identities_user_idx").on(t.userId),
    check("user_identities_provider_ck", sql`${t.provider} in ('google','facebook')`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    tokenHash: text("token_hash").notNull(),
    createdAt: createdAt(),
    expiresAt: ts("expires_at").notNull(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_hash_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

/** Fixed-window counters. Keys are hashed (never raw IPs or emails). */
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").primaryKey(),
  windowStart: ts("window_start").notNull(),
  count: integer("count").notNull(),
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  locale: text("locale").notNull().default("en"),
  timeZone: text("time_zone").notNull().default("Asia/Ho_Chi_Minh"),
  /** Explicit opt-in before any record excerpt is sent to the external AI provider. */
  aiOptIn: boolean("ai_opt_in").notNull().default(false),
  /** An introduction MOSAIC drafted from what it knows, edited and approved by the user. */
  intro: text("intro"),
  introUpdatedAt: ts("intro_updated_at"),
  /** How many pieces MOSAIC had when the intro was saved (to suggest an update later). */
  introPieces: integer("intro_pieces"),
  /** When the user finished or skipped the first-run guide (null: not yet). */
  onboardedAt: ts("onboarded_at"),
  /** When the user closed Home's getting-started checklist (null: still shown until all done). */
  starterDismissedAt: ts("starter_dismissed_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// Tử Vi
// ---------------------------------------------------------------------------

export const birthProfiles = pgTable(
  "birth_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    /** How the user entered the date: 'solar' (Gregorian) or 'lunar' (Vietnamese lunar). */
    calendarInput: text("calendar_input").notNull(),
    solarDate: date("solar_date", { mode: "string" }),
    lunarYear: integer("lunar_year"),
    lunarMonth: smallint("lunar_month"),
    lunarDay: smallint("lunar_day"),
    lunarLeap: boolean("lunar_leap").notNull().default(false),
    /** Local clock time at birth place. NULL together with time_known=false means unknown. */
    birthTime: time("birth_time"),
    timeKnown: boolean("time_known").notNull().default(false),
    timeZone: text("time_zone").notNull(),
    placeLabel: text("place_label"),
    /** Traditional Yin/Yang-direction input. 'unspecified' => direction-dependent parts are not computed. */
    sex: text("sex").notNull().default("unspecified"),
    /** Explicit user choice for births 23:00–23:59 (school difference). NULL = not yet chosen. */
    lateRatHour: text("late_rat_hour"),
    /** Explicit user choice for births in a leap lunar month (school difference). */
    leapMonthRule: text("leap_month_rule"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("birth_profiles_user_uq").on(t.userId),
    ownerUq("birth_profiles_owner_uq", t),
    check("birth_calendar_ck", sql`${t.calendarInput} in ('solar','lunar')`),
    check("birth_sex_ck", sql`${t.sex} in ('male','female','unspecified')`),
    check("birth_late_rat_ck", sql`${t.lateRatHour} is null or ${t.lateRatHour} in ('next_day','same_day')`),
    check(
      "birth_leap_rule_ck",
      sql`${t.leapMonthRule} is null or ${t.leapMonthRule} in ('same_month','next_month','split_15')`,
    ),
    check("birth_time_known_ck", sql`(${t.timeKnown} and ${t.birthTime} is not null) or (not ${t.timeKnown} and ${t.birthTime} is null)`),
  ],
);

export const tuviRulesetVersions = pgTable("tuvi_ruleset_versions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  rules: jsonb("rules").notNull(),
  createdAt: createdAt(),
});

export const tuviCharts = pgTable(
  "tuvi_charts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    birthProfileId: uuid("birth_profile_id").notNull(),
    rulesetId: text("ruleset_id")
      .notNull()
      .references(() => tuviRulesetVersions.id),
    engineVersion: text("engine_version").notNull(),
    /** sha256 of canonical engine input + ruleset + engine version (reproducibility key). */
    inputHash: text("input_hash").notNull(),
    chart: jsonb("chart").notNull(),
    // Derived summary columns used by consented comparisons (never the raw birth data).
    yearStem: smallint("year_stem").notNull(),
    yearBranch: smallint("year_branch").notNull(),
    napAmElement: text("nap_am_element").notNull(),
    menhBranch: smallint("menh_branch"),
    cucNumber: smallint("cuc_number"),
    isCurrent: boolean("is_current").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    index("tuvi_charts_user_idx").on(t.userId),
    ownerUq("tuvi_charts_owner_uq", t),
    ownedFk("tuvi_charts_birth_fk", [t.birthProfileId, t.userId], birthProfiles),
    uniqueIndex("tuvi_charts_current_uq").on(t.userId).where(sql`${t.isCurrent}`),
  ],
);

export const tuviInterpretations = pgTable(
  "tuvi_interpretations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    chartId: uuid("chart_id").notNull(),
    section: text("section").notNull(),
    locale: text("locale").notNull(),
    /** Interpretation rule ids that produced this text (traceability). */
    ruleIds: text("rule_ids").array().notNull(),
    body: text("body").notNull(),
    source: text("source").notNull().default("rules"),
    createdAt: createdAt(),
  },
  (t) => [
    index("tuvi_interp_chart_idx").on(t.chartId),
    ownedFk("tuvi_interp_chart_fk", [t.chartId, t.userId], tuviCharts),
    check("tuvi_interp_source_ck", sql`${t.source} in ('rules','ai')`),
  ],
);

// ---------------------------------------------------------------------------
// Memories & timeline
// ---------------------------------------------------------------------------

export const MEMORY_KINDS = [
  "note",
  "thought",
  "feeling",
  "memory",
  "decision",
  "goal",
  "dream",
  "regret",
  "achievement",
  "value",
  "letter_to_future",
] as const;

export const memoryEntries = pgTable(
  "memory_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    kind: text("kind").notNull(),
    occurredOn: date("occurred_on", { mode: "string" }),
    /** Letters to the future stay sealed until this date. */
    revealOn: date("reveal_on", { mode: "string" }),
    /** When the owner first read a letter after it opened (Home stops announcing it). */
    letterReadAt: timestamp("letter_read_at", { withTimezone: true }),
    visibility: text("visibility").notNull().default("private"),
    currentVersion: integer("current_version").notNull().default(1),
    /** What it is about (several allowed): read from the words, or set by the owner. */
    labels: text("labels").array().notNull().default(sql`'{}'::text[]`),
    /** auto: read from the words (re-read on edit); user: confirmed or chosen by the owner. */
    labelsBy: text("labels_by").notNull().default("auto"),
    /** How they felt, if they answered the one question after posting. */
    feeling: text("feeling"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("memory_entries_user_created_idx").on(t.userId, t.createdAt),
    ownerUq("memory_entries_owner_uq", t),
    index("memory_entries_user_occurred_idx").on(t.userId, t.occurredOn),
    check(
      "memory_kind_ck",
      sql`${t.kind} in ('note','thought','feeling','memory','decision','goal','dream','regret','achievement','value','letter_to_future')`,
    ),
    /** private: only you. connections: everyone you're connected with. circles: the relationships in memory_circles. */
    check("memory_visibility_ck", sql`${t.visibility} in ('private','connections','circles')`),
    check("memory_labels_by_ck", sql`${t.labelsBy} in ('auto','user')`),
    check("memory_labels_ck", sql`${t.labels} <@ array['achievement','decision','goal','dream','regret','feeling','value','memory','thought']::text[]`),
    check("memory_feeling_ck", sql`${t.feeling} is null or ${t.feeling} in ('happy','calm','grateful','sad','frustrated','anxious')`),
  ],
);

export const memoryEntryVersions = pgTable(
  "memory_entry_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id").notNull(),
    userId: userRef(),
    version: integer("version").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    /** For decisions: why. For others optional context. */
    reason: text("reason"),
    mood: smallint("mood"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("memory_versions_entry_version_uq").on(t.entryId, t.version),
    ownedFk("memory_versions_entry_fk", [t.entryId, t.userId], memoryEntries),
    index("memory_versions_user_idx").on(t.userId),
    check("memory_mood_ck", sql`${t.mood} is null or ${t.mood} between 1 and 5`),
  ],
);

export const memoryTags = pgTable(
  "memory_tags",
  {
    entryId: uuid("entry_id").notNull(),
    userId: userRef(),
    tag: text("tag").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.entryId, t.tag] }),
    index("memory_tags_user_tag_idx").on(t.userId, t.tag),
    ownedFk("memory_tags_entry_fk", [t.entryId, t.userId], memoryEntries),
  ],
);

export const memoryPeople = pgTable(
  "memory_people",
  {
    entryId: uuid("entry_id").notNull(),
    personId: uuid("person_id").notNull(),
    userId: userRef(),
  },
  (t) => [
    primaryKey({ columns: [t.entryId, t.personId] }),
    index("memory_people_person_idx").on(t.personId),
    ownedFk("memory_people_entry_fk", [t.entryId, t.userId], memoryEntries),
    ownedFk("memory_people_person_fk", [t.personId, t.userId], people),
  ],
);

// ---------------------------------------------------------------------------
// Daily Discovery
// ---------------------------------------------------------------------------

export const questionDefinitions = pgTable(
  "question_definitions",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull(),
    sensitivity: text("sensitivity").notNull().default("low"),
    /** Whether answers to this question may ever be used in a consented comparison. */
    comparable: boolean("comparable").notNull().default(false),
    /** Only offered as a follow-up of another question. */
    followUpOnly: boolean("follow_up_only").notNull().default(false),
    active: boolean("active").notNull().default(true),
    currentVersion: integer("current_version").notNull(),
    createdAt: createdAt(),
  },
  (t) => [check("question_sensitivity_ck", sql`${t.sensitivity} in ('low','medium','high')`)],
);

export const questionVersions = pgTable(
  "question_versions",
  {
    questionId: text("question_id")
      .notNull()
      .references(() => questionDefinitions.id),
    version: integer("version").notNull(),
    format: text("format").notNull(),
    /** {"en": "...", "vi": "..."} — Japanese display text lives in src/content/questions-ja.ts */
    prompt: jsonb("prompt").notNull(),
    /** [{value, label:{en,vi}}] for choice formats. */
    options: jsonb("options"),
    /** Upper bound of selections for 'multi'. NULL = any number. */
    maxChoices: smallint("max_choices"),
    /** {min,max,minLabel:{..},maxLabel:{..}} for scale. */
    scale: jsonb("scale"),
    /** [{whenValue, questionId}] */
    followUps: jsonb("follow_ups"),
    /** [{whenValue | whenScaleAtLeast | whenScaleAtMost, claimKey, direction}] */
    signals: jsonb("signals"),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.questionId, t.version] }),
    check("question_format_ck", sql`${t.format} in ('single','multi','scale','short','free')`),
  ],
);

export const questionResponses = pgTable(
  "question_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    questionId: text("question_id")
      .notNull()
      .references(() => questionDefinitions.id),
    questionVersion: integer("question_version").notNull(),
    status: text("status").notNull(),
    /** {"choice": "x"} | {"choices": [..]} | {"scale": 3} | {"text": "..."} ; null when skipped */
    answer: jsonb("answer"),
    /** Why this answer exists relative to the previous one. */
    changeKind: text("change_kind").notNull().default("first"),
    previousResponseId: uuid("previous_response_id"),
    purpose: text("purpose").notNull().default("self_understanding"),
    privacy: text("privacy").notNull().default("private"),
    /** Optional "why" in the user's own words. Always private: never read by comparisons. */
    note: text("note"),
    answeredAt: ts("answered_at").notNull().defaultNow(),
  },
  (t) => [
    index("responses_user_question_idx").on(t.userId, t.questionId, t.answeredAt),
    ownerUq("responses_owner_uq", t),
    index("responses_user_time_idx").on(t.userId, t.answeredAt),
    check("responses_status_ck", sql`${t.status} in ('answered','skipped')`),
    check("responses_change_ck", sql`${t.changeKind} in ('first','reanswer','changed_mind','correction')`),
    check("responses_privacy_ck", sql`${t.privacy} in ('private','comparable')`),
    check("responses_answer_ck", sql`(${t.status} = 'skipped') = (${t.answer} is null)`),
    check("responses_note_ck", sql`${t.note} is null or char_length(${t.note}) <= 1000`),
  ],
);

/** "Was this a good question?" — one rating per user and question, used to improve the bank. */
export const questionFeedback = pgTable(
  "question_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    questionId: text("question_id")
      .notNull()
      .references(() => questionDefinitions.id),
    rating: smallint("rating").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("question_feedback_uq").on(t.userId, t.questionId),
    check("question_feedback_rating_ck", sql`${t.rating} in (-1, 1)`),
  ],
);

/** Which question was offered on which local day (enforces "about one per day"). */
export const dailyQuestionAssignments = pgTable(
  "daily_question_assignments",
  {
    userId: userRef(),
    day: date("day", { mode: "string" }).notNull(),
    slot: smallint("slot").notNull(),
    questionId: text("question_id")
      .notNull()
      .references(() => questionDefinitions.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day, t.slot] })],
);

// ---------------------------------------------------------------------------
// Preferences (self or a person) — history preserved in preference_values
// ---------------------------------------------------------------------------

export const preferenceCategories = pgTable("preference_categories", {
  id: text("id").primaryKey(),
  label: jsonb("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const preferenceItems = pgTable(
  "preference_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    /** NULL = the user themself. */
    personId: uuid("person_id"),
    categoryId: text("category_id")
      .notNull()
      .references(() => preferenceCategories.id),
    label: text("label").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("pref_items_user_person_idx").on(t.userId, t.personId),
    ownerUq("pref_items_owner_uq", t),
    ownedFk("pref_items_person_fk", [t.personId, t.userId], people),
    uniqueIndex("pref_items_uq").on(
      t.userId,
      sql`coalesce(${t.personId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
      t.categoryId,
      sql`lower(${t.label})`,
    ),
  ],
);

export const PREFERENCE_SENTIMENTS = ["love", "like", "neutral", "dislike", "avoid", "wants", "owns"] as const;
export const INFO_SOURCES = ["self_stated", "person_stated", "observed", "guess", "ai_suggested", "unverified"] as const;

export const preferenceValues = pgTable(
  "preference_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    itemId: uuid("item_id").notNull(),
    sentiment: text("sentiment").notNull(),
    source: text("source").notNull(),
    note: text("note"),
    recordedAt: ts("recorded_at").notNull().defaultNow(),
  },
  (t) => [
    index("pref_values_item_idx").on(t.itemId, t.recordedAt),
    ownedFk("pref_values_item_fk", [t.itemId, t.userId], preferenceItems),
    check("pref_sentiment_ck", sql`${t.sentiment} in ('love','like','neutral','dislike','avoid','wants','owns')`),
    check(
      "pref_source_ck",
      sql`${t.source} in ('self_stated','person_stated','observed','guess','ai_suggested','unverified')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Tendency model (derived, separate from the user's own words)
// ---------------------------------------------------------------------------

export const tendencyClaims = pgTable(
  "tendency_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    claimKey: text("claim_key").notNull(),
    /** Positive (+1) or negative (-1) pole of the claim key. */
    direction: smallint("direction").notNull(),
    modelVersion: text("model_version").notNull(),
    evidenceCount: integer("evidence_count").notNull(),
    supportCount: integer("support_count").notNull(),
    contradictCount: integer("contradict_count").notNull(),
    newestEvidenceAt: ts("newest_evidence_at"),
    /** 0..1, lower bound style confidence; never 1. */
    confidence: real("confidence").notNull(),
    /** proposed | confirmed | rejected | corrected */
    userStatus: text("user_status").notNull().default("proposed"),
    userNote: text("user_note"),
    /** False when evidence fell below threshold (e.g. after deletions) or was superseded. */
    isValid: boolean("is_valid").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("tendency_claims_user_key_uq").on(t.userId, t.claimKey),
    ownerUq("tendency_claims_owner_uq", t),
    check("tendency_status_ck", sql`${t.userStatus} in ('proposed','confirmed','rejected','corrected')`),
    check("tendency_direction_ck", sql`${t.direction} in (-1, 1)`),
  ],
);

export const tendencyEvidence = pgTable(
  "tendency_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    claimId: uuid("claim_id").notNull(),
    userId: userRef(),
    responseId: uuid("response_id").notNull(),
    /** +1 supports the claim direction, -1 contradicts it. */
    polarity: smallint("polarity").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("tendency_evidence_claim_idx").on(t.claimId),
    index("tendency_evidence_response_idx").on(t.responseId),
    ownedFk("tendency_evidence_claim_fk", [t.claimId, t.userId], tendencyClaims),
    ownedFk("tendency_evidence_response_fk", [t.responseId, t.userId], questionResponses),
  ],
);

// ---------------------------------------------------------------------------
// Important people (private to the recording user)
// ---------------------------------------------------------------------------

export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    nickname: text("nickname").notNull(),
    relationship: text("relationship").notNull().default("other"),
    note: text("note"),
    /** Optional, set by the owner for gift ideas only (a birthday with a year takes precedence). */
    ageBand: text("age_band"),
    /** Optional, set by the owner for gift ideas only. */
    gender: text("gender"),
    /** The QR connection (comparison session) this person is linked to, if any. Only the owner sees the link. */
    connectionSessionId: uuid("connection_session_id").references(() => comparisonSessions.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("people_user_idx").on(t.userId),
    uniqueIndex("people_connection_uq").on(t.userId, t.connectionSessionId),
    ownerUq("people_owner_uq", t),
    check("people_relationship_ck", sql`${t.relationship} in ('partner','family','friend','colleague','other')`),
    check("people_age_band_ck", sql`${t.ageBand} is null or ${t.ageBand} in ('baby','child','teens','20s','30s','40s','50s','60s','70plus')`),
    check("people_gender_ck", sql`${t.gender} is null or ${t.gender} in ('female','male','other')`),
  ],
);

export const relationshipEntries = pgTable(
  "relationship_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    personId: uuid("person_id").notNull(),
    /** conversation | joy | wish_together | note */
    kind: text("kind").notNull(),
    body: text("body").notNull(),
    source: text("source").notNull(),
    occurredOn: date("occurred_on", { mode: "string" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("rel_entries_person_idx").on(t.personId),
    ownedFk("rel_entries_person_fk", [t.personId, t.userId], people),
    check("rel_entries_kind_ck", sql`${t.kind} in ('conversation','joy','wish_together','note')`),
    check(
      "rel_entries_source_ck",
      sql`${t.source} in ('self_stated','person_stated','observed','guess','ai_suggested','unverified')`,
    ),
  ],
);

export const relationshipEvents = pgTable(
  "relationship_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    personId: uuid("person_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    place: text("place"),
    occurredOn: date("occurred_on", { mode: "string" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("rel_events_person_idx").on(t.personId, t.occurredOn),
    ownedFk("rel_events_person_fk", [t.personId, t.userId], people),
  ],
);

export const giftRecords = pgTable(
  "gift_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    personId: uuid("person_id").notNull(),
    item: text("item").notNull(),
    occasion: text("occasion"),
    givenOn: date("given_on", { mode: "string" }),
    /** Minor currency units are not assumed; stored as entered with currency code. */
    priceAmount: integer("price_amount"),
    priceCurrency: text("price_currency"),
    reaction: text("reaction").notNull().default("unknown"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("gift_records_person_idx").on(t.personId),
    ownedFk("gift_records_person_fk", [t.personId, t.userId], people),
    check("gift_reaction_ck", sql`${t.reaction} in ('loved','liked','neutral','disliked','unknown')`),
  ],
);

export const importantDates = pgTable(
  "important_dates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    personId: uuid("person_id"),
    label: text("label").notNull(),
    kind: text("kind").notNull(),
    month: smallint("month").notNull(),
    day: smallint("day").notNull(),
    year: integer("year"),
    /** NULL = no reminder. */
    remindDaysBefore: smallint("remind_days_before"),
    createdAt: createdAt(),
  },
  (t) => [
    index("important_dates_user_idx").on(t.userId, t.month, t.day),
    ownedFk("important_dates_person_fk", [t.personId, t.userId], people),
    check("important_dates_kind_ck", sql`${t.kind} in ('birthday','anniversary','custom')`),
    check("important_dates_md_ck", sql`${t.month} between 1 and 12 and ${t.day} between 1 and 31`),
    check("important_dates_remind_ck", sql`${t.remindDaysBefore} is null or ${t.remindDaysBefore} between 0 and 60`),
  ],
);

// ---------------------------------------------------------------------------
// Sharing & comparison
// ---------------------------------------------------------------------------

export const profileShares = pgTable(
  "profile_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    /** sha256(token). The raw token is shown once and never stored. */
    tokenHash: text("token_hash").notNull(),
    label: text("label"),
    expiresAt: ts("expires_at").notNull(),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    revokedAt: ts("revoked_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("profile_shares_token_uq").on(t.tokenHash), index("profile_shares_user_idx").on(t.userId)],
);

export const COMPARISON_SCOPES = ["tuvi", "tuvi_detail", "preferences", "values"] as const;

export const comparisonSessions = pgTable(
  "comparison_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shareId: uuid("share_id").references(() => profileShares.id, { onDelete: "set null" }),
    /** Share owner. */
    userA: uuid("user_a")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The user who opened the share link. */
    userB: uuid("user_b")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    revokedAt: ts("revoked_at"),
    revokedBy: uuid("revoked_by"),
    createdAt: createdAt(),
  },
  (t) => [
    index("comparison_sessions_a_idx").on(t.userA),
    index("comparison_sessions_b_idx").on(t.userB),
    uniqueIndex("comparison_sessions_open_pair_uq")
      .on(t.userA, t.userB)
      .where(sql`${t.status} <> 'revoked'`),
    check("comparison_status_ck", sql`${t.status} in ('pending','active','revoked')`),
    check("comparison_distinct_ck", sql`${t.userA} <> ${t.userB}`),
  ],
);

export const comparisonConsents = pgTable(
  "comparison_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => comparisonSessions.id, { onDelete: "cascade" }),
    userId: userRef(),
    scopes: text("scopes").array().notNull(),
    consentTextVersion: text("consent_text_version").notNull(),
    consentedAt: ts("consented_at").notNull().defaultNow(),
    withdrawnAt: ts("withdrawn_at"),
  },
  (t) => [
    uniqueIndex("comparison_consents_active_uq")
      .on(t.sessionId, t.userId)
      .where(sql`${t.withdrawnAt} is null`),
  ],
);

export const comparisonResults = pgTable("comparison_results", {
  sessionId: uuid("session_id")
    .primaryKey()
    .references(() => comparisonSessions.id, { onDelete: "cascade" }),
  engineVersion: text("engine_version").notNull(),
  result: jsonb("result").notNull(),
  computedAt: ts("computed_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Settings, export, audit
// ---------------------------------------------------------------------------

export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  dailyQuestion: boolean("daily_question").notNull().default(false),
  dateReminders: boolean("date_reminders").notNull().default(true),
  /** in_app only for now; email/push need external providers (see docs). */
  channel: text("channel").notNull().default("in_app"),
  updatedAt: updatedAt(),
});

export const dataExportJobs = pgTable(
  "data_export_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    status: text("status").notNull(),
    format: text("format").notNull().default("json"),
    byteSize: integer("byte_size"),
    createdAt: createdAt(),
    completedAt: ts("completed_at"),
  },
  (t) => [check("export_status_ck", sql`${t.status} in ('running','completed','failed')`)],
);

/** Security-relevant events. Never contains diary text, tokens, or birth data. */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_events_user_idx").on(t.userId, t.createdAt)],
);

/**
 * "How do you see me?": the owner asks someone they are connected with (a comparison session) to
 * answer the 17 axes about them. All reads and writes go through SECURITY DEFINER functions
 * (migration 0009): the owner never reads an anonymous answer on its own, only a summary once
 * at least three anonymous answers exist.
 */
export const peerRequests = pgTable(
  "peer_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    responderId: uuid("responder_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => comparisonSessions.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: createdAt(),
    answeredAt: ts("answered_at"),
  },
  (t) => [
    index("peer_requests_owner_idx").on(t.ownerId),
    index("peer_requests_responder_idx").on(t.responderId),
    uniqueIndex("peer_requests_one_pending_uq").on(t.ownerId, t.responderId).where(sql`${t.status} = 'pending'`),
    check("peer_requests_status_ck", sql`${t.status} in ('pending','answered','declined','cancelled','withdrawn')`),
    check("peer_requests_not_self_ck", sql`${t.ownerId} <> ${t.responderId}`),
  ],
);

export const peerResponses = pgTable(
  "peer_responses",
  {
    requestId: uuid("request_id")
      .primaryKey()
      .references(() => peerRequests.id, { onDelete: "cascade" }),
    anonymous: boolean("anonymous").notNull(),
    /** { axisKey: 1 | 0 | -1 } — 1 the first pole, -1 the second, 0 neither / don't know. */
    answers: jsonb("answers").notNull(),
    comment: text("comment"),
    createdAt: createdAt(),
  },
  (t) => [check("peer_responses_comment_ck", sql`${t.comment} is null or char_length(${t.comment}) <= 1000`)],
);

/**
 * "Show my manual to this person": one row per (connection, owner). Only the owner writes it,
 * through manual_share_set(); the other participant reads the shared parts through
 * manual_shared_with_me(), which applies the preset (friend / partner) on the database side.
 */
export const manualShares = pgTable(
  "manual_shares",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => comparisonSessions.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    preset: text("preset").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.ownerId] }), check("manual_shares_preset_ck", sql`${t.preset} in ('friend','partner')`)],
);

// ---------------------------------------------------------------------------
// Gift boxes: parents and grandparents write for a child, who receives it all on a date the
// box's owner sets. Every read and write goes through the SECURITY DEFINER functions of
// migration 0011; the app role has no grant on these tables.
// ---------------------------------------------------------------------------

export const GIFT_ROLES = ["father", "mother", "parent", "grandfather", "grandmother", "grandparent"] as const;

export const giftBoxes = pgTable(
  "gift_boxes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The box's manager: sets the date, invites and removes writers, hands it over. */
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    childName: text("child_name").notNull(),
    childBirthday: date("child_birthday"),
    deliverOn: date("deliver_on").notNull(),
    status: text("status").notNull().default("open"),
    deliveredTo: uuid("delivered_to").references(() => users.id, { onDelete: "set null" }),
    deliveredVia: text("delivered_via"),
    deliveredAt: ts("delivered_at"),
    receiveCodeHash: text("receive_code_hash"),
    receiveCodeExpiresAt: ts("receive_code_expires_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("gift_boxes_owner_idx").on(t.ownerId),
    uniqueIndex("gift_boxes_code_uq").on(t.receiveCodeHash),
    check("gift_boxes_status_ck", sql`${t.status} in ('open','delivered')`),
    check("gift_boxes_via_ck", sql`${t.deliveredVia} is null or ${t.deliveredVia} in ('account','pdf')`),
    check("gift_boxes_child_ck", sql`char_length(${t.childName}) between 1 and 60`),
  ],
);

export const giftWriters = pgTable(
  "gift_writers",
  {
    boxId: uuid("box_id")
      .notNull()
      .references(() => giftBoxes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    label: text("label"),
    joinedAt: ts("joined_at").notNull().defaultNow(),
    removedAt: ts("removed_at"),
  },
  (t) => [
    primaryKey({ columns: [t.boxId, t.userId] }),
    index("gift_writers_user_idx").on(t.userId),
    check("gift_writers_role_ck", sql`${t.role} in ('father','mother','parent','grandfather','grandmother','grandparent')`),
    check("gift_writers_label_ck", sql`${t.label} is null or char_length(${t.label}) <= 20`),
  ],
);

export const giftInvites = pgTable(
  "gift_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boxId: uuid("box_id")
      .notNull()
      .references(() => giftBoxes.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    role: text("role").notNull(),
    expiresAt: ts("expires_at").notNull(),
    usedBy: uuid("used_by").references(() => users.id, { onDelete: "set null" }),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("gift_invites_code_uq").on(t.codeHash), check("gift_invites_role_ck", sql`${t.role} in ('father','mother','parent','grandfather','grandmother','grandparent')`)],
);

export const giftEntries = pgTable(
  "gift_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boxId: uuid("box_id")
      .notNull()
      .references(() => giftBoxes.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    occurredOn: date("occurred_on"),
    title: text("title"),
    body: text("body").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("gift_entries_box_idx").on(t.boxId),
    check("gift_entries_kind_ck", sql`${t.kind} in ('growth','letter')`),
    check("gift_entries_title_ck", sql`${t.title} is null or char_length(${t.title}) <= 120`),
    check("gift_entries_body_ck", sql`char_length(${t.body}) between 1 and 5000`),
  ],
);

/** A writer's view of the child on the seventeen axes (as in "How do you see me?"). */
export const giftViews = pgTable(
  "gift_views",
  {
    boxId: uuid("box_id")
      .notNull()
      .references(() => giftBoxes.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    answers: jsonb("answers").notNull(),
    comment: text("comment"),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.boxId, t.authorId] }), check("gift_views_comment_ck", sql`${t.comment} is null or char_length(${t.comment}) <= 1000`)],
);

export const MEMORY_CIRCLES = ["partner", "family", "friend", "colleague"] as const;

/**
 * For records shared by relationship: which ones (as set on the person linked to each connection).
 * Written only via memory_set_audience().
 */
export const memoryCircles = pgTable(
  "memory_circles",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => memoryEntries.id, { onDelete: "cascade" }),
    circle: text("circle").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.circle] }), check("memory_circles_ck", sql`${t.circle} in ('partner','family','friend','colleague')`)],
);

/** Development only (DEV_TOOLS=on): test companions an account created, so it can remove them. */
export const devCompanions = pgTable(
  "dev_companions",
  {
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companionId: uuid("companion_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.companionId] })],
);

/**
 * One-to-one comments on a shared record. Every comment belongs to the thread between the
 * record's owner and one other person (`partner_id`); only those two can read it, and only while
 * the partner can still see the record (same rules as the shared feed). Read and written
 * through SECURITY DEFINER functions (migration 0018); the app role cannot touch the table.
 */
export const memoryComments = pgTable(
  "memory_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => memoryEntries.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("memory_comments_thread_idx").on(t.entryId, t.partnerId, t.createdAt),
    index("memory_comments_owner_idx").on(t.ownerId, t.createdAt),
    index("memory_comments_partner_idx").on(t.partnerId, t.createdAt),
    check("memory_comments_author_ck", sql`${t.authorId} in (${t.ownerId}, ${t.partnerId}) and ${t.ownerId} <> ${t.partnerId}`),
    check("memory_comments_body_ck", sql`char_length(${t.body}) between 1 and 2000`),
  ],
);

/** When each person last read a comment thread (for "new comments"). Own rows only. */
export const memoryCommentReads = pgTable(
  "memory_comment_reads",
  {
    userId: userRef(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => memoryEntries.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: ts("read_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.entryId, t.partnerId] })],
);

/** Raw bytes (photos sent in messages). */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/**
 * Direct messages. A conversation is one-to-one ("direct", only between people with an active
 * connection) or a group (everyone added by someone they're connected with). All reads and
 * writes go through the SECURITY DEFINER functions of migration 0021; the app role has no
 * direct access to these tables.
 */
export const dmConversations = pgTable(
  "dm_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    title: text("title"),
    /** "smaller-uuid:larger-uuid" for a direct conversation, so a pair has only one. */
    directKey: text("direct_key"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    lastMessageAt: ts("last_message_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("dm_conversations_direct_uq").on(t.directKey),
    check("dm_conversations_kind_ck", sql`${t.kind} in ('direct','group')`),
    check("dm_conversations_title_ck", sql`${t.title} is null or char_length(${t.title}) between 1 and 60`),
  ],
);

export const dmMembers = pgTable(
  "dm_members",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => dmConversations.id, { onDelete: "cascade" }),
    userId: userRef(),
    role: text("role").notNull().default("member"),
    joinedAt: ts("joined_at").notNull().defaultNow(),
    leftAt: ts("left_at"),
    lastReadAt: ts("last_read_at"),
    muted: boolean("muted").notNull().default(false),
    /** "Delete chat" for me: messages up to here are hidden from me. */
    hiddenBefore: ts("hidden_before"),
    typingUntil: ts("typing_until"),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] }), index("dm_members_user_idx").on(t.userId), check("dm_members_role_ck", sql`${t.role} in ('owner','member')`)],
);

export const dmMessages = pgTable(
  "dm_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => dmConversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    body: text("body"),
    replyTo: uuid("reply_to"),
    recordId: uuid("record_id").references(() => memoryEntries.id, { onDelete: "set null" }),
    /** System events: {"event": "created"|"added"|"left"|"renamed", ...}. */
    meta: jsonb("meta"),
    createdAt: createdAt(),
    /** Bumped on every change (edit, unsend, reaction), so clients can fetch what changed. */
    updatedAt: updatedAt(),
    editedAt: ts("edited_at"),
    deletedAt: ts("deleted_at"),
  },
  (t) => [
    index("dm_messages_conv_time_idx").on(t.conversationId, t.createdAt),
    index("dm_messages_conv_updated_idx").on(t.conversationId, t.updatedAt),
    check("dm_messages_kind_ck", sql`${t.kind} in ('text','image','record','system')`),
    check("dm_messages_body_ck", sql`${t.body} is null or char_length(${t.body}) <= 4000`),
  ],
);

export const dmReactions = pgTable(
  "dm_reactions",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => dmMessages.id, { onDelete: "cascade" }),
    userId: userRef(),
    emoji: text("emoji").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] }), check("dm_reactions_emoji_ck", sql`char_length(${t.emoji}) between 1 and 16`)],
);

export const dmAttachments = pgTable(
  "dm_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => dmConversations.id, { onDelete: "cascade" }),
    uploaderId: uuid("uploader_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => dmMessages.id, { onDelete: "cascade" }),
    position: smallint("position").notNull().default(0),
    mime: text("mime").notNull(),
    bytes: bytea("bytes").notNull(),
    size: integer("size").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("dm_attachments_message_idx").on(t.messageId),
    check("dm_attachments_mime_ck", sql`${t.mime} in ('image/jpeg','image/png','image/webp')`),
    check("dm_attachments_size_ck", sql`${t.size} between 1 and 2500000`),
  ],
);

/**
 * A profile photo (already cropped to a square in the browser). Read and written only through
 * the functions of migration 0023: shown to its owner, people they're connected with and people
 * they share a conversation with.
 */
export const userAvatars = pgTable(
  "user_avatars",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    mime: text("mime").notNull(),
    bytes: bytea("bytes").notNull(),
    size: integer("size").notNull(),
    version: integer("version").notNull().default(1),
    updatedAt: updatedAt(),
  },
  (t) => [check("user_avatars_mime_ck", sql`${t.mime} in ('image/jpeg','image/png','image/webp')`), check("user_avatars_size_ck", sql`${t.size} between 1 and 1000000`)],
);

/**
 * Link previews (Open Graph) fetched for web links people send, kept for a while so a link is
 * fetched once, not by every viewer. Public web content only; reached through the functions
 * of migration 0026.
 */
export const linkPreviews = pgTable(
  "link_previews",
  {
    urlHash: text("url_hash").primaryKey(),
    url: text("url").notNull(),
    status: text("status").notNull(),
    title: text("title"),
    description: text("description"),
    siteName: text("site_name"),
    imageMime: text("image_mime"),
    imageBytes: bytea("image_bytes"),
    fetchedAt: ts("fetched_at").notNull().defaultNow(),
  },
  (t) => [check("link_previews_status_ck", sql`${t.status} in ('ok','empty','failed')`), check("link_previews_mime_ck", sql`${t.imageMime} is null or ${t.imageMime} in ('image/jpeg','image/png','image/webp','image/gif')`)],
);

// ---------------------------------------------------------------------------
// Photos and videos on records (up to 5 per record). Stored here for now, in chunks so a
// video can be uploaded and played in parts; read and written only through the
// memory_media_* functions, which apply the record's own sharing rules.
// ---------------------------------------------------------------------------

export const MEDIA_CHUNK_BYTES = 4 * 1024 * 1024;

export const memoryMedia = pgTable(
  "memory_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    /** Null until the record it belongs to is saved. */
    entryId: uuid("entry_id").references(() => memoryEntries.id, { onDelete: "cascade" }),
    position: smallint("position").notNull().default(0),
    kind: text("kind").notNull(),
    mime: text("mime").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    durationMs: integer("duration_ms"),
    size: integer("size").notNull(),
    chunks: smallint("chunks").notNull(),
    /** A small JPEG for lists (a video's first frame). */
    thumb: bytea("thumb").notNull(),
    complete: boolean("complete").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("memory_media_entry_idx").on(t.entryId, t.position),
    index("memory_media_user_idx").on(t.userId, t.createdAt),
    check("memory_media_kind_ck", sql`${t.kind} in ('image','video')`),
    check("memory_media_mime_ck", sql`${t.mime} in ('image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm')`),
    check("memory_media_dims_ck", sql`${t.width} between 1 and 10000 and ${t.height} between 1 and 10000`),
  ],
);

export const memoryMediaChunks = pgTable(
  "memory_media_chunks",
  {
    mediaId: uuid("media_id")
      .notNull()
      .references(() => memoryMedia.id, { onDelete: "cascade" }),
    idx: smallint("idx").notNull(),
    bytes: bytea("bytes").notNull(),
  },
  (t) => [primaryKey({ columns: [t.mediaId, t.idx] })],
);

/**
 * The manual rewritten by AI, at the owner's request and only with AI turned on. Only the owner
 * reads it (shared manuals keep MOSAIC's template text). One per user, replaced on each rewrite.
 */
export const manualRewrites = pgTable("manual_rewrites", {
  userId: userRef().primaryKey(),
  locale: text("locale").notNull(),
  /** { [sectionId]: paragraphs } */
  sections: jsonb("sections").notNull(),
  /** How many pieces MOSAIC knew when it was written (to suggest a fresh rewrite later). */
  pieces: integer("pieces").notNull(),
  createdAt: createdAt(),
});
