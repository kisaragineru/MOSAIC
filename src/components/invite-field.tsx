"use client";
import { useSyncExternalStore } from "react";
import { Field, Input } from "./ui";

const SHARE_KEY = "mosaic_share_token";
const noop = () => () => {};
function shareToken(): string | null {
  try {
    const t = sessionStorage.getItem(SHARE_KEY);
    return t && /^[A-Za-z0-9_-]{20,100}$/.test(t) ? t : null;
  } catch {
    return null;
  }
}

/**
 * The invite code on sign-up, unless they came through a link someone gave them: a story link
 * (checked on the server already: `work`) or a QR / share link (its token waits in this tab's
 * sessionStorage). Then the link itself is the invitation, checked again on submit. After a
 * refused attempt (`forceCode`) the code is asked for as usual.
 */
export function InviteField({ work, codeRequired, fromShare, forceCode, text }: { work: string | null; codeRequired: boolean; fromShare: boolean; forceCode: boolean; text: { label: string; hint: string; invited: string } }) {
  // This tab's share token (none on the server's render).
  const token = useSyncExternalStore(noop, shareToken, () => null);
  const share = !work && codeRequired && fromShare && !forceCode && token ? `share:${token}` : null;
  const invite = work ?? share;
  if (invite)
    return (
      <>
        <input type="hidden" name="invite" value={invite} />
        {codeRequired && <p className="rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-900 ring-1 ring-violet-100" data-testid="invited">✉️ {text.invited}</p>}
      </>
    );
  if (!codeRequired) return null;
  return (
    <Field label={text.label} hint={text.hint}>
      <Input name="inviteCode" autoComplete="off" required maxLength={200} />
    </Field>
  );
}
