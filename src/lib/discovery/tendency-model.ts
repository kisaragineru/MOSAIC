/**
 * Rule-based tendency model (MODEL_VERSION). Deterministic and explainable:
 * every claim is backed by the ids of the responses that support or contradict it.
 *
 *  - Only each question's LATEST answer counts (older answers stay in history but describe
 *    who the user was, not who they are now).
 *  - A claim needs at least MIN_EVIDENCE signals from different questions.
 *  - If fewer than 2/3 of signals agree, the claim is "mixed" (not asserted either way).
 *  - Confidence is the Wilson lower bound (80%) of the agreeing share, decayed by evidence
 *    age (half-life EVIDENCE_HALF_LIFE_YEARS). It is never 1.
 */
import type { Signal, TendencyKey } from "@/content/questions";

export const MODEL_VERSION = "rules-1";
export const MIN_EVIDENCE = 3;
export const AGREEMENT_THRESHOLD = 2 / 3;
export const EVIDENCE_HALF_LIFE_YEARS = 3;

export interface ModelResponse {
  responseId: string;
  questionId: string;
  answeredAt: Date;
  signals: Signal[];
}

export interface ComputedClaim {
  claimKey: TendencyKey;
  direction: 1 | -1;
  supportIds: string[];
  contradictIds: string[];
  newestEvidenceAt: Date | null;
  confidence: number;
  /** true = enough agreeing evidence to state the claim; false = too little or mixed. */
  isValid: boolean;
  mixed: boolean;
}

function wilsonLower(successes: number, n: number, z = 1.2816): number {
  if (n === 0) return 0;
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return (centre - margin) / denom;
}

export function computeClaims(responses: ModelResponse[], now: Date): ComputedClaim[] {
  const byKey = new Map<TendencyKey, { pos: ModelResponse[]; neg: ModelResponse[] }>();
  for (const r of responses) {
    // One vote per (question, claim): a multi-choice answer can't stack signals.
    const seen = new Set<string>();
    for (const s of r.signals) {
      const k = `${s.claimKey}:${s.direction}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const bucket = byKey.get(s.claimKey) ?? { pos: [], neg: [] };
      (s.direction === 1 ? bucket.pos : bucket.neg).push(r);
      byKey.set(s.claimKey, bucket);
    }
  }
  const out: ComputedClaim[] = [];
  for (const [claimKey, { pos, neg }] of byKey) {
    const n = pos.length + neg.length;
    const direction: 1 | -1 = pos.length >= neg.length ? 1 : -1;
    const support = direction === 1 ? pos : neg;
    const contradict = direction === 1 ? neg : pos;
    const newest = [...pos, ...neg].reduce<Date | null>((m, r) => (!m || r.answeredAt > m ? r.answeredAt : m), null);
    const share = n ? support.length / n : 0;
    const ageYears = newest ? Math.max(0, (now.getTime() - newest.getTime()) / (365.25 * 86400_000)) : 0;
    const decay = Math.pow(0.5, ageYears / EVIDENCE_HALF_LIFE_YEARS);
    const confidence = Math.round(wilsonLower(support.length, n) * decay * 1000) / 1000;
    const mixed = n >= MIN_EVIDENCE && share < AGREEMENT_THRESHOLD;
    out.push({
      claimKey,
      direction,
      supportIds: support.map((r) => r.responseId),
      contradictIds: contradict.map((r) => r.responseId),
      newestEvidenceAt: newest,
      confidence,
      isValid: n >= MIN_EVIDENCE && !mixed,
      mixed,
    });
  }
  return out.sort((a, b) => a.claimKey.localeCompare(b.claimKey));
}
