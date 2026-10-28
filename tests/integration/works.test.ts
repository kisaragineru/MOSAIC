import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { answerQuestion } from "@/server/services/discovery";
import { createMemory } from "@/server/services/memories";
import { saveBirthProfile } from "@/server/services/tuvi";
import { answerChoices, draftWork, extendLink, handOver, latestWork, makeWork, markOpensSeen, markWorkOpened, myLinks, newOpens, openWork, revokeLink } from "@/server/services/works";
import { withUser } from "@/server/db/tx";
import { makeUser } from "../helpers/factory";

describe("works: the story, handed to someone as a work", () => {
  it("is fixed when made, read by its link without signing in, and told to its owner once", async () => {
    const hana = await makeUser("Hana");
    await saveBirthProfile(hana.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: true, birthTime: "06:30", timeZone: "Asia/Ho_Chi_Minh", sex: "female" });
    await answerQuestion(hana.userId, { questionId: "s.proud_recent", questionVersion: 1, answer: { text: "初めてフルマラソンを完走した" } });
    const choices = await answerChoices(hana.userId, "ja");
    const pick = choices.find((c) => c.a.includes("フルマラソン"))!;

    const draft = (await draftWork(hana.userId, "ja", [pick.id]))!;
    expect(draft.episodes.map((e) => e.key)).toContain("prologue");
    expect(draft.types.length).toBeGreaterThan(0);
    expect(draft.backstage.answers).toEqual([{ q: pick.q, a: pick.a }]);

    const workId = await makeWork(hana.userId, "ja", { title: "ハナの物語", answerIds: [pick.id] });
    expect((await latestWork(hana.userId))!.title).toBe("ハナの物語");
    // Fixed: a record written afterwards doesn't change it.
    await createMemory(hana.userId, { kind: "memory", body: "あとから書いた記録", visibility: "private" });
    const before = JSON.stringify((await latestWork(hana.userId))!.content);
    expect(before).not.toContain("あとから書いた記録");

    const { id: linkId, token } = await handOver(hana.userId, workId, { recipient: "母", note: "読んでほしくて", days: 14 });
    const link = (await myLinks(hana.userId)).find((l) => l.id === linkId)!;
    expect(link.state).toBe("open");
    expect(link.expiresAt.getTime() - Date.now()).toBeGreaterThan(13.9 * 86_400_000);

    // The owner opening their own link isn't "opened".
    expect(await openWork(token, hana.userId)).toMatchObject({ status: "open", mine: true });
    await markWorkOpened(token, hana.userId);
    expect(await newOpens(hana.userId)).toEqual([]);
    // Someone without an account reads it.
    const w = await openWork(token, null);
    expect(w).toMatchObject({ status: "open", mine: false, title: "ハナの物語", note: "読んでほしくて" });
    expect(JSON.stringify(w)).not.toContain("母"); // the recipient label is the owner's alone
    // Looking (a link preview, too) isn't opening; opening the envelope is.
    expect(await newOpens(hana.userId)).toEqual([]);
    await markWorkOpened(token, null);
    expect(await newOpens(hana.userId)).toEqual([{ id: linkId, recipient: "母" }]);
    await markOpensSeen(hana.userId);
    expect(await newOpens(hana.userId)).toEqual([]);

    // Taken back, then extended again; expired links close.
    await revokeLink(hana.userId, linkId);
    expect(await openWork(token, null)).toEqual({ status: "closed" });
    await extendLink(hana.userId, linkId, 7);
    expect((await openWork(token, null))!.status).toBe("open");
    await withUser(hana.userId, (tx) => tx.execute(sql`update work_links set expires_at = now() - interval '1 minute' where id = ${linkId}`));
    expect(await openWork(token, null)).toEqual({ status: "closed" });

    // Unknown or malformed tokens: nothing.
    expect(await openWork("x".repeat(32), null)).toBeNull();
    expect(await openWork("../../etc", null)).toBeNull();
  });

  it("belongs to its owner: nobody else lists, makes links for, or takes back its links", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    await saveBirthProfile(hana.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: false, timeZone: "Asia/Ho_Chi_Minh" });
    const workId = await makeWork(hana.userId, "ja", { title: "ハナの物語", answerIds: [] });
    const { id: linkId } = await handOver(hana.userId, workId, { recipient: "母", days: 7 });
    expect(await latestWork(sora.userId)).toBeNull();
    expect(await myLinks(sora.userId)).toEqual([]);
    await expect(handOver(sora.userId, workId, { recipient: "x", days: 7 })).rejects.toThrow();
    await expect(revokeLink(sora.userId, linkId)).rejects.toMatchObject({ code: "not_found" });
    await expect(handOver(hana.userId, workId, { recipient: "x", days: 3 })).rejects.toThrow(); // only the offered lengths
  });

  it("a link needs no name: blank is kept as none", async () => {
    const hana = await makeUser("ハナ");
    await saveBirthProfile(hana.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: false, timeZone: "Asia/Ho_Chi_Minh" });
    const workId = await makeWork(hana.userId, "ja", { title: "ハナの物語", answerIds: [] });
    const { id } = await handOver(hana.userId, workId, { recipient: "  ", days: 14 });
    const link = (await myLinks(hana.userId)).find((l) => l.id === id)!;
    expect(link.recipient).toBeNull();
    await expect(handOver(hana.userId, workId, { recipient: "x".repeat(61), days: 14 })).rejects.toThrow();
  });
});
