/**
 * Time zone choices for forms.
 *
 * Intl.supportedValuesOf("timeZone") returns ICU's canonical ids, some of them legacy names
 * (Asia/Saigon rather than Asia/Ho_Chi_Minh). A select whose saved value is missing from its
 * options falls back to the first option (Africa/Abidjan) and saves that on the next submit, so
 * the list uses the current IANA names and always contains the value being edited.
 */
const PREFERRED: Record<string, string> = {
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "America/Godthab": "America/Nuuk",
  "Pacific/Truk": "Pacific/Chuuk",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Enderbury": "Pacific/Kanton",
};

/** The current IANA name for a zone id (legacy aliases mapped, others unchanged). */
export function preferredZone(tz: string): string {
  return PREFERRED[tz] ?? tz;
}

export function timeZoneOptions(...include: (string | null | undefined)[]): string[] {
  const all = new Set(Intl.supportedValuesOf("timeZone").map(preferredZone));
  for (const z of include) if (z) all.add(z);
  return [...all].sort();
}
