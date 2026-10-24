import { describe, expect, it } from "vitest";
import { createMemory, getMemory } from "@/server/services/memories";
import {
  addGift,
  addImportantDate,
  addPreference,
  addRelationshipEntry,
  addRelationshipEvent,
  createPerson,
  getPerson,
  listPeople,
  mergePeople,
} from "@/server/services/people";
import { addPersonFromConnection, createShare, giveConsent, linkPersonToConnection, listComparisons, openComparison } from "@/server/services/sharing";
import { makeUser } from "../helpers/factory";

async function connect(a: string, b: string) {
  const s = await createShare(a);
  const id = await openComparison(b, s.token);
  await giveConsent(a, id, { scopes: ["preferences"], agree: true });
  await giveConsent(b, id, { scopes: ["preferences"], agree: true });
  return id;
}

describe("people written before connecting", () => {
  it("can take the connection when it comes, keeping everything recorded", async () => {
    const a = await makeUser("Hana");
    const b = await makeUser("Sora");
    const old = await createPerson(a.userId, { nickname: "そら", relationship: "family" });
    await addGift(a.userId, old, { item: "マフラー", reaction: "loved" });
    const sid = await connect(a.userId, b.userId);
    await linkPersonToConnection(a.userId, old, sid);
    expect((await listComparisons(a.userId)).find((c) => c.id === sid)!.personId).toBe(old);
    expect((await getPerson(a.userId, old)).gifts.map((g) => g.item)).toEqual(["マフラー"]);
  });

  it("merge two entries for one person: everything moves, the connection stays, the other is gone", async () => {
    const a = await makeUser();
    const b = await makeUser("Sora");
    const old = await createPerson(a.userId, { nickname: "そら", relationship: "family", note: "昔からの友だち" });
    await addGift(a.userId, old, { item: "マフラー", reaction: "loved" });
    await addRelationshipEvent(a.userId, old, { title: "京都旅行", occurredOn: "2025-04-01" });
    await addRelationshipEntry(a.userId, old, { kind: "note", body: "甘いものが好き" });
    await addImportantDate(a.userId, { personId: old, label: "誕生日", kind: "birthday", month: 3, day: 3 });
    await addPreference(a.userId, { personId: old, categoryId: "food", label: "どら焼き", sentiment: "love", source: "observed" });
    const memo = await createMemory(a.userId, { kind: "memory", body: "一緒にお茶", personIds: [old] });

    const sid = await connect(a.userId, b.userId);
    const fromConn = await addPersonFromConnection(a.userId, sid, "friend");
    await addPreference(a.userId, { personId: fromConn, categoryId: "food", label: "どら焼き", sentiment: "like", source: "person_stated" });

    await mergePeople(a.userId, fromConn, old);
    const p = await getPerson(a.userId, fromConn);
    expect(p.person.connectionSessionId).toBe(sid);
    expect(p.person.note).toBe("昔からの友だち");
    expect(p.gifts.map((g) => g.item)).toEqual(["マフラー"]);
    expect(p.events.map((e) => e.title)).toEqual(["京都旅行"]);
    expect(p.entries.map((e) => e.body)).toEqual(["甘いものが好き"]);
    expect(p.dates.map((d) => d.label)).toEqual(["誕生日"]);
    // The same favourite on both becomes one item with both feelings in its history.
    expect(p.preferences).toHaveLength(1);
    expect((await getMemory(a.userId, memo)).people.map((x) => x.id)).toEqual([fromConn]);
    expect((await listPeople(a.userId)).map((x) => x.id)).toEqual([fromConn]);
    await expect(getPerson(a.userId, old)).rejects.toMatchObject({ code: "not_found" });
  });

  it("refuses merging into itself, someone else's entry, or two connected entries", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const c = await makeUser();
    const x = await createPerson(a.userId, { nickname: "X" });
    await expect(mergePeople(a.userId, x, x)).rejects.toThrow();
    const theirs = await createPerson(b.userId, { nickname: "Y" });
    await expect(mergePeople(a.userId, x, theirs)).rejects.toMatchObject({ code: "not_found" });
    const p1 = await addPersonFromConnection(a.userId, await connect(a.userId, b.userId));
    const p2 = await addPersonFromConnection(a.userId, await connect(a.userId, c.userId));
    await expect(mergePeople(a.userId, p1, p2)).rejects.toMatchObject({ code: "both_connected" });
  });
});
