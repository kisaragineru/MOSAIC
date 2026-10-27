import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { listComparisons } from "@/server/services/sharing";
import { saveBirthProfile } from "@/server/services/tuvi";
import { acceptOffer, answerStart, dismissOffer, handOver, makeWork, markWriterNewsSeen, myOffers, readOffer, recordOffer, revokeLink, writerNews } from "@/server/services/works";
import { withUser } from "@/server/db/tx";
import { makeUser } from "../helpers/factory";

async function handed() {
  const hana = await makeUser("Hana");
  const sora = await makeUser("Sora");
  await saveBirthProfile(hana.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: false, timeZone: "Asia/Ho_Chi_Minh" });
  const workId = await makeWork(hana.userId, "ja", { title: "ハナの物語", answerIds: [] });
  const { id: linkId, token } = await handOver(hana.userId, workId, { recipient: "ソラ", days: 14 });
  return { hana, sora, linkId, token };
}

describe("offers: from a work someone was handed to a connection", () => {
  it("one tap connects, with nothing shown yet; the writer hears of it once", async () => {
    const { hana, sora, token } = await handed();
    expect(await recordOffer(hana.userId, token)).toBeNull(); // my own work: no offer
    const offerId = (await recordOffer(sora.userId, token))!;
    expect(await recordOffer(sora.userId, token)).toBe(offerId); // reading again: the same offer
    expect(await myOffers(sora.userId)).toEqual([expect.objectContaining({ id: offerId, ownerName: "Hana", title: "ハナの物語", accepted: false, sessionId: null })]);

    const sid = await acceptOffer(sora.userId, offerId);
    const conn = (await listComparisons(sora.userId)).find((c) => c.id === sid)!;
    expect(conn.status).toBe("active");
    expect((await myOffers(sora.userId))[0]).toMatchObject({ accepted: true, sessionId: sid });
    // Accepting again reuses the connection.
    expect(await acceptOffer(sora.userId, offerId)).toBe(sid);

    expect(await writerNews(hana.userId)).toEqual({ connected: ["ソラ"], started: [] });
    await markWriterNewsSeen(hana.userId);
    expect(await writerNews(hana.userId)).toEqual({ connected: [], started: [] });

    // Started their own story: the writer is told only if they choose to.
    await answerStart(sora.userId, offerId, true);
    expect((await writerNews(hana.userId)).started).toEqual(["ソラ"]);
    // Nobody else can take or change it.
    await expect(acceptOffer(hana.userId, offerId)).rejects.toMatchObject({ code: "not_found" });
    await expect(dismissOffer(hana.userId, offerId)).rejects.toMatchObject({ code: "not_found" });
  });

  it("put aside, then taken later; readable after the link runs out only while connected", async () => {
    const { hana, sora, linkId, token } = await handed();
    const offerId = (await recordOffer(sora.userId, token))!;
    await dismissOffer(sora.userId, offerId);
    expect((await myOffers(sora.userId))[0]).toMatchObject({ dismissed: true, accepted: false });
    expect((await readOffer(sora.userId, offerId))!.status).toBe("open");

    await withUser(hana.userId, (tx) => tx.execute(sql`update work_links set expires_at = now() - interval '1 minute' where id = ${linkId}`));
    expect(await readOffer(sora.userId, offerId)).toEqual({ status: "closed" }); // not connected: closed
    await acceptOffer(sora.userId, offerId);
    expect((await readOffer(sora.userId, offerId))!.status).toBe("open"); // connected: still readable
    await revokeLink(hana.userId, linkId);
    expect(await readOffer(sora.userId, offerId)).toEqual({ status: "closed" }); // taken back: closed
    expect(await readOffer(hana.userId, offerId)).toBeNull();
  });
});
