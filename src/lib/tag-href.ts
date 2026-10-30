/** A tag's own page (the tag as one path segment). */
export const tagHref = (tag: string) => `/memories/tags/${encodeURIComponent(tag)}`;
