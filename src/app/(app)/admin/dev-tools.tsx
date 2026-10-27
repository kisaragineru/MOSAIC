import Link from "next/link";
import { actAsCompanionAction, startTrialAction } from "@/app/actions/auth";
import { companionAnswersAction, companionAsksOwnerAction, companionCommentsAction, companionGroupMessagesAction, companionMessagesAction, companionWritesAction, createCompanionAction, deleteCompanionAction, enrichCompanionAction, reconnectCompanionAction } from "@/app/actions/dev";
import { ConfirmButton } from "@/components/confirm-button";
import { Button, Field, Select } from "@/components/ui";
import type { Dict } from "@/lib/i18n/messages/en";
import { companionAsks, companionConnected, companionPending, listCompanions } from "@/server/services/dev-companion";

/** Development tools (DEV_TOOLS=on, admins only once they're named): trying sign-up, the faces, test companions. */
export async function DevTools({ t, uid }: { t: Dict; uid: string }) {
  const companions = await Promise.all((await listCompanions(uid)).map(async (c) => ({ ...c, pending: await companionPending(c.id), connected: await companionConnected(c.id), asks: (await companionAsks(c.id)).length })));
  const td = t.settings.dev;
  return (
        <section id="dev" className="scroll-mt-20 space-y-3 rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-5">
          <div className="space-y-2 rounded-2xl bg-white p-4" data-testid="trial-start">
            <p className="text-sm font-semibold text-amber-950">🧭 {t.trial.title}</p>
            <p className="text-xs leading-5 text-amber-900">{t.trial.help}</p>
            <form action={startTrialAction}>
              <Button type="submit" className="min-h-9 px-4 py-1.5 text-sm">{t.trial.start} →</Button>
            </form>
          </div>
          <Link href="/settings/faces" className="block rounded-2xl bg-white p-4 text-sm font-semibold text-amber-950 hover:ring-1 hover:ring-amber-300">{td.faces} →</Link>
          <h2 className="font-semibold text-amber-950">🧪 {td.title}</h2>
          <p className="text-xs leading-5 text-amber-900">{td.help}</p>
          {companions.length > 0 && (
            <ul className="space-y-2">
              {companions.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 text-sm">
                  <span className="flex-1 font-medium">{c.name}{!c.connected && <span className="ml-2 text-xs font-normal text-rose-700">{td.ended}</span>}</span>
                  {!c.connected && (
                    <form action={reconnectCompanionAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" className="min-h-8 px-3 py-1 text-xs">🔗 {td.reconnect}</Button>
                    </form>
                  )}
                  <form action={enrichCompanionAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variant="secondary" className="min-h-8 px-3 py-1 text-xs">{c.pending > 0 ? `✨ ${td.enrich(c.pending)}` : `✓ ${td.enriched}`}</Button>
                  </form>
                  {c.asks > 0 && (
                    <form action={companionAnswersAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" className="min-h-8 px-3 py-1 text-xs">💭 {td.answerAsks(c.asks)}</Button>
                    </form>
                  )}
                  {c.connected && (
                    <form action={companionAsksOwnerAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" variant="secondary" className="min-h-8 px-3 py-1 text-xs">🙋 {td.askOwner}</Button>
                    </form>
                  )}
                  {c.connected && (
                    <form action={companionMessagesAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" variant="secondary" className="min-h-8 px-3 py-1 text-xs">✉️ {td.dm}</Button>
                    </form>
                  )}
                  {c.connected && (
                    <form action={companionGroupMessagesAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" variant="secondary" className="min-h-8 px-3 py-1 text-xs">👥 {td.groupDm}</Button>
                    </form>
                  )}
                  {c.connected && (
                    <form action={companionCommentsAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" variant="secondary" className="min-h-8 px-3 py-1 text-xs">💬 {td.comment}</Button>
                    </form>
                  )}
                  <form action={companionWritesAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variant="secondary" className="min-h-8 px-3 py-1 text-xs">✎ {td.write}</Button>
                  </form>
                  <form action={actAsCompanionAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variant="secondary" className="min-h-8 px-3 py-1 text-xs">👤 {td.actAs}</Button>
                  </form>
                  <form action={deleteCompanionAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmButton message={td.deleteConfirm}>{td.delete}</ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {companions.length < 3 && (
            <form action={createCompanionAction} className="flex flex-wrap items-end gap-2">
              <Field label={td.relationship}>
                <Select name="relationship" defaultValue="friend">
                  {(["partner", "family", "friend", "colleague", "other"] as const).map((r) => <option key={r} value={r}>{t.people.relationships[r]}</option>)}
                </Select>
              </Field>
              <Button type="submit">＋ {td.create}</Button>
            </form>
          )}
        </section>
  );
}
