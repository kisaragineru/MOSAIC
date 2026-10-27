"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * The header's logo, except on the guide's first page: there the film builds the logo out of its
 * pieces, so it isn't shown twice (the space stays, so nothing moves).
 */
export function HeaderBrand({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const step = useSearchParams().get("step");
  const opening = path === "/welcome" && (!step || step === "1");
  return (
    <Link href="/home" className={`flex items-center gap-2 transition-opacity duration-500 ${opening ? "pointer-events-none opacity-0" : "opacity-100"}`} aria-hidden={opening || undefined} tabIndex={opening ? -1 : undefined}>
      {children}
    </Link>
  );
}
