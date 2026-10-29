import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: { endpoint: string; payload: { title: string; body: string } }[] = [];
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async (sub: { endpoint: string }, payload: string) => {
      sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
    }),
  },
}));

const { createGroup, dmInbox, dmMessages, dmUnreadTotal, editMessage, leaveGroup, markRead, openDirect, sendMessage, setMuted } = await import("@/server/services/dm");
const { notifyMessage, subscribePush } = await import("@/server/services/push");
const { createShare, giveConsent, openComparison } = await import("@/server/services/sharing");
const { makeUser } = await import("../helpers/factory");

async function connect(a: string, b: string) {
  const id = await openComparison(b, (await createShare(a)).token);
  await giveConsent(a, id, { scopes: ["preferences"], agree: true });
  await giveConsent(b, id, { scopes: ["preferences"], agree: true });
}
const sub = (name: string) => ({ endpoint: `https://push.example/${name}-${Math.random().toString(36).slice(2)}`, keys: { p256dh: "BKey_abc-1", auth: "auth_1" } });

/** Sora's group with ハナ and ハナコ (one name starts the other). */
async function group() {
  const sora = await makeUser("ソラ");
  const hana = await makeUser("ハナ");
  const hanako = await makeUser("ハナコ");
  await connect(sora.userId, hana.userId);
  await connect(sora.userId, hanako.userId);
  const g = await createGroup(sora.userId, "旅行", [hana.userId, hanako.userId]);
  return { sora, hana, hanako, g };
}

async function mentionsOf(viewer: string, conv: string, id: string) {
  const m = (await dmMessages(viewer, conv)).find((x) => x.id === id)!;
  return { ids: m.mentions.map((x) => x.id).sort(), all: m.mentionsAll };
}

const env = { ...process.env };
beforeEach(() => {
  sent.length = 0;
  process.env.VAPID_PUBLIC_KEY = "BPublic";
  process.env.VAPID_PRIVATE_KEY = "private";
  process.env.VAPID_SUBJECT = "mailto:admin@example.test";
});
afterEach(() => {
  for (const k of ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const) {
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
});

describe("mentions in group messages", () => {
  it("are read from the body: members by name (the longer name wins), everyone with @全員/@all, never the writer", async () => {
    const { sora, hana, hanako, g } = await group();
    const say = (body: string) => sendMessage(sora.userId, g, { kind: "text", body });
    expect(await mentionsOf(hana.userId, g, await say("@ハナ おはよう"))).toEqual({ ids: [hana.userId], all: false });
    expect(await mentionsOf(hana.userId, g, await say("@ハナコ 元気？"))).toEqual({ ids: [hanako.userId], all: false });
    expect(await mentionsOf(hana.userId, g, await say("@ハナ と @ハナコ、明日ね"))).toEqual({ ids: [hana.userId, hanako.userId].sort(), all: false });
    expect(await mentionsOf(hana.userId, g, await say("@ソラ は私"))).toEqual({ ids: [], all: false });
    expect(await mentionsOf(hana.userId, g, await say("@全員 集合は9時"))).toEqual({ ids: [], all: true });
    expect(await mentionsOf(hana.userId, g, await say("みんな@全員へ"))).toEqual({ ids: [], all: true });
    expect(await mentionsOf(hana.userId, g, await say("@all see you"))).toEqual({ ids: [], all: true });
    expect(await mentionsOf(hana.userId, g, await say("mail me at x@all.example or @allison"))).toEqual({ ids: [], all: false });
    // The names come with the message, as they are now.
    const named = (await dmMessages(hana.userId, g)).find((x) => x.body === "@ハナ おはよう")!;
    expect(named.mentions).toEqual([{ id: hana.userId, name: "ハナ" }]);
  });

  it("follow an edit, stay out of one-to-one chats, and leave out members who left", async () => {
    const { sora, hana, hanako, g } = await group();
    const id = await sendMessage(sora.userId, g, { kind: "text", body: "@ハナ 見た？" });
    await editMessage(sora.userId, id, "見た？");
    expect(await mentionsOf(hana.userId, g, id)).toEqual({ ids: [], all: false });
    await editMessage(sora.userId, id, "@ハナコ 見た？");
    expect(await mentionsOf(hana.userId, g, id)).toEqual({ ids: [hanako.userId], all: false });

    const d = await openDirect(sora.userId, hana.userId);
    expect(await mentionsOf(hana.userId, d, await sendMessage(sora.userId, d, { kind: "text", body: "@ハナ @全員" }))).toEqual({ ids: [], all: false });

    await leaveGroup(hanako.userId, g);
    expect(await mentionsOf(hana.userId, g, await sendMessage(sora.userId, g, { kind: "text", body: "@ハナコ どこ？" }))).toEqual({ ids: [], all: false });
  });

  it("show in the inbox and the badge, even in a muted group, until read", async () => {
    const { sora, hana, g } = await group();
    await setMuted(hana.userId, g, true);
    await sendMessage(sora.userId, g, { kind: "text", body: "集合は9時" });
    expect(await dmUnreadTotal(hana.userId)).toBe(0);
    expect((await dmInbox(hana.userId)).find((x) => x.id === g)!.mentioned).toBe(false);
    await sendMessage(sora.userId, g, { kind: "text", body: "@ハナ 来られる？" });
    expect((await dmInbox(hana.userId)).find((x) => x.id === g)!.mentioned).toBe(true);
    expect(await dmUnreadTotal(hana.userId)).toBe(1);
    await markRead(hana.userId, g);
    expect((await dmInbox(hana.userId)).find((x) => x.id === g)!.mentioned).toBe(false);
    expect(await dmUnreadTotal(hana.userId)).toBe(0);
  });

  it("reach a muted member by push, saying they were mentioned; @all reaches everyone", async () => {
    const { sora, hana, hanako, g } = await group();
    const hanaPhone = sub("hana");
    const hanakoPhone = sub("hanako");
    await subscribePush(hana.userId, hanaPhone);
    await subscribePush(hanako.userId, hanakoPhone);
    await setMuted(hana.userId, g, true);

    await notifyMessage(sora.userId, await sendMessage(sora.userId, g, { kind: "text", body: "集合は9時" }));
    expect(sent.map((x) => x.endpoint)).toEqual([hanakoPhone.endpoint]);

    sent.length = 0;
    await notifyMessage(sora.userId, await sendMessage(sora.userId, g, { kind: "text", body: "@ハナ 来られる？" }));
    const by = (e: string) => sent.find((x) => x.endpoint === e)!.payload.body;
    expect(sent.map((x) => x.endpoint).sort()).toEqual([hanaPhone.endpoint, hanakoPhone.endpoint].sort());
    expect(by(hanaPhone.endpoint)).toBe("旅行: ソラ mentioned you");
    expect(by(hanakoPhone.endpoint)).toBe("旅行: a message from ソラ");

    sent.length = 0;
    await notifyMessage(sora.userId, await sendMessage(sora.userId, g, { kind: "text", body: "@全員 出発します" }));
    expect(sent.map((x) => x.payload.body).sort()).toEqual(["旅行: ソラ mentioned you", "旅行: ソラ mentioned you"]);
  });
});
