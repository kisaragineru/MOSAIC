import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { register } from "@/server/services/account";
import { saveBirthProfile } from "@/server/services/tuvi";
import { createShare, revokeShare } from "@/server/services/sharing";
import { handOver, makeWork, revokeLink } from "@/server/services/works";
import { createGiftBox, deliverAsBook, inviteGiftWriter, issueReceiveCode, joinGiftBox, linkCode, peekGiftLink, receiveGift, receivePath } from "@/server/services/gift-boxes";
import { makeUser } from "../helpers/factory";

const env = { ...process.env };
afterEach(() => {
  if (env.REGISTRATION_CODE === undefined) delete process.env.REGISTRATION_CODE;
  else process.env.REGISTRATION_CODE = env.REGISTRATION_CODE;
});

const signUp = (extra: { inviteCode?: string; invite?: string }) =>
  register({ email: `n-${randomUUID()}@example.test`, password: "correct horse battery staple", displayName: "New", locale: "ja", ...extra }, `ip-${randomUUID()}`);

describe("sign-up while invite-only", () => {
  it("a story or share link someone was given stands in for the code; closed or made-up links don't", async () => {
    const hana = await makeUser("Hana");
    await saveBirthProfile(hana.userId, { calendarInput: "solar", solarDate: "1990-06-07", timeKnown: true, birthTime: "06:30", timeZone: "Asia/Ho_Chi_Minh", sex: "female" });
    const workId = await makeWork(hana.userId, "ja", { title: "ハナの物語", answerIds: [] });
    const story = await handOver(hana.userId, workId, { recipient: "母", days: 14 });
    const share = await createShare(hana.userId);
    process.env.REGISTRATION_CODE = "secret-code";

    await expect(signUp({})).rejects.toMatchObject({ code: "invite_required" });
    await expect(signUp({ inviteCode: "wrong" })).rejects.toMatchObject({ code: "invite_required" });
    await expect(signUp({ inviteCode: "secret-code" })).resolves.toHaveProperty("userId");
    await expect(signUp({ invite: `work:${story.token}` })).resolves.toHaveProperty("userId");
    await expect(signUp({ invite: `share:${share.token}` })).resolves.toHaveProperty("userId");

    // Made up, or of the wrong kind: refused.
    await expect(signUp({ invite: "work:AAAAAAAAAAAAAAAAAAAAAAAA" })).rejects.toMatchObject({ code: "invite_required" });
    await expect(signUp({ invite: `share:${story.token}` })).rejects.toMatchObject({ code: "invite_required" });
    await expect(signUp({ invite: "gift:anything-at-all-123456" })).rejects.toMatchObject({ code: "invite_required" });
    // Closed links no longer invite.
    await revokeLink(hana.userId, story.id);
    await revokeShare(hana.userId, share.id);
    await expect(signUp({ invite: `work:${story.token}` })).rejects.toMatchObject({ code: "invite_required" });
    await expect(signUp({ invite: `share:${share.token}` })).rejects.toMatchObject({ code: "invite_required" });
  });

  it("a gift box's receive link: its cover while it can be received, an invitation, then closed once received", async () => {
    const mom = await makeUser("Mai");
    const dad = await makeUser("Duc");
    const box = await createGiftBox(mom.userId, { childName: "ハナ", childBirthday: "2008-05-05", deliverOn: "2020-04-01", role: "mother", label: "ママ" });
    await joinGiftBox(dad.userId, await inviteGiftWriter(mom.userId, box, "father"));
    process.env.REGISTRATION_CODE = "secret-code";
    await expect(signUp({ invite: "gift:ABCDEFGHJKLM" })).rejects.toMatchObject({ code: "invite_required" });

    const code = await issueReceiveCode(mom.userId, box);
    const c = linkCode(code)!;
    expect(receivePath(code)).toBe(`/g/${c}`);
    expect(linkCode(code.toLowerCase())).toBe(c);
    expect(linkCode("IIII-OOOO-1111")).toBeNull();
    // The cover only: whom it's for and who it's from (dad's label unset: his role).
    expect(await peekGiftLink(c)).toEqual({ childName: "ハナ", writers: [{ label: "ママ", role: "mother" }, { label: null, role: "father" }] });
    expect(await peekGiftLink("ABCDEFGHJKLM")).toBeNull();
    const child = await signUp({ invite: `gift:${c}` });
    expect(await receiveGift(child.userId, c)).toBe(box);
    // Used: no cover, no invitation.
    expect(await peekGiftLink(c)).toBeNull();
    await expect(signUp({ invite: `gift:${c}` })).rejects.toMatchObject({ code: "invite_required" });
  });

  it("a book's later receive link works the same", async () => {
    const mom = await makeUser("Mai");
    const box = await createGiftBox(mom.userId, { childName: "ソラ", childBirthday: "2008-05-05", deliverOn: "2020-04-01", role: "mother" });
    await deliverAsBook(mom.userId, box);
    const c = linkCode(await issueReceiveCode(mom.userId, box))!;
    expect(await peekGiftLink(c)).toMatchObject({ childName: "ソラ" });
    process.env.REGISTRATION_CODE = "secret-code";
    await expect(signUp({ invite: `gift:${c}` })).resolves.toHaveProperty("userId");
  });

  it("no code set: anyone may sign up", async () => {
    delete process.env.REGISTRATION_CODE;
    await expect(signUp({})).resolves.toHaveProperty("userId");
  });
});
