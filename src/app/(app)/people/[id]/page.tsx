import { DateSelect } from "@/components/date-select";
import { dateText } from "@/lib/i18n/date-text";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addDateAction,
  addEntryAction,
  addEventAction,
  addGiftAction,
  deleteRecordAction,
  giftIdeasAction,
  updatePersonAction,
  updateRecordAction,
} from "@/app/actions/people";
import { AGE_BANDS, GENDERS } from "@/content/gift-general";
import { ExpandableText } from "@/components/expandable-text";
import { Flash } from "@/components/flash";
import { PreferenceSection } from "@/components/preferences";
import { Button, Card, Field, Input, Notice, Pill, Select, Textarea } from "@/components/ui";
import { Page } from "@/components/page";
import { getT } from "@/lib/i18n/server";
import { todayIn } from "@/lib/validation/common";
import { getAccount } from "@/server/services/account";
import { pairSummary } from "@/server/services/pair-history";
import { requireUser } from "@/server/auth/session";
import { dmOpenForConnectionAction } from "@/app/actions/dm";
import { Avatar } from "@/components/avatar";
import { avatarUrls } from "@/server/services/avatars";
import { normalizeCurrency, suggestGifts } from "@/server/services/gifts";
import { getPerson, listCategories, nextOccurrence } from "@/server/services/people";
import { connectionForPerson, getComparison } from "@/server/services/sharing";
import { myTint, typeTints } from "@/server/services/card";

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
  const today = todayIn((await getAccount(uid)).profile.timeZone);
  const together = connection?.status === "active" ? await pairSummary(uid, connection.id, (await getAccount(uid)).profile.timeZone) : null;
  const fmt = (y: number, m: number, d: number, withYear = true) =>
    new Intl.DateTimeFormat(locale, { ...(withYear ? { year: "numeric" } : {}), month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  const back = `/people/${person.id}`;
  const editing = sp.edit ?? null;
  const acts = { edit: t.common.edit, delete: t.common.delete };
  const formT = { save: t.common.save, cancel: t.common.cancel };
  const showGifts = sp.gifts === "1";
  const giftResult = showGifts
    ? await suggestGifts(uid, person.id, { budget: sp.budget ?? "", currency: sp.currency ?? "" }).then((v) => ({ v }), () => ({ v: null }))
    : null;
  const ideas = giftResult?.v ?? null;
  const currency = normalizeCurrency(sp.currency) ?? (locale === "ja" ? "JPY" : locale === "vi" ? "VND" : "");
  // A birthday with a year gives the age, so the age group isn't asked for.
  // Connected (or waiting to be): their face, words and page come with it.
  const live = connection && connection.status !== "revoked" ? connection : null;
  // Not agreed by both yet: whether it's my turn (on our page) or theirs.
  const myTurn = live?.status === "pending" ? !(await getComparison(uid, live.id)).myConsent : false;
  const pic = live ? ((await avatarUrls(uid, [live.otherId])).get(live.otherId ?? "") ?? null) : null;
  const tint = live ? ((await typeTints(uid, [live.otherId])).get(live.otherId ?? "") ?? null) : null;
  const born = dates.find((d) => d.kind === "birthday" && d.year !== null);
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  const birthAge = born ? ty - born.year! - (tm < born.month || (tm === born.month && td < born.day) ? 1 : 0) : null;
  return (
    <Page
      title={person.nickname}
      back="/people"
      actions={
        <Link href={`/people/${person.id}/settings`} aria-label={t.people.settingsTitle(person.nickname)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg ring-1 ring-stone-200 hover:ring-teal-300">
          <span aria-hidden>⚙️</span>
        </Link>
      }
    >
      <Flash t={t} sp={sp} />
      {/* Who they are, at a glance: face, relationship, your time together, their words; then the two things to do. */}
      <section className="rounded-3xl bg-linear-to-br from-rose-50 via-white to-teal-50 p-4 shadow-sm ring-1 ring-teal-100" data-testid="person-hero">
        {live && <p className="mb-3 text-[11px] font-semibold tracking-wide text-teal-800">🤝 {t.people.sharedZone(live.otherName)}</p>}
        <div className="flex items-center gap-4">
          <Avatar name={person.nickname} src={live ? pic : null} type={live ? tint : null} className="h-16 w-16 shrink-0 text-2xl ring-4 ring-white" />
          <div className="min-w-0 flex-1 space-y-1">
            <Pill tone="teal">{t.people.relationships[person.relationship as (typeof RELS)[number]] ?? person.relationship}</Pill>
            {together && <p className="text-xs font-semibold text-teal-800" data-testid="pair-line">🌱 {t.pair.personLine(together.days, together.messages)}</p>}
            {!live && connection?.status === "revoked" && (
              <div data-testid="person-ended">
                <p className="text-xs font-semibold text-stone-600">🕊 {t.people.endedOn(connection.revokedAt ? fmt(connection.revokedAt.getUTCFullYear(), connection.revokedAt.getUTCMonth() + 1, connection.revokedAt.getUTCDate()) : "")}</p>
                <p className="text-[11px] leading-4 text-stone-500">{t.people.endedNote}</p>
              </div>
            )}
            {!live && connection?.status !== "revoked" && <p className="text-xs text-stone-500">{t.people.notConnectedYet}</p>}
          </div>
        </div>
        {live && (live.otherBio || live.otherIntro) && (
          <div className="mt-3 rounded-2xl bg-white/80 px-3 py-2" data-testid="person-bio">
            <ExpandableText text={live.otherBio || live.otherIntro || ""} more={t.people.readMore} less={t.people.showLess} lines={3} />
          </div>
        )}
        {live && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {live.status === "active" ? (
              <form action={dmOpenForConnectionAction}>
                <input type="hidden" name="sessionId" value={live.id} />
                <input type="hidden" name="back" value={`/people/${person.id}`} />
                <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-teal-700 px-3 text-sm font-bold text-white shadow-md transition hover:bg-teal-800 active:scale-[0.98]">
                  {t.messages.message}
                </button>
              </form>
            ) : myTurn ? (
              <Link href={`/compare/${live.id}#consent`} className="flex min-h-12 items-center justify-center rounded-full bg-amber-100 px-3 text-center text-xs font-bold leading-4 text-amber-950 ring-1 ring-amber-300" data-testid="person-connect">
                {t.people.connectToMessage}
              </Link>
            ) : (
              <p className="flex min-h-12 items-center justify-center rounded-full bg-amber-50 px-3 text-center text-xs font-semibold leading-4 text-amber-900 ring-1 ring-amber-200" data-testid="person-waiting">
                ⏳ {t.people.waitingFor(live.otherName)}
              </p>
            )}
            <Link href={`/compare/${live.id}`} className="flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-sm font-bold text-teal-800 ring-1 ring-teal-200 transition hover:ring-teal-400">
              📖 {t.people.theirPage(live.otherName)}
            </Link>
          </div>
        )}
        {live && <p className="mt-2 text-center text-[11px] leading-4 text-stone-500">{t.people.theirPageSub}</p>}
      </section>
      {/* Below: the user's own notebook about this person, never shown to them. */}
      <div role="region" aria-labelledby="notebook-title" className="space-y-4 rounded-[2rem] bg-amber-50/60 p-3 ring-1 ring-amber-200/70" data-testid="notebook">
        <div className="flex gap-3 px-2 pt-2">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl">📒</span>
          <div className="min-w-0">
            <h2 id="notebook-title" className="text-base font-bold text-amber-950">{t.people.notebookTitle(person.nickname)}</h2>
            <p className="mt-0.5 text-xs leading-5 text-amber-900/80">{t.people.notebookHelp(person.nickname)}</p>
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">🔒 {connection && connection.status !== "revoked" ? t.people.notebookPrivate(person.nickname) : t.people.notebookPrivateSolo}</p>
          </div>
        </div>
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
          <DateSelect label={t.common.date} hideLabel name="occurredOn" text={dateText(t)} />
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
                  <DateSelect label={t.common.date} hideLabel name="occurredOn" text={dateText(t)} defaultValue={e.occurredOn ?? ""} />
                </EditForm>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1">
                    <Pill>{t.people.entryKinds[e.kind as keyof typeof t.people.entryKinds]}</Pill>
                    <Pill tone="amber">{t.people.sources[e.source as keyof typeof t.people.sources]}</Pill>
                    {e.occurredOn && <span className="text-xs text-stone-500">{e.occurredOn}</span>}
                  </div>
                  <p className="emoji-color mt-1 whitespace-pre-line">{e.body}</p>
                  <RecordActions kind="entry" id={e.id} back={back} t={acts} />
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t.people.preferences}>
        <PreferenceSection t={t} locale={locale} prefs={preferences} categories={categories} personId={person.id} back={back} editing={editing} />
      </Card>

      <Card title={t.people.events}>
        <form action={addEventAction} className="space-y-2 rounded-xl bg-stone-50 p-2">
          <input type="hidden" name="personId" value={person.id} />
          <Field label={t.people.eventTitle}><Input name="title" required maxLength={200} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t.people.place}><Input name="place" maxLength={200} /></Field>
            <div className="col-span-2"><DateSelect label={t.common.date} name="occurredOn" text={dateText(t)} /></div>
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
                    <div className="col-span-2"><DateSelect label={t.common.date} name="occurredOn" text={dateText(t)} defaultValue={e.occurredOn ?? ""} /></div>
                  </div>
                  <Textarea name="description" rows={3} maxLength={5000} defaultValue={e.description ?? ""} aria-label={t.people.note} />
                </EditForm>
              ) : (
                <>
                  <b>{e.title}</b>{e.place && ` · ${e.place}`}{e.occurredOn && ` · ${e.occurredOn}`}
                  {e.description && <p className="emoji-color whitespace-pre-line text-stone-600">{e.description}</p>}
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
          <div className="col-span-2"><DateSelect label={t.people.givenOn} name="givenOn" text={dateText(t)} /></div>
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
                    <div className="col-span-2"><DateSelect label={t.people.givenOn} name="givenOn" text={dateText(t)} defaultValue={g.givenOn ?? ""} /></div>
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

      <Card title={t.gifts.title}>
        <p className="mb-2 text-sm text-stone-600">{t.gifts.intro}</p>
        <form action={giftIdeasAction} id="gifts" className="flex scroll-mt-24 flex-wrap items-end gap-2">
          <input type="hidden" name="personId" value={person.id} />
          {birthAge !== null ? (
            <p className="w-full text-sm text-stone-700">🎂 {t.gifts.ageFromBirthday(birthAge)}</p>
          ) : (
            <Field label={t.gifts.ageBand}>
              <Select name="ageBand" defaultValue={person.ageBand ?? ""} className="w-32">
                <option value="">{t.gifts.notSet}</option>
                {AGE_BANDS.map((a) => <option key={a} value={a}>{t.gifts.ages[a]}</option>)}
              </Select>
            </Field>
          )}
          <Field label={t.gifts.gender}>
            <Select name="gender" defaultValue={person.gender ?? ""} className="w-40">
              <option value="">{t.gifts.notSet}</option>
              {GENDERS.map((g) => <option key={g} value={g}>{t.gifts.genders[g]}</option>)}
            </Select>
          </Field>
          <p className="w-full text-xs text-stone-500">🔒 {t.gifts.basicsHelp}</p>
          <Field label={t.gifts.budget}><Input type="number" name="budget" min={0} defaultValue={sp.budget ?? ""} className="w-32" /></Field>
          <Field label={t.people.currency}>
            <Select name="currency" defaultValue={currency} className="w-28">
              <option value="">{t.gifts.currencyNone}</option>
              {["JPY", "USD", "VND", "EUR"].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Button type="submit">{t.gifts.suggest}</Button>
        </form>
        {giftResult && !ideas && <Notice kind="error">{t.gifts.error}</Notice>}
        {ideas && (
          <div id="gift-ideas" className="mt-3 scroll-mt-24 space-y-3" data-testid="gift-ideas">
            {ideas.nextOccasion && <Notice>{t.gifts.nextOccasion(ideas.nextOccasion.label, ideas.nextOccasion.date, t.home.inDays(ideas.nextOccasion.daysUntil))}</Notice>}
            {ideas.budget && <Notice kind="warning">{ideas.budget.note[locale]}</Notice>}
            {ideas.thin && <Notice>{t.gifts.thin}</Notice>}
            {ideas.missingBasics.length > 0 && (
              <p className="text-sm text-amber-800">💡 {t.gifts.missingBasics(ideas.missingBasics.map((m) => t.gifts.missing[m]).join(locale === "ja" ? "と" : locale === "vi" ? " và " : " and "))}</p>
            )}
            {ideas.candidates.length === 0 ? (
              <Notice kind="warning">{t.gifts.none}</Notice>
            ) : (
              <ol className="space-y-2">
                {ideas.candidates.map((c, i) => (
                  <li key={i} className="rounded-xl border border-stone-200 p-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {c.kind === "general" ? (
                        <Pill tone="violet">{t.gifts.general}</Pill>
                      ) : (
                        <Pill tone={c.strength === "strong" ? "teal" : c.strength === "moderate" ? "stone" : "amber"}>{t.gifts.strength[c.strength]}</Pill>
                      )}
                      <span className="font-medium">{c.idea[locale]}</span>
                    </div>
                    {c.kind === "from_their_answers" && <p className="text-xs font-semibold text-rose-800">💬 {t.gifts.fromThem(ideas.personName)}</p>}
                    {c.kind !== "from_their_answers" && <p className="text-sm text-stone-700">{c.reason[locale]}</p>}
                    <p className="text-xs text-stone-500">{t.gifts.evidence}: {c.evidence.map((e) => (e.text ? e.text[locale] : e.sentiment ? `${e.label} (${t.people.sentiments[e.sentiment as keyof typeof t.people.sentiments] ?? e.sentiment})` : e.label)).join("; ")}</p>
                    {c.caveats.map((cv, j) => <p key={j} className="text-xs text-amber-800">⚠ {cv[locale]}</p>)}
                  </li>
                ))}
              </ol>
            )}
            {ideas.relationNote && ideas.candidates.some((c) => c.kind === "general") && <p className="text-sm text-stone-600">💡 {ideas.relationNote[locale]}</p>}
            {ideas.avoid.length > 0 && <p className="text-sm"><b>{t.gifts.avoid}:</b> {ideas.avoid.map((a) => a.text?.[locale] ?? a.label).join(locale === "ja" ? "、" : ", ")}</p>}
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
      </div>
    </Page>
  );
}
