"use client";
import { askConfirm } from "@/lib/confirm";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { dmEdit, dmReact, dmTranslate, dmUnsend } from "@/app/actions/dm";
import type { DmMessage } from "@/server/services/dm";
import { DmAvatar } from "./dm-avatar";
import { firstUrl, LinkCard } from "./link-card";
import type { MainStarId } from "@/lib/tuvi/stars";

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
  /** "Replying to {name}'s record" (the composer chip, and the card it sends). */
  recordReply: string;
  /** "A reply to your record" (the owner's view of that card). */
  recordReplyToYou: string;
  /** "A record {name} showed you" (shown in the message only: no page to open). */
  shownBy: string;
  edit: string;
  editing: string;
  save: string;
  cancel: string;
  copy: string;
  translate: string;
  untranslate: string;
  translating: string;
  translation: string;
  translateSame: string;
  translateNote: string;
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
  retry: string;
  discard: string;
  sessionExpired: string;
  reload: string;
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
  /** Members' types (connections whose card shows it), for the colour behind an initial. */
  tints?: Record<string, MainStarId>;
}

type Msg = DmMessage & { pending?: boolean; failed?: string; localPhotos?: string[] };
type Photo = { blob: Blob; w: number; h: number; url: string };
/** A message waiting to go out (or that failed and can be sent again). */
type Job = { id: string; body: string; replyTo: string | null; recordId?: string | null; photos: Photo[]; uploads?: Promise<({ ok: true; value: string } | { ok: false; code: string; transient: boolean })[]>; transient: boolean };

const POLL_FAST_MS = 1500;
const POLL_SLOW_MS = 4000;
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
  startDraft = "",
  startRecord = null,
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
  /** Text to start the box with (a conversation starter), not sent until the user sends it. */
  startDraft?: string;
  /** Someone else's record this conversation was opened to answer (sent with the first message). */
  startRecord?: { id: string; ownerName: string; kind: string; title: string | null; body: string | null } | null;
}) {
  const [conv, setConv] = useState(initialConv);
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [hasOlder, setHasOlder] = useState(initial.length >= 40);
  const [draft, setDraft] = useState(startDraft);
  const [aboutRecord, setAboutRecord] = useState(startRecord);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<Msg | null>(null);
  const [menu, setMenu] = useState<Msg | null>(null);
  // Translations the reader asked for, by message: shown under the original until turned off.
  // Each remembers the text it translated, so an edited message drops its old translation.
  const [translations, setTranslations] = useState<Record<string, { of: string; state: "loading" } | { of: string; state: "done"; text: string; same: boolean } | { of: string; state: "error"; error: string }>>({});
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
  // A draft from a link is used once: drop it from the address so a reload doesn't bring it back.
  useEffect(() => {
    if (!startDraft && !startRecord) return;
    const u = new URL(window.location.href);
    u.searchParams.delete("draft");
    u.searchParams.delete("record");
    window.history.replaceState(window.history.state, "", u);
  }, [startDraft, startRecord]);
  const outbox = useRef(new Map<string, Job>());
  // The site's sign-in ran out (any request answers 401): stop polling, offer a reload.
  const [signedOut, setSignedOut] = useState(false);
  const signedOutRef = useRef(false);
  const markSignedOut = useCallback(() => {
    signedOutRef.current = true;
    setSignedOut(true);
  }, []);
  const queue = useRef<string[]>([]);
  const pumping = useRef(false);
  const inFlight = useRef(false);
  const again = useRef(false);
  const typingFlag = useRef(false);
  const lastActivity = useRef(0);
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
      for (const m of incoming) {
        if (m.senderId !== me && !byId.has(m.id)) lastActivity.current = Date.now();
        // A message we thought unsent turned out to have arrived: it's done.
        if (outbox.current.has(m.id) && !queue.current.includes(m.id)) outbox.current.delete(m.id);
        byId.set(m.id, m);
      }
      return [...byId.values()].sort((a, b) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt < b.createdAt ? -1 : 1));
    });
    const newest = incoming.reduce((a, m) => (m.updatedAt > a ? m.updatedAt : a), cursor.current);
    // Overlap a little: a change committed just after a read can carry an earlier timestamp.
    cursor.current = new Date(Math.max(new Date(newest).getTime() - 5000, new Date(cursor.current).getTime())).toISOString();
  }, [me]);

  /** One request at a time; asking again while one is out queues exactly one more. */
  const sync = useCallback(async () => {
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    const typingNow = typingFlag.current;
    typingFlag.current = false;
    try {
      const visible = document.visibilityState === "visible";
      const r = await fetch(`/api/dm/${conv.id}/sync?since=${encodeURIComponent(cursor.current)}&read=${visible ? 1 : 0}&typing=${typingNow ? 1 : 0}`, { cache: "no-store" }).catch(() => null);
      if (r?.status === 401) markSignedOut();
      if (r?.ok) {
        const j = (await r.json()) as { messages: DmMessage[]; conversation: { canSend: boolean; title: string | null; me: { left: boolean }; members: { id: string; name: string; left: boolean; lastReadAt: string | null; typing: boolean }[] } };
        merge(j.messages);
        if (j.conversation.members.some((m) => m.typing)) lastActivity.current = Date.now();
        setConv((c) => ({ ...c, canSend: j.conversation.canSend, title: j.conversation.title, left: j.conversation.me.left, members: j.conversation.members }));
      }
    } finally {
      inFlight.current = false;
      if (again.current) {
        again.current = false;
        void sync();
      }
    }
  }, [conv.id, merge, markSignedOut]);

  // Poll: quickly while the conversation is lively, slower when it's quiet, not at all when hidden.
  useEffect(() => {
    let stop = false;
    let timer = 0;
    const loop = async () => {
      if (stop) return;
      if (document.visibilityState === "visible" && !signedOutRef.current) await sync();
      const lively = Date.now() - lastActivity.current < 30_000;
      timer = window.setTimeout(loop, lively ? POLL_FAST_MS : POLL_SLOW_MS);
    };
    timer = window.setTimeout(loop, POLL_FAST_MS);
    const onVis = () => document.visibilityState === "visible" && void sync();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      window.clearTimeout(timer);
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
    const oldest = msgs.find((m) => !m.pending && !m.failed);
    if (!oldest) return;
    const r = await fetch(`/api/dm/${conv.id}/older?before=${encodeURIComponent(oldest.createdAt)}`, { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const j = (await r.json()) as { messages: DmMessage[] };
    setHasOlder(j.messages.length >= 40);
    keepOffset.current = list.current!.scrollHeight - list.current!.scrollTop;
    merge(j.messages);
  };

  // ── Writing ───────────────────────────────────────────────────────────
  // "Typing" rides along with the next update request instead of a request of its own.
  const onType = (v: string) => {
    setDraft(v);
    if (!editing && v && Date.now() - lastTyping.current > 3000) {
      lastTyping.current = Date.now();
      lastActivity.current = Date.now();
      typingFlag.current = true;
      void sync();
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

  /** A request's outcome: done, refused for good (with the reason), or worth trying again. */
  type Outcome<T> = { ok: true; value: T } | { ok: false; code: string; transient: boolean };
  const post = async <T,>(url: string, init: RequestInit, pick: (j: Record<string, unknown>) => T): Promise<Outcome<T>> => {
    try {
      const r = await fetch(url, { method: "POST", cache: "no-store", ...init });
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (r.ok) return { ok: true, value: pick(j) };
      if (r.status === 401) {
        markSignedOut();
        return { ok: false, code: "session_expired", transient: false };
      }
      return { ok: false, code: typeof j.error === "string" ? j.error : "generic", transient: r.status >= 500 || r.status === 429 };
    } catch {
      return { ok: false, code: "generic", transient: true };
    }
  };
  const upload = (p: Photo) => {
    const fd = new FormData();
    fd.set("photo", new File([p.blob], "photo.jpg", { type: "image/jpeg" }));
    fd.set("width", String(p.w));
    fd.set("height", String(p.h));
    return post(`/api/dm/${conv.id}/photo`, { body: fd }, (j) => j.id as string);
  };
  /** Start (or restart) a job's photo uploads, all at once, as soon as it is queued. */
  const startUploads = (job: Job) => {
    job.uploads = job.photos.length ? Promise.all(job.photos.map(upload)) : Promise.resolve([]);
  };

  const deliver = async (job: Job): Promise<Outcome<string>> => {
    const ups = await job.uploads!;
    const bad = ups.find((u) => !u.ok);
    if (bad && !bad.ok) {
      startUploads(job); // fresh uploads for a retry
      return bad;
    }
    const attachmentIds = ups.map((u) => (u.ok ? u.value : ""));
    return post(
      `/api/dm/${conv.id}/send`,
      { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: job.id, kind: job.recordId ? "record" : job.photos.length ? "image" : "text", body: job.body || undefined, replyTo: job.replyTo, recordId: job.recordId ?? undefined, attachmentIds }) },
      (j) => j.id as string,
    );
  };

  /** Send what's queued, in order. A failure is retried once by itself, then shown on the message. */
  const pump = async () => {
    if (pumping.current) return;
    pumping.current = true;
    try {
      while (queue.current.length) {
        const job = outbox.current.get(queue.current[0]!)!;
        let r = await deliver(job);
        if (!r.ok && r.transient) {
          await new Promise((res) => window.setTimeout(res, 1500));
          r = await deliver(job);
        }
        queue.current.shift();
        if (r.ok) {
          outbox.current.delete(job.id);
          persist();
          setMsgs((cur) => cur.map((m) => (m.id === job.id ? { ...m, pending: false } : m)));
          lastActivity.current = Date.now();
          void sync();
        } else {
          job.transient = r.transient;
          setMsgs((cur) => cur.map((m) => (m.id === job.id ? { ...m, pending: false, failed: r.transient ? tx.failed : (tx.errors[r.code] ?? tx.failed) } : m)));
        }
      }
    } finally {
      pumping.current = false;
    }
  };

  // Unsent texts are kept in this tab, so a reload (e.g. after signing in again) doesn't lose them.
  const storeKey = `mosaic-dm-unsent:${conv.id}`;
  const persist = () => {
    try {
      const keep = [...outbox.current.values()].filter((j) => !j.photos.length).map((j) => ({ id: j.id, body: j.body, replyTo: j.replyTo }));
      if (keep.length) sessionStorage.setItem(storeKey, JSON.stringify(keep));
      else sessionStorage.removeItem(storeKey);
    } catch {
      // Storage unavailable (private mode): nothing kept.
    }
  };

  const enqueue = (job: Job) => {
    outbox.current.set(job.id, job);
    queue.current.push(job.id);
    persist();
    void pump();
  };
  const retry = (id: string) => {
    const job = outbox.current.get(id);
    if (!job) return;
    setMsgs((cur) => cur.map((m) => (m.id === id ? { ...m, failed: undefined, pending: true } : m)));
    enqueue(job);
  };
  const discard = (id: string) => {
    outbox.current.delete(id);
    persist();
    setMsgs((cur) => cur.filter((m) => m.id !== id));
  };

  // Back from a reload: what wasn't sent shows as failed, ready to resend (if it did arrive, the next update replaces it).
  useEffect(() => {
    let saved: { id: string; body: string; replyTo: string | null }[] = [];
    try {
      saved = JSON.parse(sessionStorage.getItem(storeKey) ?? "[]");
    } catch {
      saved = [];
    }
    if (!saved.length) return;
    // After the first paint, so the server-rendered page and the browser agree.
    const frame = requestAnimationFrame(() => {
      const at = new Date().toISOString();
      for (const j of saved) outbox.current.set(j.id, { ...j, photos: [], transient: true, uploads: Promise.resolve([]) });
      setMsgs((cur) => [
        ...cur,
        ...saved
          .filter((j) => !cur.some((m) => m.id === j.id))
          .map((j) => ({ id: j.id, senderId: me, senderName: null, kind: "text" as const, body: j.body, meta: null, createdAt: at, updatedAt: at, edited: false, deleted: false, record: null, attachments: [], reactions: [], reply: null, failed: tx.failed })),
      ]);
      void sync();
    });
    return () => cancelAnimationFrame(frame);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Back online: try the ones that failed for lack of a connection. Leaving with unsent messages asks first.
  useEffect(() => {
    const onOnline = () => {
      for (const [id, job] of outbox.current) if (job.transient && !queue.current.includes(id)) retry(id);
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (queue.current.length) e.preventDefault();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onLeave);
    };
  });

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
    if (!body && photos.length === 0 && !aboutRecord) return;
    const at = new Date().toISOString();
    stickToBottom.current = true;
    // Answering someone's record: the record and these words go as one message; photos follow on their own.
    if (aboutRecord) {
      const rec = aboutRecord;
      const recJob: Job = { id: crypto.randomUUID(), body, replyTo: null, recordId: rec.id, photos: [], transient: false };
      startUploads(recJob);
      setMsgs((cur) => [
        ...cur,
        {
          id: recJob.id, senderId: me, senderName: null, kind: "record", body: body || null, meta: null, createdAt: at, updatedAt: at,
          edited: false, deleted: false, record: { ...rec, mine: false }, attachments: [], reactions: [], pending: true, reply: null,
        },
      ]);
      setAboutRecord(null);
      enqueue(recJob);
      if (!photos.length) {
        if (!override) setDraft("");
        setReplyTo(null);
        return;
      }
    }
    // Shown at once as sent; it goes out in the background (the browser names it, so a retry can't duplicate it).
    const text = aboutRecord ? "" : body;
    const job: Job = { id: crypto.randomUUID(), body: text, replyTo: replyTo?.id ?? null, photos, transient: false };
    startUploads(job);
    const reply = replyTo;
    setMsgs((cur) => [
      ...cur,
      {
        id: job.id, senderId: me, senderName: null, kind: photos.length ? "image" : "text", body: text || null, meta: null, createdAt: at, updatedAt: at,
        edited: false, deleted: false, record: null, attachments: [], reactions: [], pending: true, localPhotos: photos.map((p) => p.url),
        reply: reply ? { id: reply.id, senderName: names.get(reply.senderId ?? "") ?? null, kind: reply.kind, body: reply.body, deleted: reply.deleted } : null,
      },
    ]);
    if (!override) setDraft("");
    setPhotos([]);
    setReplyTo(null);
    enqueue(job);
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
  const translationOf = (m: Msg) => {
    const x = translations[m.id];
    return x && x.of === m.body ? x : null;
  };
  const untranslate = (m: Msg) => {
    setMenu(null);
    setTranslations((cur) => {
      const next = { ...cur };
      delete next[m.id];
      return next;
    });
  };
  const translate = async (m: Msg) => {
    setMenu(null);
    const of = m.body ?? "";
    setTranslations((cur) => ({ ...cur, [m.id]: { of, state: "loading" } }));
    const r = await dmTranslate(m.id).catch(() => ({ ok: false as const, error: "translate_failed" }));
    setTranslations((cur) => {
      if (!cur[m.id] || cur[m.id]!.of !== of) return cur; // turned off (or edited) meanwhile
      return { ...cur, [m.id]: r.ok ? { of, state: "done", text: r.value.text, same: r.value.same } : { of, state: "error", error: r.error } };
    });
  };
  const unsend = async (m: Msg) => {
    setMenu(null);
    if (!(await askConfirm(tx.unsendConfirm))) return;
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
      <li key={m.id} id={`m-${m.id}`} className={`emoji-color flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${last ? "mb-2" : "mb-0.5"}`}>
        {!mine && conv.kind === "group" && <span className="w-7 shrink-0">{last && <DmAvatar names={[m.senderName ?? "?"]} srcs={[conv.avatars[m.senderId ?? ""]]} types={[conv.tints?.[m.senderId ?? ""]]} size="sm" />}</span>}
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
            className={`group relative select-text outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-3xl`}
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
                  ) : m.record.shown ? (
                    <div className="block w-64 max-w-full rounded-3xl bg-white p-3 text-stone-900 shadow-sm ring-1 ring-stone-200" data-testid="shown-record">
                      <span className="block text-[11px] font-semibold text-rose-800">📄 {fill(tx.shownBy, { name: m.record.ownerName })}</span>
                      {m.record.title && <span className="emoji-color block font-semibold">{m.record.title}</span>}
                      <span className="block whitespace-pre-line text-sm text-stone-700">{m.record.body}</span>
                    </div>
                  ) : (
                    <Link
                      href={m.record.mine ? `/memories/${m.record.id}` : `/memories/shared/${m.record.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block w-64 max-w-full rounded-3xl bg-white p-3 text-stone-900 shadow-sm ring-1 ring-stone-200 transition hover:ring-teal-300"
                    >
                      <span className="block text-[11px] font-semibold text-rose-800">
                        📄 {m.record.mine ? (m.senderId === me ? tx.yourRecord : tx.recordReplyToYou) : fill(tx.recordReply, { name: m.record.ownerName })}
                      </span>
                      {m.record.title && <span className="emoji-color block font-semibold">{m.record.title}</span>}
                      <span className="line-clamp-4 block whitespace-pre-line text-sm text-stone-700">{m.record.body}</span>
                      <span className="mt-1 block text-right text-xs font-semibold text-teal-700">{tx.openRecord} →</span>
                    </Link>
                  ))}
                {m.body && (
                  <p className={`whitespace-pre-wrap break-words rounded-3xl px-3.5 py-2 text-[15px] leading-relaxed ${bubble} ${corner} ${m.kind === "image" || m.kind === "record" ? "mt-1" : ""}`}>
                    <Linkified text={m.body} />
                  </p>
                )}
                {m.body && translationOf(m) && <Translation x={translationOf(m)!} tx={tx} mine={mine} onClose={() => untranslate(m)} />}
                {m.body && !m.pending && firstUrl(m.body) && <LinkCard url={firstUrl(m.body)!} mine={mine} />}
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
          {m.failed ? (
            <span role="alert" className="mt-1 flex flex-wrap items-center justify-end gap-2 px-1 text-[11px] font-semibold text-rose-700">
              ⚠ {m.failed}
              <button type="button" onClick={() => retry(m.id)} className="rounded-full bg-rose-600 px-2.5 py-1 text-white active:scale-95">
                {tx.retry}
              </button>
              <button type="button" onClick={() => discard(m.id)} className="rounded-full bg-white px-2.5 py-1 text-rose-700 ring-1 ring-rose-200 active:scale-95">
                {tx.discard}
              </button>
            </span>
          ) : (
            last && <span className="mt-0.5 px-2 text-[10px] text-stone-400">{`${clock(m.createdAt)}${m.edited && !m.deleted ? ` · ${tx.edited}` : ""}`}</span>
          )}
          {myLast && m.id === myLast.id && seenLabel && <span className="px-2 text-[10px] font-semibold text-stone-500">{seenLabel}</span>}
        </div>
      </li>,
    );
  });

  const cantWrite = signedOut ? null : conv.left ? tx.leftGroup : !conv.canSend ? tx.cannotSend : null;
  const subtitle = typing.length ? fill(tx.typing, { name: typing.map((x) => x.name).join(tx.listSeparator) }) : conv.kind === "group" ? fill(tx.group, { n: activeOthers.length + 1 }) : null;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col bg-[#faf8f5]">
      <header className="flex shrink-0 items-center gap-2 border-b border-stone-200/70 bg-white/80 px-2 py-2 backdrop-blur-md">
        <Link href="/messages" aria-label={tx.back} className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-stone-600 hover:bg-stone-100">
          ←
        </Link>
        <DmAvatar names={(conv.kind === "group" ? activeOthers : others).map((m) => m.name)} srcs={(conv.kind === "group" ? activeOthers : others).map((m) => conv.avatars[m.id])} types={(conv.kind === "group" ? activeOthers : others).map((m) => conv.tints?.[m.id])} size="sm" />
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
        {signedOut && (
          <div role="alert" className="mb-2 flex items-center gap-3 rounded-2xl bg-rose-50 px-3 py-2.5 text-sm text-rose-900 ring-1 ring-rose-200">
            <span className="flex-1 leading-5">{tx.sessionExpired}</span>
            <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white active:scale-95">
              {tx.reload}
            </button>
          </div>
        )}
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
            {aboutRecord && !editing && (
              <div className="mb-2 flex items-start gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs text-stone-600 ring-1 ring-rose-100" data-testid="record-reply-chip">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-rose-900">📄 {fill(tx.recordReply, { name: aboutRecord.ownerName })}</span>
                  <span className="line-clamp-2">{aboutRecord.title ?? aboutRecord.body}</span>
                </span>
                <button type="button" aria-label={tx.cancel} onClick={() => setAboutRecord(null)} className="h-6 w-6 shrink-0 rounded-full text-base leading-none text-stone-500 hover:bg-rose-100">
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
              {draft.trim() || photos.length || editing || aboutRecord ? (
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
            <p className="emoji-color mb-3 line-clamp-2 rounded-2xl bg-stone-50 px-3 py-2 text-sm text-stone-600">{preview(menu)}</p>
            <div className="emoji-color mb-3 flex justify-between">
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
              {menu.body && !menu.pending && (
                translationOf(menu) ? (
                  <button type="button" onClick={() => untranslate(menu)} className="rounded-2xl px-4 py-3 text-left font-medium text-stone-800 hover:bg-stone-50">
                    🌐 {tx.untranslate}
                  </button>
                ) : (
                  <button type="button" onClick={() => void translate(menu)} className="rounded-2xl px-4 py-3 text-left hover:bg-stone-50">
                    <span className="block font-medium text-stone-800">🌐 {tx.translate}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-stone-500">{tx.translateNote}</span>
                  </button>
                )
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

type TranslationState = { state: "loading" } | { state: "done"; text: string; same: boolean } | { state: "error"; error: string };

/** A translation under the original message (the original always stays), with a way to turn it off. */
function Translation({ x, tx, mine, onClose }: { x: TranslationState; tx: ChatText; mine: boolean; onClose: () => void }) {
  return (
    <div className={`mt-1 max-w-full rounded-2xl border border-dashed px-3 py-2 text-sm ${mine ? "border-teal-200 bg-teal-50/70" : "border-stone-300 bg-white/80"}`} data-testid="translation" aria-live="polite">
      <p className="mb-0.5 flex items-center justify-between gap-3 text-[11px] font-semibold text-stone-500">
        <span>🌐 {tx.translation}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="rounded-full px-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          aria-label={tx.untranslate}
        >
          ✕
        </button>
      </p>
      {x.state === "loading" && <p className="animate-pulse text-stone-500">{tx.translating}</p>}
      {x.state === "error" && <p className="text-rose-700">{tx.errors[x.error] ?? tx.errors.generic}</p>}
      {x.state === "done" && (x.same ? <p className="text-stone-500">{tx.translateSame}</p> : <p className="emoji-color whitespace-pre-wrap break-words text-stone-800">{x.text}</p>)}
    </div>
  );
}
