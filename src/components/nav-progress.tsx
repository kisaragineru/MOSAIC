"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Shows that something is on its way: a thin bar at the top as soon as a link is followed or a
 * form is sent, and a small "Loading…" pill if it takes longer than a moment. It belongs to the
 * URL it started from, so it disappears by itself once the next screen is there (or after a
 * while, if the action stays on the same page).
 */
export function NavProgress({ label }: { label: string }) {
  const here = `${usePathname()}?${useSearchParams().toString()}`;
  const [from, setFrom] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const busy = from !== null && from === here;

  useEffect(() => {
    const start = () => {
      setSlow(false);
      setFrom(`${location.pathname}?${location.search.slice(1)}`);
    };
    const onClick = (e: MouseEvent) => {
      // Next's <Link> and server-action forms call preventDefault() themselves, so it says nothing here.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      // Same page (incl. in-page anchors): nothing to load.
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };
    const onSubmit = () => start();
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  useEffect(() => {
    if (!busy) return;
    const s = setTimeout(() => setSlow(true), 350);
    const done = setTimeout(() => setFrom(null), 8_000);
    return () => {
      clearTimeout(s);
      clearTimeout(done);
    };
  }, [busy]);

  if (!busy) return null;
  return (
    <>
      <div aria-hidden data-testid="nav-progress" className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-teal-100/60 print:hidden">
        <div className="h-full w-full origin-left animate-[navProgress_1.1s_ease-in-out_infinite] bg-linear-to-r from-teal-500 via-violet-500 to-rose-400 motion-reduce:animate-none" />
      </div>
      {slow && (
        <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center print:hidden">
          <span className="flex animate-[fadeIn_.2s_ease-out] items-center gap-2 rounded-full bg-stone-900/85 px-4 py-2 text-sm font-medium text-white shadow-lg">
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" />
            {label}
          </span>
        </div>
      )}
    </>
  );
}
