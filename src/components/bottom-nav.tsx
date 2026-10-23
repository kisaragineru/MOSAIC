"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavIcon = "home" | "tuvi" | "discover" | "insights" | "memories" | "people";

const PATHS: Record<NavIcon, React.ReactNode> = {
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  // The 12-palace board with the centre cell, the shape of a Tử Vi chart.
  tuvi: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17" />
      <path d="m12 10.3.6 1.1 1.2.2-.9.8.2 1.2-1.1-.6-1.1.6.2-1.2-.9-.8 1.2-.2z" fill="currentColor" stroke="none" />
    </>
  ),
  discover: (
    <>
      <path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-7l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      <path d="M10.2 9.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.3M12 14.6v.1" />
    </>
  ),
  insights: (
    <>
      <path d="M12 3.5a5.5 5.5 0 0 0-3.2 10c.5.4.7.9.7 1.5v.5h5v-.5c0-.6.2-1.1.7-1.5A5.5 5.5 0 0 0 12 3.5z" />
      <path d="M9.8 18.5h4.4M10.5 21h3" />
    </>
  ),
  memories: (
    <>
      <path d="M6 4h11a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1z" />
      <path d="M9 8.5h6M9 12h4" />
    </>
  ),
  people: <path d="M12 19.5s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.3c0 4.9-7 9.2-7 9.2z" />,
};

export function BottomNav({ items }: { items: { href: string; label: string; icon: NavIcon }[] }) {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {/* A class, not an inline style: the CSP blocks style attributes in server-rendered HTML. */}
      <ul className="mx-auto grid max-w-2xl grid-cols-6">
        {items.map((it) => {
          const active = path === it.href || path.startsWith(`${it.href}/`);
          const special = it.icon === "tuvi";
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col items-center gap-0.5 pb-1.5 pt-1 text-[10.5px] leading-none transition-colors ${
                  active ? "font-bold text-teal-800" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <span
                  className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200 motion-reduce:transition-none ${
                    active
                      ? special
                        ? "bg-linear-to-br from-teal-600 to-violet-700 text-white shadow-md shadow-teal-900/20"
                        : "bg-teal-100 text-teal-800"
                      : special
                        ? "text-violet-700 group-hover:bg-stone-100"
                        : "group-hover:bg-stone-100"
                  }`}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {PATHS[it.icon]}
                  </svg>
                </span>
                <span className="max-w-full truncate px-0.5">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
