import { DateSelect } from "@/components/date-select";
import { dateText } from "@/lib/i18n/date-text";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  deleteGiftEntryAction, deliverAsBookAction, giftEntryAction, giftViewAction, inviteCodeAction, receiveCodeAction, removeGiftWriterAction, updateGiftBoxAction,
} from "@/app/actions/gift-boxes";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { OneTimeCode } from "@/components/one-time-code";
import { Button, Card, Field, Input, Page, SegmentedTabs, Select, Textarea } from "@/components/ui";
import { AXES, AXIS_CHAPTER, AXIS_CHAPTERS, CHAPTER_INFO, PEER_POLES } from "@/content/axes";
import { ageAt, daysUntil, todayIso } from "@/lib/gift-dates";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { GIFT_ROLES } from "@/server/db/schema";
import { giftMedia, readGiftBox, writerName, type GiftBox, type GiftEntry } from "@/server/services/gift-boxes";
import type { MediaItem } from "@/server/services/media";
import { MediaGrid } from "@/components/media-grid";
import { MediaPicker } from "@/components/media-picker";
import { mediaPickerText } from "@/components/memory-form";

const pill =
  "flex min-h-10 cursor-pointer items-center justify-center rounded-2xl border border-stone-200 bg-white/90 px-2 py-1.5 text-center text-xs leading-snug text-stone-700 transition-colors hover:border-teal-300 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:font-semibold has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600/40";
const pillNeutral =
  "flex min-h-10 cursor-pointer items-center justify-center rounded-2xl border border-stone-200 bg-white/90 px-2 py-1.5 text-center text-[11px] leading-snug text-stone-500 transition-colors has-[:checked]:border-stone-500 has-[:checked]:bg-stone-500 has-[:checked]:text-white";

const TABS = ["growth", "letters", "view", "manage"] as const;
type Tab = (typeof TABS)[number];

export default async function GiftBoxPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const g = t.giftBox;
  const box = await readGiftBox(uid, id).catch(() => null);
  if (!box) notFound();
  // The child reads it as a book.
  if (box.my_role === "child") redirect(`/gifts/${box.id}/book`);
  const tabs = TABS.filter((x) => x !== "manage" || box.my_role === "owner");
  const tab: Tab = (tabs as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "growth";
  const nameOf = (x: GiftEntry) => writerName(box, x, g.roles) || "?";
  const media = tab === "growth" ? await giftMedia(uid, box.id) : new Map<string, MediaItem[]>();
  const left = daysUntil(box.deliver_on);
  // An account can receive it from 13 (the terms of use), when the birthday is known.
  const from13 = box.child_birthday ? `${Number(box.child_birthday.slice(0, 4)) + 13}${box.child_birthday.slice(4)}` : null;
  const open = box.status === "open";
  const base = `/gifts/${box.id}`;

  return (
    <Page title={g.forChild(box.child_name)} back="/gifts">
      <Flash t={t} sp={sp} />
      <section className="rounded-3xl bg-linear-to-br from-amber-50 via-white to-rose-50 p-5 shadow-sm ring-1 ring-amber-100">
        <p className="text-3xl" aria-hidden>🎁</p>
        {open ? (
          <>
            <p className="mt-2 text-lg font-bold text-stone-900">{g.deliverOnText(box.deliver_on)}</p>
            <p className="text-sm font-semibold text-amber-800">{g.daysLeft(left)}</p>
          </>
        ) : (
          <p className="mt-2 text-lg font-bold text-stone-900">{g.deliveredOn(box.delivered_at!.slice(0, 10))}</p>
        )}
        <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {box.writers.filter((w) => !w.removed).map((w) => (
            <li key={w.user_id} className="rounded-full bg-white/90 px-2.5 py-1 text-stone-700 ring-1 ring-stone-200">
              {w.label ?? g.roles[w.role]}（{g.roles[w.role]}）{w.owner && <b className="text-teal-800"> · {g.owner}</b>}
            </li>
          ))}
        </ul>
      </section>

      {!open ? (
        <>
          <Card>
            <p className="text-sm text-stone-700">{g.closedNote}</p>
            <Link href={`${base}/book`} className="mt-3 inline-block rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white">📖 {g.openBook}</Link>
          </Card>
          {/* Handed over as a book: it can still reach the child's account later (from 13). */}
          {box.my_role === "owner" && box.delivered_via === "pdf" && (
            <Card title={`🎁 ${g.bookToAccountTitle}`}>
              <div data-testid="gift-book-to-account">
                {box.received ? (
                  <p className="text-sm text-teal-800">✓ {g.bookToAccountDone(box.child_name)}</p>
                ) : (
                  <>
                    <p className="mb-2 text-sm leading-6 text-stone-700">{g.bookToAccountHelp(box.child_name)}</p>
                    {box.code_active && <p className="mb-2 text-xs text-teal-800">✓ {g.codeActive}</p>}
                    {from13 && from13 > todayIso() ? (
                      <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{g.bookToAccountFrom13(from13)}</p>
                    ) : (
                      <OneTimeCode action={receiveCodeAction} hidden={{ boxId: box.id }} button={g.handoverCode} labels={{ once: g.codeOnce, copy: g.copy, copied: g.copied, errors: t.errors }} />
                    )}
                  </>
                )}
              </div>
            </Card>
          )}
        </>
      ) : (
        <>
          <SegmentedTabs current={`${base}?tab=${tab}`} items={tabs.map((x) => ({ href: `${base}?tab=${x}`, label: g.tabs[x] }))} />
          {tab === "growth" && <Entries box={box} kind="growth" help={g.growthHelp} nameOf={nameOf} t={t} draft={sp.draft?.slice(0, 5000)} media={media} />}
          {tab === "letters" && <Entries box={box} kind="letter" help={g.lettersHelp} nameOf={nameOf} t={t} media={media} />}
          {tab === "view" && (
            <form action={giftViewAction} className="space-y-4">
              <input type="hidden" name="boxId" value={box.id} />
              <p className="text-sm leading-7 text-stone-600">{g.viewHelp(box.child_name)}</p>
              {AXIS_CHAPTERS.map((ch) => (
                <Card key={ch}>
                  <p className="mb-3 text-xs font-semibold text-violet-800">{CHAPTER_INFO[ch].icon} {CHAPTER_INFO[ch].title[locale]}</p>
                  <div className="space-y-2">
                    {AXES.filter((k) => AXIS_CHAPTER[k] === ch).map((k) => {
                      const cur = box.views.find((v) => v.author_id === box.me)?.answers[k];
                      return (
                        <fieldset key={k} className="grid grid-cols-[1fr_auto_1fr] gap-1.5">
                          <legend className="sr-only">{`${PEER_POLES[k].pos[locale]} / ${PEER_POLES[k].neg[locale]}`}</legend>
                          <label className={pill}><input type="radio" name={`ax_${k}`} value="1" defaultChecked={cur === 1} className="sr-only" />{PEER_POLES[k].pos[locale]}</label>
                          <label className={pillNeutral}><input type="radio" name={`ax_${k}`} value="0" defaultChecked={cur === 0} className="sr-only" />{g.neither}</label>
                          <label className={pill}><input type="radio" name={`ax_${k}`} value="-1" defaultChecked={cur === -1} className="sr-only" />{PEER_POLES[k].neg[locale]}</label>
                        </fieldset>
                      );
                    })}
                  </div>
                </Card>
              ))}
              <Card>
                <Field label={g.viewComment}>
                  <Textarea name="comment" rows={3} maxLength={1000} defaultValue={box.views.find((v) => v.author_id === box.me)?.comment ?? ""} />
                </Field>
              </Card>
              <Button type="submit" className="w-full">{g.save}</Button>
            </form>
          )}
          {tab === "manage" && box.my_role === "owner" && (
            <>
              <Card title={g.manageInfo}>
                <form action={updateGiftBoxAction} className="space-y-3">
                  <input type="hidden" name="boxId" value={box.id} />
                  <Field label={g.childName}><Input name="childName" required maxLength={60} defaultValue={box.child_name} /></Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DateSelect label={g.childBirthday} name="childBirthday" text={dateText(t)} defaultValue={box.child_birthday ?? ""} max={todayIso()} />
                    <DateSelect label={g.deliverOn} hint={g.deliverHelp} name="deliverOn" text={dateText(t)} required defaultValue={box.deliver_on} />
                  </div>
                  <Button type="submit" variant="secondary">{g.save}</Button>
                </form>
              </Card>
              <Card title={g.invite}>
                <p className="mb-2 text-xs leading-5 text-stone-500">{g.inviteHelp}</p>
                <OneTimeCode
                  action={inviteCodeAction}
                  hidden={{ boxId: box.id }}
                  button={g.inviteButton}
                  labels={{ once: g.codeOnce, copy: g.copy, copied: g.copied, errors: t.errors }}
                >
                  <Field label={g.myRole}>
                    <Select name="role" defaultValue="father">
                      {GIFT_ROLES.map((r) => <option key={r} value={r}>{g.roles[r]}</option>)}
                    </Select>
                  </Field>
                </OneTimeCode>
              </Card>
              <Card title={g.writers}>
                <ul className="space-y-3">
                  {box.writers.filter((w) => !w.removed && !w.owner).map((w) => (
                    <li key={w.user_id} className="rounded-2xl border border-stone-200 p-3">
                      <p className="text-sm font-semibold text-stone-900">{w.label ?? g.roles[w.role]}（{g.roles[w.role]} · {w.name}）</p>
                      <form action={removeGiftWriterAction} className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                        <input type="hidden" name="boxId" value={box.id} />
                        <input type="hidden" name="userId" value={w.user_id} />
                        <label className="flex items-center gap-1"><input type="radio" name="keep" value="yes" defaultChecked className="accent-teal-700" />{g.removeKeep}</label>
                        <label className="flex items-center gap-1"><input type="radio" name="keep" value="no" className="accent-teal-700" />{g.removeDelete}</label>
                        <ConfirmButton message={g.removeConfirm}>{g.remove}</ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title={`🎁 ${g.handover}`}>
                {left > 0 ? (
                  <p className="text-sm text-stone-600">{g.handoverNotYet(box.deliver_on)}</p>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <p className="mb-2 text-sm leading-6 text-stone-700">{g.handoverCodeHelp}</p>
                      {box.code_active && <p className="mb-2 text-xs text-teal-800">✓ {g.codeActive}</p>}
                      {from13 && from13 > todayIso() && <p className="mb-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900" data-testid="gift-from13">{g.accountFrom13(from13)}</p>}
                      <OneTimeCode action={receiveCodeAction} hidden={{ boxId: box.id }} button={g.handoverCode} labels={{ once: g.codeOnce, copy: g.copy, copied: g.copied, errors: t.errors }} />
                    </div>
                    <form action={deliverAsBookAction} className="space-y-2 border-t border-stone-100 pt-4">
                      <input type="hidden" name="boxId" value={box.id} />
                      <p className="text-sm leading-6 text-stone-700">{g.handoverBookHelp}</p>
                      <ConfirmButton message={g.handoverBookConfirm}>📖 {g.handoverBook}</ConfirmButton>
                    </form>
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </Page>
  );
}

function Entries({ box, kind, help, nameOf, t, draft, media }: { box: GiftBox; kind: GiftEntry["kind"]; help: string; nameOf: (x: GiftEntry) => string; t: Awaited<ReturnType<typeof getT>>["t"]; draft?: string; media: Map<string, MediaItem[]> }) {
  const g = t.giftBox;
  const list = box.entries.filter((e) => e.kind === kind);
  const tab = kind === "letter" ? "letters" : "growth";
  const growth = kind === "growth";
  // Like a record: words (or, for growth, photos alone), when it was, and a heading only if wanted.
  const fields = (e?: GiftEntry) => (
    <>
      <Textarea name="body" required={!growth} rows={growth ? 4 : 8} maxLength={5000} defaultValue={e ? e.body : draft} autoFocus={!e && !!draft} placeholder={growth ? g.growthPlaceholder : g.letterPlaceholder} aria-label={g.body} />
      {growth && <MediaPicker tx={mediaPickerText(t)} initial={e ? (media.get(e.id) ?? []) : []} />}
      <DateSelect label={g.occurredOn} name="occurredOn" text={dateText(t)} max={growth ? todayIso() : undefined} defaultValue={e?.occurred_on ?? ""} />
      <details open={!!e?.title} className="group">
        <summary className="cursor-pointer list-none text-sm font-semibold text-teal-700 group-open:mb-2">{g.addTitle}</summary>
        <Input name="title" maxLength={120} defaultValue={e?.title ?? ""} aria-label={g.entryTitle} placeholder={g.entryTitle} />
      </details>
    </>
  );
  return (
    <>
      <Card>
        <p className="mb-3 text-sm leading-6 text-stone-600">{help}</p>
        <form action={giftEntryAction} className="space-y-3" data-testid={`gift-${kind}-form`}>
          <input type="hidden" name="boxId" value={box.id} />
          <input type="hidden" name="kind" value={kind} />
          {fields()}
          <Button type="submit">{g.add}</Button>
        </form>
      </Card>
      {kind === "letter" && box.hidden_letters > 0 && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">✉️ {g.hiddenLetters(box.hidden_letters)}</p>}
      <ul className="space-y-3">
        {list.map((e) => {
          const age = ageAt(box.child_birthday, e.occurred_on);
          const mine = e.author_id === box.me;
          return (
            <li key={e.id} className="rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-stone-200/60" data-testid="gift-entry">
              <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-stone-500">
                {e.occurred_on && <span className="font-semibold text-stone-700">{e.occurred_on}</span>}
                {age && <span>（{g.age(age.y, age.m)}）</span>}
                <span className="ml-auto">{g.from(nameOf(e))}</span>
              </p>
              {e.title && <p className="emoji-color mt-1 font-semibold text-stone-900">{e.title}</p>}
              {e.body && <p className="emoji-color mt-1 whitespace-pre-line text-sm leading-7 text-stone-800">{e.body}</p>}
              {media.get(e.id) && <MediaGrid media={media.get(e.id)!} label={t.memories.media.label} />}
              {mine && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-teal-700">{g.edit}</summary>
                  <form action={giftEntryAction} className="mt-2 space-y-2">
                    <input type="hidden" name="boxId" value={box.id} />
                    <input type="hidden" name="kind" value={kind} />
                    <input type="hidden" name="entryId" value={e.id} />
                    {fields(e)}
                    <Button type="submit" variant="secondary">{g.save}</Button>
                  </form>
                  <form action={deleteGiftEntryAction} className="mt-2">
                    <input type="hidden" name="boxId" value={box.id} />
                    <input type="hidden" name="entryId" value={e.id} />
                    <input type="hidden" name="tab" value={tab} />
                    <ConfirmButton message={g.deleteConfirm}>{g.delete}</ConfirmButton>
                  </form>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
