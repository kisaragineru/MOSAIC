"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const offset = (timeZone: string) => {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value;
  return name ?? "";
};

/** Points to the settings when the saved time zone is not the one this device is in right now. */
export function TimeZoneNotice({ saved, text, action }: { saved: string; text: string; action: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      // Compare current UTC offsets, so aliases (Asia/Saigon vs Asia/Ho_Chi_Minh) do not count as different.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the device zone is only known in the browser
      setShow(offset(Intl.DateTimeFormat().resolvedOptions().timeZone) !== offset(saved));
    } catch {
      setShow(false);
    }
  }, [saved]);
  if (!show) return null;
  return (
    <Link href="/settings" className="flex items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <span aria-hidden>🕒</span>
      <span className="flex-1">{text.replace("{tz}", saved)}</span>
      <span className="shrink-0 font-semibold text-amber-800">{action} →</span>
    </Link>
  );
}
