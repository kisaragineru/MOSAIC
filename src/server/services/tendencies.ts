import { cache } from "react";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { TENDENCY_KEYS, TENDENCY_TEXT, type I18nText, type Signal, type TendencyKey } from "@/content/questions";
import { signalsFor, type Answer } from "@/lib/discovery/answers";
import { computeClaims, MIN_EVIDENCE, MODEL_VERSION, AGREEMENT_THRESHOLD } from "@/lib/discovery/tendency-model";
import { uuid } from "@/lib/validation/common";
import { questionResponses, questionVersions, tendencyClaims, tendencyEvidence } from "../db/schema";
import { withUser, type Tx } from "../db/tx";
import { notFound } from "../errors";

/**
 * Rebuild all tendency claims for a user from their CURRENT answers.
 * Called inside the same transaction as every answer/skip/delete, so a deleted response can
 * never keep supporting a claim (its evidence row is gone and counts are recomputed).
 */
export async function recomputeTendencies(tx: Tx, userId: string, now = new Date()) {
  // Serialize recomputation per user: concurrent answers (double submit, two tabs) otherwise
  // race on tendency_claims (unique violations / deadlocks) and roll back the answer itself.
  // Transaction-scoped, released at commit/rollback. Read Committed then sees the other
  // transaction's committed answer when this one proceeds.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`tendency:${userId}`}, 0))`);
  const latest = await tx.execute<{
    id: string;
    question_id: string;
    question_version: number;
    status: string;
    answer: Answer | null;
    answered_at: Date;
  }>(sql`
    select distinct on (question_id) id, question_id, question_version, status, answer, answered_at
    from ${questionResponses}
    where user_id = ${userId}
    order by question_id, answered_at desc, id desc`);
  const answered = latest.rows.filter((r) => r.status === "answered" && r.answer);
  const versions = answered.length
    ? await tx
        .select({ q: questionVersions.questionId, v: questionVersions.version, signals: questionVersions.signals })
        .from(questionVersions)
        .where(inArray(questionVersions.questionId, [...new Set(answered.map((r) => r.question_id))]))
    : [];
  const signalsOf = (q: string, v: number) =>
    (versions.find((x) => x.q === q && x.v === v)?.signals as Signal[] | null) ?? null;

  const computed = computeClaims(
    answered.map((r) => ({
      responseId: r.id,
      questionId: r.question_id,
      answeredAt: new Date(r.answered_at),
      signals: signalsFor(r.answer!, signalsOf(r.question_id, r.question_version)),
    })),
    now,
  );

  const existing = await tx.select().from(tendencyClaims).where(eq(tendencyClaims.userId, userId));
  const seen = new Set<string>();
  for (const c of computed) {
    seen.add(c.claimKey);
    const prev = existing.find((e) => e.claimKey === c.claimKey);
    const values = {
      direction: c.direction,
      modelVersion: MODEL_VERSION,
      evidenceCount: c.supportIds.length + c.contradictIds.length,
      supportCount: c.supportIds.length,
      contradictCount: c.contradictIds.length,
      newestEvidenceAt: c.newestEvidenceAt,
      confidence: c.confidence,
      isValid: c.isValid,
      updatedAt: now,
    };
    let claimId: string;
    if (!prev) {
      const [row] = await tx.insert(tendencyClaims).values({ userId, claimKey: c.claimKey, ...values }).returning();
      claimId = row!.id;
    } else {
      // A flipped direction is a different statement: previous feedback no longer applies.
      const flipped = prev.direction !== c.direction;
      await tx
        .update(tendencyClaims)
        .set({ ...values, ...(flipped ? { userStatus: "proposed", userNote: null } : {}) })
        .where(eq(tendencyClaims.id, prev.id));
      claimId = prev.id;
    }
    await tx.delete(tendencyEvidence).where(eq(tendencyEvidence.claimId, claimId));
    const ev = [
      ...c.supportIds.map((responseId) => ({ claimId, userId, responseId, polarity: 1 })),
      ...c.contradictIds.map((responseId) => ({ claimId, userId, responseId, polarity: -1 })),
    ];
    if (ev.length) await tx.insert(tendencyEvidence).values(ev);
  }
  for (const e of existing) {
    if (seen.has(e.claimKey)) continue;
    await tx.delete(tendencyEvidence).where(eq(tendencyEvidence.claimId, e.id));
    await tx
      .update(tendencyClaims)
      .set({ isValid: false, evidenceCount: 0, supportCount: 0, contradictCount: 0, confidence: 0, newestEvidenceAt: null, updatedAt: now })
      .where(eq(tendencyClaims.id, e.id));
  }
}

export type ClaimState = "consistent" | "emerging" | "mixed" | "insufficient";

export interface ClaimView {
  id: string;
  claimKey: TendencyKey;
  direction: 1 | -1;
  statement: I18nText;
  state: ClaimState;
  confidence: number;
  evidenceCount: number;
  supportCount: number;
  contradictCount: number;
  newestEvidenceAt: Date | null;
  userStatus: "proposed" | "confirmed" | "rejected" | "corrected";
  userNote: string | null;
  modelVersion: string;
  evidence: { responseId: string; questionId: string; polarity: number; answer: Answer | null; answeredAt: Date }[];
}

/** How sure a tendency is, from its counts (also used for what others are shown). */
export function claimState(evidence: number, support: number, confidence: number): ClaimState {
  if (evidence < MIN_EVIDENCE) return "insufficient";
  if (support / evidence < AGREEMENT_THRESHOLD) return "mixed";
  return confidence >= 0.5 ? "consistent" : "emerging";
}

const stateOf = (c: typeof tendencyClaims.$inferSelect): ClaimState => claimState(c.evidenceCount, c.supportCount, c.confidence);

async function listTendenciesUncached(userId: string): Promise<ClaimView[]> {
  return withUser(userId, async (tx) => {
    const claims = await tx
      .select()
      .from(tendencyClaims)
      .where(eq(tendencyClaims.userId, userId))
      .orderBy(desc(tendencyClaims.confidence));
    const ev = claims.length
      ? await tx
          .select({
            claimId: tendencyEvidence.claimId,
            responseId: tendencyEvidence.responseId,
            polarity: tendencyEvidence.polarity,
            questionId: questionResponses.questionId,
            answer: questionResponses.answer,
            answeredAt: questionResponses.answeredAt,
          })
          .from(tendencyEvidence)
          .innerJoin(questionResponses, eq(questionResponses.id, tendencyEvidence.responseId))
          .where(eq(tendencyEvidence.userId, userId))
      : [];
    return claims
      .filter((c) => (TENDENCY_KEYS as readonly string[]).includes(c.claimKey))
      .map((c) => {
        const key = c.claimKey as TendencyKey;
        return {
          id: c.id,
          claimKey: key,
          direction: c.direction as 1 | -1,
          statement: c.direction === 1 ? TENDENCY_TEXT[key].pos : TENDENCY_TEXT[key].neg,
          state: stateOf(c),
          confidence: c.confidence,
          evidenceCount: c.evidenceCount,
          supportCount: c.supportCount,
          contradictCount: c.contradictCount,
          newestEvidenceAt: c.newestEvidenceAt,
          userStatus: c.userStatus as ClaimView["userStatus"],
          userNote: c.userNote,
          modelVersion: c.modelVersion,
          evidence: ev
            .filter((e) => e.claimId === c.id)
            .map((e) => ({
              responseId: e.responseId,
              questionId: e.questionId,
              polarity: e.polarity,
              answer: e.answer as Answer | null,
              answeredAt: e.answeredAt,
            })),
        };
      });
  });
}

const feedbackSchema = z.object({
  status: z.enum(["confirmed", "rejected", "corrected", "proposed"]),
  note: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(1000).optional()),
});

/** The user's own judgement always wins over the model and is kept until the claim flips. */
export async function setTendencyFeedback(userId: string, claimId: string, input: unknown) {
  const id = uuid.parse(claimId);
  const f = feedbackSchema.parse(input);
  await withUser(userId, async (tx) => {
    const r = await tx
      .update(tendencyClaims)
      .set({ userStatus: f.status, userNote: f.note ?? null, updatedAt: new Date() })
      .where(and(eq(tendencyClaims.id, id), eq(tendencyClaims.userId, userId)))
      .returning({ id: tendencyClaims.id });
    if (r.length === 0) throw notFound();
  });
}

/** Read once per page render (several parts of a page ask for it); actions always read fresh. */
export const listTendencies = cache(listTendenciesUncached);
