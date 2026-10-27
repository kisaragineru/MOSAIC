import { notFound } from "next/navigation";
import { dmAddMembersAction, dmHideAction, dmLeaveAction, dmMuteAction, dmRenameAction } from "@/app/actions/dm";
import { ConfirmButton } from "@/components/confirm-button";
import { DmAvatar } from "@/components/dm-avatar";
import { Flash } from "@/components/flash";
import { Button, Card, Page } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { uuid } from "@/lib/validation/common";
import { requireUser } from "@/server/auth/session";
import { dmContacts, dmConversation } from "@/server/services/dm";
import { avatarUrls } from "@/server/services/avatars";
import { companionsReplyInGroupAction } from "@/app/actions/dev";
import { listCompanions } from "@/server/services/dev-companion";
import { myTint, typeTints } from "@/server/services/card";

/** A conversation's details: who's in it, the group's name, mute, leave, delete for me. */
export default async function ConversationInfoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const conv = await dmConversation(uid, id).catch(() => null);
  if (!conv) notFound();
  const sp = await searchParams;
  const { t } = await getT();
  const tm = t.messages;
  const active = conv.members.filter((m) => !m.left);
  const group = conv.kind === "group";
  const addable = group && !conv.me.left ? (await dmContacts(uid)).filter((c) => !active.some((m) => m.id === c.id)) : [];
  const pics = await avatarUrls(uid, [...active.map((m) => m.id), ...addable.map((c) => c.id)]);
  const tints = await typeTints(uid, [...active.map((m) => m.id), ...addable.map((c) => c.id)]);
  const hidden = <input type="hidden" name="conversationId" value={conv.id} />;
  // Development only (empty otherwise): test companions in this group can be made to reply.
  const testers = group && !conv.me.left ? (await listCompanions(uid)).filter((c) => active.some((m) => m.id === c.id)) : [];
  return (
    <Page title={tm.info} back={`/messages/${conv.id}`}>
      <Flash t={t} sp={sp} />
      {group && !conv.me.left && (
        <Card title={tm.rename}>
          <form action={dmRenameAction} className="flex gap-2">
            {hidden}
            <input name="title" defaultValue={conv.title ?? ""} maxLength={60} aria-label={tm.rename} className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-base focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20" />
            <Button type="submit">{tm.save}</Button>
          </form>
        </Card>
      )}
      {testers.length > 0 && (
        <form action={companionsReplyInGroupAction} className="rounded-3xl border border-dashed border-violet-300 bg-violet-50/60 p-4">
          {hidden}
          <p className="mb-2 text-xs text-violet-900">{t.settings.dev.groupReplyHelp}（{testers.map((c) => c.name).join("、")}）</p>
          <Button type="submit" variant="secondary">{t.settings.dev.groupReply}</Button>
        </form>
      )}
      <Card title={tm.members(active.length)}>
        <ul className="space-y-2">
          {active.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <DmAvatar names={[m.name]} srcs={[pics.get(m.id)]} types={[tints.get(m.id)]} size="sm" />
              <span className="flex-1">
                <span className="block font-medium text-stone-900">{m.id === uid ? `${m.name}（${tm.you}）` : m.name}</span>
                {(m.role === "owner" && group) || (!m.connected && m.id !== uid) ? (
                  <span className="block text-xs text-stone-500">{[m.role === "owner" && group ? tm.owner : null, !m.connected && m.id !== uid ? tm.notConnected : null].filter(Boolean).join(" · ")}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {addable.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-teal-700">＋ {tm.addMembers}</summary>
            <form action={dmAddMembersAction} className="mt-2 space-y-2">
              {hidden}
              <ul className="space-y-1">
                {addable.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-2 py-2 hover:bg-stone-50 has-[:checked]:bg-teal-50">
                      <DmAvatar names={[c.name]} srcs={[pics.get(c.id)]} types={[tints.get(c.id)]} size="sm" />
                      <span className="flex-1">{c.name}</span>
                      <input type="checkbox" name="member" value={c.id} className="h-5 w-5 accent-teal-700" />
                    </label>
                  </li>
                ))}
              </ul>
              <Button type="submit">{tm.add}</Button>
            </form>
          </details>
        )}
      </Card>
      <Card>
        <div className="space-y-3">
          <form action={dmMuteAction} className="flex items-center justify-between gap-3">
            {hidden}
            <input type="hidden" name="muted" value={conv.me.muted ? "0" : "1"} />
            <span className="text-sm text-stone-700">{conv.me.muted ? `🔕 ${tm.mutedNote}` : "🔔"}</span>
            <Button type="submit" variant="secondary">{conv.me.muted ? tm.unmute : tm.mute}</Button>
          </form>
          {group && !conv.me.left && (
            <form action={dmLeaveAction}>
              {hidden}
              <ConfirmButton quiet message={tm.leaveConfirm} className="w-full">{tm.leave}</ConfirmButton>
            </form>
          )}
          <form action={dmHideAction} className="space-y-1">
            {hidden}
            <ConfirmButton quiet message={tm.deleteConfirm} className="w-full">{tm.deleteChat}</ConfirmButton>
            <p className="text-xs leading-5 text-stone-500">{tm.deleteChatHelp}</p>
          </form>
        </div>
      </Card>
    </Page>
  );
}
