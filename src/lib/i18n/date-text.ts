import type { Dict } from "./messages/en";

/** What the date pickers say, in the reader's language. */
export const dateText = (t: Dict) => ({ year: t.common.dateYear, month: t.common.dateMonth, day: t.common.dateDay, months: t.common.months });
