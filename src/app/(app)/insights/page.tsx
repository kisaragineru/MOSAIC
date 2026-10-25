import Link from "next/link";
import { headers } from "next/headers";
import { tendencyFeedbackAction } from "@/app/actions/discovery";
import { Flash } from "@/components/flash";
import { Button, Card, Checkbox, Empty, Input, Notice, Page, Pill, ProgressBar, Select } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listPeople } from "@/server/services/people";
import { reflect, REFLECTION_KINDS, REFLECTION_QUESTIONS, type Reflection } from "@/server/services/reflection";
import { listTendencies } from "@/server/services/tendencies";
import { mosaicLabels, portrait, tileViews } from "@/server/services/mosaic";
import { Mosaic } from "@/components/mosaic";
import { KnowledgeCard } from "@/components/knowledge-card";
import { knowledge } from "@/server/services/knowledge";
import { reading } from "@/server/services/reading";
import { READING } from "@/content/reading-text";
import type { Dict } from "@/lib/i18n/messages/en";
import type { ClaimView } from "@/server/services/tendencies";


export default async function InsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const claims = await listTendencies(uid);
  const p = await portrait(uid);
  const people = await listPeople(uid);
  const know = await knowledge(uid);
  const rd = await reading(uid, locale);
  const rejected = claims.filter((c) => c.userStatus === "rejected");
  let reflection: Reflection | null = null;
  let reflectError: string | null = null;
  // Sending records to the AI provider is only allowed for a form submitted from this site.
  // A cross-site link (where the Lax session cookie is still sent) must never trigger it.
  const sameOriginRequest = (await headers()).get("sec-fetch-site") === "same-origin";
  if (sp.kind) {
    try {
      reflection = await reflect(uid, { kind: sp.kind, personId: sp.personId, locale, useAi: sp.ai === "1" && sameOriginRequest });
    } catch (e) {
      reflectError = (e as { code?: string }).code ?? "invalid_input";
    }
  }
  return (
    <Page title={t.insights.title}>
      <Flash t={t} sp={sp} />
      <KnowledgeCard k={know} t={t} locale={locale} />
      <nav aria-label={t.insights.readTitle} className="grid grid-cols-3 gap-2">
        {([
          ["/me/manual", "📖", t.manual.title, "from-amber-50 to-teal-50"],
          ["/me/others", "💭", t.peers.meLink, "from-violet-50 to-rose-50"],
          ["/reflection", "🗓", t.monthly.title, "from-sky-50 to-amber-50"],
        ] as const).map(([href, icon, label, bg]) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 rounded-2xl bg-linear-to-br ${bg} px-2 py-3 text-center shadow-sm ring-1 ring-white/80 transition hover:shadow-md`}>
            <span aria-hidden className="text-2xl">{icon}</span>
            <span className="text-xs font-semibold leading-tight text-stone-800">{label}</span>
          </Link>
        ))}
      </nav>
      <Card title={t.mosaic.title}>
        <p className="mb-1 text-sm font-semibold text-stone-800">{t.mosaic.summary(p.revealed, p.total)}</p>
        <ProgressBar value={p.revealed} max={p.total} label={t.mosaic.title} className="mb-4" />
        <Mosaic tiles={tileViews(p, t, locale)} labels={mosaicLabels(t, locale)} />
      </Card>
      <section aria-labelledby="reading-title" className="space-y-3 rounded-3xl bg-linear-to-br from-teal-50 via-white to-violet-50 p-5 shadow-sm ring-1 ring-white/80">
        <h2 id="reading-title" className="text-base font-semibold text-stone-900">🔎 {READING.title[locale]}</h2>
        {rd.overview.map((x, i) => <p key={i} className="leading-8 text-stone-800">{x}</p>)}
        {rd.combos.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-violet-700">✦ {READING.combosTitle[locale]}</p>
            {rd.combos.map((c) => (
              <div key={c.title} className="rounded-2xl bg-white/85 p-4 ring-1 ring-violet-100">
                <p className="font-bold text-stone-900">「{c.title}」</p>
                <p className="mt-1 text-sm leading-7 text-stone-700">{c.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      <Card title={t.insights.tendencies}>
        <p className="mb-3 text-sm text-stone-600">{t.insights.tendenciesIntro}</p>
        {rd.cards.length === 0 && rejected.length === 0 ? (
          <Empty>{t.insights.none}</Empty>
        ) : (
          <ul className="space-y-3">
            {rd.cards.map((c) => {
              const claim = claims.find((x) => x.id === c.claimId)!;
              return (
                <li key={c.claimId} id={`t-${c.key}`} className={`scroll-mt-24 space-y-2 rounded-2xl border p-4 target:ring-2 target:ring-teal-400 ${c.kind === "hypothesis" ? "border-dashed border-stone-300 bg-white/60" : "border-stone-200 bg-white/85"}`}>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">{c.name}</span>
                    <span className="font-semibold text-stone-900">{c.pole}</span>
                    <span className="ml-auto">
                      {c.kind === "hypothesis" ? <Pill tone="violet">{READING.hypothesis[locale]}</Pill> : <Pill tone={c.kind === "consistent" ? "teal" : c.kind === "mixed" ? "amber" : "stone"}>{t.insights.states[c.kind]}</Pill>}
                    </span>
                  </p>
                  {c.lead && <p className="text-sm text-violet-800">{c.lead}</p>}
                  <p className={`leading-7 ${c.kind === "hypothesis" ? "text-stone-600" : "text-stone-800"}`}>{c.body}</p>
                  {c.quotes.length > 0 && (
                    <div className="rounded-xl bg-stone-50 p-3">
                      <p className="text-[11px] font-semibold text-stone-500">{READING.yourAnswers[locale]}</p>
                      <ul className="mt-1 space-y-1 text-xs leading-5 text-stone-700">{c.quotes.map((q) => <li key={q}>・{q}</li>)}</ul>
                    </div>
                  )}
                  <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                    <span>{t.insights.basedOn(claim.evidenceCount, claim.contradictCount)} · {t.insights.confidence(Math.round(claim.confidence * 100))}</span>
                    {c.nextQuestionId && (
                      <Link href={`/discover/q/${encodeURIComponent(c.nextQuestionId)}`} className="font-semibold text-teal-700 underline underline-offset-4">
                        {c.kind === "hypothesis" ? READING.confirm(c.need)[locale] : READING.deepen[locale]} →
                      </Link>
                    )}
                  </p>
                  {c.kind !== "hypothesis" && <Feedback claim={claim} t={t} />}
                </li>
              );
            })}
            {rejected.map((c) => (
              <li key={c.id} id={`t-${c.claimKey}`} className="scroll-mt-24 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-500">
                <p><Pill tone="rose">{t.insights.status.rejected}</Pill> {c.statement[locale]}</p>
                <Feedback claim={c} t={t} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t.insights.reflections}>
        <p className="mb-3 text-sm text-stone-600">{t.insights.reflectionsIntro}</p>
        <form method="get" className="space-y-2">
          <Select name="kind" defaultValue={sp.kind ?? "changes"} aria-label={t.insights.reflections}>
            {REFLECTION_KINDS.map((k) => <option key={k} value={k}>{REFLECTION_QUESTIONS[k][locale]}</option>)}
          </Select>
          {people.length > 0 && (
            <Select name="personId" defaultValue={sp.personId ?? ""} aria-label={t.insights.person}>
              <option value="">{t.insights.person}: —</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
            </Select>
          )}
          <Checkbox name="ai" value="1" defaultChecked={sp.ai === "1"} label={t.insights.useAi} />
          <Button type="submit">{t.insights.run}</Button>
        </form>
        {reflectError && <div className="mt-3"><Flash t={t} sp={{ e: reflectError }} /></div>}
        {reflection && (
          <div className="mt-4 space-y-3">
            <h3 className="font-medium">{reflection.question[locale]}</h3>
            {reflection.status === "insufficient" ? (
              <Notice>{t.insights.insufficient}</Notice>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {reflection.findings.map((f, i) => (
                  <li key={i}>
                    {f.text[locale]} <span className="text-xs text-stone-500">[{f.refs.join(", ")}]</span>
                  </li>
                ))}
              </ul>
            )}
            {reflection.ai && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold text-violet-800">{t.insights.aiTitle}</p>
                <p className="whitespace-pre-line">{reflection.ai.text}</p>
              </div>
            )}
            {reflection.aiUnavailableReason && reflection.aiUnavailableReason !== "not_requested" && (
              <Notice kind="warning">{t.insights.aiReasons[reflection.aiUnavailableReason]}</Notice>
            )}
            {reflection.evidence.length > 0 && (
              <details>
                <summary className="cursor-pointer text-sm text-teal-700">{t.insights.evidence} ({reflection.evidence.length})</summary>
                <ul className="mt-2 space-y-1 text-xs text-stone-700">
                  {reflection.evidence.map((e) => (
                    <li key={e.ref}><b>{e.ref}</b> · {e.date} · {e.excerpt}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </Card>
    </Page>
  );
}

/** "Does this fit?" — the user's own judgement, which always wins over the model. */
function Feedback({ claim, t }: { claim: ClaimView; t: Dict }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs text-teal-700">{t.insights.status[claim.userStatus]} · {t.insights.feedbackToggle}</summary>
      <form action={tendencyFeedbackAction} className="mt-2 space-y-2">
        <input type="hidden" name="claimId" value={claim.id} />
        <Input name="note" placeholder={t.insights.note} defaultValue={claim.userNote ?? ""} maxLength={1000} aria-label={t.insights.note} />
        <div className="flex flex-wrap gap-2">
          <Button name="status" value="confirmed" variant="secondary" className="min-h-8 px-2 py-1 text-xs">{t.insights.fits}</Button>
          <Button name="status" value="rejected" variant="secondary" className="min-h-8 px-2 py-1 text-xs">{t.insights.notMe}</Button>
          <Button name="status" value="corrected" variant="secondary" className="min-h-8 px-2 py-1 text-xs">{t.insights.partly}</Button>
        </div>
      </form>
    </details>
  );
}
