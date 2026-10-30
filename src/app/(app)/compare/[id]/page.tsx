import { ConnectedMoment } from "@/components/connected-moment";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TopicsSection } from "@/components/topics-section";
import { listTopics } from "@/server/services/topics";
import { TypePortraits } from "@/components/tuvi-type";
import { connectionCard } from "@/server/services/card";
import { consentAction, recomputeAction } from "@/app/actions/sharing";
import { SHARED_TEXT } from "@/content/manual-text";
import { myManualShare, sharedManualFor } from "@/server/services/manual-share";
import { askPeerAction } from "@/app/actions/peers";
import { listPeople, upcomingDates } from "@/server/services/people";
import { dmOpenForConnectionAction } from "@/app/actions/dm";
import { Avatar } from "@/components/avatar";
import { avatarUrls } from "@/server/services/avatars";
import { connectionFeed } from "@/server/services/memory-share";
import { KIND_ICON } from "@/lib/timeline";
import { Flash } from "@/components/flash";
import { IntroPair } from "@/components/intro-pair";
import { ConnectionPersonForm } from "@/components/connection-person-form";
import { ConnectionSettings } from "@/components/connection-settings";
import { CountUp } from "@/components/count-up";
import { Button, Card, Checkbox, Notice, Pill } from "@/components/ui";
import { Page } from "@/components/page";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import { answerLabel } from "@/lib/discovery/format";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getComparison, listComparisons, PURPOSE_TEXT, SCOPE_DESCRIPTIONS } from "@/server/services/sharing";
import { currentLunarYearFor } from "@/server/services/tuvi";
import { TuviChart } from "@/components/tuvi-chart";
import { TuviPair } from "@/components/tuvi-pair";
import { TuviThemes } from "@/components/tuvi-themes";
import { themeLabels } from "@/lib/tuvi/theme-labels";
import { pairReadings } from "@/lib/compare/tuvi-pair";
import { PairHistoryCard } from "@/components/pair-history";
import { pairHistory } from "@/server/services/pair-history";
import { getAccount } from "@/server/services/account";
import { chartView } from "@/lib/tuvi/chart-view";
import { nominalAge } from "@/lib/tuvi/engine";
import { interpret } from "@/lib/tuvi/interpret";
import { fromSharedChart } from "@/lib/tuvi/shared-chart";
import { myTint, typeTints } from "@/server/services/card";

const SCOPES = ["tuvi", "tuvi_detail", "preferences", "values"] as const;
const QMETA = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));
const ORDER_KIND = ["same", "partly_shared", "different"];
const KIND_STYLE = {
  same: { box: "bg-teal-50 text-teal-900", pill: "bg-teal-100 text-teal-900", ring: "ring-teal-200", bar: "bg-teal-400" },
  partly_shared: { box: "bg-amber-50 text-amber-900", pill: "bg-amber-100 text-amber-900", ring: "ring-amber-200", bar: "bg-amber-400" },
  different: { box: "bg-violet-50 text-violet-900", pill: "bg-violet-100 text-violet-900", ring: "ring-violet-200", bar: "bg-violet-400" },
};
const SHARE_W = ["w-0", "w-1/12", "w-2/12", "w-3/12", "w-4/12", "w-5/12", "w-6/12", "w-7/12", "w-8/12", "w-9/12", "w-10/12", "w-11/12", "w-full"];

const ACTION =
  "flex min-h-16 w-full flex-col items-center justify-center gap-0.5 rounded-2xl bg-white/90 px-1 py-2 text-xs font-semibold text-stone-800 shadow-sm ring-1 ring-stone-200 transition hover:ring-teal-300 active:scale-[0.97]";
const SMALL = "inline-flex shrink-0 items-center rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800";

function Starter({ icon, text, children }: { icon: string; text: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-stone-200/70">
      <span aria-hidden className="text-xl">{icon}</span>
      <p className="min-w-0 flex-1 text-sm leading-6 text-stone-800">{text}</p>
      {children}
    </li>
  );
}

/** Opens the conversation with them, the draft already in the box. */
function TalkButton({ id, draft, label }: { id: string; draft: string; label: string }) {
  return (
    <form action={dmOpenForConnectionAction} className="shrink-0">
      <input type="hidden" name="sessionId" value={id} />
      <input type="hidden" name="back" value={`/compare/${id}`} />
      <input type="hidden" name="draft" value={draft} />
      <button type="submit" className={SMALL}>💬 {label}</button>
    </form>
  );
}

export default async function ComparePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  // Stored results may predate a UI language: fall back to English rather than show nothing.
  const tr = (x: Partial<Record<string, string>> | undefined) => x?.[locale] ?? x?.en ?? "";
  const v = await getComparison(uid, id).catch(() => null);
  if (!v) notFound();
  const myShare = await myManualShare(uid, v.id);
  const theirManual = v.status === "revoked" ? null : await sharedManualFor(uid, v.id, locale);
  const card = v.status === "active" ? await connectionCard(uid, v.id, locale) : null;
  const personId = (await listComparisons(uid)).find((c) => c.id === v.id)?.personId ?? null;
  const relationship = personId ? ((await listPeople(uid)).find((p) => p.id === personId)?.relationship ?? null) : null;
  // What they chose to show me lately (records shared with this connection).
  const theirRecords = v.status === "active" ? (await connectionFeed(uid, { limit: 30 })).filter((x) => x.sessionId === v.id).slice(0, 3) : [];
  const scopeNames = (s: string[]) => s.map((x) => t.compare.scopeNames[x as (typeof SCOPES)[number]] ?? x).join(", ");
  const r = v.result;
  const names = r ? { a: r.participants.a, b: r.participants.b } : null;
  // Whole charts (scope tuvi_detail): read from this viewer's side, me first.
  const detail = r?.tuviDetail ?? null;
  const mineShared = detail ? (v.myRole === "a" ? detail.a : detail.b) : null;
  const theirsShared = detail ? (v.myRole === "a" ? detail.b : detail.a) : null;
  let together = null;
  if (names && mineShared && theirsShared) {
    const lunarYear = await currentLunarYearFor(uid);
    const mine = fromSharedChart(mineShared);
    const theirs = fromSharedChart(theirsShared);
    const theirAge = nominalAge(theirsShared.lunarYear, lunarYear);
    const myName = v.myRole === "a" ? names.a : names.b;
    const ORDER = ["personality", "love", "career", "family", "wealth", "relationships"];
    together = {
      pair: pairReadings(mine, theirs, [myName, v.otherName], [nominalAge(mineShared.lunarYear, lunarYear), theirAge], locale),
      theirs,
      theirAge,
      view: chartView(theirs, locale, t, { birth: false }),
      themes: interpret(theirs, locale, theirAge).filter((x) => x.section !== "cycles").sort((x, y) => ORDER.indexOf(x.section) - ORDER.indexOf(y.section)),
    };
  }
  const myName = names ? (v.myRole === "a" ? names.a : names.b) : "";
  const initial = (n: string) => Array.from(n.trim())[0]?.toUpperCase() ?? "?";
  const pref = r?.preferences ?? null;
  // Me first, then them, whatever side of the session each of us is on.
  const items = pref
    ? [...pref.items]
        .map((i) => ({ ...i, mine: v.myRole === "a" ? i.a : i.b, theirs: v.myRole === "a" ? i.b : i.a }))
        .sort((x, y) => ORDER_KIND.indexOf(x.kind) - ORDER_KIND.indexOf(y.kind))
    : [];
  const count = (k: string) => items.filter((i) => i.kind === k).length;
  const cc = t.compare;
  const active = v.status === "active";
  // Our story: the same for both people.
  const story = active ? await pairHistory(uid, v, (await getAccount(uid)).profile.timeZone) : null;
  const other = (await listComparisons(uid)).find((c) => c.id === v.id)?.otherId ?? null;
  const pics = await avatarUrls(uid, [uid, other]);
  // Conversation starters: from what the two of you share, each one action away.
  const label = (q: string, a: unknown) => answerLabel(QMETA.get(q) ?? pref?.questions[q], a as never, locale);
  const prompt = (q: string) => tr((QMETA.get(q) ?? pref?.questions[q])?.prompt);
  const same = items.find((i) => i.kind === "same");
  const diff = items.find((i) => i.kind === "different");
  const date = personId && active ? (await upcomingDates(uid, 30)).filter((d) => d.personId === personId).sort((a, b) => a.daysUntil - b.daysUntil)[0] : undefined;
  const theirsOnlyFirst = pref ? (v.myRole === "a" ? pref.onlyB : pref.onlyA)[0] : undefined;
  return (
    // Back to where this is reached from: the person's own page (notes, gifts), else the people list.
    <Page title={cc.title(v.otherName)} back={personId ? `/people/${personId}` : "/people"}>
      <Flash t={t} sp={sp} />
      {(sp.ok === "connected" || sp.ok === "reached") && v.status !== "revoked" && (
        <ConnectedMoment
          t={t}
          kind={sp.ok === "connected" && active ? "connected" : "reached"}
          sessionId={v.id}
          me={{ name: myName || (await getAccount(uid)).profile.displayName, src: pics.get(uid), type: await myTint(uid) }}
          other={{ name: v.otherName, src: pics.get(other ?? ""), type: (await typeTints(uid, [other])).get(other ?? "") }}
        />
      )}

      {/* Who: the two of you, how you're connected, and where to go on this page. */}
      <section className="rounded-3xl bg-linear-to-br from-rose-50 via-white to-teal-50 p-5 shadow-sm ring-1 ring-white/80">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            <Avatar name={myName || "?"} src={pics.get(uid)} type={await myTint(uid)} className="h-12 w-12 text-lg ring-4 ring-white" />
            {/* Their icon opens my page about them, once they're in My people. */}
            {personId ? (
              <Link href={`/people/${personId}`} aria-label={t.replies.openProfile(v.otherName)} className="shrink-0 rounded-full transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-teal-600">
                <Avatar name={v.otherName} src={pics.get(other ?? "")} type={(await typeTints(uid, [other])).get(other ?? "")} className="h-12 w-12 text-lg ring-4 ring-white" />
              </Link>
            ) : (
              <Avatar name={v.otherName} src={pics.get(other ?? "")} type={(await typeTints(uid, [other])).get(other ?? "")} className="h-12 w-12 text-lg ring-4 ring-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-stone-900">{v.otherName}</p>
            <p className="text-xs text-stone-600">
              {relationship ? `${t.people.relationships[relationship as keyof typeof t.people.relationships] ?? relationship} · ` : ""}
              {v.status === "active" ? cc.statusActive : v.status === "revoked" ? cc.statusEnded : cc.statusPending}
            </p>
          </div>
        </div>
        {theirManual && (
          <Link href={`/compare/${v.id}/manual`} className="mt-4 flex items-center gap-3 rounded-2xl bg-linear-to-br from-amber-50 to-white px-4 py-3 ring-1 ring-amber-100 transition hover:ring-amber-300">
            <span aria-hidden className="text-2xl">📖</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-stone-900">{t.manual.theirTitle(v.otherName)}</span>
              <span className="block text-xs text-stone-600">{SHARED_TEXT.presetName[theirManual.preset][locale]}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-teal-700">{t.manual.theirOpen} →</span>
          </Link>
        )}
        {active && (
          <div className="mt-4 grid grid-cols-4 gap-2" data-testid="connection-actions">
            <form action={dmOpenForConnectionAction}>
              <input type="hidden" name="sessionId" value={v.id} />
              <input type="hidden" name="back" value={`/compare/${v.id}`} />
              <button type="submit" className={ACTION}><span aria-hidden className="text-xl">💬</span>{cc.actMessage}</button>
            </form>
            {personId ? (
              <Link href={`/people/${personId}?gifts=1#gift-ideas`} className={ACTION}><span aria-hidden className="text-xl">🎁</span>{cc.actGift}</Link>
            ) : (
              <a href="#settings" className={ACTION}><span aria-hidden className="text-xl">🎁</span>{cc.actGift}</a>
            )}
            <form action={askPeerAction}>
              <input type="hidden" name="sessionId" value={v.id} />
              <input type="hidden" name="back" value="/me/others" />
              <button type="submit" className={ACTION}><span aria-hidden className="text-xl">💭</span>{cc.actAsk}</button>
            </form>
            {/* Answer a topic together: a way into a conversation. */}
            <a href="#topics" className={ACTION}><span aria-hidden className="text-xl">🗨️</span>{t.topics.action}</a>
          </div>
        )}
      </section>

      {story && <PairHistoryCard h={story} t={t} locale={locale} />}

      {active && <TopicsSection t={t} locale={locale} sessionId={v.id} otherName={v.otherName} topics={await listTopics(uid, v.id, locale)} back={`/compare/${v.id}`} />}

      {v.status === "revoked" && <Notice kind="warning">{cc.ended}</Notice>}

      {/* Not connected on my side yet: one question first, connect or decide later (never a "no" to feel bad about). */}
      {v.status === "pending" && !v.myConsent && (
        <section id="consent" className="scroll-mt-24 space-y-3 rounded-3xl bg-linear-to-br from-teal-50 via-white to-amber-50 p-5 shadow-sm ring-1 ring-teal-100" data-testid="connect-choice">
          <h2 className="text-lg font-bold text-stone-900">🤝 {t.compare.connectAsk(v.otherName)}</h2>
          <p className="text-sm leading-6 text-stone-700">{t.compare.connectLead}</p>
          {v.otherConsented && <p className="text-xs font-semibold text-teal-800">✓ {t.compare.otherConsented}</p>}
          <form action={consentAction}>
            <input type="hidden" name="sessionId" value={v.id} />
            <input type="hidden" name="agree" value="on" />
            <input type="hidden" name="first" value="on" />
            <button type="submit" className="flex min-h-12 w-full items-center justify-center rounded-full bg-teal-700 px-4 text-base font-bold text-white shadow-md transition hover:bg-teal-800 active:scale-[0.98]">
              {t.compare.connectNow}
            </button>
          </form>
          <p className="rounded-2xl bg-white/80 px-3 py-2 text-xs leading-5 text-stone-600">🌱 {t.compare.laterNote(v.otherName)}</p>
          <Link href="/home" className="block text-center text-sm font-semibold text-stone-500 underline">{t.compare.later}</Link>
        </section>
      )}

      {/* Connected on my side: what to show, now or later. */}
      {v.status !== "revoked" && !r && v.myConsent && (
          <Card title={t.compare.chooseTitle}>
            <p className="mb-2 text-xs text-stone-500">{t.compare.chooseLater}</p>
            <p className="mb-3 text-sm text-stone-600">{PURPOSE_TEXT[locale]}</p>
            {v.myConsent && <p className="mb-2 text-sm"><Pill tone="teal">✓</Pill> {t.compare.yourConsent(v.myConsent.scopes.length ? scopeNames(v.myConsent.scopes) : t.compare.noneChosen)}</p>}
            <p className="mb-3 text-sm">{v.otherConsented ? `✓ ${t.compare.otherConsented}` : `⏳ ${t.compare.waiting}`}</p>
            <form id="choose" action={consentAction} className="space-y-2 scroll-mt-24">
              <input type="hidden" name="sessionId" value={v.id} />
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t.compare.scopes}</legend>
                {SCOPES.map((s) => (
                  <Checkbox
                    key={s}
                    name="scopes"
                    value={s}
                    defaultChecked={v.myConsent?.scopes.includes(s)}
                    label={<><b>{t.compare.scopeNames[s]}</b> — <span className="text-stone-600">{SCOPE_DESCRIPTIONS[s][locale]}</span></>}
                  />
                ))}
              </fieldset>
              <Checkbox name="agree" required label={t.compare.agree} />
              <p className="text-xs text-stone-500">{t.compare.bioNote}</p>
              <Button type="submit">{v.myConsent ? t.compare.update : t.compare.give}</Button>
            </form>
          </Card>
      )}

      {/* Getting to know them: their words, their manual, what they shared lately. */}
      {v.status !== "revoked" && (
        <section id="know" className="scroll-mt-20 space-y-3">
          <h2 className="px-1 text-base font-bold text-stone-900">👤 {cc.knowTitle(v.otherName)}</h2>
          {/* Their calling card: the type they show every connection. */}
          {card && card.types.length > 0 && (
            <Card>
              <div data-testid="card-type">
                {card.typeSource === "picked" && <p className="mb-2 text-xs font-semibold text-violet-700">{t.card.typePicked(v.otherName)}</p>}
                <p className="mb-2 text-lg font-black leading-snug text-stone-900">{card.types.map((x) => x.persona).join(" × ")}</p>
                <TypePortraits types={card.types} />
              </div>
            </Card>
          )}
          {v.otherBio || v.otherIntro ? (
            <Card>
              <IntroPair bio={v.otherBio} intro={v.otherIntro} name={v.otherName} t={t} />
            </Card>
          ) : (
            <p className="px-1 text-sm text-stone-500">{cc.noIntro(v.otherName)}</p>
          )}
          {theirRecords.length > 0 && (
            <Card title={`📝 ${cc.theirRecords(v.otherName)}`}>
              <ul className="space-y-2">
                {theirRecords.map((x) => (
                  <li key={x.id} className="rounded-2xl bg-rose-50/50 p-3 ring-1 ring-rose-100">
                    <p className="mb-1 text-xs text-stone-500"><span aria-hidden>{KIND_ICON[x.kind]} </span>{x.effectiveOn}</p>
                    {x.title && <p className="emoji-color text-sm font-semibold text-stone-900">{x.title}</p>}
                    <p className="emoji-color line-clamp-3 whitespace-pre-line text-sm text-stone-800">{x.body}</p>
                    <Link href={`/memories/shared/${x.id}#replies`} className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-stone-200 hover:ring-teal-300">{cc.comment}</Link>
                  </li>
                ))}
              </ul>
              <Link href={`/memories?view=friends&with=${v.id}`} className="mt-2 block text-right text-sm text-teal-700 underline">{cc.moreRecords(v.otherName)} →</Link>
            </Card>
          )}
        </section>
      )}

      {/* Doing something with it: starters that open a message, a comment, a question. */}
      {active && (same || diff || date || theirRecords[0] || theirsOnlyFirst) && (
        <section id="talk" className="scroll-mt-20 space-y-3">
          <h2 className="px-1 text-base font-bold text-stone-900">🤝 {cc.startersTitle(v.otherName)}</h2>
          <p className="px-1 text-xs leading-5 text-stone-500">{cc.startersHelp}</p>
          <ul className="space-y-2" data-testid="starters">
            {date && (
              <Starter icon="🎂" text={cc.starterDate(date.label, date.daysUntil)}>
                {date.daysUntil === 0 ? <TalkButton id={v.id} draft={cc.draftDate(date.label)} label={cc.talk} /> : <Link href={`/people/${personId}?gifts=1#gift-ideas`} className={SMALL}>{cc.giftIdeas} →</Link>}
              </Starter>
            )}
            {theirRecords[0] && (
              <Starter icon={KIND_ICON[theirRecords[0].kind] ?? "📝"} text={`${cc.starterRecord(v.otherName)}${locale === "ja" ? "：" : ": "}${(theirRecords[0].title ?? theirRecords[0].body).slice(0, 40)}`}>
                <Link href={`/memories/shared/${theirRecords[0].id}#replies`} className={SMALL}>{cc.comment}</Link>
              </Starter>
            )}
            {same && (
              <Starter icon="🤝" text={cc.starterSame(prompt(same.questionId), label(same.questionId, same.mine))}>
                <TalkButton id={v.id} draft={cc.draftSame(prompt(same.questionId), label(same.questionId, same.mine))} label={cc.talk} />
              </Starter>
            )}
            {diff && (
              <Starter icon="🔍" text={cc.starterDiff(prompt(diff.questionId), v.otherName, label(diff.questionId, diff.theirs))}>
                <TalkButton id={v.id} draft={cc.draftDiff(prompt(diff.questionId), label(diff.questionId, diff.theirs))} label={cc.talk} />
              </Starter>
            )}
            {theirsOnlyFirst && (
              <Starter icon="❓" text={`${cc.starterAnswer(v.otherName)}${locale === "ja" ? "：" : ": "}${prompt(theirsOnlyFirst)}`}>
                <Link href={`/discover/q/${theirsOnlyFirst}`} className={SMALL}>{cc.answerIt} →</Link>
              </Starter>
            )}
          </ul>
        </section>
      )}

      {/* Side by side: you first, then them. */}
      {v.status !== "revoked" && r && names && (
        <section id="together" className="scroll-mt-20 space-y-3">
          <h2 className="px-1 text-base font-bold text-stone-900">🧩 {cc.togetherTitle}</h2>
          {pref && (
            <Card>
              {items.length === 0 ? (
                <p className="text-sm text-stone-500">{cc.noPref}</p>
              ) : (
                <>
                  {/* The share of each kind, as a bar that fills in, then the counts. */}
                  <div aria-hidden className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-stone-100">
                    {(["same", "partly_shared", "different"] as const).map((k) =>
                      count(k) ? <span key={k} className={`h-full origin-left animate-[growX_.9s_cubic-bezier(.2,.8,.2,1)_both] ${KIND_STYLE[k].bar} ${SHARE_W[Math.round((count(k) / items.length) * 12)]}`} /> : null,
                    )}
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                    {(["same", "partly_shared", "different"] as const).map((k) => (
                      <div key={k} className={`animate-[pop_.45s_ease-out_backwards] rounded-2xl px-2 py-2 ${KIND_STYLE[k].box}`}>
                        <CountUp value={count(k)} className="block text-xl font-bold tabular-nums" />
                        <p className="text-[11px] font-semibold">{k === "same" ? cc.same : k === "partly_shared" ? cc.partly : cc.different}</p>
                      </div>
                    ))}
                  </div>
                  <ul className="stagger space-y-2.5" data-testid="pref-items">
                    {items.map((i) => {
                      // Display text from the current catalog (stored results may predate a language).
                      const q = QMETA.get(i.questionId) ?? pref.questions[i.questionId];
                      const ks = KIND_STYLE[i.kind as keyof typeof KIND_STYLE] ?? KIND_STYLE.different;
                      return (
                        <li key={i.questionId} className={`overflow-hidden rounded-2xl ring-1 ${ks.ring}`}>
                          <div className="flex items-start gap-2 bg-white px-3 pt-3 pb-2">
                            <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${ks.pill}`}>
                              {i.kind === "same" ? cc.same : i.kind === "partly_shared" ? cc.partly : cc.different}
                            </span>
                            <p className="text-sm font-medium leading-6 text-stone-900">{q ? tr(q.prompt) : i.questionId}</p>
                          </div>
                          <dl className="grid grid-cols-2 divide-x divide-stone-100 border-t border-stone-100 bg-stone-50/60 text-sm">
                            <div className="px-3 py-2">
                              <dt className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-teal-800"><span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-100 text-[9px]">{initial(myName)}</span>{cc.you}</dt>
                              <dd className="leading-5 text-stone-900">{answerLabel(q, i.mine, locale)}</dd>
                            </div>
                            <div className="px-3 py-2">
                              <dt className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-rose-800"><span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-100 text-[9px]">{initial(v.otherName)}</span>{v.otherName}</dt>
                              <dd className="leading-5 text-stone-900">{answerLabel(q, i.theirs, locale)}</dd>
                            </div>
                          </dl>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
                  {(pref.onlyA.length > 0 || pref.onlyB.length > 0) && (() => {
                    const prompt = (q: string) => {
                      const m = QMETA.get(q) ?? pref!.questions[q];
                      return m ? tr(m.prompt) : q;
                    };
                    // Only they answered: I can answer to compare. Only I answered: just listed.
                    const theirsOnly = v.myRole === "a" ? pref.onlyB : pref.onlyA;
                    const mineOnly = v.myRole === "a" ? pref.onlyA : pref.onlyB;
                    return (
                      <details className="mt-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm">
                        <summary className="cursor-pointer font-medium text-stone-700">
                          {t.compare.onlyOne} <span className="text-stone-500">({theirsOnly.length + mineOnly.length})</span>
                        </summary>
                        {theirsOnly.length > 0 && (
                          <div className="mt-3">
                            <p className="mb-1.5 text-xs font-semibold text-stone-600">{t.compare.onlyThem(v.otherName, theirsOnly.length)}</p>
                            <p className="mb-2 text-xs text-teal-800">{t.compare.onlyThemHint}</p>
                            <ul className="space-y-1">
                              {theirsOnly.slice(0, 8).map((q) => (
                                <li key={q}>
                                  <Link href={`/discover/q/${q}`} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-stone-800 ring-1 ring-stone-200 hover:ring-teal-300">
                                    <span>{prompt(q)}</span>
                                    <span aria-hidden className="shrink-0 text-teal-700">→</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                            {theirsOnly.length > 8 && (
                              <Link href="/discover/all" className="mt-2 block text-right text-xs font-semibold text-teal-700 underline">{t.compare.onlyThemMore(theirsOnly.length - 8)} →</Link>
                            )}
                          </div>
                        )}
                        {mineOnly.length > 0 && (
                          <div className="mt-3">
                            <p className="mb-1.5 text-xs font-semibold text-stone-600">{t.compare.onlyMe(mineOnly.length)}</p>
                            <ul className="space-y-1">
                              {mineOnly.slice(0, 8).map((q) => (
                                <li key={q} className="rounded-xl bg-white px-3 py-2 text-stone-700 ring-1 ring-stone-200">{prompt(q)}</li>
                              ))}
                            </ul>
                            {mineOnly.length > 8 && <p className="mt-1 text-right text-xs text-stone-500">{t.compare.andMore(mineOnly.length - 8)}</p>}
                          </div>
                        )}
                      </details>
                    );
                  })()}
            </Card>
          )}
              {r.hints.length > 0 && (
                <Card title={t.compare.hints}>
                  <ul className="list-disc space-y-1 pl-5 text-sm">{r.hints.map((h) => <li key={h.ruleId}>{tr(h.text)}</li>)}</ul>
                </Card>
              )}
        </section>
      )}

      {v.status !== "revoked" && r && names && (r.tuvi || together || detail) && (
        <section id="tuvi" className="scroll-mt-20 space-y-3">
          <h2 className="px-1 text-base font-bold text-stone-900">✦ {cc.tuviSection}</h2>
          <p className="px-1 text-xs leading-5 text-stone-500">{tr(r.disclaimer)}</p>
              {r.tuvi && (
                <Card title={t.compare.tuviTitle}>
                  {r.tuvi.available ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">{r.tuvi.observations.map((o) => <li key={o.ruleId}>{tr(o.text)}</li>)}</ul>
                  ) : (
                    <Notice kind="warning">
                      {r.tuvi.missing.includes(v.myRole) ? (
                        <>{t.compare.tuviMissingYou} <a href="/tuvi" className="underline">{t.tuvi.ui.homeStart} →</a></>
                      ) : r.tuvi.missing.length > 0 ? t.compare.tuviMissingThem : t.compare.tuviMissing}
                    </Notice>
                  )}
                </Card>
              )}
              {detail && !together && (
                <Notice kind="warning">
                  {!mineShared ? (
                    <>{t.compare.detailMissingYou} <a href="/tuvi" className="underline">{t.tuvi.ui.homeStart} →</a></>
                  ) : t.compare.detailMissingThem}
                </Notice>
              )}
              {together && (
                <>
                  <Card title={`✦ ${t.compare.pairTitle}`} className="border-rose-200 bg-linear-to-br from-white to-rose-50/60">
                    <p className="mb-3 text-xs text-stone-500">{t.compare.pairNote}</p>
                    <TuviPair
                      readings={together.pair}
                      labels={{
                        lenses: t.compare.lenses,
                        menhPalace: t.compare.menhPalace,
                        prompts: t.compare.pairPrompts,
                        menhTitle: t.compare.menhTitle,
                        timingTitle: t.compare.timingTitle,
                        noMain: t.tuvi.ui.noMain,
                        care: t.compare.pairCare,
                      }}
                    />
                  </Card>
                  <Card title={t.compare.partnerReading(v.otherName)}>
                    <TuviThemes sections={together.themes} labels={themeLabels(t)} />
                  </Card>
                  <Card title={t.compare.partnerChart(v.otherName)}>
                    <TuviChart chart={together.theirs} details={together.view.details} center={together.view.center} currentAge={together.theirAge} cells={together.view.cells} labels={together.view.labels} />
                  </Card>
                </>
              )}
        </section>
      )}

      {/* Everything you decide about this connection. */}
      {/* The one thing to do from here: ask them how they see you. Settings live in People. */}
      {v.status === "pending" && (
        <form action={askPeerAction}>
          <input type="hidden" name="sessionId" value={v.id} />
          <input type="hidden" name="back" value="/me/others" />
          <Button type="submit" variant="secondary" className="w-full">💭 {t.peers.askThis(v.otherName)}</Button>
        </form>
      )}
      {!personId && v.status !== "revoked" && (
        <section id="settings" className="scroll-mt-20 space-y-3">
          <h2 className="px-1 text-base font-bold text-stone-900">⚙️ {cc.settingsTitle}</h2>
          <Card>
            <ConnectionPersonForm t={t} sessionId={v.id} otherName={v.otherName} people={(await listPeople(uid)).filter((p) => !p.connectionSessionId)} />
          </Card>
          <ConnectionSettings t={t} locale={locale} v={v} myShare={myShare} back={`/compare/${v.id}`} />
        </section>
      )}
      {v.status !== "revoked" && r && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/70 px-1 pt-3 text-xs text-stone-500">
          <span>{cc.agreed(scopeNames(r.agreedScopes))}{v.computedAt && ` · ${cc.computedAt(v.computedAt.toISOString().slice(0, 16).replace("T", " "))}`}</span>
          <form action={recomputeAction}>
            <input type="hidden" name="sessionId" value={v.id} />
            <button type="submit" className="rounded-full bg-white px-3 py-1.5 font-semibold text-teal-700 ring-1 ring-stone-200 hover:ring-teal-300">↻ {cc.recompute}</button>
          </form>
        </div>
      )}
    </Page>
  );
}
