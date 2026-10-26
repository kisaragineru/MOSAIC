import Link from "next/link";
import type { Dict } from "@/lib/i18n/messages/en";
import { dismissStarterAction } from "@/app/actions/onboarding";
import { ConfirmButton } from "./confirm-button";

export interface StarterState {
  chart: boolean;
  answers: boolean;
  bio: boolean;
  record: boolean;
  connect: boolean;
}

/**
 * Home's "getting started" card: what MOSAIC is for — know yourself, share it, know the people
 * who matter — as five first steps, ticked off as they're done. Gone once all are done, or once
 * closed (only after the guide; while it runs, the guide bar ends both).
 */
export function StarterChecklist({ t, done, resume }: { t: Dict; done: StarterState; resume: boolean }) {
  const w = t.welcome;
  const items: { key: keyof StarterState; href: string }[] = [
    { key: "chart", href: resume ? "/welcome?step=2" : "/tuvi" },
    { key: "answers", href: resume ? "/welcome?step=4" : "/discover" },
    { key: "bio", href: "/me" },
    { key: "record", href: "/memories/new" },
    { key: "connect", href: "/share" },
  ];
  const left = items.filter((x) => !done[x.key]).length;
  if (left === 0) return null;
  return (
    <section className="rounded-3xl bg-linear-to-br from-teal-50 to-amber-50 p-5 shadow-sm ring-1 ring-teal-100" data-testid="starter-checklist">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-teal-950">🧭 {w.checklistTitle}</h2>
          <p className="text-xs text-stone-600">{w.checklistSub(left)}</p>
        </div>
        {resume ? (
          <Link href="/welcome" className="shrink-0 text-xs font-semibold text-teal-700 underline underline-offset-4">{w.resume} →</Link>
        ) : (
          <form action={dismissStarterAction} className="shrink-0">
            <ConfirmButton bare message={w.checklistEndConfirm} className="text-xs text-stone-500 underline underline-offset-4 hover:text-stone-800">{w.checklistEnd}</ConfirmButton>
          </form>
        )}
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((x) => (
          <li key={x.key}>
            {done[x.key] ? (
              <span className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-stone-400">
                <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white">✓</span>
                <span className="line-through">{w.checklist[x.key]}</span>
              </span>
            ) : (
              <Link href={x.href} className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-sm font-semibold text-stone-800 ring-1 ring-white transition hover:ring-teal-200">
                <span aria-hidden className="h-5 w-5 rounded-full border-2 border-stone-300" />
                <span className="flex-1">{w.checklist[x.key]}</span>
                <span aria-hidden className="text-teal-700">→</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
