import { createMemoryAction } from "@/app/actions/memories";
import { Flash } from "@/components/flash";
import { MemoryForm } from "@/components/memory-form";
import { Card, Page } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listPeople } from "@/server/services/people";

export default async function NewMemoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const people = await listPeople(uid);
  return (
    <Page title={t.memories.new} back="/memories">
      <Flash t={t} sp={sp} />
      <Card>
        <MemoryForm t={t} action={createMemoryAction} people={people} back="/memories/new" d={{ kind: sp.kind }} submitLabel={t.common.save} />
      </Card>
    </Page>
  );
}
