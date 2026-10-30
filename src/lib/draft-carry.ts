/**
 * The text of the quick composer, carried to the full form ("Write in more detail"): kept in this
 * tab's sessionStorage for a few minutes, taken once by the form. Too long for a URL, and never
 * sent anywhere until the user posts it.
 */
const KEY = "mosaic:carry-draft";
const FRESH_MS = 10 * 60_000;

export function carryDraft(body: string) {
  try {
    if (body.trim()) sessionStorage.setItem(KEY, JSON.stringify({ body, at: Date.now() }));
  } catch {
    // Storage unavailable (private mode): the full form opens empty, as before.
  }
}

export function takeDraft(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as { body?: unknown; at?: unknown };
    return typeof d.body === "string" && typeof d.at === "number" && Date.now() - d.at < FRESH_MS ? d.body : null;
  } catch {
    return null;
  }
}
