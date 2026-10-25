/**
 * Who can see what, in one place: the settings that are otherwise spread over records,
 * answers, the profile and each connection, read with the same rules those features use
 * (a scope is shared only when both people agreed to it; records by visibility and circle;
 * answers marked "comparable"). Read-only: every change still happens where it lives.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { MEMORY_CIRCLES, birthProfiles, comparisonConsents, manualShares, memoryCircles, memoryEntries, people, profiles, tuviCharts } from "../db/schema";
import { withUser } from "../db/tx";
import { myAvatarUrl } from "./avatars";
import { listComparisons, listShares, sharedPreview } from "./sharing";

type Circle = (typeof MEMORY_CIRCLES)[number];

export interface PrivacyConnection {
  sessionId: string;
  name: string;
  otherId: string | null;
  status: "pending" | "active";
  personId: string | null;
  relationship: string | null;
  /** What I agreed to share in this connection. */
  myScopes: string[];
  /** What is actually shared: agreed by both. */
  sharedScopes: string[];
  manualPreset: string | null;
  /** My records this person can read now. */
  recordsVisible: number;
}

export interface PrivacyOverview {
  profile: { name: string; hasPhoto: boolean; hasBio: boolean; hasIntro: boolean };
  records: { total: number; private: number; everyone: number; byCircle: Record<Circle, number>; letters: number };
  answers: { shared: { preferences: number; values: number }; private: number };
  birth: { entered: boolean; hasChart: boolean };
  connections: PrivacyConnection[];
  activeLinks: number;
  aiOptIn: boolean;
}

export async function privacyOverview(userId: string): Promise<PrivacyOverview> {
  const [comparisons, shares, preview, photo] = await Promise.all([listComparisons(userId), listShares(userId), sharedPreview(userId), myAvatarUrl(userId)]);
  const open = comparisons.filter((c) => c.status !== "revoked");
  const ids = open.map((c) => c.id);
  return withUser(userId, async (tx) => {
    const [prof] = await tx.select({ ai: profiles.aiOptIn }).from(profiles).where(eq(profiles.userId, userId));
    const [birth] = await tx.select({ id: birthProfiles.userId }).from(birthProfiles).where(eq(birthProfiles.userId, userId));
    const [chart] = await tx.select({ id: tuviCharts.id }).from(tuviCharts).where(and(eq(tuviCharts.userId, userId), eq(tuviCharts.isCurrent, true)));

    // Records: one row per record with its circles, counted here.
    const recs = (
      await tx.execute<{ kind: string; visibility: string; circles: string[] | null }>(sql`
        select e.kind, e.visibility, array_remove(array_agg(mc.circle), null) as circles
        from ${memoryEntries} e left join ${memoryCircles} mc on mc.entry_id = e.id
        where e.user_id = ${userId}
        group by e.id, e.kind, e.visibility`)
    ).rows;
    const shareable = recs.filter((r) => r.kind !== "letter_to_future");
    const byCircle = Object.fromEntries(MEMORY_CIRCLES.map((c) => [c, shareable.filter((r) => r.visibility === "circles" && r.circles?.includes(c)).length])) as Record<Circle, number>;
    const everyone = shareable.filter((r) => r.visibility === "connections").length;

    // Connections: consents of both sides, my manual presets and the linked people, in three queries.
    const consents = ids.length
      ? await tx
          .select({ sessionId: comparisonConsents.sessionId, userId: comparisonConsents.userId, scopes: comparisonConsents.scopes })
          .from(comparisonConsents)
          .where(and(inArray(comparisonConsents.sessionId, ids), sql`${comparisonConsents.withdrawnAt} is null`))
      : [];
    const presets = ids.length
      ? await tx.select({ sessionId: manualShares.sessionId, preset: manualShares.preset }).from(manualShares).where(and(inArray(manualShares.sessionId, ids), eq(manualShares.ownerId, userId)))
      : [];
    const personIds = open.map((c) => c.personId).filter((x): x is string => !!x);
    const rels = personIds.length ? await tx.select({ id: people.id, r: people.relationship }).from(people).where(and(eq(people.userId, userId), inArray(people.id, personIds))) : [];

    const connections: PrivacyConnection[] = open.map((c) => {
      const mine = consents.find((x) => x.sessionId === c.id && x.userId === userId)?.scopes ?? [];
      const theirs = consents.find((x) => x.sessionId === c.id && x.userId !== userId)?.scopes ?? [];
      const relationship = rels.find((r) => r.id === c.personId)?.r ?? null;
      const circle = (MEMORY_CIRCLES as readonly string[]).includes(relationship ?? "") ? (relationship as Circle) : null;
      const active = c.status === "active";
      return {
        sessionId: c.id,
        name: c.otherName,
        otherId: c.otherId,
        status: active ? "active" : "pending",
        personId: c.personId,
        relationship,
        myScopes: mine,
        sharedScopes: active ? mine.filter((s) => theirs.includes(s)) : [],
        manualPreset: presets.find((p) => p.sessionId === c.id)?.preset ?? null,
        // Records reach active connections only.
        recordsVisible: active ? everyone + (circle ? byCircle[circle] : 0) : 0,
      };
    });

    const answers = preview.choices;
    return {
      profile: { name: preview.displayName, hasPhoto: !!photo, hasBio: !!preview.bio, hasIntro: !!preview.intro },
      records: {
        total: shareable.length,
        private: shareable.filter((r) => r.visibility === "private").length,
        everyone,
        byCircle,
        letters: recs.length - shareable.length,
      },
      answers: {
        shared: { preferences: answers.filter((a) => a.shared && a.scope === "preferences").length, values: answers.filter((a) => a.shared && a.scope === "values").length },
        private: answers.filter((a) => !a.shared).length,
      },
      birth: { entered: !!birth, hasChart: !!chart },
      connections,
      activeLinks: shares.filter((s) => s.status === "active").length,
      aiOptIn: !!prof?.ai,
    };
  });
}
