/** A round initial for a person, or two overlapping ones for a group. */
export function DmAvatar({ names, size = "md" }: { names: string[]; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-7 w-7 text-xs" : "h-12 w-12 text-lg";
  const initial = (n: string) => Array.from(n.trim())[0]?.toUpperCase() ?? "?";
  if (names.length <= 1) {
    return <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-rose-200 via-amber-100 to-teal-200 font-bold text-stone-800 ${dim}`}>{initial(names[0] ?? "?")}</span>;
  }
  return (
    <span aria-hidden className={`relative shrink-0 ${dim}`}>
      <span className="absolute left-0 top-0 flex h-[70%] w-[70%] items-center justify-center rounded-full bg-linear-to-br from-teal-200 to-sky-100 text-[0.7em] font-bold text-stone-800 ring-2 ring-white">{initial(names[0]!)}</span>
      <span className="absolute bottom-0 right-0 flex h-[70%] w-[70%] items-center justify-center rounded-full bg-linear-to-br from-rose-200 to-amber-100 text-[0.7em] font-bold text-stone-800 ring-2 ring-white">{initial(names[1]!)}</span>
    </span>
  );
}
