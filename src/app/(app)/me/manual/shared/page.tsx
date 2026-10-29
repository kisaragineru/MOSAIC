import Link from "next/link";
import { SharedManualView } from "@/components/shared-manual";
import { MANUAL_PRESETS, SHARED_TEXT, type ManualPreset } from "@/content/manual-text";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { sharedManualPreview } from "@/server/services/manual-share";
import { sharedRewriteState, sharedUnits } from "@/server/services/manual-share-rewrite";
import { aiConfigured } from "@/server/ai/claude";
import { getAccount } from "@/server/services/account";
import { ManualRewriter } from "@/components/manual-rewriter";
import { approveSharedRewriteAction, clearSharedRewriteAction, refreshSharedPreviewAction, rewriteSharedUnitAction } from "@/app/actions/manual";

/** My manual as a connection would see it, for each preset. */
export default async function SharedPreviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const preset: ManualPreset = sp.preset === "partner" ? "partner" : "friend";
  const { t, locale } = await getT();
  const m = await sharedManualPreview(uid, preset, locale);
  const sa = t.manual.shareAi;
  const ai = t.manual.ai;
  const state = await sharedRewriteState(uid, preset, locale, m);
  const optIn = (await getAccount(uid)).profile.aiOptIn;
  // The owner checks the rewrite here before anyone else can see it.
  const shown = state && !state.stale ? state.sections : null;
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-28 pt-4">
      <div className="flex items-center gap-3">
        <Link href={sp.back?.startsWith("/compare/") ? sp.back : "/me/manual"} className="rounded-full px-2 py-1 text-stone-500 hover:bg-stone-200" aria-label={t.common.back}>←</Link>
        <p className="flex-1 text-sm font-semibold text-stone-700">👁 {t.manual.previewTitle}</p>
      </div>
      <p className="text-xs text-stone-500">{t.manual.previewNote}</p>
      <div role="tablist" className="flex gap-2">
        {MANUAL_PRESETS.map((p) => (
          <Link
            key={p}
            role="tab"
            aria-selected={p === preset}
            href={`/me/manual/shared?preset=${p}${sp.back ? `&back=${encodeURIComponent(sp.back)}` : ""}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${p === preset ? "bg-teal-700 text-white" : "border border-stone-300 bg-white text-stone-600"}`}
          >
            {SHARED_TEXT.presetName[p][locale]}
          </Link>
        ))}
      </div>
      <section id="share-ai" className="scroll-mt-20 space-y-2 rounded-3xl bg-linear-to-br from-violet-50 to-white p-5 shadow-sm ring-1 ring-violet-100" data-testid="share-ai">
        <h2 className="text-sm font-semibold text-violet-900">✍️ {sa.title}</h2>
        <p className="text-xs leading-5 text-stone-600">{sa.lead}</p>
        {state && (
          <p className={`rounded-xl px-3 py-2 text-xs font-semibold leading-5 ${state.stale ? "bg-amber-50 text-amber-900" : state.approved ? "bg-teal-50 text-teal-900" : "bg-white/80 text-stone-700 ring-1 ring-stone-200"}`}>
            {state.stale ? sa.stale : state.approved ? sa.approved : sa.notApproved}
          </p>
        )}
        {!optIn ? (
          <p className="text-xs leading-5 text-stone-600">{ai.off} <Link href="/settings#ai" className="font-semibold text-teal-700 underline">{ai.offLink} →</Link></p>
        ) : !aiConfigured() ? (
          <p className="text-xs text-stone-500">{ai.reason.not_configured}</p>
        ) : (
          <>
            <ManualRewriter
              sections={sharedUnits(m)}
              label={state ? ai.redo : ai.button}
              labels={{ progress: ai.progress, stay: ai.stay, reasons: ai.reason, fallback: ai.reason.unavailable! }}
              run={rewriteSharedUnitAction.bind(null, preset)}
              refresh={refreshSharedPreviewAction}
            />
            {state && !state.stale && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <form action={approveSharedRewriteAction}>
                  <input type="hidden" name="preset" value={preset} />
                  <input type="hidden" name="approved" value={state.approved ? "0" : "1"} />
                  <button type="submit" className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${state.approved ? "bg-white text-stone-700 ring-1 ring-stone-300" : "bg-teal-700 text-white hover:bg-teal-800"}`}>{state.approved ? sa.withdraw : sa.approve}</button>
                </form>
                <form action={clearSharedRewriteAction}>
                  <input type="hidden" name="preset" value={preset} />
                  <button type="submit" className="text-xs text-stone-500 underline underline-offset-4 hover:text-stone-800">{sa.clear}</button>
                </form>
              </div>
            )}
            <p className="text-[11px] leading-5 text-stone-500">{ai.privacy}</p>
          </>
        )}
      </section>
      <div className="rounded-3xl border-2 border-dashed border-teal-200 p-3">
        <SharedManualView m={m} locale={locale} levels={{ consistent: t.manual.levelConsistent, emerging: t.manual.levelEmerging, mixed: t.manual.levelMixed }} ai={shown} aiNote={sa.previewNote} />
      </div>
    </main>
  );
}
