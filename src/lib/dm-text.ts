import type { Dict } from "@/lib/i18n/messages/en";
import type { DmInboxItem, DmMessage, DmSystemMeta } from "@/server/services/dm";

/** A conversation's name: the group's title, or the other people's names. */
export function dmTitle(c: { kind: "direct" | "group"; title: string | null; others: { name: string }[] }, t: Dict) {
  if (c.kind === "group" && c.title) return c.title;
  return c.others.map((o) => o.name).join(t.common.listSeparator) || t.messages.title;
}

/** A system message in words. */
export function dmSystemText(meta: DmSystemMeta | null, nameOf: (id: string) => string, t: Dict) {
  const m = t.messages.system;
  if (!meta) return "";
  const by = nameOf(meta.by);
  if (meta.event === "created") return m.created(by);
  if (meta.event === "added") return m.added(by, (meta.users ?? []).map(nameOf).join(t.common.listSeparator));
  if (meta.event === "left") return m.left(by);
  if (meta.event === "photo") return meta.removed ? m.photoRemoved(by) : m.photo(by);
  return m.renamed(by, meta.title ?? null);
}

/** The one-line preview of a conversation's last message. */
export function dmPreview(c: DmInboxItem, t: Dict, myId: string) {
  const l = c.last;
  const tm = t.messages;
  if (l.kind === "system") return dmSystemText(l.meta, (id) => (id === myId ? tm.you : (c.others.find((o) => o.id === id)?.name ?? "?")), t);
  if (l.deleted) return l.mine ? tm.unsentMine : tm.unsent;
  const what = l.kind === "image" ? (l.body ? `${tm.photo} ${l.body}` : tm.photo) : l.kind === "record" ? tm.record : (l.body ?? "");
  const who = l.mine ? `${tm.you}: ` : c.kind === "group" && l.senderName ? `${l.senderName}: ` : "";
  return `${who}${what}`;
}

export type { DmMessage };
