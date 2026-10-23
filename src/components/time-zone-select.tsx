"use client";
import { useEffect, useState } from "react";
import { preferredZone } from "@/lib/timezones";

/** Time zone select that offers this device's zone when the saved one differs from it. */
/** `useDevice` contains "{tz}" for the device's zone. */
export function TimeZoneSelect({ name, defaultValue, options, useDevice }: { name: string; defaultValue: string; options: string[]; useDevice: string }) {
  const [value, setValue] = useState(defaultValue);
  const [device, setDevice] = useState<string | null>(null);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the device zone is only known in the browser
      setDevice(preferredZone(Intl.DateTimeFormat().resolvedOptions().timeZone));
    } catch {
      setDevice(null);
    }
  }, []);
  const list = device && !options.includes(device) ? [...options, device].sort() : options;
  return (
    <div className="space-y-1">
      <select
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-2xl border border-stone-200 bg-white/90 px-3.5 py-2 text-base text-stone-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
      >
        {list.map((z) => <option key={z} value={z}>{z}</option>)}
      </select>
      {device && device !== value && (
        <button type="button" onClick={() => setValue(device)} className="text-xs text-teal-700 underline">
          {useDevice.replace("{tz}", device)}
        </button>
      )}
    </div>
  );
}
