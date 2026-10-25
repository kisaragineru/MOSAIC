"use client";
import { useEffect, useState } from "react";

export interface LinkCardData {
  url: string;
  host: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  image: string | null;
}

/** The first web link in a text (what a message's preview is about). */
export function firstUrl(text: string): string | null {
  const m = /https?:\/\/[^\s<>"]+/.exec(text);
  if (!m) return null;
  // Punctuation right after a link belongs to the sentence (also the full-width kind).
  return m[0].replace(/[)\].,!?、。」』）】〉》]+$/u, "");
}

// One request per link per page, shared by every message that has it.
const seen = new Map<string, Promise<LinkCardData | null>>();
function load(url: string) {
  let p = seen.get(url);
  if (!p) {
    p = fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, { cache: "default" })
      .then((r) => (r.ok ? r.json() : { preview: null }))
      .then((j: { preview: LinkCardData | null }) => j.preview)
      .catch(() => null);
    seen.set(url, p);
  }
  return p;
}

/** The page's card (image, site, title, description) under a message with a web link. */
export function LinkCard({ url, mine }: { url: string; mine: boolean }) {
  const [card, setCard] = useState<LinkCardData | null>(null);
  useEffect(() => {
    let live = true;
    void load(url).then((c) => live && setCard(c));
    return () => {
      live = false;
    };
  }, [url]);
  if (!card) return null;
  return (
    <a
      href={card.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={(e) => e.stopPropagation()}
      className={`mt-1 block w-64 max-w-full overflow-hidden rounded-3xl bg-white text-stone-900 shadow-sm ring-1 ring-stone-200 transition hover:ring-teal-300 ${mine ? "ml-auto" : ""}`}
    >
      {card.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.image} alt="" loading="lazy" className="aspect-[1.91/1] w-full bg-stone-100 object-cover" />
      )}
      <span className="block px-3.5 py-2.5">
        <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-stone-500">{card.siteName ?? card.host}</span>
        {card.title && <span className="line-clamp-2 block text-sm font-semibold leading-snug">{card.title}</span>}
        {card.description && <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-stone-600">{card.description}</span>}
      </span>
    </a>
  );
}
