import Link from "next/link";
import { deleteTagAction, renameTagAction, tagNoteAction } from "@/app/actions/memories";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { Page } from "@/components/page";
import { Button, Card, Empty, Input, Textarea } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { FEELING_EMOJI, FEELINGS } from "@/lib/labels";
import { normalizeTag } from "@/lib/tags";
import { requireUser } from "@/server/auth/session";
import { listMemories, tagDetail } from "@/server/services/memories";

const BAR = ["w-2", "w-6", "w-10", "w-14", "w-18", "w-22", "w-26", "w-32"];

/** One tag: how much and over what time, the feelings in its records, my note on it, its records, and tidying it up. */
export default async function TagPage({ params, searchParams }: { params: Promise<{ tag: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const raw = (await params).tag;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Already decoded.
  }
  const tag = normalizeTag(decoded);
  const { t } = await getT();
  const tt = t.memories.tags;
  const d = await tagDetail(uid, tag);
  const records = d.n ? await listMemories(uid, { tag, limit: 100 }) : [];
  const feelings = FEELINGS.filter((f) => d.feelings[f]).map((f) => ({ f, n: d.feelings[f]! }));
  const most = Math.max(1, ...feelings.map((x) => x.n));
  const snippet = (s: string | null) => {
    const x = (s ?? "").trim().replace(/\s+/g, " ");
    return x.length > 80 ? `${x.slice(0, 78)}…` : x;
  };
  return (
    <Page title={`#${tag}`} back="/memories/tags">
      <Flash t={t} sp={sp} />
      {d.n === 0 ? (
        <Empty>{tt.none}</Empty>
      ) : (
        <>
          <p className="text-sm text-stone-600" data-testid="tag-span">{tt.span(d.n, d.first!, d.last!)}</p>
          {feelings.length > 0 && (
            <Card title={tt.feelingsTitle}>
              <ul className="space-y-1.5" data-testid="tag-feelings">
                {feelings.map(({ f, n }) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="emoji-color w-24 shrink-0">{FEELING_EMOJI[f]} {t.memories.feeling.names[f]}</span>
                    {/* Width by share of the most frequent feeling (classes, not inline styles: CSP). */}
                    <span aria-hidden className="h-2 w-32 shrink-0 rounded-full bg-amber-100">
                      <span className={`block h-2 rounded-full bg-amber-400 ${BAR[Math.max(0, Math.round((n / most) * (BAR.length - 1)))]}`} />
                    </span>
                    <span className="text-xs text-stone-500">{n}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
      <Card title={tt.noteTitle}>
        <form action={tagNoteAction} className="space-y-2">
          <input type="hidden" name="tag" value={tag} />
          <Textarea name="note" defaultValue={d.note ?? ""} rows={3} maxLength={1000} placeholder={tt.notePlaceholder} aria-label={tt.noteTitle} />
          <Button type="submit" variant="secondary">{tt.noteSave}</Button>
        </form>
      </Card>
      {records.length > 0 && (
        <Card title={tt.recordsTitle}>
          <ul className="divide-y divide-stone-100" data-testid="tag-records">
            {records.map((m) => (
              <li key={m.id}>
                <Link href={`/memories/${m.id}`} className="block py-2.5 hover:bg-stone-50">
                  <span className="block text-xs text-stone-500">{m.timelineOn}</span>
                  {m.title && <span className="emoji-color block font-semibold text-stone-900">{m.title}</span>}
                  <span className="emoji-color block text-sm text-stone-800">{snippet(m.body)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={`/memories?tag=${encodeURIComponent(tag)}`} className="mt-2 inline-block text-sm font-semibold text-teal-700">{tt.openInList} →</Link>
        </Card>
      )}
      {d.n > 0 && (
        <Card title={tt.manageTitle}>
          <form action={renameTagAction} className="space-y-2">
            <input type="hidden" name="tag" value={tag} />
            <label className="block text-sm font-medium text-stone-700">
              {tt.renameLabel}
              <Input name="to" defaultValue={tag} maxLength={40} required className="mt-1" />
            </label>
            <p className="text-xs leading-5 text-stone-500">{tt.renameHelp}</p>
            <ConfirmButton message={tt.renameConfirm} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800">{tt.rename}</ConfirmButton>
          </form>
          <form action={deleteTagAction} className="mt-4 border-t border-stone-100 pt-3">
            <input type="hidden" name="tag" value={tag} />
            <ConfirmButton message={tt.deleteConfirm} quiet>{tt.delete}</ConfirmButton>
          </form>
        </Card>
      )}
      <Link href="/memories/tags" className="inline-block text-sm font-semibold text-teal-700">← {tt.back}</Link>
    </Page>
  );
}
