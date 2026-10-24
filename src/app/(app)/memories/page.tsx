import Link from "next/link";
import { Flash } from "@/components/flash";
import { Timeline } from "@/components/timeline";
import { Button, Card, Empty, Input, LinkButton, Notice, Page, Select } from "@/components/ui";
import { buildTimeline, type TimelineEntry } from "@/lib/timeline";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { MEMORY_KINDS } from "@/server/db/schema";
import { getAccount } from "@/server/services/account";
import { listMemories, listTags, type MemorySummary } from "@/server/services/memories";
import { connectionFeed, feedForPage, feedToEntry, mineToEntry } from "@/server/services/memory-share";
import { listPeople } from "@/server/services/people";

const PAGE_SIZE = 50;

export default async function MemoriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const tz = (await getAccount(uid)).profile.timeZone;
  const filters = { q: sp.q ?? "", kind: sp.kind ?? "", tag: sp.tag ?? "", personId: sp.personId ?? "", from: sp.from ?? "", to: sp.to ?? "" };
  const filtering = Object.values(filters).some((v) => v !== "");
  const view = sp.view === "mine" || sp.view === "friends" ? sp.view : "all";
  const page = Math.min(Math.max(Number.parseInt(sp.page ?? "0", 10) || 0, 0), 2000);
  let entries: TimelineEntry[] = [];
  let hasOlder = false;
  let filterError = false;
  if (view === "friends") {
    const feed = await connectionFeed(uid, { offset: page * PAGE_SIZE, limit: PAGE_SIZE + 1 });
    hasOlder = feed.length > PAGE_SIZE;
    entries = feed.slice(0, PAGE_SIZE).map(feedToEntry);
  } else {
    // One row before the page (where the previous page ended) and one after (is there an older page?).
    let rows: MemorySummary[] = [];
    try {
      rows = await listMemories(uid, { ...filters, limit: PAGE_SIZE + (page > 0 ? 2 : 1), offset: Math.max(page * PAGE_SIZE - 1, 0) });
    } catch {
      filterError = true;
    }
    const before = page > 0 ? rows.shift() : undefined;
    hasOlder = rows.length > PAGE_SIZE;
    const mine = rows.slice(0, PAGE_SIZE);
    entries = mine.map(mineToEntry);
    if (view === "all" && !filtering) {
      const eff = (m: MemorySummary | undefined) => (m ? (m.occurredOn ?? m.createdAt.toISOString().slice(0, 10)) : null);
      const theirs = await feedForPage(uid, { previousOldest: eff(before), oldest: eff(mine.at(-1)), first: page === 0, last: !hasOlder });
      entries = entries.concat(theirs.map(feedToEntry));
    }
  }
  const days = buildTimeline(entries, tz);
  const pageHref = (n: number) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== ""));
    if (view !== "all") q.set("view", view);
    if (n > 0) q.set("page", String(n));
    const qs = q.toString();
    return `/memories${qs ? `?${qs}` : ""}`;
  };
  const tags = await listTags(uid);
  const people = await listPeople(uid);
  const tl = t.memories.timeline;
  return (
    <Page title={t.memories.title}>
      <Flash t={t} sp={sp} />
      {filterError && <Flash t={t} sp={{ e: "invalid_input" }} />}
      <nav aria-label={t.memories.title} className="flex gap-1 rounded-full bg-white/80 p-1 text-sm shadow-sm ring-1 ring-stone-200">
        {(["all", "mine", "friends"] as const).map((v) => (
          <Link key={v} href={v === "all" ? "/memories" : `/memories?view=${v}`} aria-current={view === v ? "page" : undefined}
            className={`flex-1 rounded-full px-3 py-1.5 text-center font-medium transition ${view === v ? "bg-teal-700 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
            {tl.views[v]}
          </Link>
        ))}
      </nav>
      {view !== "friends" && <Card>
        <form method="get" className="space-y-2" role="search">
          {view !== "all" && <input type="hidden" name="view" value={view} />}
          <Input name="q" defaultValue={filters.q} placeholder={t.memories.searchPlaceholder} aria-label={t.common.search} />
          <details open={!!(filters.kind || filters.tag || filters.personId || filters.from || filters.to)}>
            <summary className="cursor-pointer text-sm text-stone-600">{t.common.filter}</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Select name="kind" defaultValue={filters.kind} aria-label={t.memories.fields.kind}>
                <option value="">{t.common.all}</option>
                {MEMORY_KINDS.map((k) => <option key={k} value={k}>{t.memories.kinds[k]}</option>)}
              </Select>
              <Select name="tag" defaultValue={filters.tag} aria-label="tag">
                <option value="">#</option>
                {tags.map((x) => <option key={x.tag} value={x.tag}>#{x.tag} ({x.n})</option>)}
              </Select>
              <Select name="personId" defaultValue={filters.personId} aria-label={t.memories.fields.people}>
                <option value="">{t.memories.fields.people}</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
              </Select>
              <div />
              <Input type="date" name="from" defaultValue={filters.from} aria-label={t.memories.from} />
              <Input type="date" name="to" defaultValue={filters.to} aria-label={t.memories.to} />
            </div>
          </details>
          <div className="flex gap-2">
            <Button type="submit">{t.common.search}</Button>
            <LinkButton href={view === "all" ? "/memories" : `/memories?view=${view}`}>{t.common.clear}</LinkButton>
          </div>
        </form>
      </Card>}
      {view === "all" && filtering && <Notice>{tl.filteredMineOnly}</Notice>}
      {days.length === 0 ? (
        <Empty>{view === "friends" ? tl.friendsEmpty : t.memories.empty}</Empty>
      ) : (
        <Timeline t={t} locale={locale} tz={tz} days={days} />
      )}
      {(page > 0 || hasOlder) && (
        <nav className="flex justify-between text-sm" aria-label="pagination">
          {page > 0 ? <Link className="text-teal-700 underline" href={pageHref(page - 1)}>← {t.memories.newer}</Link> : <span />}
          {hasOlder && <Link className="text-teal-700 underline" href={pageHref(page + 1)}>{t.memories.older} →</Link>}
        </nav>
      )}
      <div aria-hidden className="h-16" />
      {/* Writing is the main thing here: a floating button above the tab bar, always in reach. */}
      <Link
        href="/memories/new"
        className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50%-20rem))] z-30 inline-flex items-center gap-2 rounded-full bg-linear-to-br from-teal-600 to-violet-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-teal-900/25 ring-4 ring-white/80 transition hover:shadow-xl active:scale-95 print:hidden"
      >
        <span aria-hidden className="text-xl leading-none">✎</span>
        {t.memories.write}
      </Link>
    </Page>
  );
}
