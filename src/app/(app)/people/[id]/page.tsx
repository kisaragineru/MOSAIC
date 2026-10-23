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
} from "@/app/actions/people";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { PreferenceSection } from "@/components/preferences";
import { Button, Card, Field, Input, Notice, Page, Pill, Select, Textarea } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { suggestGifts } from "@/server/services/gifts";
import { getPerson, listCategories } from "@/server/services/people";

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

export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const data = await getPerson(uid, id).catch(() => null);
  if (!data) notFound();
  const { person, entries, events, gifts, dates, preferences } = data;
  const categories = await listCategories();
  const back = `/people/${person.id}`;
  const showGifts = sp.gifts === "1";
  const ideas = showGifts ? await suggestGifts(uid, person.id, { budget: sp.budget ?? "", currency: sp.currency ?? "" }).catch(() => null) : null;
  return (
    <Page title={person.nickname} back="/people">
      <Flash t={t} sp={sp} />
      <p className="text-xs text-stone-500">🔒 {t.people.privateNote}</p>
      <Card>
        <form action={updatePersonAction} className="space-y-2">
          <input type="hidden" name="personId" value={person.id} />
          <div className="grid grid-cols-2 gap-2">
            <Field label={t.people.nickname}><Input name="nickname" defaultValue={person.nickname} required maxLength={80} /></Field>
            <Field label={t.people.relationship}>
              <Select name="relationship" defaultValue={person.relationship}>
                {RELS.map((r) => <option key={r} value={r}>{t.people.relationships[r]}</option>)}
              </Select>
            </Field>
          </div>
          <Field label={t.people.note}><Textarea name="note" defaultValue={person.note ?? ""} rows={2} maxLength={4000} /></Field>
          <Button type="submit" variant="secondary">{t.common.save}</Button>
        </form>
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
        <PreferenceSection t={t} locale={locale} prefs={preferences} categories={categories} personId={person.id} back={back} />
      </Card>

      <Card title={t.people.notes}>
        <ul className="mb-3 space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="rounded-xl border border-stone-200 p-2 text-sm">
              <div className="flex flex-wrap gap-1">
                <Pill>{t.people.entryKinds[e.kind as keyof typeof t.people.entryKinds]}</Pill>
                <Pill tone="amber">{t.people.sources[e.source as keyof typeof t.people.sources]}</Pill>
                {e.occurredOn && <span className="text-xs text-stone-500">{e.occurredOn}</span>}
              </div>
              <p className="mt-1 whitespace-pre-line">{e.body}</p>
              <DeleteRecord kind="entry" id={e.id} back={back} label={t.common.delete} />
            </li>
          ))}
        </ul>
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
      </Card>

      <Card title={t.people.events}>
        <ul className="mb-3 space-y-2">
          {events.map((e) => (
            <li key={e.id} className="text-sm">
              <b>{e.title}</b>{e.place && ` · ${e.place}`}{e.occurredOn && ` · ${e.occurredOn}`}
              {e.description && <p className="text-stone-600">{e.description}</p>}
              <DeleteRecord kind="event" id={e.id} back={back} label={t.common.delete} />
            </li>
          ))}
        </ul>
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
      </Card>

      <Card title={t.people.gifts}>
        <ul className="mb-3 space-y-1 text-sm">
          {gifts.map((g) => (
            <li key={g.id}>
              🎁 <b>{g.item}</b>{g.occasion && ` · ${g.occasion}`}{g.givenOn && ` · ${g.givenOn}`}
              {g.priceAmount !== null && ` · ${g.priceAmount.toLocaleString(locale)} ${g.priceCurrency ?? ""}`} · {t.people.reactions[g.reaction as keyof typeof t.people.reactions]}{" "}
              <DeleteRecord kind="gift" id={g.id} back={back} label={t.common.delete} />
            </li>
          ))}
        </ul>
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
      </Card>

      <Card title={t.people.dates}>
        <ul className="mb-3 space-y-1 text-sm">
          {dates.map((d) => (
            <li key={d.id}>
              📅 {d.label} — {d.day}/{d.month}{d.year ? `/${d.year}` : ""} ({t.people.dateKinds[d.kind as keyof typeof t.people.dateKinds]})
              {d.remindDaysBefore !== null && ` · 🔔 ${d.remindDaysBefore}`}{" "}
              <DeleteRecord kind="date" id={d.id} back={back} label={t.common.delete} />
            </li>
          ))}
        </ul>
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
          <div className="col-span-3"><Field label={t.people.remind}><Input type="number" name="remindDaysBefore" min={0} max={60} /></Field></div>
          <div className="col-span-3"><Button type="submit">{t.common.add}</Button></div>
        </form>
      </Card>

      <Link href={`/insights?kind=relationship&personId=${person.id}`} className="block text-sm text-teal-700 underline">{t.insights.reflections} →</Link>
      <form action={deletePersonAction}>
        <input type="hidden" name="personId" value={person.id} />
        <ConfirmButton message={t.common.confirmDelete}>{t.people.deletePerson}</ConfirmButton>
      </form>
    </Page>
  );
}
