import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { sha256 } from "@/server/auth/crypto";
import { getDb } from "@/server/db/client";
import { memoryEntries, memoryEntryVersions, people, profiles, sessions, users } from "@/server/db/schema";
import { withAnon, withUser } from "@/server/db/tx";
import { changePassword, deleteAccount, login, logout, register, resolveSession } from "@/server/services/account";
import { makeUser } from "../helpers/factory";
import { TEST_MIGRATION_DATABASE_URL } from "../helpers/test-env";

/** Drizzle wraps driver errors; the Postgres message lives in `cause`. */
async function pgError(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    const err = e as { message: string; cause?: { message?: string } };
    return err.cause?.message ?? err.message;
  }
  throw new Error("expected the query to fail");
}

describe("registration & login", () => {
  it("registers, resolves the session, logs out", async () => {
    const u = await makeUser("Alice");
    expect(await resolveSession(u.token)).toBe(u.userId);
    await logout(u.userId, u.token);
    expect(await resolveSession(u.token)).toBeNull();
  });

  it("stores only a hash of the session token and an argon2id password hash", async () => {
    const u = await makeUser();
    const owner = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
    const s = await owner.query("select token_hash from sessions where user_id = $1", [u.userId]);
    const p = await owner.query("select password_hash from users where id = $1", [u.userId]);
    await owner.end();
    expect(s.rows[0].token_hash).toBe(sha256(u.token));
    expect(s.rows[0].token_hash).not.toContain(u.token);
    expect(p.rows[0].password_hash).toMatch(/^\$argon2id\$/);
  });

  it("rejects duplicate emails case-insensitively", async () => {
    const u = await makeUser();
    await expect(
      register({ email: u.email.toUpperCase(), password: "another long password", displayName: "X" }, "ip-x"),
    ).rejects.toMatchObject({ code: "email_taken" });
  });

  it("logs in with the right password only, with the same error for unknown emails", async () => {
    const u = await makeUser();
    const s = await login({ email: u.email, password: u.password }, `ip-${randomUUID()}`);
    expect(await resolveSession(s.token)).toBe(u.userId);
    await expect(login({ email: u.email, password: "wrong password!!" }, `ip-${randomUUID()}`)).rejects.toMatchObject({
      code: "invalid_credentials",
    });
    await expect(
      login({ email: `nobody-${randomUUID()}@example.test`, password: "whatever123" }, `ip-${randomUUID()}`),
    ).rejects.toMatchObject({ code: "invalid_credentials" });
  });

  it("validates input", async () => {
    await expect(register({ email: "not-an-email", password: "short", displayName: "" }, "ip")).rejects.toThrow();
  });

  it("rate limits repeated login attempts per client and per account", async () => {
    const u = await makeUser();
    const ip = `ip-${randomUUID()}`;
    let limited = false;
    for (let i = 0; i < 12; i++) {
      try {
        await login({ email: u.email, password: "wrong password!!" }, ip);
      } catch (e) {
        if ((e as { code?: string }).code === "rate_limited") limited = true;
      }
    }
    expect(limited).toBe(true);
    // Per-account limit also applies from a fresh IP.
    await expect(login({ email: u.email, password: u.password }, `ip-${randomUUID()}`)).rejects.toMatchObject({
      code: "rate_limited",
    });
  });

  it("expired sessions are rejected and removed", async () => {
    const u = await makeUser();
    const owner = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
    await owner.query("update sessions set expires_at = now() - interval '1 minute' where user_id = $1", [u.userId]);
    expect(await resolveSession(u.token)).toBeNull();
    const r = await owner.query("select count(*)::int as n from sessions where user_id = $1", [u.userId]);
    await owner.end();
    expect(r.rows[0].n).toBe(0);
  });

  it("garbage tokens resolve to nobody", async () => {
    expect(await resolveSession(undefined)).toBeNull();
    expect(await resolveSession("")).toBeNull();
    expect(await resolveSession("x".repeat(500))).toBeNull();
    expect(await resolveSession(randomUUID())).toBeNull();
  });

  it("changing the password signs out other sessions", async () => {
    const u = await makeUser();
    const other = await login({ email: u.email, password: u.password }, `ip-${randomUUID()}`);
    await changePassword(u.userId, u.token, { currentPassword: u.password, newPassword: "a brand new password" });
    expect(await resolveSession(u.token)).toBe(u.userId);
    expect(await resolveSession(other.token)).toBeNull();
    await expect(login({ email: u.email, password: u.password }, `ip-${randomUUID()}`)).rejects.toMatchObject({
      code: "invalid_credentials",
    });
  });
});

describe("row level security (runtime role mosaic_app)", () => {
  async function seedMemory(userId: string, body: string) {
    return withUser(userId, async (tx) => {
      const [e] = await tx.insert(memoryEntries).values({ userId, kind: "thought" }).returning();
      await tx.insert(memoryEntryVersions).values({ entryId: e!.id, userId, version: 1, body });
      return e!.id;
    });
  }

  it("a user cannot read another user's rows even by id", async () => {
    const a = await makeUser("A");
    const b = await makeUser("B");
    const id = await seedMemory(a.userId, "secret diary of A");
    const seenByB = await withUser(b.userId, (tx) => tx.select().from(memoryEntryVersions).where(eq(memoryEntryVersions.entryId, id)));
    expect(seenByB).toEqual([]);
    const profilesSeenByB = await withUser(b.userId, (tx) => tx.select().from(profiles));
    expect(profilesSeenByB.map((p) => p.userId)).toEqual([b.userId]);
  });

  it("a user cannot update or delete another user's rows", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const id = await seedMemory(a.userId, "original");
    const upd = await withUser(b.userId, (tx) =>
      tx.update(memoryEntryVersions).set({ body: "hacked" }).where(eq(memoryEntryVersions.entryId, id)).returning(),
    );
    expect(upd).toEqual([]);
    const del = await withUser(b.userId, (tx) => tx.delete(memoryEntries).where(eq(memoryEntries.id, id)).returning());
    expect(del).toEqual([]);
    const still = await withUser(a.userId, (tx) => tx.select().from(memoryEntryVersions).where(eq(memoryEntryVersions.entryId, id)));
    expect(still[0]!.body).toBe("original");
  });

  it("a user cannot insert rows owned by someone else (forged user_id)", async () => {
    const a = await makeUser();
    const b = await makeUser();
    expect(
      await pgError(withUser(b.userId, (tx) => tx.insert(people).values({ userId: a.userId, nickname: "forged" }))),
    ).toMatch(/row-level security/);
  });

  it("a user cannot attach a child row to another user's parent (forged foreign key)", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const id = await seedMemory(a.userId, "A's entry");
    // FK checks bypass RLS, so this is enforced by composite (entry_id, user_id) foreign keys.
    expect(
      await pgError(
        withUser(b.userId, (tx) => tx.insert(memoryEntryVersions).values({ entryId: id, userId: b.userId, version: 2, body: "injected" })),
      ),
    ).toMatch(/foreign key/);
    const [person] = await withUser(a.userId, (tx) => tx.insert(people).values({ userId: a.userId, nickname: "A's friend" }).returning());
    expect(
      await pgError(withUser(b.userId, (tx) => tx.insert(memoryEntries).values({ userId: b.userId, kind: "memory" }).returning().then(async ([e]) => {
        const { memoryPeople } = await import("@/server/db/schema");
        await tx.insert(memoryPeople).values({ entryId: e!.id, personId: person!.id, userId: b.userId });
      }))),
    ).toMatch(/foreign key/);
  });

  it("without an identity nothing personal is visible", async () => {
    await makeUser();
    const rows = await withAnon((tx) => tx.select().from(users));
    expect(rows).toEqual([]);
    const s = await withAnon((tx) => tx.select().from(sessions));
    expect(s).toEqual([]);
  });

  it("the runtime role has no direct access to rate-limit buckets and cannot bypass RLS", async () => {
    expect(await pgError(getDb().execute(sql`select * from rate_limit_buckets`))).toMatch(/permission denied/);
    expect(await pgError(getDb().execute(sql`set role mosaic_owner`))).toMatch(/permission denied/);
    expect(await pgError(getDb().execute(sql`alter table users disable row level security`))).toMatch(/owner/);
    const r = await getDb().execute<{ b: boolean }>(sql`select rolbypassrls as b from pg_roles where rolname = current_user`);
    expect(r.rows[0]!.b).toBe(false);
  });

  it("identity does not leak between pooled transactions", async () => {
    const a = await makeUser();
    await withUser(a.userId, async () => undefined);
    const r = await getDb().execute<{ v: string | null }>(sql`select current_setting('app.user_id', true) as v`);
    expect(r.rows[0]!.v ?? "").toBe("");
  });

  it("rejects a malformed identity", async () => {
    await expect(withUser("1 or 1=1", async () => 1)).rejects.toThrow(/invalid user id/);
  });
});

describe("account deletion", () => {
  it("requires password + typed confirmation and removes all personal data", async () => {
    const u = await makeUser();
    await seedPerson(u.userId);
    await expect(deleteAccount(u.userId, { password: u.password, confirm: "nope" })).rejects.toMatchObject({
      code: "confirmation_required",
    });
    await expect(deleteAccount(u.userId, { password: "wrong password", confirm: "DELETE" })).rejects.toMatchObject({
      code: "invalid_credentials",
    });
    await deleteAccount(u.userId, { password: u.password, confirm: "DELETE" });
    const owner = new Pool({ connectionString: TEST_MIGRATION_DATABASE_URL });
    const counts = await owner.query(
      `select (select count(*) from users where id = $1)::int as u,
              (select count(*) from people where user_id = $1)::int as p,
              (select count(*) from sessions where user_id = $1)::int as s,
              (select count(*) from profiles where user_id = $1)::int as pr`,
      [u.userId],
    );
    await owner.end();
    expect(counts.rows[0]).toEqual({ u: 0, p: 0, s: 0, pr: 0 });
    expect(await resolveSession(u.token)).toBeNull();
  });
});

async function seedPerson(userId: string) {
  await withUser(userId, (tx) => tx.insert(people).values({ userId, nickname: "Mom", relationship: "family" }));
}
