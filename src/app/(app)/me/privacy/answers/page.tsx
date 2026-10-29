import Link from "next/link";
import { bulkPrivacyAction, privacyAction } from "@/app/actions/discovery";
import { ConnectionLevelList } from "@/components/connection-level-list";
import { Flash } from "@/components/flash";
import { Page } from "@/components/page";
import { Pill } from "@/components/ui";
import { LOCALIZED_BANK } from "@/content/questions-i18n";
import { answerLabel } from "@/lib/discovery/format";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { avatarUrls } from "@/server/services/avatars";
import { typeTints } from "@/server/services/card";
import { privacyOverview } from "@/server/services/privacy";
import { sharedPreview } from "@/server/services/sharing";

const QMETA = new Map(LOCALIZED_BANK.map((q) => [q.id, q]));
const HERE = "/me/privacy/answers";

/**
 * Answers to comparable questions: which ones are shown (one at a time, a section at once, or
 * picked), and with whom preferences and values are compared.
 */
export default async function AnswersPrivacyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const tc = t.connectionLevels;
  const [p, o] = await Promise.all([sharedPreview(uid), privacyOverview(uid)]);
  const ids = o.connections.map((c) => c.otherId);
  const [avatars, tints] = await Promise.all([avatarUrls(uid, ids), typeTints(uid, ids)]);
  const scopes = (["preferences", "values"] as const).map((scope) => ({ scope, items: p.choices.filter((a) => a.scope === scope) }));
  // Picking several answers at once (?pick=1, or ?pick=all with every box ticked).
  const picking = sp.pick === "1" || sp.pick === "all";
  const here = (pick?: string) => `${HERE}${pick ? `?pick=${pick}` : ""}#choices`;
  // Where a change comes back to (still picking, if picking).
  const back = picking ? `${HERE}?pick=1` : HERE;
  const smallBtn = "rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:border-teal-300";
  return (
    <Page title={tc.answersTitle} back="/me/privacy#answers">
      <Flash t={t} sp={sp} />
      <p className="text-sm leading-6 text-stone-600">{tc.answersHelp}</p>

      <section className="space-y-4 rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-white/80">
        <div id="choices" className="scroll-mt-24 space-y-2">
          <h2 className="text-base font-semibold text-stone-900">{tc.whichTitle}</h2>
          <p className="text-xs leading-5 text-stone-500">{tc.whichHelp}</p>
          {p.choices.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" data-testid="pick-bar">
              <Link href={here(picking ? undefined : "1")} scroll={false} className={`rounded-full px-3 py-1 text-xs font-semibold ${picking ? "bg-stone-700 text-white" : "border border-teal-300 bg-white text-teal-800"}`}>
                {picking ? `✓ ${t.preview.pickDone}` : `☑ ${t.preview.pick}`}
              </Link>
              {picking && (
                <Link href={here(sp.pick === "all" ? "1" : "all")} scroll={false} className="text-xs font-semibold text-teal-800 underline underline-offset-4">
                  {sp.pick === "all" ? t.preview.pickNone : t.preview.pickAll}
                </Link>
              )}
            </div>
          )}
        </div>
        {scopes.map(({ scope, items }) => (
          <section key={scope}>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-800">
              <Pill tone={scope === "values" ? "amber" : "teal"}>{t.compare.scopeNames[scope]}</Pill>
              {items.length > 0 && <span className="text-xs font-normal text-stone-500">{t.preview.sharedCount(items.filter((a) => a.shared).length, items.length)}</span>}
              {/* The whole section in one tap, either way. */}
              {!picking && items.length > 0 && (
                <span className="ml-auto flex gap-1.5" data-testid={`bulk-${scope}`}>
                  {items.some((a) => !a.shared) && (
                    <form action={bulkPrivacyAction}>
                      {items.filter((a) => !a.shared).map((a) => <input key={a.responseId} type="hidden" name="responseId" value={a.responseId} />)}
                      <input type="hidden" name="privacy" value="comparable" />
                      <input type="hidden" name="back" value={back} />
                      <button className={smallBtn}>👁 {t.preview.showAll}</button>
                    </form>
                  )}
                  {items.some((a) => a.shared) && (
                    <form action={bulkPrivacyAction}>
                      {items.filter((a) => a.shared).map((a) => <input key={a.responseId} type="hidden" name="responseId" value={a.responseId} />)}
                      <input type="hidden" name="privacy" value="private" />
                      <input type="hidden" name="back" value={back} />
                      <button className={smallBtn}>🔒 {t.preview.hideAll}</button>
                    </form>
                  )}
                </span>
              )}
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
                      {picking && (
                        // Belongs to the picking form below the lists (forms can't nest).
                        <input
                          // A new box when "pick all" flips, so it takes its new default.
                          key={sp.pick}
                          type="checkbox"
                          name="responseId"
                          value={a.responseId}
                          form="bulk-privacy"
                          defaultChecked={sp.pick === "all"}
                          aria-label={q ? q.prompt[locale] : a.questionId}
                          className="h-5 w-5 shrink-0 accent-teal-700"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-stone-600">{q ? q.prompt[locale] : a.questionId}</p>
                        <p className="font-medium text-stone-900">{answerLabel(q, a.answer, locale)}</p>
                      </div>
                      {!picking && <form action={privacyAction} className="shrink-0">
                        <input type="hidden" name="responseId" value={a.responseId} />
                        <input type="hidden" name="privacy" value={a.shared ? "private" : "comparable"} />
                        <input type="hidden" name="back" value={HERE} />
                        <button
                          aria-label={`${q ? q.prompt[locale] : a.questionId}: ${a.shared ? t.preview.makeHidden : t.preview.makeShown}`}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${a.shared ? "bg-teal-700 text-white" : "border border-stone-300 bg-white text-stone-600"}`}
                        >
                          {a.shared ? `👁 ${t.preview.shown}` : `🔒 ${t.preview.hidden}`}
                        </button>
                      </form>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
        {picking && (
          <form id="bulk-privacy" action={bulkPrivacyAction} className="sticky bottom-24 z-10 flex flex-wrap gap-2 rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-stone-200" data-testid="pick-actions">
            <input type="hidden" name="back" value={back} />
            <button name="privacy" value="comparable" className="flex-1 rounded-full bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800">👁 {t.preview.showPicked}</button>
            <button name="privacy" value="private" className="flex-1 rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:border-stone-400">🔒 {t.preview.hidePicked}</button>
          </form>
        )}
      </section>

      <section id="who" className="scroll-mt-20 space-y-3 rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-white/80">
        <h2 className="text-base font-semibold text-stone-900">{tc.whoTitle}</h2>
        <p className="text-xs leading-5 text-stone-500">{tc.whoHelp}</p>
        <ConnectionLevelList t={t} group="answers" connections={o.connections} avatars={avatars} tints={tints} back={HERE} />
      </section>

      <Link href="/me/preview" className="inline-block text-sm font-semibold text-teal-700">👁 {t.me.preview} →</Link>
      <Link href="/me/privacy#answers" className="block text-sm font-semibold text-teal-700">← {tc.back}</Link>
    </Page>
  );
}
