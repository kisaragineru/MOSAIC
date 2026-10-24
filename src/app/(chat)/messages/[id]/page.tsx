import { notFound } from "next/navigation";
import { ChatView, type ChatText, type ConvView } from "@/components/chat-view";
import { DM_EDIT_MINUTES, DM_MAX_PHOTOS, DM_REACTIONS, dmConversation, dmMessages, markRead } from "@/server/services/dm";
import { getT } from "@/lib/i18n/server";
import { uuid } from "@/lib/validation/common";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";

/** One conversation. Loads the newest messages; the client keeps it up to date. */
export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const uid = await requireUser();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const conv = await dmConversation(uid, id).catch(() => null);
  if (!conv) notFound();
  const { t, locale } = await getT();
  const tz = (await getAccount(uid)).profile.timeZone;
  const initial = await dmMessages(uid, id, { limit: 40 });
  await markRead(uid, id);
  const tm = t.messages;
  const P = "{name}";
  const text: ChatText = {
    back: t.common.back ?? "←",
    info: tm.info,
    you: tm.you,
    unsent: tm.unsent,
    unsentMine: tm.unsentMine,
    photo: tm.photo,
    recordOf: tm.recordOf(P),
    yourRecord: tm.yourRecord,
    recordHidden: tm.recordHidden,
    openRecord: tm.openRecord,
    placeholder: tm.placeholder,
    send: tm.send,
    attach: tm.attach,
    removePhoto: tm.removePhoto,
    like: tm.like,
    replyingTo: tm.replyingTo(P),
    edit: tm.edit,
    editing: tm.editing,
    save: tm.save,
    cancel: tm.cancel,
    copy: tm.copy,
    unsend: tm.unsend,
    unsendConfirm: tm.unsendConfirm,
    reply: tm.reply,
    actions: tm.actions,
    edited: tm.edited,
    seen: tm.seen,
    seenBy: tm.seenBy(9999).replace("9999", "{n}"),
    typing: tm.typing(P),
    older: tm.older,
    cannotSend: tm.cannotSend,
    leftGroup: tm.leftGroup,
    sending: tm.sending,
    failed: tm.failed,
    group: tm.group(9999).replace("9999", "{n}"),
    sysCreated: tm.system.created(P),
    sysAdded: tm.system.added(P, "{names}"),
    sysLeft: tm.system.left(P),
    sysRenamed: tm.system.renamed(P, "{title}"),
    sysUnnamed: tm.system.renamed(P, null),
    listSeparator: t.common.listSeparator,
    today: t.memories.timeline.today,
    yesterday: t.memories.timeline.yesterday,
    errors: t.errors as Record<string, string>,
  };
  const view: ConvView = {
    id: conv.id,
    kind: conv.kind,
    title: conv.title,
    canSend: conv.canSend,
    left: conv.me.left,
    members: conv.members.map((m) => ({ id: m.id, name: m.name, left: m.left, lastReadAt: m.lastReadAt?.toISOString() ?? null, typing: m.typing })),
  };
  return <ChatView me={uid} conv={view} initial={initial} tz={tz} locale={locale} text={text} reactions={[...DM_REACTIONS]} editMinutes={DM_EDIT_MINUTES} maxPhotos={DM_MAX_PHOTOS} />;
}
