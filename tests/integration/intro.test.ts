import { describe, expect, it } from "vitest";
import { getAccount } from "@/server/services/account";
import { answerQuestion } from "@/server/services/discovery";
import { draftIntro, introGrowth, saveIntro } from "@/server/services/intro";
import { setManualShare, sharedManualFor } from "@/server/services/manual-share";
import { createShare, getComparison, giveConsent, openComparison, sharedPreview } from "@/server/services/sharing";
import { makeUser } from "../helpers/factory";

const pick = (u: string, q: string, choice: string) => answerQuestion(u, { questionId: q, questionVersion: 1, answer: { choice } });

describe("the two-layer introduction", () => {
  it("drafts from the user's own answers, and nothing is saved until they save it", async () => {
    const u = await makeUser("Hana");
    await pick(u.userId, "p.weekend_plan", "plan");
    await pick(u.userId, "ax.plan_pack", "packed_list");
    await pick(u.userId, "ax.plan_deadline", "early");
    await pick(u.userId, "l.season", "autumn");
    const d = await draftIntro(u.userId, { length: "short", tone: "polite" }, "ja");
    expect(d).toMatchObject({ source: "template", aiUnavailable: null });
    expect(d.text).toBe("先に計画を立てるタイプです。好きな季節は秋です。");
    expect((await getAccount(u.userId)).profile.intro).toBeNull();
    // Bad options fall back to the defaults instead of failing.
    expect((await draftIntro(u.userId, { length: "huge", tone: "?" }, "en")).text).toContain("I'm someone who plans ahead.");
  });

  it("does not use AI without the user's opt-in", async () => {
    const u = await makeUser();
    const d = await draftIntro(u.userId, { ai: true }, "en");
    expect(d).toMatchObject({ source: "template", aiUnavailable: "not_opted_in" });
  });

  it("is saved as the user wrote it, counts what MOSAIC learns afterwards, and can be withdrawn", async () => {
    const u = await makeUser();
    await saveIntro(u.userId, "  計画派です。手直ししました。  ");
    const p = (await getAccount(u.userId)).profile;
    expect(p.intro).toBe("計画派です。手直ししました。");
    expect(p.introPieces).toBe(0);
    await pick(u.userId, "p.weekend_plan", "plan");
    await pick(u.userId, "l.season", "autumn");
    expect(await introGrowth(u.userId, p.introPieces)).toBe(2);
    await saveIntro(u.userId, "");
    expect((await getAccount(u.userId)).profile).toMatchObject({ intro: null, introPieces: null });
    await expect(saveIntro(u.userId, "x".repeat(2001))).rejects.toThrow();
  });

  it("is shown to a connection beside the bio, after consent, and in a shared manual", async () => {
    const a = await makeUser("Hana");
    const b = await makeUser("Sora");
    await saveIntro(a.userId, "MOSAICの紹介文");
    const s = await createShare(a.userId);
    const id = await openComparison(b.userId, s.token);
    expect((await getComparison(b.userId, id)).otherIntro).toBeNull(); // not before consent
    await giveConsent(a.userId, id, { scopes: ["preferences"], agree: true });
    expect(await getComparison(b.userId, id)).toMatchObject({ otherIntro: "MOSAICの紹介文", otherBio: null });
    expect((await sharedPreview(a.userId)).intro).toBe("MOSAICの紹介文");
    await setManualShare(a.userId, id, "friend");
    expect((await sharedManualFor(b.userId, id, "ja"))!.intro).toBe("MOSAICの紹介文");
  });
});
