import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createMemory } from "@/server/services/memories";
import { setMemoryAudience } from "@/server/services/memory-share";
import { addReply, deleteReply, readReplies, replyInbox, replyPreviews } from "@/server/services/replies";
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

const bodies = (r: { body: string }[]) => r.map((x) => x.body);

describe("replies under a record: one thread for everyone who can see it", () => {
  it("the owner and the people it's shared with reply; all of them read the whole thread", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const ren = await makeUser("Ren");
    const stranger = await makeUser("X");
    const withSora = await connect(hana.userId, sora.userId);
    await connect(hana.userId, ren.userId);
    const id = await createMemory(hana.userId, { kind: "memory", body: "パンを焼いた" });

    // A private record: only she can reply, and only she reads it.
    await addReply(hana.userId, id, "二回目はうまくいった");
    await expect(addReply(sora.userId, id, "見たい")).rejects.toMatchObject({ code: "not_found" });
    expect(await readReplies(sora.userId, id)).toEqual([]);

    // Shared with connections: Sora and Ren reply, and everyone sees every reply, with names.
    await setMemoryAudience(hana.userId, id, { visibility: "connections" });
    await addReply(sora.userId, id, "おいしそう！");
    await addReply(ren.userId, id, "レシピ教えて");
    await addReply(hana.userId, id, "今度持っていくね");
    const all = ["二回目はうまくいった", "おいしそう！", "レシピ教えて", "今度持っていくね"];
    for (const u of [hana, sora, ren]) expect(bodies(await readReplies(u.userId, id))).toEqual(all);
    expect((await readReplies(ren.userId, id)).map((x) => [x.authorName, x.mine])).toEqual([["Hana", false], ["Sora", false], ["Ren", true], ["Hana", false]]);
    expect(await readReplies(stranger.userId, id)).toEqual([]);
    await expect(addReply(stranger.userId, id, "やあ")).rejects.toMatchObject({ code: "not_found" });

    // The timeline's newest two and the count; a stranger gets nothing.
    const p = await replyPreviews(sora.userId, [id]);
    expect(bodies(p.previews.get(id)!)).toEqual(["レシピ教えて", "今度持っていくね"]);
    expect(p.counts.get(id)).toBe(4);
    expect((await replyPreviews(stranger.userId, [id])).counts.size).toBe(0);

    // The table itself: nobody writes directly, and others' rows aren't readable directly.
    await expect(withUser(sora.userId, (tx) => tx.execute(sql`insert into memory_replies (entry_id, owner_id, author_id, body) values (${id}, ${hana.userId}, ${sora.userId}, 'x')`))).rejects.toThrow();
    const direct = await withUser(ren.userId, async (tx) => (await tx.execute<{ body: string }>(sql`select body from memory_replies`)).rows);
    expect(bodies(direct)).toEqual(["レシピ教えて"]);

    // Deleting: the writer, or the record's owner; nobody else.
    const [, soras, rens] = await readReplies(hana.userId, id);
    await expect(deleteReply(ren.userId, soras!.id)).rejects.toMatchObject({ code: "not_found" });
    await deleteReply(sora.userId, soras!.id);
    await deleteReply(hana.userId, rens!.id);
    expect(bodies(await readReplies(sora.userId, id))).toEqual(["二回目はうまくいった", "今度持っていくね"]);

    // Once the connection ends, Sora reads nothing and can't reply.
    await revokeComparison(hana.userId, withSora);
    expect(await readReplies(sora.userId, id)).toEqual([]);
    await expect(addReply(sora.userId, id, "まだ？")).rejects.toMatchObject({ code: "not_found" });
  });

  it("tells each person what's new to them, until they read the thread", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    await connect(hana.userId, sora.userId);
    const id = await createMemory(hana.userId, { kind: "memory", body: "海に行った" });
    await setMemoryAudience(hana.userId, id, { visibility: "connections" });

    await addReply(sora.userId, id, "楽しそう！");
    expect(await replyInbox(hana.userId)).toEqual([expect.objectContaining({ entryId: id, iOwn: true, unread: 1, lastBody: "楽しそう！", lastAuthorName: "Sora" })]);
    expect(await replyInbox(sora.userId)).toEqual([expect.objectContaining({ entryId: id, unread: 0, lastBody: null })]); // nothing by others yet
    await readReplies(hana.userId, id);
    expect((await replyInbox(hana.userId))[0]).toMatchObject({ unread: 0 });

    await addReply(hana.userId, id, "ありがとう");
    expect(await replyInbox(sora.userId)).toEqual([expect.objectContaining({ entryId: id, iOwn: false, ownerName: "Hana", unread: 1, lastAuthorName: "Hana" })]);
  });

  it("can't be added under a letter to the future, or be empty", async () => {
    const hana = await makeUser("Hana");
    const letter = await createMemory(hana.userId, { kind: "letter_to_future", title: "未来へ", body: "元気？", revealOn: "2035-01-01" });
    await expect(addReply(hana.userId, letter, "x")).rejects.toMatchObject({ code: "not_found" });
    const id = await createMemory(hana.userId, { kind: "memory", body: "x" });
    await expect(addReply(hana.userId, id, "   ")).rejects.toMatchObject({ code: "invalid_comment" });
  });
});
