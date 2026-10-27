import Link from "next/link";
import { myTint, typeTints } from "@/server/services/card";
import { QuickComposer } from "@/components/quick-composer";
import { NoticeTray } from "@/components/notice-tray";
import { noticeItems } from "../notices/items";
import { composerText } from "@/components/memory-form";
import { myGiftBoxes } from "@/server/services/gift-boxes";
import { DayWatcher } from "@/components/day-watcher";
import { Flash } from "@/components/flash";
import { TimeZoneNotice } from "@/components/time-zone-notice";
import { Card, LinkButton, Page, Pill } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { getDaily } from "@/server/services/discovery";
import { recentTimeline, shareTargets } from "@/server/services/memory-share";
import { listTendencies } from "@/server/services/tendencies";
import { AXIS_CHAPTER, PEER_POLES } from "@/content/axes";
import { MANUAL_CHAPTERS } from "@/content/manual-text";
import { avatarUrls, myAvatarUrl } from "@/server/services/avatars";
import { replyCounts, replyInbox, replyPreviews } from "@/server/services/replies";
import { mediaFor } from "@/server/services/media";
import { Timeline } from "@/components/timeline";
import { buildTimeline } from "@/lib/timeline";
import { upcomingDates } from "@/server/services/people";
import { getTuvi } from "@/server/services/tuvi";
import { mosaicLabels, portrait, tileViews } from "@/server/services/mosaic";
import { Mosaic } from "@/components/mosaic";
import { KnowledgeCard } from "@/components/knowledge-card";
import { StarterChecklist } from "@/components/starter-checklist";
import { knowledge } from "@/server/services/knowledge";
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
  const recent = buildTimeline(await recentTimeline(uid, 3), account.profile.timeZone);
  const first = daily.slots[0];
  const tv = await getTuvi(uid, locale);
  const chart = tv.chart;
  const menhStars = chart && chart.menh !== null ? chart.palaces[chart.menh]!.mainStars.map((s) => STAR_INFO[s.id].vi) : [];
  const pic = await portrait(uid);
  const know = await knowledge(uid);
  // Stories handed to me: the writer's offer to connect, and (once I have my own chart) whether to tell them.
  // For the writer: who connected through a story, who started their own (said once).
  // The story grows with the records: new pages are mentioned once; once grown, a single question.
  const inbox = await replyInbox(uid);
  const { previews, counts: replyTotals } = await replyPreviews(uid, recent.flatMap((d) => d.items.filter((x) => !x.entry.sealed).map((x) => x.entry.id)));
  const counts = replyCounts(replyTotals, inbox);
  // The manual at a glance, from the tendencies the page already reads (no extra queries).
  const traits = (await listTendencies(uid))
    .filter((c) => c.userStatus !== "rejected" && (c.state === "consistent" || c.state === "emerging"))
    .sort((a, b) => (a.state === b.state ? b.confidence - a.confidence : a.state === "consistent" ? -1 : 1));
  const writtenChapters = MANUAL_CHAPTERS.filter((ch) => traits.some((c) => AXIS_CHAPTER[c.claimKey] === ch)).length;
  const nowStage = chart ? lifeStages(chart, locale, tv.currentAge).find((x) => x.state === "current") : undefined;
  // Everything Home has to tell (see notices/items.tsx): the tray shows what isn't closed.
  const { all, showing } = await noticeItems(uid, t, locale);
  const tray = all.filter((x) => showing.has(x.ref.key));
  return (
    <Page title={t.home.hello(account.profile.displayName)}>
      <Flash t={t} sp={sp} />
      <NoticeTray items={tray} labels={{ title: t.notices.title, closeAll: t.notices.closeAll, close: t.notices.close, more: t.notices.more }} />
      {!account.profile.starterDismissedAt && <StarterChecklist
        t={t}
        resume={!account.profile.onboardedAt}
        done={{ chart: !!chart, answers: know.parts.answers >= 3, bio: know.parts.bio, record: know.parts.records > 0 }}
      />}
      {/* Posting: the same sheet as on records. */}
      <QuickComposer trigger="inline" tx={composerText(t)} canShare={(await shareTargets(uid)).length > 0} giftBoxes={(await myGiftBoxes(uid)).filter((b) => b.status === "open" && b.my_role !== "child").map((b) => ({ id: b.id, label: t.memories.composer.toGift(b.child_name) }))} />
      <Card title={t.home.recent}>
        {recent.length === 0 ? (
          <p className="text-sm text-stone-500">{t.memories.empty}</p>
        ) : (
          <div className="space-y-3">
            <Timeline me={{ name: (await getAccount(uid)).profile.displayName, src: (await myAvatarUrl(uid)) ?? undefined, type: await myTint(uid) }} t={t} locale={locale} tz={account.profile.timeZone} days={recent} compact comments={counts} previews={previews} media={await mediaFor(uid, recent.flatMap((d) => d.items.filter((x) => !x.entry.sealed).map((x) => x.entry.id)))} avatars={await avatarUrls(uid, recent.flatMap((d) => d.items.map((x) => x.entry.ownerId)))} tints={await typeTints(uid, recent.flatMap((d) => d.items.map((x) => x.entry.ownerId)))} />
            <Link href="/memories" className="block text-right text-sm text-teal-700 underline">{t.memories.timeline.seeAll} →</Link>
          </div>
        )}
      </Card>
      {/* What's coming up, right after the latest records. */}
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
      <Link
        href={traits.length ? "/me/manual" : "/discover"}
        className="group block overflow-hidden rounded-3xl bg-linear-to-br from-amber-100 via-rose-50 to-orange-100 p-5 text-amber-950 shadow-[0_10px_30px_-14px_rgba(160,90,40,0.35)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
      >
        <span className="text-xs uppercase tracking-[0.2em] text-amber-800">📖 {t.manual.homeTitle}</span>
        {traits.length ? (
          <>
            <span className="mt-1 block text-xs text-amber-900/70">{t.manual.homeLead}</span>
            <span className="mt-0.5 block text-xl font-semibold leading-snug">
              {traits.slice(0, 3).map((c) => (c.direction === 1 ? PEER_POLES[c.claimKey].pos : PEER_POLES[c.claimKey].neg)[locale]).join(" · ")}
            </span>
            <span className="mt-1 block text-sm text-amber-900/80">{t.manual.written(writtenChapters, MANUAL_CHAPTERS.length)}</span>
            <span className="mt-3 inline-block rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-amber-900 group-hover:bg-white">{t.manual.homeOpen} →</span>
          </>
        ) : (
          <>
            <span className="mt-1 block text-sm text-amber-900/80">{t.manual.homeEmpty}</span>
            <span className="mt-3 inline-block rounded-full bg-amber-700 px-3 py-1 text-sm font-semibold text-white">{t.manual.homeStart} →</span>
          </>
        )}
      </Link>
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
      <KnowledgeCard k={know} t={t} locale={locale} />
      <Link href="/insights" className="block rounded-3xl border border-stone-200/80 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-stone-900">{t.mosaic.title}</span>
          <span className="text-xs text-stone-500">{t.mosaic.summary(pic.revealed, pic.total)}</span>
        </span>
        <span className="mt-3 block">
          <Mosaic compact tiles={tileViews(pic, t, locale)} labels={mosaicLabels(t, locale)} />
        </span>
        <span className="mt-3 block text-right text-sm font-semibold text-teal-700">{t.mosaic.open} →</span>
      </Link>
    </Page>
  );
}
