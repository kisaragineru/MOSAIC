import Link from "next/link";
import { Card, Page, Pill } from "@/components/ui";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import { privacyAction } from "@/app/actions/discovery";
import { answerLabel } from "@/lib/discovery/format";
import { getT } from "@/lib/i18n/server";
import { BRANCHES, ELEMENT_NAMES, STEMS } from "@/lib/tuvi/canchi";
import { requireUser } from "@/server/auth/session";
import { sharedPreview } from "@/server/services/sharing";
import { getTuvi } from "@/server/services/tuvi";
import { PhoneCard, PhoneFrame } from "@/components/phone-frame";
import { IntroPair } from "@/components/intro-pair";
import { TuviChart } from "@/components/tuvi-chart";
import { TuviThemes } from "@/components/tuvi-themes";
import { themeLabels } from "@/lib/tuvi/theme-labels";
import { chartView } from "@/lib/tuvi/chart-view";

const PHONE_SCOPES = ["tuvi", "tuvi_detail", "preferences", "values"] as const;
type PhoneScope = (typeof PHONE_SCOPES)[number];
const THEME_ORDER = ["personality", "love", "career", "family", "wealth", "relationships"];

const QMETA = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));

/** What another person could see of you, laid out in the order they would see it. */
export default async function PreviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const p = await sharedPreview(uid);
  // Which consent scopes the phone shows (all by default); toggled with ?s=a,b
  const on = new Set<PhoneScope>(sp.s === undefined ? PHONE_SCOPES : (sp.s.split(",").filter((x) => (PHONE_SCOPES as readonly string[]).includes(x)) as PhoneScope[]));
  const toggle = (x: PhoneScope) => {
    const next = PHONE_SCOPES.filter((y) => (y === x ? !on.has(y) : on.has(y)));
    return `/me/preview?s=${next.join(",")}#phone`;
  };
  const tv = on.has("tuvi_detail") ? await getTuvi(uid, locale) : null;
  const themes = tv?.chart ? tv.sections.filter((x) => x.section !== "cycles").sort((a, b) => THEME_ORDER.indexOf(a.section) - THEME_ORDER.indexOf(b.section)) : [];
  const view = tv?.chart ? chartView(tv.chart, locale, t, { birth: false }) : null;
  const shownAnswers = p.choices.filter((a) => a.shared && on.has(a.scope));
  const initial = Array.from(p.displayName.trim())[0]?.toUpperCase() ?? "?";
  const scopes = (["preferences", "values"] as const).map((scope) => ({ scope, items: p.choices.filter((a) => a.scope === scope) }));
  return (
    <Page title={t.preview.title} back="/me">
      <p className="text-sm text-stone-600">{t.preview.intro}</p>

      <section id="phone" aria-labelledby="phone-title" className="scroll-mt-20 space-y-3 rounded-3xl bg-linear-to-br from-stone-100 to-violet-50 p-4">
        <h2 id="phone-title" className="text-base font-semibold text-stone-900">📱 {t.preview.phoneTitle}</h2>
        <p className="text-xs leading-relaxed text-stone-600">{t.preview.phoneNote}</p>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-stone-600">{t.preview.phoneScopes}</p>
          <div className="flex flex-wrap gap-1.5">
            {PHONE_SCOPES.map((x) => (
              <Link
                key={x}
                href={toggle(x)}
                scroll={false}
                aria-pressed={on.has(x)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${on.has(x) ? "bg-teal-700 text-white" : "border border-stone-300 bg-white text-stone-500 line-through decoration-stone-400"}`}
              >
                {on.has(x) ? "✓ " : ""}{t.compare.scopeNames[x]}
              </Link>
            ))}
          </div>
        </div>
        <PhoneFrame title={t.compare.title(p.displayName)} label={t.preview.phoneTitle}>
          {(p.bio || p.intro) && (
            <PhoneCard title={t.compare.bioTitle(p.displayName)}>
              <IntroPair bio={p.bio} intro={p.intro} name={p.displayName} t={t} small />
            </PhoneCard>
          )}
          {on.has("tuvi") && (
            <PhoneCard title={t.compare.tuviTitle}>
              {p.tuvi ? (
                <>
                  <dl className="grid grid-cols-3 gap-1 text-center">
                    {[
                      [t.preview.yearCanChi, `${STEMS[p.tuvi.yearStem]} ${BRANCHES[p.tuvi.yearBranch]}`],
                      [t.preview.napAm, ELEMENT_NAMES[p.tuvi.napAmElement][locale]],
                      [t.preview.menh, p.tuvi.menhBranch === null ? "—" : BRANCHES[p.tuvi.menhBranch]],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-violet-50/70 p-1.5">
                        <dt className="text-[10px] leading-tight text-stone-500">{k}</dt>
                        <dd className="text-xs font-bold text-stone-900">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-[11px] text-stone-500">{t.preview.phoneTuviPair}</p>
                </>
              ) : (
                <p className="text-stone-500">{t.preview.tuviNone}</p>
              )}
            </PhoneCard>
          )}
          {on.has("tuvi_detail") && themes.length > 0 && (
            <PhoneCard title={t.compare.partnerReading(p.displayName)}>
              <TuviThemes sections={themes} labels={themeLabels(t)} />
            </PhoneCard>
          )}
          {on.has("tuvi_detail") && tv?.chart && view && (
            <PhoneCard title={t.compare.partnerChart(p.displayName)}>
              <TuviChart chart={tv.chart} details={view.details} center={view.center} currentAge={tv.currentAge} localNames={view.localNames} labels={view.labels} />
            </PhoneCard>
          )}
          {(on.has("preferences") || on.has("values")) && (
            <PhoneCard title={t.compare.prefTitle}>
              {shownAnswers.length === 0 ? (
                <p className="text-stone-500">{t.compare.noPref}</p>
              ) : (
                <ul className="space-y-1.5">
                  {shownAnswers.map((a) => {
                    const q = QMETA.get(a.questionId);
                    return (
                      <li key={a.questionId} className="rounded-xl border border-stone-200 p-2">
                        <p className="text-stone-800">{q ? q.prompt[locale] : a.questionId}</p>
                        <p className="text-[11px] text-stone-600">
                          {p.displayName}: <b className="text-stone-900">{answerLabel(q?.options ?? null, a.answer, locale)}</b> · {t.preview.phoneTheirAnswer}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PhoneCard>
          )}
          {!p.bio && !p.intro && on.size === 0 && <p className="text-center text-stone-500">{t.preview.phoneEmpty}</p>}
        </PhoneFrame>
      </section>

      <Card title={`1. ${t.preview.step1}`}>
        <div className="flex items-center gap-3 rounded-2xl bg-linear-to-br from-teal-50 to-violet-50 p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-200 to-violet-200 text-lg font-bold text-teal-900 ring-2 ring-white">{initial}</span>
          <p className="text-sm text-stone-800">{t.preview.step1Text(p.displayName)}</p>
        </div>
      </Card>

      <Card title={`2. ${t.preview.step2}`}>
        <div className="space-y-4">
          <section>
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-stone-800">
              <Pill tone="rose">{t.preview.bioTitle}</Pill>
              <span className="text-xs font-normal text-stone-500">{t.preview.bioWhen}</span>
            </p>
            {p.bio || p.intro ? (
              <div className="rounded-xl border border-stone-200 px-3 py-2"><IntroPair bio={p.bio} intro={p.intro} name={p.displayName} t={t} /></div>
            ) : (
              <p className="text-sm text-stone-500"><Link href="/me" className="underline">{t.preview.bioNone}</Link></p>
            )}
          </section>
          <section>
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-stone-800"><Pill tone="violet">Tử Vi</Pill></p>
            {p.tuvi ? (
              <dl className="grid grid-cols-3 gap-1.5 text-center">
                {[
                  [t.preview.yearCanChi, `${STEMS[p.tuvi.yearStem]} ${BRANCHES[p.tuvi.yearBranch]}`],
                  [t.preview.napAm, ELEMENT_NAMES[p.tuvi.napAmElement][locale]],
                  [t.preview.menh, p.tuvi.menhBranch === null ? "—" : BRANCHES[p.tuvi.menhBranch]],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-violet-50/70 p-2">
                    <dt className="text-[11px] leading-tight text-stone-500">{k}</dt>
                    <dd className="mt-0.5 text-sm font-bold text-stone-900">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-stone-500">{t.preview.tuviNone}</p>
            )}
          </section>
          <section>
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-stone-800">
              <Pill tone="violet">{t.compare.scopeNames.tuvi_detail}</Pill>
              <span className="text-xs font-normal text-stone-500">{t.preview.detailTitle}</span>
            </p>
            {p.tuvi ? (
              <p className="text-sm text-stone-700">
                {t.preview.detailText} <Link href="/tuvi" className="text-teal-700 underline">{t.preview.detailLink} →</Link>
              </p>
            ) : (
              <p className="text-sm text-stone-500">{t.preview.tuviNone}</p>
            )}
          </section>
          <p className="text-xs text-stone-500">{t.preview.choicesHelp}</p>
          {scopes.map(({ scope, items }) => (
            <section key={scope}>
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-stone-800">
                <Pill tone={scope === "values" ? "amber" : "teal"}>{t.compare.scopeNames[scope]}</Pill>
                {items.length > 0 && <span className="text-xs font-normal text-stone-500">{t.preview.sharedCount(items.filter((a) => a.shared).length, items.length)}</span>}
              </p>
              {items.length === 0 ? (
                <p className="text-sm text-stone-500">
                  {t.preview.noAnswers} <Link href="/discover" className="text-teal-700 underline">{t.preview.answerMore} →</Link>
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((a) => {
                    const q = QMETA.get(a.questionId);
                    return (
                      <li key={a.questionId} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${a.shared ? "border-teal-200 bg-teal-50/50" : "border-stone-200 bg-white/60"}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-stone-600">{q ? q.prompt[locale] : a.questionId}</p>
                          <p className="font-medium text-stone-900">{answerLabel(q?.options ?? null, a.answer, locale)}</p>
                        </div>
                        <form action={privacyAction} className="shrink-0">
                          <input type="hidden" name="responseId" value={a.responseId} />
                          <input type="hidden" name="privacy" value={a.shared ? "private" : "comparable"} />
                          <input type="hidden" name="back" value="/me/preview" />
                          <button
                            aria-label={`${q ? q.prompt[locale] : a.questionId}: ${a.shared ? t.preview.makeHidden : t.preview.makeShown}`}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${a.shared ? "bg-teal-700 text-white" : "border border-stone-300 bg-white text-stone-600"}`}
                          >
                            {a.shared ? `👁 ${t.preview.shown}` : `🔒 ${t.preview.hidden}`}
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      </Card>

      <Card title={`🔒 ${t.preview.never}`}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">{t.preview.neverList.map((x) => <li key={x}>{x}</li>)}</ul>
      </Card>
      <p className="text-xs text-stone-500">{t.preview.note}</p>
    </Page>
  );
}
