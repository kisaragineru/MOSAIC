import { saveBirthAction } from "@/app/actions/tuvi";
import { Button, Checkbox, Field, Input, Notice, Select } from "@/components/ui";
import type { Dict } from "@/lib/i18n/messages/en";
import { preferredZone, timeZoneOptions } from "@/lib/timezones";
import type { TuviView } from "@/server/services/tuvi";

/** The birth details a Tử Vi chart is computed from (on the Tử Vi page and in the profile). */
export function BirthForm({ t, p, needs, back, simple = false }: { t: Dict; p: TuviView["profile"]; needs: TuviView["needs"]; back: string; simple?: boolean }) {
  // The welcome guide asks for the birth date first; the rarer settings wait behind "More".
  const rare = (children: React.ReactNode) =>
    simple ? (
      <details className="rounded-2xl bg-stone-50 px-3 py-2">
        <summary className="cursor-pointer text-sm text-stone-600">{t.welcome.tuviMore}</summary>
        <div className="mt-3 space-y-3">{children}</div>
      </details>
    ) : (
      children
    );
  const needsLate = needs.includes("late_rat_hour") || !!p?.lateRatHour;
  const needsLeap = needs.includes("leap_month_rule") || !!p?.leapMonthRule;
  const calendar = (
    <fieldset className="flex gap-4 text-sm">
      <legend className="mb-1 text-sm font-medium text-stone-700">{t.tuvi.calendar}</legend>
      <label className="flex items-center gap-1"><input type="radio" name="calendarInput" value="solar" defaultChecked={(p?.calendarInput ?? "solar") === "solar"} className="accent-teal-700" /> {t.tuvi.solar}</label>
      <label className="flex items-center gap-1"><input type="radio" name="calendarInput" value="lunar" defaultChecked={p?.calendarInput === "lunar"} className="accent-teal-700" /> {t.tuvi.lunar}</label>
    </fieldset>
  );
  const date = (
    <Field label={`${t.tuvi.solarDate} (${t.tuvi.solar})`}>
      <Input type="date" name="solarDate" defaultValue={p?.solarDate ?? ""} min="1900-01-01" max="2100-12-31" required={simple} />
    </Field>
  );
  const lunar = (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Field label={t.tuvi.lunarYear}><Input type="number" name="lunarYear" min={1900} max={2100} defaultValue={p?.lunarYear ?? ""} /></Field>
        <Field label={t.tuvi.lunarMonth}><Input type="number" name="lunarMonth" min={1} max={12} defaultValue={p?.lunarMonth ?? ""} /></Field>
        <Field label={t.tuvi.lunarDay}><Input type="number" name="lunarDay" min={1} max={30} defaultValue={p?.lunarDay ?? ""} /></Field>
      </div>
      <Checkbox name="lunarLeap" defaultChecked={p?.lunarLeap} label={t.tuvi.lunarLeap} />
    </>
  );
  // In the guide the time is simply optional: left empty, the chart is made without it.
  const time = simple ? (
    <>
      <input type="hidden" name="timeFromInput" value="1" />
      <TimeSelect t={t} value={p?.birthTime} hint={t.welcome.timeHint} />
    </>
  ) : (
    <>
      <Checkbox name="timeKnown" defaultChecked={p ? p.timeKnown : true} label={t.tuvi.timeKnown} />
      <TimeSelect t={t} value={p?.birthTime} />
    </>
  );
  const zone = (
    <>
      <Field label={t.tuvi.timeZone}>
        <Select name="timeZone" defaultValue={preferredZone(p?.timeZone ?? "Asia/Ho_Chi_Minh")}>
          {timeZoneOptions(preferredZone(p?.timeZone ?? "Asia/Ho_Chi_Minh")).map((z) => <option key={z} value={z}>{z}</option>)}
        </Select>
      </Field>
      <Field label={t.tuvi.place}><Input name="placeLabel" defaultValue={p?.placeLabel ?? ""} maxLength={120} /></Field>
    </>
  );
  return (
    <form action={saveBirthAction} className="space-y-3">
      <input type="hidden" name="back" value={back} />
      {simple ? (
        <>
          {date}
          {time}
          {rare(
            <>
              {calendar}
              {lunar}
              {zone}
            </>,
          )}
        </>
      ) : (
        <>
          {calendar}
          {date}
          {lunar}
          {time}
          {zone}
        </>
      )}
      <Field label={t.tuvi.sex} hint={t.tuvi.sexHelp}>
        <Select name="sex" defaultValue={p?.sex ?? "unspecified"}>
          {(["male", "female", "unspecified"] as const).map((s) => <option key={s} value={s}>{t.tuvi.sexes[s]}</option>)}
        </Select>
      </Field>
      {needs.length > 0 && <Notice kind="warning"><b>{t.tuvi.needsTitle}</b></Notice>}
      {needsLate && (
        <Field label={t.tuvi.lateRatQ}>
          <Select name="lateRatHour" defaultValue={p?.lateRatHour ?? ""} required={needs.includes("late_rat_hour")}>
            <option value="">—</option>
            {(["next_day", "same_day"] as const).map((x) => <option key={x} value={x}>{t.tuvi.lateRat[x]}</option>)}
          </Select>
        </Field>
      )}
      {needsLeap && (
        <Field label={t.tuvi.leapQ}>
          <Select name="leapMonthRule" defaultValue={p?.leapMonthRule ?? ""} required={needs.includes("leap_month_rule")}>
            <option value="">—</option>
            {(["same_month", "next_month", "split_15"] as const).map((x) => <option key={x} value={x}>{t.tuvi.leapRules[x]}</option>)}
          </Select>
        </Field>
      )}
      <Button type="submit" className="w-full">{simple ? t.welcome.tuviMake : t.tuvi.compute}</Button>
    </form>  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/**
 * The birth time as two plain pickers (hour, minute) rather than the phone's clock dialog, which
 * the app cannot size or translate. Left at "--", the time is unknown.
 */
function TimeSelect({ t, value, hint }: { t: Dict; value: string | null | undefined; hint?: string }) {
  const [h, m] = value ? value.slice(0, 5).split(":") : ["", ""];
  return (
    <fieldset className="space-y-1" role="group" aria-label={t.tuvi.time}>
      <legend className="mb-1 text-sm font-medium text-stone-700">{t.tuvi.time}</legend>
      <div className="flex items-center gap-2">
        <Select name="birthHour" aria-label={t.tuvi.timeHour} defaultValue={h ?? ""} className="w-24">
          <option value="">--</option>
          {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
        </Select>
        <span aria-hidden className="text-lg font-semibold text-stone-500">:</span>
        <Select name="birthMinute" aria-label={t.tuvi.timeMinute} defaultValue={m ?? ""} className="w-24">
          <option value="">--</option>
          {MINUTES.map((x) => <option key={x} value={x}>{x}</option>)}
        </Select>
      </div>
      {hint && <span className="block text-xs text-stone-500">{hint}</span>}
    </fieldset>
  );
}
