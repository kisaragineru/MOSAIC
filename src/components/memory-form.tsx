import type { Dict } from "@/lib/i18n/messages/en";
import { MEMORY_KINDS } from "@/server/db/schema";
import { Button, Field, Input, Select, Textarea } from "./ui";

export interface MemoryDefaults {
  id?: string;
  kind?: string;
  title?: string | null;
  body?: string | null;
  reason?: string | null;
  mood?: number | null;
  occurredOn?: string | null;
  revealOn?: string | null;
  tags?: string[];
  personIds?: string[];
  visibility?: "private" | "connections" | "selected";
  sessionIds?: string[];
}

const radio = "flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50";

export function MemoryForm({
  t,
  action,
  people,
  d = {},
  back,
  submitLabel,
  audience = [],
}: {
  t: Dict;
  action: (f: FormData) => Promise<void>;
  people: { id: string; nickname: string }[];
  d?: MemoryDefaults;
  back: string;
  submitLabel: string;
  /** Active connections a record can be shared with. */
  audience?: { sessionId: string; name: string }[];
}) {
  const isLetter = d.kind === "letter_to_future";
  return (
    <form action={action} className="space-y-3">
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <input type="hidden" name="back" value={back} />
      <Field label={t.memories.fields.kind}>
        <Select name="kind" defaultValue={d.kind ?? "thought"}>
          {MEMORY_KINDS.filter((k) => !d.id || (isLetter ? k === "letter_to_future" : k !== "letter_to_future")).map((k) => (
            <option key={k} value={k}>{t.memories.kinds[k]}</option>
          ))}
        </Select>
      </Field>
      <Field label={`${t.memories.fields.title} (${t.common.optional})`}>
        <Input name="title" defaultValue={d.title ?? ""} maxLength={200} />
      </Field>
      <Field label={t.memories.fields.body}>
        <Textarea name="body" required defaultValue={d.body ?? ""} maxLength={20000} rows={6} />
      </Field>
      {isLetter ? (
        <p className="text-xs text-stone-500">🔒 {t.memories.audience.letterPrivate}</p>
      ) : (
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-sm font-medium text-stone-700">{t.memories.audience.label}</legend>
          <label className={radio}>
            <input type="radio" name="visibility" value="private" defaultChecked={(d.visibility ?? "private") === "private"} className="accent-teal-700" />
            🔒 {t.memories.audience.private}
          </label>
          {audience.length > 0 ? (
            <>
              <label className={radio}>
                <input type="radio" name="visibility" value="connections" defaultChecked={d.visibility === "connections"} className="accent-teal-700" />
                🔗 {t.memories.audience.connections}
              </label>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                <input type="radio" id="visibility-selected" name="visibility" value="selected" defaultChecked={d.visibility === "selected"} className="peer accent-teal-700" />
                <label htmlFor="visibility-selected">👥 {t.memories.audience.selected}</label>
                <div className="hidden w-full basis-full flex-wrap gap-3 pl-6 pt-1 peer-checked:flex">
                  {audience.map((a) => (
                    <label key={a.sessionId} className="flex items-center gap-1">
                      <input type="checkbox" name="sessionIds" value={a.sessionId} defaultChecked={d.sessionIds?.includes(a.sessionId)} className="accent-teal-700" />
                      {a.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-stone-500">{t.memories.audience.noConnections}</p>
          )}
          <p className="text-[11px] leading-5 text-stone-500">{t.memories.audience.help}</p>
        </fieldset>
      )}
      <details className="rounded-xl border border-stone-200 p-3" open={!!(d.reason || d.occurredOn || d.revealOn || d.tags?.length || d.personIds?.length || d.mood)}>
        <summary className="cursor-pointer text-sm text-stone-600">{t.common.more}</summary>
        <div className="mt-3 space-y-3">
          <Field label={`${t.memories.fields.reason} (${t.common.optional})`}>
            <Textarea name="reason" defaultValue={d.reason ?? ""} rows={2} maxLength={5000} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.memories.fields.occurredOn}>
              <Input type="date" name="occurredOn" defaultValue={d.occurredOn ?? ""} />
            </Field>
            <Field label={t.memories.fields.mood}>
              <Select name="mood" defaultValue={d.mood ? String(d.mood) : ""}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
          </div>
          <Field label={t.memories.fields.revealOn} hint={t.memories.kinds.letter_to_future}>
            <Input type="date" name="revealOn" defaultValue={d.revealOn ?? ""} />
          </Field>
          <Field label={t.memories.fields.tags}>
            <Input name="tags" defaultValue={(d.tags ?? []).join(", ")} />
          </Field>
          {people.length > 0 && (
            <fieldset>
              <legend className="text-sm font-medium text-stone-700">{t.memories.fields.people}</legend>
              <div className="mt-1 flex flex-wrap gap-3">
                {people.map((p) => (
                  <label key={p.id} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" name="personIds" value={p.id} defaultChecked={d.personIds?.includes(p.id)} className="accent-teal-700" />
                    {p.nickname}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      </details>
      <Button type="submit" className="w-full">{submitLabel}</Button>
    </form>
  );
}
