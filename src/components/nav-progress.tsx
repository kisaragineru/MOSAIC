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
  // Following a link to another page: its frame stands in for the content almost at once.
  const [link, setLink] = useState(false);
  const [frame, setFrame] = useState(false);
  const busy = from !== null && from === here;

  useEffect(() => {
    const start = (toPage = false) => {
      setSlow(false);
      setFrame(false);
      setLink(toPage);
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
      start(url.pathname !== location.pathname);
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
    const f = link ? setTimeout(() => setFrame(true), 120) : undefined;
    const done = setTimeout(() => setFrom(null), 8_000);
    return () => {
      clearTimeout(s);
      clearTimeout(f);
      clearTimeout(done);
    };
  }, [busy, link]);

  if (!busy) return null;
  const bar = "rounded-full bg-stone-200/80 motion-safe:animate-pulse";
  return (
    <>
      {frame && (
        <div aria-hidden data-testid="page-frame" className="fixed inset-0 z-[5] overflow-hidden bg-[#faf8f5] pt-16 print:hidden">
          <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-4">
            <div className={`h-7 w-40 ${bar}`} />
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3 rounded-3xl border border-white/80 bg-white/70 p-5 shadow-[0_8px_30px_-14px_rgba(110,80,50,0.18)]">
                <div className={`h-4 w-28 ${bar}`} />
                <div className={`h-3 w-full ${bar}`} />
                <div className={`h-3 w-4/5 ${bar}`} />
              </div>
            ))}
          </div>
        </div>
      )}
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
