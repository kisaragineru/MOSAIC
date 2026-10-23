import Link from "next/link";
import { createPersonAction } from "@/app/actions/people";
import { Flash } from "@/components/flash";
import { Button, Card, Empty, Field, Input, Page, Pill, Select } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listPeople } from "@/server/services/people";

const RELS = ["partner", "family", "friend", "colleague", "other"] as const;

export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const people = await listPeople(uid);
  return (
    <Page title={t.people.title}>
      <Flash t={t} sp={sp} />
      <p className="text-xs text-stone-500">🔒 {t.people.privateNote}</p>
      {people.length === 0 ? (
        <Empty>{t.people.empty}</Empty>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/people/${p.id}`} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-3 hover:border-teal-300">
                <span className="font-medium">{p.nickname}</span>
                <Pill tone="rose">{t.people.relationships[p.relationship as (typeof RELS)[number]]}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
