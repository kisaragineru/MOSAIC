import { DateSelect } from "@/components/date-select";
import { dateText } from "@/lib/i18n/date-text";
import Link from "next/link";
import { Flash } from "@/components/flash";
import { QuickComposer } from "@/components/quick-composer";
import { composerText } from "@/components/memory-form";
import { mediaFor } from "@/server/services/media";
import { myGiftBoxes } from "@/server/services/gift-boxes";
import { Timeline } from "@/components/timeline";
import { Button, Card, Empty, Field, Input, LinkButton, Notice, Page, Select } from "@/components/ui";
import { buildTimeline, type TimelineEntry } from "@/lib/timeline";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { LABELS } from "@/lib/labels";
import { getAccount } from "@/server/services/account";
import { arrivedLetters, listMemories, listTags, sealedLetters, type MemorySummary } from "@/server/services/memories";
import { LetterShelf } from "@/components/letter-shelf";
import { todayIn } from "@/lib/validation/common";
import { shareTargets, connectionFeed, feedForPage, feedToEntry, mineToEntry } from "@/server/services/memory-share";
import { listPeople } from "@/server/services/people";
import { avatarUrls, myAvatarUrl } from "@/server/services/avatars";
import { replyCounts, replyInbox, replyPreviews } from "@/server/services/replies";
import { myTint, typeTints } from "@/server/services/card";

const PAGE_SIZE = 50;

export default async function MemoriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const tz = (await getAccount(uid)).profile.timeZone;
  const view = sp.view === "mine" || sp.view === "friends" ? sp.view : "all";
  // "Mine" opens as a diary: only what is kept to oneself, unless another audience is picked
  // ("any" = no filter there). Elsewhere no audience is chosen to start with.
  const audienceParam = sp.audience === "private" || sp.audience === "shared" || (sp.audience === "any" && view === "mine") ? sp.audience : "";
  const audience = audienceParam === "any" ? "" : audienceParam || (view === "mine" ? "private" : "");
  const onlyMeByDefault = view === "mine" && !audienceParam;
  const filters = { q: sp.q ?? "", kind: sp.kind ?? "", tag: sp.tag ?? "", personId: sp.personId ?? "", audience: audienceParam, from: sp.from ?? "", to: sp.to ?? "" };
  const filtering = Object.values(filters).some((v) => v !== "");
  // ?with=<connection>: one person's shared records only.
  const withWho = view === "friends" && sp.with ? ((await shareTargets(uid)).find((x) => x.sessionId === sp.with) ?? null) : null;
  const page = Math.min(Math.max(Number.parseInt(sp.page ?? "0", 10) || 0, 0), 2000);
  let entries: TimelineEntry[] = [];
  let hasOlder = false;
  let filterError = false;
  if (view === "friends") {
    const feed = await connectionFeed(uid, { offset: page * PAGE_SIZE, limit: PAGE_SIZE + 1, sessionId: withWho?.sessionId ?? null });
    hasOlder = feed.length > PAGE_SIZE;
    entries = feed.slice(0, PAGE_SIZE).map(feedToEntry);
  } else {
    // One row before the page (where the previous page ended) and one after (is there an older page?).
    let rows: MemorySummary[] = [];
    try {
      rows = await listMemories(uid, { ...filters, audience, letters: view === "mine", limit: PAGE_SIZE + (page > 0 ? 2 : 1), offset: Math.max(page * PAGE_SIZE - 1, 0) });
    } catch {
      filterError = true;
    }
    const before = page > 0 ? rows.shift() : undefined;
    hasOlder = rows.length > PAGE_SIZE;
    const mine = rows.slice(0, PAGE_SIZE);
    entries = mine.map(mineToEntry);
    if (view === "all" && !filtering) {
      const eff = (m: MemorySummary | undefined) => m?.timelineOn ?? null;
      const theirs = await feedForPage(uid, { previousOldest: eff(before), oldest: eff(mine.at(-1)), first: page === 0, last: !hasOlder });
      entries = entries.concat(theirs.map(feedToEntry));
    }
  }
  const days = buildTimeline(entries, tz);
  const { previews, counts: replyTotals } = await replyPreviews(uid, entries.filter((e) => !e.sealed).map((e) => e.id));
  const counts = replyCounts(replyTotals, await replyInbox(uid));
  const media = await mediaFor(uid, entries.filter((e) => !e.sealed).map((e) => e.id));
  const pageHref = (n: number) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== ""));
    if (view !== "all") q.set("view", view);
    if (withWho) q.set("with", withWho.sessionId);
    if (n > 0) q.set("page", String(n));
    const qs = q.toString();
    return `/memories${qs ? `?${qs}` : ""}`;
  };
  const tags = await listTags(uid);
  const people = await listPeople(uid);
  const tl = t.memories.timeline;
  const tm = t.memories;
  const targets = await shareTargets(uid);
  const canShare = targets.length > 0;
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
      {view === "friends" && targets.length > 1 && (
        <nav aria-label={tl.views.friends} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm">
          <Link href="/memories?view=friends" aria-current={!withWho ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center rounded-2xl px-4 font-semibold ${!withWho ? "bg-rose-600 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}>{t.common.all}</Link>
          {targets.map((x) => (
            <Link key={x.sessionId} href={`/memories?view=friends&with=${x.sessionId}`} aria-current={withWho?.sessionId === x.sessionId ? "page" : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-2xl px-4 font-semibold ${withWho?.sessionId === x.sessionId ? "bg-rose-600 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}>
              <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-[10px] text-rose-900">{Array.from(x.name.trim())[0] ?? "?"}</span>
              {x.name}
            </Link>
          ))}
        </nav>
      )}
      {withWho && targets.length <= 1 && <p className="px-1 text-sm font-semibold text-rose-900">{tl.onlyFrom(withWho.name)}</p>}
      {view !== "friends" && page === 0 && <LetterShelf letters={await sealedLetters(uid)} arrived={await arrivedLetters(uid)} today={todayIn(tz)} t={t} locale={locale} />}
      {view !== "friends" && <Card>
        <form method="get" className="space-y-2" role="search">
          {view !== "all" && <input type="hidden" name="view" value={view} />}
          <Input name="q" defaultValue={filters.q} placeholder={t.memories.searchPlaceholder} aria-label={t.common.search} />
          <details open={!!(filters.kind || filters.tag || filters.personId || filters.audience || filters.from || filters.to)}>
            <summary className="cursor-pointer text-sm text-stone-600">{t.common.filter}</summary>
            {/* Each picker says what it is above it, and starts at "any". */}
            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-3">
              <Field label={t.memories.labels.title}>
                <Select name="kind" defaultValue={filters.kind}>
                  <option value="">{tm.filterAny}</option>
                  {[...LABELS, "letter_to_future" as const].map((k) => <option key={k} value={k}>{t.memories.kinds[k]}</option>)}
                </Select>
              </Field>
              <Field label={tm.filterTag}>
                <Select name="tag" defaultValue={filters.tag}>
                  <option value="">{tm.filterAny}</option>
                  {tags.map((x) => <option key={x.tag} value={x.tag}>#{x.tag} ({x.n})</option>)}
                </Select>
              </Field>
              <Field label={t.memories.fields.people}>
                <Select name="personId" defaultValue={filters.personId}>
                  <option value="">{tm.filterAny}</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
                </Select>
              </Field>
              {/* Who can see it: only me, or shared with someone. "Mine" starts at only me. */}
              <Field label={t.memories.audience.label}>
                <Select name="audience" defaultValue={audienceParam || (view === "mine" ? "private" : "")}>
                  <option value={view === "mine" ? "any" : ""}>{tm.filterAny}</option>
                  <option value="private">🔒 {t.memories.audience.private}</option>
                  <option value="shared">{t.recordsAudience.tabs.shared}</option>
                </Select>
              </Field>
              <fieldset className="col-span-2 space-y-2">
                <legend className="mb-1 text-sm font-medium text-stone-700">{tm.period}</legend>
                <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
                  <span className="text-xs text-stone-500">{t.memories.from}</span>
                  <DateSelect label={t.memories.from} hideLabel name="from" text={dateText(t)} defaultValue={filters.from} />
                  <span className="text-xs text-stone-500">{t.memories.to}</span>
                  <DateSelect label={t.memories.to} hideLabel name="to" text={dateText(t)} defaultValue={filters.to} />
                </div>
              </fieldset>
            </div>
          </details>
          <div className="flex gap-2">
            <Button type="submit">{t.common.search}</Button>
            <LinkButton href={view === "all" ? "/memories" : `/memories?view=${view}`}>{t.common.clear}</LinkButton>
          </div>
        </form>
      </Card>}
      {view === "all" && filtering && <Notice>{tl.filteredMineOnly}</Notice>}
      {onlyMeByDefault && <p className="px-1 text-xs leading-5 text-stone-500" data-testid="mine-only-me">{tm.mineOnlyMe}</p>}
      {days.length === 0 ? (
        <Empty>{view === "friends" ? tl.friendsEmpty : t.memories.empty}</Empty>
      ) : (
        <Timeline me={{ name: (await getAccount(uid)).profile.displayName, src: (await myAvatarUrl(uid)) ?? undefined, type: await myTint(uid) }} t={t} locale={locale} tz={tz} days={days} comments={counts} previews={previews} media={media} avatars={await avatarUrls(uid, entries.map((e) => e.ownerId))} tints={await typeTints(uid, entries.map((e) => e.ownerId))} />
      )}
      {(page > 0 || hasOlder) && (
        <nav className="flex justify-between text-sm" aria-label="pagination">
          {page > 0 ? <Link className="text-teal-700 underline" href={pageHref(page - 1)}>← {t.memories.newer}</Link> : <span />}
          {hasOlder && <Link className="text-teal-700 underline" href={pageHref(page + 1)}>{t.memories.older} →</Link>}
        </nav>
      )}
      <div aria-hidden className="h-16" />
      {/* Writing is the main thing here: a floating button that opens a composer in place. */}
      <QuickComposer
        canShare={canShare}
        tx={composerText(t)}
        giftBoxes={(await myGiftBoxes(uid)).filter((b) => b.status === "open" && b.my_role !== "child").map((b) => ({ id: b.id, label: t.memories.composer.toGift(b.child_name) }))}
      />
    </Page>
  );
}
