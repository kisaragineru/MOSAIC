import type { MainStarId } from "@/lib/tuvi/stars";
import { Avatar } from "./avatar";

/** A person's photo (or initial, on their type's colours when shown to you), or two overlapping ones for a group. */
export function DmAvatar({ names, srcs = [], types = [], size = "md" }: { names: string[]; srcs?: (string | null | undefined)[]; types?: (MainStarId | null | undefined)[]; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-7 w-7 text-xs" : "h-12 w-12 text-lg";
  if (names.length <= 1) return <Avatar name={names[0] ?? "?"} src={srcs[0]} type={types[0]} className={dim} />;
  return (
    <span aria-hidden className={`relative shrink-0 ${dim}`}>
      <Avatar name={names[0]!} src={srcs[0]} type={types[0]} className="absolute left-0 top-0 h-[70%] w-[70%] text-[0.7em] ring-2 ring-white" />
      <Avatar name={names[1]!} src={srcs[1]} type={types[1]} className="absolute bottom-0 right-0 h-[70%] w-[70%] text-[0.7em] ring-2 ring-white" />
    </span>
  );
}
