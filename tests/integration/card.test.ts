import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { connectionCard, myCard, setCard, typeTints } from "@/server/services/card";
import { sharedManualFor } from "@/server/services/manual-share";
import { createShare, getComparison, giveConsent, openComparison } from "@/server/services/sharing";
import { saveBirthProfile } from "@/server/services/tuvi";
import { saveSelfTypes } from "@/server/services/tuvi-type";
import { withUser } from "@/server/db/tx";
import { makeUser } from "../helpers/factory";

async function connect(a: string, b: string) {
  const s = await createShare(a);
  const id = await openComparison(b, s.token);
  await giveConsent(b, id, { scopes: [], agree: true });
  await giveConsent(a, id, { scopes: [], agree: true });
  return id;
}

describe("the calling card: what every connection sees from the start", () => {
  it("shows the type (never the chart) and bio by default, and only what its owner keeps on it", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    expect(await myCard(hana.userId)).toEqual(["type", "bio"]);
    await saveBirthProfile(hana.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: true, birthTime: "06:30", timeZone: "Asia/Ho_Chi_Minh", sex: "male" });
    const id = await connect(hana.userId, sora.userId);

    const card = (await connectionCard(sora.userId, id, "ja"))!;
    expect(card.items).toEqual(["type", "bio"]);
    expect(card.typeSource).toBe("chart");
    expect(card.types.length).toBeGreaterThan(0);
    expect(JSON.stringify(card)).not.toContain("1990");
    // No manual on the default card.
    expect(await sharedManualFor(sora.userId, id, "ja")).toBeNull();

    // Only the summary: the friend manual's summary, no chapters.
    await setCard(hana.userId, ["summary"]);
    const m = (await sharedManualFor(sora.userId, id, "ja"))!;
    expect(m.preset).toBe("friend");
    expect(m.chapters).toEqual([]);
    expect(m.likes).toEqual([]);
    expect((await connectionCard(sora.userId, id, "ja"))!.types).toEqual([]);
    // The whole friend manual.
    await setCard(hana.userId, ["manual"]);
    expect((await sharedManualFor(sora.userId, id, "ja"))!.preset).toBe("friend");
    // Nothing on it.
    await setCard(hana.userId, []);
    expect(await sharedManualFor(sora.userId, id, "ja")).toBeNull();
    expect((await getComparison(sora.userId, id)).otherBio).toBeNull();
    await expect(setCard(hana.userId, ["chart"])).rejects.toThrow();
  });

  it("without a chart, shows the types its owner picked, labelled as theirs", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    await saveSelfTypes(hana.userId, ["thai_am"]);
    const id = await connect(hana.userId, sora.userId);
    expect(await connectionCard(sora.userId, id, "ja")).toMatchObject({ typeSource: "picked", types: [{ id: "thai_am" }] });
  });

  it("an account from before the card hasn't decided: no type, the bio as before", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    await withUser(hana.userId, (tx) => tx.execute(sql`update profiles set card_items = null, bio = 'こんにちは' where user_id = ${hana.userId}`));
    expect(await myCard(hana.userId)).toBeNull();
    const id = await connect(hana.userId, sora.userId);
    expect(await connectionCard(sora.userId, id, "ja")).toMatchObject({ items: [], types: [] });
    expect((await getComparison(sora.userId, id)).otherBio).toBe("こんにちは");
  });

  it("the colour behind an initial: only connections whose card shows their type", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const stranger = await makeUser("X");
    await saveSelfTypes(hana.userId, ["thai_am"]);
    await saveSelfTypes(stranger.userId, ["tu_vi"]);
    // Not connected yet: nothing.
    expect((await typeTints(sora.userId, [hana.userId, stranger.userId])).size).toBe(0);
    await connect(hana.userId, sora.userId);
    const tints = await typeTints(sora.userId, [hana.userId, stranger.userId, sora.userId]);
    expect([...tints]).toEqual([[hana.userId, "thai_am"]]);
    // Taken off the card: gone.
    await setCard(hana.userId, ["bio"]);
    expect((await typeTints(sora.userId, [hana.userId])).size).toBe(0);
  });
});
