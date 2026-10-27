"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DmAvatar } from "./dm-avatar";
import type { MainStarId } from "@/lib/tuvi/stars";

export interface InboxRow {
  id: string;
  title: string;
  names: string[];
  srcs: (string | null)[];
  /** A group's own photo. */
  photo?: string | null;
  types?: (MainStarId | null)[];
  preview: string;
  when: string;
  unread: number;
  muted: boolean;
  inactive: boolean;
}

/** The conversation list: filter by name, and refresh itself while it's on screen. */
export function DmInbox({ rows, searchLabel, mutedLabel }: { rows: InboxRow[]; searchLabel: string; mutedLabel: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && router.refresh();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [router]);
  const fold = (s: string) => s.normalize("NFKC").toLowerCase();
  const shown = q.trim() ? rows.filter((r) => fold(`${r.title} ${r.names.join(" ")}`).includes(fold(q.trim()))) : rows;
  return (
    <div className="space-y-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={searchLabel}
        aria-label={searchLabel}
        className="w-full rounded-full border border-stone-200 bg-white px-4 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
      />
      <ul className="stagger divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white/90 shadow-sm ring-1 ring-stone-200/60">
        {shown.map((r) => (
          <li key={r.id}>
            <Link href={`/messages/${r.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-stone-50 active:bg-stone-100">
              <DmAvatar names={r.names} srcs={r.srcs} types={r.types} photo={r.photo} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`truncate ${r.unread ? "font-bold text-stone-900" : "font-medium text-stone-800"} ${r.inactive ? "opacity-60" : ""}`}>{r.title}</span>
                  {r.muted && <span aria-label={mutedLabel} className="text-xs text-stone-400">🔕</span>}
                </span>
                <span className={`emoji-color block truncate text-sm ${r.unread ? "font-semibold text-stone-900" : "text-stone-500"}`}>
                  {r.preview} <span className="font-normal text-stone-400">· {r.when}</span>
                </span>
              </span>
              {r.unread > 0 && (
                <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white ${r.muted ? "bg-stone-400" : "bg-rose-600"}`}>{r.unread > 99 ? "99+" : r.unread}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
