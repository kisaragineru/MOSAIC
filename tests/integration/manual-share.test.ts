import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { QUESTION_BANK, type TendencyKey } from "@/content/questions";
import { withUser } from "@/server/db/tx";
import { answerQuestion } from "@/server/services/discovery";
import { buildExport } from "@/server/services/export";
import { myManualShare, setManualShare, sharedManualFor, sharedManualPreview } from "@/server/services/manual-share";
import { createShare, openComparison, revokeComparison } from "@/server/services/sharing";
import { listTendencies, setTendencyFeedback } from "@/server/services/tendencies";
import { makeUser } from "../helpers/factory";

async function connect(ownerId: string, otherId: string) {
  const s = await createShare(ownerId);
  return openComparison(otherId, s.token);
}

/** Answer every question of an axis toward its positive pole. */
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
  const session = await connect(owner.userId, friend.userId);
  await withUser(owner.userId, (tx) => tx.execute(sql`update profiles set bio = 'Tokyo. Bread and mountains.' where user_id = ${owner.userId}`));
  await lean(owner.userId, "planning");
  await lean(owner.userId, "saving");
  await lean(owner.userId, "closeness");
  await answerQuestion(owner.userId, { questionId: "l.season", questionVersion: 1, answer: { choice: "autumn" }, privacy: "comparable" });
  await answerQuestion(owner.userId, { questionId: "l.meals", questionVersion: 1, answer: { choice: "cook" }, privacy: "private" });
  const planning = (await listTendencies(owner.userId)).find((c) => c.claimKey === "planning")!;
  await setTendencyFeedback(owner.userId, planning.id, { status: "confirmed", note: "SECRET-NOTE" });
  return { owner, friend, session };
}

describe("showing your manual to a connection", () => {
  it("shows nothing until the owner chooses to", async () => {
    const { owner, friend, session } = await setup();
    expect(await sharedManualFor(friend.userId, session, "en")).toBeNull();
    expect(await myManualShare(owner.userId, session)).toBeNull();
  });

  it("friend: temperament and people only, in the third person, with the owner's own words", async () => {
    const { owner, friend, session } = await setup();
    await setManualShare(owner.userId, session, "friend");
    expect(await myManualShare(owner.userId, session)).toBe("friend");
    const m = (await sharedManualFor(friend.userId, session, "en"))!;
    expect(m).toMatchObject({ preset: "friend", name: "Hana", bio: "Tokyo. Bread and mountains." });
    const traits = m.chapters.flatMap((c) => c.traits);
    expect(traits.map((t) => t.key).sort()).toEqual(["closeness", "planning"]);
    const planning = traits.find((t) => t.key === "planning")!;
    expect(planning.statement).toBe("Usually, Hana plans ahead.");
    expect(planning.ask).toMatch(/\bI\b|\bme\b|\bmy\b/);
    expect(m.likes).toEqual([{ k: "Your favourite season?", v: "Autumn" }]);
    const json = JSON.stringify(m);
    expect(json).not.toContain("SECRET-NOTE");
    expect(json).not.toMatch(/saving|Cooked at home/);
    // The owner sees nothing of the friend's manual: sharing is one way.
    expect(await sharedManualFor(owner.userId, session, "en")).toBeNull();
  });

  it("partner adds the life chapter; the owner's preview matches exactly what is shown", async () => {
    const { owner, friend, session } = await setup();
    await setManualShare(owner.userId, session, "partner");
    const m = (await sharedManualFor(friend.userId, session, "ja"))!;
    expect(m.chapters.map((c) => c.chapter)).toEqual(["self", "people", "life"]);
    expect(m.chapters.find((c) => c.chapter === "life")!.traits[0]!.statement).toMatch(/^Hanaさんは「.+」ことが多いようです。$/);
    expect(await sharedManualPreview(owner.userId, "partner", "ja")).toEqual(m);
    await setManualShare(owner.userId, session, "friend");
    expect(await sharedManualPreview(owner.userId, "friend", "ja")).toEqual(await sharedManualFor(friend.userId, session, "ja"));
  });

  it("leaves out a tendency the owner rejected", async () => {
    const { owner, friend, session } = await setup();
    const c = (await listTendencies(owner.userId)).find((x) => x.claimKey === "closeness")!;
    await setTendencyFeedback(owner.userId, c.id, { status: "rejected" });
    await setManualShare(owner.userId, session, "friend");
    const m = (await sharedManualFor(friend.userId, session, "en"))!;
    expect(m.chapters.flatMap((x) => x.traits).map((t) => t.key)).toEqual(["planning"]);
  });

  it("can be stopped, and ends with the connection", async () => {
    const { owner, friend, session } = await setup();
    await setManualShare(owner.userId, session, "friend");
    await setManualShare(owner.userId, session, "none");
    expect(await sharedManualFor(friend.userId, session, "en")).toBeNull();
    await setManualShare(owner.userId, session, "partner");
    await revokeComparison(friend.userId, session);
    expect(await sharedManualFor(friend.userId, session, "en")).toBeNull();
    await expect(setManualShare(owner.userId, session, "friend")).rejects.toThrow(/connection_ended/);
  });

  it("is closed to anyone outside the connection, and to bad input", async () => {
    const { owner, session } = await setup();
    const stranger = await makeUser("Chi");
    await setManualShare(owner.userId, session, "partner");
    await expect(sharedManualFor(stranger.userId, session, "en")).rejects.toThrow();
    await expect(setManualShare(stranger.userId, session, "friend")).rejects.toThrow();
    await expect(setManualShare(owner.userId, session, "everyone")).rejects.toThrow();
  });

  it("is part of the owner's export", async () => {
    const { owner, session } = await setup();
    await setManualShare(owner.userId, session, "friend");
    const doc = JSON.parse((await buildExport(owner.userId)).json);
    expect(doc.manualShares).toEqual([expect.objectContaining({ sessionId: session, preset: "friend" })]);
  });
});
