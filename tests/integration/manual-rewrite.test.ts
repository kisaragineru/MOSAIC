import { beforeEach, describe, expect, it, vi } from "vitest";

// The AI call is stubbed: these tests check what is sent, stored and shown, not the model.
const ai = vi.hoisted(() => ({ configured: true, calls: [] as { system: string; user: string }[] }));
vi.mock("@/server/ai/claude", () => ({
  aiConfigured: () => ai.configured,
  generateStructured: async (o: { system: string; user: string; timeoutMs?: number }) => {
    if (!o.timeoutMs || o.timeoutMs > 26_000) throw new Error("each call must fit a hosted request");
    ai.calls.push(o);
    const { chapter } = JSON.parse(o.user) as { chapter: { id: string } };
    return { ok: true, data: { paragraphs: [`REWRITTEN ${chapter.id}`] } };
  },
}));

import { answerQuestion } from "@/server/services/discovery";
import { clearManualRewrite, getManualRewrite, rewriteManual } from "@/server/services/manual-rewrite";
import { setAiOptIn } from "@/server/services/reflection";
import { manualRewrites } from "@/server/db/schema";
import { withUser } from "@/server/db/tx";
import { makeUser } from "../helpers/factory";

describe("manual rewritten by AI", () => {
  beforeEach(() => {
    ai.configured = true;
    ai.calls.length = 0;
  });

  it("needs the owner's opt-in and a configured server; sends nothing otherwise", async () => {
    const u = await makeUser("Hana");
    await answerQuestion(u.userId, { questionId: "fut.one_thing", questionVersion: 1, answer: { text: "Learn to swim" } });
    expect(await rewriteManual(u.userId, "en")).toEqual({ ok: false, reason: "not_opted_in" });
    await setAiOptIn(u.userId, true);
    ai.configured = false;
    expect(await rewriteManual(u.userId, "en")).toEqual({ ok: false, reason: "not_configured" });
    expect(ai.calls).toHaveLength(0);
    expect(await getManualRewrite(u.userId, "en")).toBeNull();
  });

  it("rewrites the prose sections from the manual's own text, keeps it for the owner only, and can be undone", async () => {
    const u = await makeUser("Hana");
    const other = await makeUser("Other");
    await answerQuestion(u.userId, { questionId: "fut.one_thing", questionVersion: 1, answer: { text: "Learn to swim" } });
    await answerQuestion(u.userId, { questionId: "l.place_relax", questionVersion: 1, answer: { choice: "sea" } });
    await setAiOptIn(u.userId, true);

    expect(await rewriteManual(u.userId, "en")).toEqual({ ok: true });
    // One request per chapter (each fits inside a hosted request's time limit).
    const sent = ai.calls.map((c) => JSON.parse(c.user) as { name: string; chapter: { id: string; text: string } });
    expect(sent.every((x) => x.name === "Hana")).toBe(true);
    expect(sent.map((x) => x.chapter.id)).toContain("summary");
    expect(sent.find((x) => x.chapter.id === "future")!.chapter.text).toContain("Learn to swim");
    // Only the prose chapters go; the axis chapters keep their own portraits.
    expect(sent.some((x) => ["self", "mind", "people", "life", "intro"].includes(x.chapter.id))).toBe(false);
    expect(ai.calls[0]!.system).toMatch(/ONLY the facts/);

    const r = await getManualRewrite(u.userId, "en");
    expect(r?.sections.summary).toEqual(["REWRITTEN summary"]);
    expect(await getManualRewrite(u.userId, "ja")).toBeNull(); // written for one language
    expect(await getManualRewrite(other.userId, "en")).toBeNull();
    // Row-level security: another user's whole-table read sees nothing.
    expect(await withUser(other.userId, (tx) => tx.select().from(manualRewrites))).toEqual([]);

    await clearManualRewrite(u.userId);
    expect(await getManualRewrite(u.userId, "en")).toBeNull();
  });
});
