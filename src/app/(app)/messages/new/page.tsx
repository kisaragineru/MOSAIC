import { redirect } from "next/navigation";
import { dmShareRecordAction, dmStartAction } from "@/app/actions/dm";
import { DmAvatar } from "@/components/dm-avatar";
import { Flash } from "@/components/flash";
import { Card, Page } from "@/components/ui";
import { dmTitle } from "@/lib/dm-text";
import { getT } from "@/lib/i18n/server";
import { uuid } from "@/lib/validation/common";
import { requireUser } from "@/server/auth/session";
import { sharedEntry } from "@/server/services/comments";
import { dmContacts, dmConversation, dmInbox, recordUnseenBy } from "@/server/services/dm";
import { avatarUrls } from "@/server/services/avatars";
import { getMemory } from "@/server/services/memories";

/** Start a conversation (one person) or a group (several), optionally sending a record. */
export default async function NewMessagePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const tm = t.messages;
  const contacts = await dmContacts(uid);
  const recordId = sp.record && uuid.safeParse(sp.record).success ? sp.record : null;
  // The record being shared: only my own. Someone else's goes back to its page, where it can be
  // answered to its owner (it is never passed on to others).
  const record = recordId
    ? await getMemory(uid, recordId)
        .then((m) => ({ title: m.title, body: m.body, owner: tm.yourRecord }))
        .catch(async () => {
          if (await sharedEntry(uid, recordId)) redirect(`/memories/shared/${recordId}`);
          return null;
        })
    : null;
  const recent = recordId ? (await dmInbox(uid)).filter((c) => c.canSend).slice(0, 6) : [];
  // Asked first: some of the people it's going to can't see this record.
  const askTo = record && sp.to ? sp.to.split(",").filter((x) => uuid.safeParse(x).success) : [];
  const askConv = record && sp.conv && uuid.safeParse(sp.conv).success ? sp.conv : null;
  const askMembers = askConv ? await dmConversation(uid, askConv).then((c) => c.members.filter((m) => !m.left).map((m) => m.id)).catch(() => []) : askTo;
  const unseen = record && askMembers.length ? await recordUnseenBy(uid, recordId!, askMembers).catch(() => []) : [];
  const pics = await avatarUrls(uid, [...contacts.map((c) => c.id), ...recent.flatMap((c) => c.others.map((o) => o.id))]);
  return (
    <Page title={record ? tm.shareTitle : tm.newMessage} back={record ? undefined : "/messages"}>
      <Flash t={t} sp={sp} />
      {record && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-3">
          <p className="text-xs font-semibold text-stone-500">📄 {record.owner}</p>
          {record.title && <p className="emoji-color font-medium text-stone-900">{record.title}</p>}
          <p className="emoji-color line-clamp-3 whitespace-pre-line text-sm text-stone-700">{record.body}</p>
          <p className="mt-2 text-[11px] leading-5 text-stone-500">{tm.shareHelp}</p>
        </div>
      )}
      {unseen.length > 0 && (
        <section id="ask" className="scroll-mt-24 rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200" data-testid="record-ask">
          <p className="font-semibold text-amber-950">🔒 {tm.unseenTitle(unseen.map((u) => tm.person(u.name)).join(t.common.listSeparator))}</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">{tm.unseenLead}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <form action={askConv ? dmShareRecordAction : dmStartAction}>
              <input type="hidden" name="record" value={recordId!} />
              <input type="hidden" name="show" value="1" />
              {askConv ? <input type="hidden" name="conversationId" value={askConv} /> : askTo.map((id) => <input key={id} type="hidden" name="member" value={id} />)}
              {!askConv && sp.title && <input type="hidden" name="title" value={sp.title} />}
              <button type="submit" className="rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-800">{tm.unseenShow}</button>
            </form>
            <a href={`/messages/new?record=${recordId}`} className="text-sm font-semibold text-stone-600 underline underline-offset-4">{tm.unseenCancel}</a>
          </div>
        </section>
      )}
      {recent.length > 0 && (
        <Card title={tm.recent}>
          <ul className="space-y-1">
            {recent.map((c) => (
              <li key={c.id}>
                <form action={dmShareRecordAction}>
                  <input type="hidden" name="conversationId" value={c.id} />
                  <input type="hidden" name="record" value={recordId!} />
                  <button type="submit" className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-stone-50 active:scale-[0.99]">
                    <DmAvatar names={c.others.map((o) => o.name)} srcs={c.others.map((o) => pics.get(o.id))} size="sm" />
                    <span className="flex-1 truncate font-medium text-stone-800">{dmTitle(c, t)}</span>
                    <span className="rounded-full bg-teal-700 px-3 py-1 text-xs font-bold text-white">{tm.send}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {contacts.length === 0 ? (
        <p className="rounded-3xl bg-white/80 p-6 text-center text-sm leading-6 text-stone-600 ring-1 ring-stone-200/60">{tm.noContacts}</p>
      ) : (
        <form action={dmStartAction} className="space-y-4">
          {recordId && <input type="hidden" name="record" value={recordId} />}
          <Card title={record ? tm.allPeople : tm.to}>
            <p className="-mt-1 mb-3 text-xs leading-5 text-stone-500">{tm.pickHelp}</p>
            <ul className="space-y-1">
              {contacts.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-stone-50 has-[:checked]:bg-teal-50">
                    <DmAvatar names={[c.name]} srcs={[pics.get(c.id)]} size="sm" />
                    <span className="flex-1 font-medium text-stone-800">{c.name}</span>
                    <input type="checkbox" name="member" value={c.id} className="h-5 w-5 accent-teal-700" />
                  </label>
                </li>
              ))}
            </ul>
          </Card>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">{tm.groupName}</span>
            <input name="title" maxLength={60} className="w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-base focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20" />
          </label>
          <button type="submit" className="min-h-12 w-full rounded-full bg-teal-700 text-base font-bold text-white shadow-md transition hover:bg-teal-800 active:scale-[0.98]">
            {record ? tm.send : tm.start}
          </button>
        </form>
      )}
    </Page>
  );
}
