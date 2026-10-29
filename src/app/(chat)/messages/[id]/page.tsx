import { notFound } from "next/navigation";
import { ChatView, type ChatText, type ConvView } from "@/components/chat-view";
import { DM_EDIT_MINUTES, DM_MAX_PHOTOS, DM_REACTIONS, dmConversation, dmMessages, markRead } from "@/server/services/dm";
import { getT } from "@/lib/i18n/server";
import { sharedEntry } from "@/server/services/comments";
import { uuid } from "@/lib/validation/common";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { avatarUrls } from "@/server/services/avatars";
import { groupPhotoUrls } from "@/server/services/group-photo";
import { myTint, typeTints } from "@/server/services/card";

/** One conversation. Loads the newest messages; the client keeps it up to date. */
export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ draft?: string; record?: string }> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const draft = (sp.draft ?? "").slice(0, 1000);
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
    camera: t.memories.media.camera,
    openPerson: t.replies.openProfile(P),
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
    recordReply: tm.recordReply(P),
    recordReplyToYou: tm.recordReplyToYou,
    shownBy: tm.shownBy(P),
    edit: tm.edit,
    editPassed: t.errors.edit_window_passed,
    editing: tm.editing,
    save: tm.save,
    cancel: tm.cancel,
    copy: tm.copy,
    translate: tm.translate,
    untranslate: tm.untranslate,
    translating: tm.translating,
    translation: tm.translation,
    translateSame: tm.translateSame,
    translateNote: tm.translateNote,
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
    retry: tm.retry,
    discard: tm.discard,
    sessionExpired: tm.sessionExpired,
    reload: tm.reload,
    group: tm.group(9999).replace("9999", "{n}"),
    sysCreated: tm.system.created(P),
    sysAdded: tm.system.added(P, "{names}"),
    sysLeft: tm.system.left(P),
    sysRenamed: tm.system.renamed(P, "{title}"),
    sysUnnamed: tm.system.renamed(P, null),
    sysPhoto: tm.system.photo(P),
    sysPhotoRemoved: tm.system.photoRemoved(P),
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
    members: conv.members.map((m) => ({ id: m.id, name: m.name, left: m.left, lastReadAt: m.lastReadAt?.toISOString() ?? null, typing: m.typing, connected: m.connected })),
    avatars: Object.fromEntries(await avatarUrls(uid, conv.members.map((m) => m.id))),
    photo: conv.kind === "group" ? ((await groupPhotoUrls(uid, [conv.id])).get(conv.id) ?? null) : null,
    tints: Object.fromEntries(await typeTints(uid, conv.members.map((m) => m.id))),
  };
  // Opened to answer someone's record: only theirs, in our one-to-one conversation with them.
  const shared = sp.record && uuid.safeParse(sp.record).success ? await sharedEntry(uid, sp.record) : null;
  const startRecord =
    shared && conv.kind === "direct" && conv.members.some((x) => x.id === shared.ownerId)
      ? { id: shared.id, ownerName: shared.ownerName, kind: shared.kind, title: shared.title, body: shared.body }
      : null;
  return <ChatView me={uid} conv={view} initial={initial} tz={tz} locale={locale} text={text} reactions={[...DM_REACTIONS]} editMinutes={DM_EDIT_MINUTES} maxPhotos={DM_MAX_PHOTOS} startDraft={draft} startRecord={startRecord} />;
}
