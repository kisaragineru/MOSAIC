"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * A page left open across midnight (or restored from the background on a phone) keeps showing
 * yesterday's daily question. This re-renders the page once the user's local day has changed:
 * when the tab becomes visible again, and once a minute while it stays open.
 */
export function DayWatcher({ day, timeZone }: { day: string; timeZone: string }) {
  const router = useRouter();
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    let refreshed = false;
    const check = () => {
      if (refreshed || document.visibilityState !== "visible") return;
      if (fmt.format(new Date()) !== day) {
        refreshed = true;
        router.refresh();
      }
    };
    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    check();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
    };
  }, [day, timeZone, router]);
  return null;
}
