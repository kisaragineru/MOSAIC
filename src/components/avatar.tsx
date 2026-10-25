/** Someone's round photo, or their initial when there is none (or it isn't shown to you). */
export function Avatar({ name, src, className = "h-12 w-12 text-lg" }: { name: string; src?: string | null; className?: string }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={96} height={96} className={`shrink-0 rounded-full bg-stone-200 object-cover ${className}`} />;
  }
  return <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-rose-200 via-amber-100 to-teal-200 font-bold text-stone-800 ${className}`}>{initial}</span>;
}
