import { cache } from "react";
import { randomUUID } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { randomToken, safeEqual, sha256 } from "../auth/crypto";
import { dummyPasswordHash, hashPassword, PASSWORD_MAX, PASSWORD_MIN, verifyPassword } from "../auth/password";
import { enforceRateLimit } from "../auth/rate-limit";
import { notificationPreferences, profiles, sessions, userIdentities, users } from "../db/schema";
import type { OAuthProfile } from "../auth/oauth";
import { withAnon, withUser } from "../db/tx";
import { AppError, invalid, unauthorized } from "../errors";
import { audit } from "./audit";
import { inviteCodeOpen, normalizeInviteCode, useInviteCode } from "./invite-codes";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";

export const SESSION_TTL_DAYS = 30;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
  displayName: z.string().trim().min(1).max(80),
  locale: z.enum(SUPPORTED_LOCALES).default("en"),
  inviteCode: z.string().max(200).optional(),
  /** Arrived through a story or share link ("work:<token>" / "share:<token>"): no code needed. */
  invite: z.string().max(200).optional(),
});

/** "work:<token>" / "share:<token>": a story or share link someone was given, still open. */
export async function invitedThrough(invite: string | undefined): Promise<boolean> {
  const m = /^(work|share):([A-Za-z0-9_-]{16,100})$/.exec(invite ?? "");
  if (!m) return false;
  const r = await withAnon((tx) => tx.execute<{ ok: boolean }>(sql`select invite_valid(${m[1]}, ${sha256(m[2]!)}) as ok`));
  return r.rows[0]?.ok === true;
}

/**
 * Sign-up needs the code (when REGISTRATION_CODE is set): the shared one, an invite code someone
 * made for them (`personal`, taken by the new account), or a link someone gave them.
 */
async function mayRegister(code: string | undefined, invite: string | undefined): Promise<{ ok: boolean; personal?: string }> {
  const expected = process.env.REGISTRATION_CODE;
  // Compare digests so the comparison is constant-time regardless of input length.
  if (!expected || safeEqual(sha256(code?.trim() ?? ""), sha256(expected))) return { ok: true };
  const personal = normalizeInviteCode(code);
  if (personal && (await inviteCodeOpen(personal))) return { ok: true, personal };
  return { ok: await invitedThrough(invite) };
}

/** When REGISTRATION_CODE is set (e.g. a public test deployment), sign-up requires that code. */
export function registrationCodeRequired(): boolean {
  return !!process.env.REGISTRATION_CODE;
}

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(PASSWORD_MAX),
});

export interface NewSession {
  userId: string;
  token: string;
  expiresAt: Date;
}

async function createSession(tx: Parameters<Parameters<typeof withUser>[1]>[0], userId: string): Promise<NewSession> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
  await tx.insert(sessions).values({ userId, tokenHash: sha256(token), expiresAt });
  return { userId, token, expiresAt };
}

/** A new session for this account (development tools only: see dev-trial.ts). */
export async function issueSession(userId: string): Promise<NewSession> {
  return withUser(userId, (tx) => createSession(tx, userId));
}

/** clientKey: the caller's IP (or null when it cannot be determined reliably). */
export async function register(input: unknown, clientKey: string | null): Promise<NewSession> {
  const data = registerSchema.parse(input);
  await enforceRateLimit("register", clientKey ?? "unknown-client");
  const entry = await mayRegister(data.inviteCode, data.invite);
  if (!entry.ok) throw new AppError("invite_required", 403);
  const taken = await withAnon(async (tx) => {
    const r = await tx.execute<{ taken: boolean }>(sql`select auth_email_taken(${data.email}) as taken`);
    return r.rows[0]?.taken === true;
  });
  if (taken) throw new AppError("email_taken", 409);
  const passwordHash = await hashPassword(data.password);
  const id = randomUUID();
  try {
    return await withUser(id, async (tx) => {
      await tx.insert(users).values({ id, email: data.email, passwordHash });
      await tx.insert(profiles).values({ userId: id, displayName: data.displayName, locale: data.locale });
      await tx.insert(notificationPreferences).values({ userId: id });
      // An invite code is used up by this account (if someone took it meanwhile, nothing is made).
      if (entry.personal && !(await useInviteCode(tx, entry.personal))) throw new AppError("invite_required", 403);
      await audit(tx, id, "account.register");
      return createSession(tx, id);
    });
  } catch (e) {
    if ((e as { cause?: { code?: string } }).cause?.code === "23505") throw new AppError("email_taken", 409);
    throw e;
  }
}

export async function login(input: unknown, clientKey: string | null): Promise<NewSession> {
  const data = loginSchema.parse(input);
  // Per-IP limit only when the IP is trustworthy; the per-account limit always applies.
  if (clientKey) await enforceRateLimit("login", clientKey);
  await enforceRateLimit("loginAccount", data.email);
  const row = await withAnon(async (tx) => {
    const r = await tx.execute<{ user_id: string; password_hash: string }>(
      sql`select * from auth_find_user_by_email(${data.email})`,
    );
    return r.rows[0];
  });
  if (!row) {
    await verifyPassword(await dummyPasswordHash(), data.password);
    throw new AppError("invalid_credentials", 401);
  }
  if (!(await verifyPassword(row.password_hash, data.password))) {
    throw new AppError("invalid_credentials", 401);
  }
  return withUser(row.user_id, async (tx) => {
    await audit(tx, row.user_id, "account.login");
    return createSession(tx, row.user_id);
  });
}

/**
 * Sign in (or sign up) with an account from Google or Facebook.
 * - Seen before: that user, signed in.
 * - New, and the provider vouches for an email that already has an account (Google only): that
 *   account gains the link. Facebook does not vouch for addresses, so such an email is refused.
 * - Otherwise a new account; the same invite code rule applies as for email sign-up. It has no
 *   usable password (a random one nobody knows): it signs in through the provider.
 */
export async function signInWithIdentity(
  p: OAuthProfile,
  opts: { inviteCode?: string; invite?: string; locale: (typeof SUPPORTED_LOCALES)[number]; clientKey: string | null },
): Promise<{ session: NewSession; created: boolean }> {
  if (opts.clientKey) await enforceRateLimit("login", opts.clientKey);
  const known = await withAnon(async (tx) => {
    const r = await tx.execute<{ uid: string | null }>(sql`select auth_find_identity(${p.provider}, ${p.subject}) as uid`);
    return r.rows[0]?.uid ?? null;
  });
  if (known) {
    const session = await withUser(known, async (tx) => {
      await audit(tx, known, "account.login", "provider", p.provider);
      return createSession(tx, known);
    });
    return { session, created: false };
  }
  const email = p.email ? z.string().trim().toLowerCase().email().max(254).safeParse(p.email) : null;
  const address = email?.success ? email.data : null;
  if (address) {
    const owner = await withAnon(async (tx) => {
      const r = await tx.execute<{ user_id: string }>(sql`select * from auth_find_user_by_email(${address})`);
      return r.rows[0]?.user_id ?? null;
    });
    if (owner) {
      if (!p.emailVerified) throw new AppError("oauth_email_in_use", 409);
      const session = await withUser(owner, async (tx) => {
        await tx.insert(userIdentities).values({ userId: owner, provider: p.provider, subject: p.subject, email: address });
        await audit(tx, owner, "account.identity_linked", "provider", p.provider);
        return createSession(tx, owner);
      });
      return { session, created: false };
    }
  }
  await enforceRateLimit("register", opts.clientKey ?? "unknown-client");
  const entry = await mayRegister(opts.inviteCode, opts.invite);
  if (!entry.ok) throw new AppError("invite_required", 403);
  const id = randomUUID();
  // Without an address from the provider, a placeholder that can never receive mail (.invalid).
  const userEmail = address ?? `${p.provider}-${p.subject}@users.mosaic.invalid`;
  const displayName = (p.name ?? "").trim().slice(0, 80) || (address ? address.split("@")[0]!.slice(0, 80) : "MOSAIC");
  const passwordHash = await hashPassword(randomToken());
  const session = await withUser(id, async (tx) => {
    await tx.insert(users).values({ id, email: userEmail, passwordHash });
    await tx.insert(profiles).values({ userId: id, displayName, locale: opts.locale });
    await tx.insert(notificationPreferences).values({ userId: id });
    await tx.insert(userIdentities).values({ userId: id, provider: p.provider, subject: p.subject, email: address });
    if (entry.personal && !(await useInviteCode(tx, entry.personal))) throw new AppError("invite_required", 403);
    await audit(tx, id, "account.register", "provider", p.provider);
    return createSession(tx, id);
  });
  return { session, created: true };
}

/** Returns the user id for a raw session token, or null. */
export async function resolveSession(token: string | undefined): Promise<string | null> {
  if (!token || token.length > 200) return null;
  return withAnon(async (tx) => {
    const r = await tx.execute<{ uid: string | null }>(sql`select auth_resolve_session(${sha256(token)}) as uid`);
    return r.rows[0]?.uid ?? null;
  });
}

export async function logout(userId: string, token: string): Promise<void> {
  await withUser(userId, async (tx) => {
    await tx.delete(sessions).where(and(eq(sessions.userId, userId), eq(sessions.tokenHash, sha256(token))));
    await audit(tx, userId, "account.logout");
  });
}

async function checkPassword(userId: string, password: string) {
  const row = await withUser(userId, (tx) =>
    tx.select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId)).then((r) => r[0]),
  );
  if (!row || !(await verifyPassword(row.hash, password))) throw new AppError("invalid_credentials", 401);
}

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX),
  newPassword: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
});

/** Changes the password and signs out every other session. */
export async function changePassword(userId: string, currentToken: string, input: unknown) {
  const data = changePasswordSchema.parse(input);
  await enforceRateLimit("loginAccount", `pw:${userId}`);
  await checkPassword(userId, data.currentPassword);
  const passwordHash = await hashPassword(data.newPassword);
  await withUser(userId, async (tx) => {
    await tx.update(users).set({ passwordHash, passwordChangedAt: new Date() }).where(eq(users.id, userId));
    await tx.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.tokenHash, sha256(currentToken))));
    await audit(tx, userId, "account.password_changed");
  });
}

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(PASSWORD_MAX),
  confirm: z.literal("DELETE"),
});

/**
 * Permanently deletes the account and ALL personal data (FK cascades), including
 * comparisons the user took part in. Irreversible; requires password + typed confirmation.
 */
export async function deleteAccount(userId: string, input: unknown): Promise<void> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) throw invalid("confirmation_required");
  await enforceRateLimit("loginAccount", `del:${userId}`);
  await checkPassword(userId, parsed.data.password);
  await withUser(userId, async (tx) => {
    await tx.delete(users).where(eq(users.id, userId));
    // Anonymous record that a deletion happened (no identifier retained).
    await audit(tx, null, "account.deleted");
  });
}

async function getAccountUncached(userId: string) {
  return withUser(userId, async (tx) => {
    const [u] = await tx
      .select({ id: users.id, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId));
    const [p] = await tx.select().from(profiles).where(eq(profiles.userId, userId));
    if (!u || !p) throw unauthorized();
    return { ...u, profile: p };
  });
}

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  bio: z.string().trim().max(2000).optional().nullable(),
  locale: z.enum(SUPPORTED_LOCALES),
  timeZone: z
    .string()
    .max(64)
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "invalid_time_zone"),
});

export async function updateProfile(userId: string, input: unknown) {
  const data = profileSchema.parse(input);
  await withUser(userId, async (tx) => {
    await tx
      .update(profiles)
      .set({ displayName: data.displayName, bio: data.bio || null, locale: data.locale, timeZone: data.timeZone, updatedAt: new Date() })
      .where(eq(profiles.userId, userId));
  });
}

export async function getNotificationPrefs(userId: string) {
  return withUser(userId, async (tx) => {
    const [n] = await tx.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
    return n ?? { userId, dailyQuestion: false, dateReminders: true, channel: "in_app", pushPreview: false, updatedAt: new Date() };
  });
}

export async function updateNotificationPrefs(userId: string, input: { dailyQuestion: boolean; dateReminders: boolean }) {
  const v = z.object({ dailyQuestion: z.boolean(), dateReminders: z.boolean() }).parse(input);
  await withUser(userId, (tx) =>
    tx
      .insert(notificationPreferences)
      .values({ userId, ...v })
      .onConflictDoUpdate({ target: notificationPreferences.userId, set: { ...v, updatedAt: new Date() } }),
  );
}

/** Read once per page render (several parts of a page ask for it); actions always read fresh. */
export const getAccount = cache(getAccountUncached);
