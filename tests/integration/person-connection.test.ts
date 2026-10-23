import { describe, expect, it } from "vitest";
import { createPerson, getPerson, listPeople } from "@/server/services/people";
import {
  addPersonFromConnection,
  createShare,
  getComparison,
  linkPersonToConnection,
  listComparisons,
  openComparison,
  revokeComparison,
  sharedPreview,
  unlinkPerson,
} from "@/server/services/sharing";
import { answerQuestion } from "@/server/services/discovery";
import { makeUser } from "../helpers/factory";

async function connected() {
  const a = await makeUser("An");
  const b = await makeUser("Bình");
  const s = await createShare(a.userId);
  const sessionId = await openComparison(b.userId, s.token);
  return { a, b, sessionId };
}

describe("linking people to QR connections", () => {
  it("adds the other participant once, under their display name, and links it", async () => {
    const { a, sessionId } = await connected();
    const id = await addPersonFromConnection(a.userId, sessionId);
    expect(await addPersonFromConnection(a.userId, sessionId)).toBe(id);
    const { person } = await getPerson(a.userId, id);
    expect(person.nickname).toBe("Bình");
    expect(person.connectionSessionId).toBe(sessionId);
    expect((await listComparisons(a.userId))[0]!.personId).toBe(id);
  });

  it("moves the link when another entry is linked to the same connection, and unlinks", async () => {
    const { a, sessionId } = await connected();
    const first = await addPersonFromConnection(a.userId, sessionId);
    const second = await createPerson(a.userId, { nickname: "Bình (work)" });
    await linkPersonToConnection(a.userId, second, sessionId);
    const people = await listPeople(a.userId);
    expect(people.find((p) => p.id === first)!.connectionSessionId).toBeNull();
    expect(people.find((p) => p.id === second)!.connectionSessionId).toBe(sessionId);
    await unlinkPerson(a.userId, second);
    expect((await listComparisons(a.userId))[0]!.personId).toBeNull();
  });

  it("refuses connections the user is not part of, and ended connections", async () => {
    const { a, sessionId } = await connected();
    const outsider = await makeUser("Out");
    const mine = await createPerson(outsider.userId, { nickname: "x" });
    await expect(linkPersonToConnection(outsider.userId, mine, sessionId)).rejects.toMatchObject({ code: "not_found" });
    await expect(addPersonFromConnection(outsider.userId, sessionId)).rejects.toMatchObject({ code: "not_found" });
    const p = await createPerson(a.userId, { nickname: "y" });
    await revokeComparison(a.userId, sessionId);
    await expect(linkPersonToConnection(a.userId, p, sessionId)).rejects.toMatchObject({ code: "connection_ended" });
  });

  it("never exposes the link or the person's notes to the other participant", async () => {
    const { a, b, sessionId } = await connected();
    await addPersonFromConnection(a.userId, sessionId);
    expect((await listComparisons(b.userId))[0]!.personId).toBeNull();
    const view = await getComparison(b.userId, sessionId);
    expect(JSON.stringify(view)).not.toContain("Bình (");
  });
});

describe("shared preview", () => {
  it("lists only answers marked comparable", async () => {
    const a = await makeUser("An");
    await answerQuestion(a.userId, { questionId: "f.drink", questionVersion: 1, answer: { choice: "tea" }, privacy: "comparable" });
    await answerQuestion(a.userId, { questionId: "f.spicy", questionVersion: 1, answer: { scale: 5 }, privacy: "private" });
    const p = await sharedPreview(a.userId);
    expect(p.displayName).toBe("An");
    expect(p.answers.map((x) => x.questionId)).toEqual(["f.drink"]);
    expect(p.tuvi).toBeNull();
  });
});
