"use client";
import { useState } from "react";
import { normalizeTag, similarTags, suggestTags, MAX_TAGS } from "@/lib/tags";

export interface TagInputText {
  label: string;
  placeholder: string;
  add: string;
  /** "{tag}" is the tag (for the remove button). */
  remove: string;
  /** Before the tags already used that look like what is typed. */
  similar: string;
  /** "{n}": how many records have it. */
  count: string;
}

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

/**
 * Tags as chips: the tags already used come up while typing (most used first), and a new one that
 * looks like one of them is pointed out, so one meaning keeps one spelling. Sent as "tags",
 * comma-separated, with whatever is still in the box.
 */
export function TagInput({ name = "tags", initial = [], known, tx }: { name?: string; initial?: string[]; known: { tag: string; n: number }[]; tx: TagInputText }) {
  const [tags, setTags] = useState<string[]>(initial);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const typed = normalizeTag(text);
  const add = (raw: string) => {
    const tag = normalizeTag(raw);
    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) setTags([...tags, tag]);
    setText("");
  };
  const suggestions = focused ? suggestTags(text, known, tags).filter((x) => x.tag !== typed) : [];
  const similar = typed && !known.some((k) => k.tag === typed) ? similarTags(typed, known).filter((x) => !tags.includes(x.tag)) : [];
  const chip = (x: { tag: string; n: number }, onPick: () => void) => (
    <button
      key={x.tag}
      type="button"
      // Keep the box focused while picking.
      onPointerDown={(e) => e.preventDefault()}
      onClick={onPick}
      className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700 transition hover:bg-teal-50 hover:text-teal-800"
    >
      #{x.tag} <span className="text-stone-400">{fill(tx.count, { n: x.n })}</span>
    </button>
  );
  return (
    <div className="space-y-2" data-testid="tag-input">
      <input type="hidden" name={name} value={[...tags, typed].filter(Boolean).join(",")} />
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag} className="flex items-center gap-1 rounded-full bg-teal-50 py-1 pl-2.5 pr-1 text-sm text-teal-900 ring-1 ring-teal-100">
              #{tag}
              <button type="button" aria-label={fill(tx.remove, { tag })} onClick={() => setTags(tags.filter((x) => x !== tag))} className="flex h-5 w-5 items-center justify-center rounded-full text-xs text-teal-700 hover:bg-teal-100">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            // A comma or "、" ends a tag.
            if (/[,，、]$/.test(v)) add(v.slice(0, -1));
            else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add(text);
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={tx.placeholder}
          aria-label={tx.label}
          maxLength={60}
          className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
        />
        <button type="button" onClick={() => add(text)} disabled={!typed} className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 disabled:opacity-40">
          {tx.add}
        </button>
      </div>
      {similar.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-2 text-xs text-amber-900" data-testid="tag-similar">
          <p className="mb-1">{tx.similar}</p>
          <div className="flex flex-wrap gap-1.5">{similar.map((x) => chip(x, () => add(x.tag)))}</div>
        </div>
      )}
      {suggestions.length > 0 && <div className="flex flex-wrap gap-1.5" data-testid="tag-suggestions">{suggestions.map((x) => chip(x, () => add(x.tag)))}</div>}
    </div>
  );
}
