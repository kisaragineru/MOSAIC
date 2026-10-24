/**
 * The first-run guide: three questions that reveal a first tile, a few words about yourself,
 * then home. Finishing or skipping it is remembered (profiles.onboarded_at).
 */
import { eq } from "drizzle-orm";
import type { TendencyKey } from "@/content/questions";
import { profiles } from "../db/schema";
import { withUser } from "../db/tx";
import { answeredQuestionIds } from "./discovery";
import { listTendencies, type ClaimState } from "./tendencies";
import { audit } from "./audit";

/** Three questions on one axis: enough for its tile to say something. */
export const SEED_AXIS: TendencyKey = "planning";
export const SEED_QUESTIONS = ["p.weekend_plan", "ax.plan_pack", "ax.plan_deadline"] as const;

export interface OnboardingState {
  done: boolean;
  /** Seed questions not answered yet, in order. */
  left: string[];
  /** The seed axis once it says something. */
  tile: { direction: 1 | -1; state: ClaimState } | null;
  bio: string | null;
}

export async function onboardingState(userId: string): Promise<OnboardingState> {
  const [p] = await withUser(userId, (tx) => tx.select({ at: profiles.onboardedAt, bio: profiles.bio }).from(profiles).where(eq(profiles.userId, userId)));
  const answered = await answeredQuestionIds(userId);
  const claim = (await listTendencies(userId)).find((c) => c.claimKey === SEED_AXIS);
  return {
    done: !!p?.at,
    left: SEED_QUESTIONS.filter((q) => !answered.has(q)),
    tile: claim && claim.state !== "insufficient" ? { direction: claim.direction, state: claim.state } : null,
    bio: p?.bio ?? null,
  };
}

export async function finishOnboarding(userId: string) {
  await withUser(userId, async (tx) => {
    await tx.update(profiles).set({ onboardedAt: new Date() }).where(eq(profiles.userId, userId));
    await audit(tx, userId, "onboarding.finished");
  });
}
