import { notFound } from "next/navigation";
import Link from "next/link";
import { addPersonFromConnectionAction, consentAction, endComparisonAction, recomputeAction } from "@/app/actions/sharing";
import { askPeerAction } from "@/app/actions/peers";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
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
import { pairReadings } from "@/lib/compare/tuvi-pair";
import { chartView } from "@/lib/tuvi/chart-view";
import { nominalAge } from "@/lib/tuvi/engine";
import { interpret } from "@/lib/tuvi/interpret";
import { fromSharedChart } from "@/lib/tuvi/shared-chart";

const SCOPES = ["tuvi", "tuvi_detail", "preferences", "values"] as const;
const QMETA = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));

export default async function ComparePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  // Stored results may predate a UI language: fall back to English rather than show nothing.
  const tr = (x: Partial<Record<string, string>> | undefined) => x?.[locale] ?? x?.en ?? "";
  const v = await getComparison(uid, id).catch(() => null);
  if (!v) notFound();
  const personId = (await listComparisons(uid)).find((c) => c.id === v.id)?.personId ?? null;
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
  return (
    <Page title={t.compare.title(v.otherName)} back="/share">
      <Flash t={t} sp={sp} />
      {v.otherBio && v.status !== "revoked" && (
        <Card title={t.compare.bioTitle(v.otherName)}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-stone-800">{v.otherBio}</p>
        </Card>
      )}
      {personId ? (
        <Link href={`/people/${personId}`} className="block text-sm font-medium text-teal-700 underline">♡ {t.compare.personLink} →</Link>
      ) : (
        v.status !== "revoked" && (
          <form action={addPersonFromConnectionAction}>
            <input type="hidden" name="sessionId" value={v.id} />
            <Button type="submit" variant="secondary">♡ {t.people.addFromConnection}</Button>
          </form>
        )
      )}
      {v.status !== "revoked" && (
        <form action={askPeerAction}>
          <input type="hidden" name="sessionId" value={v.id} />
          <input type="hidden" name="back" value="/me/others" />
          <Button type="submit" variant="secondary">💭 {t.peers.askThis(v.otherName)}</Button>
        </form>
      )}
      {v.status === "revoked" ? (
        <Notice kind="warning">{t.compare.ended}</Notice>
      ) : (
        <>
          {r && names && (
            <>
              <Notice>{tr(r.disclaimer)}</Notice>
              <p className="text-xs text-stone-500">{t.compare.agreed(scopeNames(r.agreedScopes))}{v.computedAt && ` · ${t.compare.computedAt(v.computedAt.toISOString().slice(0, 16).replace("T", " "))}`}</p>
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
                    <TuviThemes sections={together.themes} labels={{ related: t.tuvi.ui.related, strength: t.tuvi.ui.strength, caution: t.tuvi.ui.caution, notes: t.tuvi.ui.notes }} />
                  </Card>
                  <Card title={t.compare.partnerChart(v.otherName)}>
                    <TuviChart chart={together.theirs} details={together.view.details} center={together.view.center} currentAge={together.theirAge} localNames={together.view.localNames} labels={together.view.labels} />
                  </Card>
                </>
              )}
              {r.preferences && (
                <Card title={t.compare.prefTitle}>
                  {r.preferences.items.length === 0 ? (
                    <p className="text-sm text-stone-500">{t.compare.noPref}</p>
                  ) : (
                    <ul className="space-y-2" data-testid="pref-items">
                      {r.preferences.items.map((i) => {
                        // Display text from the current catalog (stored results may predate a language).
                        const q = QMETA.get(i.questionId) ?? r.preferences!.questions[i.questionId];
                        return (
                          <li key={i.questionId} className="rounded-xl border border-stone-200 p-2 text-sm">
                            <Pill tone={i.kind === "same" ? "teal" : i.kind === "partly_shared" ? "amber" : "violet"}>
                              {i.kind === "same" ? t.compare.same : i.kind === "partly_shared" ? t.compare.partly : t.compare.different}
                            </Pill>{" "}
                            {q ? tr(q.prompt) : i.questionId}
                            <p className="text-xs text-stone-600">
                              {names.a}: {answerLabel(q?.options ?? null, i.a, locale)} · {names.b}: {answerLabel(q?.options ?? null, i.b, locale)}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {(r.preferences.onlyA.length > 0 || r.preferences.onlyB.length > 0) && (
                    <p className="mt-2 text-xs text-stone-500">
                      {t.compare.onlyOne}: {[...r.preferences.onlyA, ...r.preferences.onlyB].map((q) => { const m = QMETA.get(q) ?? r.preferences!.questions[q]; return m ? tr(m.prompt) : q; }).join(" · ")}
                    </p>
                  )}
                </Card>
              )}
              {r.hints.length > 0 && (
                <Card title={t.compare.hints}>
                  <ul className="list-disc space-y-1 pl-5 text-sm">{r.hints.map((h) => <li key={h.ruleId}>{tr(h.text)}</li>)}</ul>
                </Card>
              )}
              <form action={recomputeAction}>
                <input type="hidden" name="sessionId" value={v.id} />
                <Button variant="secondary">{t.compare.recompute}</Button>
              </form>
            </>
          )}
          {r ? (
            <details className="rounded-3xl border border-stone-200/80 bg-white/70 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-stone-700">{t.compare.changeConsent}</summary>
              <div className="mt-3">
          <div>
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
          </div>
              </div>
            </details>
          ) : (
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
          <form action={endComparisonAction}>
            <input type="hidden" name="sessionId" value={v.id} />
            <ConfirmButton message={t.compare.endConfirm}>{t.compare.end}</ConfirmButton>
          </form>
        </>
      )}
    </Page>
  );
}
