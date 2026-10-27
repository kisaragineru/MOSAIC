import { AVATAR_TINT } from "@/lib/tuvi/type-theme";
import type { MainStarId } from "@/lib/tuvi/stars";

/**
 * Someone's round photo, or their initial when there is none (or it isn't shown to you). The
 * initial sits on their type's colours when they're connected with you and their card shows it.
 */
export function Avatar({ name, src, type, className = "h-12 w-12 text-lg" }: { name: string; src?: string | null; type?: MainStarId | null; className?: string }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={96} height={96} className={`shrink-0 rounded-full bg-stone-200 object-cover ${className}`} />;
  }
  const tint = type ? AVATAR_TINT[type] : "from-rose-200 via-amber-100 to-teal-200";
  return <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br ${tint} font-bold text-stone-800 ${className}`}>{initial}</span>;
}
