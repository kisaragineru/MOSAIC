"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-stone-200 bg-white/90 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 print:hidden"
    >
      <span aria-hidden>🖨</span>
      {label}
    </button>
  );
}
