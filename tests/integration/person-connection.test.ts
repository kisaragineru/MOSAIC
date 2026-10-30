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
import { Pool } from "pg";
import { answerQuestion } from "@/server/services/discovery";
import { getAccount, updateProfile } from "@/server/services/account";
import { giveConsent } from "@/server/services/sharing";
import { TEST_MIGRATION_DATABASE_URL } from "../helpers/test-env";
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
    // Every comparable answer is listed for switching, with its current setting.
    expect(p.choices.map((x) => [x.questionId, x.shared])).toEqual([["f.drink", true], ["f.spicy", false]]);
    expect(p.tuvi).toBeNull();
  });
});

describe("bio between connected people", () => {
  async function setBio(userId: string, bio: string) {
    const acc = await getAccount(userId);
    await updateProfile(userId, { displayName: acc.profile.displayName, bio, locale: acc.profile.locale, timeZone: acc.profile.timeZone });
  }

  it("is hidden on a fresh connection and shown once its writer agrees, until the connection ends", async () => {
    const { a, b, sessionId } = await connected();
    await setBio(a.userId, "BIO-OF-AN");
    expect((await getComparison(b.userId, sessionId)).otherBio).toBeNull();
    await giveConsent(b.userId, sessionId, { scopes: ["preferences"], agree: true });
    // B agreeing does not reveal A's bio: only A's own consent does.
    expect((await getComparison(b.userId, sessionId)).otherBio).toBeNull();
    await giveConsent(a.userId, sessionId, { scopes: ["preferences"], agree: true });
    expect((await getComparison(b.userId, sessionId)).otherBio).toBe("BIO-OF-AN");
    expect((await getComparison(a.userId, sessionId)).otherBio).toBeNull(); // B wrote none
    await revokeComparison(a.userId, sessionId);
    expect((await getComparison(b.userId, sessionId)).otherBio).toBeNull();
  });

  it("ignores consents given before the consent text mentioned the bio", async () => {
    const { a, b, sessionId } = await connected();
    await setBio(a.userId, "BIO-OF-AN");
    await giveConsent(a.userId, sessionId, { scopes: ["preferences"], agree: true });
    const pool = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
    try {
      await pool.query("update comparison_consents set consent_text_version = 'consent-2026-10' where session_id = $1", [sessionId]);
      // An account from before the calling card (not decided): the old consent rule still applies.
      await pool.query("update profiles set card_items = null where user_id = $1", [a.userId]);
    } finally {
      await pool.end();
    }
    expect((await getComparison(b.userId, sessionId)).otherBio).toBeNull();
  });
  it("connecting again brings each side back to their own card, never a second one", async () => {
    const { a, b, sessionId } = await connected();
    const aCard = await addPersonFromConnection(a.userId, sessionId, "friend");
    const bCard = await addPersonFromConnection(b.userId, sessionId, "family");
    const other = await makeUser("X");
    const xs = await createShare(other.userId);
    const unrelated = await openComparison(a.userId, xs.token);
    const xCard = await addPersonFromConnection(a.userId, unrelated, "friend");
    await revokeComparison(a.userId, sessionId);
    expect((await getPerson(a.userId, aCard)).person.connectionSessionId).toBe(sessionId); // kept as my notes

    for (let round = 0; round < 2; round++) {
      const again = await openComparison(b.userId, (await createShare(a.userId)).token);
      expect(again).not.toBe(sessionId);
      expect((await getPerson(a.userId, aCard)).person.connectionSessionId).toBe(again);
      expect((await getPerson(b.userId, bCard)).person.connectionSessionId).toBe(again);
      expect((await listPeople(a.userId)).length).toBe(2);
      expect((await listPeople(b.userId)).length).toBe(1);
      // Someone else's card is left alone.
      expect((await getPerson(a.userId, xCard)).person.connectionSessionId).toBe(unrelated);
      await revokeComparison(b.userId, again);
    }
  });
});
