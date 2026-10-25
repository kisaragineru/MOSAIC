/**
 * Link previews for web links in messages: the page's Open Graph card (title, description,
 * site name, image). Fetched by the server with SSRF protection (see link-preview/safe-fetch),
 * kept a week (a failure a day) so each link is fetched once, and the image is served from here
 * (the browser never contacts the other site, and the CSP stays 'self').
 */
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { hitInTx } from "../auth/rate-limit";
import { withUser } from "../db/tx";
import { invalid } from "../errors";
import { logError } from "../log";
import { decodeHtml, parsePreview } from "../link-preview/parse";
import { checkUrl, FetchRefused, safeFetch } from "../link-preview/safe-fetch";

export interface LinkPreview {
  url: string;
  host: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  image: string | null;
}

const PAGE_BYTES = 600_000;
const IMAGE_BYTES = 2_500_000;
const FRESH_MS = 7 * 86_400_000;
const RETRY_FAILED_MS = 86_400_000;

/** Same link, same key: no fragment, scheme and host lower-cased. */
export function normalizeUrl(raw: string): string {
  const u = checkUrl(raw.trim());
  u.hash = "";
  return u.toString();
}
const hashOf = (url: string) => createHash("sha256").update(url).digest("hex");

/** What the bytes really are (gif included: previews often use one). */
function sniff(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  if (b.length > 6 && String.fromCharCode(...b.slice(0, 4)) === "GIF8") return "image/gif";
  return null;
}

type Row = { url: string; status: "ok" | "empty" | "failed"; title: string | null; description: string | null; site_name: string | null; has_image: boolean; fetched_at: string | Date };

const view = (url: string, hash: string, r: Row): LinkPreview => ({
  url,
  host: new URL(url).hostname.replace(/^www\./, ""),
  title: r.title,
  description: r.description,
  siteName: r.site_name,
  image: r.has_image ? `/api/link-preview/image/${hash}` : null,
});

/** The preview for a link (from the cache, or fetched now). Null when the page has nothing to show. */
export async function getLinkPreview(userId: string, rawUrl: string): Promise<LinkPreview | null> {
  let url: string;
  try {
    url = normalizeUrl(rawUrl);
  } catch {
    throw invalid("bad_url");
  }
  const hash = hashOf(url);
  const cached = await withUser(userId, async (tx) => (await tx.execute<Row>(sql`select * from link_preview_get(${hash})`)).rows[0]);
  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    const fresh = cached.status === "failed" ? age < RETRY_FAILED_MS : age < FRESH_MS;
    if (fresh) return cached.status === "ok" ? view(url, hash, cached) : null;
  }

  // Fetching costs the server something: count it against the person's message allowance.
  const allowed = await withUser(userId, (tx) => hitInTx(tx, "linkPreview", userId));
  if (!allowed) return cached?.status === "ok" ? view(url, hash, cached) : null;

  let status: Row["status"] = "failed";
  let card: { title: string | null; description: string | null; siteName: string | null; image: string | null } = { title: null, description: null, siteName: null, image: null };
  let img: { mime: string; bytes: Buffer } | null = null;
  try {
    const page = await safeFetch(url, { maxBytes: PAGE_BYTES, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1" });
    if (page.status >= 200 && page.status < 300 && /html/i.test(page.contentType)) {
      card = parsePreview(decodeHtml(page.body, page.contentType), page.url);
      status = card.title || card.description || card.image ? "ok" : "empty";
      if (card.image) {
        const pic = await safeFetch(card.image, { maxBytes: IMAGE_BYTES, accept: "image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.8" }).catch(() => null);
        const mime = pic && pic.status >= 200 && pic.status < 300 && pic.body.length < IMAGE_BYTES ? sniff(pic.body) : null;
        if (pic && mime) img = { mime, bytes: pic.body };
      }
    } else {
      status = "empty";
    }
  } catch (e) {
    if (!(e instanceof FetchRefused)) logError("link_preview.fetch", e);
    status = "failed";
  }
  const row = await withUser(userId, async (tx) =>
    (
      await tx.execute<Row>(
        sql`select * from link_preview_put(${hash}, ${url}, ${status}, ${card.title}, ${card.description}, ${card.siteName}, ${img?.mime ?? null}, ${img?.bytes ?? null})`,
      )
    ).rows[0]!,
  );
  return row.status === "ok" ? view(url, hash, row) : null;
}

export async function getLinkPreviewImage(userId: string, hash: string): Promise<{ mime: string; bytes: Buffer } | null> {
  if (!/^[0-9a-f]{64}$/.test(hash)) return null;
  const r = await withUser(userId, (tx) => tx.execute<{ mime: string; bytes: Buffer }>(sql`select * from link_preview_image(${hash})`));
  return r.rows[0] ?? null;
}
