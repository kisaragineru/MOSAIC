import type { MediaItem } from "@/server/services/media";

const thumb = (id: string) => `/api/memories/media/${id}/thumb`;
const full = (id: string) => `/api/memories/media/${id}`;

/** "1:05" for a video's length. */
export function duration(ms: number | null) {
  if (!ms) return null;
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** One photo alone keeps roughly its own shape, within calm limits (tall, square or wide). */
function singleShape(m: MediaItem) {
  const r = m.width / m.height;
  return r < 0.9 ? "aspect-[4/5]" : r > 1.25 ? "aspect-video" : "aspect-square";
}

/** Where each tile goes, by how many there are: always one tidy block, never a ragged row. */
const LAYOUT: Record<number, { box: string; tiles: string[] }> = {
  2: { box: "grid-cols-2 aspect-[2/1]", tiles: ["", ""] },
  3: { box: "grid-cols-2 grid-rows-2 aspect-[4/3]", tiles: ["row-span-2", "", ""] },
  4: { box: "grid-cols-2 grid-rows-2 aspect-[5/4]", tiles: ["", "", "", ""] },
  5: { box: "grid-cols-6 grid-rows-2 aspect-[6/5]", tiles: ["col-span-3", "col-span-3", "col-span-2", "col-span-2", "col-span-2"] },
};

function Tile({ m, className, alt }: { m: MediaItem; className?: string; alt: string }) {
  return (
    <span className={`relative block overflow-hidden bg-stone-100 ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumb(m.id)} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      {m.kind === "video" && (
        <>
          <span aria-hidden className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 pl-0.5 text-lg text-white backdrop-blur-sm">▶</span>
          </span>
          {duration(m.durationMs) && <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">{duration(m.durationMs)}</span>}
        </>
      )}
    </span>
  );
}

/** A record's photos and videos as one block of thumbnails, for lists (the record opens on tap). */
export function MediaGrid({ media, label }: { media: MediaItem[]; label: (i: number, n: number, video: boolean) => string }) {
  const items = media.slice(0, 5);
  if (!items.length) return null;
  if (items.length === 1) {
    return (
      <div className="mt-2 overflow-hidden rounded-2xl" data-testid="media-grid" data-count={1}>
        <Tile m={items[0]!} className={`w-full ${singleShape(items[0]!)} max-h-96`} alt={label(1, 1, items[0]!.kind === "video")} />
      </div>
    );
  }
  const l = LAYOUT[items.length]!;
  return (
    <div className={`mt-2 grid w-full gap-0.5 overflow-hidden rounded-2xl ${l.box}`} data-testid="media-grid" data-count={items.length}>
      {items.map((m, i) => (
        <Tile key={m.id} m={m} className={`h-full w-full ${l.tiles[i]}`} alt={label(i + 1, items.length, m.kind === "video")} />
      ))}
    </div>
  );
}

/** On a record's own page: each photo whole, in order, and videos to play. */
export function MediaGallery({ media, label }: { media: MediaItem[]; label: (i: number, n: number, video: boolean) => string }) {
  if (!media.length) return null;
  return (
    <div className="space-y-2" data-testid="media-gallery">
      {media.map((m, i) =>
        m.kind === "video" ? (
          <video
            key={m.id}
            src={full(m.id)}
            poster={thumb(m.id)}
            controls
            playsInline
            preload="none"
            width={m.width}
            height={m.height}
            aria-label={label(i + 1, media.length, true)}
            className="h-auto max-h-[80vh] w-full rounded-2xl bg-black"
          />
        ) : (
          <a key={m.id} href={full(m.id)} target="_blank" rel="noopener" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={full(m.id)} alt={label(i + 1, media.length, false)} width={m.width} height={m.height} loading={i === 0 ? "eager" : "lazy"} className="h-auto max-h-[80vh] w-full rounded-2xl bg-stone-100 object-contain" />
          </a>
        ),
      )}
    </div>
  );
}
