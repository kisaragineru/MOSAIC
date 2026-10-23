import Link from "next/link";
import { deleteResponseAction, privacyAction } from "@/app/actions/discovery";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { Button, Card, Empty, Page, Pill } from "@/components/ui";
import { answerLabel } from "@/lib/discovery/format";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getHistory } from "@/server/services/discovery";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const items = await getHistory(uid);
  return (
    <Page title={t.history.title} back="/discover">
      <Flash t={t} sp={sp} />
      {items.length === 0 && <Empty>{t.history.empty}</Empty>}
      {items.map((h) => (
        <Card key={h.question.id} title={h.question.prompt[locale]}>
          <ol className="space-y-3">
            {h.responses.map((r, i) => (
              <li key={r.id} className={`rounded-xl border p-2 ${i === 0 ? "border-teal-200 bg-teal-50/40" : "border-stone-200"}`}>
                <div className="flex flex-wrap items-center gap-1 text-xs text-stone-500">
                  <span>{r.answeredAt.toISOString().slice(0, 10)}</span>
                  <Pill>{t.history.changeKinds[r.changeKind as keyof typeof t.history.changeKinds]}</Pill>
                  {r.status === "answered" && <Pill tone={r.privacy === "comparable" ? "amber" : "stone"}>{r.privacy === "comparable" ? t.history.comparable : t.history.private}</Pill>}
                </div>
                <p className="mt-1 text-sm text-stone-900">{r.status === "skipped" ? t.history.skipped : answerLabel(h.question.options, r.answer, locale)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.status === "answered" && h.question.comparable && (
                    <form action={privacyAction}>
                      <input type="hidden" name="responseId" value={r.id} />
                      <input type="hidden" name="privacy" value={r.privacy === "comparable" ? "private" : "comparable"} />
                      <Button variant="secondary" className="min-h-8 px-2 py-1 text-xs">{r.privacy === "comparable" ? t.history.makePrivate : t.history.makeComparable}</Button>
                    </form>
                  )}
                  <form action={deleteResponseAction}>
                    <input type="hidden" name="responseId" value={r.id} />
                    <ConfirmButton message={t.common.confirmDelete} className="min-h-8 px-2 py-1 text-xs">{t.history.deleteAnswer}</ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ol>
          <Link href={`/discover/q/${encodeURIComponent(h.question.id)}`} className="mt-3 inline-block text-sm text-teal-700 underline">{t.discover.answerAgain} →</Link>
        </Card>
      ))}
    </Page>
  );
}
