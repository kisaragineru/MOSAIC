import { notFound } from "next/navigation";
import Link from "next/link";
import { consentAction, recomputeAction } from "@/app/actions/sharing";
import { SHARED_TEXT } from "@/content/manual-text";
import { myManualShare, sharedManualFor } from "@/server/services/manual-share";
import { askPeerAction } from "@/app/actions/peers";
import { listPeople } from "@/server/services/people";
import { connectionFeed } from "@/server/services/memory-share";
import { KIND_ICON } from "@/lib/timeline";
import { Flash } from "@/components/flash";
import { IntroPair } from "@/components/intro-pair";
import { ConnectionPersonForm } from "@/components/connection-person-form";
import { ConnectionSettings } from "@/components/connection-settings";
import { Button, Card, Checkbox, Notice, Page, Pill } from "@/components/ui";
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
import { chartView } from "@/lib/tuvi/chart-view";
import { nominalAge } from "@/lib/tuvi/engine";
import { interpret } from "@/lib/tuvi/interpret";
import { fromSharedChart } from "@/lib/tuvi/shared-chart";

const SCOPES = ["tuvi", "tuvi_detail", "preferences", "values"] as const;
const QMETA = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));
const ORDER_KIND = ["same", "partly_shared", "different"];
const KIND_STYLE = {
  same: { box: "bg-teal-50 text-teal-900", pill: "bg-teal-100 text-teal-900", ring: "ring-teal-200" },
  partly_shared: { box: "bg-amber-50 text-amber-900", pill: "bg-amber-100 text-amber-900", ring: "ring-amber-200" },
  different: { box: "bg-violet-50 text-violet-900", pill: "bg-violet-100 text-violet-900", ring: "ring-violet-200" },
};

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
  return (
    <Page title={cc.title(v.otherName)} back="/share">
      <Flash t={t} sp={sp} />

      {/* Who: the two of you, how you're connected, and where to go on this page. */}
      <section className="rounded-3xl bg-linear-to-br from-rose-50 via-white to-teal-50 p-5 shadow-sm ring-1 ring-white/80">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3" aria-hidden>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-lg font-bold text-teal-900 ring-4 ring-white">{initial(myName || "?")}</span>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-lg font-bold text-rose-900 ring-4 ring-white">{initial(v.otherName)}</span>
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
      </section>

      {v.status === "revoked" && <Notice kind="warning">{cc.ended}</Notice>}

      {/* Not connected yet: deciding what to share is the one thing to do here. */}
      {v.status !== "revoked" && !r && (
          <Card title={t.compare.consentTitle}>
            <p className="mb-3 text-sm text-stone-600">{PURPOSE_TEXT[locale]}</p>
            {v.myConsent && <p className="mb-2 text-sm"><Pill tone="teal">✓</Pill> {t.compare.yourConsent(scopeNames(v.myConsent.scopes))}</p>}
            <p className="mb-3 text-sm">{v.otherConsented ? `✓ ${t.compare.otherConsented}` : `⏳ ${t.compare.waiting}`}</p>
            <form action={consentAction} className="space-y-2">
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
                    {x.title && <p className="text-sm font-semibold text-stone-900">{x.title}</p>}
                    <p className="line-clamp-3 whitespace-pre-line text-sm text-stone-800">{x.body}</p>
                  </li>
                ))}
              </ul>
              <Link href={`/memories?view=friends&with=${v.id}`} className="mt-2 block text-right text-sm text-teal-700 underline">{cc.moreRecords(v.otherName)} →</Link>
            </Card>
          )}
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
                  <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                    {(["same", "partly_shared", "different"] as const).map((k) => (
                      <div key={k} className={`rounded-2xl px-2 py-2 ${KIND_STYLE[k].box}`}>
                        <p className="text-xl font-bold">{count(k)}</p>
                        <p className="text-[11px] font-semibold">{k === "same" ? cc.same : k === "partly_shared" ? cc.partly : cc.different}</p>
                      </div>
                    ))}
                  </div>
                  <ul className="space-y-2.5" data-testid="pref-items">
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
                              <dd className="leading-5 text-stone-900">{answerLabel(q?.options ?? null, i.mine, locale)}</dd>
                            </div>
                            <div className="px-3 py-2">
                              <dt className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-rose-800"><span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-100 text-[9px]">{initial(v.otherName)}</span>{v.otherName}</dt>
                              <dd className="leading-5 text-stone-900">{answerLabel(q?.options ?? null, i.theirs, locale)}</dd>
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
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-stone-500">
            <span>{cc.agreed(scopeNames(r.agreedScopes))}{v.computedAt && ` · ${cc.computedAt(v.computedAt.toISOString().slice(0, 16).replace("T", " "))}`}</span>
            <form action={recomputeAction}>
              <input type="hidden" name="sessionId" value={v.id} />
              <button type="submit" className="rounded-full bg-white px-3 py-1.5 font-semibold text-teal-700 ring-1 ring-stone-200 hover:ring-teal-300">↻ {cc.recompute}</button>
            </form>
          </div>
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
                      }}
                    />
                  </Card>
                  <Card title={t.compare.partnerReading(v.otherName)}>
                    <TuviThemes sections={together.themes} labels={themeLabels(t)} />
                  </Card>
                  <Card title={t.compare.partnerChart(v.otherName)}>
                    <TuviChart chart={together.theirs} details={together.view.details} center={together.view.center} currentAge={together.theirAge} localNames={together.view.localNames} labels={together.view.labels} />
                  </Card>
                </>
              )}
        </section>
      )}

      {/* Everything you decide about this connection. */}
      <section id="settings" className="scroll-mt-20 space-y-3">
        <h2 className="px-1 text-base font-bold text-stone-900">⚙️ {cc.settingsTitle}</h2>
      {personId ? (
        <Link href={`/people/${personId}`} className="block text-sm font-medium text-teal-700 underline">♡ {t.compare.personLink} →</Link>
      ) : (
        v.status !== "revoked" && (
          <Card>
            <ConnectionPersonForm t={t} sessionId={v.id} otherName={v.otherName} people={(await listPeople(uid)).filter((p) => !p.connectionSessionId)} />
          </Card>
        )
      )}
      {v.status !== "revoked" && (
        <form action={askPeerAction}>
          <input type="hidden" name="sessionId" value={v.id} />
          <input type="hidden" name="back" value="/me/others" />
          <Button type="submit" variant="secondary">💭 {t.peers.askThis(v.otherName)}</Button>
        </form>
      )}
      {personId ? (
        <Link href={`/people/${personId}/settings`} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-stone-200/70 hover:ring-teal-300">
          <span>
            <span className="block font-semibold text-stone-900">⚙️ {t.people.settingsTitle(v.otherName)}</span>
            <span className="block text-xs text-stone-600">{cc.settingsMoved}</span>
          </span>
          <span aria-hidden className="text-teal-700">→</span>
        </Link>
      ) : (
        <ConnectionSettings t={t} locale={locale} v={v} myShare={myShare} back={`/compare/${v.id}`} />
      )}
      </section>
    </Page>
  );
}
