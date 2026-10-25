import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { withUser } from "@/server/db/tx";
import {
  addMembers,
  createGroup,
  dmSync,
  dmAttachment,
  dmChanges,
  dmConversation,
  dmInbox,
  dmMessages,
  dmUnreadTotal,
  editMessage,
  hideConversation,
  leaveGroup,
  markRead,
  messageText,
  openDirect,
  reactToMessage,
  renameGroup,
  sendMessage,
  sendMessageFast,
  setMuted,
  setTyping,
  sniffImage,
  unsendMessage,
  uploadPhoto,
  uploadPhotoFast,
} from "@/server/services/dm";
import { createMemory } from "@/server/services/memories";
import { setMemoryAudience } from "@/server/services/memory-share";
import { createShare, giveConsent, openComparison, revokeComparison } from "@/server/services/sharing";
import { Pool } from "pg";
import { translateMessage } from "@/server/services/translate";
import { makeUser } from "../helpers/factory";
import { TEST_MIGRATION_DATABASE_URL } from "../helpers/test-env";

async function connect(a: string, b: string) {
  const s = await createShare(a);
  const id = await openComparison(b, s.token);
  await giveConsent(a, id, { scopes: ["preferences"], agree: true });
  await giveConsent(b, id, { scopes: ["preferences"], agree: true });
  return id;
}

// A 1×1 PNG.
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));

describe("direct messages", () => {
  it("translation reads only a message the reader can see, and says so when it isn't available", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const x = await makeUser("X");
    await connect(hana.userId, sora.userId);
    const c = await openDirect(hana.userId, sora.userId);
    const m = await sendMessage(hana.userId, c, { kind: "text", body: "Xin chào, bạn khỏe không?" });
    expect(await messageText(sora.userId, m)).toBe("Xin chào, bạn khỏe không?");
    await expect(messageText(x.userId, m)).rejects.toMatchObject({ code: "not_found" });
    // Without an AI key the button explains that translation is unavailable; nothing is sent.
    const key = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      await expect(translateMessage(sora.userId, m, "ja")).rejects.toMatchObject({ code: "translate_unavailable" });
    } finally {
      if (key !== undefined) process.env.ANTHROPIC_API_KEY = key;
    }
  });

  it("only between connected people; one conversation per pair; read receipts and unread counts", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const x = await makeUser("X");
    await expect(openDirect(hana.userId, sora.userId)).rejects.toMatchObject({ code: "not_connected" });
    const sid = await connect(hana.userId, sora.userId);
    const c = await openDirect(hana.userId, sora.userId);
    expect(await openDirect(sora.userId, hana.userId)).toBe(c);
    // An empty conversation isn't in the inbox yet.
    expect(await dmInbox(hana.userId)).toEqual([]);

    const m1 = await sendMessage(hana.userId, c, { kind: "text", body: "  こんにちは  " });
    await sendMessage(hana.userId, c, { kind: "text", body: "元気？" });
    expect((await dmMessages(sora.userId, c)).map((m) => [m.body, m.senderName])).toEqual([["こんにちは", "Hana"], ["元気？", "Hana"]]);
    expect(await dmUnreadTotal(sora.userId)).toBe(1);
    expect((await dmInbox(sora.userId))[0]).toMatchObject({ kind: "direct", unread: 2, others: [{ name: "Hana" }], last: { body: "元気？", mine: false } });
    expect(await dmUnreadTotal(hana.userId)).toBe(0);

    // Strangers can't read or write.
    await expect(dmMessages(x.userId, c)).rejects.toMatchObject({ code: "not_found" });
    await expect(sendMessage(x.userId, c, { kind: "text", body: "hi" })).rejects.toMatchObject({ code: "not_found" });
    await expect(withUser(hana.userId, (tx) => tx.execute(sql`select * from dm_messages`))).rejects.toBeTruthy();

    // Reading marks it read; the sender sees when.
    await markRead(sora.userId, c);
    expect(await dmUnreadTotal(sora.userId)).toBe(0);
    expect((await dmConversation(hana.userId, c)).members.find((m) => m.name === "Sora")!.lastReadAt).not.toBeNull();

    // Reply, react, typing, edit, unsend.
    const r = await sendMessage(sora.userId, c, { kind: "text", body: "元気だよ", replyTo: m1 });
    await reactToMessage(hana.userId, r, "❤️");
    await setTyping(sora.userId, c);
    expect((await dmConversation(hana.userId, c)).members.find((m) => m.name === "Sora")!.typing).toBe(true);
    const thread = await dmMessages(hana.userId, c);
    const reply = thread.find((m) => m.id === r)!;
    expect(reply.reply).toMatchObject({ id: m1, body: "こんにちは", senderName: "Hana" });
    expect(reply.reactions).toEqual([{ userId: hana.userId, emoji: "❤️" }]);
    await expect(reactToMessage(hana.userId, r, "🍣")).rejects.toBeTruthy();
    await expect(editMessage(hana.userId, r, "乗っ取り")).rejects.toMatchObject({ code: "not_found" });
    await editMessage(sora.userId, r, "元気だよ！");
    const since = thread.at(-1)!.updatedAt;
    await unsendMessage(hana.userId, m1);
    const changed = await dmChanges(sora.userId, c, since);
    expect(changed.map((m) => [m.id, m.deleted])).toEqual(expect.arrayContaining([[m1, true]]));
    const after = await dmMessages(sora.userId, c);
    expect(after.find((m) => m.id === m1)).toMatchObject({ deleted: true, body: null });
    expect(after.find((m) => m.id === r)).toMatchObject({ body: "元気だよ！", edited: true, reply: { deleted: true } });

    // Edits are allowed only for 15 minutes.
    const old = await sendMessage(sora.userId, c, { kind: "text", body: "古い" });
    const pool = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
    await pool.query("update dm_messages set created_at = now() - interval '16 minutes' where id = $1", [old]);
    await pool.end();
    await expect(editMessage(sora.userId, old, "新しい")).rejects.toMatchObject({ code: "edit_window_passed" });

    // Muted conversations don't count in the badge; "delete chat" hides history on one side only.
    await sendMessage(hana.userId, c, { kind: "text", body: "ねえ" });
    await setMuted(sora.userId, c, true);
    expect(await dmUnreadTotal(sora.userId)).toBe(0);
    await hideConversation(sora.userId, c);
    expect(await dmMessages(sora.userId, c)).toEqual([]);
    expect((await dmMessages(hana.userId, c)).length).toBeGreaterThan(3);

    // When the connection ends, the conversation stays readable but nobody can write.
    await revokeComparison(hana.userId, sid);
    expect((await dmConversation(hana.userId, c)).canSend).toBe(false);
    await expect(sendMessage(hana.userId, c, { kind: "text", body: "まだいる？" })).rejects.toMatchObject({ code: "cannot_send" });
    expect((await dmMessages(hana.userId, c)).length).toBeGreaterThan(0);
  });

  it("groups: members from the adder's connections, history from when you joined, leaving", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const ren = await makeUser("Ren");
    const mio = await makeUser("Mio");
    await connect(hana.userId, sora.userId);
    await connect(hana.userId, ren.userId);
    await connect(sora.userId, mio.userId);
    await expect(createGroup(hana.userId, "旅行", [sora.userId])).rejects.toMatchObject({ code: "invalid_group" });
    await expect(createGroup(hana.userId, "旅行", [sora.userId, mio.userId])).rejects.toMatchObject({ code: "not_connected" });
    const g = await createGroup(hana.userId, "旅行", [sora.userId, ren.userId]);
    await sendMessage(sora.userId, g, { kind: "text", body: "どこ行く？" });
    expect((await dmInbox(ren.userId))[0]).toMatchObject({ kind: "group", title: "旅行", unread: 1 });

    // Hana can't add Mio (not connected to her), Sora can.
    await expect(addMembers(hana.userId, g, [mio.userId])).rejects.toMatchObject({ code: "not_connected" });
    await addMembers(sora.userId, g, [mio.userId]);
    // Mio sees from when she joined: the "added" notice, not what came before.
    const seen = await dmMessages(mio.userId, g);
    expect(seen.map((m) => m.kind)).toEqual(["system"]);
    expect(seen[0]!.meta).toMatchObject({ event: "added", users: [mio.userId] });
    await sendMessage(mio.userId, g, { kind: "text", body: "よろしく" });
    expect((await dmConversation(hana.userId, g)).members.find((m) => m.name === "Mio")).toMatchObject({ connected: false });

    await renameGroup(ren.userId, g, "夏の旅行");
    expect((await dmConversation(sora.userId, g)).title).toBe("夏の旅行");
    await leaveGroup(ren.userId, g);
    await sendMessage(hana.userId, g, { kind: "text", body: "Renいなくなった" });
    expect((await dmMessages(ren.userId, g)).some((m) => m.body === "Renいなくなった")).toBe(false);
    await expect(sendMessage(ren.userId, g, { kind: "text", body: "戻りたい" })).rejects.toMatchObject({ code: "not_found" });
    expect((await dmInbox(ren.userId))[0]).toMatchObject({ leftGroup: true, canSend: false });
  });

  it("photos only for members who can see them; shared records only for people who may read them", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const ren = await makeUser("Ren");
    await connect(hana.userId, sora.userId);
    await connect(hana.userId, ren.userId);
    const c = await openDirect(hana.userId, sora.userId);
    expect(sniffImage(PNG)).toBe("image/png");
    await expect(uploadPhoto(hana.userId, c, new TextEncoder().encode("<svg onload=alert(1)>"), 1, 1)).rejects.toMatchObject({ code: "invalid_image" });
    const a = await uploadPhoto(hana.userId, c, PNG, 1, 1);
    await expect(sendMessage(sora.userId, c, { kind: "image", attachmentIds: [a] })).rejects.toMatchObject({ code: "not_found" });
    expect(await dmAttachment(sora.userId, a)).toBeNull(); // not sent yet
    const m = await sendMessage(hana.userId, c, { kind: "image", attachmentIds: [a] });
    expect((await dmAttachment(sora.userId, a))!.mime).toBe("image/png");
    expect(await dmAttachment(ren.userId, a)).toBeNull();
    expect((await dmMessages(sora.userId, c)).at(-1)!.attachments).toEqual([{ id: a, w: 1, h: 1 }]);
    await unsendMessage(hana.userId, m);
    expect(await dmAttachment(sora.userId, a)).toBeNull();

    // A record Hana shares with family only: Sora (not family) sees it hidden, Hana sees it.
    const rec = await createMemory(hana.userId, { body: "家族だけの話" });
    await sendMessage(hana.userId, c, { kind: "record", recordId: rec });
    expect((await dmMessages(sora.userId, c)).at(-1)!.record).toEqual({ hidden: true });
    await setMemoryAudience(hana.userId, rec, { visibility: "connections" });
    expect((await dmMessages(sora.userId, c)).at(-1)!.record).toMatchObject({ body: "家族だけの話", ownerName: "Hana", mine: false });
    // Sora can't send a record she can't read.
    const ownPrivate = await createMemory(ren.userId, { body: "Renの秘密" });
    await expect(sendMessage(sora.userId, c, { kind: "record", recordId: ownPrivate })).rejects.toMatchObject({ code: "not_found" });
  });

  it("fast paths: a browser-named message is sent once however often it's retried; one call keeps a conversation current", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    await connect(hana.userId, sora.userId);
    const c = await openDirect(hana.userId, sora.userId);
    const id = crypto.randomUUID();
    expect(await sendMessageFast(hana.userId, c, { id, kind: "text", body: "一度だけ" })).toBe(id);
    expect(await sendMessageFast(hana.userId, c, { id, kind: "text", body: "一度だけ" })).toBe(id);
    expect((await dmMessages(sora.userId, c)).filter((m) => m.body === "一度だけ")).toHaveLength(1);
    // Someone else can't claim that id.
    await expect(sendMessageFast(sora.userId, c, { id, kind: "text", body: "横取り" })).rejects.toMatchObject({ code: "not_found" });

    const s1 = await dmSync(sora.userId, c, { since: new Date(0).toISOString(), read: true, typing: true });
    expect(s1.messages.map((m) => m.body)).toEqual(["一度だけ"]);
    const view = await dmSync(hana.userId, c, { since: null, read: false, typing: false });
    expect(view.messages).toEqual([]);
    expect(view.conversation.members.find((m) => m.name === "Sora")).toMatchObject({ typing: true });
    expect(view.conversation.members.find((m) => m.name === "Sora")!.lastReadAt).not.toBeNull();
    expect(await dmUnreadTotal(sora.userId)).toBe(0);
    const photo = await uploadPhotoFast(hana.userId, c, PNG, 1, 1);
    await sendMessageFast(hana.userId, c, { id: crypto.randomUUID(), kind: "image", attachmentIds: [photo] });
    expect((await dmMessages(sora.userId, c)).at(-1)!.attachments).toHaveLength(1);
  });
});
