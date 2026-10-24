import Link from "next/link";
import { addPreferenceAction } from "@/app/actions/people";
import { chapterOf } from "@/content/axes";
import { LIKES_BY_CATEGORY, LIKES_FOLLOW_UP, LIKES_GENERIC } from "@/content/likes-followup";
import { QUESTION_BANK } from "@/content/questions";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";

const pill =
  "cursor-pointer rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:text-white";

/** Right after a "likes" question: name the specific thing, saved to your favourites. */
export function LikesFollowUp({ sp, back, t, locale }: { sp: Record<string, string | undefined>; back: string; t: Dict; locale: Locale }) {
  const q = sp.fb ? QUESTION_BANK.find((x) => x.id === sp.fb) : undefined;
  if (!q || chapterOf(q) !== "likes") return null;
  const f = LIKES_FOLLOW_UP[q.id];
  const category = f?.category ?? LIKES_BY_CATEGORY[q.category] ?? "other";
  // Brands, artists…: after each one, the same box comes back for one more (up to the limit).
  const added = Math.max(0, Math.min(Number.parseInt(sp.n ?? "0", 10) || 0, 10));
  const upTo = f?.upTo ?? 1;
  if (added >= upTo) return null;
  const again = upTo > 1 ? `${back}${back.includes("?") ? "&" : "?"}fb=${encodeURIComponent(q.id)}&n=${added + 1}` : back;
  return (
    <form action={addPreferenceAction} className="space-y-2 rounded-2xl bg-linear-to-br from-amber-50 to-rose-50 p-4 ring-1 ring-amber-100">
      <input type="hidden" name="back" value={again} />
      {added > 0 && <p className="text-xs font-semibold text-teal-800">✓ {t.discover.likesAdded(added, upTo)}</p>}
      <input type="hidden" name="categoryId" value={category} />
      <label className="block">
        <span className="text-sm font-semibold text-stone-900">🍀 {added > 0 ? t.discover.likesOneMore : (f?.hint ?? LIKES_GENERIC.hint)[locale]}</span>
        <input name="label" required maxLength={200} placeholder={(f?.example ?? LIKES_GENERIC.example)[locale]} className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" />
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {(["love", "like", "dislike"] as const).map((s) => (
          <label key={s} className={pill}>
            <input type="radio" name="sentiment" value={s} defaultChecked={s === (f?.sentiment ?? "love")} className="sr-only" />
            {t.people.sentiments[s]}
          </label>
        ))}
        {added > 0 && <Link href={back} className="ml-auto text-xs text-stone-500 underline">{t.discover.likesDone}</Link>}
        <button type="submit" className={`${added > 0 ? "" : "ml-auto "} rounded-full bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white`}>{t.discover.likesAdd}</button>
      </div>
      <p className="text-[11px] text-stone-500">🔒 {t.discover.likesPrivate}</p>
    </form>
  );
}
