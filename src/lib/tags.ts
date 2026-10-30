/**
 * Record tags: one spelling per meaning. A tag is stored trimmed and lower-cased (as before);
 * "#tag" in a record's text is a tag too; and a new tag that looks like one already used is
 * pointed out, compared loosely (width, case, kana, accents, spaces and dots).
 */

export const MAX_TAG_LENGTH = 40;
export const MAX_TAGS = 20;

/** How a tag is stored: no leading "#", single spaces, NFKC, lower case, at most 40 characters. */
export function normalizeTag(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, MAX_TAG_LENGTH);
}

/** Katakana to hiragana, so "ブランド" and "ぶらんど" meet. */
const toHiragana = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** The loose form two spellings are compared by. */
export function tagKey(tag: string): string {
  return toHiragana(
    normalizeTag(tag)
      .replace(/đ/g, "d")
      .normalize("NFD")
      .replace(/\p{M}/gu, ""),
  ).replace(/[\s・·._\-ー－]/g, "");
}

/**
 * Tags already used that look like this one (not itself): the same loosely, then one containing
 * the other (two characters at least), most used first.
 */
export function similarTags(input: string, known: { tag: string; n: number }[], limit = 3): { tag: string; n: number }[] {
  const tag = normalizeTag(input);
  const key = tagKey(tag);
  if (!key) return [];
  const others = known.filter((k) => k.tag !== tag);
  const same = others.filter((k) => tagKey(k.tag) === key);
  const near = key.length < 2 ? [] : others.filter((k) => !same.includes(k) && tagKey(k.tag).length >= 2 && (tagKey(k.tag).includes(key) || key.includes(tagKey(k.tag))));
  return [...same.sort((a, b) => b.n - a.n), ...near.sort((a, b) => b.n - a.n)].slice(0, limit);
}

/**
 * "#tag" in a text: after the start or a character that isn't a letter or digit (not "C#"),
 * up to a space or punctuation; numbers alone ("#1") are not tags.
 */
export function hashtags(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/(?<=^|[^\p{L}\p{N}_&])[#＃]([^\s#＃、。，．,.!?！？「」『』()（）[\]{}<>【】"'“”‘’:：;；/／\\]+)/gu)) {
    const tag = normalizeTag(m[1]!);
    if (tag && !/^\d+$/.test(tag) && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/** The tags typed and the text's #tags together, typed first, each once, at most 20. */
export function mergeTags(typed: string[], text: string): string[] {
  return [...new Set([...typed.map(normalizeTag).filter(Boolean), ...hashtags(text)])].slice(0, MAX_TAGS);
}

/** The "#…" being typed just before the caret, or null (for the suggestion list). */
export function tagQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const m = /(?:^|[^\p{L}\p{N}_&])[#＃]([^\s#＃、。，．,.!?！？「」『』()（）]{0,40})$/u.exec(before);
  if (!m) return null;
  return { start: before.length - m[1]!.length - 1, query: m[1]! };
}

/** Tags already used that start with or contain what is typed, most used first; with nothing typed, the most used. */
export function suggestTags(query: string, known: { tag: string; n: number }[], exclude: string[] = [], limit = 6): { tag: string; n: number }[] {
  const q = tagKey(query);
  const pool = known.filter((k) => !exclude.includes(k.tag));
  if (!q) return pool.slice(0, limit);
  const starts = pool.filter((k) => tagKey(k.tag).startsWith(q));
  const has = pool.filter((k) => !starts.includes(k) && tagKey(k.tag).includes(q));
  return [...starts, ...has].slice(0, limit);
}
