import Link from "next/link";
import { setCardAction } from "@/app/actions/sharing";
import { myCard } from "@/server/services/card";
import { acceptOfferAction, answerStartAction, dismissOfferAction } from "@/app/actions/works";
import { markOpensSeen, markWriterNewsSeen, myOffers, newOpens, writerNews } from "@/server/services/works";
import { QuickComposer } from "@/components/quick-composer";
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
  return (
    <Page title={t.home.hello(account.profile.displayName)}>
      <Flash t={t} sp={sp} />
      {!account.profile.starterDismissedAt && <StarterChecklist
        t={t}
        resume={!account.profile.onboardedAt}
        done={{ chart: !!chart, answers: know.parts.answers >= 3, bio: know.parts.bio, record: know.parts.records > 0, connect: comparisons.some((c) => c.status === "active") }}
      />}
      {pendingOffer && (
        <section className="rounded-3xl bg-gradient-to-br from-violet-50 to-amber-50 p-5 shadow-sm ring-1 ring-violet-100" data-testid="offer-home">
          <p className="font-bold text-stone-900">📖 {t.offer.homeTitle(pendingOffer.ownerName)}</p>
          <p className="mt-1 text-sm text-stone-600">「{pendingOffer.title}」</p>
          <p className="mt-2 text-xs leading-5 text-stone-500">{t.offer.askLead}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <form action={acceptOfferAction}>
              <input type="hidden" name="offerId" value={pendingOffer.id} />
              <input type="hidden" name="back" value="/home" />
              <button type="submit" className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-800">{t.offer.connect}</button>
            </form>
            <Link href={`/me/work/received/${pendingOffer.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-800 ring-1 ring-violet-200">{t.offer.read}</Link>
            <form action={dismissOfferAction}>
              <input type="hidden" name="offerId" value={pendingOffer.id} />
              <input type="hidden" name="back" value="/home" />
              <button type="submit" className="px-2 text-sm text-stone-500 underline underline-offset-4">{t.offer.later}</button>
            </form>
          </div>
        </section>
      )}
      {startAsk && (
        <section className="rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-amber-100" data-testid="offer-start">
          <p className="font-semibold text-stone-900">🌱 {t.offer.startAsk(startAsk.ownerName)}</p>
          <form action={answerStartAction} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="offerId" value={startAsk.id} />
            <button type="submit" name="tell" value="1" className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">{t.offer.startTell}</button>
            <button type="submit" name="tell" value="0" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-700 ring-1 ring-stone-200">{t.offer.startKeep}</button>
          </form>
        </section>
      )}
      {(news.connected.length > 0 || news.started.length > 0) && (
        <section className="rounded-3xl bg-teal-50/80 p-4 ring-1 ring-teal-100" data-testid="writer-news">
          {news.connected.map((w, i) => <p key={`c${i}`} className="font-semibold text-teal-950">🤝 {t.offer.newsConnected(w)}</p>)}
          {news.started.map((w, i) => <p key={`s${i}`} className="font-semibold text-teal-950">🌱 {t.offer.newsStarted(w)}</p>)}
        </section>
      )}
      {/* Someone opened the story they were handed: said once. */}
      {opens.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-violet-50 to-amber-50 p-4 ring-1 ring-violet-100" data-testid="work-opened">
          {opens.map((o) => (
            <p key={o.id} className="font-semibold text-violet-950">📖 {t.work.openedHome(o.recipient)}</p>
          ))}
          <Link href="/me/work#links" className="mt-1 inline-block text-sm font-semibold text-violet-800 underline underline-offset-4">{t.work.links} →</Link>
        </section>
      )}
      {/* Accounts from before the calling card: asked once what connections may see from the start. */}
      {(await myCard(uid)) === null && (
        <section className="rounded-3xl bg-teal-50/80 p-5 shadow-sm ring-1 ring-teal-100" data-testid="card-ask">
          <p className="font-bold text-stone-900">🪪 {t.card.askTitle}</p>
          <p className="mt-1 text-sm leading-6 text-stone-600">{t.card.askLead}</p>
          <form action={setCardAction} className="mt-3 flex flex-wrap items-center gap-2">
            <input type="hidden" name="back" value="/home" />
            <button type="submit" name="decide" value="show" className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">{t.card.askShow}</button>
            <button type="submit" name="decide" value="hide" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 hover:ring-stone-300">{t.card.askHide}</button>
            <Link href="/me/privacy#card" className="px-2 text-sm font-semibold text-teal-800 underline underline-offset-4">{t.card.askChoose}</Link>
          </form>
        </section>
      )}
      {/* Anniversaries with the people you're connected to (today, or in the last few days). */}
      {(await recentAnniversaries(uid, account.profile.timeZone)).map((a) => (
        <section key={a.sessionId} className="rounded-3xl bg-linear-to-br from-amber-50 via-rose-50 to-violet-50 p-5 shadow-sm ring-1 ring-amber-100" data-testid="anniversary">
          <p className="font-bold text-stone-900">
            {a.today ? t.pair.anniversaryToday(a.name, pairEventText(a.event, t)) : t.pair.anniversaryRecent(a.name, pairEventText(a.event, t), pairDate(a.event.on, locale))}
          </p>
          <p className="mt-1 text-sm text-stone-600">{t.pair.anniversarySub}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <form action={dmOpenForConnectionAction}>
              <input type="hidden" name="sessionId" value={a.sessionId} />
              <input type="hidden" name="back" value="/home" />
              <Button type="submit">💬 {t.pair.anniversarySend}</Button>
            </form>
            <Link href={`/compare/${a.sessionId}`} className="text-sm font-semibold text-teal-700 underline underline-offset-4">🌱 {t.pair.anniversaryOpen} →</Link>
          </div>
        </section>
      ))}
      {/* Posting: the same sheet as on records. */}
      <QuickComposer trigger="inline" tx={composerText(t)} canShare={(await shareTargets(uid)).length > 0} giftBoxes={(await myGiftBoxes(uid)).filter((b) => b.status === "open" && b.my_role !== "child").map((b) => ({ id: b.id, label: t.memories.composer.toGift(b.child_name) }))} />
      <Card title={t.home.recent}>
        {recent.length === 0 ? (
          <p className="text-sm text-stone-500">{t.memories.empty}</p>
        ) : (
          <div className="space-y-3">
            <Timeline me={{ name: (await getAccount(uid)).profile.displayName, src: (await myAvatarUrl(uid)) ?? undefined }} t={t} locale={locale} tz={account.profile.timeZone} days={recent} compact comments={counts} previews={previews} media={await mediaFor(uid, recent.flatMap((d) => d.items.filter((x) => !x.entry.sealed).map((x) => x.entry.id)))} avatars={await avatarUrls(uid, recent.flatMap((d) => d.items.map((x) => x.entry.ownerId)))} />
            <Link href="/memories" className="block text-right text-sm text-teal-700 underline">{t.memories.timeline.seeAll} →</Link>
          </div>
        )}
      </Card>
      {askedOfMe.map((r) => (
        <Link key={r.id} href={`/others/${r.id}`} className="flex items-center gap-3 rounded-3xl border border-violet-200 bg-violet-50/80 p-4 text-sm text-violet-950 transition hover:shadow-md">
          <span aria-hidden className="text-xl">💭</span>
          <span className="flex-1">{t.peers.homeAsked(r.otherName)}</span>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 font-semibold text-violet-800">{t.peers.homeAnswer} →</span>
        </Link>
      ))}
      {newReplies.length > 0 && (
        <section className="rounded-3xl border border-sky-200 bg-sky-50/80 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-950">
            <span aria-hidden className="text-xl">💬</span>
            {t.replies.homeTitle}
          </h2>
          <ul className="space-y-2">
            {newReplies.slice(0, 3).map((x) => (
              <li key={x.entryId}>
                <Link
                  href={x.iOwn ? `/memories/${x.entryId}#replies` : `/memories/shared/${x.entryId}#replies`}
                  className="block rounded-2xl bg-white px-3.5 py-2.5 text-sm ring-1 ring-sky-100 transition hover:ring-sky-300"
                >
                  <span className="block text-xs text-sky-800">{t.replies.fromOn(x.lastAuthorName ?? t.replies.friendOf(x.ownerName), x.iOwn ? null : x.ownerName)}</span>
                  <span className="line-clamp-2 text-stone-900">{x.lastBody}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {waiting.map((c) => (
        <Link key={c.id} href={`/compare/${c.id}`} className="flex items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-950 transition hover:shadow-md">
          <span aria-hidden className="text-xl">🔗</span>
          <span className="flex-1">{t.home.connectionPending(c.otherName)}</span>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 font-semibold text-rose-800">{t.home.review} →</span>
        </Link>
      ))}
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
      {lookBack && (
        <Link href={`/reflection/${monthKey(lookBack)}`} className="flex items-center justify-between gap-3 rounded-3xl bg-linear-to-br from-sky-50 to-amber-50 px-5 py-4 shadow-sm ring-1 ring-sky-100">
          <span>
            <span className="block font-semibold text-stone-900">🗓 {t.monthly.homeCard(lookBack.month)}</span>
            <span className="block text-xs text-stone-600">{t.monthly.homeCardSub}</span>
          </span>
          <span className="text-sm font-semibold text-teal-700">{t.monthly.open} →</span>
        </Link>
      )}
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
