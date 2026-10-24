import Link from "next/link";
import { consentAction, endComparisonAction, manualShareAction } from "@/app/actions/sharing";
import { MANUAL_PRESETS, SHARED_TEXT } from "@/content/manual-text";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import { PURPOSE_TEXT, SCOPE_DESCRIPTIONS, type ComparisonView } from "@/server/services/sharing";
import { ConfirmButton } from "./confirm-button";
import { Button, Card, Checkbox, Pill } from "./ui";

const SCOPES = ["tuvi", "tuvi_detail", "preferences", "values"] as const;

/**
 * What you decide about one connection: showing your manual, what you consented to, ending it.
 * Shown in a person's settings when they're in People, else at the end of the connection page;
 * every form comes back to `back`.
 */
export function ConnectionSettings({ t, locale, v, myShare, back }: { t: Dict; locale: Locale; v: ComparisonView; myShare: string | null; back: string }) {
  if (v.status === "revoked") return null;
  const scopeNames = (s: string[]) => s.map((x) => t.compare.scopeNames[x as (typeof SCOPES)[number]] ?? x).join(", ");
  return (
    <div className="space-y-3">
      {(
        <div id="manual" className="scroll-mt-20">
          <Card title={`📖 ${t.manual.shareTitle}`}>
            <p className="mb-3 text-sm text-stone-600">{t.manual.shareHelp}</p>
            {myShare && <p className="mb-2 text-xs font-semibold text-teal-800">✓ {t.manual.shareNow(SHARED_TEXT.presetName[myShare as (typeof MANUAL_PRESETS)[number]][locale])}</p>}
            <form action={manualShareAction} className="space-y-2">
              <input type="hidden" name="sessionId" value={v.id} />
              <input type="hidden" name="back" value={back} />
              <fieldset className="space-y-2">
                <legend className="sr-only">{t.manual.shareTitle}</legend>
                {(["none", ...MANUAL_PRESETS] as const).map((p) => (
                  <label key={p} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-white/80 p-3 has-checked:border-teal-400 has-checked:bg-teal-50/60">
                    <input type="radio" name="preset" value={p} defaultChecked={(myShare ?? "none") === p} className="mt-1 accent-teal-700" />
                    <span>
                      <span className="block text-sm font-semibold text-stone-900">{p === "none" ? t.manual.shareNone : SHARED_TEXT.presetName[p][locale]}</span>
                      {p !== "none" && <span className="block text-xs leading-5 text-stone-600">{SHARED_TEXT.presetWhat[p][locale]}</span>}
                      {p !== "none" && (
                        <Link href={`/me/manual/shared?preset=${p}&back=${encodeURIComponent(back)}`} className="text-xs text-teal-700 underline">{t.manual.sharePreview} →</Link>
                      )}
                    </span>
                  </label>
                ))}
              </fieldset>
              <p className="text-xs leading-5 text-stone-500">🔒 {SHARED_TEXT.never[locale]}</p>
              <Button type="submit" variant="secondary">{t.manual.shareSave}</Button>
            </form>
          </Card>
        </div>
      )}
        {(
          <>
          {v.result && (
            <details className="rounded-3xl border border-stone-200/80 bg-white/70 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-stone-700">{t.compare.changeConsent}</summary>
              <div className="mt-3">
          <div>
            <p className="mb-3 text-sm text-stone-600">{PURPOSE_TEXT[locale]}</p>
            {v.myConsent && <p className="mb-2 text-sm"><Pill tone="teal">✓</Pill> {t.compare.yourConsent(scopeNames(v.myConsent.scopes))}</p>}
            <p className="mb-3 text-sm">{v.otherConsented ? `✓ ${t.compare.otherConsented}` : `⏳ ${t.compare.waiting}`}</p>
            <form action={consentAction} className="space-y-2">
              <input type="hidden" name="sessionId" value={v.id} />
              <input type="hidden" name="back" value={back} />
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
          )}
          <form action={endComparisonAction}>
            <input type="hidden" name="sessionId" value={v.id} />
              <input type="hidden" name="back" value={back} />
            <ConfirmButton message={t.compare.endConfirm}>{t.compare.end}</ConfirmButton>
          </form>
          </>
        )}
    </div>
  );
}
