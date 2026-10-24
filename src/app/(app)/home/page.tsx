import Link from "next/link";
import { createMemoryAction } from "@/app/actions/memories";
import { DayWatcher } from "@/components/day-watcher";
import { Flash } from "@/components/flash";
import { TimeZoneNotice } from "@/components/time-zone-notice";
import { Button, Card, LinkButton, Page, Pill, Textarea } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount, getNotificationPrefs } from "@/server/services/account";
import { getDaily } from "@/server/services/discovery";
import { listMemories } from "@/server/services/memories";
import { upcomingDates } from "@/server/services/people";
import { listComparisons } from "@/server/services/sharing";
import { myPeerRequests } from "@/server/services/peers";
import { getTuvi } from "@/server/services/tuvi";
import { portrait, tileViews } from "@/server/services/mosaic";
import { Mosaic } from "@/components/mosaic";
import { lifeStages } from "@/lib/tuvi/interpret";
import { STAR_INFO } from "@/lib/tuvi/stars";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const account = await getAccount(uid);
  const daily = await getDaily(uid);
  // A year ahead (366 days, so a date just passed still shows its next occurrence in a leap year).
  const dates = await upcomingDates(uid, 366);
  const recent = await listMemories(uid, { limit: 5 });
  const first = daily.slots[0];
  const due = dates.filter((d) => d.reminderDue);
  const np = await getNotificationPrefs(uid);
  const questionReminder = np.dailyQuestion && !!first && !first.doneToday;
  const tv = await getTuvi(uid, locale);
  const chart = tv.chart;
  const menhStars = chart && chart.menh !== null ? chart.palaces[chart.menh]!.mainStars.map((s) => STAR_INFO[s.id].vi) : [];
  const waiting = (await listComparisons(uid)).filter((c) => c.waitingOn === "you");
  const askedOfMe = (await myPeerRequests(uid)).filter((r) => r.role === "responder" && r.status === "pending");
  const pic = await portrait(uid);
  const nowStage = chart ? lifeStages(chart, locale, tv.currentAge).find((x) => x.state === "current") : undefined;
  return (
    <Page title={t.home.hello(account.profile.displayName)}>
      <Flash t={t} sp={sp} />
      {askedOfMe.map((r) => (
        <Link key={r.id} href={`/others/${r.id}`} className="flex items-center gap-3 rounded-3xl border border-violet-200 bg-violet-50/80 p-4 text-sm text-violet-950 transition hover:shadow-md">
          <span aria-hidden className="text-xl">💭</span>
          <span className="flex-1">{t.peers.homeAsked(r.otherName)}</span>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 font-semibold text-violet-800">{t.peers.homeAnswer} →</span>
        </Link>
      ))}
      {waiting.map((c) => (
        <Link key={c.id} href={`/compare/${c.id}`} className="flex items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-950 transition hover:shadow-md">
          <span aria-hidden className="text-xl">🔗</span>
          <span className="flex-1">{t.home.connectionPending(c.otherName)}</span>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 font-semibold text-rose-800">{t.home.review} →</span>
        </Link>
      ))}
      <Link
        href="/tuvi"
        className="group block overflow-hidden rounded-3xl bg-linear-to-br from-teal-100 via-sky-50 to-violet-200 p-5 text-teal-950 shadow-[0_10px_30px_-14px_rgba(91,70,160,0.35)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
      >
        <span className="text-xs uppercase tracking-[0.2em] text-teal-700">{t.tuvi.ui.homeTitle}</span>
        {chart ? (
          <>
            <span className="mt-1 block text-xl font-semibold">{menhStars.join(" · ") || chart.yearPillar.name}</span>
            {nowStage && (
              <span className="mt-1 block text-sm text-teal-900/80">
                {t.tuvi.ui.nowStage} · {t.tuvi.ui.ageRange(nowStage.from, nowStage.to)} · {nowStage.label}
                {nowStage.role && <span className="block text-teal-700">{nowStage.role}</span>}
              </span>
            )}
            <span className="mt-3 inline-block rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-teal-800 group-hover:bg-white">{t.tuvi.ui.homeOpen} →</span>
          </>
        ) : (
          <>
            <span className="mt-1 block text-sm text-teal-900/80">{t.tuvi.ui.homeEmpty}</span>
            <span className="mt-3 inline-block rounded-full bg-teal-700 px-3 py-1 text-sm font-semibold text-white">{t.tuvi.ui.homeStart} →</span>
          </>
        )}
      </Link>
      {(due.length > 0 || questionReminder) && (
        <Card title={t.home.reminders} className="border-amber-200 bg-amber-50">
          <ul className="space-y-1 text-sm">
            {questionReminder && (
              <li>
                🔔 <Link href="/discover" className="underline">{t.home.todayQuestion}</Link>
              </li>
            )}
            {due.map((d) => (
              <li key={d.id}>
                🔔 {d.label}{d.personName ? ` · ${d.personName}` : ""} — {d.date} ({t.home.inDays(d.daysUntil)})
              </li>
            ))}
          </ul>
        </Card>
      )}
      <DayWatcher day={daily.day} timeZone={daily.timeZone} />
      <TimeZoneNotice saved={daily.timeZone} text={t.home.tzMismatch} action={t.home.tzFix} />
      <Card title={`${t.home.todayQuestion} · ${new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", weekday: "short", timeZone: "UTC" }).format(new Date(`${daily.day}T00:00:00Z`))}`}>
        {first ? (
          <div className="space-y-3">
            <p className="text-lg text-stone-900">{first.question.prompt[locale]}</p>
            <div className="flex flex-wrap items-center gap-2">
              {first.doneToday ? <Pill tone="teal">{t.home.doneToday}</Pill> : <LinkButton href="/discover" variant="primary">{t.home.answerNow}</LinkButton>}
              <Link href="/discover/all" className="text-sm font-semibold text-teal-700 underline underline-offset-4">⚡ {t.discover.allLink}</Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-500">{t.discover.noQuestion}</p>
        )}
      </Card>
      <Link href="/insights" className="block rounded-3xl border border-stone-200/80 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-stone-900">{t.mosaic.title}</span>
          <span className="text-xs text-stone-500">{t.mosaic.summary(pic.revealed, pic.axes)}</span>
        </span>
        <span className="mt-3 block">
          <Mosaic compact tiles={tileViews(pic, t, locale)} labels={{ hint: t.mosaic.hint, evidence: t.mosaic.evidence, levels: t.mosaic.levels }} />
        </span>
        <span className="mt-3 block text-right text-sm font-semibold text-teal-700">{t.mosaic.open} →</span>
      </Link>
      <Card title={t.home.quickNote}>
        <form action={createMemoryAction} className="space-y-2">
          <input type="hidden" name="back" value="/home" />
          <input type="hidden" name="stay" value="1" />
          <input type="hidden" name="kind" value="thought" />
          <Textarea name="body" required rows={3} placeholder={t.home.quickNotePlaceholder} aria-label={t.home.quickNote} />
          <div className="flex justify-between">
            <Link href="/memories/new" className="text-sm text-teal-700 underline">{t.home.writeMore} →</Link>
            <Button type="submit">{t.common.save}</Button>
          </div>
        </form>
      </Card>
      <Card title={t.home.upcoming}>
        {dates.length === 0 ? (
          <p className="text-sm text-stone-500">{t.home.noUpcoming}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {dates.map((d) => (
              <li key={d.id} className="flex justify-between gap-2">
                <span>{d.label}{d.personName ? ` · ${d.personName}` : ""} {d.years !== null && t.home.turning(d.years)}</span>
                <span className="shrink-0 text-stone-500">
                  {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d.date}T00:00:00Z`))} · {t.home.inDays(d.daysUntil)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t.home.recent}>
        {recent.length === 0 ? (
          <p className="text-sm text-stone-500">{t.memories.empty}</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {recent.map((m) => (
              <li key={m.id}>
                <Link href={`/memories/${m.id}`} className="block py-2">
                  <Pill>{t.memories.kinds[m.kind]}</Pill>{" "}
                  <span className="text-sm text-stone-800">{m.sealed ? t.memories.sealed(m.revealOn!) : (m.title ?? m.body ?? "").slice(0, 80)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  );
}
