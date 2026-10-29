import Link from "next/link";
import { addPreferenceAction, deletePreferenceAction, updatePreferenceAction } from "@/app/actions/people";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";
import { PREFERENCE_SENTIMENTS } from "@/server/db/schema";
import type { PreferenceView } from "@/server/services/people";
import { Button, Field, Input, Pill, Select } from "./ui";

type Cat = { id: string; label: unknown };

export function PreferenceSection({
  t,
  locale,
  prefs,
  categories,
  personId,
  back,
  editing = null,
}: {
  t: Dict;
  locale: Locale;
  prefs: PreferenceView[];
  categories: Cat[];
  personId: string | null;
  back: string;
  /** Item whose edit form is open (from ?edit=). */
  editing?: string | null;
}) {
  const catLabel = (id: string) => {
    const l = (categories.find((c) => c.id === id)?.label ?? {}) as Record<string, string>;
    return l[locale] ?? l.en ?? id;
  };
  return (
    <div className="space-y-3">
      <form action={addPreferenceAction} className="grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-2">
        {personId && <input type="hidden" name="personId" value={personId} />}
        <input type="hidden" name="back" value={back} />
        <div className="col-span-2">
          <Field label={t.people.item}><Input name="label" required maxLength={200} /></Field>
        </div>
        <Field label={t.people.category}>
          <Select name="categoryId" defaultValue="food">
            {categories.map((c) => <option key={c.id} value={c.id}>{catLabel(c.id)}</option>)}
          </Select>
        </Field>
        <Field label={t.people.feeling}>
          <Select name="sentiment" defaultValue="like">
            {PREFERENCE_SENTIMENTS.map((s) => <option key={s} value={s}>{t.people.sentiments[s]}</option>)}
          </Select>
        </Field>
        {personId && (
          <div className="col-span-2">
            <Field label={t.people.sourceLabel}>
              <Select name="source" defaultValue="person_stated">
                {(["person_stated", "observed", "guess", "unverified"] as const).map((s) => <option key={s} value={s}>{t.people.sources[s]}</option>)}
              </Select>
            </Field>
          </div>
        )}
        <div className="col-span-2">
          <Field label={`${t.people.note} (${t.common.optional})`}><Input name="note" maxLength={1000} /></Field>
        </div>
        <div className="col-span-2"><Button type="submit">{t.common.add}</Button></div>
      </form>
      {prefs.length > 0 && (
        <ul className="space-y-2">
          {prefs.map((p) => (
            <li key={p.itemId} id={`r-${p.itemId}`} className="scroll-mt-24 rounded-xl border border-stone-200 p-2">
              {editing === p.itemId ? (
                <form action={updatePreferenceAction} className="grid grid-cols-2 gap-2 rounded-xl bg-teal-50/70 p-2 ring-1 ring-teal-200">
                  <input type="hidden" name="itemId" value={p.itemId} />
                  {personId && <input type="hidden" name="personId" value={personId} />}
                  <input type="hidden" name="back" value={back} />
                  <div className="col-span-2">
                    <Field label={t.people.item}><Input name="label" required maxLength={200} defaultValue={p.label} /></Field>
                  </div>
                  <Field label={t.people.category}>
                    <Select name="categoryId" defaultValue={p.categoryId}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{catLabel(c.id)}</option>)}
                    </Select>
                  </Field>
                  <Field label={t.people.feeling}>
                    <Select name="sentiment" defaultValue={p.current.sentiment}>
                      {PREFERENCE_SENTIMENTS.map((x) => <option key={x} value={x}>{t.people.sentiments[x]}</option>)}
                    </Select>
                  </Field>
                  {personId && (
                    <div className="col-span-2">
                      <Field label={t.people.sourceLabel}>
                        <Select name="source" defaultValue={p.current.source}>
                          {(["person_stated", "observed", "guess", "unverified"] as const).map((x) => <option key={x} value={x}>{t.people.sources[x]}</option>)}
                        </Select>
                      </Field>
                    </div>
                  )}
                  <div className="col-span-2">
                    <Field label={`${t.people.note} (${t.common.optional})`}><Input name="note" maxLength={1000} defaultValue={p.current.note ?? ""} /></Field>
                  </div>
                  <p className="col-span-2 text-xs text-stone-500">{t.people.editPrefHelp}</p>
                  <div className="col-span-2 flex items-center gap-3">
                    <Button type="submit">{t.common.save}</Button>
                    <Link href={`${back}#r-${p.itemId}`} className="text-sm text-stone-600 underline">{t.common.cancel}</Link>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-1">
                    <Pill tone={["dislike", "avoid"].includes(p.current.sentiment) ? "rose" : p.current.sentiment === "wants" ? "violet" : "teal"}>
                      {t.people.sentiments[p.current.sentiment as keyof typeof t.people.sentiments]}
                    </Pill>
                    <span className="font-medium">{p.label}</span>
                    <span className="text-xs text-stone-500">· {catLabel(p.categoryId)}</span>
                    {personId && <Pill tone={p.current.source === "person_stated" ? "teal" : p.current.source === "observed" ? "stone" : "amber"}>{t.people.sources[p.current.source as keyof typeof t.people.sources]}</Pill>}
                  </div>
                  {p.current.note && <p className="text-xs text-stone-600">{p.current.note}</p>}
                  {p.history.length > 1 && (
                    <details className="mt-1 text-xs text-stone-500">
                      <summary className="cursor-pointer">{t.people.history} ({p.history.length})</summary>
                      <ul>
                        {p.history.map((h, i) => (
                          <li key={i}>
                            {h.recordedAt.toISOString().slice(0, 10)}: {t.people.sentiments[h.sentiment as keyof typeof t.people.sentiments]} · {t.people.sources[h.source as keyof typeof t.people.sources]}
                            {h.note && ` · ${h.note}`}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <div className="mt-1 flex items-center gap-3">
                    <Link href={`${back}?edit=${p.itemId}#r-${p.itemId}`} scroll={false} className="text-xs text-teal-700 underline">✎ {t.common.edit}</Link>
                    <form action={deletePreferenceAction}>
                      <input type="hidden" name="itemId" value={p.itemId} />
                      <input type="hidden" name="back" value={back} />
                      <button className="text-xs text-rose-700 underline">{t.common.delete}</button>
                    </form>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
