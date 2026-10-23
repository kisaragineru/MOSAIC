import Link from "next/link";
import { Card, Page, Pill } from "@/components/ui";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import { answerLabel } from "@/lib/discovery/format";
import { getT } from "@/lib/i18n/server";
import { BRANCHES, ELEMENT_NAMES, STEMS } from "@/lib/tuvi/canchi";
import { requireUser } from "@/server/auth/session";
import { sharedPreview } from "@/server/services/sharing";

const QMETA = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));

/** What another person could see of you, laid out in the order they would see it. */
export default async function PreviewPage() {
  const uid = await requireUser();
  const { t, locale } = await getT();
  const p = await sharedPreview(uid);
  const initial = Array.from(p.displayName.trim())[0]?.toUpperCase() ?? "?";
  const scopes = (["preferences", "values"] as const).map((scope) => ({ scope, items: p.answers.filter((a) => a.scope === scope) }));
  return (
    <Page title={t.preview.title} back="/me">
      <p className="text-sm text-stone-600">{t.preview.intro}</p>

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
            {p.bio ? (
              <p className="whitespace-pre-line rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-800">{p.bio}</p>
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
          {scopes.map(({ scope, items }) => (
            <section key={scope}>
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-stone-800">
                <Pill tone={scope === "values" ? "amber" : "teal"}>{t.compare.scopeNames[scope]}</Pill>
                {items.length > 0 && <span className="text-xs font-normal text-stone-500">{t.preview.answers(items.length)}</span>}
              </p>
              {items.length === 0 ? (
                <p className="text-sm text-stone-500">{t.preview.noAnswers}</p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((a) => {
                    const q = QMETA.get(a.questionId);
                    return (
                      <li key={a.questionId} className="rounded-xl border border-stone-200 px-3 py-2 text-sm">
                        <p className="text-stone-600">{q ? q.prompt[locale] : a.questionId}</p>
                        <p className="font-medium text-stone-900">{answerLabel(q?.options ?? null, a.answer, locale)}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
          <Link href="/discover/history" className="inline-block text-sm text-teal-700 underline">{t.preview.changeAnswers} →</Link>
        </div>
      </Card>

      <Card title={`🔒 ${t.preview.never}`}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">{t.preview.neverList.map((x) => <li key={x}>{x}</li>)}</ul>
      </Card>
      <p className="text-xs text-stone-500">{t.preview.note}</p>
    </Page>
  );
}
