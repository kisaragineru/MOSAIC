/**
 * Invite codes anyone can make for someone they want to bring in while sign-up is by invitation.
 * Each lets one person sign up, for 30 days; its maker sees it (to copy it again), whether it has
 * been used, and can take it back. Someone signing up only learns whether a code is open.
 */
import { randomInt } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { enforceRateLimit } from "../auth/rate-limit";
import { inviteCodes } from "../db/schema";
import { withAnon, withUser, type Tx } from "../db/tx";
import { AppError } from "../errors";
import { audit } from "./audit";
import { uuid } from "@/lib/validation/common";

export const INVITE_CODE_DAYS = 30;
/** Codes not yet used, at a time (made again when one is used, expires or is taken back). */
export const INVITE_CODES_OPEN_MAX = 10;
// No 0/O, 1/I/L: read aloud or typed from a photo without mistakes.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** "abcd efgh", "ABCD-EFGH", "abcdefgh" → "ABCD-EFGH"; anything else → null. */
export function normalizeInviteCode(input: string | null | undefined): string | null {
  const s = (input ?? "").normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : null;
}

function newCode() {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export interface InviteCode {
  id: string;
  code: string;
  label: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  state: "open" | "used" | "expired" | "revoked";
}

const labelSchema = z.string().trim().max(60).optional().transform((x) => x || null);

export async function makeInviteCode(userId: string, label?: unknown): Promise<InviteCode> {
  const l = labelSchema.parse(label ?? undefined);
  await enforceRateLimit("write", userId);
  return withUser(userId, async (tx) => {
    const [{ n } = { n: 0 }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(inviteCodes)
      .where(and(eq(inviteCodes.ownerId, userId), isNull(inviteCodes.usedAt), isNull(inviteCodes.revokedAt), gt(inviteCodes.expiresAt, sql`now()`)));
    if (n >= INVITE_CODES_OPEN_MAX) throw new AppError("invite_codes_full", 409);
    // A clash with an existing code is vanishingly rare; try again a few times.
    for (let i = 0; i < 5; i++) {
      const code = newCode();
      const [row] = await tx
        .insert(inviteCodes)
        .values({ ownerId: userId, code, label: l, expiresAt: new Date(Date.now() + INVITE_CODE_DAYS * 86_400_000) })
        .onConflictDoNothing()
        .returning();
      if (row) {
        await audit(tx, userId, "invite_code.made", "invite_code", row.id);
        return view(row);
      }
    }
    throw new AppError("generic", 500);
  });
}

function view(r: typeof inviteCodes.$inferSelect): InviteCode {
  const state = r.usedAt ? "used" : r.revokedAt ? "revoked" : r.expiresAt.getTime() <= Date.now() ? "expired" : "open";
  return { id: r.id, code: r.code, label: r.label, expiresAt: r.expiresAt, usedAt: r.usedAt, state };
}

export async function myInviteCodes(userId: string): Promise<InviteCode[]> {
  const rows = await withUser(userId, (tx) => tx.select().from(inviteCodes).where(eq(inviteCodes.ownerId, userId)).orderBy(desc(inviteCodes.createdAt)).limit(30));
  return rows.map(view);
}

export async function revokeInviteCode(userId: string, id: string) {
  const codeId = uuid.parse(id);
  await withUser(userId, async (tx) => {
    const r = await tx
      .update(inviteCodes)
      .set({ revokedAt: new Date() })
      .where(and(eq(inviteCodes.id, codeId), eq(inviteCodes.ownerId, userId), isNull(inviteCodes.usedAt), isNull(inviteCodes.revokedAt)))
      .returning({ id: inviteCodes.id });
    if (r.length) await audit(tx, userId, "invite_code.revoked", "invite_code", codeId);
  });
}

/** Whether a code (already normalized) can still be used. */
export async function inviteCodeOpen(code: string): Promise<boolean> {
  const r = await withAnon((tx) => tx.execute<{ ok: boolean }>(sql`select invite_code_open(${code}) as ok`));
  return r.rows[0]?.ok === true;
}

/** Inside the new account's own transaction: take the code (false if it was taken meanwhile). */
export async function useInviteCode(tx: Tx, code: string): Promise<boolean> {
  const r = await tx.execute<{ ok: boolean }>(sql`select invite_code_use(${code}) as ok`);
  return r.rows[0]?.ok === true;
}
