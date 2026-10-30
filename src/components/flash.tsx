import type { Dict } from "@/lib/i18n/messages/en";
import { Notice } from "./ui";

/** Renders ?e=<code> / ?ok=<key> flash messages set by server actions. */
export function Flash({ t, sp }: { t: Dict; sp: Record<string, string | string[] | undefined> }) {
  const e = typeof sp.e === "string" ? sp.e : null;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  return (
    <>
      {e && <Notice kind="error">{(t.errors as Record<string, string>)[e] ?? t.errors.generic}</Notice>}
      {ok && ok !== "connected" && ok !== "reached" && <Notice kind="success">{ok === "deleted" ? t.common.deleted : ok === "password" ? t.settings.passwordChanged : ok === "answered" ? t.discover.saved : ok === "trial_ended" ? t.trial.ended : ok === "password_reset" ? t.auth.resetDone : ok === "sent" ? t.topics.sentOk : t.common.saved}</Notice>}
    </>
  );
}
