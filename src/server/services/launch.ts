/**
 * What stands between this deployment and opening it to everyone, read from its settings (names
 * only, never values): for the admin page's checklist.
 */
import { turnstileSiteKey } from "../auth/human";
import { enabledProviders } from "../auth/oauth";
import { mailConfigured } from "../mail";
import { adminEmails, devToolsEnabled } from "./admin";
import { pushConfigured } from "./push";

export type LaunchItem = { key: "origin" | "admins" | "devtools" | "contact" | "google" | "push" | "mail" | "turnstile" | "invite" | "gate"; ok: boolean; required: boolean };

export function launchChecklist(): LaunchItem[] {
  const origin = process.env.APP_ORIGIN ?? "";
  return [
    { key: "origin", ok: origin.startsWith("https://") && !origin.includes(".netlify.app"), required: true },
    { key: "admins", ok: adminEmails().length > 0, required: true },
    { key: "devtools", ok: !devToolsEnabled(), required: true },
    { key: "contact", ok: !!process.env.CONTACT_EMAIL?.trim(), required: true },
    { key: "google", ok: enabledProviders().includes("google"), required: false },
    { key: "push", ok: pushConfigured(), required: false },
    { key: "mail", ok: mailConfigured(), required: false },
    { key: "turnstile", ok: !!turnstileSiteKey(), required: false },
    // Invite-only is a choice: open sign-up when this is off.
    { key: "invite", ok: !process.env.REGISTRATION_CODE, required: false },
    // Last: the shared password comes off when everything above is as wanted.
    { key: "gate", ok: !(process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASSWORD), required: true },
  ];
}
