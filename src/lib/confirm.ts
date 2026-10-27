/**
 * Asking "are you sure?" in the app's own dialog (the browser's confirm() has its buttons in the
 * device's language). The dialog in the root layout registers itself; until it has, the browser's
 * own is used.
 */
type Ask = (message: string) => Promise<boolean>;
let ask: Ask | null = null;
let open = false;

/** Whether the dialog is up (so Escape there doesn't also close what's behind it). */
export const confirming = () => open;

export function setConfirm(fn: Ask | null) {
  ask = fn;
}

export function askConfirm(message: string): Promise<boolean> {
  if (!ask) return Promise.resolve(window.confirm(message));
  open = true;
  // Let this key press finish before "open" is cleared, so its Escape stays the dialog's.
  return ask(message).finally(() => setTimeout(() => (open = false), 0));
}
