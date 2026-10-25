import type { Dict } from "@/lib/i18n/messages/en";

/** Someone's introduction as others see it: their own words beside the intro MOSAIC drafted and they approved. */
export function IntroPair({ bio, intro, name, t, small = false }: { bio: string | null; intro: string | null; name: string; t: Dict; small?: boolean }) {
  const text = small ? "text-[13px] leading-relaxed" : "text-sm leading-7";
  return (
    <div className="space-y-3">
      {bio && (
        <div>
          <p className="mb-1 text-[11px] font-semibold text-stone-500">📝 {t.intro.ownWords}</p>
          <p className={`emoji-color whitespace-pre-line text-stone-800 ${text}`}>{bio}</p>
        </div>
      )}
      {intro && (
        <div className="rounded-2xl bg-linear-to-br from-sky-50 to-violet-50 p-3 ring-1 ring-sky-100">
          <p className="mb-1 text-[11px] font-semibold text-violet-800">🧩 {t.intro.fromMosaic(name)}</p>
          <p className={`whitespace-pre-line text-stone-800 ${text}`}>{intro}</p>
          <p className="mt-1 text-[10px] text-stone-400">{t.intro.checked}</p>
        </div>
      )}
    </div>
  );
}
