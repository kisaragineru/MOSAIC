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

export interface GuessClaim {
  key: TendencyKey;
  direction: 1 | -1;
  state: "consistent" | "emerging" | "mixed" | "insufficient";
  rejected: boolean;
}

export interface TypeGuess {
  /** Settled type(s): one, or two when tied (like two stars sharing a palace). Empty until settled. */
  types: MainStarId[];
  /** How far MOSAIC is toward settling it (0–100; 100 when settled). */
  progress: number;
  /** Axes known that say something about the types. */
  known: number;
}

/** Score every type against the answers; settle only with enough known axes and a clear lead. */
export function guessType(claims: GuessClaim[]): TypeGuess {
  const relevant = new Set(Object.values(TYPE_PROFILE).flatMap((p) => Object.keys(p)));
  const known = claims.filter((c) => !c.rejected && (c.state === "consistent" || c.state === "emerging") && relevant.has(c.key));
  const score = (id: MainStarId) =>
    known.reduce((n, c) => {
      const want = TYPE_PROFILE[id][c.key];
      return want ? n + (want === c.direction ? 1 : -1) * (c.state === "consistent" ? 1 : 0.6) : n;
    }, 0);
  const ranked = (Object.keys(TYPE_PROFILE) as MainStarId[]).map((id) => ({ id, s: score(id) })).sort((a, b) => b.s - a.s);
  const [a, b, c] = ranked;
  const enough = known.length >= AXES_NEEDED;
  const coverage = Math.min(1, known.length / AXES_NEEDED);
  if (enough && a!.s > 0) {
    if (a!.s - b!.s >= LEAD_NEEDED) return { types: [a!.id], progress: 100, known: known.length };
    // Two leading together, clearly ahead of the rest: read as two faces, as the chart would.
    if (a!.s - b!.s < 0.5 && b!.s - c!.s >= LEAD_NEEDED) return { types: [a!.id, b!.id], progress: 100, known: known.length };
  }
  // Not settled: coverage counts most; a near-settled lead shows as "almost" but never 100.
  return { types: [], progress: Math.min(95, Math.round(coverage * 90) + (enough ? 5 : 0)), known: known.length };
}
