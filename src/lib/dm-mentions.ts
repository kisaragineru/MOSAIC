/**
 * "@name" in group messages, on the client: finding the "@…" being typed (for the member list)
 * and marking mentions in a message. Who is mentioned is decided by the database from the body
 * (migration 0088: "@" + a member's name, or "@全員" / "@all" / "@tất cả"); this follows the same rule.
 */

/** The words for "everyone", in every language: any of them mentions the whole group. */
export const ALL_WORDS = ["全員", "all", "tất cả"] as const;

/** The "@…" being typed just before the caret, or null: "@" at the start or after anything but a letter or digit (not an e-mail address). */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  if (at > 0 && /[A-Za-z0-9_]/.test(before[at - 1]!)) return null;
  const query = before.slice(at + 1);
  // A line break, or more than a long name's worth of text, ends it.
  if (/[\n\r]/.test(query) || query.length > 30) return null;
  return { start: at, query };
}

/** The text with the "@…" being typed replaced by "@name " (and where the caret goes). */
export function insertMention(text: string, at: { start: number; query: string }, name: string): { text: string; caret: number } {
  const end = at.start + 1 + at.query.length;
  const insert = `@${name} `;
  return { text: text.slice(0, at.start) + insert + text.slice(end), caret: at.start + insert.length };
}

export type Part = { mention: boolean; text: string };

/** A message split into plain text and mentions of the given names (the longest name first), plus "@all" when it says so. */
export function mentionParts(text: string, names: string[], all: boolean): Part[] {
  const words = [...names.filter(Boolean), ...(all ? ALL_WORDS : [])].sort((a, b) => b.length - a.length);
  if (!words.length) return [{ mention: false, text }];
  const parts: Part[] = [];
  let plain = "";
  for (let i = 0; i < text.length; ) {
    const hit = text[i] === "@" ? words.find((w) => text.startsWith(w, i + 1)) : undefined;
    if (hit) {
      if (plain) parts.push({ mention: false, text: plain });
      plain = "";
      parts.push({ mention: true, text: `@${hit}` });
      i += hit.length + 1;
    } else {
      plain += text[i];
      i += 1;
    }
  }
  if (plain) parts.push({ mention: false, text: plain });
  return parts;
}
