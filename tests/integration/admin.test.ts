import { afterEach, describe, expect, it } from "vitest";
import { adminStats, devToolsFor, isAdmin } from "@/server/services/admin";
import { makeUser } from "../helpers/factory";

const env = { ...process.env };
afterEach(() => {
  for (const k of ["ADMIN_EMAILS", "DEV_TOOLS"] as const) {
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
});

describe("admins: named by email; numbers only; the development tools are theirs", () => {
  it("only an admin gets the numbers", async () => {
    const boss = await makeUser("Boss");
    const someone = await makeUser("Someone");
    process.env.ADMIN_EMAILS = ` Other@example.test , ${boss.email.toUpperCase()} `;
    expect(await isAdmin(boss.userId)).toBe(true);
    expect(await isAdmin(someone.userId)).toBe(false);
    const s = (await adminStats(boss.userId))!;
    expect(s.users).toBeGreaterThanOrEqual(2);
    expect(Object.values(s).every((v) => typeof v === "number")).toBe(true);
    expect(await adminStats(someone.userId)).toBeNull();
  });

  it("development tools: open to all while no admin is named, then admins only", async () => {
    const boss = await makeUser("Boss");
    const someone = await makeUser("Someone");
    process.env.DEV_TOOLS = "on";
    delete process.env.ADMIN_EMAILS;
    expect(await devToolsFor(someone.userId)).toBe(true);
    process.env.ADMIN_EMAILS = boss.email;
    expect(await devToolsFor(boss.userId)).toBe(true);
    expect(await devToolsFor(someone.userId)).toBe(false);
    process.env.DEV_TOOLS = "off";
    expect(await devToolsFor(boss.userId)).toBe(false);
  });
});
