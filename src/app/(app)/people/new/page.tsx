import { createPersonAction } from "@/app/actions/people";
import { Flash } from "@/components/flash";
import { Button, Card, Field, Input, Page, Select } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";

const RELS = ["family", "partner", "friend", "colleague", "other"] as const;

/** Adding someone without the floating sheet (before the page is interactive). */
export default async function NewPersonPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  return (
    <Page title={t.people.add} back="/people">
      <Flash t={t} sp={sp} />
      <Card>
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
