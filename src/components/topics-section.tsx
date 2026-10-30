import Link from "next/link";
import { dmOpenForConnectionAction } from "@/app/actions/dm";
import { answerTopicAction, cancelTopicAction, passTopicAction, sendTopicAction } from "@/app/actions/topics";
import { TOPICS, type TopicKey } from "@/content/topics";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import { TOPIC_LIMIT, type TopicView } from "@/server/services/topics";
import { ConfirmButton } from "./confirm-button";
import { Button, Card, Input, Select, Textarea } from "./ui";

/**
 * Topics on our connection page: send one with my answer, answer or pass on one sent to me, and
 * the two answers side by side once we've both answered (a way into a conversation).
 */
export function TopicsSection({ t, locale, sessionId, otherName, topics, back }: { t: Dict; locale: Locale; sessionId: string; otherName: string; topics: TopicView[]; back: string }) {
  const tt = t.topics;
  const waitingFromMe = topics.filter((x) => x.sent && x.status === "open").length;
  const hidden = (
    <>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="back" value={back} />
    </>
  );
  const answerBox = (label: string) => <Textarea name="answer" required rows={3} maxLength={4000} placeholder={tt.answerPlaceholder} aria-label={label} />;
  return (
    <div id="topics" className="scroll-mt-20">
      <Card title={`🗨️ ${tt.title}`}>
        <p className="mb-3 text-xs leading-5 text-stone-600">{tt.help(otherName)}</p>
        <ul className="space-y-3" data-testid="topics">
          {topics.map((x) => (
            <li key={x.id} className="rounded-2xl border border-stone-200 bg-white/80 p-3" data-testid="topic">
              <p className="text-[11px] font-semibold text-stone-500">{x.sent ? tt.sent : tt.received(otherName)}</p>
              <p className="emoji-color mt-0.5 font-bold text-stone-900">#{x.prompt}</p>
              {x.status === "answered" ? (
                <div className="mt-2 space-y-2" data-testid="topic-matched">
                  <p className="text-xs font-semibold text-violet-700">✨ {tt.matched}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { who: tt.you, body: x.myBody },
                      { who: otherName, body: x.theirBody },
                    ].map((a) => (
                      <div key={a.who} className="rounded-xl bg-violet-50/70 p-2.5">
                        <p className="text-[11px] font-semibold text-violet-800">{a.who}</p>
                        <p className="emoji-color whitespace-pre-wrap text-sm text-stone-800">{a.body ?? tt.gone}</p>
                      </div>
                    ))}
                  </div>
                  <form action={dmOpenForConnectionAction}>
                    {hidden}
                    <input type="hidden" name="draft" value={`#${x.prompt} `} />
                    <button type="submit" className="text-sm font-semibold text-teal-700 underline underline-offset-4">💬 {tt.talk} →</button>
                  </form>
                </div>
              ) : x.status === "passed" ? (
                <p className="mt-1 text-sm text-stone-600">{x.sent ? tt.passedByThem(otherName) : tt.passedByMe}</p>
              ) : x.sent ? (
                <div className="mt-2 space-y-2">
                  {x.myBody && <p className="emoji-color whitespace-pre-wrap rounded-xl bg-stone-50 p-2.5 text-sm text-stone-700"><span className="block text-[11px] font-semibold text-stone-500">{tt.you}</span>{x.myBody}</p>}
                  <p className="text-xs text-amber-800">⏳ {tt.waiting(otherName)}</p>
                  <form action={cancelTopicAction}>
                    {hidden}
                    <input type="hidden" name="promptId" value={x.id} />
                    <ConfirmButton message={tt.cancelConfirm} quiet>{tt.cancel}</ConfirmButton>
                  </form>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <form action={answerTopicAction} className="space-y-2">
                    {hidden}
                    <input type="hidden" name="promptId" value={x.id} />
                    {answerBox(tt.myAnswer)}
                    <Button type="submit">{tt.answer}</Button>
                  </form>
                  <form action={passTopicAction}>
                    {hidden}
                    <input type="hidden" name="promptId" value={x.id} />
                    <ConfirmButton message={tt.passConfirm} quiet>{tt.pass}</ConfirmButton>
                  </form>
                </div>
              )}
              {x.myEntry && <Link href={`/memories/${x.myEntry}`} className="mt-2 inline-block text-[11px] text-stone-500 underline">{t.recordsAudience.open} →</Link>}
            </li>
          ))}
        </ul>
        {waitingFromMe >= TOPIC_LIMIT ? (
          <p className="mt-3 rounded-xl bg-amber-50 p-2.5 text-sm text-amber-900">{tt.limit(otherName)}</p>
        ) : (
          <form action={sendTopicAction} className="mt-4 space-y-2 border-t border-stone-100 pt-3" data-testid="topic-send">
            {hidden}
            <label className="block text-sm font-medium text-stone-700">
              {tt.pick}
              <Select name="preset" defaultValue={Object.keys(TOPICS)[0]} className="mt-1">
                {(Object.keys(TOPICS) as TopicKey[]).map((k) => <option key={k} value={k}>{TOPICS[k][locale]}</option>)}
                <option value="">✏️ {tt.own}</option>
              </Select>
            </label>
            <label className="block text-sm font-medium text-stone-700">
              {tt.ownLabel}
              <Input name="prompt" maxLength={80} placeholder={tt.ownPlaceholder} className="mt-1" />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              {tt.myAnswer}
              <div className="mt-1">{answerBox(tt.myAnswer)}</div>
            </label>
            <Button type="submit">{tt.send}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
