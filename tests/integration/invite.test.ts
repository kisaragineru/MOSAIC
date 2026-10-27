import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { register } from "@/server/services/account";
import { saveBirthProfile } from "@/server/services/tuvi";
import { createShare, revokeShare } from "@/server/services/sharing";
import { handOver, makeWork, revokeLink } from "@/server/services/works";
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

  it("no code set: anyone may sign up", async () => {
    delete process.env.REGISTRATION_CODE;
    await expect(signUp({})).resolves.toHaveProperty("userId");
  });
});
