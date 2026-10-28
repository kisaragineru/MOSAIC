import { describe, expect, it } from "vitest";
import {
  codeHash, connectGiftWriter, createGiftBox, deleteGiftEntry, deliverAsBook, giftMedia, inviteGiftWriter, issueReceiveCode, joinGiftBox, myGiftBoxes,
  newCode, readGiftBox, receiveGift, removeGiftWriter, saveGiftEntry, saveGiftView, updateGiftBox, writersForChild,
} from "@/server/services/gift-boxes";
import { listPeople } from "@/server/services/people";
import { activeConnectionsWith, getComparison, revokeComparison } from "@/server/services/sharing";
import { buildExport } from "@/server/services/export";
import { buildManual } from "@/server/services/manual";
import { deleteAccount } from "@/server/services/account";
import { listMemories } from "@/server/services/memories";
import { mediaFor, mediaThumb, startUpload } from "@/server/services/media";
import { readFileSync } from "node:fs";
import { makeUser } from "../helpers/factory";

const JPEG = new Uint8Array(readFileSync("tests/e2e/fixtures-photo.jpg"));
const photo = async (u: string) => (await startUpload(u, { kind: "image", width: 40, height: 30, size: JPEG.length }, JPEG, JPEG)).id;

const FUTURE = "2040-04-01";
const PAST = "2020-04-01";

// Old enough to receive with an account (13, as the terms of use say).
const TEEN = "2008-05-05";

async function family(deliverOn = FUTURE, childBirthday = "2018-05-05") {
  const mom = await makeUser("Mai");
  const dad = await makeUser("Duc");
  const grandma = await makeUser("Ba");
  const box = await createGiftBox(mom.userId, { childName: "Hana", childBirthday, deliverOn, role: "mother", label: "ママ" });
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
    const { mom, dad, grandma, box } = await family(PAST, TEEN);
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
    const { mom, box } = await family(PAST, TEEN);
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
    // It may reach the child's account later, but only from 13 (see below).
    await expect(issueReceiveCode(mom.userId, box)).rejects.toThrow(/gift_too_young/);
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
    const { mom, box } = await family(PAST, TEEN);
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

  it("growth records take photos like records do (or photos alone), seen only by those who may read the record", async () => {
    const { mom, dad, box } = await family();
    const stranger = await makeUser("X");
    const a = await photo(mom.userId);
    const e = await saveGiftEntry(mom.userId, box, { kind: "growth", occurredOn: "2019-06-01", body: "", media: [a] });
    expect((await giftMedia(dad.userId, box)).get(e)?.map((m) => m.id)).toEqual([a]);
    expect(await mediaThumb(dad.userId, a)).not.toBeNull();
    expect(await mediaThumb(stranger.userId, a)).toBeNull();
    // Not on a letter, not someone else's upload, and not nothing at all.
    await expect(saveGiftEntry(mom.userId, box, { kind: "letter", body: "x", media: [await photo(mom.userId)] })).rejects.toThrow(/invalid_media/);
    await expect(saveGiftEntry(dad.userId, box, { kind: "growth", body: "", media: [await photo(mom.userId)] })).rejects.toThrow(/invalid_media/);
    await expect(saveGiftEntry(mom.userId, box, { kind: "growth", body: "" })).rejects.toThrow(/empty_record/);
    // Editing keeps the list it is given.
    await saveGiftEntry(mom.userId, box, { kind: "growth", body: "words now", media: [] }, e);
    expect((await giftMedia(mom.userId, box)).get(e)).toBeUndefined();
  });

  it("a writer who leaves MOSAIC: their words stay under the name they wrote as, and their box passes on", async () => {
    const { mom, dad, box } = await family();
    await saveGiftEntry(mom.userId, box, { kind: "growth", body: "ママの記録", media: [await photo(mom.userId)] });
    await saveGiftView(mom.userId, box, { answers: { giving: 1 } });
    await deleteAccount(mom.userId, { password: mom.password, confirm: "DELETE" });
    const b = await readGiftBox(dad.userId, box);
    expect(b.my_role).toBe("owner");
    const e = b.entries.find((x) => x.body === "ママの記録")!;
    expect(e).toMatchObject({ author_id: null, author_label: "ママ", author_role: "mother" });
    expect((await giftMedia(dad.userId, box)).get(e.id)).toHaveLength(1);
    // The last writer leaving takes the box with them.
    const solo = await makeUser("Solo");
    const lone = await createGiftBox(solo.userId, { childName: "K", deliverOn: FUTURE, role: "parent" });
    await deleteAccount(solo.userId, { password: solo.password, confirm: "DELETE" });
    await expect(readGiftBox(dad.userId, lone)).rejects.toThrow();
  });

  it("received with an account from 13 only (when the birthday is known)", async () => {
    const { mom, box } = await family(PAST);
    await expect(issueReceiveCode(mom.userId, box)).rejects.toThrow(/gift_too_young/);
    await deliverAsBook(mom.userId, box);
  });

  it("on receiving, its growth records and letters become the child's own records: private, dated, with photos and who wrote them", async () => {
    const { mom, dad, box } = await family(PAST, TEEN);
    const a = await photo(mom.userId);
    await saveGiftEntry(mom.userId, box, { kind: "growth", occurredOn: "2010-06-01", title: "初めて歩いた", body: "3歩。", media: [a] });
    await saveGiftEntry(dad.userId, box, { kind: "letter", body: "パパの手紙" });
    const child = await makeUser("Hana");
    await receiveGift(child.userId, await issueReceiveCode(mom.userId, box));
    const mine = await listMemories(child.userId);
    expect(mine).toHaveLength(2);
    const walk = mine.find((m) => m.title === "初めて歩いた")!;
    expect(walk).toMatchObject({ occurredOn: "2010-06-01", visibility: "private", body: "3歩。", fromGift: { label: "ママ", role: "mother", kind: "growth" } });
    expect(mine.find((m) => m.body === "パパの手紙")).toMatchObject({ visibility: "private", fromGift: { label: "パパ", kind: "letter" } });
    // The photo is the child's own copy.
    const media = (await mediaFor(child.userId, [walk.id])).get(walk.id)!;
    expect(media).toHaveLength(1);
    expect(media[0]!.id).not.toBe(a);
    expect(await mediaThumb(mom.userId, media[0]!.id)).toBeNull();
  });

  it("on receiving, the child connects with each writer in one tap: family in People, nothing shown yet; an ended connection is not brought back", async () => {
    const { mom, dad, grandma, box } = await family(PAST, TEEN);
    const child = await makeUser("Hana");
    // Not the child's yet: nobody else may list or connect.
    await expect(writersForChild(child.userId, box)).rejects.toThrow();
    await receiveGift(child.userId, await issueReceiveCode(mom.userId, box));
    await expect(writersForChild(dad.userId, box)).rejects.toThrow();
    await expect(connectGiftWriter(dad.userId, box, mom.userId)).rejects.toThrow();

    const before = await writersForChild(child.userId, box);
    expect(before.map((w) => [w.name, w.role, w.offer, w.sessionId])).toEqual([["ママ", "mother", true, null], ["パパ", "father", true, null], ["おばあちゃん", "grandmother", true, null]]);

    const personId = await connectGiftWriter(child.userId, box, mom.userId);
    expect(await connectGiftWriter(child.userId, box, mom.userId)).toBe(personId); // twice: the same person
    const sid = (await activeConnectionsWith(child.userId, [mom.userId])).get(mom.userId)!;
    expect(sid).toBeTruthy();
    expect((await activeConnectionsWith(mom.userId, [child.userId])).get(child.userId)).toBe(sid);
    expect((await listPeople(child.userId)).find((p) => p.id === personId)).toMatchObject({ nickname: "ママ", relationship: "family" });
    const view = await getComparison(child.userId, sid);
    expect(view).toMatchObject({ status: "active", myConsent: { scopes: [] }, otherConsented: true });
    expect((await writersForChild(child.userId, box))[0]).toMatchObject({ sessionId: sid, personId, offer: false });

    // Someone outside the box can't be reached through it.
    await expect(connectGiftWriter(child.userId, box, (await makeUser()).userId)).rejects.toThrow();
    // A connection that was ended is not offered again, and can't be restarted from the box.
    await connectGiftWriter(child.userId, box, dad.userId);
    await revokeComparison(dad.userId, (await activeConnectionsWith(dad.userId, [child.userId])).get(child.userId)!);
    expect((await writersForChild(child.userId, box)).find((w) => w.role === "father")).toMatchObject({ offer: false, sessionId: null });
    await expect(connectGiftWriter(child.userId, box, dad.userId)).rejects.toThrow(/connection_ended/);
    expect((await writersForChild(child.userId, box)).find((w) => w.role === "grandmother")).toMatchObject({ offer: true });
    expect((await listPeople(grandma.userId)).length).toBe(0);
  });

  it("handed over as a book first, it can reach the child's account later (from 13): records copied, the owner still reads it all", async () => {
    const { mom, dad, box } = await family(PAST, TEEN);
    await saveGiftEntry(mom.userId, box, { kind: "growth", occurredOn: "2010-06-01", body: "3歩。" });
    await saveGiftEntry(dad.userId, box, { kind: "letter", body: "パパの手紙" });
    await deliverAsBook(mom.userId, box);
    expect(await readGiftBox(mom.userId, box)).toMatchObject({ status: "delivered", delivered_via: "pdf", received: false, hidden_letters: 0 });
    // Only the owner issues the code; writing stays closed.
    await expect(issueReceiveCode(dad.userId, box)).rejects.toThrow();
    await expect(saveGiftEntry(mom.userId, box, { kind: "growth", body: "もう一つ" })).rejects.toThrow(/gift_delivered/);

    const child = await makeUser("Hana");
    expect(await receiveGift(child.userId, await issueReceiveCode(mom.userId, box))).toBe(box);
    expect(await readGiftBox(child.userId, box)).toMatchObject({ my_role: "child", status: "delivered", delivered_via: "pdf", received: true });
    expect((await listMemories(child.userId)).map((m) => m.body).sort()).toEqual(["3歩。", "パパの手紙"]);
    expect((await writersForChild(child.userId, box)).map((w) => w.name)).toEqual(["ママ", "パパ", "おばあちゃん"]);
    // The owner keeps the whole book; it can't be handed to a second account.
    const asMom = await readGiftBox(mom.userId, box);
    expect(asMom).toMatchObject({ my_role: "owner", received: true, hidden_letters: 0 });
    expect(asMom.entries.map((e) => e.body).sort()).toEqual(["3歩。", "パパの手紙"]);
    await expect(issueReceiveCode(mom.userId, box)).rejects.toThrow(/gift_delivered/);
  });

  it("a book handed over before 13 waits for the birthday; a box received in an account gets no second code", async () => {
    const young = await family(PAST);
    await deliverAsBook(young.mom.userId, young.box);
    await expect(issueReceiveCode(young.mom.userId, young.box)).rejects.toThrow(/gift_too_young/);

    const { mom, box } = await family(PAST, TEEN);
    await receiveGift((await makeUser()).userId, await issueReceiveCode(mom.userId, box));
    await expect(issueReceiveCode(mom.userId, box)).rejects.toThrow(/gift_delivered/);
  });
});
