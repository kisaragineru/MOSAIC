import { notFound } from "next/navigation";
import { answerPeerAction, askPeerAction, declinePeerAction, withdrawPeerAction } from "@/app/actions/peers";
import { ConfirmButton } from "@/components/confirm-button";
import { Confetti } from "@/components/confetti";
import { Flash } from "@/components/flash";
import { Button, Card, Notice, Page, Textarea } from "@/components/ui";
import { AXES, AXIS_CHAPTER, AXIS_CHAPTERS, CHAPTER_INFO, PEER_POLES } from "@/content/axes";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { myPeerRequests } from "@/server/services/peers";

const pill =
  "flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-stone-200 bg-white/90 px-2 py-2 text-center text-xs leading-snug text-stone-700 transition-colors hover:border-teal-300 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:font-semibold has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600/40";

const pillNeutral =
  "flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-stone-200 bg-white/90 px-2.5 py-2 text-center text-[11px] leading-snug text-stone-500 transition-colors hover:border-stone-400 has-[:checked]:border-stone-500 has-[:checked]:bg-stone-500 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-stone-500/40";

/** Answering "how do you see <name>?" — or what you sent, with the option to take it back. */
export default async function PeerAnswerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const p = t.peers;
  const r = (await myPeerRequests(uid)).find((x) => x.id === id && x.role === "responder");
  if (!r) notFound();
  const name = r.otherName;
  return (
    <Page title={p.answerTitle(name)} back="/home">
      <Flash t={t} sp={sp} />
      {r.status === "pending" ? (
        <form action={answerPeerAction} className="space-y-4">
          <input type="hidden" name="requestId" value={r.id} />
          <p className="text-sm leading-relaxed text-stone-700">{p.answerIntro(name)}</p>
          {AXIS_CHAPTERS.map((ch) => (
            <Card key={ch}>
              <p className="mb-3 text-xs font-semibold text-violet-800">{CHAPTER_INFO[ch].icon} {CHAPTER_INFO[ch].title[locale]}</p>
              <p className="mb-2 text-sm font-semibold text-stone-800">{p.lead(name)}</p>
              <div className="space-y-2">
                {AXES.filter((k) => AXIS_CHAPTER[k] === ch).map((k) => (
                  <fieldset key={k} className="grid grid-cols-[1fr_auto_1fr] gap-1.5">
                    <legend className="sr-only">{`${PEER_POLES[k].pos[locale]} / ${PEER_POLES[k].neg[locale]}`}</legend>
                    <label className={pill}>
                      <input type="radio" name={`a_${k}`} value="1" required className="sr-only" />
                      {PEER_POLES[k].pos[locale]}
                    </label>
                    <label className={pillNeutral}>
                      <input type="radio" name={`a_${k}`} value="0" className="sr-only" />
                      {p.neither}
                    </label>
                    <label className={pill}>
                      <input type="radio" name={`a_${k}`} value="-1" className="sr-only" />
                      {PEER_POLES[k].neg[locale]}
                    </label>
                  </fieldset>
                ))}
              </div>
            </Card>
          ))}
          <Card>
            <label className="block text-sm font-medium text-stone-800">
              {p.commentLabel(name)}
              <Textarea name="comment" maxLength={1000} rows={3} className="mt-1" />
            </label>
            <fieldset className="mt-4 space-y-2 text-sm">
              <legend className="mb-1 font-medium text-stone-800">{p.identity}</legend>
              <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-stone-200 px-3 py-2 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                <input type="radio" name="identity" value="named" required className="mt-1 accent-teal-700" />
                <span>{p.asNamed(name)}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-stone-200 px-3 py-2 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                <input type="radio" name="identity" value="anon" className="mt-1 accent-teal-700" />
                <span>{p.asAnon}</span>
              </label>
            </fieldset>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="submit">{p.submit}</Button>
              <Button type="submit" variant="ghost" formAction={declinePeerAction} formNoValidate>{p.decline}</Button>
            </div>
          </Card>
        </form>
      ) : r.status === "answered" ? (
        <>
          <Card className="relative overflow-hidden text-center">
            <Confetti />
            <p className="animate-[pop_.6s_ease-out] text-3xl" aria-hidden>💌</p>
            <p className="mt-2 whitespace-pre-line text-lg font-semibold leading-relaxed text-stone-900">{p.thanks(name)}</p>
            <p className="mt-1 text-xs text-stone-500">{r.anonymous ? p.sentAnon : p.sentNamed}</p>
            <form action={askPeerAction} className="mt-4">
              <input type="hidden" name="sessionId" value={r.sessionId} />
              <input type="hidden" name="back" value="/me/others" />
              <Button type="submit" variant="secondary">{p.askBack(name)}</Button>
            </form>
          </Card>
          <Card title={p.yourAnswer}>
            <p className="-mt-1 mb-3 text-sm font-semibold text-stone-700">{p.lead(name)}</p>
            <div className="space-y-4">
              {AXIS_CHAPTERS.map((ch) => {
                const keys = AXES.filter((k) => AXIS_CHAPTER[k] === ch && r.answers?.[k] !== undefined);
                if (!keys.length) return null;
                return (
                  <section key={ch}>
                    <h3 className="mb-1.5 text-xs font-semibold text-violet-800">{CHAPTER_INFO[ch].icon} {CHAPTER_INFO[ch].title[locale]}</h3>
                    <ul className="space-y-1.5">
                      {keys.map((k) => {
                        const v = r.answers![k];
                        // Both sides of the axis, the chosen one lit up (or the middle, for "neither").
                        const side = (on: boolean, text: string) => (
                          <span className={`flex min-h-9 flex-1 items-center justify-center rounded-xl px-2 py-1.5 text-center text-xs leading-snug ${on ? "bg-teal-600 font-semibold text-white shadow-sm" : "bg-stone-50 text-stone-400"}`}>{text}</span>
                        );
                        return (
                          <li key={k} className="flex items-stretch gap-1.5">
                            {side(v === 1, PEER_POLES[k].pos[locale])}
                            <span className={`flex w-10 shrink-0 items-center justify-center rounded-xl text-[10px] ${v === 0 ? "bg-stone-500 font-semibold text-white" : "bg-stone-50 text-stone-300"}`} title={p.neither}>
                              {v === 0 ? "＝" : "・"}
                            </span>
                            {side(v === -1, PEER_POLES[k].neg[locale])}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
            {r.comment && (
              <figure className="mt-5 rounded-2xl bg-linear-to-br from-amber-50 to-rose-50 p-4 ring-1 ring-amber-100">
                <figcaption className="mb-1 text-xs font-semibold text-amber-900">💬 {p.yourComment}</figcaption>
                <blockquote className="emoji-color whitespace-pre-line text-sm leading-6 text-stone-800">{r.comment}</blockquote>
              </figure>
            )}
            <form action={withdrawPeerAction} className="mt-5 border-t border-stone-100 pt-4">
              <input type="hidden" name="requestId" value={r.id} />
              <p className="mb-2 text-xs text-stone-500">{p.withdrawHelp}</p>
              <ConfirmButton message={p.withdrawConfirm} className="min-h-8 px-3 py-1 text-xs">{p.withdraw}</ConfirmButton>
            </form>
          </Card>
        </>
      ) : (
        <Notice kind="info">{p.closed}</Notice>
      )}
    </Page>
  );
}
