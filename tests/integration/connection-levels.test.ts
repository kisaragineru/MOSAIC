import { describe, expect, it } from "vitest";
import { createShare, giveConsent, openComparison, setConnectionLevel } from "@/server/services/sharing";
import { privacyOverview } from "@/server/services/privacy";
import { makeUser } from "../helpers/factory";

describe("sharing levels set from the privacy lists", () => {
  it("sets one level for many connections, keeping the other group and leaving unaccepted ones alone", async () => {
    const me = await makeUser("Me");
    const mum = await makeUser("Mum");
    const pal = await makeUser("Pal");
    const asking = await makeUser("Asking");
    const stranger = await makeUser("Stranger");
    const other = await makeUser("Other");

    const s1 = await openComparison(mum.userId, (await createShare(me.userId)).token);
    await giveConsent(me.userId, s1, { scopes: ["preferences"], agree: true });
    await giveConsent(mum.userId, s1, { scopes: ["tuvi", "tuvi_detail", "preferences"], agree: true });
    const s2 = await openComparison(pal.userId, (await createShare(me.userId)).token);
    await giveConsent(me.userId, s2, { scopes: ["tuvi"], agree: true });
    await giveConsent(pal.userId, s2, { scopes: [], agree: true });
    // Waiting on me: I haven't accepted it.
    const s3 = await openComparison(asking.userId, (await createShare(me.userId)).token);
    await giveConsent(asking.userId, s3, { scopes: ["tuvi"], agree: true });
    // Not mine at all.
    const s4 = await openComparison(other.userId, (await createShare(stranger.userId)).token);
    await giveConsent(stranger.userId, s4, { scopes: [], agree: true });

    const changed = await setConnectionLevel(me.userId, { sessionIds: [s1, s2, s3, s4], group: "tuvi", level: "detail", agree: true });
    expect(changed).toBe(2);
    const o = await privacyOverview(me.userId);
    const by = (n: string) => o.connections.find((c) => c.name === n)!;
    // Answers kept; what they show me is known, and what we both chose is shared.
    expect(by("Mum")).toMatchObject({ iConsented: true, myScopes: ["tuvi", "tuvi_detail", "preferences"], theirScopes: ["tuvi", "tuvi_detail", "preferences"], sharedScopes: ["tuvi", "tuvi_detail", "preferences"] });
    expect(by("Pal")).toMatchObject({ myScopes: ["tuvi", "tuvi_detail"], theirScopes: [], sharedScopes: [] });
    // Not accepted here: accepting stays on the connection's own page.
    expect(by("Asking")).toMatchObject({ status: "pending", iConsented: false, myScopes: [], theirScopes: [] });
    expect((await privacyOverview(stranger.userId)).connections[0]).toMatchObject({ myScopes: [] });

    // Showing less needs no consent; the answers group leaves Tử Vi as it is.
    await setConnectionLevel(me.userId, { sessionIds: [s1], group: "answers", level: "none", agree: false });
    expect((await privacyOverview(me.userId)).connections.find((c) => c.name === "Mum")).toMatchObject({ myScopes: ["tuvi", "tuvi_detail"], sharedScopes: ["tuvi", "tuvi_detail"] });
    // Unchanged: nothing written.
    expect(await setConnectionLevel(me.userId, { sessionIds: [s1], group: "answers", level: "none", agree: false })).toBe(0);
  });

  it("asks for consent to show more, for someone picked, and for a level it knows", async () => {
    const me = await makeUser("Me");
    const mum = await makeUser("Mum");
    const s1 = await openComparison(mum.userId, (await createShare(me.userId)).token);
    await giveConsent(me.userId, s1, { scopes: [], agree: true });
    await expect(setConnectionLevel(me.userId, { sessionIds: [s1], group: "tuvi", level: "tuvi", agree: false })).rejects.toMatchObject({ code: "agree_required" });
    // Less than before needs none, even when something is still shown.
    await setConnectionLevel(me.userId, { sessionIds: [s1], group: "tuvi", level: "detail", agree: true });
    expect(await setConnectionLevel(me.userId, { sessionIds: [s1], group: "tuvi", level: "tuvi", agree: false })).toBe(1);
    await expect(setConnectionLevel(me.userId, { sessionIds: [], group: "tuvi", level: "none", agree: false })).rejects.toMatchObject({ code: "nothing_picked_people" });
    await expect(setConnectionLevel(me.userId, { sessionIds: [s1], group: "tuvi", level: "both", agree: true })).rejects.toMatchObject({ code: "invalid_choice" });
    await expect(setConnectionLevel(me.userId, { sessionIds: [s1], group: "manual", level: "none", agree: true })).rejects.toMatchObject({ code: "invalid_choice" });
    await expect(setConnectionLevel(me.userId, { sessionIds: ["nope"], group: "tuvi", level: "none", agree: true })).rejects.toMatchObject({ code: "invalid_choice" });
  });
});
