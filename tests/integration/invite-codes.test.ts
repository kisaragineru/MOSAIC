import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterEach, describe, expect, it } from "vitest";
import { register, signInWithIdentity } from "@/server/services/account";
import { INVITE_CODES_OPEN_MAX, makeInviteCode, myInviteCodes, normalizeInviteCode, revokeInviteCode } from "@/server/services/invite-codes";
import { makeUser } from "../helpers/factory";
import { TEST_MIGRATION_DATABASE_URL } from "../helpers/test-env";

// Sign-up by invitation from here on (the people in the test are made before it).
const gate = () => {
  process.env.REGISTRATION_CODE = "shared-code-xyz";
};
const input = (inviteCode?: string) => ({ email: `inv-${randomUUID()}@example.test`, password: "correct horse battery", displayName: "Invitee", locale: "ja", inviteCode });

describe("invite codes anyone can make", () => {
  afterEach(() => {
    delete process.env.REGISTRATION_CODE;
  });

  it("let one person sign up, typed loosely; the maker sees it used", async () => {
    const hana = await makeUser("Hana");
    gate();
    const c = await makeInviteCode(hana.userId, "姉");
    expect(c.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(normalizeInviteCode(` ${c.code.toLowerCase().replace("-", " ")} `)).toBe(c.code);
    await expect(register(input(c.code.toLowerCase().replace("-", "")), `ip-${randomUUID()}`)).resolves.toHaveProperty("token");
    // Used: nobody else gets in with it.
    await expect(register(input(c.code), `ip-${randomUUID()}`)).rejects.toMatchObject({ code: "invite_required" });
    const mine = await myInviteCodes(hana.userId);
    expect(mine.find((x) => x.id === c.id)).toMatchObject({ state: "used", label: "姉" });
  });

  it("works with Google too, and not once taken back or past its date", async () => {
    const hana = await makeUser("Hana");
    gate();
    const c = await makeInviteCode(hana.userId);
    const google = () => ({ provider: "google" as const, subject: randomUUID(), email: `g-${randomUUID()}@example.test`, emailVerified: true, name: "G" });
    await expect(signInWithIdentity(google(), { inviteCode: c.code, locale: "ja" as const, clientKey: `ip-${randomUUID()}` })).resolves.toMatchObject({ created: true });

    const back = await makeInviteCode(hana.userId);
    await revokeInviteCode(hana.userId, back.id);
    await expect(register(input(back.code), `ip-${randomUUID()}`)).rejects.toMatchObject({ code: "invite_required" });

    const old = await makeInviteCode(hana.userId);
    const pool = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
    await pool.query("update invite_codes set expires_at = now() - interval '1 minute' where id = $1", [old.id]);
    await pool.end();
    await expect(register(input(old.code), `ip-${randomUUID()}`)).rejects.toMatchObject({ code: "invite_required" });
    expect((await myInviteCodes(hana.userId)).map((x) => x.state).sort()).toEqual(["expired", "revoked", "used"]);
  });

  it("belong to their maker, and are limited while unused", async () => {
    const hana = await makeUser("Hana");
    const sora = await makeUser("Sora");
    gate();
    const c = await makeInviteCode(hana.userId);
    expect(await myInviteCodes(sora.userId)).toEqual([]);
    await revokeInviteCode(sora.userId, c.id);
    expect((await myInviteCodes(hana.userId))[0]!.state).toBe("open");
    for (let i = 1; i < INVITE_CODES_OPEN_MAX; i++) await makeInviteCode(hana.userId);
    await expect(makeInviteCode(hana.userId)).rejects.toMatchObject({ code: "invite_codes_full" });
  });
});
