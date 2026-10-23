/**
 * Deterministic daily question selection.
 *
 * Inputs are the catalog and the user's own history; output is one question id (or null).
 * Rules:
 *  - never offer follow-up-only questions directly
 *  - no repeats: skip questions answered in the last ANSWER_COOLDOWN_DAYS, skipped in the
 *    last SKIP_COOLDOWN_DAYS, or offered in the last OFFER_COOLDOWN_DAYS
 *  - no two sensitive questions back-to-back: if a recent offer was 'high' sensitivity,
 *    'high' is excluded; 'medium' is penalised after a medium/high one
 *  - prefer categories the user has answered least (fill information gaps)
 *  - slight preference for categories the user engages with (answers more than skips)
 *  - a question answered long ago (> ANSWER_COOLDOWN_DAYS) may come back so the user can
 *    notice change; it competes with a lower score than unanswered ones
 *  - ties broken by a stable hash of (user, day, question) — reproducible, not random
 */

export const ANSWER_COOLDOWN_DAYS = 180;
export const SKIP_COOLDOWN_DAYS = 21;
export const OFFER_COOLDOWN_DAYS = 10;

export interface CatalogQuestion {
  id: string;
  category: string;
  sensitivity: "low" | "medium" | "high";
  followUpOnly: boolean;
}

export interface HistoryEvent {
  questionId: string;
  kind: "answered" | "skipped" | "offered";
  /** Days ago (0 = today). */
  daysAgo: number;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function selectQuestion(
  catalog: CatalogQuestion[],
  history: HistoryEvent[],
  seed: string,
  excludeIds: string[] = [],
): string | null {
  const byId = new Map(catalog.map((q) => [q.id, q]));
  const lastAnswered = new Map<string, number>();
  const lastSkipped = new Map<string, number>();
  const lastOffered = new Map<string, number>();
  const answeredPerCategory = new Map<string, number>();
  const skippedPerCategory = new Map<string, number>();
  for (const e of history) {
    const map = e.kind === "answered" ? lastAnswered : e.kind === "skipped" ? lastSkipped : lastOffered;
    map.set(e.questionId, Math.min(map.get(e.questionId) ?? Infinity, e.daysAgo));
    const cat = byId.get(e.questionId)?.category;
    if (!cat) continue;
    if (e.kind === "answered") answeredPerCategory.set(cat, (answeredPerCategory.get(cat) ?? 0) + 1);
    if (e.kind === "skipped") skippedPerCategory.set(cat, (skippedPerCategory.get(cat) ?? 0) + 1);
  }

  const recentOffers = history
    .filter((e) => e.kind === "offered" && e.daysAgo <= 2)
    .map((e) => byId.get(e.questionId)?.sensitivity);
  const recentHigh = recentOffers.includes("high");
  const recentSensitive = recentHigh || recentOffers.includes("medium");

  const excluded = new Set(excludeIds);
  let best: { id: string; score: number; tie: number } | null = null;
  for (const q of catalog) {
    if (q.followUpOnly || excluded.has(q.id)) continue;
    const ans = lastAnswered.get(q.id);
    if (ans !== undefined && ans < ANSWER_COOLDOWN_DAYS) continue;
    const skp = lastSkipped.get(q.id);
    if (skp !== undefined && skp < SKIP_COOLDOWN_DAYS) continue;
    const off = lastOffered.get(q.id);
    if (off !== undefined && off < OFFER_COOLDOWN_DAYS) continue;
    if (q.sensitivity === "high" && recentHigh) continue;

    const answeredInCat = answeredPerCategory.get(q.category) ?? 0;
    const skippedInCat = skippedPerCategory.get(q.category) ?? 0;
    let score = 10 / (1 + answeredInCat); // information gap
    if (answeredInCat > skippedInCat) score += 1; // engagement
    if (skippedInCat > answeredInCat + 1) score -= 2; // user keeps skipping this area
    if (ans !== undefined) score -= 3; // revisit: lower priority than new questions
    if (q.sensitivity !== "low" && recentSensitive) score -= 4;
    if (q.sensitivity === "high") score -= 1;
    const tie = hash(`${seed}:${q.id}`);
    if (!best || score > best.score || (score === best.score && tie > best.tie)) best = { id: q.id, score, tie };
  }
  return best?.id ?? null;
}
