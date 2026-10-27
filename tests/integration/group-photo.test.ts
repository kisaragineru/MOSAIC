import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { setBetaTester } from "@/server/services/admin";
import { createGroup, dmMessages, leaveGroup, openDirect } from "@/server/services/dm";
import { getGroupPhoto, groupPhotoUrls, removeGroupPhoto, setGroupPhoto } from "@/server/services/group-photo";
import { createShare, giveConsent, openComparison } from "@/server/services/sharing";
import { makeUser } from "../helpers/factory";

const JPEG = new Uint8Array(readFileSync("tests/e2e/fixtures-photo.jpg"));

async function connect(a: string, b: string) {
  const id = await openComparison(b, (await createShare(a)).token);
  await giveConsent(a, id, { scopes: ["preferences"], agree: true });
  await giveConsent(b, id, { scopes: ["preferences"], agree: true });
}

const env = { ...process.env };
afterEach(() => {
  if (env.ADMIN_EMAILS === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = env.ADMIN_EMAILS;
});

describe("a group's own photo", () => {
  it("any member sets or removes it, told in the conversation; only members see it", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const ren = await makeUser("Ren");
    const out = await makeUser("Out");
    await connect(hana.userId, sora.userId);
    await connect(hana.userId, ren.userId);
    const g = await createGroup(hana.userId, "旅行", [sora.userId, ren.userId]);
    expect((await groupPhotoUrls(sora.userId, [g])).size).toBe(0);

    // Sora isn't the one who made it, and may still set it.
    expect(await setGroupPhoto(sora.userId, g, JPEG)).toBe(1);
    expect(await setGroupPhoto(sora.userId, g, JPEG)).toBe(2);
    expect((await groupPhotoUrls(ren.userId, [g])).get(g)).toBe(`/api/dm/${g}/icon?v=2`);
    expect((await getGroupPhoto(hana.userId, g))?.mime).toBe("image/jpeg");
    expect(await getGroupPhoto(out.userId, g)).toBeNull();
    expect((await groupPhotoUrls(out.userId, [g])).size).toBe(0);
    await expect(setGroupPhoto(out.userId, g, JPEG)).rejects.toThrow();
    const said = (await dmMessages(hana.userId, g)).filter((m) => m.kind === "system").map((m) => m.meta);
    expect(said).toContainEqual(expect.objectContaining({ event: "photo", by: sora.userId }));

    // Not an image, or too big: refused.
    await expect(setGroupPhoto(hana.userId, g, new TextEncoder().encode("<svg/>"))).rejects.toMatchObject({ code: "invalid_image" });
    await expect(setGroupPhoto(hana.userId, g, new Uint8Array(1_000_001))).rejects.toMatchObject({ code: "image_too_large" });

    // Left the group: can't change it any more.
    await leaveGroup(ren.userId, g);
    await expect(setGroupPhoto(ren.userId, g, JPEG)).rejects.toThrow();

    await removeGroupPhoto(hana.userId, g);
    expect(await getGroupPhoto(sora.userId, g)).toBeNull();
    expect((await dmMessages(sora.userId, g)).at(-1)?.meta).toMatchObject({ event: "photo", by: hana.userId, removed: true });

    // One-to-one conversations have no group photo.
    const d = await openDirect(hana.userId, sora.userId);
    await expect(setGroupPhoto(hana.userId, d, JPEG)).rejects.toMatchObject({ code: "not_a_group" });
  });

  it("the beta testers' group takes a photo only from an admin", async () => {
    const boss = await makeUser("Boss");
    const tester = await makeUser("Tester");
    process.env.ADMIN_EMAILS = boss.email;
    const g = await setBetaTester(boss.userId, tester.userId, true);
    await expect(setGroupPhoto(tester.userId, g, JPEG)).rejects.toMatchObject({ code: "system_group" });
    await expect(removeGroupPhoto(tester.userId, g)).rejects.toMatchObject({ code: "system_group" });
    expect(await setGroupPhoto(boss.userId, g, JPEG)).toBeGreaterThan(0);
    expect((await groupPhotoUrls(tester.userId, [g])).has(g)).toBe(true);
  });
});
