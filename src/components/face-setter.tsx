"use client";

import { useEffect, useRef, useState } from "react";
import { askConfirm } from "@/lib/confirm";
import { faceRect, TYPE_IMAGE, type FaceCrop, type FaceWho } from "@/lib/tuvi/faces";

type Crops = Record<string, Partial<Record<FaceWho, FaceCrop>>>;
const KEY = "mosaic.faces.v1";
const VIEW_W = 300;
const DEFAULT: Record<FaceWho, FaceCrop> = { m: { cx: 0.5, cy: 0.13, r: 0.17 }, f: { cx: 0.5, cy: 0.6, r: 0.17 } };
const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Development only: set where each face is in the fourteen illustrations (both people), by
 * dragging a circle over the picture and sizing it. Work in progress stays in this browser; when
 * done, the settings are written out as text to hand over (they go into src/lib/tuvi/faces.ts).
 */
export function FaceSetter({ types, initial }: { types: { id: string; label: string }[]; initial: Crops }) {
  const [crops, setCrops] = useState<Crops>(initial);
  const [i, setI] = useState(0);
  const [who, setWho] = useState<FaceWho>("m");
  const [out, setOut] = useState<string | null>(null);
  // The picture together with the type it belongs to, so a slow load never shows under another type.
  const [loaded, setLoaded] = useState<{ id: string; img: HTMLImageElement } | null>(null);
  const big = useRef<HTMLCanvasElement>(null);
  const small = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const t = types[i]!;
  const crop = crops[t.id]?.[who] ?? DEFAULT[who];
  const done = types.reduce((n, x) => n + (crops[x.id]?.m ? 1 : 0) + (crops[x.id]?.f ? 1 : 0), 0);

  // Work in progress is kept in this browser (best effort).
  useEffect(() => {
    let saved: Crops | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw) as Crops;
    } catch {}
    if (!saved) return;
    const id = window.setTimeout(() => setCrops((c) => ({ ...c, ...saved })), 0);
    return () => window.clearTimeout(id);
  }, []);
  const save = (next: Crops) => {
    setCrops(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };
  // The circle stays inside the picture: it stops at the edges (and shrinks to fit at most).
  const set = (c: FaceCrop) => {
    const r = Math.min(round(c.r), 0.5);
    const ry = (r * TYPE_IMAGE.w) / TYPE_IMAGE.h;
    const within = (v: number, lo: number, hi: number) => Math.min(Math.floor(hi * 1000) / 1000, Math.max(Math.ceil(lo * 1000) / 1000, round(v)));
    save({ ...crops, [t.id]: { ...crops[t.id], [who]: { cx: within(c.cx, r, 1 - r), cy: within(c.cy, ry, 1 - ry), r } } });
  };

  useEffect(() => {
    let live = true;
    const im = new Image();
    im.onload = () => live && setLoaded({ id: t.id, img: im });
    im.src = `/tuvi-types/${t.id}.webp`;
    return () => {
      live = false;
    };
  }, [t.id]);
  const img = loaded?.id === t.id ? loaded.img : null;

  // Draw: the picture, dimmed outside the circle; and the circle as the picture will look.
  useEffect(() => {
    if (!big.current || !small.current) return;
    if (!img) {
      big.current.getContext("2d")?.clearRect(0, 0, big.current.width, big.current.height);
      small.current.getContext("2d")?.clearRect(0, 0, small.current.width, small.current.height);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = VIEW_W * dpr;
    const H = Math.round((W * img.height) / img.width);
    const c = big.current;
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, W, H);
    const k = W / img.width;
    const { sx, sy, size } = faceRect(crop, img.width, img.height);
    ctx.fillStyle = "rgba(28,25,23,0.55)";
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc((sx + size / 2) * k, (sy + size / 2) * k, (size / 2) * k, 0, Math.PI * 2);
    ctx.fill("evenodd");
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.arc((sx + size / 2) * k, (sy + size / 2) * k, (size / 2) * k, 0, Math.PI * 2);
    ctx.stroke();
    const s = small.current;
    s.width = 160;
    s.height = 160;
    const p = s.getContext("2d")!;
    p.clearRect(0, 0, 160, 160);
    p.save();
    p.beginPath();
    p.arc(80, 80, 80, 0, Math.PI * 2);
    p.clip();
    p.fillStyle = "#e7e5e4";
    p.fillRect(0, 0, 160, 160);
    p.drawImage(img, sx, sy, size, size, 0, 0, 160, 160);
    p.restore();
  }, [img, crop]);

  const toImage = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height };
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        {done} / {types.length * 2} 設定済み
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {types.map((x, j) => (
          <li key={x.id}>
            <button type="button" onClick={() => setI(j)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${j === i ? "bg-violet-700 text-white ring-violet-700" : "bg-white text-stone-700 ring-stone-200"}`}>
              {crops[x.id]?.m && crops[x.id]?.f ? "✓ " : ""}
              {x.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        {(["m", "f"] as const).map((w) => (
          <button key={w} type="button" onClick={() => setWho(w)} className={`flex-1 rounded-full py-2 text-sm font-bold ring-1 ${who === w ? "bg-teal-700 text-white ring-teal-700" : "bg-white text-stone-700 ring-stone-200"}`}>
            {crops[t.id]?.[w] ? "✓ " : ""}
            {w === "m" ? "男性" : "女性"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <canvas
          ref={big}
          aria-label={`${t.label}（${who === "m" ? "男性" : "女性"}）の顔の位置`}
          className="w-[300px] max-w-full cursor-grab touch-none rounded-2xl active:cursor-grabbing"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = toImage(e);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const now = toImage(e);
            set({ ...crop, cx: Math.min(1, Math.max(0, crop.cx + now.x - drag.current.x)), cy: Math.min(1, Math.max(0, crop.cy + now.y - drag.current.y)) });
            drag.current = now;
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        />
        <div className="space-y-3">
          <canvas ref={small} className="h-28 w-28 rounded-full shadow-md ring-4 ring-white" aria-label="アイコンの見え方" />
          <label className="block text-xs text-stone-600">
            大きさ
            <input type="range" min={0.08} max={0.5} step={0.005} value={crop.r} onChange={(e) => set({ ...crop, r: Number(e.target.value) })} className="mt-1 block w-40 accent-teal-700" />
          </label>
          <button type="button" onClick={() => set(crop)} className="rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white">
            この位置で決定
          </button>
          <p className="text-[11px] leading-5 text-stone-500">丸をドラッグして顔に合わせ、大きさを調整します。動かすと自動で保存されます（このブラウザ内）。</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={i === 0 && who === "m"} onClick={() => (who === "f" ? setWho("m") : (setI(i - 1), setWho("f")))} className="flex-1 rounded-full bg-white py-2 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 disabled:opacity-40">
          ← 前へ
        </button>
        <button type="button" disabled={i === types.length - 1 && who === "f"} onClick={() => (who === "m" ? setWho("f") : (setI(i + 1), setWho("m")))} className="flex-1 rounded-full bg-white py-2 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 disabled:opacity-40">
          次へ →
        </button>
      </div>
      <div className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <button type="button" onClick={() => setOut(JSON.stringify(crops))} className="rounded-full bg-violet-700 px-4 py-2 text-sm font-bold text-white">
          設定を書き出す
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!(await askConfirm("このブラウザで動かした位置を消して、アプリに入っている設定に戻しますか？"))) return;
            try {
              localStorage.removeItem(KEY);
            } catch {}
            setCrops(initial);
            setOut(null);
          }}
          className="ml-2 text-xs text-stone-500 underline underline-offset-4"
        >
          アプリの設定に戻す
        </button>
        {out && (
          <>
            <p className="text-xs text-stone-600">この文字をコピーして、チャットに貼ってください。</p>
            <textarea readOnly value={out} rows={6} className="w-full rounded-xl border border-stone-200 p-2 font-mono text-[11px]" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={() => void navigator.clipboard?.writeText(out)} className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-violet-800 ring-1 ring-violet-200">
              コピー
            </button>
          </>
        )}
      </div>
    </div>
  );
}
