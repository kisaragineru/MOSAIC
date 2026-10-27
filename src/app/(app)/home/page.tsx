import Link from "next/link";
import { setCardAction } from "@/app/actions/sharing";
import { myCard, typeTints } from "@/server/services/card";
import { acceptOfferAction, answerStartAction, dismissOfferAction, storyAskAction } from "@/app/actions/works";
import { markOpensSeen, markStoryPagesSeen, markWriterNewsSeen, myOffers, newOpens, storyGrowth, writerNews } from "@/server/services/works";
import { QuickComposer } from "@/components/quick-composer";
import { NoticeTray, type TrayItem } from "@/components/notice-tray";
import { noticeKey, questionClosedStreak, visibleNotices } from "@/server/services/notices";
import { questionReminderAction } from "@/app/actions/notices";
import { composerText } from "@/components/memory-form";
import { myGiftBoxes } from "@/server/services/gift-boxes";
import { DayWatcher } from "@/components/day-watcher";
import { Flash } from "@/components/flash";
import { TimeZoneNotice } from "@/components/time-zone-notice";
import { Button, Card, LinkButton, Page, Pill, Textarea } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount, getNotificationPrefs } from "@/server/services/account";
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
import { listComparisons } from "@/server/services/sharing";
import { myPeerRequests } from "@/server/services/peers";
import { getTuvi } from "@/server/services/tuvi";
import { mosaicLabels, portrait, tileViews } from "@/server/services/mosaic";
import { Mosaic } from "@/components/mosaic";
import { KnowledgeCard } from "@/components/knowledge-card";
import { StarterChecklist } from "@/components/starter-checklist";
import { pairDate, pairEventText } from "@/components/pair-history";
import { recentAnniversaries } from "@/server/services/pair-history";
import { dmOpenForConnectionAction } from "@/app/actions/dm";
import { knowledge } from "@/server/services/knowledge";
import { lookBackDue, monthKey } from "@/server/services/monthly";
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
  const due = dates.filter((d) => d.reminderDue);
  const np = await getNotificationPrefs(uid);
  const questionReminder = np.dailyQuestion && !!first && !first.doneToday;
  const tv = await getTuvi(uid, locale);
  const chart = tv.chart;
  const menhStars = chart && chart.menh !== null ? chart.palaces[chart.menh]!.mainStars.map((s) => STAR_INFO[s.id].vi) : [];
  const comparisons = await listComparisons(uid);
  const waiting = comparisons.filter((c) => c.waitingOn === "you");
  const askedOfMe = (await myPeerRequests(uid)).filter((r) => r.role === "responder" && r.status === "pending");
  const pic = await portrait(uid);
  const know = await knowledge(uid);
  const lookBack = await lookBackDue(uid);
  const opens = await newOpens(uid);
  if (opens.length) await markOpensSeen(uid);
  // Stories handed to me: the writer's offer to connect, and (once I have my own chart) whether to tell them.
  const offers = await myOffers(uid);
  const pendingOffer = offers.find((x) => !x.accepted && !x.dismissed);
  const startAsk = chart ? offers.find((x) => x.startAnswer === null) : undefined;
  // For the writer: who connected through a story, who started their own (said once).
  const news = await writerNews(uid);
  if (news.connected.length || news.started.length) await markWriterNewsSeen(uid);
  // The story grows with the records: new pages are mentioned once; once grown, a single question.
  const story = await storyGrowth(uid, locale);
  if (story.added > 0) await markStoryPagesSeen(uid, story.pages);
  const inbox = await replyInbox(uid);
  const newReplies = inbox.filter((x) => x.unread > 0);
  const { previews, counts: replyTotals } = await replyPreviews(uid, recent.flatMap((d) => d.items.filter((x) => !x.entry.sealed).map((x) => x.entry.id)));
  const counts = replyCounts(replyTotals, inbox);
  // The manual at a glance, from the tendencies the page already reads (no extra queries).
  const traits = (await listTendencies(uid))
    .filter((c) => c.userStatus !== "rejected" && (c.state === "consistent" || c.state === "emerging"))
    .sort((a, b) => (a.state === b.state ? b.confidence - a.confidence : a.state === "consistent" ? -1 : 1));
  const writtenChapters = MANUAL_CHAPTERS.filter((ch) => traits.some((c) => AXIS_CHAPTER[c.claimKey] === ch)).length;
  const nowStage = chart ? lifeStages(chart, locale, tv.currentAge).find((x) => x.state === "current") : undefined;
  const btn = "rounded-full px-3 py-1.5 text-xs font-semibold";
  const go = (href: string, label: string) => <Link href={href} className="mt-1 inline-block text-xs font-semibold text-teal-800 underline underline-offset-4">{label} →</Link>;
  const anniversaries = await recentAnniversaries(uid, account.profile.timeZone);
  const cardUndecided = (await myCard(uid)) === null;
  // Everything Home has to tell, in one tray: what's waiting on you first, then days, news, habits.
  const all: TrayItem[] = [
    ...(pendingOffer ? [{ ref: { key: noticeKey.offer(pendingOffer.id), kind: "action" as const }, icon: "📖", body: (
      <div data-testid="offer-home">
        <p className="font-semibold">{t.offer.homeTitle(pendingOffer.ownerName)}</p>
        <p className="text-xs text-stone-500">「{pendingOffer.title}」</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <form action={acceptOfferAction}><input type="hidden" name="offerId" value={pendingOffer.id} /><input type="hidden" name="back" value="/home" /><button type="submit" className={`${btn} bg-violet-700 text-white hover:bg-violet-800`}>{t.offer.connect}</button></form>
          <Link href={`/me/work/received/${pendingOffer.id}`} className={`${btn} bg-white text-violet-800 ring-1 ring-violet-200`}>{t.offer.read}</Link>
          <form action={dismissOfferAction}><input type="hidden" name="offerId" value={pendingOffer.id} /><input type="hidden" name="back" value="/home" /><button type="submit" className="px-1 text-xs text-stone-500 underline underline-offset-4">{t.offer.later}</button></form>
        </div>
      </div>
    ) }] : []),
    ...askedOfMe.map((r) => ({ ref: { key: noticeKey.peer(r.id), kind: "action" as const }, icon: "💭", body: <><p>{t.peers.homeAsked(r.otherName)}</p>{go(`/others/${r.id}`, t.peers.homeAnswer)}</> })),
    ...waiting.map((c) => ({ ref: { key: noticeKey.conn(c.id), kind: "action" as const }, icon: "🔗", body: <><p>{t.home.connectionPending(c.otherName)}</p>{go(`/compare/${c.id}`, t.home.review)}</> })),
    ...newReplies.slice(0, 5).map((x) => ({ ref: { key: noticeKey.reply(x.entryId, x.lastAt), kind: "action" as const }, icon: "💬", body: (
      <Link href={x.iOwn ? `/memories/${x.entryId}#replies` : `/memories/shared/${x.entryId}#replies`} className="block">
        <span className="block text-xs text-sky-800">{t.replies.fromOn(x.lastAuthorName ?? t.replies.friendOf(x.ownerName), x.iOwn ? null : x.ownerName)}</span>
        <span className="line-clamp-2">{x.lastBody}</span>
      </Link>
    ) })),
    ...(startAsk ? [{ ref: { key: `start:${startAsk.id}`, kind: "action" as const }, icon: "🌱", body: (
      <div data-testid="offer-start">
        <p className="font-semibold">{t.offer.startAsk(startAsk.ownerName)}</p>
        <form action={answerStartAction} className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="offerId" value={startAsk.id} />
          <button type="submit" name="tell" value="1" className={`${btn} bg-teal-700 text-white hover:bg-teal-800`}>{t.offer.startTell}</button>
          <button type="submit" name="tell" value="0" className={`${btn} bg-white text-stone-700 ring-1 ring-stone-200`}>{t.offer.startKeep}</button>
        </form>
      </div>
    ) }] : []),
    ...(cardUndecided ? [{ ref: { key: "card", kind: "action" as const }, icon: "🪪", body: (
      <div data-testid="card-ask">
        <p className="font-semibold">{t.card.askTitle}</p>
        <p className="text-xs leading-5 text-stone-500">{t.card.askLead}</p>
        <form action={setCardAction} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="back" value="/home" />
          <button type="submit" name="decide" value="show" className={`${btn} bg-teal-700 text-white hover:bg-teal-800`}>{t.card.askShow}</button>
          <button type="submit" name="decide" value="hide" className={`${btn} bg-white text-stone-700 ring-1 ring-stone-200`}>{t.card.askHide}</button>
          <Link href="/me/privacy#card" className="text-xs font-semibold text-teal-800 underline underline-offset-4">{t.card.askChoose}</Link>
        </form>
      </div>
    ) }] : []),
    ...anniversaries.map((a) => ({ ref: { key: `anniv:${a.sessionId}:${daily.day.slice(0, 4)}`, kind: "once" as const }, icon: "🎉", body: (
      <div data-testid="anniversary">
        <p className="font-semibold">{a.today ? t.pair.anniversaryToday(a.name, pairEventText(a.event, t)) : t.pair.anniversaryRecent(a.name, pairEventText(a.event, t), pairDate(a.event.on, locale))}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <form action={dmOpenForConnectionAction}><input type="hidden" name="sessionId" value={a.sessionId} /><input type="hidden" name="back" value="/home" /><button type="submit" className={`${btn} bg-teal-700 text-white hover:bg-teal-800`}>💬 {t.pair.anniversarySend}</button></form>
          <Link href={`/compare/${a.sessionId}`} className="text-xs font-semibold text-teal-700 underline underline-offset-4">{t.pair.anniversaryOpen} →</Link>
        </div>
      </div>
    ) })),
    ...due.map((d) => ({ ref: { key: `date:${d.id}:${d.date}`, kind: "dated" as const, on: d.date }, icon: "📅", body: <p>{d.label}{d.personName ? ` · ${d.personName}` : ""} — {d.date}（{t.home.inDays(d.daysUntil)}）</p> })),
    ...(opens.length ? [{ ref: { key: `opened:${opens.map((o) => o.id).join(",")}`.slice(0, 200), kind: "once" as const }, icon: "📖", body: <div data-testid="work-opened">{opens.map((o) => <p key={o.id} className="font-semibold">{t.work.openedHome(o.recipient)}</p>)}{go("/me/work#links", t.work.links)}</div> }] : []),
    ...(news.connected.length || news.started.length ? [{ ref: { key: `news:${daily.day}`, kind: "once" as const }, icon: "🤝", body: <div data-testid="writer-news">{news.connected.map((w, i) => <p key={`c${i}`}>{t.offer.newsConnected(w)}</p>)}{news.started.map((w, i) => <p key={`s${i}`}>{t.offer.newsStarted(w)}</p>)}</div> }] : []),
    ...(story.ask ? [{ ref: { key: `story-ask:${daily.day.slice(0, 7)}`, kind: "once" as const }, icon: "✉️", body: (
      <div data-testid="story-ask">
        <p className="font-semibold">{t.work.storyAskTitle}</p>
        <p className="text-xs leading-5 text-stone-500">{t.work.storyAskLead}</p>
        <form action={storyAskAction} className="mt-2"><button type="submit" name="go" value="work" className={`${btn} bg-violet-700 text-white hover:bg-violet-800`}>{t.work.storyAskYes}</button></form>
      </div>
    ), close: (
      <form action={storyAskAction} className="shrink-0"><button type="submit" name="go" value="home" className="text-xs text-stone-500 underline underline-offset-4">{t.work.storyAskNo}</button></form>
    ) }] : []),
    ...(!story.ask && story.added > 0 ? [{ ref: { key: `grew:${story.pages}`, kind: "once" as const }, icon: "📖", body: <Link href="/me/manual#sec-novel" className="block" data-testid="story-grew"><span className="block font-semibold">{t.work.storyGrew(story.pages)}</span><span className="block text-xs text-stone-500">{t.work.storyGrewSub}</span></Link> }] : []),
    ...(lookBack ? [{ ref: { key: `look:${monthKey(lookBack)}`, kind: "once" as const }, icon: "🗓", body: <Link href={`/reflection/${monthKey(lookBack)}`} className="block"><span className="block font-semibold">{t.monthly.homeCard(lookBack.month)}</span><span className="block text-xs text-stone-500">{t.monthly.homeCardSub}</span></Link> }] : []),
    ...(questionReminder ? [{ ref: { key: `question:${daily.day}`, kind: "habit" as const }, icon: "🔔", body: <Link href="/discover" className="block font-semibold underline-offset-4 hover:underline">{t.home.todayQuestion}</Link> }] : []),
    // A week of closing today's question: keep the reminder, or stop it (asked, not decided for them).
    ...(np.dailyQuestion && (await questionClosedStreak(uid)) ? [{ ref: { key: `question-ask:${daily.day}`, kind: "once" as const }, icon: "🔕", body: (
      <div data-testid="question-ask">
        <p className="font-semibold">{t.notices.questionAsk}</p>
        <form action={questionReminderAction} className="mt-2 flex flex-wrap gap-2">
          <button type="submit" name="keep" value="1" className={`${btn} bg-teal-700 text-white hover:bg-teal-800`}>{t.notices.questionKeep}</button>
          <button type="submit" name="keep" value="0" className={`${btn} bg-white text-stone-700 ring-1 ring-stone-200`}>{t.notices.questionStop}</button>
        </form>
      </div>
    ), close: <span /> }] : []),
  ];
  const showing = await visibleNotices(uid, all.map((x) => x.ref));
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
            <Timeline me={{ name: (await getAccount(uid)).profile.displayName, src: (await myAvatarUrl(uid)) ?? undefined }} t={t} locale={locale} tz={account.profile.timeZone} days={recent} compact comments={counts} previews={previews} media={await mediaFor(uid, recent.flatMap((d) => d.items.filter((x) => !x.entry.sealed).map((x) => x.entry.id)))} avatars={await avatarUrls(uid, recent.flatMap((d) => d.items.map((x) => x.entry.ownerId)))} tints={await typeTints(uid, recent.flatMap((d) => d.items.map((x) => x.entry.ownerId)))} />
            <Link href="/memories" className="block text-right text-sm text-teal-700 underline">{t.memories.timeline.seeAll} →</Link>
          </div>
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
    </Page>
  );
}
