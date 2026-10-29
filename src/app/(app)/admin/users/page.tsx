import Link from "next/link";
import { notFound } from "next/navigation";
import { setBetaAction } from "@/app/actions/admin";
import { ResetLinkButton } from "@/components/reset-link-button";
import { Avatar } from "@/components/avatar";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { Empty, Pill } from "@/components/ui";
import { Page } from "@/components/page";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { adminUsers, betaGroupFor } from "@/server/services/admin";

/** Everyone signed up (admins only), and who the beta testers are. */
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const all = await adminUsers(uid);
  if (!all) notFound();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const a = t.admin;
  const q = (sp.q ?? "").trim().toLowerCase();
  const showTest = sp.test === "1";
  const list = all.filter((u) => (showTest || !u.test) && (!q || (u.name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  const betaN = all.filter((u) => u.beta).length;
  // The beta testers' group, when this admin is in it.
  const group = await betaGroupFor(uid);
  const day = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);
  const here = `/admin/users${showTest || q ? `?${new URLSearchParams({ ...(q ? { q } : {}), ...(showTest ? { test: "1" } : {}) })}` : ""}`;
  return (
    <Page title={a.usersTitle} back="/admin">
      <Flash t={t} sp={sp} />
      <p className="text-xs leading-5 text-stone-500">{a.usersLead}</p>
      <section className="rounded-3xl bg-gradient-to-br from-violet-50 to-teal-50 p-4 ring-1 ring-violet-100" data-testid="beta-summary">
        <p className="font-bold text-stone-900">β {a.betaCount(betaN)}</p>
        <p className="mt-1 text-xs leading-5 text-stone-600">{a.betaHelp}</p>
        {group && <Link href={`/messages/${group}`} className="mt-2 inline-block text-sm font-semibold text-violet-800 underline underline-offset-4">💬 {a.openGroup} →</Link>}
      </section>
      <form className="flex gap-2" role="search">
        <input name="q" defaultValue={sp.q ?? ""} placeholder={a.search} aria-label={a.search} className="min-w-0 flex-1 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm focus:border-teal-500 focus:outline-none" />
        {showTest && <input type="hidden" name="test" value="1" />}
        <button type="submit" className="shrink-0 rounded-full bg-stone-800 px-4 py-2 text-sm font-bold text-white">{a.searchGo}</button>
      </form>
      <Link href={showTest ? `/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}` : `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), test: "1" })}`} className="text-xs font-semibold text-teal-700 underline underline-offset-4">
        {showTest ? a.hideTest : a.showTest}
      </Link>
      {list.length === 0 ? (
        <Empty>{a.noUsers}</Empty>
      ) : (
        <ul className="space-y-2" data-testid="admin-users">
          {list.map((u) => (
            <li key={u.id} className="rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-stone-100" data-testid="admin-user">
              <div className="flex items-start gap-3">
                <Avatar name={u.name ?? "?"} className="h-10 w-10 text-base" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-semibold text-stone-900">{u.name ?? "—"}</span>
                    {u.beta && <Pill tone="violet">β {a.beta}</Pill>}
                    {u.test && <Pill>{a.testBadge}</Pill>}
                  </p>
                  <p className="truncate text-xs text-stone-500">{u.email}</p>
                  <p className="mt-1 text-xs text-stone-500">{a.joined(day(u.createdAt))} · {u.lastSeen ? a.lastSeen(day(u.lastSeen)) : a.never}</p>
                  <p className="text-xs text-stone-500">{a.counts(u.records, u.connections)}</p>
                </div>
              </div>
              {!u.test && !u.email.endsWith(".invalid") && (
                <div className="mt-2 flex justify-end">
                  <ResetLinkButton userId={u.id} text={{ make: a.resetMake, note: a.resetNote, copy: a.copy, copied: a.copied, failed: a.resetFailed }} />
                </div>
              )}
              {!u.test && (
                <form action={setBetaAction} className="mt-2 flex justify-end">
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="on" value={u.beta ? "0" : "1"} />
                  <input type="hidden" name="back" value={here} />
                  {u.beta ? (
                    <ConfirmButton quiet message={a.unBetaConfirm} className="min-h-8 px-3 py-1 text-xs">{a.unBeta}</ConfirmButton>
                  ) : (
                    <button type="submit" className="rounded-full bg-violet-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-800">β {a.makeBeta}</button>
                  )}
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
