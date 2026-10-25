import type { Dict } from "@/lib/i18n/messages/en";

/** Labels for <TuviThemes>, from the reader's dictionary. */
export function themeLabels(t: Dict) {
  const ui = t.tuvi.ui;
  return { related: ui.related, strength: ui.strength, caution: ui.caution, notes: ui.notes, notesLead: ui.notesLead, plain: ui.plain, detail: ui.detail, terms: ui.terms };
}
