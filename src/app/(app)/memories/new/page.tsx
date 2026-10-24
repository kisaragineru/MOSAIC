import { createMemoryAction } from "@/app/actions/memories";
import { Flash } from "@/components/flash";
import { MemoryForm } from "@/components/memory-form";
import { Card, Page } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listPeople } from "@/server/services/people";
import { shareTargets } from "@/server/services/memory-share";

/** Prefill only well-formed dates (links from the Tử Vi life stages). */
const dateParam = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export default async function NewMemoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const people = await listPeople(uid);
  const canShare = (await shareTargets(uid)).length > 0;
  return (
    <Page title={t.memories.new} back="/memories">
      <Flash t={t} sp={sp} />
      <Card>
        <MemoryForm t={t} action={createMemoryAction} people={people} back="/memories/new" d={{ kind: sp.kind, revealOn: dateParam(sp.reveal), occurredOn: dateParam(sp.occurred) }} submitLabel={t.common.save} canShare={canShare} />
      </Card>
    </Page>
  );
}
