import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePersonAction, mergePeopleAction, updatePersonAction } from "@/app/actions/people";
import { linkPersonAction, unlinkPersonAction } from "@/app/actions/sharing";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { Button, Field, Input, Select } from "@/components/ui";
import { Page } from "@/components/page";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { visibleCount } from "@/server/services/memory-share";
import { getPerson, listPeople } from "@/server/services/people";
import { connectionForPerson, getComparison, listComparisons } from "@/server/services/sharing";
import { myManualShare } from "@/server/services/manual-share";
import { ConnectionSettings } from "@/components/connection-settings";

const RELS = ["partner", "family", "friend", "colleague", "other"] as const;

/** Everything you decide about one person, on its own page (reached from their panel or page). */
export default async function PersonSettingsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const data = await getPerson(uid, id).catch(() => null);
  if (!data) notFound();
  const { person } = data;
  const connection = await connectionForPerson(uid, person.connectionSessionId);
  const circle = (["partner", "family", "friend", "colleague"] as const).find((c) => c === person.relationship) ?? null;
  const seen = connection && connection.status === "active" ? await visibleCount(uid, circle) : null;
  const others = (await listPeople(uid)).filter((p) => p.id !== person.id && !(p.connectionSessionId && person.connectionSessionId));
  const linkable = connection ? [] : (await listComparisons(uid)).filter((c) => c.status !== "revoked" && !c.personId);
  const here = `/people/${person.id}/settings`;
  const view = connection && connection.status !== "revoked" ? await getComparison(uid, connection.id).catch(() => null) : null;
  const myShare = view ? await myManualShare(uid, view.id) : null;
  return (
    <Page title={t.people.settingsTitle(person.nickname)} back={`/people/${person.id}`}>
      <Flash t={t} sp={sp} />
      <section className="space-y-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200/70">
          <h3 className="mb-2 text-sm font-semibold text-stone-800">👤 {t.people.basics}</h3>
          <form action={updatePersonAction} className="space-y-2">
              <input type="hidden" name="back" value={here} />
            <input type="hidden" name="personId" value={person.id} />
            <input type="hidden" name="note" value={person.note ?? ""} />
            <div className="grid grid-cols-2 gap-2">
              <Field label={t.people.nickname}><Input name="nickname" defaultValue={person.nickname} required maxLength={80} /></Field>
              <Field label={t.people.relationship}>
                <Select name="relationship" defaultValue={person.relationship}>
                  {RELS.map((r) => <option key={r} value={r}>{t.people.relationships[r]}</option>)}
                </Select>
              </Field>
            </div>
            {connection && connection.status !== "revoked" && <p className="text-xs leading-5 text-stone-500">{t.people.relationshipShares}</p>}
            <Button type="submit" variant="secondary">{t.common.save}</Button>
          </form>
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200/70 text-sm">
          <h3 className="mb-2 text-sm font-semibold text-stone-800">🔗 {t.people.connectionTitle}</h3>
          {connection ? (
            <div className="space-y-2">
              <p className="font-medium text-teal-900">{connection.status === "revoked" ? t.people.connectionEndedTitle(connection.otherName) : t.people.connectionCard(connection.otherName)}</p>
              {connection.status === "revoked" && <p className="text-stone-600">{t.people.connectionEnded}</p>}
              {seen !== null && (
                <p className="rounded-xl bg-teal-50/70 px-3 py-2 text-stone-700">
                  📖 {t.people.circleSeen(seen)}
                  {!circle && <span className="mt-1 block text-xs text-stone-500">{person.relationship === "other" ? t.people.circleOther : t.people.circleNone}</span>}
                </p>
              )}
              <p className="text-xs text-stone-500">🔒 {t.people.connectionPrivate}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <form action={unlinkPersonAction}>
              <input type="hidden" name="back" value={here} />
                  <input type="hidden" name="personId" value={person.id} />
                  <button className="rounded-full bg-white px-3 py-1.5 text-xs text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300">{t.people.unlink}</button>
                </form>
              </div>
            </div>
          ) : linkable.length > 0 ? (
            <div>
              <p className="mb-2 text-xs text-stone-600">{t.people.linkHelp}</p>
              <form action={linkPersonAction} className="flex gap-2">
              <input type="hidden" name="back" value={here} />
                <input type="hidden" name="personId" value={person.id} />
                <Select name="sessionId" aria-label={t.people.linkTitle} className="flex-1">
                  {linkable.map((c) => <option key={c.id} value={c.id}>{c.otherName}</option>)}
                </Select>
                <Button type="submit">{t.people.link}</Button>
              </form>
            </div>
          ) : (
            <p className="text-xs leading-5 text-stone-500">{t.people.notConnected}</p>
          )}
        </div>

        {view && <ConnectionSettings t={t} locale={locale} v={view} myShare={myShare} back={here} />}

        {others.length > 0 && (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200/70 text-sm">
            <h3 className="mb-1 text-sm font-semibold text-stone-800">🔀 {t.people.mergeTitle}</h3>
            <p className="mb-2 text-xs leading-5 text-stone-600">{t.people.mergeHelp}</p>
            <form action={mergePeopleAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="back" value={here} />
              <input type="hidden" name="targetId" value={person.id} />
              <Select name="sourceId" aria-label={t.people.mergeTitle} className="flex-1">
                {others.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
              </Select>
              <ConfirmButton message={t.people.mergeConfirm}>{t.people.mergeButton}</ConfirmButton>
            </form>
          </div>
        )}

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-sm">
          <h3 className="mb-1 text-sm font-semibold text-rose-900">🗑 {t.people.dangerTitle}</h3>
          <p className="mb-2 text-xs leading-5 text-rose-900/80">{t.people.dangerHelp}</p>
          <form action={deletePersonAction}>
            <input type="hidden" name="personId" value={person.id} />
            <ConfirmButton message={t.common.confirmDelete}>{t.people.deletePerson}</ConfirmButton>
          </form>
        </div>
      </section>
    </Page>
  );
}
