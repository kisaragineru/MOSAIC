/**
 * Sending email, for the few things that need it (a link to set a new password). Through Resend
 * when RESEND_API_KEY and MAIL_FROM are set (MAIL_FROM like "MOSAIC <hello@mosaicdiary.app>",
 * on a domain verified with Resend); otherwise nothing is sent and the features that need it say
 * how else to get help.
 */
import "server-only";
import { logError } from "./log";

export const mailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export async function sendMail(msg: { to: string; subject: string; text: string }): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [msg.to], subject: msg.subject, text: msg.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      logError("mail.send", new Error(`resend ${r.status}`));
      return false;
    }
    return true;
  } catch (e) {
    logError("mail.send", e);
    return false;
  }
}
