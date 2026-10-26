/**
 * MOSAIC's own judgment of a Tử Vi type from what someone answered, for when the birth hour (and so
 * the Self palace) is unknown. This is NOT a Tử Vi rule: each type is described on MOSAIC's
 * tendency axes from its plain-words portrait (STAR_PLAIN), and the answers are compared with
 * that. A type is only settled once enough axes are known and one type clearly leads; until then
 * there is progress, never a guess.
 */
import type { TendencyKey } from "@/content/questions";
import type { MainStarId } from "./stars";

/** Each type on MOSAIC's axes: +1 / -1 is the pole its portrait describes. */
export const TYPE_PROFILE: Record<MainStarId, Partial<Record<TendencyKey, 1 | -1>>> = {
  tu_vi: { ambition: 1, conflict: 1, tradition: 1, detail: -1 }, // みんなをまとめる王様
  thien_co: { decision_style: 1, planning: 1, novelty: 1, detail: 1 }, // 頭の回転が速い作戦参謀
  thai_duong: { social_energy: 1, expressiveness: 1, giving: 1, closeness: -1 }, // まわりを照らす太陽
  vu_khuc: { pace: 1, saving: 1, decision_style: 1, independence: 1 }, // 決断の早い実務家
  thien_dong: { calm: 1, conflict: -1, ambition: -1, planning: -1 }, // おだやかな平和主義者
  liem_trinh: { conflict: 1, expressiveness: 1, independence: 1, tradition: 1 }, // 筋を通す情熱家
  thien_phu: { saving: 1, planning: 1, calm: 1, risk: -1 }, // どっしり構える金庫番
  thai_am: { calm: -1, expressiveness: -1, closeness: 1, social_energy: -1 }, // 静かに見守る月
  tham_lang: { novelty: 1, social_energy: 1, risk: 1, saving: -1 }, // 好奇心いっぱいの人気者
  cu_mon: { decision_style: 1, detail: 1, conflict: 1, care_style: 1 }, // 言葉で切り込む分析家
  thien_tuong: { giving: 1, care_style: -1, conflict: -1, tradition: 1 }, // 公平な世話役
  thien_luong: { giving: 1, care_style: 1, closeness: 1, tradition: 1 }, // 頼れる兄貴・姉御
  that_sat: { independence: 1, risk: 1, pace: 1, ambition: 1 }, // ひとりで切り開く勇者
  pha_quan: { novelty: 1, risk: 1, tradition: -1, conflict: 1 }, // 古い殻を破る改革者
};

/** Axes that must be known (clear or emerging) before a type can be settled. */
export const AXES_NEEDED = 6;
/** How far the leading type must be ahead of the next. */
export const LEAD_NEEDED = 1.5;
/** A provisional type: this many axes with any lean (a single answer counts) and this lead. */
export const PROVISIONAL_AXES = 4;
export const PROVISIONAL_LEAD = 0.8;
/** Between the user's own two picks, one single-answer axis of difference is enough. */
export const PICK_LEAD = 0.4;

export interface GuessClaim {
  key: TendencyKey;
  direction: 1 | -1;
  state: "consistent" | "emerging" | "mixed" | "insufficient";
  rejected: boolean;
  /** Answers for and against the direction (a single answer is a weak lean). */
  support?: number;
  contradict?: number;
}

export interface TypeGuess {
  /** Settled type(s): one, or two when tied (like two stars sharing a palace). Empty until settled. */
  types: MainStarId[];
  /** Before it's settled: the type(s) the answers so far lean to, said as "maybe". */
  provisional: MainStarId[];
  /** How far MOSAIC is toward settling it (0–100; 100 when settled). */
  progress: number;
  /** Axes known that say something about the types. */
  known: number;
}

const RELEVANT = new Set(Object.values(TYPE_PROFILE).flatMap((p) => Object.keys(p)));
const IDS = Object.keys(TYPE_PROFILE) as MainStarId[];

/** Rank the types by the given leans (weight per axis); best first. */
export function rankTypes(leans: { key: TendencyKey; direction: 1 | -1; weight: number }[]) {
  return IDS.map((id) => ({
    id,
    s: leans.reduce((n, l) => {
      const want = TYPE_PROFILE[id][l.key];
      return want ? n + (want === l.direction ? 1 : -1) * l.weight : n;
    }, 0),
  })).sort((a, b) => b.s - a.s);
}

/** The leader alone, or the top two when they lead together; null without a clear lead. */
function leaders(r: { id: MainStarId; s: number }[], lead: number): MainStarId[] | null {
  const [a, b, c] = r;
  if (!a || a.s <= 0) return null;
  if (a.s - b!.s >= lead) return [a.id];
  if (a.s - b!.s < 0.5 && b!.s - c!.s >= lead) return [a.id, b!.id];
  return null;
}

/**
 * A provisional reading. With the user's own two picks it answers their question — which of the two
 * is closer (one axis of difference is enough) — unless another type clearly beats both. Without
 * picks, only a clear leader among all types.
 */
function provisionalOf(ranked: { id: MainStarId; s: number }[], picks: MainStarId[]): MainStarId[] {
  if (picks.length >= 2) {
    const mine = ranked.filter((x) => picks.includes(x.id));
    const best = ranked[0]!;
    if (!picks.includes(best.id) && best.s - mine[0]!.s >= PROVISIONAL_LEAD) return [best.id];
    if (mine[0]!.s > 0 && mine[0]!.s - mine[1]!.s >= PICK_LEAD) return [mine[0]!.id];
    return [];
  }
  return leaders(ranked, PROVISIONAL_LEAD) ?? [];
}

/** Settle only with enough known axes and a clear lead; before that, a provisional lean at most. */
export function guessType(claims: GuessClaim[], picks: MainStarId[] = []): TypeGuess {
  const usable = claims.filter((c) => !c.rejected && RELEVANT.has(c.key));
  const known = usable.filter((c) => c.state === "consistent" || c.state === "emerging");
  const coverage = Math.min(1, known.length / AXES_NEEDED);
  if (known.length >= AXES_NEEDED) {
    const settled = leaders(rankTypes(known.map((c) => ({ key: c.key, direction: c.direction, weight: c.state === "consistent" ? 1 : 0.6 }))), LEAD_NEEDED);
    if (settled) return { types: settled, provisional: [], progress: 100, known: known.length };
  }
  // Weak leans: every axis with more answers one way than the other, a single answer included.
  const leans = usable
    .filter((c) => c.state !== "mixed" && (c.state !== "insufficient" || (c.support ?? 0) > (c.contradict ?? 0)))
    .map((c) => ({ key: c.key, direction: c.direction, weight: c.state === "consistent" ? 1 : c.state === "emerging" ? 0.6 : 0.4 }));
  const provisional = leans.length >= PROVISIONAL_AXES ? provisionalOf(rankTypes(leans), picks) : [];
  // Not settled: coverage counts most; a near-settled lead shows as "almost" but never 100.
  return { types: [], provisional, progress: Math.min(95, Math.round(coverage * 90) + (known.length >= AXES_NEEDED ? 5 : 0)), known: known.length };
}

/**
 * The axis to ask about next: where the candidates (the user's own picks, or the current leaders)
 * disagree most and the answers don't say much yet. Null when nothing is left to separate them.
 */
export function nextQuizAxis(candidates: MainStarId[], claims: GuessClaim[], unseenOnly = false): TendencyKey | null {
  const pool = candidates.length >= 2 ? candidates : IDS;
  const answered = new Map(claims.map((c) => [c.key, (c.support ?? 0) + (c.contradict ?? 0)]));
  let best: { key: TendencyKey; split: number; seen: number } | null = null;
  for (const key of RELEVANT as Set<TendencyKey>) {
    const wants = pool.map((id) => TYPE_PROFILE[id][key] ?? 0);
    const split = Math.max(...wants) - Math.min(...wants);
    const seen = answered.get(key) ?? 0;
    if (split === 0 || seen >= 3 || (unseenOnly && seen > 0)) continue;
    // New axes first (each one widens what MOSAIC knows), then the sharpest split.
    if (!best || seen < best.seen || (seen === best.seen && split > best.split)) best = { key, split, seen };
  }
  return best?.key ?? null;
}
