import Link from "next/link";
import { SharedManualView } from "@/components/shared-manual";
import { MANUAL_PRESETS, SHARED_TEXT, type ManualPreset } from "@/content/manual-text";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { sharedManualPreview } from "@/server/services/manual-share";

/** My manual as a connection would see it, for each preset. */
export default async function SharedPreviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const preset: ManualPreset = sp.preset === "partner" ? "partner" : "friend";
  const { t, locale } = await getT();
  const m = await sharedManualPreview(uid, preset, locale);
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-28 pt-4">
      <div className="flex items-center gap-3">
        <Link href={sp.back?.startsWith("/compare/") ? sp.back : "/me/manual"} className="rounded-full px-2 py-1 text-stone-500 hover:bg-stone-200" aria-label="Back">←</Link>
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
      <div className="rounded-3xl border-2 border-dashed border-teal-200 p-3">
        <SharedManualView m={m} locale={locale} levels={{ consistent: t.manual.levelConsistent, emerging: t.manual.levelEmerging, mixed: t.manual.levelMixed }} />
      </div>
    </main>
  );
}
