import { NoticeTray } from "@/components/notice-tray";
import { Page } from "@/components/page";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { noticeItems } from "./items";

/**
 * All the notices in one page (the header's bell): the ones still showing on Home first, then the
 * ones closed but still there to act on, so closing never loses the way to anything.
 */
export default async function NoticesPage() {
  const uid = await requireUser();
  const { t, locale } = await getT();
  const n = t.notices;
  const { all, showing } = await noticeItems(uid, t, locale);
  const open = all.filter((x) => showing.has(x.ref.key));
  const closed = all.filter((x) => !showing.has(x.ref.key)).map((x) => ({ ...x, close: <span /> }));
  return (
    <Page title={n.title}>
      {all.length === 0 ? (
        <p className="rounded-3xl bg-white/80 p-6 text-center text-sm text-stone-600 ring-1 ring-stone-200/60" data-testid="notices-empty">{n.empty}</p>
      ) : (
        <>
          <NoticeTray items={open} labels={{ title: n.title, closeAll: n.closeAll, close: n.close, more: n.more }} all back="/notices" />
          {closed.length > 0 && (
            <section data-testid="notices-closed">
              <h2 className="mb-2 px-1 text-xs font-semibold text-stone-500">{n.closedTitle}</h2>
              <NoticeTray items={closed} labels={{ title: n.closedTitle, closeAll: "", close: n.close, more: n.more }} all quiet />
            </section>
          )}
        </>
      )}
    </Page>
  );
}
