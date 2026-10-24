import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addDateAction,
  addEntryAction,
  addEventAction,
  addGiftAction,
  deletePersonAction,
  deleteRecordAction,
  updatePersonAction,
  updateRecordAction,
} from "@/app/actions/people";
import { linkPersonAction, unlinkPersonAction } from "@/app/actions/sharing";
import { ConfirmButton } from "@/components/confirm-button";
import { ExpandableText } from "@/components/expandable-text";
import { Flash } from "@/components/flash";
import { PreferenceSection } from "@/components/preferences";
import { Button, Card, Field, Input, Notice, Page, Pill, Select, Textarea } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { todayIn } from "@/lib/validation/common";
import { getAccount } from "@/server/services/account";
import { requireUser } from "@/server/auth/session";
import { suggestGifts } from "@/server/services/gifts";
import { getPerson, listCategories, listPeople, nextOccurrence } from "@/server/services/people";
import { connectionForPerson, listComparisons } from "@/server/services/sharing";
import { visibleCount } from "@/server/services/memory-share";
import { mergePeopleAction } from "@/app/actions/people";

const RELS = ["partner", "family", "friend", "colleague", "other"] as const;

function DeleteRecord({ kind, id, back, label }: { kind: string; id: string; back: string; label: string }) {
  return (
    <form action={deleteRecordAction} className="inline">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      <button className="text-xs text-rose-700 underline">{label}</button>
    </form>
  );
}

/** Edit (opens the item's form in place via ?edit=) and delete, side by side. */
function RecordActions({ kind, id, back, t }: { kind: string; id: string; back: string; t: { edit: string; delete: string } }) {
  return (
    <div className="mt-1 flex items-center gap-3">
      <Link href={`${back}?edit=${id}#r-${id}`} scroll={false} className="text-xs text-teal-700 underline">✎ {t.edit}</Link>
      <DeleteRecord kind={kind} id={id} back={back} label={t.delete} />
    </div>
  );
}

function EditForm({ kind, id, personId, back, t, className, children }: { kind: string; id: string; personId: string; back: string; t: { save: string; cancel: string }; className?: string; children: React.ReactNode }) {
  return (
    <form action={updateRecordAction} className={`space-y-2 rounded-xl bg-teal-50/70 p-2 ring-1 ring-teal-200 ${className ?? ""}`}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="personId" value={personId} />
      {children}
      <div className="flex items-center gap-3">
        <Button type="submit">{t.save}</Button>
        <Link href={`${back}#r-${id}`} className="text-sm text-stone-600 underline">{t.cancel}</Link>
      </div>
    </form>
  );
}

export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const data = await getPerson(uid, id).catch(() => null);
  if (!data) notFound();
  const { person, entries, events, gifts, dates, preferences } = data;
  const categories = await listCategories();
  const connection = await connectionForPerson(uid, person.connectionSessionId);
  const circle = (["partner", "family", "friend", "colleague"] as const).find((c) => c === person.relationship) ?? null;
  const seen = connection && connection.status === "active" ? await visibleCount(uid, circle) : null;
  const others = (await listPeople(uid)).filter((p) => p.id !== person.id && !(p.connectionSessionId && person.connectionSessionId));
  const linkable = connection ? [] : (await listComparisons(uid)).filter((c) => c.status !== "revoked" && !c.personId);
  const today = todayIn((await getAccount(uid)).profile.timeZone);
  const fmt = (y: number, m: number, d: number, withYear = true) =>
    new Intl.DateTimeFormat(locale, { ...(withYear ? { year: "numeric" } : {}), month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  const back = `/people/${person.id}`;
  const editing = sp.edit ?? null;
  const acts = { edit: t.common.edit, delete: t.common.delete };
  const formT = { save: t.common.save, cancel: t.common.cancel };
  const showGifts = sp.gifts === "1";
  const ideas = showGifts ? await suggestGifts(uid, person.id, { budget: sp.budget ?? "", currency: sp.currency ?? "" }).catch(() => null) : null;
  return (
    <Page title={person.nickname} back="/people">
      <Flash t={t} sp={sp} />
      <section className="flex items-center gap-3 rounded-3xl bg-white/85 p-4 shadow-sm ring-1 ring-white/80">
        <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-xl font-bold text-teal-900">{Array.from(person.nickname.trim())[0]?.toUpperCase() ?? "?"}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <Pill tone="teal">{t.people.relationships[person.relationship as keyof typeof t.people.relationships] ?? person.relationship}</Pill>
            {connection && connection.status !== "revoked" && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800">🔗 {t.people.connected}</span>}
          </span>
          <span className="mt-1 block text-xs text-stone-500">🔒 {t.people.privateShort}</span>
        </span>
        <a href="#settings" className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:ring-teal-300">⚙️ {t.people.settingsShort}</a>
      </section>
      {connection && connection.status !== "revoked" && (
        // Their page: what they chose to show you (introduction, manual, shared records, side by side).
        <Link href={`/compare/${connection.id}`} className="block rounded-3xl bg-linear-to-br from-rose-50 via-white to-teal-50 p-4 shadow-sm ring-1 ring-teal-100 transition hover:shadow-md">
          <span className="flex items-center gap-3">
            <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-lg font-bold text-rose-900 ring-4 ring-white">{Array.from(connection.otherName.trim())[0]?.toUpperCase() ?? "?"}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-stone-900">{t.people.theirPage(connection.otherName)}</span>
              <span className="block text-xs text-stone-600">{t.people.theirPageSub}</span>
            </span>
            <span aria-hidden className="shrink-0 text-lg text-teal-700">→</span>
          </span>
          {(connection.otherBio || connection.otherIntro) && (
            <span className="mt-3 line-clamp-3 block whitespace-pre-line rounded-2xl bg-white/80 px-3 py-2 text-sm leading-6 text-stone-800">{connection.otherBio || connection.otherIntro}</span>
          )}
        </Link>
      )}
      <Card title={`📝 ${t.people.note}`}>
        {person.note ? <ExpandableText text={person.note} more={t.people.readMore} less={t.people.showLess} /> : <p className="text-sm text-stone-500">{t.people.noteEmpty}</p>}
        <details className="group mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-700 hover:border-teal-300">
            ✎ {t.common.edit}
          </summary>
          <form action={updatePersonAction} className="mt-3 space-y-2">
            <input type="hidden" name="personId" value={person.id} />
            <input type="hidden" name="nickname" value={person.nickname} />
            <input type="hidden" name="relationship" value={person.relationship} />
            <Textarea name="note" defaultValue={person.note ?? ""} rows={6} maxLength={4000} aria-label={t.people.note} />
            <Button type="submit">{t.common.save}</Button>
          </form>
        </details>
      </Card>

      <Card title={t.gifts.title}>
        <p className="mb-2 text-sm text-stone-600">{t.gifts.intro}</p>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="gifts" value="1" />
          <Field label={t.gifts.budget}><Input type="number" name="budget" min={0} defaultValue={sp.budget ?? ""} className="w-32" /></Field>
          <Field label={t.people.currency}><Input name="currency" defaultValue={sp.currency ?? ""} maxLength={3} className="w-20 uppercase" /></Field>
          <Button type="submit">{t.gifts.suggest}</Button>
        </form>
        {ideas && (
          <div className="mt-3 space-y-3" data-testid="gift-ideas">
            {ideas.nextOccasion && <Notice>{t.gifts.nextOccasion(ideas.nextOccasion.label, ideas.nextOccasion.date, t.home.inDays(ideas.nextOccasion.daysUntil))}</Notice>}
            {ideas.budget && <Notice kind="warning">{ideas.budget.note[locale]}</Notice>}
            {ideas.candidates.length === 0 ? (
              <Notice kind="warning">{t.gifts.none}</Notice>
            ) : (
              <ol className="space-y-2">
                {ideas.candidates.map((c, i) => (
                  <li key={i} className="rounded-xl border border-stone-200 p-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <Pill tone={c.strength === "strong" ? "teal" : c.strength === "moderate" ? "stone" : "amber"}>{t.gifts.strength[c.strength]}</Pill>
                      <span className="font-medium">{c.idea[locale]}</span>
                    </div>
                    <p className="text-sm text-stone-700">{c.reason[locale]}</p>
                    <p className="text-xs text-stone-500">{t.gifts.evidence}: {c.evidence.map((e) => (e.sentiment ? `${e.label} (${t.people.sentiments[e.sentiment as keyof typeof t.people.sentiments] ?? e.sentiment})` : e.label)).join("; ")}</p>
                    {c.caveats.map((cv, j) => <p key={j} className="text-xs text-amber-800">⚠ {cv[locale]}</p>)}
                  </li>
                ))}
              </ol>
            )}
            {ideas.avoid.length > 0 && <p className="text-sm"><b>{t.gifts.avoid}:</b> {ideas.avoid.map((a) => a.label).join(", ")}</p>}
            {ideas.alreadyGiven.length > 0 && <p className="text-sm"><b>{t.gifts.alreadyGiven}:</b> {ideas.alreadyGiven.join(", ")}</p>}
            {ideas.questionsToAsk.length > 0 && (
              <div>
                <p className="text-sm font-medium">{t.gifts.questions}</p>
                <ul className="list-disc pl-5 text-sm text-stone-700">{ideas.questionsToAsk.map((q, i) => <li key={i}>{q[locale]}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title={t.people.preferences}>
        <PreferenceSection t={t} locale={locale} prefs={preferences} categories={categories} personId={person.id} back={back} editing={editing} />
      </Card>

      <Card title={t.people.notes}>
        <form action={addEntryAction} className="space-y-2 rounded-xl bg-stone-50 p-2">
          <input type="hidden" name="personId" value={person.id} />
          <div className="grid grid-cols-2 gap-2">
            <Select name="kind" defaultValue="conversation" aria-label={t.people.notes}>
              {(["conversation", "joy", "wish_together", "note"] as const).map((k) => <option key={k} value={k}>{t.people.entryKinds[k]}</option>)}
            </Select>
            <Select name="source" defaultValue="person_stated" aria-label={t.people.sourceLabel}>
              {(["person_stated", "observed", "guess", "unverified"] as const).map((s) => <option key={s} value={s}>{t.people.sources[s]}</option>)}
            </Select>
          </div>
          <Textarea name="body" required rows={2} maxLength={5000} aria-label={t.people.note} />
          <Input type="date" name="occurredOn" aria-label={t.common.date} />
          <Button type="submit">{t.common.add}</Button>
        </form>
        <ul className="mt-3 space-y-2">
          {entries.map((e) => (
            <li key={e.id} id={`r-${e.id}`} className="scroll-mt-24 rounded-xl border border-stone-200 p-2 text-sm">
              {editing === e.id ? (
                <EditForm kind="entry" id={e.id} personId={person.id} back={back} t={formT}>
                  <div className="grid grid-cols-2 gap-2">
                    <Select name="entryKind" defaultValue={e.kind} aria-label={t.people.notes}>
                      {(["conversation", "joy", "wish_together", "note"] as const).map((k) => <option key={k} value={k}>{t.people.entryKinds[k]}</option>)}
                    </Select>
                    <Select name="source" defaultValue={e.source} aria-label={t.people.sourceLabel}>
                      {(["person_stated", "observed", "guess", "unverified"] as const).map((x) => <option key={x} value={x}>{t.people.sources[x]}</option>)}
                    </Select>
                  </div>
                  <Textarea name="body" required rows={3} maxLength={5000} defaultValue={e.body} aria-label={t.people.note} />
                  <Input type="date" name="occurredOn" defaultValue={e.occurredOn ?? ""} aria-label={t.common.date} />
                </EditForm>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1">
                    <Pill>{t.people.entryKinds[e.kind as keyof typeof t.people.entryKinds]}</Pill>
                    <Pill tone="amber">{t.people.sources[e.source as keyof typeof t.people.sources]}</Pill>
                    {e.occurredOn && <span className="text-xs text-stone-500">{e.occurredOn}</span>}
                  </div>
                  <p className="mt-1 whitespace-pre-line">{e.body}</p>
                  <RecordActions kind="entry" id={e.id} back={back} t={acts} />
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t.people.events}>
        <form action={addEventAction} className="space-y-2 rounded-xl bg-stone-50 p-2">
          <input type="hidden" name="personId" value={person.id} />
          <Field label={t.people.eventTitle}><Input name="title" required maxLength={200} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t.people.place}><Input name="place" maxLength={200} /></Field>
            <Field label={t.common.date}><Input type="date" name="occurredOn" /></Field>
          </div>
          <Textarea name="description" rows={2} maxLength={5000} aria-label={t.people.note} />
          <Button type="submit">{t.common.add}</Button>
        </form>
        <ul className="mt-3 space-y-2">
          {events.map((e) => (
            <li key={e.id} id={`r-${e.id}`} className="scroll-mt-24 rounded-xl border border-stone-200 p-2 text-sm">
              {editing === e.id ? (
                <EditForm kind="event" id={e.id} personId={person.id} back={back} t={formT}>
                  <Field label={t.people.eventTitle}><Input name="title" required maxLength={200} defaultValue={e.title} /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t.people.place}><Input name="place" maxLength={200} defaultValue={e.place ?? ""} /></Field>
                    <Field label={t.common.date}><Input type="date" name="occurredOn" defaultValue={e.occurredOn ?? ""} /></Field>
                  </div>
                  <Textarea name="description" rows={3} maxLength={5000} defaultValue={e.description ?? ""} aria-label={t.people.note} />
                </EditForm>
              ) : (
                <>
                  <b>{e.title}</b>{e.place && ` · ${e.place}`}{e.occurredOn && ` · ${e.occurredOn}`}
                  {e.description && <p className="whitespace-pre-line text-stone-600">{e.description}</p>}
                  <RecordActions kind="event" id={e.id} back={back} t={acts} />
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t.people.gifts}>
        <form action={addGiftAction} className="grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-2">
          <input type="hidden" name="personId" value={person.id} />
          <div className="col-span-2"><Field label={t.people.giftItem}><Input name="item" required maxLength={200} /></Field></div>
          <Field label={t.people.occasion}><Input name="occasion" maxLength={120} /></Field>
          <Field label={t.people.givenOn}><Input type="date" name="givenOn" /></Field>
          <Field label={t.people.price}><Input type="number" name="priceAmount" min={0} /></Field>
          <Field label={t.people.currency}><Input name="priceCurrency" maxLength={3} /></Field>
          <div className="col-span-2">
            <Field label={t.people.reaction}>
              <Select name="reaction" defaultValue="unknown">
                {(["loved", "liked", "neutral", "disliked", "unknown"] as const).map((r) => <option key={r} value={r}>{t.people.reactions[r]}</option>)}
              </Select>
            </Field>
          </div>
          <div className="col-span-2"><Button type="submit">{t.common.add}</Button></div>
        </form>
        <ul className="mt-3 space-y-2 text-sm">
          {gifts.map((g) => (
            <li key={g.id} id={`r-${g.id}`} className="scroll-mt-24 rounded-xl border border-stone-200 p-2">
              {editing === g.id ? (
                <EditForm kind="gift" id={g.id} personId={person.id} back={back} t={formT}>
                  <Field label={t.people.giftItem}><Input name="item" required maxLength={200} defaultValue={g.item} /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t.people.occasion}><Input name="occasion" maxLength={120} defaultValue={g.occasion ?? ""} /></Field>
                    <Field label={t.people.givenOn}><Input type="date" name="givenOn" defaultValue={g.givenOn ?? ""} /></Field>
                    <Field label={t.people.price}><Input type="number" name="priceAmount" min={0} defaultValue={g.priceAmount ?? ""} /></Field>
                    <Field label={t.people.currency}><Input name="priceCurrency" maxLength={3} defaultValue={g.priceCurrency ?? ""} /></Field>
                  </div>
                  <Field label={t.people.reaction}>
                    <Select name="reaction" defaultValue={g.reaction}>
                      {(["loved", "liked", "neutral", "disliked", "unknown"] as const).map((r) => <option key={r} value={r}>{t.people.reactions[r]}</option>)}
                    </Select>
                  </Field>
                </EditForm>
              ) : (
                <>
                  🎁 <b>{g.item}</b>{g.occasion && ` · ${g.occasion}`}{g.givenOn && ` · ${g.givenOn}`}
                  {g.priceAmount !== null && ` · ${g.priceAmount.toLocaleString(locale)} ${g.priceCurrency ?? ""}`} · {t.people.reactions[g.reaction as keyof typeof t.people.reactions]}
                  <RecordActions kind="gift" id={g.id} back={back} t={acts} />
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t.people.dates}>
        <form action={addDateAction} className="grid grid-cols-3 gap-2 rounded-xl bg-stone-50 p-2">
          <input type="hidden" name="personId" value={person.id} />
          <div className="col-span-2"><Field label={t.people.dateLabel}><Input name="label" required maxLength={120} /></Field></div>
          <Field label={t.people.dateKind}>
            <Select name="kind" defaultValue="birthday">
              {(["birthday", "anniversary", "custom"] as const).map((k) => <option key={k} value={k}>{t.people.dateKinds[k]}</option>)}
            </Select>
          </Field>
          <Field label={t.people.day}><Input type="number" name="day" min={1} max={31} required /></Field>
          <Field label={t.people.month}><Input type="number" name="month" min={1} max={12} required /></Field>
          <Field label={t.people.year}><Input type="number" name="year" min={1900} max={2200} /></Field>
          <div className="col-span-3"><Field label={t.people.remind}><Input type="number" name="remindDaysBefore" min={0} max={60} /></Field><p className="mt-1 text-xs text-stone-500">{t.people.remindHelp}</p></div>
          <div className="col-span-3"><Button type="submit">{t.common.add}</Button></div>
        </form>
        <ul className="mt-3 space-y-1 text-sm">
          {dates.map((d) => {
            const next = nextOccurrence(d.month, d.day, today);
            const [ny, nm, nd] = next.date.split("-").map(Number) as [number, number, number];
            return (
              <li key={d.id} id={`r-${d.id}`} className="scroll-mt-24 rounded-xl border border-stone-200 p-2">
                {editing === d.id ? (
                  <EditForm kind="date" id={d.id} personId={person.id} back={back} t={formT}>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2"><Field label={t.people.dateLabel}><Input name="label" required maxLength={120} defaultValue={d.label} /></Field></div>
                      <Field label={t.people.dateKind}>
                        <Select name="dateKind" defaultValue={d.kind}>
                          {(["birthday", "anniversary", "custom"] as const).map((k) => <option key={k} value={k}>{t.people.dateKinds[k]}</option>)}
                        </Select>
                      </Field>
                      <Field label={t.people.day}><Input type="number" name="day" min={1} max={31} required defaultValue={d.day} /></Field>
                      <Field label={t.people.month}><Input type="number" name="month" min={1} max={12} required defaultValue={d.month} /></Field>
                      <Field label={t.people.year}><Input type="number" name="year" min={1900} max={2200} defaultValue={d.year ?? ""} /></Field>
                    </div>
                    <Field label={t.people.remind}><Input type="number" name="remindDaysBefore" min={0} max={60} defaultValue={d.remindDaysBefore ?? ""} /></Field>
                  </EditForm>
                ) : (
                <>
                <div className="flex flex-wrap items-center gap-1">
                  <Pill>{t.people.dateKinds[d.kind as keyof typeof t.people.dateKinds]}</Pill>
                  <span className="font-medium">{d.label}</span>
                  <span className="text-xs text-stone-500">· {fmt(d.year ?? 2000, d.month, d.day, d.year !== null)}</span>
                </div>
                <p className="mt-1 text-stone-800">
                  📅 {t.people.nextOn(fmt(ny, nm, nd), t.home.inDays(next.daysUntil))}
                  {d.year !== null && d.kind !== "custom" && ` · ${t.people.turns(next.year - d.year, d.kind === "birthday")}`}
                </p>
                {d.remindDaysBefore !== null && <p className="text-xs text-stone-600">🔔 {t.people.remindAt(d.remindDaysBefore)}</p>}
                <RecordActions kind="date" id={d.id} back={back} t={acts} />
                </>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Link href={`/insights?kind=relationship&personId=${person.id}`} className="block text-sm text-teal-700 underline">{t.insights.reflections} →</Link>

      {/* Everything you decide about this person, in one place. */}
      <section id="settings" className="scroll-mt-20 space-y-3">
        <h2 className="px-1 text-base font-bold text-stone-900">⚙️ {t.people.settingsTitle(person.nickname)}</h2>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200/70">
          <h3 className="mb-2 text-sm font-semibold text-stone-800">👤 {t.people.basics}</h3>
          <form action={updatePersonAction} className="space-y-2">
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
                {connection.status !== "revoked" && (
                  <Link href={`/compare/${connection.id}#settings`} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 ring-1 ring-stone-200 hover:ring-teal-300">{t.people.connectionSettings} →</Link>
                )}
                <form action={unlinkPersonAction}>
                  <input type="hidden" name="personId" value={person.id} />
                  <button className="rounded-full bg-white px-3 py-1.5 text-xs text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300">{t.people.unlink}</button>
                </form>
              </div>
            </div>
          ) : linkable.length > 0 ? (
            <div>
              <p className="mb-2 text-xs text-stone-600">{t.people.linkHelp}</p>
              <form action={linkPersonAction} className="flex gap-2">
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

        {others.length > 0 && (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200/70 text-sm">
            <h3 className="mb-1 text-sm font-semibold text-stone-800">🔀 {t.people.mergeTitle}</h3>
            <p className="mb-2 text-xs leading-5 text-stone-600">{t.people.mergeHelp}</p>
            <form action={mergePeopleAction} className="flex flex-wrap gap-2">
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
