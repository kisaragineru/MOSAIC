import Link from "next/link";
import { ConnectionLevelList } from "@/components/connection-level-list";
import { Flash } from "@/components/flash";
import { Page } from "@/components/page";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { avatarUrls } from "@/server/services/avatars";
import { typeTints } from "@/server/services/card";
import { privacyOverview } from "@/server/services/privacy";
import { SCOPE_DESCRIPTIONS } from "@/server/services/sharing";

/** How much of my Tử Vi each connection may see, all on one list. */
export default async function TuviPrivacyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const tc = t.connectionLevels;
  const o = await privacyOverview(uid);
  const ids = o.connections.map((c) => c.otherId);
  const [avatars, tints] = await Promise.all([avatarUrls(uid, ids), typeTints(uid, ids)]);
  return (
    <Page title={tc.tuviTitle} back="/me/privacy#tuvi">
      <Flash t={t} sp={sp} />
      <p className="text-sm leading-6 text-stone-600">{tc.tuviHelp}</p>
      {!o.birth.hasChart && (
        <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
          {tc.tuviNoChart} <Link href="/tuvi" className="font-semibold underline">{tc.makeChart} →</Link>
        </p>
      )}
      <details className="rounded-2xl bg-white/70 p-3 text-sm ring-1 ring-stone-200">
        <summary className="cursor-pointer font-semibold text-stone-700">{tc.whatIs}</summary>
        <dl className="mt-2 space-y-2 text-xs leading-5 text-stone-600">
          <div><dt className="font-semibold text-stone-800">{tc.tuviLevels.tuvi}</dt><dd>{SCOPE_DESCRIPTIONS.tuvi[locale]}</dd></div>
          <div><dt className="font-semibold text-stone-800">{tc.tuviLevels.detail}</dt><dd>{SCOPE_DESCRIPTIONS.tuvi_detail[locale]}</dd></div>
        </dl>
      </details>
      <section className="rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-white/80">
        <ConnectionLevelList t={t} group="tuvi" connections={o.connections} avatars={avatars} tints={tints} back="/me/privacy/tuvi" />
      </section>
      <Link href="/me/privacy#tuvi" className="inline-block text-sm font-semibold text-teal-700">← {tc.back}</Link>
    </Page>
  );
}
