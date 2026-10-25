import { Shippori_Mincho } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand";
import { PrintButton } from "@/components/print-button";
import { AXES, AXIS_CHAPTER, AXIS_CHAPTERS, AXIS_LABEL, CHAPTER_INFO, PEER_POLES } from "@/content/axes";
import { ageAt } from "@/lib/gift-dates";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { readGiftBox, type GiftEntry } from "@/server/services/gift-boxes";

// A book face for the gift: Mincho for Japanese, with latin and Vietnamese glyphs.
const mincho = Shippori_Mincho({ weight: ["400", "600"], subsets: ["latin", "latin-ext"], display: "swap", preload: false });

const fmtDate = (d: string, locale: string) => {
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  return locale === "ja" ? `${y}年${m}月${day}日` : locale === "vi" ? `${day}/${m}/${y}` : d;
};

/** The gift box as an A5 book: cover, introduction, growth by age, how each writer saw the child, letters, closing. */
export default async function GiftBookPage({ params }: { params: Promise<{ id: string }> }) {
  const uid = await requireUser();
  const { id } = await params;
  const { t, locale } = await getT();
  const g = t.giftBox;
  const b = g.book;
  const box = await readGiftBox(uid, id).catch(() => null);
  if (!box) notFound();
  const everything = box.my_role === "child" || (box.my_role === "owner" && box.delivered_via === "pdf");
  const writerName = (userId: string) => {
    const w = box.writers.find((x) => x.user_id === userId);
    return w ? w.label ?? g.roles[w.role] : "";
  };
  const writers = box.writers.filter((w) => !w.removed || box.entries.some((e) => e.author_id === w.user_id));
  const names = writers.map((w) => w.label ?? g.roles[w.role]).join(locale === "ja" ? "・" : ", ");
  const growth = box.entries.filter((e) => e.kind === "growth");
  const letters = box.entries.filter((e) => e.kind === "letter");
  // Growth grouped by the child's age at the time (or by year without a birthday).
  const groups = new Map<string, GiftEntry[]>();
  for (const e of growth) {
    const age = ageAt(box.child_birthday, e.occurred_on);
    const key = age ? b.atAge(age.y) : e.occurred_on ? e.occurred_on.slice(0, 4) : b.undated;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const views = box.views.filter((v) => Object.keys(v.answers).length > 0 || v.comment);
  // Only the axes someone answered (a "neither" counts as an answer).
  const answeredIn = (ch: (typeof AXIS_CHAPTERS)[number]) => AXES.filter((k) => AXIS_CHAPTER[k] === ch && views.some((v) => v.answers[k] !== undefined));
  const deliverDate = box.delivered_at ? box.delivered_at.slice(0, 10) : box.deliver_on;
  const chapters = [
    growth.length ? { id: "growth", title: b.growthTitle } : null,
    views.length ? { id: "views", title: b.viewTitle(box.child_name) } : null,
    letters.length ? { id: "letters", title: b.lettersTitle } : null,
  ].filter(Boolean) as { id: string; title: string }[];

  return (
    <main className={`book mx-auto w-full max-w-2xl space-y-6 px-4 pb-28 pt-4 print:max-w-none print:space-y-0 print:p-0 ${mincho.className}`}>
      <div className="flex flex-wrap items-center gap-3 font-sans print:hidden">
        <Link href={box.my_role === "child" ? "/gifts" : `/gifts/${box.id}`} className="rounded-full px-2 py-1 text-stone-500 hover:bg-stone-200" aria-label="Back">←</Link>
        <p className="flex-1 text-xs leading-5 text-stone-500">{b.saveHelp}</p>
        <PrintButton label={b.save} />
      </div>
      {!everything && <p className="rounded-2xl bg-amber-50 px-4 py-3 font-sans text-xs text-amber-900 print:hidden">{box.status === "open" ? b.preview : b.copy}</p>}

      {/* Cover */}
      <section className="book-sheet relative mx-auto flex aspect-[148/210] w-full max-w-md flex-col items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-sky-100 via-white to-rose-100 p-10 text-center shadow-[0_20px_50px_-20px_rgba(60,60,120,0.35)]">
        <div aria-hidden className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-amber-200/50 blur-2xl" />
        <div aria-hidden className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-violet-200/50 blur-2xl" />
        <BrandMark className="relative h-20 w-20" />
        <h1 className="relative mt-8 text-4xl font-semibold tracking-wide text-[#2e3a4b]">{b.to(box.child_name)}</h1>
        <p className="relative mt-4 text-base text-stone-600">{b.from(names)}</p>
        <p className="relative mt-10 text-sm tracking-widest text-stone-500">{fmtDate(deliverDate, locale)}</p>
        <p className="absolute bottom-6 font-sans text-[10px] tracking-[0.35em] text-stone-400">MOSAIC</p>
      </section>

      {/* Introduction and contents */}
      <section className="book-sheet mx-auto flex aspect-[148/210] w-full max-w-md flex-col justify-center rounded-2xl bg-white p-10 shadow-sm">
        <p aria-hidden className="text-center text-amber-600">❦</p>
        <h2 className="mt-3 text-center text-xl font-semibold text-[#2e3a4b]">{b.introTitle}</h2>
        <p className="mt-6 leading-9 text-stone-800">{b.intro(box.child_name, names)}</p>
        <p className="mt-3 leading-9 text-stone-800">{b.intro2}</p>
        {chapters.length > 0 && (
          <div className="mt-10">
            <p className="text-center text-xs tracking-[0.3em] text-stone-500">{b.contents}</p>
            <ol className="mt-3 space-y-2 text-sm">
              {chapters.map((c, i) => (
                <li key={c.id} className="flex items-baseline gap-2 border-b border-dotted border-stone-300 pb-1">
                  <span className="text-amber-700">{i + 1}.</span>
                  <a href={`#ch-${c.id}`} className="text-stone-800">{c.title}</a>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {growth.length > 0 && (
        <section id="ch-growth" className="book-flow mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
          <ChapterHead n={1} title={b.growthTitle} lead={b.growthLead(box.child_name)} />
          {[...groups.entries()].map(([label, list]) => (
            <div key={label} className="mt-8">
              <h3 className="mb-4 flex items-center gap-3 text-sm font-semibold tracking-widest text-amber-800">
                <span className="h-px flex-1 bg-amber-200" />{label}<span className="h-px flex-1 bg-amber-200" />
              </h3>
              <ol className="relative space-y-5 border-l border-sky-200 pl-5">
                {list.map((e) => (
                  <li key={e.id} className="book-entry relative">
                    <span aria-hidden className="absolute -left-[25px] top-2 h-2.5 w-2.5 rounded-full bg-sky-400 ring-4 ring-white" />
                    <p className="font-sans text-[11px] text-stone-500">{e.occurred_on ? fmtDate(e.occurred_on, locale) : ""}</p>
                    {e.title && <p className="emoji-color mt-0.5 text-lg font-semibold text-[#2e3a4b]">{e.title}</p>}
                    <p className="emoji-color mt-1 whitespace-pre-line leading-8 text-stone-800">{e.body}</p>
                    <p className="mt-1 text-right text-xs text-stone-500">— {writerName(e.author_id)}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}

      {views.length > 0 && (
        <section id="ch-views" className="book-flow mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
          <ChapterHead n={growth.length ? 2 : 1} title={b.viewTitle(box.child_name)} lead={b.viewLead(box.child_name)} />
          {AXIS_CHAPTERS.filter((ch) => answeredIn(ch).length > 0).map((ch) => (
            <div key={ch} className="book-entry mt-6">
              <p className="mb-2 font-sans text-xs font-semibold text-violet-700">{CHAPTER_INFO[ch].icon} {CHAPTER_INFO[ch].title[locale]}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="font-sans text-[10px] text-stone-500">
                    <th className="w-20 pb-1 text-left font-normal" />
                    {views.map((v) => <th key={v.author_id} className="pb-1 text-left font-normal">{writerName(v.author_id)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {answeredIn(ch).map((k) => (
                    <tr key={k} className="border-t border-stone-100 align-top">
                      <td className="py-1.5 pr-2 font-sans text-[11px] text-stone-500">{AXIS_LABEL[k].name[locale]}</td>
                      {views.map((v) => {
                        const a = v.answers[k];
                        return <td key={v.author_id} className="py-1.5 pr-2 leading-6 text-stone-800">{a === 1 ? PEER_POLES[k].pos[locale] : a === -1 ? PEER_POLES[k].neg[locale] : a === 0 ? "—" : ""}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {views.filter((v) => v.comment).map((v) => (
            <blockquote key={v.author_id} className="book-entry mt-6 border-l-2 border-rose-200 pl-4 leading-8 text-stone-800">
              {v.comment}
              <footer className="mt-1 text-right text-xs text-stone-500">— {writerName(v.author_id)}</footer>
            </blockquote>
          ))}
        </section>
      )}

      {letters.map((e, i) => (
        <section key={e.id} id={i === 0 ? "ch-letters" : undefined} className="book-sheet mx-auto flex aspect-[148/210] w-full max-w-md flex-col rounded-2xl bg-[#fffdf7] p-10 shadow-sm ring-1 ring-amber-100">
          {i === 0 && <p className="mb-4 text-center font-sans text-[10px] tracking-[0.35em] text-amber-700">{chapters.findIndex((c) => c.id === "letters") + 1}. {b.lettersTitle}</p>}
          <p className="text-lg text-[#2e3a4b]">{b.to(box.child_name)}</p>
          {e.title && <p className="emoji-color mt-2 text-sm text-stone-500">{e.title}</p>}
          <div className="mt-6 flex-1 overflow-hidden whitespace-pre-line bg-[linear-gradient(transparent_calc(2rem-1px),#f1e6cf_calc(2rem-1px))] bg-size-[100%_2rem] leading-8 text-stone-800">{e.body}</div>
          <p className="mt-6 text-right text-stone-700">{b.letterFrom(writerName(e.author_id))}</p>
          {e.occurred_on && <p className="text-right font-sans text-[11px] text-stone-400">{fmtDate(e.occurred_on, locale)}</p>}
        </section>
      ))}

      {growth.length + views.length + letters.length === 0 && <p className="text-center text-sm text-stone-500 print:hidden">{b.empty}</p>}

      {/* Closing */}
      <section className="book-sheet mx-auto flex aspect-[148/210] w-full max-w-md flex-col items-center justify-center rounded-2xl bg-linear-to-b from-white to-sky-50 p-10 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-[#2e3a4b]">{b.closingTitle}</h2>
        <p className="mt-6 leading-9 text-stone-700">{b.closing(box.child_name)}</p>
        <BrandMark className="mt-12 h-10 w-10 opacity-80" />
        <p className="mt-2 font-sans text-[10px] tracking-[0.35em] text-stone-400">MOSAIC</p>
      </section>
    </main>
  );
}

function ChapterHead({ n, title, lead }: { n: number; title: string; lead: string }) {
  return (
    <header className="text-center">
      <p className="font-sans text-[10px] tracking-[0.35em] text-amber-700">CHAPTER {n}</p>
      <h2 className="mt-2 text-2xl font-semibold text-[#2e3a4b]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-stone-600">{lead}</p>
      <p aria-hidden className="mt-3 text-amber-600">❦</p>
    </header>
  );
}
