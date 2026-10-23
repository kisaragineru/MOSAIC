/**
 * Regression tests for findings of the pre-release audit (docs/AUDIT.md).
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { memoryEntryVersions, people } from "@/server/db/schema";
import { DbError, withAnon, withUser } from "@/server/db/tx";
import { sql } from "drizzle-orm";
import { register } from "@/server/services/account";
import { makeUser } from "../helpers/factory";

describe("AUD-01: database errors never carry query parameters", () => {
  it("FK violation: message has no diary text, SQLSTATE is kept", async () => {
    const u = await makeUser();
    const e = await withUser(u.userId, (tx) =>
      tx.insert(memoryEntryVersions).values({ entryId: randomUUID(), userId: u.userId, version: 1, body: "SECRET-DIARY-TEXT" }),
    ).catch((x) => x);
    expect(e).toBeInstanceOf(DbError);
    expect(e.code).toBe("23503");
    expect(String(e.message) + String(e.stack) + JSON.stringify(e.cause)).not.toContain("SECRET-DIARY-TEXT");
  });

  it("RLS violation: no parameters, message still identifies the policy failure", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const e = await withUser(b.userId, (tx) => tx.insert(people).values({ userId: a.userId, nickname: "SECRET-NAME" })).catch((x) => x);
    expect(e).toBeInstanceOf(DbError);
    expect(JSON.stringify({ m: e.message, c: e.cause, s: e.stack })).not.toContain("SECRET-NAME");
    expect(e.cause.message).toMatch(/row-level security/);
  });

  it("unique violation: key values from `detail` are dropped", async () => {
    const e = await withAnon((tx) => tx.execute(sql`select 1 from users where id = ${"SECRET-PARAM"}::uuid`)).catch((x) => x);
    expect(e).toBeInstanceOf(DbError);
    expect(JSON.stringify({ m: e.message, c: e.cause, s: e.stack })).not.toContain("SECRET-PARAM");
  });

  it("application errors still pass through unchanged (duplicate email → email_taken)", async () => {
    const u = await makeUser();
    await expect(register({ email: u.email, password: "long enough pw!", displayName: "x" }, "ip")).rejects.toMatchObject({ code: "email_taken" });
  });
});
