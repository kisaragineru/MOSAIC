"use client";
import { askConfirm, confirming } from "@/lib/confirm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { carryDraft } from "@/lib/draft-carry";
import { normalizeTag, suggestTags, tagQuery } from "@/lib/tags";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { quickMemoryAction, type QuickState } from "@/app/actions/memories";
import type { AudienceText } from "./audience-field";
import { MediaPicker, type MediaPickerText } from "./media-picker";
import { PostFooter } from "./post-footer";
import { FeelingAsk, type FeelingText } from "./feeling-ask";

export interface ComposerText {
  /** The floating button. */
  fab: string;
  title: string;
  prompt: string;
  body: string;
  submit: string;
  posting: string;
  close: string;
  discard: string;
  more: string;
  /** Asked before "more" when photos were picked: they can't go along, only the text. */
  morePhotos: string;
  /** Label of the tag suggestions shown after "#". */
  tagSuggest: string;
  /** "{n}": records with the tag. */
  tagCount: string;
  otherWays: string;
  letter: string;
  letterDesc: string;
  gift: string;
  giftDesc: string;
  errors: Record<string, string>;
  media: MediaPickerText;
  audience: AudienceText;
  feeling: FeelingText;
}

/** Gift boxes I write in: the composer links to each one's growth record. */
export interface ComposerGiftBox {
  id: string;
  label: string;
}

const chip =
  "cursor-pointer select-none rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 transition has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400";
const fab =
  "animate-[floatIn_.5s_cubic-bezier(.2,.8,.2,1)_backwards] fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50%-20rem))] z-30 inline-flex items-center gap-2 rounded-full bg-linear-to-br from-teal-600 to-violet-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-teal-900/25 ring-4 ring-white/80 transition hover:shadow-xl active:scale-95 print:hidden";
const inline =
  "flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3.5 text-left text-base text-stone-500 transition hover:border-teal-300 hover:bg-white";

const noop = () => () => {};

/**
 * The one place to post: a sheet opened from the floating button (records) or from Home, in
 * the same order as the full form: text, photos and videos, category, who it's for, Post. The
 * letter and the gift box, which work differently, are offered below it. Before the page is
 * interactive the trigger is a plain link to the full form.
 */
export function QuickComposer({
  tx,
  canShare,
  giftBoxes = [],
  trigger = "fab",
  knownTags = [],
  audiencePeople = [],
}: {
  tx: ComposerText;
  canShare: boolean;
  giftBoxes?: ComposerGiftBox[];
  trigger?: "fab" | "inline";
  /** My tags so far, most used first: "#" in the text offers them. */
  knownTags?: { tag: string; n: number }[];
  /** People I'm connected with, who can be chosen by name. */
  audiencePeople?: { id: string; name: string }[];
}) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState<QuickState, FormData>(quickMemoryAction, null);
  const [handled, setHandled] = useState<number | null>(null);
  const [photos, setPhotos] = useState(0);
  // The post just made, for the one question after it.
  const [ask, setAsk] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  // "#…" just before the caret offers the tags already used (one meaning, one spelling).
  const [caret, setCaret] = useState(0);
  const tagAt = open ? tagQuery(text, caret) : null;
  const tagChoices = tagAt ? suggestTags(tagAt.query, knownTags).filter((x) => x.tag !== normalizeTag(tagAt.query) || tagAt.query === "") : [];
  const pickTag = (tag: string) => {
    if (!tagAt) return;
    const before = text.slice(0, tagAt.start);
    const after = text.slice(tagAt.start + 1 + tagAt.query.length);
    const insert = `#${tag} `;
    setText(before + insert + after.replace(/^ /, ""));
    const at = before.length + insert.length;
    setCaret(at);
    requestAnimationFrame(() => {
      area.current?.focus();
      area.current?.setSelectionRange(at, at);
    });
  };

  // Posted: close and start the next one empty (the list refreshes from the server).
  if (state?.ok && state.at !== handled) {
    setHandled(state.at);
    setOpen(false);
    setText("");
    setAsk(state.id || null);
  }

  const sheet = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    // Open at the top with the cursor in the text, without the browser scrolling the sheet away.
    sheet.current?.scrollTo(0, 0);
    area.current?.focus({ preventScroll: true });
    // Where the page doesn't get shorter for the keyboard (iPhone Safari), lift the sheet above it.
    const vv = window.visualViewport;
    if (!vv) return;
    const fit = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      if (holder.current) holder.current.style.paddingBottom = `${covered}px`;
      if (sheet.current) sheet.current.style.maxHeight = `${Math.round(vv.height * 0.92)}px`;
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !confirming() && void close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function close() {
    if ((text.trim() || photos > 0) && !(await askConfirm(tx.discard))) return;
    setText("");
    setOpen(false);
  }

  const button =
    trigger === "fab" ? (
      <>
        <span aria-hidden className="text-xl leading-none">＋</span>
        {tx.fab}
      </>
    ) : (
      <>
        <span aria-hidden className="text-xl">✏️</span>
        <span className="flex-1">{tx.prompt}</span>
      </>
    );
  const cls = trigger === "fab" ? fab : inline;
  if (!hydrated) return <Link href="/memories/new" className={cls}>{button}</Link>;
  return (
    <>
      {ask && !open && <FeelingAsk key={ask} tx={tx.feeling} id={ask} onDone={() => setAsk(null)} />}
      {!(open && trigger === "fab") && (
        <button type="button" className={cls} onClick={() => setOpen(true)} aria-haspopup="dialog" data-testid={`compose-${trigger}`}>
          {button}
        </button>
      )}
      {open && (
        <div ref={holder} className="fixed inset-0 z-40 flex items-end justify-center print:hidden">
          <button type="button" aria-label={tx.close} tabIndex={-1} onClick={close} className="absolute inset-0 animate-[fadeIn_.2s_ease-out] bg-stone-900/30 backdrop-blur-[2px] motion-reduce:animate-none" />
          <div ref={sheet} role="dialog" aria-modal="true" aria-labelledby="composer-title" className="relative max-h-[92dvh] w-full max-w-2xl animate-[sheetUp_.25s_ease-out] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl motion-reduce:animate-none">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="composer-title" className="text-base font-semibold text-stone-900">{tx.title}</h2>
              <button type="button" onClick={close} aria-label={tx.close} className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-stone-500 hover:bg-stone-100">✕</button>
            </div>
            <form action={action} className="space-y-4">
              <textarea
                ref={area}
                name="body"
                maxLength={20000}
                rows={4}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setCaret(e.target.selectionStart);
                }}
                onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
                placeholder={tx.prompt}
                aria-label={tx.body}
                className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50/60 px-3.5 py-3 text-base leading-relaxed text-stone-900 placeholder:text-stone-500 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
              {tagChoices.length > 0 && (
                <div role="group" aria-label={tx.tagSuggest} data-testid="quick-tag-suggestions" className="-mt-2 flex flex-wrap gap-1.5">
                  {tagChoices.map((x) => (
                    <button
                      key={x.tag}
                      type="button"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => pickTag(x.tag)}
                      className="rounded-full bg-teal-50 px-2.5 py-1 text-xs text-teal-900 ring-1 ring-teal-100 transition hover:bg-teal-100"
                    >
                      #{x.tag} <span className="text-teal-700/60">{tx.tagCount.replace("{n}", String(x.n))}</span>
                    </button>
                  ))}
                </div>
              )}
              <MediaPicker tx={tx.media} resetKey={handled} onCount={setPhotos} />
              {state && !state.ok && <p role="alert" className="text-sm text-rose-700">{tx.errors[state.error] ?? tx.errors.generic}</p>}
              <PostFooter key={String(handled)} tx={tx.audience} canShare={canShare} people={audiencePeople} submit={tx.submit} pendingLabel={tx.posting} pending={pending} disabled={!text.trim() && photos === 0} />
              {/* The text goes along to the full form; picked photos can't, so that is asked first. */}
              <Link
                href="/memories/new"
                onClick={(e) => {
                  if (photos === 0) return carryDraft(text);
                  e.preventDefault();
                  void (async () => {
                    if (!(await askConfirm(tx.morePhotos))) return;
                    carryDraft(text);
                    router.push("/memories/new");
                  })();
                }}
                className="block text-center text-sm text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
              >
                {tx.more} →
              </Link>
            </form>
            <section className="mt-4 space-y-2 border-t border-stone-100 pt-3" aria-label={tx.otherWays}>
              <p className="text-xs font-semibold text-stone-500">{tx.otherWays}</p>
              <Link href="/memories/new?kind=letter_to_future" className="flex items-center gap-3 rounded-2xl bg-linear-to-br from-violet-50 to-amber-50 p-3 ring-1 ring-violet-100">
                <span aria-hidden className="text-xl">✉️</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-violet-950">{tx.letter}</span>
                  <span className="block text-[11px] leading-4 text-violet-900/80">{tx.letterDesc}</span>
                </span>
                <span aria-hidden className="text-violet-700">→</span>
              </Link>
              {giftBoxes.length > 0 && (
                <div className="rounded-2xl bg-amber-50/70 p-3 ring-1 ring-amber-100">
                  <p className="text-sm font-semibold text-amber-950">🎁 {tx.gift}</p>
                  <p className="text-[11px] leading-4 text-amber-900/80">{tx.giftDesc}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {giftBoxes.map((b) => (
                      <Link
                        key={b.id}
                        href={`/gifts/${b.id}?tab=growth${text.trim() ? `&draft=${encodeURIComponent(text.slice(0, 2000))}` : ""}`}
                        className="inline-flex min-h-9 items-center rounded-full bg-white px-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-100 active:scale-95"
                      >
                        {b.label} →
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
