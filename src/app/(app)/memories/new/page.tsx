import { createMemoryAction } from "@/app/actions/memories";
import { listTags } from "@/server/services/memories";
import { Flash } from "@/components/flash";
import { DraftCarry } from "@/components/draft-carry";
import { MemoryForm } from "@/components/memory-form";
import { Card } from "@/components/ui";
import { Page } from "@/components/page";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listPeople } from "@/server/services/people";
import { shareTargets } from "@/server/services/memory-share";
import { myGiftBoxes } from "@/server/services/gift-boxes";

/** Prefill only well-formed dates (links from the Tử Vi life stages). */
const dateParam = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
/** A starting title, text or tags (links from a Tử Vi question): plain text, kept short; the form edits it. */
const textParam = (v: string | undefined, max: number) => (v && v.trim() ? v.slice(0, max) : undefined);

export default async function NewMemoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const people = await listPeople(uid);
  const canShare = (await shareTargets(uid)).length > 0;
  const letter = sp.kind === "letter_to_future";
  const giftBoxes = letter ? [] : (await myGiftBoxes(uid)).filter((b) => b.status === "open" && b.my_role !== "child").map((b) => ({ id: b.id, label: t.memories.composer.toGift(b.child_name) }));
  return (
    <Page title={letter ? t.memories.post.letter : t.memories.post.title} back="/memories">
      <Flash t={t} sp={sp} />
      {/* From the quick composer: its text, carried here (a plain new post only). */}
      {!letter && !sp.body && <DraftCarry />}
      <Card>
        <MemoryForm t={t} action={createMemoryAction} people={people} back="/memories/new" d={{
            kind: sp.kind,
            revealOn: dateParam(sp.reveal),
            occurredOn: dateParam(sp.occurred),
            title: textParam(sp.title, 200),
            body: textParam(sp.body, 1000),
            tags: textParam(sp.tags, 100)?.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 5),
          }} canShare={canShare} giftBoxes={giftBoxes} knownTags={await listTags(uid)} />
      </Card>
    </Page>
  );
}
