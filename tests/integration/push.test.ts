import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: { endpoint: string; payload: { title: string; body: string; url: string; tag: string } }[] = [];
const gone = new Set<string>();
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async (sub: { endpoint: string }, payload: string) => {
      if (gone.has(sub.endpoint)) throw Object.assign(new Error("gone"), { statusCode: 410 });
      sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
    }),
  },
}));

const { createGroup, leaveGroup, openDirect, sendMessage, setMuted } = await import("@/server/services/dm");
const { notifyMessage, pushDevices, setPushPreview, subscribePush, unsubscribePush } = await import("@/server/services/push");
const { createShare, giveConsent, openComparison } = await import("@/server/services/sharing");
const { makeUser } = await import("../helpers/factory");

async function connect(a: string, b: string) {
  const id = await openComparison(b, (await createShare(a)).token);
  await giveConsent(a, id, { scopes: ["preferences"], agree: true });
  await giveConsent(b, id, { scopes: ["preferences"], agree: true });
}
const sub = (name: string) => ({ endpoint: `https://push.example/${name}-${Math.random().toString(36).slice(2)}`, keys: { p256dh: "BKey_abc-1", auth: "auth_1" } });

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

describe("push notifications for messages", () => {
  it("go to the others who turned them on (not the sender, not muted, not left); text only if they chose", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    const ren = await makeUser("Ren");
    await connect(hana.userId, sora.userId);
    await connect(hana.userId, ren.userId);
    const soraPhone = sub("sora");
    const renPhone = sub("ren");
    await subscribePush(sora.userId, soraPhone);
    await subscribePush(ren.userId, renPhone);
    await subscribePush(hana.userId, sub("hana"));
    expect(await pushDevices(sora.userId)).toBe(1);

    const d = await openDirect(hana.userId, sora.userId);
    expect(await notifyMessage(hana.userId, await sendMessage(hana.userId, d, { kind: "text", body: "今どこ？" }))).toBe(1);
    expect(sent).toEqual([{ endpoint: soraPhone.endpoint, payload: { title: "MOSAIC", body: "A message from Hana", url: `/messages/${d}`, tag: `dm-${d}` } }]);

    // Sora chose to see the text.
    sent.length = 0;
    await setPushPreview(sora.userId, true);
    await notifyMessage(hana.userId, await sendMessage(hana.userId, d, { kind: "text", body: "駅にいるよ" }));
    expect(sent[0]!.payload.body).toBe("A message from Hana\n駅にいるよ");

    // Group: muted and left members aren't told.
    const g = await createGroup(hana.userId, "旅行", [sora.userId, ren.userId]);
    sent.length = 0;
    await notifyMessage(hana.userId, await sendMessage(hana.userId, g, { kind: "text", body: "集合は9時" }));
    expect(sent.map((x) => x.endpoint).sort()).toEqual([soraPhone.endpoint, renPhone.endpoint].sort());
    await setMuted(ren.userId, g, true);
    sent.length = 0;
    await notifyMessage(hana.userId, await sendMessage(hana.userId, g, { kind: "text", body: "遅れる" }));
    expect(sent.map((x) => x.endpoint)).toEqual([soraPhone.endpoint]);
    await leaveGroup(sora.userId, g);
    sent.length = 0;
    expect(await notifyMessage(hana.userId, await sendMessage(hana.userId, g, { kind: "text", body: "着いた" }))).toBe(0);

    // Only the sender can ask for a message's notifications.
    const m = await sendMessage(hana.userId, d, { kind: "text", body: "x" });
    sent.length = 0;
    expect(await notifyMessage(sora.userId, m)).toBe(0);
    expect(sent).toEqual([]);
  });

  it("forgets a browser the push service says is gone; a browser moves to whoever turned it on there last", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    await connect(hana.userId, sora.userId);
    const phone = sub("shared");
    await subscribePush(hana.userId, phone);
    await subscribePush(sora.userId, phone);
    expect(await pushDevices(hana.userId)).toBe(0);
    expect(await pushDevices(sora.userId)).toBe(1);

    gone.add(phone.endpoint);
    const d = await openDirect(hana.userId, sora.userId);
    expect(await notifyMessage(hana.userId, await sendMessage(hana.userId, d, { kind: "text", body: "hi" }))).toBe(0);
    expect(await pushDevices(sora.userId)).toBe(0);

    await subscribePush(sora.userId, sub("again"));
    await unsubscribePush(sora.userId, phone.endpoint);
    expect(await pushDevices(sora.userId)).toBe(1);
    await expect(subscribePush(sora.userId, { endpoint: "http://insecure.example/x", keys: { p256dh: "a", auth: "b" } })).rejects.toThrow();
  });

  it("sends nothing while the keys aren't set", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    await connect(hana.userId, sora.userId);
    await subscribePush(sora.userId, sub("sora"));
    const d = await openDirect(hana.userId, sora.userId);
    expect(await notifyMessage(hana.userId, await sendMessage(hana.userId, d, { kind: "text", body: "hi" }))).toBe(0);
    expect(sent).toEqual([]);
  });
});
