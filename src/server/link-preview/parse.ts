/**
 * Reading a page's preview from its HTML: Open Graph first (og:title, og:description,
 * og:image, og:site_name), then Twitter cards, then <title> and the meta description.
 * Only the <head> is looked at; text is decoded with the page's own charset (e.g. Shift_JIS).
 */

export interface PagePreview {
  title: string | null;
  description: string | null;
  siteName: string | null;
  image: string | null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Decode bytes with the charset the server or the page declares (UTF-8 by default). */
export function decodeHtml(body: Buffer, contentType: string): string {
  const declared = /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(body.subarray(0, 2048).toString("latin1"))?.[1] ?? "utf-8";
  try {
    return new TextDecoder(declared.toLowerCase()).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

const clean = (s: string | null | undefined, max: number) => {
  if (!s) return null;
  const t = decodeEntities(s).replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/** Attributes of one tag, lower-cased names. */
function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    out[m[1]!.toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  }
  return out;
}

export function parsePreview(html: string, pageUrl: string): PagePreview {
  const head = (/<head[\s>]([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? html.slice(0, 200_000)).replace(/<script[\s\S]*?<\/script>/gi, "");
  const meta = new Map<string, string>();
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = (a.property ?? a.name ?? "").toLowerCase();
    if (key && a.content !== undefined && !meta.has(key)) meta.set(key, a.content);
  }
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1];
  const pick = (...keys: string[]) => keys.map((k) => meta.get(k)).find((v) => v && v.trim());
  const imageRaw = pick("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src");
  let image: string | null = null;
  if (imageRaw) {
    try {
      const u = new URL(decodeEntities(imageRaw.trim()), pageUrl);
      if (u.protocol === "https:" || u.protocol === "http:") image = u.toString();
    } catch {
      image = null;
    }
  }
  return {
    title: clean(pick("og:title", "twitter:title") ?? title, 200),
    description: clean(pick("og:description", "twitter:description", "description"), 300),
    siteName: clean(pick("og:site_name", "application-name"), 80),
    image,
  };
}
