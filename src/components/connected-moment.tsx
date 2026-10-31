import type { MainStarId } from "@/lib/tuvi/stars";
import type { Dict } from "@/lib/i18n/messages/en";
import { dmOpenForConnectionAction } from "@/app/actions/dm";
import { Avatar } from "./avatar";

type Face = { name: string; src?: string | null; type?: MainStarId | null };

/** Where the sparkles start around the pair (left %, top %, delay s). */
const SPARKS: [number, number, number][] = [[18, 20, 0.7], [80, 16, 0.85], [10, 62, 1.0], [88, 58, 1.1], [50, 6, 0.95], [30, 78, 1.2], [70, 80, 1.3]];

/**
 * Right after saying yes: when both have, the two faces come together with rings and sparkles
 * and a way to say hello; when only I have, a quieter note that it reached them.
 */
export function ConnectedMoment({ t, kind, sessionId, me, other, again = false, chooseHref = "#choose", tuviHref = null }: { t: Dict; /** Our Tử Vi isn't side by side yet: the way there comes first. */ tuviHref?: string | null; /** Where what to show is chosen. */ chooseHref?: string; kind: "connected" | "reached"; sessionId: string; me: Face; other: Face; /** Connected before, and the connection had ended. */ again?: boolean }) {
  const c = t.compare;
  const done = kind === "connected";
  return (
    <section className={`relative overflow-hidden rounded-3xl p-6 text-center shadow-md ring-1 ${done ? "bg-linear-to-br from-amber-50 via-rose-50 to-teal-50 ring-amber-200" : "bg-linear-to-br from-teal-50 via-white to-sky-50 ring-teal-100"}`} data-testid="connected-moment" role="status">
      <div className="relative mx-auto flex h-28 w-48 items-center justify-center">
        {done && (
          <>
            <span aria-hidden className="absolute inset-x-10 inset-y-2 rounded-full ring-2 ring-amber-300/70 animate-[ripple_1.6s_ease-out_0.6s_2_both]" />
            <span aria-hidden className="absolute inset-x-10 inset-y-2 rounded-full ring-2 ring-rose-300/60 animate-[ripple_1.6s_ease-out_1s_2_both]" />
            {SPARKS.map(([x, y, d], i) => (
              <span key={i} aria-hidden className="absolute text-sm text-amber-400" style={{ left: `${x}%`, top: `${y}%`, animation: `sparkle 1.4s ease-out ${d}s 2 both` }}>✦</span>
            ))}
          </>
        )}
        <div className="flex items-center">
          <span className="animate-[meetLeft_.8s_cubic-bezier(.2,.8,.2,1)_both]">
            <Avatar name={me.name || "?"} src={me.src ?? undefined} type={me.type ?? null} className="h-20 w-20 text-2xl ring-4 ring-white" />
          </span>
          <span className={`-ml-4 ${done ? "animate-[meetRight_.8s_cubic-bezier(.2,.8,.2,1)_both]" : "opacity-60"}`}>
            <Avatar name={other.name || "?"} src={other.src ?? undefined} type={other.type ?? null} className="h-20 w-20 text-2xl ring-4 ring-white" />
          </span>
        </div>
        {done && <span aria-hidden className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-2xl animate-[popIn_.6s_ease-out_.7s_both]">🤝</span>}
      </div>
      <h2 className="mt-3 text-xl font-bold text-stone-900 [text-wrap:balance] animate-[riseIn_.6s_ease-out_.5s_both]">{done ? (again ? c.momentAgain(other.name) : c.momentTitle(other.name)) : c.reachedTitle}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-stone-700 animate-[riseIn_.6s_ease-out_.7s_both]">{done ? c.momentLead : c.reachedLead(other.name)}</p>
      {done && (
        <div className="mt-5 space-y-2 animate-[riseIn_.6s_ease-out_.9s_both]">
          {tuviHref && (
            <a href={tuviHref} className="flex min-h-12 w-full items-center justify-center rounded-full bg-linear-to-r from-violet-600 to-teal-700 px-4 text-base font-bold text-white shadow-md transition hover:opacity-95 active:scale-[0.98]" data-testid="moment-tuvi">{c.momentTuvi}</a>
          )}
          <form action={dmOpenForConnectionAction}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="back" value={`/compare/${sessionId}`} />
            <button type="submit" className={tuviHref ? "flex min-h-11 w-full items-center justify-center rounded-full bg-white px-4 text-sm font-bold text-teal-800 ring-1 ring-teal-200" : "flex min-h-12 w-full items-center justify-center rounded-full bg-teal-700 px-4 text-base font-bold text-white shadow-md transition hover:bg-teal-800 active:scale-[0.98]"}>{c.momentMessage}</button>
          </form>
          {!tuviHref && <a href={chooseHref} className="block text-sm font-semibold text-teal-800 underline">{c.momentChoose}</a>}
        </div>
      )}
    </section>
  );
}
