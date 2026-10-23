import { addPreferenceAction, deletePreferenceAction } from "@/app/actions/people";
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
}: {
  t: Dict;
  locale: Locale;
  prefs: PreferenceView[];
  categories: Cat[];
  personId: string | null;
  back: string;
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
        <Field label="—">
          <Select name="sentiment" defaultValue="like" aria-label="sentiment">
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
            <li key={p.itemId} className="rounded-xl border border-stone-200 p-2">
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
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <form action={deletePreferenceAction} className="mt-1">
                <input type="hidden" name="itemId" value={p.itemId} />
                <input type="hidden" name="back" value={back} />
                <button className="text-xs text-rose-700 underline">{t.common.delete}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
