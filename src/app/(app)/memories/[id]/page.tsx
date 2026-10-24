import { notFound } from "next/navigation";
import { deleteMemoryAction, editMemoryAction } from "@/app/actions/memories";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { MemoryForm } from "@/components/memory-form";
import { Card, LinkButton, Notice, Page, Pill } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { getMemory } from "@/server/services/memories";
import { getAccount } from "@/server/services/account";
import { listPeople } from "@/server/services/people";
import { audienceChoices, memoryAudienceOf } from "@/server/services/memory-share";

export default async function MemoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const tz = (await getAccount(uid)).profile.timeZone;
  let m;
  try {
    m = await getMemory(uid, id);
  } catch (e) {
    if (e instanceof AppError || (e as Error).name === "ZodError") notFound();
    throw e;
  }
  const editing = sp.edit === "1" && !m.sealed;
  const people = await listPeople(uid);
  const choices = await audienceChoices(uid);
  const sessionIds = m.visibility === "selected" ? await memoryAudienceOf(uid, m.id) : [];
  const ta = t.memories.audience;
  return (
    <Page title={m.title ?? t.memories.kinds[m.kind]} back="/memories">
      <Flash t={t} sp={sp} />
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <Pill tone="teal">{t.memories.kinds[m.kind]}</Pill>
        {m.occurredOn && <span>{m.occurredOn}</span>}
        <span>{t.common.created} {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: tz }).format(m.createdAt)}</span>
        <span>{t.common.version} {m.version}</span>
        {m.tags.map((x) => <Pill key={x}>#{x}</Pill>)}
        {m.people.map((p) => <Pill key={p.id} tone="rose">{p.nickname}</Pill>)}
      </div>
      {m.kind !== "letter_to_future" && (
        <p className={`rounded-2xl px-4 py-2 text-xs ${m.visibility === "private" ? "bg-stone-100 text-stone-600" : "bg-rose-50 text-rose-900"}`}>
          {m.visibility === "private" ? `🔒 ${ta.private}` : m.visibility === "connections" ? `🔗 ${t.memories.timeline.sharedAll}` : `👥 ${t.memories.timeline.sharedSelected}`}
          {m.visibility === "selected" && `：${choices.filter((c) => sessionIds.includes(c.sessionId)).map((c) => c.name).join(locale === "ja" ? "、" : ", ")}`}
        </p>
      )}
      {m.sealed ? (
        <Notice>✉ {t.memories.sealed(m.revealOn!)}</Notice>
      ) : editing ? (
        <Card>
          <Notice>{t.memories.editNote}</Notice>
          <div className="mt-3">
            <MemoryForm
              t={t}
              action={editMemoryAction}
              people={people}
              back={`/memories/${m.id}?edit=1`}
              d={{ ...m, personIds: m.people.map((p) => p.id), body: m.body, reason: m.reason, sessionIds }}
              audience={choices}
              submitLabel={t.common.save}
            />
          </div>
        </Card>
      ) : (
        <Card>
          <p className="whitespace-pre-line text-stone-900">{m.body}</p>
          {m.reason && <p className="mt-3 whitespace-pre-line text-sm text-stone-600">→ {m.reason}</p>}
          {m.mood && <p className="mt-2 text-xs text-stone-500">{t.memories.fields.mood}: <span aria-label={String(m.mood)}>{["😞", "😕", "😐", "🙂", "😄"][m.mood - 1]}</span></p>}
          <div className="mt-4">
            <LinkButton href={`/memories/${m.id}?edit=1`}>{t.common.edit}</LinkButton>
          </div>
        </Card>
      )}
      {m.versions.length > 1 && (
        <Card title={t.memories.versions}>
          <ol className="space-y-3">
            {[...m.versions].reverse().map((v) => (
              <li key={v.id} className="border-l-2 border-stone-200 pl-3">
                <p className="text-xs text-stone-500">{t.memories.versionLabel(v.version)} · {v.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
                {v.title && <p className="text-sm font-medium">{v.title}</p>}
                <p className="whitespace-pre-line text-sm text-stone-700">{v.body}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}
      <form action={deleteMemoryAction}>
        <input type="hidden" name="id" value={m.id} />
        <ConfirmButton message={t.common.confirmDelete}>{t.common.delete}</ConfirmButton>
      </form>
    </Page>
  );
}
