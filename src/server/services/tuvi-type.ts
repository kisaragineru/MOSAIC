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
import { guessType } from "@/lib/tuvi/type-guess";
import { profiles } from "../db/schema";
import { withUser } from "../db/tx";
import { AppError } from "../errors";
import { audit } from "./audit";
import { listTendencies } from "./tendencies";

export interface TypeInsight {
  /** Where the type comes from: the chart, MOSAIC's judgment from answers, or not known yet. */
  source: "chart" | "answers" | "none";
  types: MainStarId[];
  /** With the chart: the Self palace borrows the opposite palace's stars. */
  borrowed: boolean;
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
  if (m && m.mains.length) return { source: "chart", types: m.mains, borrowed: m.borrowed, progress: 100, selfTypes };
  const g = guessType((await listTendencies(userId)).map((c) => ({ key: c.claimKey, direction: c.direction, state: c.state, rejected: c.userStatus === "rejected" })));
  return { source: g.types.length ? "answers" : "none", types: g.types, borrowed: false, progress: g.progress, selfTypes };
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
