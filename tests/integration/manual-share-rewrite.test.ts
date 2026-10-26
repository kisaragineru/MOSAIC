import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The AI call is stubbed: these tests pin what is sent, who may read the result, and when.
const ai = vi.hoisted(() => ({ calls: [] as { system: string; user: string }[] }));
vi.mock("@/server/ai/claude", () => ({
  aiConfigured: () => true,
  generateStructured: async (o: { system: string; user: string }) => {
    ai.calls.push(o);
    return { ok: true, data: { paragraphs: [`SHARED ${(JSON.parse(o.user) as { part: string }).part}`] } };
  },
}));

import { QUESTION_BANK, type TendencyKey } from "@/content/questions";
import { manualShareRewrites } from "@/server/db/schema";
import { withUser } from "@/server/db/tx";
import { answerQuestion } from "@/server/services/discovery";
import { setManualShare, sharedManualFor, sharedManualPreview } from "@/server/services/manual-share";
import { approveSharedRewrite, clearSharedRewrite, rewriteSharedUnit, sharedRewriteFor, sharedRewriteState, sharedUnits } from "@/server/services/manual-share-rewrite";
import { setAiOptIn } from "@/server/services/reflection";
import { createShare, openComparison } from "@/server/services/sharing";
import { makeUser } from "../helpers/factory";

async function lean(userId: string, key: TendencyKey) {
  for (const q of QUESTION_BANK.filter((x) => x.signals?.[0]?.claimKey === key && !x.followUpOnly)) {
    const s = q.signals!.find((x) => x.claimKey === key && x.direction === 1)!;
    const answer = s.whenValue ? (q.format === "multi" ? { choices: [s.whenValue] } : { choice: s.whenValue }) : { scale: q.scale!.max };
    await answerQuestion(userId, { questionId: q.id, questionVersion: q.version, answer });
  }
}

async function setup() {
  const owner = await makeUser("Hana");
  const friend = await makeUser("Sora");
  const stranger = await makeUser("Mio");
  const s = await createShare(owner.userId);
  const session = await openComparison(friend.userId, s.token);
  await lean(owner.userId, "planning");
  // Private: a likes answer not marked as shown, and a tendency outside the friend preset.
  await answerQuestion(owner.userId, { questionId: "l.meals", questionVersion: 1, answer: { choice: "cook" }, privacy: "private" });
  await lean(owner.userId, "saving");
  await setManualShare(owner.userId, session, "friend");
  await setAiOptIn(owner.userId, true);
  return { owner, friend, stranger, session };
}

async function rewriteAll(userId: string) {
  const m = await sharedManualPreview(userId, "friend", "en");
  for (const [i, u] of sharedUnits(m).entries()) expect(await rewriteSharedUnit(userId, "friend", "en", u, i === 0)).toEqual({ ok: true });
}

describe("the shared manual rewritten by AI", () => {
  beforeEach(() => void (ai.calls.length = 0));

  it("is written only from what the preset shows", async () => {
    const { owner } = await setup();
    await rewriteAll(owner.userId);
    const sent = ai.calls.map((c) => c.user).join("\n");
    expect(sent).toMatch(/plans ahead/);
    // Not shown to friends: the 'saving' tendency (partner only) and the private likes answer.
    expect(sent).not.toMatch(/sav|money|cook|Cooked/i);
  });

  it("reaches the other person only after the owner approves it, and only while the shared content is unchanged", async () => {
    const { owner, friend, stranger, session } = await setup();
    await rewriteAll(owner.userId);
    const seen = async () => sharedRewriteFor(friend.userId, session, "en", (await sharedManualFor(friend.userId, session, "en"))!);
    expect(await seen()).toBeNull(); // not approved yet
    await approveSharedRewrite(owner.userId, "friend", true);
    expect((await seen())?.["ch.self"]).toEqual(["SHARED ch.self"]);
    // Not to someone outside the connection, and not in another language.
    await expect(sharedRewriteFor(stranger.userId, session, "en", (await sharedManualPreview(owner.userId, "friend", "en")))).rejects.toThrow();
    expect(await sharedRewriteFor(friend.userId, session, "ja", (await sharedManualFor(friend.userId, session, "ja"))!)).toBeNull();
    // The shared content changes: the old rewrite stops being shown, and the owner sees why.
    await lean(owner.userId, "closeness");
    expect(await seen()).toBeNull();
    const m = await sharedManualPreview(owner.userId, "friend", "en");
    expect((await sharedRewriteState(owner.userId, "friend", "en", m))?.stale).toBe(true);
    // Withdrawn and cleared.
    await clearSharedRewrite(owner.userId, "friend");
    expect(await sharedRewriteState(owner.userId, "friend", "en", m)).toBeNull();
  });

  it("is the owner's alone at the table level", async () => {
    const { owner, friend } = await setup();
    await rewriteAll(owner.userId);
    await approveSharedRewrite(owner.userId, "friend", true);
    expect(await withUser(friend.userId, (tx) => tx.select().from(manualShareRewrites))).toEqual([]);
    expect((await withUser(friend.userId, (tx) => tx.execute(sql`select count(*)::int as n from manual_share_rewrites`))).rows[0]).toEqual({ n: 0 });
  });
});
