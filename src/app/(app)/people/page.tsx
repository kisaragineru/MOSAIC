import Link from "next/link";
import { createPersonAction } from "@/app/actions/people";
import { addPersonFromConnectionAction } from "@/app/actions/sharing";
import { Flash } from "@/components/flash";
import { Button, Card, Empty, Field, Input, Page, Pill, Select } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listPeople } from "@/server/services/people";
import { listComparisons } from "@/server/services/sharing";

const RELS = ["partner", "family", "friend", "colleague", "other"] as const;

export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const people = await listPeople(uid);
  const connections = await listComparisons(uid);
  const live = new Set(connections.filter((c) => c.status !== "revoked" && c.personId).map((c) => c.personId));
  const unlinked = connections.filter((c) => c.status !== "revoked" && !c.personId);
  return (
    <Page title={t.people.title}>
      <Flash t={t} sp={sp} />
      <p className="text-xs text-stone-500">🔒 {t.people.privateNote}</p>
      {unlinked.length > 0 && (
        <Card title={`🔗 ${t.people.newConnections}`} className="border-teal-200 bg-teal-50/60">
          <p className="mb-2 text-xs text-stone-600">{t.people.newConnectionsHelp}</p>
          <ul className="space-y-2">
            {unlinked.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3">
                <Link href={`/compare/${c.id}`} className="font-medium hover:text-teal-700">{c.otherName}</Link>
                <form action={addPersonFromConnectionAction}>
                  <input type="hidden" name="sessionId" value={c.id} />
                  <Button type="submit" className="min-h-8 px-3 py-1 text-xs">+ {t.people.addFromConnection}</Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {people.length === 0 ? (
        <Empty>{t.people.empty}</Empty>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/people/${p.id}`} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-3 hover:border-teal-300">
                <span className="flex items-center gap-2 font-medium">
                  {p.nickname}
                  {live.has(p.id) && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800">🔗 {t.people.connected}</span>}
                </span>
                <Pill tone="rose">{t.people.relationships[p.relationship as (typeof RELS)[number]]}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {live.size > 0 && <p className="text-xs text-stone-500">{t.people.connectedHint}</p>}
      <Card title={t.people.add}>
        <form action={createPersonAction} className="space-y-3">
          <Field label={t.people.nickname}><Input name="nickname" required maxLength={80} /></Field>
          <Field label={t.people.relationship}>
            <Select name="relationship" defaultValue="friend">
              {RELS.map((r) => <option key={r} value={r}>{t.people.relationships[r]}</option>)}
            </Select>
          </Field>
          <Button type="submit">{t.common.add}</Button>
        </form>
      </Card>
    </Page>
  );
}
