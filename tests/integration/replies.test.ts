import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createMemory } from "@/server/services/memories";
import { setMemoryAudience } from "@/server/services/memory-share";
import { addReply, deleteReply, myReplies, sharedReplies } from "@/server/services/replies";
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

describe("replies to my own records", () => {
  it("are seen by whoever can see the record, and only the owner writes them", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const stranger = await makeUser("X");
    const session = await connect(hana.userId, sora.userId);
    const id = await createMemory(hana.userId, { kind: "memory", body: "パンを焼いた" });

    // A private record: the reply is hers alone.
    await addReply(hana.userId, id, "二回目はうまくいった");
    expect((await myReplies(hana.userId, id)).map((r) => r.body)).toEqual(["二回目はうまくいった"]);
    expect(await sharedReplies(sora.userId, id)).toEqual([]);

    // Shared with connections: Sora reads it too; a stranger doesn't.
    await setMemoryAudience(hana.userId, id, { visibility: "connections" });
    await addReply(hana.userId, id, "今度持っていくね");
    expect((await sharedReplies(sora.userId, id)).map((r) => r.body)).toEqual(["二回目はうまくいった", "今度持っていくね"]);
    expect(await sharedReplies(stranger.userId, id)).toEqual([]);

    // Nobody else can reply under her record, through the service or the table.
    await expect(addReply(sora.userId, id, "やあ")).rejects.toMatchObject({ code: "not_found" });
    await expect(
      withUser(sora.userId, (tx) => tx.execute(sql`insert into memory_replies (entry_id, owner_id, body) values (${id}, ${sora.userId}, 'x')`)),
    ).rejects.toThrow();
    expect(await withUser(sora.userId, async (tx) => (await tx.execute(sql`select * from memory_replies`)).rows)).toEqual([]);

    // Deleting: only her own; and once the connection ends Sora reads nothing.
    const [first] = await myReplies(hana.userId, id);
    await expect(deleteReply(sora.userId, first!.id)).rejects.toMatchObject({ code: "not_found" });
    await deleteReply(hana.userId, first!.id);
    expect((await myReplies(hana.userId, id)).map((r) => r.body)).toEqual(["今度持っていくね"]);
    await revokeComparison(hana.userId, session);
    expect(await sharedReplies(sora.userId, id)).toEqual([]);
  });

  it("are not added under a letter to the future", async () => {
    const hana = await makeUser("Hana");
    const id = await createMemory(hana.userId, { kind: "letter_to_future", title: "未来へ", body: "元気？", revealOn: "2035-01-01" });
    await expect(addReply(hana.userId, id, "x")).rejects.toMatchObject({ code: "not_found" });
  });
});
