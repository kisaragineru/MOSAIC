import Link from "next/link";
import { headers } from "next/headers";
import { tendencyFeedbackAction } from "@/app/actions/discovery";
import { Flash } from "@/components/flash";
import { Button, Card, Checkbox, Empty, Input, Notice, Page, Pill, ProgressBar, Select } from "@/components/ui";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import { answerLabel } from "@/lib/discovery/format";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listPeople } from "@/server/services/people";
import { reflect, REFLECTION_KINDS, REFLECTION_QUESTIONS, type Reflection } from "@/server/services/reflection";
import { listTendencies } from "@/server/services/tendencies";
import { portrait, tileViews } from "@/server/services/mosaic";
import { Mosaic } from "@/components/mosaic";
import { KnowledgeCard } from "@/components/knowledge-card";
import { knowledge } from "@/server/services/knowledge";

const QMAP = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const claims = await listTendencies(uid);
  const p = await portrait(uid);
  const people = await listPeople(uid);
  const know = await knowledge(uid);
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
      <Card title={t.mosaic.title}>
        <p className="mb-1 text-sm font-semibold text-stone-800">{t.mosaic.summary(p.revealed, p.axes)}</p>
        <ProgressBar value={p.revealed} max={p.axes} label={t.mosaic.title} className="mb-4" />
        <Mosaic tiles={tileViews(p, t, locale)} labels={{ hint: t.mosaic.hint, evidence: t.mosaic.evidence, levels: t.mosaic.levels }} />
        <Link href="/me/manual" className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-linear-to-br from-amber-50 to-teal-50 px-4 py-3 ring-1 ring-amber-100 transition hover:shadow-md">
          <span>
            <span className="block font-semibold text-stone-900">📖 {t.manual.open}</span>
            <span className="block text-xs text-stone-600">{t.manual.teaser}</span>
          </span>
          <span aria-hidden className="text-teal-700">→</span>
        </Link>
      </Card>
      <Card title={t.insights.tendencies}>
        <p className="mb-3 text-sm text-stone-600">{t.insights.tendenciesIntro}</p>
        {claims.length === 0 ? (
          <Empty>{t.insights.none}</Empty>
        ) : (
          <ul className="space-y-3">
            {claims.map((c) => (
              <li key={c.id} id={`t-${c.claimKey}`} className="scroll-mt-24 rounded-xl border border-stone-200 p-3 target:ring-2 target:ring-teal-400">
                <div className="flex flex-wrap items-center gap-1">
                  <Pill tone={c.state === "consistent" ? "teal" : c.state === "mixed" ? "amber" : "stone"}>{t.insights.states[c.state]}</Pill>
                  <Pill tone={c.userStatus === "rejected" ? "rose" : c.userStatus === "confirmed" ? "teal" : "stone"}>{t.insights.status[c.userStatus]}</Pill>
                </div>
                <p className={`mt-2 ${c.state === "mixed" || c.state === "insufficient" || c.userStatus === "rejected" ? "text-stone-500" : "text-stone-900"}`}>
                  {c.state === "mixed" ? `${c.statement[locale]} / ?` : c.statement[locale]}
                </p>
                <p className="text-xs text-stone-500">
                  {t.insights.basedOn(c.evidenceCount, c.contradictCount)} · {t.insights.confidence(Math.round(c.confidence * 100))}
                  {c.newestEvidenceAt && ` · ${t.insights.newest(c.newestEvidenceAt.toISOString().slice(0, 10))}`}
                </p>
                {c.userNote && <p className="mt-1 text-sm italic text-stone-600">“{c.userNote}”</p>}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-teal-700">{t.insights.evidence}</summary>
                  <ul className="mt-1 space-y-1 text-xs">
                    {c.evidence.map((e) => {
                      const q = QMAP.get(e.questionId);
                      return (
                        <li key={e.responseId}>
                          {e.polarity > 0 ? "＋" : "－"} {q?.prompt[locale] ?? e.questionId} → {answerLabel(q?.options ?? null, e.answer, locale)} ({e.answeredAt.toISOString().slice(0, 10)},{" "}
                          {e.polarity > 0 ? t.insights.supports : t.insights.contradicts})
                        </li>
                      );
                    })}
                  </ul>
                </details>
                <form action={tendencyFeedbackAction} className="mt-2 space-y-2">
                  <input type="hidden" name="claimId" value={c.id} />
                  <Input name="note" placeholder={t.insights.note} defaultValue={c.userNote ?? ""} maxLength={1000} aria-label={t.insights.note} />
                  <div className="flex flex-wrap gap-2">
                    <Button name="status" value="confirmed" variant="secondary" className="min-h-8 px-2 py-1 text-xs">{t.insights.fits}</Button>
                    <Button name="status" value="rejected" variant="secondary" className="min-h-8 px-2 py-1 text-xs">{t.insights.notMe}</Button>
                    <Button name="status" value="corrected" variant="secondary" className="min-h-8 px-2 py-1 text-xs">{t.insights.partly}</Button>
                  </div>
                </form>
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
