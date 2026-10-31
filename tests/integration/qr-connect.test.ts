import { describe, expect, it } from "vitest";
import { askConnection, connectFromShare, connectionAsks, createShare, getComparison, giveConsent, openComparison } from "@/server/services/sharing";
import { makeUser } from "../helpers/factory";

describe("a QR shown in person", () => {
  it("is its owner's yes: one tap by the reader connects, with the owner's Tử Vi shown if chosen", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const s = await createShare(hana.userId, { inPerson: true, showTuvi: true, expiresInDays: 1, maxUses: 1 });
    const r = await connectFromShare(sora.userId, s.token);
    expect(r.status).toBe("active");
    const seen = await getComparison(hana.userId, r.id);
    expect(seen.myConsent?.scopes.sort()).toEqual(["tuvi", "tuvi_detail"]);
    expect((await getComparison(sora.userId, r.id)).myConsent?.scopes).toEqual([]);
    // One person only.
    const ren = await makeUser("Ren");
    await expect(openComparison(ren.userId, s.token)).rejects.toMatchObject({ code: "share_unavailable" });
  });

  it("without Tử Vi chosen, connects showing nothing more", async () => {
    const hana = await makeUser();
    const sora = await makeUser();
    const s = await createShare(hana.userId, { inPerson: true, showTuvi: false });
    const r = await connectFromShare(sora.userId, s.token);
    expect(r.status).toBe("active");
    expect((await getComparison(hana.userId, r.id)).myConsent?.scopes).toEqual([]);
  });

  it("an older link still waits for its owner; a yes already given is kept", async () => {
    const hana = await makeUser();
    const sora = await makeUser();
    const s = await createShare(hana.userId);
    const id = await openComparison(sora.userId, s.token);
    await giveConsent(sora.userId, id, { scopes: ["preferences"], agree: true });
    const r = await connectFromShare(sora.userId, s.token);
    expect(r).toEqual({ id, status: "pending" });
    expect((await getComparison(sora.userId, id)).myConsent?.scopes).toEqual(["preferences"]);
  });
});

describe("asking for their Tử Vi", () => {
  it("is sent once, shown to them until they show it, and only on an active connection", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const pending = await openComparison(sora.userId, (await createShare(hana.userId)).token);
    await expect(askConnection(sora.userId, pending)).rejects.toMatchObject({ code: "connection_ended" });

    const r = await connectFromShare(sora.userId, (await createShare(hana.userId, { inPerson: true, showTuvi: true })).token);
    expect(r.status).toBe("active");
    expect(await askConnection(hana.userId, r.id)).toBe(true);
    expect(await askConnection(hana.userId, r.id)).toBe(false);
    expect((await connectionAsks(hana.userId)).map((a) => [a.fromMe, a.done, a.otherName])).toEqual([[true, false, "Sora"]]);
    expect((await connectionAsks(sora.userId)).map((a) => [a.fromMe, a.done, a.otherName])).toEqual([[false, false, "Hana"]]);
    await giveConsent(sora.userId, r.id, { scopes: ["tuvi", "tuvi_detail"], agree: true });
    expect((await connectionAsks(sora.userId))[0]!.done).toBe(true);

    const stranger = await makeUser();
    await expect(askConnection(stranger.userId, r.id)).rejects.toMatchObject({ code: "not_found" });
  });
});
