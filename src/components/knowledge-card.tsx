import Link from "next/link";
import { AXIS_LABEL, CHAPTER_INFO } from "@/content/axes";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import { PIECE_WEIGHT, type Knowledge, type NextAction } from "@/server/services/knowledge";

// Literal class strings (Tailwind only generates classes it can see).
const HUES = ["bg-teal-400", "bg-sky-400", "bg-rose-300", "bg-amber-300", "bg-violet-300"];
const CELLS = 30;

function action(a: NextAction, t: Dict, locale: Locale): { href: string; title: string; sub: string; plus: number; icon: string } {
  const k = t.knowledge;
  switch (a.kind) {
    case "axis":
      return { href: `/discover/chapter/${a.chapter}`, title: k.axis(AXIS_LABEL[a.key].name[locale], a.need), sub: k.axisSub(CHAPTER_INFO[a.chapter].title[locale]), plus: a.need * PIECE_WEIGHT.answer, icon: "🧩" };
    case "tuvi":
      return { href: "/tuvi", title: k.tuvi, sub: k.tuviSub, plus: PIECE_WEIGHT.tuvi, icon: "🌌" };
    case "record":
      return { href: "/memories/new", title: k.record, sub: k.recordSub, plus: PIECE_WEIGHT.record, icon: "✍️" };
    case "bio":
      return { href: "/me", title: k.bio, sub: k.bioSub, plus: PIECE_WEIGHT.bio, icon: "🪪" };
    case "likes":
      return { href: "/discover/chapter/likes", title: k.likes(a.need ?? 3), sub: k.likesSub, plus: (a.need ?? 3) * PIECE_WEIGHT.answer, icon: "🍀" };
    case "peers":
      return { href: "/me/others", title: k.peers, sub: k.peersSub, plus: PIECE_WEIGHT.peer, icon: "💭" };
  }
}

/** How much MOSAIC knows, as pieces and a level, with the next things worth doing. */
export function KnowledgeCard({ k, t, locale, showNext = true }: { k: Knowledge; t: Dict; locale: Locale; showNext?: boolean }) {
  const tk = t.knowledge;
  const span = k.to === null ? 1 : k.to - k.from;
  const filled = k.to === null ? CELLS : Math.round(((k.pieces - k.from) / span) * CELLS);
  const parts = [
    [tk.parts.answers, String(k.parts.answers)],
    [tk.parts.records, String(k.parts.records)],
    [tk.parts.preferences, String(k.parts.preferences)],
    [tk.parts.bio, k.parts.bio ? "✓" : "—"],
    [tk.parts.tuvi, k.parts.tuvi ? "✓" : "—"],
    [tk.parts.peers, String(k.parts.peers)],
  ] as const;
  return (
    <section aria-labelledby="knowledge-title" className="space-y-4 rounded-3xl bg-white/85 p-5 shadow-[0_8px_30px_-14px_rgba(110,80,50,0.22)] ring-1 ring-white/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="knowledge-title" className="text-sm font-semibold text-stone-700">{tk.title}</h2>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-4xl font-bold tracking-tight text-stone-900" data-testid="pieces">{k.pieces}</span>
            <span className="text-sm text-stone-500">{tk.pieces}</span>
          </p>
        </div>
        <p className="shrink-0 rounded-2xl bg-linear-to-br from-teal-100 to-violet-100 px-3 py-2 text-right">
          <span className="block text-[11px] font-bold text-teal-800">{tk.level(k.level)}</span>
          <span className="block text-sm font-semibold text-stone-900">{tk.levels[k.level]}</span>
        </p>
      </div>
      <div>
        <div aria-hidden className="grid grid-cols-15 gap-1">
          {Array.from({ length: CELLS }, (_, i) => (
            <span key={i} className={`aspect-square rounded-[3px] ${i < filled ? `${HUES[i % HUES.length]} motion-safe:animate-[zoomIn_.4s_ease-out_both]` : "bg-stone-100"}`} />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-stone-500">{k.to === null ? tk.top : tk.toNext(k.to - k.pieces)}</p>
      </div>
      <ul className="flex flex-wrap gap-1.5 text-xs">
        {parts.map(([label, v]) => (
          <li key={label} className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600">{label} <b className="text-stone-900">{v}</b></li>
        ))}
      </ul>
      {showNext && k.next.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-stone-500">{tk.nextTitle}</h3>
          <ul className="space-y-2">
            {k.next.map((a) => {
              const x = action(a, t, locale);
              return (
                <li key={x.href + x.title}>
                  <Link href={x.href} className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-3 py-2.5 transition hover:border-teal-300 hover:shadow-sm">
                    <span aria-hidden className="text-xl">{x.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-stone-900">{x.title}</span>
                      <span className="block text-xs leading-5 text-stone-600">{x.sub}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800">{tk.plus(x.plus)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-stone-400">{tk.help}</p>
    </section>
  );
}
