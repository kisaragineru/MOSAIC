"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadAvatarAction } from "@/app/actions/avatar";

export interface AvatarEditorText {
  choose: string;
  change: string;
  help: string;
  zoom: string;
  rotate: string;
  save: string;
  saving: string;
  cancel: string;
  area: string;
  failed: string;
  errors: Record<string, string>;
  fromType: string;
  fromTypeHelp: string;
  yourType: string;
  otherTypes: string;
}

/** A type illustration that can be cropped into the picture. */
export interface AvatarType {
  id: string;
  label: string;
}

/** Size of the crop area on screen (CSS px) and of the saved photo (px). */
const VIEW = 288;
const OUT = 512;
const MAX_ZOOM = 4;

type Shot = { img: ImageBitmap; rot: number; zoom: number; x: number; y: number };

/** The image's size once rotated. */
const dims = (s: Shot) => (s.rot % 180 === 0 ? { w: s.img.width, h: s.img.height } : { w: s.img.height, h: s.img.width });
/** Scale at which the (rotated) image just covers the square, times the zoom. */
const scaleOf = (s: Shot) => {
  const { w, h } = dims(s);
  return Math.max(VIEW / w, VIEW / h) * s.zoom;
};
/** Keep the image covering the whole square: no empty edges. */
function clamp(s: Shot): Shot {
  const { w, h } = dims(s);
  const k = scaleOf(s);
  const mx = Math.max(0, (w * k - VIEW) / 2);
  const my = Math.max(0, (h * k - VIEW) / 2);
  return { ...s, x: Math.min(mx, Math.max(-mx, s.x)), y: Math.min(my, Math.max(-my, s.y)) };
}
/** Draw the shot into a square canvas of `size` px. */
function paint(ctx: CanvasRenderingContext2D, s: Shot, size: number) {
  const f = size / VIEW;
  const k = scaleOf(s) * f;
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#e7e5e4";
  ctx.fillRect(0, 0, size, size);
  ctx.translate(size / 2 + s.x * f, size / 2 + s.y * f);
  ctx.rotate((s.rot * Math.PI) / 180);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(s.img, (-s.img.width * k) / 2, (-s.img.height * k) / 2, s.img.width * k, s.img.height * k);
  ctx.restore();
}

/**
 * Choose a photo, then place it: drag to move, pinch / wheel / slider to zoom, rotate in quarter
 * turns. The circle shows what will be used; the saved photo is a 512px square (re-encoded, so
 * camera metadata such as location is not kept).
 */
export function AvatarEditor({ text: tx, hasPhoto, mine = [], all = [] }: { text: AvatarEditorText; hasPhoto: boolean; /** My type(s), offered first. */ mine?: AvatarType[]; all?: AvatarType[] }) {
  const router = useRouter();
  const [shot, setShot] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  // Redraw the preview (sharp on high-density screens) with the circle guide on top.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !shot) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const size = Math.round(VIEW * dpr);
    if (c.width !== size) {
      c.width = size;
      c.height = size;
    }
    const ctx = c.getContext("2d")!;
    paint(ctx, shot, size);
    ctx.save();
    ctx.fillStyle = "rgba(28, 25, 23, 0.55)";
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - dpr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, [shot]);

  const pick = async (f: File | undefined) => {
    setError(null);
    if (!f) return;
    try {
      const img = await createImageBitmap(f, { imageOrientation: "from-image" });
      setShot({ img, rot: 0, zoom: 1, x: 0, y: 0 });
    } catch {
      setError(tx.errors.invalid_image ?? tx.failed);
    }
    if (file.current) file.current.value = "";
  };

  // A type illustration, opened in the same editor: it starts on the upper face, and the owner moves
  // and zooms it to the part they like.
  const pickType = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/tuvi-types/${id}.webp`);
      const img = await createImageBitmap(await res.blob());
      setShot(clamp({ img, rot: 0, zoom: 1.8, x: 0, y: 9999 }));
    } catch {
      setError(tx.failed);
    }
  };

  const update = useCallback((fn: (s: Shot) => Shot) => setShot((s) => (s ? clamp(fn(s)) : s)), []);
  const zoomTo = (z: number, s: Shot) => ({ ...s, zoom: Math.min(MAX_ZOOM, Math.max(1, z)) });

  // Mouse wheel / trackpad zoom (non-passive, so the page doesn't scroll instead).
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      update((s) => zoomTo(s.zoom * Math.exp(-e.deltaY * 0.0015), s));
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
  }, [update, shot !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinch.current = null;
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointers.current;
    const prev = p.get(e.pointerId);
    if (!prev) return;
    const now = { x: e.clientX, y: e.clientY };
    p.set(e.pointerId, now);
    if (p.size === 1) {
      // On-screen size vs. the editor's units (the canvas may be drawn smaller than VIEW).
      const f = VIEW / e.currentTarget.getBoundingClientRect().width;
      update((s) => ({ ...s, x: s.x + (now.x - prev.x) * f, y: s.y + (now.y - prev.y) * f }));
    } else if (p.size === 2) {
      const [a, b] = [...p.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinch.current) update((s) => zoomTo(s.zoom * (d / pinch.current!), s));
      pinch.current = d;
    }
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 24 : 8;
    const moves: Record<string, (s: Shot) => Shot> = {
      ArrowLeft: (s) => ({ ...s, x: s.x - step }),
      ArrowRight: (s) => ({ ...s, x: s.x + step }),
      ArrowUp: (s) => ({ ...s, y: s.y - step }),
      ArrowDown: (s) => ({ ...s, y: s.y + step }),
      "+": (s) => zoomTo(s.zoom * 1.1, s),
      "=": (s) => zoomTo(s.zoom * 1.1, s),
      "-": (s) => zoomTo(s.zoom / 1.1, s),
    };
    const fn = moves[e.key];
    if (!fn) return;
    e.preventDefault();
    update(fn);
  };

  const save = async () => {
    if (!shot) return;
    setBusy(true);
    setError(null);
    const out = document.createElement("canvas");
    out.width = OUT;
    out.height = OUT;
    paint(out.getContext("2d")!, shot, OUT);
    const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/jpeg", 0.9));
    if (!blob) {
      setBusy(false);
      setError(tx.failed);
      return;
    }
    const fd = new FormData();
    fd.set("photo", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    const r = await uploadAvatarAction(fd);
    setBusy(false);
    if (!r.ok) {
      setError(tx.errors[r.error] ?? tx.failed);
      return;
    }
    shot.img.close();
    setShot(null);
    router.push("/me/photo?ok=saved");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      {shot ? (
        <>
          <p className="text-sm leading-6 text-stone-600">{tx.help}</p>
          <div className="flex justify-center">
            <canvas
              ref={canvas}
              tabIndex={0}
              role="img"
              aria-label={tx.area}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onKeyDown={onKey}
              className="h-72 w-72 max-w-full cursor-grab touch-none rounded-2xl shadow-inner outline-none focus-visible:ring-4 focus-visible:ring-teal-400 active:cursor-grabbing"
            />
          </div>
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-sm text-stone-500">－</span>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={shot.zoom}
              aria-label={tx.zoom}
              onChange={(e) => update((s) => zoomTo(Number(e.target.value), s))}
              className="flex-1 accent-teal-700"
            />
            <span aria-hidden className="text-sm text-stone-500">＋</span>
            <button
              type="button"
              onClick={() => update((s) => ({ ...s, rot: (s.rot + 90) % 360, x: 0, y: 0 }))}
              className="flex h-10 items-center gap-1 rounded-full bg-white px-3 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50 active:scale-95"
            >
              ↻ {tx.rotate}
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                shot.img.close();
                setShot(null);
              }}
              className="min-h-12 flex-1 rounded-full bg-white text-sm font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
            >
              {tx.cancel}
            </button>
            <button type="button" disabled={busy} onClick={() => void save()} className="min-h-12 flex-[2] rounded-full bg-teal-700 text-base font-bold text-white shadow-md transition hover:bg-teal-800 active:scale-[0.98] disabled:opacity-60">
              {busy ? tx.saving : tx.save}
            </button>
          </div>
        </>
      ) : (
        <>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <button type="button" onClick={() => file.current?.click()} className="min-h-12 w-full rounded-full bg-teal-700 text-base font-bold text-white shadow-md transition hover:bg-teal-800 active:scale-[0.98]">
            📷 {hasPhoto ? tx.change : tx.choose}
          </button>
          {all.length > 0 && (
            <div className="rounded-2xl bg-violet-50/60 p-3 ring-1 ring-violet-100" data-testid="avatar-types">
              <p className="text-sm font-semibold text-violet-950">✨ {tx.fromType}</p>
              <p className="mt-0.5 text-xs text-stone-600">{tx.fromTypeHelp}</p>
              {mine.length > 0 && (
                <>
                  <p className="mt-3 text-[11px] font-semibold text-stone-500">{tx.yourType}</p>
                  <TypeChoices list={mine} onPick={(id) => void pickType(id)} />
                </>
              )}
              <details className="mt-2" open={mine.length === 0}>
                <summary className="cursor-pointer text-xs font-semibold text-violet-800">{tx.otherTypes}</summary>
                <TypeChoices list={all.filter((x) => !mine.some((m) => m.id === x.id))} onPick={(id) => void pickType(id)} />
              </details>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TypeChoices({ list, onPick }: { list: AvatarType[]; onPick: (id: string) => void }) {
  return (
    <ul className="mt-1.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {list.map((x) => (
        <li key={x.id} className="w-16 shrink-0">
          <button type="button" onClick={() => onPick(x.id)} aria-label={x.label} className="block w-full overflow-hidden rounded-xl ring-1 ring-stone-200 transition hover:ring-violet-400 active:scale-95">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/tuvi-types/${x.id}-sm.webp`} alt="" width={300} height={594} loading="lazy" className="block aspect-[3/4] w-full object-cover object-top" />
          </button>
          <p className="mt-0.5 line-clamp-2 text-center text-[10px] leading-tight text-stone-600">{x.label}</p>
        </li>
      ))}
    </ul>
  );
}
