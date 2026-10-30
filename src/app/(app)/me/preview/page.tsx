import Link from "next/link";
import { Card, Pill } from "@/components/ui";
import { Page } from "@/components/page";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import { answerLabel } from "@/lib/discovery/format";
import { getT } from "@/lib/i18n/server";
import { BRANCHES, ELEMENT_NAMES, STEMS } from "@/lib/tuvi/canchi";
import { requireUser } from "@/server/auth/session";
import { sharedPreview } from "@/server/services/sharing";
import { sharedWithEveryone } from "@/server/services/memory-share";
import { KIND_ICON } from "@/lib/timeline";
import { Avatar } from "@/components/avatar";
import { myAvatarUrl } from "@/server/services/avatars";
import { getTuvi } from "@/server/services/tuvi";
import { PhoneCard, PhoneFrame } from "@/components/phone-frame";
import { IntroPair } from "@/components/intro-pair";
import { TuviChart } from "@/components/tuvi-chart";
import { TuviThemes } from "@/components/tuvi-themes";
import { themeLabels } from "@/lib/tuvi/theme-labels";
import { chartView } from "@/lib/tuvi/chart-view";
import { myTint } from "@/server/services/card";

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
  const records = await sharedWithEveryone(uid, 3);
  const photo = await myAvatarUrl(uid);
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
          {/* What their page offers them: the same buttons, shown but not pressable here. */}
          <div className="rounded-2xl bg-linear-to-br from-rose-50 via-white to-teal-50 p-3 ring-1 ring-white" data-testid="phone-actions">
            <div className="flex items-center gap-2">
              <Avatar name={p.displayName} src={photo} type={await myTint(uid)} className="h-9 w-9 text-sm ring-2 ring-white" />
              <p className="truncate font-bold text-stone-900">{p.displayName}</p>
            </div>
            <div aria-hidden className="mt-2 grid grid-cols-4 gap-1.5">
              {[["💬", t.compare.actMessage], ["🎁", t.compare.actGift], ["💭", t.compare.actAsk], ["🗨️", t.topics.action]].map(([i, l]) => (
                <span key={l} className="flex flex-col items-center rounded-xl bg-white/90 py-1.5 text-[10px] font-semibold text-stone-700 ring-1 ring-stone-200"><span className="text-base">{i}</span>{l}</span>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-stone-500">{t.preview.phoneActions}</p>
          </div>
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
              <p className="mb-2 text-[11px] leading-4 text-stone-500">{t.compare.partnerReadingLead(p.displayName)}</p>
              <TuviThemes sections={themes} labels={themeLabels(t)} />
            </PhoneCard>
          )}
          {on.has("tuvi_detail") && tv?.chart && view && (
            <PhoneCard title={t.compare.partnerChart(p.displayName)}>
              <TuviChart chart={tv.chart} details={view.details} center={view.center} currentAge={tv.currentAge} cells={view.cells} labels={view.labels} />
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
                          {p.displayName}: <b className="text-stone-900">{answerLabel(q, a.answer, locale)}</b> · {t.preview.phoneTheirAnswer}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PhoneCard>
          )}
          <PhoneCard title={`📝 ${t.preview.phoneRecordsTitle(p.displayName)}`}>
            {records.length === 0 ? (
              <p className="text-stone-500">{t.preview.phoneNoRecords}</p>
            ) : (
              <ul className="space-y-1.5" data-testid="phone-records">
                {records.map((r) => (
                  <li key={r.id} className="rounded-xl bg-rose-50/50 p-2 ring-1 ring-rose-100">
                    <p className="text-[10px] text-stone-500"><span aria-hidden>{KIND_ICON[r.kind] ?? "📝"} </span>{r.occurredOn ?? r.createdAt.toISOString().slice(0, 10)}</p>
                    {r.title && <p className="emoji-color font-semibold text-stone-900">{r.title}</p>}
                    <p className="emoji-color line-clamp-2 whitespace-pre-line text-stone-800">{r.body}</p>
                    <span aria-hidden className="mt-1 inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-stone-200">{t.compare.comment}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] leading-4 text-stone-500">{t.preview.phoneRecordsHelp}</p>
          </PhoneCard>
          {(on.has("preferences") || on.has("values")) && shownAnswers.length > 0 && <p className="px-1 text-[10px] leading-4 text-stone-500">🤝 {t.preview.phoneStarters}</p>}
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
          <div id="choices" className="scroll-mt-24 space-y-2">
            <p className="text-xs text-stone-500">{t.preview.choicesHelp}</p>
            <Link href="/me/privacy/answers" className="inline-block text-xs font-semibold text-teal-700">{t.preview.changeAnswers} →</Link>
          </div>
          {scopes.map(({ scope, items }) => (
            <section key={scope}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-800">
                <Pill tone={scope === "values" ? "amber" : "teal"}>{t.compare.scopeNames[scope]}</Pill>
                {items.length > 0 && <span className="text-xs font-normal text-stone-500">{t.preview.sharedCount(items.filter((a) => a.shared).length, items.length)}</span>}
              </div>
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
                          <p className="font-medium text-stone-900">{answerLabel(q, a.answer, locale)}</p>
                        </div>
                        <span className={`shrink-0 text-xs font-semibold ${a.shared ? "text-teal-800" : "text-stone-500"}`}>{a.shared ? `👁 ${t.preview.shown}` : `🔒 ${t.preview.hidden}`}</span>
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
