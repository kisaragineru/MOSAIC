import Link from "next/link";
import type { Dict } from "@/lib/i18n/messages/en";
import type { Locale } from "@/lib/i18n/locales";
import { FEELING_EMOJI, type Feeling } from "@/lib/labels";
import { KIND_ICON, relativeDay, type TimelineDay, type TimelineItem } from "@/lib/timeline";
import type { ReplyPreview } from "@/server/services/replies";
import { Avatar } from "./avatar";
import { MediaGrid } from "./media-grid";
import type { MediaItem } from "@/server/services/media";
import { Pill } from "./ui";

const dayLabel = (day: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

/** Days of records on a vertical line: mine link to the record, others' are shown in full. */
type Counts = Map<string, { count: number; unread: number }>;
type Previews = Map<string, ReplyPreview[]>;
type Media = Map<string, MediaItem[]>;

export function Timeline({ t, locale, tz, days, compact = false, comments = new Map(), previews = new Map(), media = new Map(), avatars = new Map(), me }: { t: Dict; locale: Locale; tz: string; days: TimelineDay[]; compact?: boolean; comments?: Counts; previews?: Previews; media?: Media; avatars?: Map<string, string>; /** My name and photo, shown on my own posts. */ me?: { name: string; src?: string } }) {
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
                  {it.entry.mine ? (
                    <Mine t={t} locale={locale} it={it} compact={compact} c={comments.get(it.entry.id)} p={previews.get(it.entry.id)} media={media.get(it.entry.id)} me={me} />
                  ) : (
                    <Theirs t={t} it={it} compact={compact} c={comments.get(it.entry.id)} p={previews.get(it.entry.id)} media={media.get(it.entry.id)} src={avatars.get(it.entry.ownerId ?? "")} />
                  )}
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

/** "💬 n", with a dot when something new came in. */
function CommentCount({ t, c }: { t: Dict; c: { count: number; unread: number } }) {
  return (
    <span className="relative rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
      {t.comments.count(c.count)}
      {c.unread > 0 && <span aria-label={t.comments.newBadge} className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}
    </span>
  );
}

/** The newest comments under a record, shown as they are (name and words). */
function Comments({ t, items, total, ownerName = "" }: { t: Dict; items: ReplyPreview[]; total: number; /** For writers I'm not connected to ("a friend of …"). */ ownerName?: string }) {
  return (
    <ul className="mt-2.5 space-y-1 border-l-2 border-sky-200 pl-3" aria-label={t.replies.title}>
      {items.map((c, i) => (
        <li key={i} className="text-sm leading-snug">
          <span className={`mr-1.5 font-semibold ${c.mine ? "text-teal-800" : "text-sky-900"}`}>{c.mine ? t.comments.you : (c.authorName ?? t.replies.friendOf(ownerName))}</span>
          <span className="emoji-color whitespace-pre-line text-stone-700 [overflow-wrap:anywhere]">{c.body}</span>
        </li>
      ))}
      {total > items.length && <li className="text-xs text-sky-700">{t.comments.more(total - items.length)}</li>}
    </ul>
  );
}

function Mine({ t, locale, it, compact, c, p, media, me }: { t: Dict; locale: Locale; it: TimelineItem; compact: boolean; c?: { count: number; unread: number }; p?: ReplyPreview[]; media?: MediaItem[]; me?: { name: string; src?: string } }) {
  const m = it.entry;
  const tl = t.memories.timeline;
  if (it.letter) {
    const written = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${it.letter.writtenOn}T00:00:00Z`));
    return (
      <Link href={`/memories/${m.id}`} className="block rounded-2xl border border-violet-200 bg-linear-to-br from-violet-50 via-white to-amber-50 p-3.5 shadow-sm transition hover:border-violet-300">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-violet-900">{me && <Avatar name={me.name} src={me.src} className="h-6 w-6 text-[10px]" />}{tl.letterArrived}</p>
        <p className="mb-2 text-xs text-violet-800/80">{tl.letterFrom(written, it.letter.days)}</p>
        {m.title && <p className="emoji-color font-medium text-stone-900">{m.title}</p>}
        <p className={`emoji-color whitespace-pre-line text-sm leading-relaxed text-stone-800 ${compact ? "line-clamp-3" : "line-clamp-6"}`}>{m.body}</p>
      </Link>
    );
  }
  return (
    <Link href={`/memories/${m.id}`} className="block rounded-2xl border border-stone-200 bg-white p-3 transition hover:border-teal-300">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        {me && <Avatar name={me.name} src={me.src} className="h-6 w-6 text-[10px]" />}
        <Stamp t={t} it={it} />
        {m.feeling && <span aria-label={t.memories.feeling.names[m.feeling as keyof Dict["memories"]["feeling"]["names"]]} className="emoji-color text-base leading-none">{FEELING_EMOJI[m.feeling as Feeling]}</span>}
        {m.kind === "letter_to_future" ? (
          <Pill tone="violet">{t.memories.kinds.letter_to_future}</Pill>
        ) : (
          (m.labels ?? []).slice(0, 2).map((l) => <Pill key={l} tone="teal">{t.memories.kinds[l as keyof Dict["memories"]["kinds"]]}</Pill>)
        )}
        {m.audience !== "private" && (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800">{m.audience === "connections" ? `🔗 ${tl.sharedAll}` : `👪 ${tl.sharedCircles(m.circles.map((c) => t.people.relationships[c as keyof Dict["people"]["relationships"]]).join(locale === "ja" ? "・" : ", "))}`}</span>
        )}
        {c && <CommentCount t={t} c={c} />}
        {!compact && m.version > 1 && <Pill>v{m.version}</Pill>}
        {!compact && m.tags.map((x) => <Pill key={x}>#{x}</Pill>)}
        {!compact && m.people.map((p) => <Pill key={p.id} tone="rose">{p.nickname}</Pill>)}
      </div>
      {m.sealed ? (
        <p className="text-sm italic text-stone-500">✉ {t.memories.sealed(m.revealOn!)}</p>
      ) : (
        <>
          {m.title && <p className="emoji-color font-medium text-stone-900">{m.title}</p>}
          {m.body && <p className={`emoji-color whitespace-pre-line text-sm text-stone-700 ${compact ? "line-clamp-2" : "line-clamp-3"}`}>{m.body}</p>}
          {media && <MediaGrid media={media} label={t.memories.media.label} />}
          {p && p.length > 0 && <Comments t={t} items={p} total={c?.count ?? p.length} />}
        </>
      )}
    </Link>
  );
}

/** Someone else's shared record: the whole card opens it (text, photos and our comments). */
function Theirs({ t, it, compact, c, p, media, src }: { t: Dict; it: TimelineItem; compact: boolean; c?: { count: number; unread: number }; p?: ReplyPreview[]; media?: MediaItem[]; src?: string }) {
  const m = it.entry;
  const tl = t.memories.timeline;
  const name = m.ownerName ?? "?";
  return (
    <Link href={`/memories/shared/${m.id}`} className="block rounded-2xl border border-rose-100 bg-rose-50/50 p-3 transition hover:border-rose-300" data-testid="their-record">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <Avatar name={name} src={src} className="h-6 w-6 text-[10px]" />
        <span className="text-xs font-semibold text-rose-900">{tl.theirs(name)}</span>
        <Stamp t={t} it={it} />
        {m.kind !== "note" && <Pill tone="rose">{t.memories.kinds[m.kind as keyof Dict["memories"]["kinds"]]}</Pill>}
        {c && <CommentCount t={t} c={c} />}
      </div>
      {m.title && <p className="emoji-color font-medium text-stone-900">{m.title}</p>}
      {m.body && <p className={`emoji-color whitespace-pre-line text-sm text-stone-800 ${compact ? "line-clamp-2" : "line-clamp-4"}`}>{m.body}</p>}
      {media && <MediaGrid media={media} label={t.memories.media.label} />}
      {p && p.length > 0 && <Comments t={t} items={p} total={c?.count ?? p.length} ownerName={name} />}
      <p className="mt-2 text-right text-xs font-semibold text-rose-800">{t.comments.openRecord} →</p>
    </Link>
  );
}
