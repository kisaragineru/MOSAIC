/**
 * Setting a new password with a one-time link (an hour, used once; using it signs the account
 * out everywhere). An admin can hand one over (ADMIN_EMAILS); with email set up (mail.ts) people
 * ask for one themselves. Only the link's hash is kept. The link carries its token after "#", so
 * it never reaches the server's logs; the page sends it with the form.
 */
import { sql } from "drizzle-orm";
import { z } from "zod";
import { uuid } from "@/lib/validation/common";
import type { Locale } from "@/lib/i18n/locales";
import { enforceRateLimit } from "../auth/rate-limit";
import { randomToken, sha256 } from "../auth/crypto";
import { hashPassword, PASSWORD_MAX, PASSWORD_MIN } from "../auth/password";
import { withAnon, withUser } from "../db/tx";
import { AppError, mapDbError, unauthorized } from "../errors";
import { mailConfigured, sendMail } from "../mail";
import { isAdmin } from "./admin";
import { audit } from "./audit";

const origin = () => process.env.APP_ORIGIN || "http://localhost:3000";
const linkFor = (token: string) => `${origin()}/reset#t=${token}`;

/** An admin makes a link for someone who forgot their password (to send them themselves). */
export async function issueResetLink(adminId: string, targetId: string): Promise<string> {
  if (!(await isAdmin(adminId))) throw unauthorized();
  const id = uuid.parse(targetId);
  const token = randomToken();
  await withUser(adminId, async (tx) => {
    try {
      await tx.execute(sql`select reset_issue_admin(${id}, ${sha256(token)})`);
    } catch (e) {
      mapDbError(e);
    }
    await audit(tx, adminId, "admin.reset_link", "user", id);
  });
  return linkFor(token);
}

const MAIL: Record<Locale, { subject: string; body: (name: string, link: string) => string }> = {
  ja: {
    subject: "MOSAIC：パスワードの再設定",
    body: (n, l) => `${n}さん\n\nMOSAICのパスワードを新しくするためのリンクです。1時間のあいだ、1回だけ使えます。\n\n${l}\n\nお心当たりがなければ、このメールは無視してください。パスワードは変わりません。\n\nMOSAIC`,
  },
  en: {
    subject: "MOSAIC: set a new password",
    body: (n, l) => `Hi ${n},\n\nHere is a link to set a new password for MOSAIC. It works once, for one hour.\n\n${l}\n\nIf you didn't ask for this, ignore this email; your password stays as it is.\n\nMOSAIC`,
  },
  vi: {
    subject: "MOSAIC: đặt lại mật khẩu",
    body: (n, l) => `Chào ${n},\n\nĐây là đường dẫn để đặt mật khẩu mới cho MOSAIC. Đường dẫn dùng được một lần, trong một giờ.\n\n${l}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này; mật khẩu của bạn vẫn giữ nguyên.\n\nMOSAIC`,
  },
};

/** "Forgot my password": a link by email, if the address has an account. Says nothing either way. */
export async function requestResetEmail(email: unknown, clientKey: string | null): Promise<void> {
  if (!mailConfigured()) throw new AppError("reset_unavailable", 503);
  const address = z.string().trim().toLowerCase().email().max(254).parse(email);
  await enforceRateLimit("passwordReset", clientKey ?? "unknown-client");
  await enforceRateLimit("passwordReset", `email:${address}`);
  const token = randomToken();
  const r = await withAnon((tx) => tx.execute<{ display_name: string; locale: string }>(sql`select * from reset_issue_email(${address}, ${sha256(token)})`));
  const who = r.rows[0];
  if (!who) return;
  const m = MAIL[(["ja", "en", "vi"] as const).find((l) => l === who.locale) ?? "ja"];
  await sendMail({ to: address, subject: m.subject, text: m.body(who.display_name, linkFor(token)) });
}

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{20,100}$/);

export async function resetLinkValid(token: unknown): Promise<boolean> {
  const t = tokenSchema.safeParse(token);
  if (!t.success) return false;
  const r = await withAnon((tx) => tx.execute<{ ok: boolean }>(sql`select reset_valid(${sha256(t.data)}) as ok`));
  return r.rows[0]?.ok === true;
}

/** Use a link: the new password, every session ended. Returns the account (to sign in again). */
export async function resetPassword(token: unknown, password: unknown, clientKey: string | null): Promise<string> {
  const t = tokenSchema.safeParse(token);
  if (!t.success) throw new AppError("reset_invalid", 400);
  const p = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX).parse(password);
  await enforceRateLimit("passwordReset", `use:${clientKey ?? "unknown-client"}`);
  const hash = await hashPassword(p);
  const r = await withAnon(async (tx) => {
    try {
      return await tx.execute<{ u: string }>(sql`select reset_use(${sha256(t.data)}, ${hash}) as u`);
    } catch (e) {
      mapDbError(e);
    }
  });
  return r.rows[0]!.u;
}
