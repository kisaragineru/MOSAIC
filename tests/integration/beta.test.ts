import { afterEach, describe, expect, it } from "vitest";
import { adminUsers, betaGroupFor, isBetaTester, setBetaTester } from "@/server/services/admin";
import { addMembers, dmConversation, dmInbox, leaveGroup, renameGroup, sendMessage } from "@/server/services/dm";
import { makeUser } from "../helpers/factory";

const env = { ...process.env };
afterEach(() => {
  if (env.ADMIN_EMAILS === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = env.ADMIN_EMAILS;
});

describe("beta testers: chosen by an admin, all in one group", () => {
  it("lists users for admins only, without anything they wrote", async () => {
    const boss = await makeUser("Boss");
    const someone = await makeUser("Someone");
    process.env.ADMIN_EMAILS = boss.email;
    const list = (await adminUsers(boss.userId))!;
    const me = list.find((u) => u.id === someone.userId)!;
    expect(me).toMatchObject({ name: "Someone", email: someone.email, records: 0, connections: 0, beta: false, test: false });
    expect(Object.keys(me).sort()).toEqual(["beta", "connections", "createdAt", "email", "id", "lastSeen", "name", "records", "test"]);
    expect(await adminUsers(someone.userId)).toBeNull();
    await expect(setBetaTester(someone.userId, someone.userId, true)).rejects.toThrow();
  });

  it("each beta tester joins the group (no connection needed) and can't leave it; removed, they're out", async () => {
    const boss = await makeUser("Boss");
    const a = await makeUser("Aki");
    const b = await makeUser("Ben");
    const outsider = await makeUser("Out");
    process.env.ADMIN_EMAILS = boss.email;
    const gid = await setBetaTester(boss.userId, a.userId, true);
    expect(await setBetaTester(boss.userId, b.userId, true)).toBe(gid);
    await setBetaTester(boss.userId, b.userId, true); // twice: no change
    expect(await isBetaTester(a.userId)).toBe(true);
    expect(await isBetaTester(outsider.userId)).toBe(false);
    expect((await adminUsers(boss.userId))!.find((u) => u.id === a.userId)!.beta).toBe(true);

    // Everyone in it, the admin too, and they can write to each other without being connected.
    expect(await betaGroupFor(a.userId)).toBe(gid);
    expect(await betaGroupFor(boss.userId)).toBe(gid);
    expect(await betaGroupFor(outsider.userId)).toBeNull();
    const conv = await dmConversation(a.userId, gid);
    expect(conv).toMatchObject({ kind: "group", title: "MOSAIC β", system: "beta", canSend: true });
    expect(conv.members.filter((m) => !m.left).map((m) => m.id)).toEqual(expect.arrayContaining([boss.userId, a.userId, b.userId]));
    await sendMessage(a.userId, gid, { kind: "text", body: "はじめまして" });
    expect((await dmInbox(b.userId)).find((x) => x.id === gid)!.unread).toBeGreaterThan(0);
    await expect(dmConversation(outsider.userId, gid)).rejects.toThrow();

    // Managed by MOSAIC: no leaving, renaming or adding from inside.
    await expect(leaveGroup(a.userId, gid)).rejects.toThrow(/system_group/);
    await expect(renameGroup(boss.userId, gid, "x")).rejects.toThrow(/system_group/);
    await expect(addMembers(a.userId, gid, [outsider.userId])).rejects.toThrow(/system_group/);

    // Removed: out of the group, can't write there any more.
    await setBetaTester(boss.userId, a.userId, false);
    expect(await isBetaTester(a.userId)).toBe(false);
    expect(await betaGroupFor(a.userId)).toBeNull();
    await expect(sendMessage(a.userId, gid, { kind: "text", body: "まだいる？" })).rejects.toThrow();
    // And back again.
    await setBetaTester(boss.userId, a.userId, true);
    expect(await betaGroupFor(a.userId)).toBe(gid);
  });
});
