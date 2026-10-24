import type { ReactNode } from "react";

/** A phone-shaped frame for showing a screen as someone else would see it on their phone. */
export function PhoneFrame({ title, children, label }: { title: string; children: ReactNode; label: string }) {
  return (
    <figure aria-label={label} className="mx-auto w-full max-w-[340px]">
      <div className="rounded-[2.6rem] bg-stone-900 p-2.5 shadow-[0_24px_60px_-20px_rgba(40,30,20,0.55)] ring-1 ring-stone-700">
        <div className="relative overflow-hidden rounded-[2.1rem] bg-[#fbf7f3]">
          {/* Status bar and notch */}
          <div aria-hidden className="relative flex h-7 items-center justify-between px-6 text-[10px] font-semibold text-stone-800">
            <span>9:41</span>
            <span className="absolute left-1/2 top-1.5 h-4 w-20 -translate-x-1/2 rounded-full bg-stone-900" />
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-[2px] border border-stone-700" />
            </span>
          </div>
          {/* App header, as in MOSAIC */}
          <div aria-hidden className="flex items-center gap-1.5 border-b border-white/60 px-3 py-1.5">
            <span className="mosaic-mark h-4 w-4 rounded" />
            <span className="text-[10px] font-semibold tracking-[0.2em]">MOSAIC</span>
          </div>
          <div className="h-[540px] overflow-y-auto overscroll-contain px-3 pb-6 pt-3 [scrollbar-width:thin]">
            <p className="mb-3 flex items-center gap-2 text-base font-semibold text-stone-900">
              <span aria-hidden className="text-stone-400">←</span>
              {title}
            </p>
            <div className="space-y-3 text-[13px]">{children}</div>
          </div>
          <div aria-hidden className="flex justify-center pb-2 pt-1">
            <span className="h-1 w-24 rounded-full bg-stone-800/80" />
          </div>
        </div>
      </div>
    </figure>
  );
}

/** A card inside the phone, styled like the app's cards but smaller. */
export function PhoneCard({ title, children, tone = "plain" }: { title?: string; children: ReactNode; tone?: "plain" | "rose" }) {
  return (
    <section className={`rounded-2xl border p-3 shadow-sm ${tone === "rose" ? "border-rose-200 bg-linear-to-br from-white to-rose-50/60" : "border-white/80 bg-white/90"}`}>
      {title && <h3 className="mb-2 text-[13px] font-semibold text-stone-800">{title}</h3>}
      {children}
    </section>
  );
}
