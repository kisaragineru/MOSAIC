import { setFeelingAction, setLabelsAction } from "@/app/actions/memories";
import { FEELINGS, FEELING_EMOJI, LABELS, type Feeling, type Label } from "@/lib/labels";
import type { Dict } from "@/lib/i18n/messages/en";
import { KIND_ICON } from "@/lib/timeline";

const chip =
  "cursor-pointer select-none rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 transition has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:text-white";

/**
 * On my own post: what it's about (read from the words, or set by me) with one tap to confirm
 * or a short list to correct, and how I felt.
 */
export function PostAbout({ t, id, labels, by, feeling, ask }: { t: Dict; id: string; labels: Label[]; by: "auto" | "user"; feeling: Feeling | null; ask: boolean }) {
  const tl = t.memories.labels;
  const tf = t.memories.feeling;
  return (
    <section className={`space-y-4 rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ${ask && !feeling ? "ring-2 ring-teal-400" : "ring-white/80"}`} data-testid="post-about">
      <div>
        <p className="mb-1.5 text-sm font-semibold text-stone-800">{ask && !feeling ? tf.question : `${tf.title}`}</p>
        <div className="grid grid-cols-6 gap-1">
          {FEELINGS.map((f) => (
            <form key={f} action={setFeelingAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="feeling" value={feeling === f ? "" : f} />
              <button
                type="submit"
                aria-pressed={feeling === f}
                className={`flex w-full flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] transition active:scale-95 ${feeling === f ? "bg-teal-50 font-semibold text-teal-900 ring-2 ring-teal-500" : "text-stone-600 hover:bg-stone-50"} ${feeling && feeling !== f ? "opacity-50" : ""}`}
              >
                <span aria-hidden className="emoji-color text-2xl">{FEELING_EMOJI[f]}</span>
                {tf.names[f]}
              </button>
            </form>
          ))}
        </div>
      </div>
      <div className="border-t border-stone-100 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-stone-800">🏷 {tl.title}</span>
          {labels.length ? labels.map((l) => <span key={l} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-900">{KIND_ICON[l]} {t.memories.kinds[l]}</span>) : <span className="text-xs text-stone-500">{tl.none}</span>}
          <span className={`text-[11px] ${by === "user" ? "text-teal-700" : "text-stone-500"}`}>{by === "user" ? `✓ ${tl.mine}` : `（${tl.auto}）`}</span>
        </div>
        <p className="mt-1 text-[11px] leading-5 text-stone-500">{tl.help}</p>
        <div className="mt-2 flex flex-wrap items-start gap-2">
          {by === "auto" && (
            <form action={setLabelsAction}>
              <input type="hidden" name="id" value={id} />
              {labels.map((l) => <input key={l} type="hidden" name="labels" value={l} />)}
              <button type="submit" className="min-h-9 rounded-full bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">✓ {tl.correct}</button>
            </form>
          )}
          <details className="group">
            <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-full border border-stone-200 px-4 text-sm text-stone-700 hover:border-teal-300">✎ {tl.change}</summary>
            <form action={setLabelsAction} className="mt-2 space-y-2">
              <input type="hidden" name="id" value={id} />
              <div className="flex flex-wrap gap-1.5">
                {LABELS.map((l) => (
                  <label key={l} className={chip}>
                    <input type="checkbox" name="labels" value={l} defaultChecked={labels.includes(l)} className="sr-only" />
                    {KIND_ICON[l]} {t.memories.kinds[l]}
                  </label>
                ))}
              </div>
              <button type="submit" className="min-h-9 rounded-full bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">{tl.save}</button>
            </form>
          </details>
        </div>
      </div>
    </section>
  );
}
