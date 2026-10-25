"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { dmEdit, dmReact, dmSend, dmTyping, dmUnsend, dmUpload } from "@/app/actions/dm";
import type { DmMessage } from "@/server/services/dm";
import { DmAvatar } from "./dm-avatar";

export interface ChatText {
  back: string;
  info: string;
  you: string;
  unsent: string;
  unsentMine: string;
  photo: string;
  recordOf: string;
  yourRecord: string;
  recordHidden: string;
  openRecord: string;
  placeholder: string;
  send: string;
  attach: string;
  removePhoto: string;
  like: string;
  replyingTo: string;
  edit: string;
  editing: string;
  save: string;
  cancel: string;
  copy: string;
  unsend: string;
  unsendConfirm: string;
  reply: string;
  actions: string;
  edited: string;
  seen: string;
  seenBy: string;
  typing: string;
  older: string;
  cannotSend: string;
  leftGroup: string;
  sending: string;
  failed: string;
  group: string;
  sysCreated: string;
  sysAdded: string;
  sysLeft: string;
  sysRenamed: string;
  sysUnnamed: string;
  listSeparator: string;
  today: string;
  yesterday: string;
  errors: Record<string, string>;
}

export interface ConvView {
  id: string;
  kind: "direct" | "group";
  title: string | null;
  canSend: boolean;
  left: boolean;
  members: { id: string; name: string; left: boolean; lastReadAt: string | null; typing: boolean }[];
  /** Photo links of members whose photo I may see. */
  avatars: Record<string, string>;
}

type Msg = DmMessage & { pending?: boolean; failed?: string; localPhotos?: string[] };
type Photo = { blob: Blob; w: number; h: number; url: string };

const POLL_MS = 2500;
const RUN_GAP_MS = 5 * 60_000;
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

/** Shrink a photo in the browser (longest side 1600px, JPEG): smaller to send, and its metadata (e.g. location) is not kept. */
async function shrink(file: File): Promise<Photo> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("encode");
  return { blob, w, h, url: URL.createObjectURL(blob) };
}

/** Text with web links made clickable. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2 [overflow-wrap:anywhere]">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function ChatView({
  me,
  conv: initialConv,
  initial,
  tz,
  locale,
  text: tx,
  reactions,
  editMinutes,
  maxPhotos,
}: {
  me: string;
  conv: ConvView;
  initial: DmMessage[];
  tz: string;
  locale: string;
  text: ChatText;
  reactions: string[];
  editMinutes: number;
  maxPhotos: number;
}) {
  const [conv, setConv] = useState(initialConv);
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [hasOlder, setHasOlder] = useState(initial.length >= 40);
  const [draft, setDraft] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<Msg | null>(null);
  const [menu, setMenu] = useState<Msg | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);
  const keepOffset = useRef<number | null>(null);
  const lastTyping = useRef(0);
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  const press = useRef<number | null>(null);
  // The clock, for "today" and the edit window (ticks; reading Date.now() while rendering is not allowed).
  const [now, setNow] = useState(() => new Date(initial.at(-1)?.createdAt ?? 0).getTime());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  const cursor = useRef(initial.reduce((a, m) => (m.updatedAt > a ? m.updatedAt : a), new Date(0).toISOString()));

  const names = useMemo(() => new Map(conv.members.map((m) => [m.id, m.id === me ? tx.you : m.name])), [conv.members, me, tx.you]);
  const others = conv.members.filter((m) => m.id !== me);
  const activeOthers = others.filter((m) => !m.left);
  const title = conv.kind === "group" && conv.title ? conv.title : (conv.kind === "group" ? activeOthers : others).map((m) => m.name).join(tx.listSeparator);
  const typing = others.filter((m) => m.typing && !m.left);

  // ── Keeping up to date ────────────────────────────────────────────────
  const merge = useCallback((incoming: DmMessage[]) => {
    if (!incoming.length) return;
    setMsgs((cur) => {
      const byId = new Map(cur.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt < b.createdAt ? -1 : 1));
    });
    const newest = incoming.reduce((a, m) => (m.updatedAt > a ? m.updatedAt : a), cursor.current);
    // Overlap a little: a change committed just after a read can carry an earlier timestamp.
    cursor.current = new Date(Math.max(new Date(newest).getTime() - 5000, new Date(cursor.current).getTime())).toISOString();
  }, []);

  const sync = useCallback(async () => {
    const visible = document.visibilityState === "visible";
    const r = await fetch(`/api/dm/${conv.id}/sync?since=${encodeURIComponent(cursor.current)}&read=${visible ? 1 : 0}`, { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const j = (await r.json()) as { messages: DmMessage[]; conversation: { canSend: boolean; title: string | null; me: { left: boolean }; members: { id: string; name: string; left: boolean; lastReadAt: string | null; typing: boolean }[] } };
    merge(j.messages);
    setConv((c) => ({ ...c, canSend: j.conversation.canSend, title: j.conversation.title, left: j.conversation.me.left, members: j.conversation.members.map((m) => ({ id: m.id, name: m.name, left: m.left, lastReadAt: m.lastReadAt, typing: m.typing })) }));
  }, [conv.id, merge]);

  useEffect(() => {
    const id = window.setInterval(() => document.visibilityState === "visible" && void sync(), POLL_MS);
    const onVis = () => document.visibilityState === "visible" && void sync();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sync]);

  // Escape closes the action sheet or the photo viewer.
  useEffect(() => {
    if (!menu && !viewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(null);
      setViewer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, viewer]);

  // ── Scrolling: stay at the bottom unless reading back; keep place when loading older ──
  const onScroll = () => {
    const el = list.current!;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    if (keepOffset.current !== null) {
      el.scrollTop = el.scrollHeight - keepOffset.current;
      keepOffset.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [msgs, typing.length]);

  const loadOlder = async () => {
    const oldest = msgs.find((m) => !m.pending);
    if (!oldest) return;
    const r = await fetch(`/api/dm/${conv.id}/older?before=${encodeURIComponent(oldest.createdAt)}`, { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const j = (await r.json()) as { messages: DmMessage[] };
    setHasOlder(j.messages.length >= 40);
    keepOffset.current = list.current!.scrollHeight - list.current!.scrollTop;
    merge(j.messages);
  };

  // ── Writing ───────────────────────────────────────────────────────────
  const onType = (v: string) => {
    setDraft(v);
    if (!editing && v && Date.now() - lastTyping.current > 4000) {
      lastTyping.current = Date.now();
      void dmTyping(conv.id);
    }
  };

  const pickPhotos = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const room = maxPhotos - photos.length;
    const chosen = [...files].slice(0, Math.max(room, 0));
    try {
      const ready = await Promise.all(chosen.map(shrink));
      setPhotos((p) => [...p, ...ready].slice(0, maxPhotos));
    } catch {
      setError(tx.errors.invalid_image ?? tx.failed);
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const send = async (override?: string) => {
    const body = (override ?? draft).trim();
    setError(null);
    if (editing) {
      if (!body) return;
      const target = editing;
      setEditing(null);
      setDraft("");
      setMsgs((cur) => cur.map((m) => (m.id === target.id ? { ...m, body, edited: true } : m)));
      const r = await dmEdit(target.id, body);
      if (!r.ok) setError(tx.errors[r.error] ?? tx.failed);
      void sync();
      return;
    }
    if (!body && photos.length === 0) return;
    const sending = photos;
    const reply = replyTo;
    const tmpId = `tmp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    stickToBottom.current = true;
    setMsgs((cur) => [
      ...cur,
      {
        id: tmpId, senderId: me, senderName: null, kind: sending.length ? "image" : "text", body: body || null, meta: null, createdAt: now, updatedAt: now,
        edited: false, deleted: false, record: null, attachments: [], reactions: [], pending: true, localPhotos: sending.map((p) => p.url),
        reply: reply ? { id: reply.id, senderName: names.get(reply.senderId ?? "") ?? null, kind: reply.kind, body: reply.body, deleted: reply.deleted } : null,
      },
    ]);
    if (!override) setDraft("");
    setPhotos([]);
    setReplyTo(null);
    const fail = (code: string) => setMsgs((cur) => cur.map((m) => (m.id === tmpId ? { ...m, pending: false, failed: tx.errors[code] ?? tx.failed } : m)));
    const ids: string[] = [];
    for (const p of sending) {
      const fd = new FormData();
      fd.set("conversationId", conv.id);
      fd.set("photo", new File([p.blob], "photo.jpg", { type: "image/jpeg" }));
      fd.set("width", String(p.w));
      fd.set("height", String(p.h));
      const r = await dmUpload(fd);
      if (!r.ok) return fail(r.error);
      ids.push(r.value);
    }
    const r = await dmSend(conv.id, { kind: sending.length ? "image" : "text", body: body || undefined, replyTo: reply?.id ?? null, attachmentIds: ids });
    if (!r.ok) return fail(r.error);
    // The real message arrives with the next sync; drop the stand-in once it does.
    setMsgs((cur) => cur.filter((m) => m.id !== tmpId || cur.some((x) => x.id === r.value)).map((m) => (m.id === tmpId ? { ...m, id: r.value, pending: false } : m)));
    await sync();
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends on a keyboard (not while composing Japanese, not on touch screens); Shift+Enter is a new line.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia("(pointer: coarse)").matches) {
      e.preventDefault();
      void send();
    }
  };

  // ── Acting on a message ───────────────────────────────────────────────
  const myReaction = (m: Msg) => m.reactions.find((r) => r.userId === me)?.emoji ?? null;
  const react = async (m: Msg, emoji: string) => {
    const next = myReaction(m) === emoji ? null : emoji;
    setMenu(null);
    setMsgs((cur) => cur.map((x) => (x.id === m.id ? { ...x, reactions: [...x.reactions.filter((r) => r.userId !== me), ...(next ? [{ userId: me, emoji: next }] : [])] } : x)));
    await dmReact(m.id, next);
    void sync();
  };
  const unsend = async (m: Msg) => {
    setMenu(null);
    if (!window.confirm(tx.unsendConfirm)) return;
    setMsgs((cur) => cur.map((x) => (x.id === m.id ? { ...x, deleted: true, body: null, attachments: [], record: null, reactions: [] } : x)));
    await dmUnsend(m.id);
    void sync();
  };
  const startEdit = (m: Msg) => {
    setMenu(null);
    setReplyTo(null);
    setEditing(m);
    setDraft(m.body ?? "");
    area.current?.focus();
  };
  const startReply = (m: Msg) => {
    setMenu(null);
    setEditing(null);
    setReplyTo(m);
    area.current?.focus();
  };
  const canEdit = (m: Msg) => m.senderId === me && m.kind === "text" && !m.deleted && !m.pending && now - new Date(m.createdAt).getTime() < editMinutes * 60_000;
  const actionable = (m: Msg) => m.kind !== "system" && !m.deleted && !m.pending && !m.failed;

  const onTap = (m: Msg, at: number) => {
    // Double tap: ❤️.
    if (lastTap.current?.id === m.id && at - lastTap.current.at < 320) {
      lastTap.current = null;
      if (actionable(m)) void react(m, "❤️");
    } else lastTap.current = { id: m.id, at };
  };
  const pressStart = (m: Msg) => {
    if (!actionable(m)) return;
    press.current = window.setTimeout(() => setMenu(m), 450);
  };
  const pressEnd = () => {
    if (press.current) window.clearTimeout(press.current);
    press.current = null;
  };

  // ── Rendering helpers ─────────────────────────────────────────────────
  const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  const todayKey = dayKey(new Date(now).toISOString());
  const yesterdayKey = dayKey(new Date(now - 86_400_000).toISOString());
  const dayLabel = (iso: string) => {
    const k = dayKey(iso);
    if (k === todayKey) return tx.today;
    if (k === yesterdayKey) return tx.yesterday;
    return new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", weekday: "short", timeZone: tz }).format(new Date(iso));
  };
  const clock = (iso: string) => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
  const systemText = (m: Msg) => {
    const meta = m.meta;
    if (!meta) return "";
    const by = names.get(meta.by) ?? "?";
    if (meta.event === "created") return fill(tx.sysCreated, { name: by });
    if (meta.event === "added") return fill(tx.sysAdded, { name: by, names: (meta.users ?? []).map((u) => names.get(u) ?? "?").join(tx.listSeparator) });
    if (meta.event === "left") return fill(tx.sysLeft, { name: by });
    return meta.title ? fill(tx.sysRenamed, { name: by, title: meta.title }) : fill(tx.sysUnnamed, { name: by });
  };
  const preview = (m: { kind: string; body: string | null; deleted: boolean }) => (m.deleted ? tx.unsent : m.kind === "image" ? (m.body ?? tx.photo) : m.kind === "record" ? "📄" : (m.body ?? ""));

  // Read receipt: under my newest message.
  const myLast = [...msgs].reverse().find((m) => m.senderId === me && !m.pending && !m.failed && m.kind !== "system");
  const seenCount = myLast ? activeOthers.filter((o) => o.lastReadAt && o.lastReadAt >= myLast.createdAt).length : 0;
  const seenLabel = seenCount === 0 ? null : conv.kind === "direct" ? tx.seen : fill(tx.seenBy, { n: seenCount });

  const rows: React.ReactNode[] = [];
  msgs.forEach((m, i) => {
    const prev = msgs[i - 1];
    const next = msgs[i + 1];
    if (!prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)) {
      rows.push(
        <li key={`d-${m.id}`} className="py-3 text-center">
          <span className="rounded-full bg-stone-200/70 px-3 py-1 text-[11px] font-semibold text-stone-600">{dayLabel(m.createdAt)}</span>
        </li>,
      );
    }
    if (m.kind === "system") {
      rows.push(<li key={m.id} className="px-6 py-1.5 text-center text-xs text-stone-500">{systemText(m)}</li>);
      return;
    }
    const mine = m.senderId === me;
    const sameRun = (a?: Msg, b?: Msg) => !!a && !!b && a.kind !== "system" && b.kind !== "system" && a.senderId === b.senderId && Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) < RUN_GAP_MS && dayKey(a.createdAt) === dayKey(b.createdAt);
    const first = !sameRun(prev, m);
    const last = !sameRun(m, next);
    const counts = new Map<string, number>();
    for (const r of m.reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    const bubble = mine ? "bg-linear-to-br from-teal-600 to-teal-700 text-white" : "bg-white text-stone-900 ring-1 ring-stone-200";
    const corner = mine ? `${first ? "" : "rounded-tr-md"} ${last ? "" : "rounded-br-md"}` : `${first ? "" : "rounded-tl-md"} ${last ? "" : "rounded-bl-md"}`;
    rows.push(
      <li key={m.id} id={`m-${m.id}`} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${last ? "mb-2" : "mb-0.5"}`}>
        {!mine && conv.kind === "group" && <span className="w-7 shrink-0">{last && <DmAvatar names={[m.senderName ?? "?"]} srcs={[conv.avatars[m.senderId ?? ""]]} size="sm" />}</span>}
        <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
          {!mine && conv.kind === "group" && first && <span className="mb-0.5 ml-3 text-[11px] text-stone-500">{m.senderName}</span>}
          {m.reply && (
            <a href={`#m-${m.reply.id}`} className={`mb-[-6px] max-w-full rounded-2xl bg-stone-200/80 px-3 pb-3 pt-1.5 text-xs text-stone-600 ${mine ? "mr-1" : "ml-1"}`}>
              <span className="block font-semibold">↩ {m.reply.senderName}</span>
              <span className="line-clamp-2">{preview(m.reply)}</span>
            </a>
          )}
          <div
            role="button"
            tabIndex={0}
            aria-label={tx.actions}
            onClick={(e) => onTap(m, e.timeStamp)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && actionable(m) && setMenu(m)}
            onContextMenu={(e) => {
              if (!actionable(m)) return;
              e.preventDefault();
              setMenu(m);
            }}
            onPointerDown={() => pressStart(m)}
            onPointerUp={pressEnd}
            onPointerLeave={pressEnd}
            onPointerMove={pressEnd}
            className={`group relative select-text outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${m.pending ? "opacity-60" : ""} rounded-3xl`}
          >
            {m.deleted ? (
              <p className="rounded-3xl border border-dashed border-stone-300 px-3.5 py-2 text-sm italic text-stone-500">{mine ? tx.unsentMine : tx.unsent}</p>
            ) : (
              <>
                {(m.attachments.length > 0 || (m.localPhotos?.length ?? 0) > 0) && (
                  <div className={`mb-1 grid gap-1 ${(m.attachments.length || m.localPhotos!.length) > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {m.attachments.length > 0
                      ? m.attachments.map((a) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={a.id}
                            src={`/api/dm/photo/${a.id}`}
                            width={a.w}
                            height={a.h}
                            alt=""
                            loading="lazy"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewer(`/api/dm/photo/${a.id}`);
                            }}
                            className="h-auto max-h-80 w-full cursor-zoom-in rounded-3xl object-cover"
                          />
                        ))
                      : m.localPhotos!.map((u) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={u} src={u} alt="" className="h-auto max-h-80 w-full rounded-3xl object-cover" />
                        ))}
                  </div>
                )}
                {m.record &&
                  ("hidden" in m.record ? (
                    <p className="rounded-3xl bg-stone-100 px-3.5 py-2.5 text-sm text-stone-500 ring-1 ring-stone-200">📄 {tx.recordHidden}</p>
                  ) : (
                    <Link
                      href={m.record.mine ? `/memories/${m.record.id}` : `/memories/shared/${m.record.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block w-64 max-w-full rounded-3xl bg-white p-3 text-stone-900 shadow-sm ring-1 ring-stone-200 transition hover:ring-teal-300"
                    >
                      <span className="block text-[11px] font-semibold text-rose-800">📄 {m.record.mine ? tx.yourRecord : fill(tx.recordOf, { name: m.record.ownerName })}</span>
                      {m.record.title && <span className="block font-semibold">{m.record.title}</span>}
                      <span className="line-clamp-4 block whitespace-pre-line text-sm text-stone-700">{m.record.body}</span>
                      <span className="mt-1 block text-right text-xs font-semibold text-teal-700">{tx.openRecord} →</span>
                    </Link>
                  ))}
                {m.body && (
                  <p className={`whitespace-pre-wrap break-words rounded-3xl px-3.5 py-2 text-[15px] leading-relaxed ${bubble} ${corner} ${m.kind === "image" || m.kind === "record" ? "mt-1" : ""}`}>
                    <Linkified text={m.body} />
                  </p>
                )}
              </>
            )}
            {actionable(m) && (
              <button
                type="button"
                aria-label={tx.actions}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenu(m);
                }}
                className={`absolute top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-stone-500 shadow ring-1 ring-stone-200 group-hover:flex ${mine ? "-left-9" : "-right-9"}`}
              >
                ⋯
              </button>
            )}
          </div>
          {counts.size > 0 && (
            <div className={`-mt-1.5 flex gap-1 ${mine ? "mr-2" : "ml-2"}`}>
              {[...counts].map(([e, n]) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => void react(m, e)}
                  aria-pressed={myReaction(m) === e}
                  className={`rounded-full bg-white px-1.5 py-0.5 text-xs shadow-sm ring-1 transition active:scale-90 ${myReaction(m) === e ? "ring-teal-400" : "ring-stone-200"}`}
                >
                  {e}
                  {n > 1 && <span className="ml-0.5 text-stone-500">{n}</span>}
                </button>
              ))}
            </div>
          )}
          {(last || m.pending || m.failed) && (
            <span className={`mt-0.5 px-2 text-[10px] ${m.failed ? "text-rose-700" : "text-stone-400"}`}>
              {m.failed ? `⚠ ${m.failed}` : m.pending ? tx.sending : `${clock(m.createdAt)}${m.edited && !m.deleted ? ` · ${tx.edited}` : ""}`}
            </span>
          )}
          {myLast && m.id === myLast.id && seenLabel && <span className="px-2 text-[10px] font-semibold text-stone-500">{seenLabel}</span>}
        </div>
      </li>,
    );
  });

  const cantWrite = conv.left ? tx.leftGroup : !conv.canSend ? tx.cannotSend : null;
  const subtitle = typing.length ? fill(tx.typing, { name: typing.map((x) => x.name).join(tx.listSeparator) }) : conv.kind === "group" ? fill(tx.group, { n: activeOthers.length + 1 }) : null;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col bg-[#faf8f5]">
      <header className="flex shrink-0 items-center gap-2 border-b border-stone-200/70 bg-white/80 px-2 py-2 backdrop-blur-md">
        <Link href="/messages" aria-label={tx.back} className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-stone-600 hover:bg-stone-100">
          ←
        </Link>
        <DmAvatar names={(conv.kind === "group" ? activeOthers : others).map((m) => m.name)} srcs={(conv.kind === "group" ? activeOthers : others).map((m) => conv.avatars[m.id])} size="sm" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold text-stone-900">{title}</h1>
          {subtitle && <p className={`truncate text-xs ${typing.length ? "text-teal-700" : "text-stone-500"}`}>{subtitle}</p>}
        </div>
        <Link href={`/messages/${conv.id}/info`} aria-label={tx.info} className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-stone-600 hover:bg-stone-100">
          ⓘ
        </Link>
      </header>

      <div ref={list} onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
        {hasOlder && (
          <div className="py-3 text-center">
            <button type="button" onClick={() => void loadOlder()} className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-teal-700 ring-1 ring-stone-200 hover:bg-stone-50">
              {tx.older}
            </button>
          </div>
        )}
        <ol aria-live="polite" className="pt-2">
          {rows}
          {typing.length > 0 && (
            <li className="mb-2 flex items-end gap-2" aria-label={subtitle ?? undefined}>
              <span className="flex gap-1 rounded-3xl bg-white px-4 py-3 ring-1 ring-stone-200">
                {[0, 1, 2].map((d) => (
                  <span key={d} className={`h-1.5 w-1.5 animate-[bob_1s_ease-in-out_infinite] rounded-full bg-stone-400 ${d === 1 ? "[animation-delay:150ms]" : d === 2 ? "[animation-delay:300ms]" : ""}`} />
                ))}
              </span>
            </li>
          )}
        </ol>
      </div>

      <div className="shrink-0 border-t border-stone-200/70 bg-white/90 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
        {cantWrite ? (
          <p className="rounded-2xl bg-stone-100 px-4 py-3 text-center text-sm text-stone-600">{cantWrite}</p>
        ) : (
          <>
            {error && <p role="alert" className="mb-2 text-sm text-rose-700">{error}</p>}
            {(replyTo || editing) && (
              <div className="mb-2 flex items-start gap-2 rounded-2xl bg-stone-100 px-3 py-2 text-xs text-stone-600">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-stone-800">{editing ? tx.editing : fill(tx.replyingTo, { name: names.get(replyTo!.senderId ?? "") ?? "" })}</span>
                  <span className="line-clamp-1">{preview(editing ?? replyTo!)}</span>
                </span>
                <button
                  type="button"
                  aria-label={tx.cancel}
                  onClick={() => {
                    if (editing) setDraft("");
                    setEditing(null);
                    setReplyTo(null);
                  }}
                  className="h-6 w-6 shrink-0 rounded-full text-base leading-none text-stone-500 hover:bg-stone-200"
                >
                  ✕
                </button>
              </div>
            )}
            {photos.length > 0 && (
              <div className="mb-2 flex gap-2">
                {photos.map((p, i) => (
                  <span key={p.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                    <button
                      type="button"
                      aria-label={tx.removePhoto}
                      onClick={() => setPhotos((cur) => cur.filter((_, j) => j !== i))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 text-[10px] text-white"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              {!editing && (
                <>
                  <button
                    type="button"
                    aria-label={tx.attach}
                    onClick={() => fileInput.current?.click()}
                    disabled={photos.length >= maxPhotos}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xl text-stone-600 transition hover:bg-stone-200 active:scale-90 disabled:opacity-40"
                  >
                    🖼
                  </button>
                  <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => void pickPhotos(e.target.files)} />
                </>
              )}
              <textarea
                ref={area}
                value={draft}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                maxLength={4000}
                aria-label={tx.placeholder}
                placeholder={tx.placeholder}
                className="field-sizing-content max-h-36 min-h-11 flex-1 resize-none rounded-3xl border border-stone-200 bg-white px-4 py-2.5 text-base leading-snug text-stone-900 placeholder:text-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
              {draft.trim() || photos.length || editing ? (
                <button
                  type="button"
                  onClick={() => void send()}
                  className="h-11 shrink-0 rounded-full bg-teal-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 active:scale-95"
                >
                  {editing ? tx.save : tx.send}
                </button>
              ) : (
                <button type="button" aria-label={tx.like} onClick={() => void send("❤️")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl transition hover:bg-rose-50 active:scale-90">
                  ❤️
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {menu && (
        <div className="fixed inset-0 z-40 flex items-end justify-center" role="presentation">
          <button type="button" aria-label={tx.cancel} tabIndex={-1} onClick={() => setMenu(null)} className="absolute inset-0 animate-[fadeIn_.15s_ease-out] bg-stone-900/30 motion-reduce:animate-none" />
          <div role="dialog" aria-modal="true" aria-label={tx.actions} className="relative w-full max-w-md animate-[sheetUp_.2s_ease-out] rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl motion-reduce:animate-none">
            <p className="mb-3 line-clamp-2 rounded-2xl bg-stone-50 px-3 py-2 text-sm text-stone-600">{preview(menu)}</p>
            <div className="mb-3 flex justify-between">
              {reactions.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => void react(menu, e)}
                  aria-pressed={myReaction(menu) === e}
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl transition active:scale-90 ${myReaction(menu) === e ? "bg-teal-100 ring-2 ring-teal-400" : "hover:bg-stone-100"}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="grid gap-1">
              <button type="button" onClick={() => startReply(menu)} className="rounded-2xl px-4 py-3 text-left font-medium text-stone-800 hover:bg-stone-50">↩ {tx.reply}</button>
              {menu.body && (
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(menu.body ?? "");
                    setMenu(null);
                  }}
                  className="rounded-2xl px-4 py-3 text-left font-medium text-stone-800 hover:bg-stone-50"
                >
                  ⧉ {tx.copy}
                </button>
              )}
              {canEdit(menu) && <button type="button" onClick={() => startEdit(menu)} className="rounded-2xl px-4 py-3 text-left font-medium text-stone-800 hover:bg-stone-50">✎ {tx.edit}</button>}
              {menu.senderId === me && <button type="button" onClick={() => void unsend(menu)} className="rounded-2xl px-4 py-3 text-left font-medium text-rose-700 hover:bg-rose-50">⟲ {tx.unsend}</button>}
            </div>
          </div>
        </div>
      )}

      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" role="dialog" aria-modal="true">
          <button type="button" aria-label={tx.cancel} onClick={() => setViewer(null)} className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white">
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewer} alt="" onClick={() => setViewer(null)} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
