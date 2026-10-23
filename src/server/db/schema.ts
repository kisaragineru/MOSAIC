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
    visibility: text("visibility").notNull().default("private"),
    currentVersion: integer("current_version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("memory_entries_user_created_idx").on(t.userId, t.createdAt),
    ownerUq("memory_entries_owner_uq", t),
    index("memory_entries_user_occurred_idx").on(t.userId, t.occurredOn),
    check(
      "memory_kind_ck",
      sql`${t.kind} in ('thought','feeling','memory','decision','goal','dream','regret','achievement','value','letter_to_future')`,
    ),
    check("memory_visibility_ck", sql`${t.visibility} in ('private')`),
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

export const COMPARISON_SCOPES = ["tuvi", "preferences", "values"] as const;

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
