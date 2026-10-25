import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { profiles, userIdentities } from "@/server/db/schema";
import { withUser } from "@/server/db/tx";
import { login, resolveSession, signInWithIdentity } from "@/server/services/account";
import { makeUser } from "../helpers/factory";

const opts = () => ({ locale: "ja" as const, clientKey: `ip-${randomUUID()}` });
const google = (over: Partial<Parameters<typeof signInWithIdentity>[0]> = {}) => ({
  provider: "google" as const,
  subject: `g-${randomUUID()}`,
  email: `g-${randomUUID()}@example.test`,
  emailVerified: true,
  name: "Hana Google",
  ...over,
});

describe("sign-in with Google or Facebook", () => {
  it("creates an account the first time and signs the same person in after", async () => {
    const p = google();
    const first = await signInWithIdentity(p, opts());
    expect(first.created).toBe(true);
    expect(await resolveSession(first.session.token)).toBe(first.session.userId);
    const [prof] = await withUser(first.session.userId, (tx) => tx.select().from(profiles).where(eq(profiles.userId, first.session.userId)));
    expect(prof).toMatchObject({ displayName: "Hana Google", locale: "ja" });
    // Only the owner sees the link.
    const links = await withUser(first.session.userId, (tx) => tx.select().from(userIdentities));
    expect(links).toMatchObject([{ provider: "google", subject: p.subject }]);
    const other = await makeUser();
    expect(await withUser(other.userId, (tx) => tx.select().from(userIdentities))).toEqual([]);

    const again = await signInWithIdentity({ ...p, name: "Renamed" }, opts());
    expect(again).toMatchObject({ created: false, session: { userId: first.session.userId } });
    // The new account has no password anyone knows.
    await expect(login({ email: p.email, password: "correct horse battery staple" }, null)).rejects.toMatchObject({ code: "invalid_credentials" });
  });

  it("joins an existing account only when the provider vouches for the email (Google), never for Facebook", async () => {
    const u = await makeUser("Sora");
    const linked = await signInWithIdentity(google({ email: u.email.toUpperCase() }), opts());
    expect(linked).toMatchObject({ created: false, session: { userId: u.userId } });

    const v = await makeUser("Minh");
    await expect(signInWithIdentity(google({ email: v.email, emailVerified: false }), opts())).rejects.toMatchObject({ code: "oauth_email_in_use" });
    await expect(signInWithIdentity({ provider: "facebook", subject: `f-${randomUUID()}`, email: v.email, emailVerified: false, name: "Minh" }, opts())).rejects.toMatchObject({ code: "oauth_email_in_use" });
  });

  it("works without an email from the provider, and asks for the invite code like email sign-up", async () => {
    const fb = await signInWithIdentity({ provider: "facebook", subject: `f-${randomUUID()}`, email: null, emailVerified: false, name: null }, opts());
    expect(fb.created).toBe(true);

    process.env.REGISTRATION_CODE = "open-sesame";
    try {
      await expect(signInWithIdentity(google(), opts())).rejects.toMatchObject({ code: "invite_required" });
      expect((await signInWithIdentity(google(), { ...opts(), inviteCode: "open-sesame" })).created).toBe(true);
      // Someone who already has an account signs in without a code.
      const p = google();
      delete process.env.REGISTRATION_CODE;
      await signInWithIdentity(p, opts());
      process.env.REGISTRATION_CODE = "open-sesame";
      expect((await signInWithIdentity(p, opts())).created).toBe(false);
    } finally {
      delete process.env.REGISTRATION_CODE;
    }
  });
});
