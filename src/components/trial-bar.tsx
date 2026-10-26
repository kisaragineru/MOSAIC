import { endTrialAction } from "@/app/actions/auth";
import type { Dict } from "@/lib/i18n/messages/en";

/** Development: while trying sign-up, the way back to your own account (the test one is deleted). */
export function TrialBar({ t, inAuth = false }: { t: Dict; inAuth?: boolean }) {
  return (
    <form action={endTrialAction} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-100 px-4 py-2 text-xs text-amber-950 print:hidden" data-testid="trial-bar">
      <span className="font-semibold">{inAuth ? t.trial.barAuth : t.trial.bar}</span>
      <button type="submit" className="rounded-full bg-amber-900 px-3 py-1 font-semibold text-white hover:bg-amber-950">{t.trial.back}</button>
    </form>
  );
}
