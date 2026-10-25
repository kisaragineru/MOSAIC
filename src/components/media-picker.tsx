"use client";
import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/server/services/media";

export interface MediaPickerText {
  add: string;
  help: string;
  remove: string;
  moveEarlier: string;
  uploading: string;
  waitUpload: string;
  failed: string;
  retry: string;
  video: string;
  errors: Record<string, string>;
}

const MAX = 5;
const CHUNK = 4 * 1024 * 1024;
const MAX_VIDEO = 30 * 1024 * 1024;
const FULL_PX = 2048;
const THUMB_PX = 720;

type Tile = {
  key: string;
  /** Saved or uploaded: the server's id. */
  id: string | null;
  kind: "image" | "video";
  preview: string;
  state: "working" | "done" | "failed";
  progress: number;
  error?: string;
  file?: File;
};

function canvasBlob(src: CanvasImageSource, w: number, h: number, max: number, quality: number): Promise<{ blob: Blob; w: number; h: number }> {
  const k = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * k));
  const ch = Math.max(1, Math.round(h * k));
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  c.getContext("2d")!.drawImage(src, 0, 0, cw, ch);
  return new Promise((ok, fail) => c.toBlob((b) => (b ? ok({ blob: b, w: cw, h: ch }) : fail(new Error("encode"))), "image/jpeg", quality));
}

/** A photo, made at most 2048px (and under 4 MB), and its list picture. */
async function preparePhoto(file: File) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  let q = 0.86;
  let full = await canvasBlob(bmp, bmp.width, bmp.height, FULL_PX, q);
  while (full.blob.size > 3.8 * 1024 * 1024 && q > 0.5) full = await canvasBlob(bmp, bmp.width, bmp.height, FULL_PX, (q -= 0.12));
  const thumb = await canvasBlob(bmp, bmp.width, bmp.height, THUMB_PX, 0.78);
  bmp.close();
  return { part: full.blob, thumb: thumb.blob, width: full.w, height: full.h, size: full.blob.size, durationMs: undefined as number | undefined };
}

/** A video as it is, with its first frame as the list picture (a plain one if the browser can't show it). */
async function prepareVideo(file: File) {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  try {
    await new Promise<void>((ok, fail) => {
      v.onloadeddata = () => ok();
      v.onerror = () => fail(new Error("decode"));
      setTimeout(() => fail(new Error("timeout")), 8000);
    });
    await new Promise<void>((ok) => {
      v.onseeked = () => ok();
      v.currentTime = Math.min(0.1, (v.duration || 1) / 2);
      setTimeout(ok, 2000);
    });
    const thumb = await canvasBlob(v, v.videoWidth, v.videoHeight, THUMB_PX, 0.78);
    return { part: file, thumb: thumb.blob, width: v.videoWidth, height: v.videoHeight, size: file.size, durationMs: Number.isFinite(v.duration) ? Math.round(v.duration * 1000) : undefined };
  } catch {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 360;
    const g = c.getContext("2d")!;
    g.fillStyle = "#292524";
    g.fillRect(0, 0, 640, 360);
    const thumb = await canvasBlob(c, 640, 360, 640, 0.7);
    return { part: file, thumb: thumb.blob, width: 640, height: 360, size: file.size, durationMs: undefined };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function errorOf(r: Response) {
  return ((await r.json().catch(() => ({}))) as { error?: string }).error ?? (r.status === 401 ? "session_expired" : "generic");
}

/**
 * Up to 5 photos or videos for a record: each uploads as soon as it is chosen (videos in 4 MB
 * parts), shows its progress, and can be removed or moved earlier. The form gets the finished
 * ones in order as `media`, and can't be sent while one is still uploading.
 */
export function MediaPicker({ tx, initial = [], resetKey, onCount }: { tx: MediaPickerText; initial?: MediaItem[]; resetKey?: unknown; onCount?: (done: number) => void }) {
  const [tiles, setTiles] = useState<Tile[]>(() => initial.map((m) => ({ key: m.id, id: m.id, kind: m.kind, preview: `/api/memories/media/${m.id}/thumb`, state: "done", progress: 1 })));
  const guard = useRef<HTMLInputElement>(null);
  const busy = tiles.some((x) => x.state === "working");
  const [lastReset, setLastReset] = useState(resetKey);
  // A new record in the same composer: start empty.
  if (resetKey !== lastReset) {
    setLastReset(resetKey);
    setTiles([]);
  }

  const done = tiles.filter((x) => x.state === "done").length;
  useEffect(() => {
    guard.current?.setCustomValidity(busy ? tx.waitUpload : "");
  }, [busy, tx.waitUpload]);
  useEffect(() => {
    onCount?.(done);
  }, [done, onCount]);

  const patch = (key: string, p: Partial<Tile>) => setTiles((all) => all.map((x) => (x.key === key ? { ...x, ...p } : x)));

  async function upload(key: string, file: File) {
    const video = file.type.startsWith("video/");
    patch(key, { state: "working", progress: 0, error: undefined });
    try {
      if (video && file.size > MAX_VIDEO) throw new Error("video_too_large");
      const p = video ? await prepareVideo(file) : await preparePhoto(file);
      patch(key, { preview: URL.createObjectURL(p.thumb), progress: 0.05 });
      const form = new FormData();
      form.set("kind", video ? "video" : "image");
      form.set("width", String(p.width));
      form.set("height", String(p.height));
      if (p.durationMs !== undefined) form.set("durationMs", String(p.durationMs));
      form.set("size", String(p.size));
      form.set("thumb", p.thumb, "thumb.jpg");
      form.set("part", p.part.slice(0, CHUNK), "part");
      const r = await fetch("/api/memories/media", { method: "POST", body: form });
      if (!r.ok) throw new Error(await errorOf(r));
      const { id } = (await r.json()) as { id: string };
      const parts = video ? Math.ceil(p.size / CHUNK) : 1;
      for (let i = 1; i < parts; i++) {
        patch(key, { progress: i / parts });
        const put = await fetch(`/api/memories/media/${id}/part/${i}`, { method: "PUT", body: p.part.slice(i * CHUNK, (i + 1) * CHUNK) });
        if (!put.ok) throw new Error(await errorOf(put));
      }
      patch(key, { id, state: "done", progress: 1, file: undefined });
    } catch (e) {
      const code = (e as Error).message;
      patch(key, { state: "failed", error: tx.errors[code] ?? tx.errors.generic, file });
    }
  }

  function choose(files: FileList | null) {
    if (!files) return;
    const room = MAX - tiles.length;
    const picked = [...files].filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/")).slice(0, room);
    const added: Tile[] = picked.map((f) => ({ key: crypto.randomUUID(), id: null, kind: f.type.startsWith("video/") ? "video" : "image", preview: "", state: "working", progress: 0, file: f }));
    setTiles((all) => [...all, ...added]);
    // One after another, so a slow line isn't split between them.
    void added.reduce((prev, t) => prev.then(() => upload(t.key, t.file!)), Promise.resolve());
  }

  function move(i: number) {
    setTiles((all) => {
      const next = [...all];
      [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
      return next;
    });
  }

  return (
    <div className="space-y-2" data-testid="media-picker">
      <input type="hidden" name="mediaField" value="1" />
      {tiles.filter((x) => x.state === "done" && x.id).map((x) => <input key={x.key} type="hidden" name="media" value={x.id!} />)}
      {/* Keeps the form from being sent while something is still uploading. */}
      <input ref={guard} tabIndex={-1} aria-hidden className="pointer-events-none absolute h-0 w-0 opacity-0" value={busy ? "" : "ok"} onChange={() => {}} required />
      {tiles.length > 0 && (
        <ul className="grid grid-cols-5 gap-1.5">
          {tiles.map((x, i) => (
            <li key={x.key} className="relative aspect-square overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
              {x.preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={x.preview} alt="" className="h-full w-full object-cover" />
              )}
              {x.kind === "video" && <span aria-hidden className="absolute left-1 top-1 rounded bg-black/55 px-1 text-[10px] text-white">▶</span>}
              {x.state === "working" && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/70 text-[10px] font-semibold text-stone-700" role="status">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" aria-hidden />
                  {Math.round(x.progress * 100)}%
                </span>
              )}
              {x.state === "failed" && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-rose-50/95 p-1 text-center text-[10px] leading-tight text-rose-800" role="alert">
                  {x.error ?? tx.failed}
                  {x.file && (
                    <button type="button" onClick={() => upload(x.key, x.file!)} className="rounded-full bg-white px-2 py-0.5 font-semibold ring-1 ring-rose-200">
                      {tx.retry}
                    </button>
                  )}
                </span>
              )}
              <button type="button" onClick={() => setTiles((all) => all.filter((y) => y.key !== x.key))} aria-label={tx.remove} className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-xs text-white">
                ✕
              </button>
              {i > 0 && x.state === "done" && (
                <button type="button" onClick={() => move(i)} aria-label={tx.moveEarlier} className="absolute bottom-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-xs text-white">
                  ←
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {tiles.length < MAX && (
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:border-teal-400 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400">
          <span aria-hidden>📷</span>
          {tx.add}
          <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => (choose(e.target.files), (e.target.value = ""))} />
        </label>
      )}
      <p className="text-[11px] leading-5 text-stone-500">{busy ? tx.uploading : tx.help}</p>
    </div>
  );
}
