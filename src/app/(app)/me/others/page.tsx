import Link from "next/link";
import { askPeerAction, cancelPeerAction } from "@/app/actions/peers";
import { Flash } from "@/components/flash";
import { Button, Card, Notice, Page, Pill, widthClass } from "@/components/ui";
import { AXIS_LABEL, PEER_POLES } from "@/content/axes";
import type { Window } from "@/lib/johari";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { johari, myPeerRequests } from "@/server/services/peers";
import { listComparisons } from "@/server/services/sharing";

const ORDER: Window[] = ["open", "blind", "hidden", "different"];
const TONE: Record<Window, string> = {
  open: "from-teal-50 to-emerald-50 border-teal-200",
  blind: "from-violet-50 to-sky-50 border-violet-200",
  hidden: "from-amber-50 to-orange-50 border-amber-200",
  different: "from-rose-50 to-pink-50 border-rose-200",
  unknown: "from-stone-50 to-white border-stone-200",
};

/** Ask connected people how they see you, and read their view beside your own. */
export default async function OthersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const p = t.peers;
  const connections = (await listComparisons(uid)).filter((c) => c.status !== "revoked");
  const mine = (await myPeerRequests(uid)).filter((r) => r.role === "owner");
  const { axes, results } = await johari(uid);
  const hasAny = results.responders > 0 || results.anonymous.n > 0;
  const comments = [
    ...results.named.filter((n) => n.comment).map((n) => ({ who: n.name, text: n.comment! })),
    ...results.anonymous.comments.map((c) => ({ who: null, text: c })),
  ];
  return (
    <Page title={p.title} back="/insights">
      <Flash t={t} sp={sp} />
      <p className="text-sm leading-relaxed text-stone-700">{p.intro}</p>
      <p className="text-xs text-stone-500">🔒 {p.howAnon}</p>

      <Card title={p.askTitle}>
        {connections.length === 0 ? (
          <p className="text-sm text-stone-600">
            {p.noConnections} <Link href="/share" className="text-teal-700 underline">{p.connect} →</Link>
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {connections.map((c) => {
              const last = mine.find((r) => r.sessionId === c.id);
              return (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium text-stone-900">{c.otherName}</span>
                    {last && <Pill tone={last.status === "answered" ? "teal" : last.status === "pending" ? "amber" : "stone"}>{p.status[last.status]}</Pill>}
                  </span>
                  {last?.status === "pending" ? (
                    <form action={cancelPeerAction}>
                      <input type="hidden" name="requestId" value={last.id} />
                      <button className="text-xs text-stone-500 underline">{p.cancel}</button>
                    </form>
                  ) : (
                    <form action={askPeerAction}>
                      <input type="hidden" name="sessionId" value={c.id} />
                      <input type="hidden" name="back" value="/me/others" />
                      <Button type="submit" variant={last ? "secondary" : "primary"} className="min-h-8 px-3 py-1 text-xs">{last ? p.askAgain : p.ask}</Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <h2 className="pt-2 text-lg font-semibold text-stone-900">{p.resultsTitle}</h2>
      {results.anonymous.n > 0 && (
        <Notice kind="info">{results.anonymous.counts ? p.anonShown(results.anonymous.n) : p.anonPending(results.anonymous.n)}</Notice>
      )}
      {!hasAny || results.responders === 0 ? (
        <p className="text-sm text-stone-500">{p.noResults}</p>
      ) : (
        <>
          {ORDER.map((w) => {
            const list = axes.filter((a) => a.window === w);
            if (list.length === 0) return null;
            return (
              <section key={w} className={`space-y-3 rounded-3xl border bg-linear-to-br p-4 ${TONE[w]}`}>
                <div>
                  <p className="font-semibold text-stone-900">{p.windows[w].title}</p>
                  <p className="text-xs text-stone-600">{p.windows[w].body}</p>
                </div>
                <ul className="space-y-3">
                  {list.map((a) => {
                    const total = a.counts.pos + a.counts.neutral + a.counts.neg;
                    const lab = AXIS_LABEL[a.key];
                    return (
                      <li key={a.key} className="rounded-2xl bg-white/80 p-3 text-sm">
                        <p className="font-semibold text-stone-900">{lab.name[locale]}</p>
                        <p className="mt-0.5 text-xs text-stone-600">{a.self ? p.selfSays(a.self === 1 ? lab.pos[locale] : lab.neg[locale]) : p.selfNone}</p>
                        {total > 0 && (
                          <>
                            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden>
                              <span className={`h-full bg-teal-500 ${widthClass(a.counts.pos, total)}`} />
                              <span className={`h-full bg-stone-300 ${widthClass(a.counts.neutral, total)}`} />
                              <span className={`h-full bg-rose-400 ${widthClass(a.counts.neg, total)}`} />
                            </div>
                            <p className="mt-1 text-xs text-stone-500">{p.othersSay(PEER_POLES[a.key].pos[locale], a.counts.pos, a.counts.neutral, PEER_POLES[a.key].neg[locale], a.counts.neg)}</p>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {comments.length > 0 && (
            <Card title={p.comments}>
              <ul className="space-y-2">
                {comments.map((c, i) => (
                  <li key={i} className="rounded-2xl bg-stone-50 p-3 text-sm text-stone-800">
                    <p className="whitespace-pre-line">{c.text}</p>
                    {c.who && <p className="mt-1 text-xs text-stone-500">— {c.who}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
