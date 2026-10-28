import Link from "next/link";
import type { ReactNode } from "react";

/** Where someone's icon leads (see /people/with/[userId]): my page about them, or our connection page. */
export const personHref = (userId: string) => `/people/with/${userId}`;

/** Someone I'm connected to: their icon opens my page about them. */
export function PersonLink({ userId, label, className = "", children }: { userId: string; label: string; className?: string; children: ReactNode }) {
  return (
    <Link href={personHref(userId)} aria-label={label} className={`shrink-0 rounded-full transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-teal-600 motion-reduce:transition-none ${className}`}>
      {children}
    </Link>
  );
}
