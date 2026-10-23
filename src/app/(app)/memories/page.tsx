import Link from "next/link";
import { Flash } from "@/components/flash";
import { Button, Card, Empty, Input, LinkButton, Page, Pill, Select } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { MEMORY_KINDS } from "@/server/db/schema";
import { listMemories, listTags } from "@/server/services/memories";
import { listPeople } from "@/server/services/people";

const PAGE_SIZE = 50;

export default async function MemoriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const filters = { q: sp.q ?? "", kind: sp.kind ?? "", tag: sp.tag ?? "", personId: sp.personId ?? "", from: sp.from ?? "", to: sp.to ?? "" };
  const page = Math.min(Math.max(Number.parseInt(sp.page ?? "0", 10) || 0, 0), 2000);
  let items: Awaited<ReturnType<typeof listMemories>> = [];
  let filterError = false;
  try {
    items = await listMemories(uid, { ...filters, limit: PAGE_SIZE + 1, offset: page * PAGE_SIZE });
  } catch {
    filterError = true;
  }
  // One extra row tells us whether an older page exists.
  const hasOlder = items.length > PAGE_SIZE;
  items = items.slice(0, PAGE_SIZE);
  const pageHref = (n: number) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== ""));
    if (n > 0) q.set("page", String(n));
    const qs = q.toString();
    return `/memories${qs ? `?${qs}` : ""}`;
  };
  const tags = await listTags(uid);
  const people = await listPeople(uid);
  // Group by year-month of the effective date.
  const groups = new Map<string, typeof items>();
  for (const m of items) {
    const key = (m.occurredOn ?? m.createdAt.toISOString().slice(0, 10)).slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return (
    <Page title={t.memories.title} actions={<LinkButton href="/memories/new" variant="primary">+ {t.memories.write}</LinkButton>}>
      <Flash t={t} sp={sp} />
      {filterError && <Flash t={t} sp={{ e: "invalid_input" }} />}
      <Card>
        <form method="get" className="space-y-2" role="search">
          <Input name="q" defaultValue={filters.q} placeholder={t.memories.searchPlaceholder} aria-label={t.common.search} />
          <details open={!!(filters.kind || filters.tag || filters.personId || filters.from || filters.to)}>
            <summary className="cursor-pointer text-sm text-stone-600">{t.common.filter}</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Select name="kind" defaultValue={filters.kind} aria-label={t.memories.fields.kind}>
                <option value="">{t.common.all}</option>
                {MEMORY_KINDS.map((k) => <option key={k} value={k}>{t.memories.kinds[k]}</option>)}
              </Select>
              <Select name="tag" defaultValue={filters.tag} aria-label="tag">
                <option value="">#</option>
                {tags.map((x) => <option key={x.tag} value={x.tag}>#{x.tag} ({x.n})</option>)}
              </Select>
              <Select name="personId" defaultValue={filters.personId} aria-label={t.memories.fields.people}>
                <option value="">{t.memories.fields.people}</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
              </Select>
              <div />
              <Input type="date" name="from" defaultValue={filters.from} aria-label={t.memories.from} />
              <Input type="date" name="to" defaultValue={filters.to} aria-label={t.memories.to} />
            </div>
          </details>
          <div className="flex gap-2">
            <Button type="submit">{t.common.search}</Button>
            <LinkButton href="/memories">{t.common.clear}</LinkButton>
          </div>
        </form>
      </Card>
      {items.length === 0 ? (
        <Empty>{t.memories.empty}</Empty>
      ) : (
        [...groups].map(([month, ms]) => (
          <section key={month}>
            <h2 className="mb-2 text-sm font-semibold text-stone-500">{month}</h2>
            <ul className="space-y-2">
              {ms.map((m) => (
                <li key={m.id}>
                  <Link href={`/memories/${m.id}`} className="block rounded-2xl border border-stone-200 bg-white p-3 hover:border-teal-300">
                    <div className="mb-1 flex flex-wrap items-center gap-1">
                      <Pill tone={m.kind === "letter_to_future" ? "violet" : "teal"}>{t.memories.kinds[m.kind]}</Pill>
                      {m.occurredOn && <span className="text-xs text-stone-500">{m.occurredOn}</span>}
                      {m.version > 1 && <Pill>v{m.version}</Pill>}
                      {m.tags.map((x) => <Pill key={x}>#{x}</Pill>)}
                      {m.people.map((p) => <Pill key={p.id} tone="rose">{p.nickname}</Pill>)}
                    </div>
                    {m.sealed ? (
                      <p className="text-sm italic text-stone-500">✉ {t.memories.sealed(m.revealOn!)}</p>
                    ) : (
                      <>
                        {m.title && <p className="font-medium text-stone-900">{m.title}</p>}
                        <p className="line-clamp-3 whitespace-pre-line text-sm text-stone-700">{m.body}</p>
                      </>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      {(page > 0 || hasOlder) && (
        <nav className="flex justify-between text-sm" aria-label="pagination">
          {page > 0 ? <Link className="text-teal-700 underline" href={pageHref(page - 1)}>← {t.memories.newer}</Link> : <span />}
          {hasOlder && <Link className="text-teal-700 underline" href={pageHref(page + 1)}>{t.memories.older} →</Link>}
        </nav>
      )}
    </Page>
  );
}
