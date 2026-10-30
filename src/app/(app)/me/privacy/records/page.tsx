import Link from "next/link";
import { bulkAudienceAction } from "@/app/actions/memories";
import { Flash } from "@/components/flash";
import { SelectAll } from "@/components/select-all";
import { Empty, Pill } from "@/components/ui";
import { Page } from "@/components/page";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listMemories, type MemorySummary } from "@/server/services/memories";
import { privacyOverview } from "@/server/services/privacy";
import { shareTargets } from "@/server/services/memory-share";

const CIRCLES = ["partner", "family", "friend", "colleague"] as const;
const PAGE = 100;
type Show = "shared" | "private" | "all";

/**
 * Every record with who it is shown to, the shared ones first: find what is public at a glance
 * and change many at once, instead of opening each record.
 */
export default async function RecordsAudiencePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const tr = t.recordsAudience;
  const show: Show = sp.show === "private" || sp.show === "all" ? sp.show : "shared";
  const limit = Math.min(Math.max(Number.parseInt(sp.n ?? "", 10) || PAGE, PAGE), 2000);
  const o = await privacyOverview(uid);
  const targets = await shareTargets(uid);
  const names = new Map(targets.map((x) => [x.otherId, x.name]));
  const sharedN = o.records.everyone + CIRCLES.reduce((n, c) => n + o.records.byCircle[c], 0);
  const counts: Record<Show, number> = { shared: sharedN, private: o.records.private, all: sharedN + o.records.private };
  // listMemories pages by 200 at most: gather up to `limit` (+1 to know there's more).
  const rows: MemorySummary[] = [];
  for (let offset = 0; rows.length <= limit; offset += 200) {
    const got = await listMemories(uid, { audience: show === "all" ? "" : show, limit: 200, offset });
    rows.push(...got.filter((m) => m.kind !== "letter_to_future"));
    if (got.length < 200) break;
  }
  const more = rows.length > limit;
  const list = rows.slice(0, limit);
  const who = (m: MemorySummary) =>
    m.visibility === "connections" ? { tone: "teal" as const, text: `🌐 ${t.memories.audience.connections}` }
    : m.visibility === "circles" ? { tone: "amber" as const, text: `👥 ${[...m.circles.map((c) => t.people.relationships[c]), ...m.audience.map((id) => names.get(id)).filter(Boolean)].join(t.common.listSeparator)}` }
    : { tone: "stone" as const, text: `🔒 ${t.memories.audience.private}` };
  const text = (m: MemorySummary) => {
    const s = (m.title || m.body || "").trim().replace(/\s+/g, " ");
    return s.length > 70 ? `${s.slice(0, 68)}…` : s;
  };
  return (
    <Page title={tr.title}>
      <Flash t={t} sp={sp} />
      <p className="text-sm leading-6 text-stone-600">{tr.help}</p>
      <nav className="flex gap-2" aria-label={tr.title}>
        {(["shared", "private", "all"] as const).map((k) => (
          <Link
            key={k}
            href={k === "shared" ? "/me/privacy/records" : `/me/privacy/records?show=${k}`}
            aria-current={show === k ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${show === k ? "bg-teal-700 text-white" : "bg-white/90 text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"}`}
          >
            {tr.tabs[k]} <span className="opacity-75">{tr.count(counts[k])}</span>
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <Empty>{tr.empty[show]}</Empty>
      ) : (
        <form action={bulkAudienceAction} className="space-y-3">
          <input type="hidden" name="show" value={show} />
          <div className="rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-white/80">
            <SelectAll name="id" label={tr.selectAll} />
            <ul className="mt-2 divide-y divide-stone-100" data-testid="audience-list">
              {list.map((m) => {
                const w = who(m);
                return (
                  <li key={m.id} className="flex items-start gap-3 py-3">
                    <input type="checkbox" name="id" value={m.id} id={`r-${m.id}`} className="mt-1 h-4 w-4 shrink-0 accent-teal-700" />
                    <label htmlFor={`r-${m.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block text-xs text-stone-500">{m.timelineOn}</span>
                      <span className="block text-sm text-stone-800">{text(m)}</span>
                      <span className="mt-1 inline-block"><Pill tone={w.tone}>{w.text}</Pill></span>
                    </label>
                    <Link href={`/memories/${m.id}`} className="shrink-0 text-xs font-semibold text-teal-700">{tr.open} →</Link>
                  </li>
                );
              })}
            </ul>
            {more && <Link href={`/me/privacy/records?${show === "shared" ? "" : `show=${show}&`}n=${limit + PAGE}`} className="mt-2 block text-center text-sm font-semibold text-teal-700">{tr.more} ▾</Link>}
          </div>
          {/* Stays in reach while scrolling a long list. */}
          <div className="sticky bottom-24 z-10 flex flex-wrap items-center gap-2 rounded-3xl bg-white/95 p-3 shadow-lg ring-1 ring-stone-200" data-testid="audience-bar">
            <span className="w-full px-1 text-xs font-semibold text-stone-600">{tr.changeTo}</span>
            <select name="visibility" aria-label={t.memories.audience.label} defaultValue={show === "private" ? "connections" : "private"} className="min-w-0 flex-1 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm">
              <option value="private">🔒 {t.memories.audience.private}</option>
              <option value="connections">🌐 {t.memories.audience.connections}</option>
              {CIRCLES.map((c) => <option key={c} value={`circle:${c}`}>👥 {tr.toCircle(t.people.relationships[c])}</option>)}
              {targets.map((x) => <option key={x.otherId} value={`person:${x.otherId}`}>👤 {tr.toCircle(x.name)}</option>)}
            </select>
            <button type="submit" className="shrink-0 rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">{tr.apply}</button>
          </div>
        </form>
      )}
      <Link href="/me/privacy#records" className="inline-block text-sm font-semibold text-teal-700">← {tr.back}</Link>
    </Page>
  );
}
