import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { register, registrationCodeRequired } from "@/server/services/account";

const input = (inviteCode?: string) => ({
  email: `invite-${randomUUID()}@example.test`,
  password: "correct horse battery",
  displayName: "Invitee",
  locale: "ja",
  inviteCode,
});

describe("REGISTRATION_CODE gate", () => {
  afterEach(() => {
    delete process.env.REGISTRATION_CODE;
  });

  it("is open when the variable is unset", async () => {
    expect(registrationCodeRequired()).toBe(false);
    await expect(register(input(), `ip-${randomUUID()}`)).resolves.toHaveProperty("token");
  });

  it("rejects a missing or wrong code and accepts the right one", async () => {
    process.env.REGISTRATION_CODE = "test-invite-123";
    expect(registrationCodeRequired()).toBe(true);
    await expect(register(input(), `ip-${randomUUID()}`)).rejects.toMatchObject({ code: "invite_required" });
    await expect(register(input("wrong"), `ip-${randomUUID()}`)).rejects.toMatchObject({ code: "invite_required" });
    await expect(register(input(" test-invite-123 "), `ip-${randomUUID()}`)).resolves.toHaveProperty("token");
  });
});
