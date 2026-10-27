import { dismissNoticesAction } from "@/app/actions/notices";
import type { NoticeRef } from "@/server/services/notices";

export interface TrayItem {
  ref: NoticeRef;
  icon: string;
  body: React.ReactNode;
  /** Its own way to close (e.g. a question's "not now"), instead of the tray's ×. */
  close?: React.ReactNode;
}

const SHOWN = 3;

function Refs({ refs }: { refs: NoticeRef[] }) {
  return refs.map((r, i) => (
    <span key={i} hidden>
      <input type="hidden" name="key" value={r.key} />
      <input type="hidden" name="kind" value={r.kind} />
      <input type="hidden" name="on" value={r.on ?? ""} />
    </span>
  ));
}

/**
 * Home's notices in one place at the top: a line each, the first three shown and the rest one tap
 * away. Each can be closed (×), or all at once; what still needs you comes back later by itself
 * (see notices.ts). Nothing showing: no tray.
 */
export function NoticeTray({ items, labels }: { items: TrayItem[]; labels: { title: string; closeAll: string; close: string; more: (n: number) => string } }) {
  if (!items.length) return null;
  const row = (x: TrayItem) => (
    <li key={x.ref.key} className="flex items-start gap-3 py-3 first:pt-1 last:pb-1" data-testid="notice">
      <span aria-hidden className="mt-0.5 text-lg">{x.icon}</span>
      <div className="min-w-0 flex-1 text-sm text-stone-800">{x.body}</div>
      {x.close ?? (
        <form action={dismissNoticesAction} className="shrink-0">
          <Refs refs={[x.ref]} />
          <button type="submit" aria-label={labels.close} title={labels.close} className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700">
            ✕
          </button>
        </form>
      )}
    </li>
  );
  return (
    <section id="notices" className="scroll-mt-20 rounded-3xl bg-white/90 px-4 pb-2 pt-3 shadow-sm ring-1 ring-amber-100" data-testid="notice-tray">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-stone-900">🔔 {labels.title}</h2>
        <form action={dismissNoticesAction}>
          <Refs refs={items.map((x) => x.ref)} />
          <button type="submit" className="text-xs text-stone-500 underline underline-offset-4 hover:text-stone-800">{labels.closeAll}</button>
        </form>
      </div>
      <ul className="divide-y divide-stone-100">{items.slice(0, SHOWN).map(row)}</ul>
      {items.length > SHOWN && (
        <details className="group">
          <summary className="cursor-pointer list-none py-2 text-center text-xs font-semibold text-teal-800 group-open:hidden">{labels.more(items.length - SHOWN)} ▾</summary>
          <ul className="divide-y divide-stone-100 border-t border-stone-100">{items.slice(SHOWN).map(row)}</ul>
        </details>
      )}
    </section>
  );
}
