/**
 * The people running MOSAIC. Admins are named by email in ADMIN_EMAILS (comma-separated, set in
 * the hosting settings). They see /admin (numbers only, never anyone's content), and, where the
 * development tools are on (DEV_TOOLS=on), only they get those tools. With no admins named, the
 * development tools stay open to everyone signed in, as before.
 */
import { eq, sql } from "drizzle-orm";
import { cache } from "react";
import { users } from "../db/schema";
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
