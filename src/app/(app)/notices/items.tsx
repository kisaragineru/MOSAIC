import Link from "next/link";
import { setCardAction } from "@/app/actions/sharing";
import { acceptOfferAction, answerStartAction, dismissOfferAction, storyAskAction } from "@/app/actions/works";
import { dmOpenForConnectionAction } from "@/app/actions/dm";
import { questionReminderAction } from "@/app/actions/notices";
import type { TrayItem } from "@/components/notice-tray";
import { cookies } from "next/headers";
import { PushNudgeButton } from "@/components/push-nudge";
import { dmInbox } from "@/server/services/dm";
import { pushPublicKey } from "@/server/services/push";
import { pairDate, pairEventText } from "@/components/pair-history";
import type { Dict } from "@/lib/i18n/messages/en";
import type { Locale } from "@/lib/i18n/locales";
import { getAccount, getNotificationPrefs } from "@/server/services/account";
import { myCard } from "@/server/services/card";
import { getDaily } from "@/server/services/discovery";
import { lookBackDue, monthKey } from "@/server/services/monthly";
import { noticeKey, questionClosedStreak, visibleNotices } from "@/server/services/notices";
import { recentAnniversaries } from "@/server/services/pair-history";
import { upcomingDates } from "@/server/services/people";
import { myPeerRequests } from "@/server/services/peers";
import { replyInbox } from "@/server/services/replies";
import { listComparisons } from "@/server/services/sharing";
import { getTuvi } from "@/server/services/tuvi";
import { yearStoryDue } from "@/server/services/year-story";
import { markOpensSeen, markStoryPagesSeen, markWriterNewsSeen, myOffers, newOpens, storyGrowth, writerNews } from "@/server/services/works";

/**
 * Everything there is to tell the user, as notices: what's waiting on them first, then days,
 * news, habits. Home shows the ones not closed (its tray); the notices page shows them all.
 * News (opened, connected, new pages) is told once: seeing it here counts.
 */
export async function noticeItems(uid: string, t: Dict, locale: Locale): Promise<{ all: TrayItem[]; showing: Set<string> }> {
  const account = await getAccount(uid);
  const daily = await getDaily(uid);
  const first = daily.slots[0];
  const due = (await upcomingDates(uid, 366)).filter((d) => d.reminderDue);
  const np = await getNotificationPrefs(uid);
  const questionReminder = np.dailyQuestion && !!first && !first.doneToday;
  const chart = (await getTuvi(uid, locale)).chart;
  const comparisons = await listComparisons(uid);
  const waiting = comparisons.filter((c) => c.waitingOn === "you");
  const askedOfMe = (await myPeerRequests(uid)).filter((r) => r.role === "responder" && r.status === "pending");
  const lookBack = await lookBackDue(uid);
  const opens = await newOpens(uid);
  if (opens.length) await markOpensSeen(uid);
  const offers = await myOffers(uid);
  const pendingOffer = offers.find((x) => !x.accepted && !x.dismissed);
  const startAsk = chart ? offers.find((x) => x.startAnswer === null) : undefined;
  const news = await writerNews(uid);
  if (news.connected.length || news.started.length) await markWriterNewsSeen(uid);
  const story = await storyGrowth(uid, locale);
  if (story.added > 0) await markStoryPagesSeen(uid, story.pages);
  const newReplies = (await replyInbox(uid)).filter((x) => x.unread > 0);
  const birthday = await yearStoryDue(uid, daily.day);
  const btn = "rounded-full px-3 py-1.5 text-xs font-semibold";
  const go = (href: string, label: string) => <Link href={href} className="mt-1 inline-block text-xs font-semibold text-teal-800 underline underline-offset-4">{label} →</Link>;
  const anniversaries = await recentAnniversaries(uid, account.profile.timeZone);
  const cardUndecided = (await myCard(uid)) === null;
  // Notifications, suggested when they'd help: this device could turn them on now (its cookie,
  // kept by PushReadiness), someone could write to you, and you've been here a day or have
  // started talking. A nudge: closed, it comes back after 14 days, then 30, then never.
  const pushKey = pushPublicKey();
  const pushAsk =
    !!pushKey &&
    (await cookies()).get("mosaic_push")?.value === "ready" &&
    comparisons.some((c) => c.status === "active") &&
    (Date.now() - account.createdAt.getTime() > 86_400_000 || (await dmInbox(uid)).length > 0);
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
    ...(birthday ? [{ ref: { key: `year:${birthday.year}`, kind: "once" as const }, icon: "🎂", body: <div data-testid="year-notice"><p className="font-semibold">{t.yearStory.notice(birthday.age)}</p>{go(`/me/year/${birthday.year}`, t.yearStory.read)}</div> }] : []),
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
    ...(pushAsk && pushKey ? [{ ref: { key: "push-ask", kind: "nudge" as const }, icon: "🔔", body: (
      <div data-testid="push-ask">
        <p className="font-semibold">{t.notices.pushAsk}</p>
        <p className="text-xs text-stone-500">{t.notices.pushAskSub}</p>
        <PushNudgeButton publicKey={pushKey} label={t.notices.pushAskOn} working={t.settings.push.working} failed={t.settings.push.failed} denied={t.settings.push.denied} />
      </div>
    ) }] : []),
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
  return { all, showing };
}
