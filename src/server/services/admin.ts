/**
 * The people running MOSAIC. Admins are named by email in ADMIN_EMAILS (comma-separated, set in
 * the hosting settings). They see /admin (numbers only, never anyone's content), and, where the
 * development tools are on (DEV_TOOLS=on), only they get those tools. With no admins named, the
 * development tools stay open to everyone signed in, as before.
 */
import { eq, sql } from "drizzle-orm";
import { cache } from "react";
import { uuid } from "@/lib/validation/common";
import { betaTesters, users } from "../db/schema";
import { mapDbError, unauthorized } from "../errors";
import { audit } from "./audit";
import { withUser } from "../db/tx";

export const devToolsEnabled = () => process.env.DEV_TOOLS === "on";

export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const isAdmin = cache(async (userId: string): Promise<boolean> => {
  const list = adminEmails();
  if (!list.length) return false;
  const [u] = await withUser(userId, (tx) => tx.select({ email: users.email }).from(users).where(eq(users.id, userId)));
  return !!u && list.includes(u.email.toLowerCase());
});

/** The development tools for this person: on for this deployment, and theirs to use. */
export async function devToolsFor(userId: string): Promise<boolean> {
  if (!devToolsEnabled()) return false;
  return adminEmails().length === 0 || isAdmin(userId);
}

export interface AdminStats {
  users: number;
  users_7d: number;
  users_30d: number;
  active_7d: number;
  charts: number;
  records_7d: number;
  answers_7d: number;
  connections: number;
  messages_7d: number;
  works: number;
  links: number;
  links_opened: number;
  offers_accepted: number;
}

/** The numbers (admins only: checked here as well as on the page). */
export async function adminStats(userId: string): Promise<AdminStats | null> {
  if (!(await isAdmin(userId))) return null;
  const r = await withUser(userId, (tx) => tx.execute<{ s: AdminStats }>(sql`select admin_stats() as s`));
  return r.rows[0]?.s ?? null;
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  lastSeen: Date | null;
  records: number;
  connections: number;
  beta: boolean;
  /** A test account (companion or sign-up trial). */
  test: boolean;
}

/** Everyone signed up, newest first (admins only): who they are and how much they use MOSAIC, nothing they wrote. */
export async function adminUsers(userId: string): Promise<AdminUser[] | null> {
  if (!(await isAdmin(userId))) return null;
  const r = await withUser(userId, (tx) => tx.execute<{ u: Record<string, unknown>[] }>(sql`select admin_users() as u`));
  return (r.rows[0]?.u ?? []).map((x) => ({
    id: String(x.id),
    name: (x.name as string | null) ?? null,
    email: String(x.email),
    createdAt: new Date(String(x.created_at)),
    lastSeen: x.last_seen ? new Date(String(x.last_seen)) : null,
    records: Number(x.records),
    connections: Number(x.connections),
    beta: !!x.beta,
    test: !!x.test,
  }));
}

/** Make someone a beta tester or not (admins only); they join or leave the beta testers' group with it. Returns the group. */
export async function setBetaTester(userId: string, targetId: string, on: boolean): Promise<string> {
  if (!(await isAdmin(userId))) throw unauthorized();
  const id = uuid.parse(targetId);
  return withUser(userId, async (tx) => {
    try {
      const r = await tx.execute<{ c: string }>(sql`select admin_set_beta(${id}, ${on}) as c`);
      await audit(tx, userId, on ? "admin.beta_on" : "admin.beta_off", "user", id);
      return r.rows[0]!.c;
    } catch (e) {
      mapDbError(e);
    }
  });
}

/** Whether this person is a beta tester. */
export async function isBetaTester(userId: string): Promise<boolean> {
  const rows = await withUser(userId, (tx) => tx.select({ id: betaTesters.userId }).from(betaTesters).where(eq(betaTesters.userId, userId)));
  return rows.length > 0;
}

/** The beta testers' group, if this person is in it. */
export async function betaGroupFor(userId: string): Promise<string | null> {
  const r = await withUser(userId, (tx) => tx.execute<{ c: string | null }>(sql`select dm_system_conversation('beta') as c`));
  return r.rows[0]?.c ?? null;
}
