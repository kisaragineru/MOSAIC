/**
 * Which Tử Vi type someone is, and how MOSAIC knows. In order of trust: the birth chart (exact,
 * with the birth time) > MOSAIC's judgment from their answers (once enough is known) > nothing yet.
 * What they picked themselves is kept beside it, always labelled as their own pick.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Chart } from "@/lib/tuvi/engine";
import { mainsOf } from "@/lib/tuvi/interpret";
import { MAIN_STARS, type MainStarId } from "@/lib/tuvi/stars";
import { QUESTION_BANK } from "@/content/questions";
import { guessType, nextQuizAxis, rankTypes, type GuessClaim } from "@/lib/tuvi/type-guess";
import { profiles } from "../db/schema";
import { withUser } from "../db/tx";
import { AppError } from "../errors";
import { audit } from "./audit";
import { answeredQuestionIds } from "./discovery";
import { listTendencies } from "./tendencies";

export interface TypeInsight {
  /** Where the type comes from: the chart, MOSAIC's judgment from answers, or not known yet. */
  source: "chart" | "answers" | "none";
  types: MainStarId[];
  /** With the chart: the Self palace borrows the opposite palace's stars. */
  borrowed: boolean;
  /** Before it's settled: the type(s) the answers so far lean to ("maybe"). */
  provisional: MainStarId[];
  /** Toward MOSAIC's judgment (0–100), when the chart can't say. */
  progress: number;
  /** What the user picked as "probably me". */
  selfTypes: MainStarId[];
}

const isStar = (x: string): x is MainStarId => (MAIN_STARS as readonly string[]).includes(x);

export async function typeInsight(userId: string, chart: Chart | null): Promise<TypeInsight> {
  const [p] = await withUser(userId, (tx) => tx.select({ selfTypes: profiles.selfTypes }).from(profiles).where(eq(profiles.userId, userId)));
  const selfTypes = (p?.selfTypes ?? []).filter(isStar);
  const m = chart && chart.menh !== null ? mainsOf(chart, "menh") : null;
  if (m && m.mains.length) return { source: "chart", types: m.mains, borrowed: m.borrowed, provisional: [], progress: 100, selfTypes };
  const g = guessType(await guessClaims(userId), selfTypes);
  return { source: g.types.length ? "answers" : "none", types: g.types, borrowed: false, provisional: g.provisional, progress: g.progress, selfTypes };
}

async function guessClaims(userId: string): Promise<GuessClaim[]> {
  return (await listTendencies(userId)).map((c) => ({ key: c.claimKey, direction: c.direction, state: c.state, rejected: c.userStatus === "rejected", support: c.supportCount, contradict: c.contradictCount }));
}

/**
 * The next question for the type quiz: one tap, unanswered, on the axis that best separates the
 * user's own picks (or, without picks, the current leaders). Null when there's nothing left to ask.
 */
export async function nextTypeQuestion(userId: string, selfTypes: MainStarId[]): Promise<string | null> {
  const claims = await guessClaims(userId);
  const answered = await answeredQuestionIds(userId);
  const leaders = rankTypes(claims.filter((c) => c.state !== "mixed").map((c) => ({ key: c.key, direction: c.direction, weight: 1 }))).slice(0, 4).map((x) => x.id);
  // What to tell apart, in turn: their own picks, then the current leaders, then all types.
  const pools = [...(selfTypes.length >= 2 ? [selfTypes] : []), leaders, []];
  const skipped = new Set<string>();
  const asked = () => [...claims, ...[...skipped].map((k) => ({ key: k as GuessClaim["key"], direction: 1 as const, state: "insufficient" as const, rejected: false, support: 3 }))];
  for (const unseenOnly of [true, false]) {
    for (const pool of pools) {
      for (let i = 0; i < 8; i++) {
        const axis = nextQuizAxis(pool, asked(), unseenOnly);
        if (!axis) break;
        // Prefer the questions written for the axes; one tap only.
        const q = QUESTION_BANK.filter((x) => !x.followUpOnly && (x.format === "single" || x.format === "scale") && !answered.has(x.id) && x.signals?.some((s) => s.claimKey === axis)).sort((a, b) => Number(b.id.startsWith("ax.")) - Number(a.id.startsWith("ax.")))[0];
        if (q) return q.id;
        skipped.add(axis);
      }
    }
  }
  return null;
}

/** Save the types the user picked as "probably me" (up to two; none clears them). */
export async function saveSelfTypes(userId: string, input: unknown) {
  const picked = z.array(z.string()).max(14).parse(input).filter(isStar);
  if (new Set(picked).size > 2) throw new AppError("too_many_types", 400);
  await withUser(userId, async (tx) => {
    await tx.update(profiles).set({ selfTypes: picked.length ? [...new Set(picked)] : null, updatedAt: new Date() }).where(eq(profiles.userId, userId));
    await audit(tx, userId, "tuvi.self_types_saved");
  });
}
