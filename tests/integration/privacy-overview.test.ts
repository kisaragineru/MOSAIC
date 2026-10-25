import { describe, expect, it } from "vitest";
import { createMemory } from "@/server/services/memories";
import { setMemoryAudience } from "@/server/services/memory-share";
import { setManualShare } from "@/server/services/manual-share";
import { addPersonFromConnection, createShare, giveConsent, openComparison } from "@/server/services/sharing";
import { privacyOverview } from "@/server/services/privacy";
import { answerQuestion } from "@/server/services/discovery";
import { makeUser } from "../helpers/factory";

describe("privacy overview", () => {
  it("shows what each connection really sees: scopes both agreed to, records by circle, the manual", async () => {
    const me = await makeUser("Me");
    const mum = await makeUser("Mum");
    const pal = await makeUser("Pal");
    const waiting = await makeUser("Waiting");

    // Mum: family. I agree to Tử Vi and preferences; she only to preferences.
    const s1 = await openComparison(mum.userId, (await createShare(me.userId)).token);
    await giveConsent(me.userId, s1, { scopes: ["tuvi", "preferences"], agree: true });
    await giveConsent(mum.userId, s1, { scopes: ["preferences"], agree: true });
    await addPersonFromConnection(me.userId, s1, "family");
    await setManualShare(me.userId, s1, "partner");
    // Pal: a friend, values both ways.
    const s2 = await openComparison(pal.userId, (await createShare(me.userId)).token);
    await giveConsent(me.userId, s2, { scopes: ["values"], agree: true });
    await giveConsent(pal.userId, s2, { scopes: ["values"], agree: true });
    await addPersonFromConnection(me.userId, s2, "friend");
    // Not agreed yet: nothing shared.
    await openComparison(waiting.userId, (await createShare(me.userId)).token);

    const all = await createMemory(me.userId, { kind: "memory", body: "みんなへ" });
    await setMemoryAudience(me.userId, all, { visibility: "connections" });
    const fam = await createMemory(me.userId, { kind: "memory", body: "家族へ" });
    await setMemoryAudience(me.userId, fam, { visibility: "circles", circles: ["family"] });
    await createMemory(me.userId, { kind: "memory", body: "自分だけ" });
    await answerQuestion(me.userId, { questionId: "l.scent", questionVersion: 1, answer: { choices: ["citrus"] }, privacy: "comparable" });
    await answerQuestion(me.userId, { questionId: "l.sweets", questionVersion: 1, answer: { choice: "love" }, privacy: "private" });

    const o = await privacyOverview(me.userId);
    expect(o.records).toMatchObject({ total: 3, private: 1, everyone: 1, byCircle: { family: 1, friend: 0, partner: 0, colleague: 0 }, letters: 0 });
    expect(o.answers).toEqual({ shared: { preferences: 1, values: 0 }, private: 1 });
    expect(o.birth).toEqual({ entered: false, hasChart: false });
    const by = (n: string) => o.connections.find((c) => c.name === n)!;
    expect(by("Mum")).toMatchObject({ status: "active", relationship: "family", myScopes: ["tuvi", "preferences"], sharedScopes: ["preferences"], manualPreset: "partner", recordsVisible: 2 });
    expect(by("Pal")).toMatchObject({ relationship: "friend", sharedScopes: ["values"], manualPreset: null, recordsVisible: 1 });
    expect(by("Waiting")).toMatchObject({ status: "pending", sharedScopes: [], recordsVisible: 0 });
    expect(o.activeLinks).toBe(3);

    // Only my own settings: the others' overviews know nothing of mine.
    const theirs = await privacyOverview(mum.userId);
    expect(theirs.records.total).toBe(0);
    expect(theirs.connections.find((c) => c.name === "Me")).toMatchObject({ myScopes: ["preferences"], sharedScopes: ["preferences"], manualPreset: null, recordsVisible: 0 });
  });
});
