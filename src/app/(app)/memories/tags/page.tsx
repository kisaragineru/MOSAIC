import Link from "next/link";
import { Flash } from "@/components/flash";
import { Page } from "@/components/page";
import { Empty } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { tagHref } from "@/lib/tag-href";
import { requireUser } from "@/server/auth/session";
import { listTags } from "@/server/services/memories";

type Sort = "count" | "recent" | "name";
/** Five sizes, by how often a tag is used compared with the most used one. */
const SIZES = ["text-sm", "text-base", "text-lg", "text-xl", "text-2xl"];

/** All my tags at a glance, the most used the biggest; each opens its own page. */
export default async function TagsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const tt = t.memories.tags;
  const sort: Sort = sp.sort === "recent" || sp.sort === "name" ? sp.sort : "count";
  const tags = await listTags(uid);
  const most = Math.max(1, ...tags.map((x) => x.n));
  const size = (n: number) => SIZES[Math.min(SIZES.length - 1, Math.floor((Math.log(n) / Math.log(most + 1)) * SIZES.length))]!;
  const shown = [...tags].sort((a, b) =>
    sort === "name" ? a.tag.localeCompare(b.tag, locale) : sort === "recent" ? b.last.localeCompare(a.last) || b.n - a.n : b.n - a.n || a.tag.localeCompare(b.tag, locale),
  );
  return (
    <Page title={tt.cloudTitle} back="/memories">
      <Flash t={t} sp={sp} />
      <p className="text-sm leading-6 text-stone-600">{tt.cloudHelp}</p>
      {tags.length === 0 ? (
        <Empty>{tt.empty}</Empty>
      ) : (
        <>
          <nav aria-label={tt.cloudTitle} className="flex gap-2">
            {(["count", "recent", "name"] as const).map((k) => (
              <Link
                key={k}
                href={k === "count" ? "/memories/tags" : `/memories/tags?sort=${k}`}
                aria-current={sort === k ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${sort === k ? "bg-teal-700 text-white" : "bg-white/90 text-stone-700 ring-1 ring-stone-200"}`}
              >
                {tt.sort[k]}
              </Link>
            ))}
          </nav>
          <ul className="flex flex-wrap items-baseline gap-x-3 gap-y-2 rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-white/80" data-testid="tag-cloud">
            {shown.map((x) => (
              <li key={x.tag}>
                <Link href={tagHref(x.tag)} className={`${size(x.n)} font-semibold text-teal-800 hover:underline`}>
                  #{x.tag}
                  <span className="ml-0.5 align-super text-[10px] font-normal text-stone-400">{x.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Page>
  );
}
