import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { withUser } from "@/server/db/tx";
import { openDirect, sendMessage } from "@/server/services/dm";
import { pairHistory, pairSummary, recentAnniversaries } from "@/server/services/pair-history";
import { createShare, getComparison, giveConsent, openComparison } from "@/server/services/sharing";
import { makeUser } from "../helpers/factory";

describe("our story (pair history)", () => {
  it("is the same for both people, counts only what passed between them, and is closed to others", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const x = await makeUser("X");
    const s = await createShare(hana.userId);
    const id = await openComparison(sora.userId, s.token);
    await giveConsent(sora.userId, id, { scopes: ["preferences", "tuvi"], agree: true });
    await giveConsent(hana.userId, id, { scopes: ["preferences", "tuvi"], agree: true });
    const c = await openDirect(hana.userId, sora.userId);
    for (const [who, body] of [[hana, "こんにちは"], [sora, "元気？"], [hana, "元気だよ"]] as const) await sendMessage(who.userId, c, { kind: "text", body });
    // A conversation with someone else doesn't count.
    const s2 = await createShare(hana.userId);
    const id2 = await openComparison(x.userId, s2.token);
    await giveConsent(x.userId, id2, { scopes: ["preferences"], agree: true });
    await giveConsent(hana.userId, id2, { scopes: ["preferences"], agree: true });
    await sendMessage(hana.userId, await openDirect(hana.userId, x.userId), { kind: "text", body: "hi" });

    const mine = await pairHistory(hana.userId, await getComparison(hana.userId, id), "Asia/Tokyo");
    const theirs = await pairHistory(sora.userId, await getComparison(sora.userId, id), "Asia/Tokyo");
    expect(mine).toEqual(theirs);
    expect(mine).toMatchObject({ days: 0, messages: 3, comments: 0, scopes: ["preferences", "tuvi"] });
    expect(mine.events.map((e) => e.kind)).toEqual(["firstMessage", "agreed", "connected"]);
    expect(await pairSummary(sora.userId, id, "Asia/Tokyo")).toEqual({ days: 0, messages: 3 });
    await expect(withUser(x.userId, (tx) => tx.execute(sql`select pair_history(${id})`))).rejects.toBeTruthy();

    // A year later, Home brings up the anniversary for both.
    const later = new Date(Date.now() + 365 * 86_400_000 + 3_600_000);
    const a = await recentAnniversaries(sora.userId, "UTC", later);
    expect(a).toMatchObject([{ sessionId: id, name: "Hana", event: { kind: "years", n: 1 } }]);
  });
});
