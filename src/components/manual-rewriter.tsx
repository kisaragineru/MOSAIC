"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { refreshManualAction, rewriteManualSectionAction } from "@/app/actions/manual";

/**
 * Rewrites the manual with AI one chapter at a time (each request stays inside the host's time
 * limit), showing how far along it is; the page reloads when every chapter is done. A failure stops
 * there and says why; chapters already rewritten are kept.
 */
export function ManualRewriter({ sections, label, labels }: { sections: string[]; label: string; labels: { progress: (done: number, all: number) => string; reasons: Record<string, string>; fallback: string } }) {
  const router = useRouter();
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setError(null);
    for (const [i, id] of sections.entries()) {
      setDone(i);
      const r = await rewriteManualSectionAction(id, i === 0);
      if (!r.ok) {
        setError(labels.reasons[r.reason ?? ""] ?? labels.fallback);
        setDone(null);
        await refreshManualAction();
        router.refresh();
        return;
      }
    }
    setDone(sections.length);
    await refreshManualAction();
    router.refresh();
    setDone(null);
  };
  const busy = done !== null;
  return (
    <div className="space-y-2">
      <button type="button" onClick={run} disabled={busy || sections.length === 0} aria-busy={busy} className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-800 disabled:cursor-wait disabled:opacity-70">
        {busy ? labels.progress(done, sections.length) : label}
      </button>
      {busy && (
        <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-violet-100" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={sections.length}>
          <div className="h-full rounded-full bg-violet-600 transition-all" ref={(el) => { if (el) el.style.width = `${Math.round((done / Math.max(1, sections.length)) * 100)}%`; }} />
        </div>
      )}
      {error && <p role="status" className="rounded-xl bg-white/80 px-3 py-2 text-xs leading-5 text-stone-700 ring-1 ring-stone-200">{error}</p>}
    </div>
  );
}
