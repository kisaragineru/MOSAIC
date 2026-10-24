import Link from "next/link";
import { ConnectionPersonForm } from "@/components/connection-person-form";
import { Flash } from "@/components/flash";
import { Button, Card, Empty, Field, Input, Page, Pill, Select } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listPeople, peopleSummaries } from "@/server/services/people";
import { PersonComposer } from "@/components/person-composer";
import { listComparisons } from "@/server/services/sharing";

const RELS = ["family", "partner", "friend", "colleague", "other"] as const;
const REL_TONE: Record<string, { avatar: string; pill: string }> = {
  family: { avatar: "bg-amber-100 text-amber-900", pill: "bg-amber-50 text-amber-800" },
  partner: { avatar: "bg-rose-100 text-rose-900", pill: "bg-rose-50 text-rose-800" },
  friend: { avatar: "bg-teal-100 text-teal-900", pill: "bg-teal-50 text-teal-800" },
  colleague: { avatar: "bg-sky-100 text-sky-900", pill: "bg-sky-50 text-sky-800" },
  other: { avatar: "bg-stone-100 text-stone-700", pill: "bg-stone-100 text-stone-700" },
};

export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const people = await listPeople(uid);
  const summaries = await peopleSummaries(uid);
  const rel = (RELS as readonly string[]).includes(sp.rel ?? "") ? (sp.rel as (typeof RELS)[number]) : "all";
  // Soon-to-come dates first, then everyone else by name.
  const shown = summaries
    .filter((x) => rel === "all" || x.relationship === rel)
    .sort((a, b) => (a.nextDate?.daysUntil ?? 999) - (b.nextDate?.daysUntil ?? 999) || a.nickname.localeCompare(b.nickname, locale));
  const md = (d: string) => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const connections = await listComparisons(uid);
  const live = new Set(connections.filter((c) => c.status !== "revoked" && c.personId).map((c) => c.personId));
  const unlinked = connections.filter((c) => c.status !== "revoked" && !c.personId);
  return (
    <Page title={t.people.title}>
      <Flash t={t} sp={sp} />
      <p className="text-xs text-stone-500">🔒 {t.people.privateNote}</p>
      {unlinked.length > 0 && (
        <Card title={`🔗 ${t.people.newConnections}`} className="border-teal-200 bg-teal-50/60">
          <p className="mb-2 text-xs text-stone-600">{t.people.newConnectionsHelp}</p>
          <ul className="space-y-2">
            {unlinked.map((c) => (
              <li key={c.id} className="space-y-2 rounded-2xl bg-white p-3">
                <Link href={`/compare/${c.id}`} className="font-medium hover:text-teal-700">{c.otherName}</Link>
                <ConnectionPersonForm t={t} sessionId={c.id} otherName={c.otherName} people={people.filter((p) => !p.connectionSessionId || !live.has(p.id))} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      {people.length > 0 && (
        <nav aria-label={t.people.relationship} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 text-xs">
          {(["all", ...RELS] as const).filter((r) => r === "all" || summaries.some((x) => x.relationship === r)).map((r) => (
            <Link key={r} href={r === "all" ? "/people" : `/people?rel=${r}`} aria-current={rel === r ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 font-medium ring-1 ${rel === r ? "bg-teal-700 text-white ring-teal-700" : "bg-white text-stone-700 ring-stone-200"}`}>
              {r === "all" ? `${t.common.all} ${summaries.length}` : `${t.people.relationships[r]} ${summaries.filter((x) => x.relationship === r).length}`}
            </Link>
          ))}
        </nav>
      )}
      {people.length === 0 ? (
        <Empty>{t.people.empty}</Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-3" aria-label={t.people.title}>
          {shown.map((p) => {
            const tone = REL_TONE[p.relationship] ?? REL_TONE.other!;
            const empty = !p.nextDate && !p.latest && p.loves.length === 0;
            return (
              <li key={p.id}>
                <Link href={`/people/${p.id}`} className="flex h-full flex-col rounded-3xl bg-white p-3.5 shadow-sm ring-1 ring-stone-200/70 transition hover:shadow-md hover:ring-teal-300">
                  <span className="flex items-start gap-2.5">
                    <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold ring-2 ring-white ${tone.avatar}`}>
                      {Array.from(p.nickname.trim())[0]?.toUpperCase() ?? "?"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-stone-900">{p.nickname}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1">
                        <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${tone.pill}`}>{t.people.relationships[p.relationship as (typeof RELS)[number]] ?? p.relationship}</span>
                        {p.connected && (
                          <span className="rounded-full bg-teal-100 px-1.5 py-px text-[10px] font-bold text-teal-800">
                            <span aria-hidden>🔗 </span>
                            {t.people.connected}
                          </span>
                        )}
                      </span>
                    </span>
                  </span>
                  <span className="mt-3 space-y-1.5 text-xs leading-5 text-stone-700">
                    {p.nextDate && (
                      <span className={`flex gap-1.5 ${p.nextDate.daysUntil <= 14 ? "font-semibold text-rose-700" : ""}`}>
                        <span aria-hidden>{p.nextDate.kind === "birthday" ? "🎂" : "📅"}</span>
                        <span className="min-w-0">
                          <span className="line-clamp-1">{p.nextDate.label}</span>
                          <span className="block text-[11px] text-stone-500">{md(p.nextDate.date)} · {t.home.inDays(p.nextDate.daysUntil)}</span>
                        </span>
                      </span>
                    )}
                    {p.latest && (
                      <span className="flex gap-1.5"><span aria-hidden>🕊</span><span className="line-clamp-2 min-w-0">{p.latest.text}</span></span>
                    )}
                    {p.loves.length > 0 && (
                      <span className="flex gap-1.5"><span aria-hidden>♡</span><span className="line-clamp-2 min-w-0">{p.loves.join(locale === "ja" ? "・" : ", ")}</span></span>
                    )}
                    {empty && <span className="block text-stone-400">{t.people.panelEmpty}</span>}
                  </span>
                  <span className="mt-auto flex gap-2.5 pt-3 text-[11px] text-stone-400">
                    <span title={t.people.notes}>📝 {p.counts.notes}</span>
                    <span title={t.people.events}>📸 {p.counts.events}</span>
                    <span title={t.people.gifts}>🎁 {p.counts.gifts}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {live.size > 0 && <p className="text-xs text-stone-500">{t.people.connectedHint}</p>}
      <div aria-hidden className="h-16" />
      <PersonComposer
        tx={{
          add: t.people.addShort,
          title: t.people.add,
          name: t.people.nickname,
          relationship: t.people.relationship,
          relationships: t.people.relationships,
          close: t.memories.composer.close,
          adding: t.people.adding,
        }}
      />
    </Page>
  );
}
