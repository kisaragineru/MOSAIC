import type { Dict } from "@/lib/i18n/messages/en";
import { MEMORY_CIRCLES, MEMORY_KINDS } from "@/server/db/schema";
import { KIND_ICON } from "@/lib/timeline";
import { CIRCLE_ICON } from "./circle-icon";
import { Button, Field, Input, Textarea } from "./ui";

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
  visibility?: "private" | "connections" | "circles";
  circles?: string[];
}

const chip =
  "cursor-pointer select-none rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 transition has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400";

const MOODS = ["😞", "😕", "😐", "🙂", "😄"];

export function MemoryForm({
  t,
  action,
  people,
  d = {},
  back,
  submitLabel,
  canShare = false,
}: {
  t: Dict;
  action: (f: FormData) => Promise<void>;
  people: { id: string; nickname: string }[];
  d?: MemoryDefaults;
  back: string;
  submitLabel: string;
  /** Whether there is any active connection to share with. */
  canShare?: boolean;
}) {
  const isLetter = d.kind === "letter_to_future";
  const kinds = MEMORY_KINDS.filter((k) => !d.id || (isLetter ? k === "letter_to_future" : k !== "letter_to_future"));
  const kind = d.kind && (kinds as readonly string[]).includes(d.kind) ? d.kind : kinds[0];
  // Shown or hidden by the chosen kind, without script: a letter needs its opening day and is never shared.
  // (rules in globals.css: .memory-form .letter-only / .not-letter / .aud-pick)
  const letterOnly = "letter-only";
  const notLetter = "not-letter";
  return (
    <form action={action} className="memory-form space-y-4">
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <input type="hidden" name="back" value={back} />
      {/* Titles and reasons are no longer asked for; an existing one stays editable. */}
      {d.title && (
        <Field label={`${t.memories.fields.title} (${t.common.optional})`}>
          <Input name="title" defaultValue={d.title} maxLength={200} />
        </Field>
      )}
      <Field label={t.memories.fields.body}>
        <Textarea name="body" required defaultValue={d.body ?? ""} maxLength={20000} rows={7} placeholder={t.memories.bodyPlaceholder} />
      </Field>
      {d.reason && (
        <Field label={`${t.memories.fields.reason} (${t.common.optional})`}>
          <Textarea name="reason" defaultValue={d.reason} rows={2} maxLength={5000} />
        </Field>
      )}
      {kinds.length > 1 ? (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-stone-700">{t.memories.fields.kind}</legend>
          <div className="flex flex-wrap gap-1.5">
            {kinds.map((k) => (
              <label key={k} className={chip}>
                <input type="radio" name="kind" value={k} defaultChecked={k === kind} className="sr-only" />
                <span aria-hidden className="mr-1">{KIND_ICON[k]}</span>{t.memories.kinds[k]}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="kind" value={kind} />
      )}
      <div className={kinds.length > 1 ? letterOnly : isLetter ? "" : "hidden"}>
        <Field label={t.memories.fields.revealOn}>
          <Input type="date" name="revealOn" defaultValue={d.revealOn ?? ""} />
        </Field>
        <p className="mt-1 text-xs text-stone-500">🔒 {t.memories.audience.letterPrivate}</p>
      </div>
      {!isLetter && (
        <fieldset className={notLetter}>
          <legend className="mb-1.5 text-sm font-medium text-stone-700">{t.memories.audience.label}</legend>
          <div className="flex flex-wrap gap-1.5">
            <label className={chip}>
              <input type="radio" name="visibility" value="private" defaultChecked={(d.visibility ?? "private") === "private"} className="sr-only" />
              🔒 {t.memories.audience.private}
            </label>
            {canShare && (
              <>
                <label className={chip}>
                  <input type="radio" name="visibility" value="connections" defaultChecked={d.visibility === "connections"} className="sr-only" />
                  🔗 {t.memories.audience.connections}
                </label>
                <label className={chip}>
                  <input type="radio" name="visibility" value="circles" defaultChecked={d.visibility === "circles"} className="sr-only" />
                  👪 {t.memories.audience.circles}
                </label>
              </>
            )}
          </div>
          {canShare ? (
            <div className="aud-pick mt-2 flex-col gap-2 rounded-xl bg-teal-50/60 px-3 py-2 text-sm">
              <div className="flex flex-wrap gap-1.5">
                {MEMORY_CIRCLES.map((c) => (
                  <label key={c} className={chip}>
                    <input type="checkbox" name="circles" value={c} defaultChecked={d.circles?.includes(c)} className="sr-only" />
                    {CIRCLE_ICON[c]} {t.people.relationships[c]}
                  </label>
                ))}
              </div>
              <p className="text-[11px] leading-5 text-stone-600">{t.memories.audience.circlesHelp}</p>
            </div>
          ) : (
            <p className="mt-1 text-xs text-stone-500">{t.memories.audience.noConnections}</p>
          )}
          {canShare && <p className="mt-1 text-[11px] leading-5 text-stone-500">{t.memories.audience.help}</p>}
        </fieldset>
      )}
      <details className="rounded-xl border border-stone-200 p-3" open={!!(d.occurredOn || d.tags?.length || d.personIds?.length || d.mood)}>
        <summary className="cursor-pointer text-sm text-stone-600">{t.memories.details}</summary>
        <div className="mt-3 space-y-3">
          <Field label={t.memories.fields.occurredOn}>
            <Input type="date" name="occurredOn" defaultValue={d.occurredOn ?? ""} />
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-stone-700">{t.memories.fields.mood}</legend>
            <div className="flex flex-wrap gap-1.5">
              <label className={chip}>
                <input type="radio" name="mood" value="" defaultChecked={!d.mood} className="sr-only" />
                {t.memories.moodNone}
              </label>
              {MOODS.map((e, i) => (
                <label key={e} className={chip} title={String(i + 1)}>
                  <input type="radio" name="mood" value={i + 1} defaultChecked={d.mood === i + 1} className="sr-only" aria-label={`${t.memories.fields.mood} ${i + 1}`} />
                  <span aria-hidden>{e}</span>
                </label>
              ))}
            </div>
          </fieldset>
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
