import Link from "next/link";
import type { Dict } from "@/lib/i18n/messages/en";
import type { Locale } from "@/lib/i18n/locales";
import { KIND_ICON, relativeDay, type TimelineDay, type TimelineItem } from "@/lib/timeline";
import { ExpandableText } from "./expandable-text";
import { Pill } from "./ui";

const dayLabel = (day: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

/** Days of records on a vertical line: mine link to the record, others' are shown in full. */
export function Timeline({ t, locale, tz, days, compact = false }: { t: Dict; locale: Locale; tz: string; days: TimelineDay[]; compact?: boolean }) {
  const tl = t.memories.timeline;
  return (
    <ol className="space-y-5" aria-label={t.memories.title}>
      {days.map((d) => {
        const rel = relativeDay(d.day, tz);
        return (
          <li key={d.day} className="animate-[fadeUp_.4s_ease-out_both]">
            <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-stone-700">
              <time dateTime={d.day}>{dayLabel(d.day, locale)}</time>
              {rel && <span className={`rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 ${rel === "today" ? "animate-[softPulse_2.4s_ease-in-out_3]" : ""}`}>{tl[rel]}</span>}
            </h3>
            <ol className="stagger ml-2 space-y-3 border-l-2 border-stone-200 pl-5">
              {d.items.map((it) => (
                <li key={`${it.entry.mine ? "m" : "f"}-${it.entry.id}`} className="relative">
                  <span aria-hidden className={`absolute -left-[1.85rem] top-3 flex h-5 w-5 items-center justify-center rounded-full text-[11px] ring-4 ring-white ${it.entry.mine ? "bg-teal-100" : "bg-rose-100"}`}>
                    {KIND_ICON[it.entry.kind] ?? "•"}
                  </span>
                  {it.entry.mine ? <Mine t={t} locale={locale} it={it} compact={compact} /> : <Theirs t={t} it={it} />}
                </li>
              ))}
            </ol>
          </li>
        );
      })}
    </ol>
  );
}

function Stamp({ t, it }: { t: Dict; it: TimelineItem }) {
  return (
    <span className="text-xs text-stone-500">
      <time dateTime={it.entry.createdAt.toISOString()}>{it.writtenOn ? t.memories.timeline.writtenOn(it.writtenOn) : it.time}</time>
    </span>
  );
}

function Mine({ t, locale, it, compact }: { t: Dict; locale: Locale; it: TimelineItem; compact: boolean }) {
  const m = it.entry;
  const tl = t.memories.timeline;
  return (
    <Link href={`/memories/${m.id}`} className="block rounded-2xl border border-stone-200 bg-white p-3 transition hover:border-teal-300">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <Stamp t={t} it={it} />
        <Pill tone={m.kind === "letter_to_future" ? "violet" : "teal"}>{t.memories.kinds[m.kind as keyof Dict["memories"]["kinds"]]}</Pill>
        {m.audience !== "private" && (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800">{m.audience === "connections" ? `🔗 ${tl.sharedAll}` : `👪 ${tl.sharedCircles(m.circles.map((c) => t.people.relationships[c as keyof Dict["people"]["relationships"]]).join(locale === "ja" ? "・" : ", "))}`}</span>
        )}
        {!compact && m.version > 1 && <Pill>v{m.version}</Pill>}
        {!compact && m.tags.map((x) => <Pill key={x}>#{x}</Pill>)}
        {!compact && m.people.map((p) => <Pill key={p.id} tone="rose">{p.nickname}</Pill>)}
      </div>
      {m.sealed ? (
        <p className="text-sm italic text-stone-500">✉ {t.memories.sealed(m.revealOn!)}</p>
      ) : (
        <>
          {m.title && <p className="font-medium text-stone-900">{m.title}</p>}
          <p className={`whitespace-pre-line text-sm text-stone-700 ${compact ? "line-clamp-2" : "line-clamp-3"}`}>{m.body}</p>
        </>
      )}
    </Link>
  );
}

function Theirs({ t, it }: { t: Dict; it: TimelineItem }) {
  const m = it.entry;
  const tl = t.memories.timeline;
  const name = m.ownerName ?? "?";
  return (
    <article className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-linear-to-br from-rose-200 to-amber-200 text-[10px] font-bold text-stone-800">
          {Array.from(name.trim())[0]?.toUpperCase() ?? "?"}
        </span>
        <span className="text-xs font-semibold text-rose-900">{tl.theirs(name)}</span>
        <Stamp t={t} it={it} />
        <Pill tone="rose">{t.memories.kinds[m.kind as keyof Dict["memories"]["kinds"]]}</Pill>
      </div>
      {m.title && <p className="font-medium text-stone-900">{m.title}</p>}
      <ExpandableText text={m.body ?? ""} more={tl.more} less={tl.less} />
    </article>
  );
}
