import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createMemory, editMemory } from "@/server/services/memories";
import { setMemoryAudience } from "@/server/services/memory-share";
import { createShare, giveConsent, openComparison } from "@/server/services/sharing";
import { mediaChunk, mediaFor, mediaInfo, mediaThumb, putChunk, sniffMedia, startUpload, MEDIA_CHUNK_BYTES } from "@/server/services/media";
import { makeUser } from "../helpers/factory";

const JPEG = new Uint8Array(readFileSync("tests/e2e/fixtures-photo.jpg"));
const photo = (u: string) => startUpload(u, { kind: "image", width: 40, height: 30, size: JPEG.length }, JPEG, JPEG);

/** A made-up "MP4" a little over one part long: a real file type box, then filler. */
function fakeVideo(size: number) {
  const b = new Uint8Array(size);
  b.set([0, 0, 0, 0x18, ...new TextEncoder().encode("ftypmp42")]);
  for (let i = 12; i < size; i++) b[i] = i % 251;
  return b;
}

async function connect(a: string, b: string) {
  const id = await openComparison(b, (await createShare(a)).token);
  await giveConsent(a, id, { scopes: ["preferences"], agree: true });
  await giveConsent(b, id, { scopes: ["preferences"], agree: true });
}

describe("photos and videos on records", () => {
  it("knows files by their bytes, not their names", () => {
    expect(sniffMedia(JPEG)).toBe("image/jpeg");
    expect(sniffMedia(fakeVideo(64))).toBe("video/mp4");
    expect(sniffMedia(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });

  it("are seen by whoever may read the record, and nobody else", async () => {
    const me = await makeUser("Me");
    const friend = await makeUser("Friend");
    const stranger = await makeUser("X");
    await connect(me.userId, friend.userId);
    const a = await photo(me.userId);
    const b = await photo(me.userId);
    expect(a.complete).toBe(true);
    // A record of photos alone is fine; nothing at all is not.
    await expect(createMemory(me.userId, { kind: "note", body: "" })).rejects.toMatchObject({ code: "empty_record" });
    const id = await createMemory(me.userId, { kind: "note", body: "", media: [b.id, a.id] });
    expect((await mediaFor(me.userId, [id])).get(id)!.map((m) => m.id)).toEqual([b.id, a.id]);
    // Private record: its photos too.
    expect((await mediaFor(friend.userId, [id])).size).toBe(0);
    expect(await mediaThumb(friend.userId, a.id)).toBeNull();
    await setMemoryAudience(me.userId, id, { visibility: "connections" });
    expect((await mediaFor(friend.userId, [id])).get(id)).toHaveLength(2);
    expect((await mediaThumb(friend.userId, a.id))!.length).toBe(JPEG.length);
    expect((await mediaChunk(friend.userId, a.id, 0))!.length).toBe(JPEG.length);
    expect(await mediaInfo(stranger.userId, a.id)).toBeNull();
    expect(await mediaChunk(stranger.userId, a.id, 0)).toBeNull();
    // Someone else's upload can't be put on my record.
    const theirs = await photo(friend.userId);
    await expect(editMemory(me.userId, id, { kind: "note", body: "x", media: [theirs.id] })).rejects.toMatchObject({ code: "invalid_media" });
    // Editing to fewer removes the rest; leaving media out keeps them.
    await editMemory(me.userId, id, { kind: "note", body: "海", media: [a.id] });
    await editMemory(me.userId, id, { kind: "note", body: "海と空" });
    expect((await mediaFor(me.userId, [id])).get(id)!.map((m) => m.id)).toEqual([a.id]);
    expect(await mediaInfo(me.userId, b.id)).toBeNull();
  });

  it("take videos in parts, at most five per record, and none on letters", async () => {
    const me = await makeUser();
    const bytes = fakeVideo(MEDIA_CHUNK_BYTES + 1000);
    const v = await startUpload(me.userId, { kind: "video", width: 1280, height: 720, durationMs: 4200, size: bytes.length }, JPEG, bytes.slice(0, MEDIA_CHUNK_BYTES));
    expect(v.complete).toBe(false);
    // Not complete yet: can't go on a record.
    await expect(createMemory(me.userId, { kind: "memory", body: "動画", media: [v.id] })).rejects.toMatchObject({ code: "invalid_media" });
    await expect(putChunk(me.userId, v.id, 1, bytes.slice(MEDIA_CHUNK_BYTES, MEDIA_CHUNK_BYTES + 10))).rejects.toMatchObject({ code: "invalid_media" });
    expect(await putChunk(me.userId, v.id, 1, bytes.slice(MEDIA_CHUNK_BYTES))).toBe(true);
    const id = await createMemory(me.userId, { kind: "memory", body: "動画", media: [v.id] });
    expect((await mediaFor(me.userId, [id])).get(id)![0]).toMatchObject({ kind: "video", width: 1280, height: 720, durationMs: 4200 });
    expect((await mediaChunk(me.userId, v.id, 1))!.length).toBe(1000);
    // A file that isn't what it says is refused.
    await expect(startUpload(me.userId, { kind: "video", width: 1, height: 1, size: JPEG.length }, JPEG, JPEG)).rejects.toMatchObject({ code: "invalid_media" });
    const six = await Promise.all(Array.from({ length: 6 }, () => photo(me.userId)));
    await expect(createMemory(me.userId, { kind: "note", body: "多い", media: six.map((x) => x.id) })).rejects.toBeTruthy();
    await expect(createMemory(me.userId, { kind: "letter_to_future", body: "未来へ", revealOn: "2030-01-01", media: [six[0]!.id] })).rejects.toMatchObject({ code: "invalid_media" });
  });
});
