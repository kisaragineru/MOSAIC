import Link from "next/link";
import { revokeShareAction } from "@/app/actions/sharing";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { ShareCreator } from "@/components/share-creator";
import { Card, Empty, Page, Pill } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listComparisons, listShares } from "@/server/services/sharing";

export default async function SharePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const shares = await listShares(uid);
  const comps = await listComparisons(uid);
  return (
    <Page title={t.share.title}>
      <Flash t={t} sp={sp} />
      <p className="text-sm text-stone-600">{t.share.intro}</p>
      <Card title={t.share.create}>
        <ShareCreator
          tx={{
            create: t.share.create,
            label: t.share.label,
            expires: t.share.expires,
            maxUses: t.share.maxUses,
            once: t.share.once,
            qrAlt: t.share.qrAlt,
            copy: t.share.copy,
            copied: t.share.copied,
            errors: t.errors,
          }}
        />
      </Card>
      <Card title={t.share.comparisons}>
        {comps.length === 0 ? (
          <Empty>{t.share.noComparisons}</Empty>
        ) : (
          <ul className="divide-y divide-stone-100">
            {comps.map((c) => (
              <li key={c.id}>
                <Link href={`/compare/${c.id}`} className="flex items-center justify-between py-2">
                  <span>{t.share.with(c.otherName)}</span>
                  <Pill tone={c.status === "active" ? "teal" : c.waitingOn === "you" ? "rose" : c.status === "pending" ? "amber" : "stone"}>
                    {t.share.compStatus[c.waitingOn ? (`awaiting_${c.waitingOn}` as const) : (c.status as "active" | "revoked")]}
                  </Pill>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t.share.links}>
        {shares.length === 0 ? (
          <Empty>{t.share.noLinks}</Empty>
        ) : (
          <ul className="space-y-2">
            {shares.map((s) => {
              const status = s.status;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 p-2 text-sm">
                  <div>
                    <p className="font-medium">{s.label ?? s.createdAt.toISOString().slice(0, 10)}</p>
                    <p className="text-xs text-stone-500">{t.share.uses(s.useCount, s.maxUses)} · {t.share.expiresOn(s.expiresAt.toISOString().slice(0, 10))}</p>
                  </div>
                  <Pill tone={status === "active" ? "teal" : "stone"}>{t.share.status[status]}</Pill>
                  {status !== "revoked" && (
                    <form action={revokeShareAction}>
                      <input type="hidden" name="shareId" value={s.id} />
                      <ConfirmButton message={t.common.confirmDelete} className="min-h-8 px-2 py-1 text-xs">{t.share.revoke}</ConfirmButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Page>
  );
}
