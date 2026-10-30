import { DateSelect } from "@/components/date-select";
import { dateText } from "@/lib/i18n/date-text";
import Link from "next/link";
import type { Dict } from "@/lib/i18n/messages/en";
import type { MediaItem } from "@/server/services/media";
import type { AudienceText } from "./audience-field";
import { MediaPicker, type MediaPickerText } from "./media-picker";
import { PostFooter } from "./post-footer";
import type { ComposerText } from "./quick-composer";
import { Button, Field, Input, Textarea } from "./ui";

/** The picker's words, from the dictionary (a client component can't take functions). */
export function mediaPickerText(t: Dict): MediaPickerText {
  const m = t.memories.media;
  return { add: m.add, camera: m.camera, help: m.help, remove: m.remove, moveEarlier: m.moveEarlier, uploading: m.uploading, waitUpload: m.waitUpload, failed: m.failed, retry: m.retry, video: m.video, errors: t.errors };
}

/** Who a post is for, in the dictionary's words. */
export function audienceText(t: Dict): AudienceText {
  const a = t.memories.audience;
  const p = t.memories.post;
  const r = t.people.relationships;
  return {
    label: a.label,
    private: a.private,
    connections: a.connections,
    circles: a.circles,
    circleNames: { partner: r.partner, family: r.family, friend: r.friend, colleague: r.colleague },
    circlesHelp: a.circlesHelp,
    noConnections: a.noConnections,
    hint: { private: p.hintPrivate, connections: p.hintConnections, circles: p.hintCircles, chooseCircle: p.chooseCircle },
    listSeparator: t.common.listSeparator,
  };
}


export interface MemoryDefaults {
  id?: string;
  kind?: string;
  title?: string | null;
  body?: string | null;
  reason?: string | null;
  occurredOn?: string | null;
  revealOn?: string | null;
  tags?: string[];
  personIds?: string[];
  visibility?: "private" | "connections" | "circles";
  circles?: string[];
  media?: MediaItem[];
}

const chip =
  "cursor-pointer select-none rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 transition has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400";

/** Below a new post: the two ways of writing that work differently (a letter, a gift box). */
export function OtherWays({ t, giftBoxes }: { t: Dict; giftBoxes: { id: string; label: string }[] }) {
  const p = t.memories.post;
  return (
    <section aria-labelledby="other-ways" className="space-y-2 border-t border-stone-100 pt-4">
      <h3 id="other-ways" className="text-xs font-semibold text-stone-500">{p.otherWays}</h3>
      <Link href="/memories/new?kind=letter_to_future" className="flex items-center gap-3 rounded-2xl bg-linear-to-br from-violet-50 to-amber-50 p-3 ring-1 ring-violet-100 transition hover:ring-violet-300">
        <span aria-hidden className="text-2xl">✉️</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-violet-950">{p.letter}</span>
          <span className="block text-xs leading-5 text-violet-900/80">{p.letterDesc}</span>
        </span>
        <span aria-hidden className="text-violet-700">→</span>
      </Link>
      {giftBoxes.length > 0 && (
        <div className="rounded-2xl bg-amber-50/70 p-3 ring-1 ring-amber-100">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-950"><span aria-hidden className="text-xl">🎁</span>{p.gift}</p>
          <p className="mt-0.5 text-xs leading-5 text-amber-900/80">{p.giftDesc}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {giftBoxes.map((b) => (
              <Link key={b.id} href={`/gifts/${b.id}?tab=growth`} className="inline-flex min-h-9 items-center rounded-full bg-white px-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-100">
                {b.label} →
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * A post (or, with kind letter_to_future, a letter), in the same order as the composer:
 * text, photos and videos, category, details, who it's for, and one button.
 */
export function MemoryForm({
  t,
  action,
  people,
  d = {},
  back,
  submitLabel,
  canShare = false,
  giftBoxes = [],
}: {
  t: Dict;
  action: (f: FormData) => Promise<void>;
  people: { id: string; nickname: string }[];
  d?: MemoryDefaults;
  back: string;
  submitLabel?: string;
  /** Whether there is any active connection to share with. */
  canShare?: boolean;
  /** Gift boxes I write in (a new post offers them below). */
  giftBoxes?: { id: string; label: string }[];
}) {
  const p = t.memories.post;
  const isLetter = d.kind === "letter_to_future";
  return (
    <form action={action} className="memory-form space-y-5">
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <input type="hidden" name="back" value={back} />
      {/* Titles and reasons are no longer asked for; an existing one stays editable. */}
      {d.title && (
        <Field label={`${t.memories.fields.title} (${t.common.optional})`}>
          <Input name="title" defaultValue={d.title} maxLength={200} />
        </Field>
      )}
      <Field label={isLetter ? p.letter : t.memories.fields.body}>
        <Textarea name="body" required={isLetter} defaultValue={d.body ?? ""} maxLength={20000} rows={isLetter ? 9 : 6} placeholder={isLetter ? undefined : p.prompt} />
      </Field>
      {d.reason && (
        <Field label={`${t.memories.fields.reason} (${t.common.optional})`}>
          <Textarea name="reason" defaultValue={d.reason} rows={2} maxLength={5000} />
        </Field>
      )}
      {isLetter ? (
        <>
          <input type="hidden" name="kind" value="letter_to_future" />
          <DateSelect label={t.memories.fields.revealOn} name="revealOn" text={dateText(t)} required defaultValue={d.revealOn ?? ""} />
          <p className="rounded-xl bg-violet-50 px-3 py-2 text-xs leading-5 text-violet-900">🔒 {t.memories.audience.letterPrivate}</p>
          <Button type="submit" className="w-full">{submitLabel ?? p.letterSubmit}</Button>
        </>
      ) : (
        <>
          <MediaPicker tx={mediaPickerText(t)} initial={d.media ?? []} />
          <details className="rounded-xl border border-stone-200 p-3" open={!!(d.occurredOn || d.tags?.length || d.personIds?.length)}>
            <summary className="cursor-pointer text-sm text-stone-600">{p.more}</summary>
            <div className="mt-3 space-y-3">
              <DateSelect label={t.memories.fields.occurredOn} name="occurredOn" text={dateText(t)} defaultValue={d.occurredOn ?? ""} />
              <Field label={t.memories.fields.tags}>
                <Input name="tags" defaultValue={(d.tags ?? []).join(", ")} />
              </Field>
              {people.length > 0 && (
                <fieldset>
                  <legend className="text-sm font-medium text-stone-700">{t.memories.fields.people}</legend>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {people.map((x) => (
                      <label key={x.id} className="flex items-center gap-1 text-sm">
                        <input type="checkbox" name="personIds" value={x.id} defaultChecked={d.personIds?.includes(x.id)} className="accent-teal-700" />
                        {x.nickname}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          </details>
          <PostFooter tx={audienceText(t)} canShare={canShare} visibility={d.visibility} circles={d.circles} submit={submitLabel ?? p.submit} />
          {canShare && <p className="-mt-2 text-[11px] leading-5 text-stone-500">{t.memories.audience.help}</p>}
          {!d.id && <OtherWays t={t} giftBoxes={giftBoxes} />}
        </>
      )}
    </form>
  );
}

/** The composer sheet's words (Home and records use the same one). */
export function composerText(t: Dict): ComposerText {
  const p = t.memories.post;
  return {
    fab: p.fab,
    title: p.title,
    prompt: p.prompt,
    body: t.memories.fields.body,
    submit: p.submit,
    posting: p.posting,
    close: t.memories.composer.close,
    discard: t.memories.composer.discard,
    more: p.more,
    morePhotos: t.memories.composer.morePhotos,
    otherWays: p.otherWays,
    letter: p.letter,
    letterDesc: p.letterDesc,
    gift: p.gift,
    giftDesc: p.giftDesc,
    errors: t.errors,
    media: mediaPickerText(t),
    audience: audienceText(t),
    feeling: { question: t.memories.feeling.question, skip: t.memories.feeling.skip, thanks: t.memories.feeling.thanks, names: t.memories.feeling.names },
  };
}
