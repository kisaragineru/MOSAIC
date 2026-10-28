"use client";
import { useRef, useState } from "react";

type Detector = { detect: (img: ImageBitmap) => Promise<{ rawValue: string }[]> };

/** Read a QR code from a picture (a screenshot or a photo in the gallery). */
async function readQr(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  if (BD) {
    try {
      const found = await new BD({ formats: ["qr_code"] }).detect(bitmap);
      if (found[0]?.rawValue) return found[0].rawValue;
    } catch {}
  }
  // Without a built-in reader: decode the pixels here (nothing leaves the phone).
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { default: jsQR } = await import("jsqr");
  return jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data ?? null;
}

/** MOSAIC's own links only: a QR to connect, a story, or an invitation to sign up. */
function mosaicLink(text: string): string | null {
  try {
    const u = new URL(text, location.href);
    if (u.host !== location.host) return null;
    return u.pathname === "/s" || u.pathname.startsWith("/w/") || u.pathname === "/register" ? u.pathname + u.search + u.hash : null;
  } catch {
    return null;
  }
}

export function QrFromImage({ tx }: { tx: { button: string; hint: string; reading: string; notFound: string; notMosaic: string } }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const text = await readQr(file);
      if (!text) return setError(tx.notFound);
      const to = mosaicLink(text);
      if (!to) return setError(tx.notMosaic);
      location.assign(to);
    } catch {
      setError(tx.notFound);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div className="space-y-1.5" data-testid="qr-from-image">
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-teal-800 ring-1 ring-teal-200 hover:ring-teal-400">
        <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} disabled={busy} />
        🖼 {busy ? tx.reading : tx.button}
      </label>
      <p className="text-[11px] leading-4 text-stone-500">{tx.hint}</p>
      {error && <p className="text-xs text-rose-700" role="alert">{error}</p>}
    </div>
  );
}
