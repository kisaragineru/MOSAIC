import type { TypeViewerLabels } from "@/components/type-viewer";
import type { Dict } from "@/lib/i18n/messages/en";

/** The full-screen type viewer's words (plain strings: they go to a client component). */
export function viewerLabels(t: Dict): TypeViewerLabels {
  const v = t.tuvi.viewer;
  return { open: v.open("{name}"), close: v.close, prev: v.prev, next: v.next, label: v.label, hint: v.hint, quote: [t.common.quoteOpen, t.common.quoteClose] };
}
