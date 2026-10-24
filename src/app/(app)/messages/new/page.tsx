import { dmShareRecordAction, dmStartAction } from "@/app/actions/dm";
import { DmAvatar } from "@/components/dm-avatar";
import { Flash } from "@/components/flash";
import { Card, Page } from "@/components/ui";
import { dmTitle } from "@/lib/dm-text";
import { getT } from "@/lib/i18n/server";
import { uuid } from "@/lib/validation/common";
import { requireUser } from "@/server/auth/session";
import { sharedEntry } from "@/server/services/comments";
import { dmContacts, dmInbox } from "@/server/services/dm";
import { getMemory } from "@/server/services/memories";

/** Start a conversation (one person) or a group (several), optionally sending a record. */
export default async function NewMessagePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const tm = t.messages;
  const contacts = await dmContacts(uid);
  const recordId = sp.record && uuid.safeParse(sp.record).success ? sp.record : null;
  // The record being shared: mine, or someone else's that I may read.
  const record = recordId
    ? await getMemory(uid, recordId)
        .then((m) => ({ title: m.title, body: m.body, owner: tm.yourRecord }))
        .catch(async () => {
          const e = await sharedEntry(uid, recordId);
          return e ? { title: e.title, body: e.body, owner: tm.recordOf(e.ownerName) } : null;
        })
    : null;
  const recent = recordId ? (await dmInbox(uid)).filter((c) => c.canSend).slice(0, 6) : [];
  return (
    <Page title={record ? tm.shareTitle : tm.newMessage} back={record ? undefined : "/messages"}>
      <Flash t={t} sp={sp} />
      {record && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-3">
          <p className="text-xs font-semibold text-stone-500">📄 {record.owner}</p>
          {record.title && <p className="font-medium text-stone-900">{record.title}</p>}
          <p className="line-clamp-3 whitespace-pre-line text-sm text-stone-700">{record.body}</p>
          <p className="mt-2 text-[11px] leading-5 text-stone-500">{tm.shareHelp}</p>
        </div>
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
                    <DmAvatar names={c.others.map((o) => o.name)} size="sm" />
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
                    <DmAvatar names={[c.name]} size="sm" />
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
