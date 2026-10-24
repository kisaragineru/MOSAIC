import { describe, expect, it } from "vitest";
import {
  codeHash, createGiftBox, deleteGiftEntry, deliverAsBook, inviteGiftWriter, issueReceiveCode, joinGiftBox, myGiftBoxes,
  newCode, readGiftBox, receiveGift, removeGiftWriter, saveGiftEntry, saveGiftView, updateGiftBox,
} from "@/server/services/gift-boxes";
import { buildExport } from "@/server/services/export";
import { buildManual } from "@/server/services/manual";
import { makeUser } from "../helpers/factory";

const FUTURE = "2040-04-01";
const PAST = "2020-04-01";

async function family(deliverOn = FUTURE) {
  const mom = await makeUser("Mai");
  const dad = await makeUser("Duc");
  const grandma = await makeUser("Ba");
  const box = await createGiftBox(mom.userId, { childName: "Hana", childBirthday: "2018-05-05", deliverOn, role: "mother", label: "ママ" });
  await joinGiftBox(dad.userId, await inviteGiftWriter(mom.userId, box, "father"), "パパ");
  await joinGiftBox(grandma.userId, await inviteGiftWriter(mom.userId, box, "grandmother"), "おばあちゃん");
  return { mom, dad, grandma, box };
}

describe("gift boxes", () => {
  it("parents and grandparents write together; growth is shared, letters and views stay with their writer", async () => {
    const { mom, dad, grandma, box } = await family();
    await saveGiftEntry(mom.userId, box, { kind: "growth", occurredOn: "2019-06-01", title: "初めて歩いた", body: "リビングで3歩。" });
    await saveGiftEntry(dad.userId, box, { kind: "letter", body: "パパからの手紙" });
    await saveGiftEntry(grandma.userId, box, { kind: "letter", body: "おばあちゃんからの手紙" });
    await saveGiftView(dad.userId, box, { answers: { planning: 1, calm: -1 }, comment: "慎重な子" });

    const asMom = await readGiftBox(mom.userId, box);
    expect(asMom).toMatchObject({ my_role: "owner", child_name: "Hana", status: "open", hidden_letters: 2 });
    expect(asMom.writers.map((w) => [w.role, w.label, w.owner])).toEqual([["mother", "ママ", true], ["father", "パパ", false], ["grandmother", "おばあちゃん", false]]);
    expect(asMom.entries.map((e) => e.body)).toEqual(["リビングで3歩。"]);
    expect(asMom.views).toEqual([]);

    const asDad = await readGiftBox(dad.userId, box);
    expect(asDad.my_role).toBe("writer");
    expect(asDad.entries.map((e) => e.body).sort()).toEqual(["パパからの手紙", "リビングで3歩。"]);
    expect(asDad.views).toEqual([expect.objectContaining({ answers: { planning: 1, calm: -1 }, comment: "慎重な子" })]);
    expect(asDad.hidden_letters).toBe(1);
    expect((await myGiftBoxes(grandma.userId))[0]).toMatchObject({ id: box, my_role: "writer", writers: 3 });
  });

  it("writers edit and delete only their own entries", async () => {
    const { mom, dad, box } = await family();
    const id = await saveGiftEntry(mom.userId, box, { kind: "growth", body: "a" });
    await expect(saveGiftEntry(dad.userId, box, { kind: "growth", body: "b" }, id)).rejects.toThrow();
    await expect(deleteGiftEntry(dad.userId, id)).rejects.toThrow();
    await saveGiftEntry(mom.userId, box, { kind: "growth", body: "a2" }, id);
    expect((await readGiftBox(dad.userId, box)).entries[0]!.body).toBe("a2");
    await deleteGiftEntry(mom.userId, id);
    expect((await readGiftBox(dad.userId, box)).entries).toEqual([]);
  });

  it("is closed to everyone else, and invites work once", async () => {
    const { mom, box } = await family();
    const stranger = await makeUser("X");
    await expect(readGiftBox(stranger.userId, box)).rejects.toThrow();
    await expect(saveGiftEntry(stranger.userId, box, { kind: "growth", body: "x" })).rejects.toThrow();
    await expect(inviteGiftWriter(stranger.userId, box, "father")).rejects.toThrow();
    const code = await inviteGiftWriter(mom.userId, box, "grandfather");
    await joinGiftBox(stranger.userId, code.toLowerCase().replace(/-/g, " "));
    const other = await makeUser("Y");
    await expect(joinGiftBox(other.userId, code)).rejects.toThrow(/invalid_code/);
    await expect(joinGiftBox(other.userId, newCode())).rejects.toThrow(/invalid_code/);
    await expect(inviteGiftWriter(mom.userId, box, "uncle")).rejects.toThrow();
  });

  it("allows at most six writers and four grandparents", async () => {
    const { mom, box } = await family();
    for (const r of ["grandfather", "grandmother", "grandparent"] as const) await joinGiftBox((await makeUser()).userId, await inviteGiftWriter(mom.userId, box, r));
    await expect(joinGiftBox((await makeUser()).userId, await inviteGiftWriter(mom.userId, box, "grandparent"))).rejects.toThrow(/too_many_writers/);
  });

  it("removing a writer: the owner keeps or deletes what they wrote", async () => {
    const { mom, dad, grandma, box } = await family();
    await saveGiftEntry(dad.userId, box, { kind: "growth", body: "パパの記録" });
    await saveGiftEntry(grandma.userId, box, { kind: "growth", body: "ばあばの記録" });
    await expect(removeGiftWriter(dad.userId, box, grandma.userId, true)).rejects.toThrow();
    await expect(removeGiftWriter(mom.userId, box, mom.userId, true)).rejects.toThrow(/cannot_remove_owner/);
    await removeGiftWriter(mom.userId, box, dad.userId, true);
    await removeGiftWriter(mom.userId, box, grandma.userId, false);
    const b = await readGiftBox(mom.userId, box);
    expect(b.entries.map((e) => e.body)).toEqual(["パパの記録"]);
    expect(b.writers.find((w) => w.label === "パパ")).toMatchObject({ removed: true });
    await expect(readGiftBox(dad.userId, box)).rejects.toThrow();
    await expect(saveGiftEntry(dad.userId, box, { kind: "growth", body: "x" })).rejects.toThrow();
  });

  it("cannot be handed over before its date", async () => {
    const { mom, box } = await family();
    await expect(issueReceiveCode(mom.userId, box)).rejects.toThrow(/not_yet/);
    await expect(deliverAsBook(mom.userId, box)).rejects.toThrow(/not_yet/);
  });

  it("the child receives everything with a code; then it is closed, and each writer keeps their own copy", async () => {
    const { mom, dad, grandma, box } = await family(PAST);
    await saveGiftEntry(mom.userId, box, { kind: "growth", title: "初めて歩いた", body: "3歩。" });
    await saveGiftEntry(mom.userId, box, { kind: "letter", body: "ママの手紙" });
    await saveGiftEntry(dad.userId, box, { kind: "letter", body: "パパの手紙" });
    await saveGiftView(grandma.userId, box, { answers: { giving: 1 } });
    await expect(issueReceiveCode(dad.userId, box)).rejects.toThrow();
    const code = await issueReceiveCode(mom.userId, box);
    await expect(receiveGift(dad.userId, code)).rejects.toThrow(/invalid_code/);
    const child = await makeUser("Hana");
    expect(await receiveGift(child.userId, code)).toBe(box);
    await expect(receiveGift((await makeUser()).userId, code)).rejects.toThrow(/invalid_code/);

    const asChild = await readGiftBox(child.userId, box);
    expect(asChild).toMatchObject({ my_role: "child", status: "delivered", delivered_via: "account", hidden_letters: 0 });
    expect(asChild.entries.map((e) => e.body).sort()).toEqual(["3歩。", "パパの手紙", "ママの手紙"]);
    expect(asChild.views).toHaveLength(1);
    expect((await myGiftBoxes(child.userId))[0]).toMatchObject({ my_role: "child" });

    await expect(saveGiftEntry(mom.userId, box, { kind: "growth", body: "late" })).rejects.toThrow(/gift_delivered/);
    await expect(updateGiftBox(mom.userId, box, { childName: "H", deliverOn: FUTURE })).rejects.toThrow(/gift_delivered/);
    const momCopy = await readGiftBox(mom.userId, box);
    expect(momCopy.entries.map((e) => e.body).sort()).toEqual(["3歩。", "ママの手紙"]);
  });

  it("a new date cancels a code issued for the old one", async () => {
    const { mom, box } = await family(PAST);
    const code = await issueReceiveCode(mom.userId, box);
    await updateGiftBox(mom.userId, box, { childName: "Hana", deliverOn: "2021-01-01" });
    await expect(receiveGift((await makeUser()).userId, code)).rejects.toThrow(/invalid_code/);
    expect(codeHash(code)).toBe(codeHash(` ${code.toLowerCase()} `));
  });

  it("handed over as a book: closed, and the owner can read it all to print it", async () => {
    const { mom, dad, box } = await family(PAST);
    await saveGiftEntry(dad.userId, box, { kind: "letter", body: "パパの手紙" });
    await deliverAsBook(mom.userId, box);
    const b = await readGiftBox(mom.userId, box);
    expect(b).toMatchObject({ status: "delivered", delivered_via: "pdf", hidden_letters: 0 });
    expect(b.entries.map((e) => e.body)).toEqual(["パパの手紙"]);
    // Each writer keeps their own copy.
    expect((await readGiftBox(dad.userId, box)).entries.map((e) => e.body)).toEqual(["パパの手紙"]);
    await expect(issueReceiveCode(mom.userId, box)).rejects.toThrow(/gift_delivered/);
  });

  it("validates its input", async () => {
    const u = await makeUser();
    await expect(createGiftBox(u.userId, { childName: "", deliverOn: FUTURE, role: "mother" })).rejects.toThrow();
    await expect(createGiftBox(u.userId, { childName: "A", deliverOn: "soon", role: "mother" })).rejects.toThrow();
    await expect(createGiftBox(u.userId, { childName: "A", deliverOn: FUTURE, role: "aunt" })).rejects.toThrow();
    const box = await createGiftBox(u.userId, { childName: "A", deliverOn: FUTURE, role: "parent" });
    await expect(saveGiftView(u.userId, box, { answers: { nope: 1 } })).rejects.toThrow();
    await expect(saveGiftEntry(u.userId, box, { kind: "diary", body: "x" })).rejects.toThrow();
  });

  it("becomes part of the child's own manual story and export", async () => {
    const { mom, box } = await family(PAST);
    await saveGiftEntry(mom.userId, box, { kind: "growth", occurredOn: "2019-06-01", title: "初めて歩いた", body: "リビングで3歩。" });
    await saveGiftEntry(mom.userId, box, { kind: "letter", body: "ないしょの手紙" });
    const child = await makeUser("Hana");
    await receiveGift(child.userId, await issueReceiveCode(mom.userId, box));
    const m = await buildManual(child.userId, "ja");
    const novel = JSON.stringify(m.sections.at(-1));
    expect(novel).toContain("2019年6月。ママは、こう書き残している。「初めて歩いた — リビングで3歩。」");
    expect(novel).toContain("第1話　夢を見ていた頃");
    expect(novel).not.toContain("ないしょの手紙");
    const doc = JSON.parse((await buildExport(child.userId)).json);
    expect(doc.giftBoxes).toHaveLength(1);
    expect(JSON.stringify(doc.giftBoxes)).toContain("ないしょの手紙");
  });
});

