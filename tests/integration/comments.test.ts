import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { addComment, commentInbox, commentPreviews, countsByEntry, deleteComment, readThread, sharedEntry } from "@/server/services/comments";
import { createMemory, deleteMemory } from "@/server/services/memories";
import { setMemoryAudience } from "@/server/services/memory-share";
import { createShare, giveConsent, openComparison, revokeComparison } from "@/server/services/sharing";
import { withUser } from "@/server/db/tx";
import { makeUser } from "../helpers/factory";

async function connect(a: string, b: string) {
  const s = await createShare(a);
  const id = await openComparison(b, s.token);
  await giveConsent(a, id, { scopes: ["preferences"], agree: true });
  await giveConsent(b, id, { scopes: ["preferences"], agree: true });
  return id;
}

describe("one-to-one comments on shared records", () => {
  it("are only between the record's owner and each writer, and the owner answers each separately", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const ren = await makeUser("Ren");
    const stranger = await makeUser("X");
    await connect(hana.userId, sora.userId);
    await connect(hana.userId, ren.userId);
    const id = await createMemory(hana.userId, { kind: "memory", body: "海に行った" });

    // Private record: nobody else can open it or write about it.
    expect(await sharedEntry(sora.userId, id)).toBeNull();
    await expect(addComment(sora.userId, id, null, "いいね")).rejects.toMatchObject({ code: "not_found" });

    await setMemoryAudience(hana.userId, id, { visibility: "connections" });
    expect(await sharedEntry(sora.userId, id)).toMatchObject({ id, ownerName: "Hana", body: "海に行った" });
    expect(await sharedEntry(stranger.userId, id)).toBeNull();
    expect(await sharedEntry(hana.userId, id)).toBeNull(); // her own record is read as hers, not as shared

    await addComment(sora.userId, id, null, "楽しそう！");
    await addComment(ren.userId, id, null, "どこの海？");
    // The owner can't start a thread, only answer someone who wrote.
    await expect(addComment(hana.userId, id, stranger.userId, "やあ")).rejects.toMatchObject({ code: "not_found" });
    await addComment(hana.userId, id, sora.userId, "ありがとう");

    // Each writer sees only their own conversation.
    expect((await readThread(sora.userId, id, null)).map((c) => [c.body, c.mine])).toEqual([["楽しそう！", true], ["ありがとう", false]]);
    expect((await readThread(ren.userId, id, null)).map((c) => c.body)).toEqual(["どこの海？"]);
    // Ren can't read Sora's thread by naming him: as a non-owner, the thread is always his own.
    expect((await readThread(ren.userId, id, sora.userId)).map((c) => c.body)).toEqual(["どこの海？"]);
    await expect(readThread(stranger.userId, id, null)).rejects.toMatchObject({ code: "not_found" });

    // The owner sees both, one per person, with what's unread.
    const inbox = await commentInbox(hana.userId);
    expect(inbox.map((t) => [t.otherName, t.iOwn, t.count, t.unread]).sort()).toEqual([["Ren", true, 1, 1], ["Sora", true, 2, 0]]);
    expect(countsByEntry(inbox).get(id)).toEqual({ count: 3, unread: 1 });
    await readThread(hana.userId, id, ren.userId);
    expect((await commentInbox(hana.userId)).every((t) => t.unread === 0)).toBe(true);
    // Sora already opened her thread above, so nothing is new for her.
    expect((await commentInbox(sora.userId))[0]).toMatchObject({ otherName: "Hana", iOwn: false, unread: 0, lastBody: "ありがとう", lastMine: false });
    await addComment(hana.userId, id, sora.userId, "また行こうね");
    expect((await commentInbox(sora.userId))[0]).toMatchObject({ unread: 1, lastBody: "また行こうね" });

    // Timeline previews: the owner sees the newest of everyone's, each writer only their own thread.
    const ownerView = (await commentPreviews(hana.userId, [id], 2)).get(id)!;
    expect(ownerView.map((c) => [c.authorName, c.body, c.mine])).toEqual([["Hana", "ありがとう", true], ["Hana", "また行こうね", true]]);
    expect((await commentPreviews(hana.userId, [id], 5)).get(id)!.map((c) => c.authorName)).toEqual(["Sora", "Ren", "Hana", "Hana"]);
    expect((await commentPreviews(ren.userId, [id])).get(id)!.map((c) => c.body)).toEqual(["どこの海？"]);
    expect((await commentPreviews(sora.userId, [id], 5)).get(id)!.map((c) => c.body)).toEqual(["楽しそう！", "ありがとう", "また行こうね"]);
    expect((await commentPreviews(stranger.userId, [id])).size).toBe(0);

    // Only your own comments can be taken back.
    const [first] = await readThread(sora.userId, id, null);
    await expect(deleteComment(hana.userId, first!.id)).rejects.toMatchObject({ code: "not_found" });
    await deleteComment(sora.userId, first!.id);
    expect((await readThread(sora.userId, id, null)).map((c) => c.body)).toEqual(["ありがとう", "また行こうね"]);

    // The app role can't read the table directly.
    await expect(withUser(hana.userId, (tx) => tx.execute(sql`select * from memory_comments`))).rejects.toBeTruthy();
  });

  it("hide when the record stops being shared or the connection ends, and go with the record", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const sid = await connect(hana.userId, sora.userId);
    const id = await createMemory(hana.userId, { kind: "memory", body: "山" });
    await setMemoryAudience(hana.userId, id, { visibility: "connections" });
    await addComment(sora.userId, id, null, "いいね");

    await setMemoryAudience(hana.userId, id, { visibility: "private" });
    expect(await commentInbox(hana.userId)).toEqual([]);
    expect(await commentInbox(sora.userId)).toEqual([]);
    await expect(readThread(sora.userId, id, null)).rejects.toMatchObject({ code: "not_found" });
    await expect(addComment(hana.userId, id, sora.userId, "まだ見える？")).rejects.toMatchObject({ code: "not_found" });

    await setMemoryAudience(hana.userId, id, { visibility: "connections" });
    expect(await commentInbox(hana.userId)).toHaveLength(1);
    await revokeComparison(hana.userId, sid);
    expect(await commentInbox(sora.userId)).toEqual([]);
    expect(await commentInbox(hana.userId)).toEqual([]);

    const other = await createMemory(hana.userId, { body: "x" });
    await deleteMemory(hana.userId, other);
    await deleteMemory(hana.userId, id);
    const n = await withUser(sora.userId, (tx) => tx.execute<{ n: number }>(sql`select count(*)::int as n from memory_comments_authored()`));
    expect(n.rows[0]!.n).toBe(0);
  });

  it("refuses empty or overlong comments", async () => {
    const hana = await makeUser();
    const sora = await makeUser();
    await connect(hana.userId, sora.userId);
    const id = await createMemory(hana.userId, { body: "x" });
    await setMemoryAudience(hana.userId, id, { visibility: "connections" });
    await expect(addComment(sora.userId, id, null, "   ")).rejects.toMatchObject({ code: "invalid_comment" });
    await expect(addComment(sora.userId, id, null, "あ".repeat(2001))).rejects.toMatchObject({ code: "invalid_comment" });
  });
});
