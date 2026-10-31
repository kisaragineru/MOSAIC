import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { consentAction } from "@/app/actions/sharing";
import { Page } from "@/components/page";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getComparison } from "@/server/services/sharing";
import { getTuvi } from "@/server/services/tuvi";

/**
 * Right after connecting, the one way to our Tử Vi side by side: a chart first (the guide's own
 * steps, birth hour or not), then showing it to this person, then our page. Each step already
 * done is passed by, so it can be reached from anywhere at any time.
 */
export default async function ConnectStartPage({ params }: { params: Promise<{ id: string }> }) {
  const uid = await requireUser();
  const { id } = await params;
  const { t, locale } = await getT();
  const v = await getComparison(uid, id).catch(() => notFound());
  if (v.status !== "active") redirect(`/compare/${id}`);
  const tv = await getTuvi(uid, locale);
  if (!tv.chart) redirect(`/welcome?step=2&with=${id}`);
  if (v.myConsent?.scopes.includes("tuvi")) redirect(`/compare/${id}#tuvi`);
  const s = t.compare.start;
  return (
    <Page title={s.title(v.otherName)} back={`/compare/${id}`}>
      <section className="space-y-4 rounded-3xl bg-linear-to-br from-violet-50 via-white to-teal-50 p-5 shadow-sm ring-1 ring-violet-100" data-testid="start-share">
        <h2 className="text-lg font-bold text-stone-900">✦ {s.ask(v.otherName)}</h2>
        <p className="text-sm leading-6 text-stone-700">{s.lead(v.otherName)}</p>
        <form action={consentAction} className="space-y-3">
          <input type="hidden" name="sessionId" value={v.id} />
          <input type="hidden" name="agree" value="on" />
          <input type="hidden" name="back" value={`/compare/${v.id}#tuvi`} />
          {/* What was shown already stays shown. */}
          {(v.myConsent?.scopes ?? []).map((x) => <input key={x} type="hidden" name="scopes" value={x} />)}
          <label className="flex items-start gap-2 rounded-2xl bg-white px-3 py-3 text-sm ring-1 ring-violet-200">
            <input type="checkbox" name="showTuvi" defaultChecked className="mt-1 h-4 w-4 accent-teal-700" />
            <span>
              <span className="block font-semibold text-stone-900">{s.show(v.otherName)}</span>
              <span className="block text-xs text-stone-500">{s.note}</span>
            </span>
          </label>
          <button type="submit" className="flex min-h-12 w-full items-center justify-center rounded-full bg-teal-700 px-4 text-base font-bold text-white shadow-md transition hover:bg-teal-800 active:scale-[0.98]">
            {s.go}
          </button>
        </form>
        <Link href={`/compare/${v.id}`} className="block text-center text-sm text-stone-500 underline">{t.compare.later}</Link>
      </section>
    </Page>
  );
}
