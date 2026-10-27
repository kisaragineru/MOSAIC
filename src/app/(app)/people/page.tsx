import { typeTints } from "@/server/services/card";
import { AVATAR_TINT } from "@/lib/tuvi/type-theme";
import Link from "next/link";
import { ConnectionPersonForm } from "@/components/connection-person-form";
import { avatarUrls } from "@/server/services/avatars";
import { Flash } from "@/components/flash";
import { Button, Card, Empty, Field, Input, Page, Pill, Select } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listPeople, peopleSummaries } from "@/server/services/people";
import { PersonComposer } from "@/components/person-composer";
import { listComparisons } from "@/server/services/sharing";

const RELS = ["family", "partner", "friend", "colleague", "other"] as const;
const REL_ICON: Record<string, string> = { all: "✨", family: "🏠", partner: "💞", friend: "🤝", colleague: "💼", other: "🙂" };
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
  // Connected people show their own photo (when they have one).
  const pics = await avatarUrls(uid, connections.filter((c) => c.status === "active").map((c) => c.otherId));
  const photoOf = (personId: string) => {
    const c = connections.find((x) => x.personId === personId && x.status === "active");
    return c?.otherId ? (pics.get(c.otherId) ?? null) : null;
  };
  // Without a photo: their type's colours (a connection whose card shows it), else the relationship's.
  const tints = await typeTints(uid, connections.filter((c) => c.status === "active").map((c) => c.otherId));
  const tintOf = (personId: string) => {
    const c = connections.find((x) => x.personId === personId && x.status === "active");
    const ty = c?.otherId ? tints.get(c.otherId) : undefined;
    return ty ? `bg-linear-to-br ${AVATAR_TINT[ty]} text-stone-800` : null;
  };
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
        <nav aria-label={t.people.relationship} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {(["all", ...RELS] as const).filter((r) => r === "all" || summaries.some((x) => x.relationship === r)).map((r) => {
            const n = r === "all" ? summaries.length : summaries.filter((x) => x.relationship === r).length;
            const on = rel === r;
            return (
              <Link key={r} href={r === "all" ? "/people" : `/people?rel=${r}`} aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${on ? "bg-teal-700 text-white shadow-md shadow-teal-900/20" : "bg-white text-stone-700 shadow-sm ring-1 ring-stone-200 hover:ring-teal-300"}`}>
                <span aria-hidden>{REL_ICON[r]}</span>
                {r === "all" ? t.common.all : t.people.relationships[r]}
                <span className={`rounded-full px-1.5 text-xs ${on ? "bg-white/25" : "bg-stone-100 text-stone-500"}`}>{n}</span>
              </Link>
            );
          })}
        </nav>
      )}
      {people.length === 0 ? (
        <Empty>{t.people.empty}</Empty>
      ) : (
        <ul className="stagger space-y-3" aria-label={t.people.title}>
          {shown.map((p) => {
            const tone = REL_TONE[p.relationship] ?? REL_TONE.other!;
            const empty = !p.nextDate && !p.latest && p.loves.length === 0;
            return (
              <li key={p.id} className="relative">
                {/* The panel opens the person; the gear (a sibling, not nested) opens their settings. */}
                <Link href={`/people/${p.id}`} className="flex gap-3.5 rounded-3xl bg-white p-4 pr-14 shadow-sm ring-1 ring-stone-200/70 transition hover:shadow-md hover:ring-teal-300">
                  {photoOf(p.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoOf(p.id)!} alt="" width={112} height={112} className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <span aria-hidden className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold ${tintOf(p.id) ?? tone.avatar}`}>
                      {Array.from(p.nickname.trim())[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-base font-bold text-stone-900">{p.nickname}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.pill}`}>{t.people.relationships[p.relationship as (typeof RELS)[number]] ?? p.relationship}</span>
                      {p.connected && (
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                          <span aria-hidden>🔗 </span>
                          {t.people.connected}
                        </span>
                      )}
                    </span>
                    <span className="mt-2 block space-y-1 text-sm leading-5 text-stone-700">
                      {p.nextDate && (
                        <span className={`flex gap-2 ${p.nextDate.daysUntil <= 14 ? "font-semibold text-rose-700" : ""}`}>
                          <span aria-hidden className="w-4 shrink-0 text-center">{p.nextDate.kind === "birthday" ? "🎂" : "📅"}</span>
                          <span className="min-w-0 truncate">{p.nextDate.label} · {md(p.nextDate.date)}（{t.home.inDays(p.nextDate.daysUntil)}）</span>
                        </span>
                      )}
                      {p.latest && (
                        <span className="flex gap-2"><span aria-hidden className="w-4 shrink-0 text-center">🕊</span><span className="min-w-0 truncate">{p.latest.text}</span></span>
                      )}
                      {p.loves.length > 0 && (
                        <span className="flex gap-2"><span aria-hidden className="w-4 shrink-0 text-center">♡</span><span className="min-w-0 truncate">{p.loves.join(locale === "ja" ? "・" : ", ")}</span></span>
                      )}
                      {empty && <span className="block text-stone-400">{t.people.panelEmpty}</span>}
                    </span>
                    <span className="mt-2 flex gap-3 text-xs text-stone-400">
                      <span title={t.people.notes}>📝 {p.counts.notes}</span>
                      <span title={t.people.events}>📸 {p.counts.events}</span>
                      <span title={t.people.gifts}>🎁 {p.counts.gifts}</span>
                    </span>
                  </span>
                </Link>
                <Link href={`/people/${p.id}/settings`} aria-label={t.people.settingsTitle(p.nickname)}
                  className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-50 text-lg ring-1 ring-stone-200 transition hover:bg-white hover:ring-teal-300">
                  <span aria-hidden>⚙️</span>
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
