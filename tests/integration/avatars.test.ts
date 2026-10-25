import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { withUser } from "@/server/db/tx";
import { avatarUrls, getAvatar, myAvatarUrl, removeAvatar, setAvatar } from "@/server/services/avatars";
import { createGroup, openDirect } from "@/server/services/dm";
import { buildExport } from "@/server/services/export";
import { createShare, giveConsent, openComparison, revokeComparison } from "@/server/services/sharing";
import { makeUser } from "../helpers/factory";

const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));

async function connect(a: string, b: string) {
  const s = await createShare(a);
  const id = await openComparison(b, s.token);
  await giveConsent(a, id, { scopes: ["preferences"], agree: true });
  await giveConsent(b, id, { scopes: ["preferences"], agree: true });
  return id;
}

describe("profile photos", () => {
  it("are real images, versioned, and removable", async () => {
    const u = await makeUser();
    expect(await myAvatarUrl(u.userId)).toBeNull();
    await expect(setAvatar(u.userId, new TextEncoder().encode("<svg/>"))).rejects.toMatchObject({ code: "invalid_image" });
    await expect(setAvatar(u.userId, new Uint8Array(1_000_001).fill(0xff))).rejects.toMatchObject({ code: "image_too_large" });
    expect(await setAvatar(u.userId, PNG)).toBe(1);
    expect(await setAvatar(u.userId, PNG)).toBe(2);
    expect((await avatarUrls(u.userId, [u.userId])).get(u.userId)).toBe(`/api/avatar/${u.userId}?v=2`);
    expect((await getAvatar(u.userId, u.userId))!.mime).toBe("image/png");
    const exp = JSON.parse((await buildExport(u.userId)).json);
    expect(exp.profilePhoto.mime).toBe("image/png");
    await removeAvatar(u.userId);
    expect(await getAvatar(u.userId, u.userId)).toBeNull();
    // Not readable directly.
    await expect(withUser(u.userId, (tx) => tx.execute(sql`select * from user_avatars`))).rejects.toBeTruthy();
  });

  it("are seen by connections and conversation members only", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const ren = await makeUser("Ren");
    const mio = await makeUser("Mio");
    await setAvatar(hana.userId, PNG);
    await setAvatar(mio.userId, PNG);
    expect(await getAvatar(sora.userId, hana.userId)).toBeNull();
    const sid = await connect(hana.userId, sora.userId);
    expect(await getAvatar(sora.userId, hana.userId)).not.toBeNull();
    expect(await getAvatar(ren.userId, hana.userId)).toBeNull();
    // Ren and Mio aren't connected, but in Hana's group they see each other.
    await connect(hana.userId, ren.userId);
    await connect(hana.userId, mio.userId);
    await createGroup(hana.userId, "g", [ren.userId, mio.userId]);
    expect(await getAvatar(ren.userId, mio.userId)).not.toBeNull();
    expect([...(await avatarUrls(ren.userId, [mio.userId, sora.userId, hana.userId])).keys()].sort()).toEqual([hana.userId, mio.userId].sort());
    // A one-to-one conversation keeps the photo visible after the connection ends.
    await openDirect(hana.userId, sora.userId);
    await revokeComparison(hana.userId, sid);
    expect(await getAvatar(sora.userId, hana.userId)).not.toBeNull();
  });
});
