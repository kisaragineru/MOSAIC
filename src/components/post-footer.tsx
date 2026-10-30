"use client";
import { useState } from "react";
import { AudienceField, audienceHint, type AudienceText } from "./audience-field";

/** Who it's for, then the one button that posts it, saying who will see it. */
export function PostFooter({
  tx,
  canShare,
  visibility,
  circles,
  people = [],
  audience = [],
  submit,
  pendingLabel,
  pending = false,
  disabled = false,
}: {
  tx: AudienceText;
  canShare: boolean;
  visibility?: string;
  circles?: string[];
  people?: { id: string; name: string }[];
  audience?: string[];
  submit: string;
  pendingLabel?: string;
  pending?: boolean;
  disabled?: boolean;
}) {
  const first = audienceHint(tx, visibility ?? "private", circles ?? [], audience, people);
  const [hint, setHint] = useState(first);
  return (
    <div className="space-y-3">
      <AudienceField tx={tx} canShare={canShare} visibility={visibility} circles={circles} people={people} audience={audience} onChange={(h) => setHint(h)} />
      <div>
        <button type="submit" disabled={pending || disabled} className="min-h-12 w-full rounded-full bg-teal-700 px-6 text-base font-bold text-white shadow-md shadow-teal-900/15 transition hover:bg-teal-800 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none">
          {pending && pendingLabel ? pendingLabel : submit}
        </button>
        <p className="mt-1.5 text-center text-xs text-stone-500" aria-live="polite" data-testid="post-audience">{hint}</p>
      </div>
    </div>
  );
}
