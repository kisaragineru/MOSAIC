import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { Page } from "@/components/page";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { adminStats, devToolsEnabled, devToolsFor } from "@/server/services/admin";
import { Flash } from "@/components/flash";
import { DevTools } from "./dev-tools";
import { VapidKeygen } from "@/components/vapid-keygen";
import { pushConfigured } from "@/server/services/push";
import { getAccount } from "@/server/services/account";
import { launchChecklist } from "@/server/services/launch";

/** For the people running MOSAIC: how it's being used, in numbers only (no one's content). */
export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const s = await adminStats(uid);
  const dev = await devToolsFor(uid);
  if (!s && !dev) notFound();
  const { t, locale } = await getT();
  const a = t.admin;
  const n = (x: number) => new Intl.NumberFormat(locale).format(x);
  const pct = (x: number, of: number) => (of ? `${Math.round((x / of) * 100)}%` : "—");
  const groups: { title: string; rows: [string, string][] }[] = !s ? [] : [
    { title: a.people, rows: [[a.users, n(s.users)], [a.users7, n(s.users_7d)], [a.users30, n(s.users_30d)], [a.active7, n(s.active_7d)], [a.charts, `${n(s.charts)}（${pct(s.charts, s.users)}）`]] },
    { title: a.use, rows: [[a.records7, n(s.records_7d)], [a.answers7, n(s.answers_7d)], [a.messages7, n(s.messages_7d)], [a.connections, n(s.connections)]] },
    { title: a.stories, rows: [[a.works, n(s.works)], [a.links, n(s.links)], [a.opened, `${n(s.links_opened)}（${pct(s.links_opened, s.links)}）`], [a.accepted, n(s.offers_accepted)]] },
  ];
  return (
    <Page title={a.title} back="/settings">
      <Flash t={t} sp={sp} />
      {s && <p className="text-xs leading-5 text-stone-500">{a.lead}</p>}
      {s && (
        <Link href="/admin/users" className="flex items-center justify-between rounded-3xl bg-white/90 px-5 py-4 shadow-sm ring-1 ring-violet-100 hover:ring-violet-300">
          <span>
            <span className="block font-bold text-stone-900">👥 {a.usersLink}</span>
            <span className="block text-xs text-stone-500">{a.usersLinkSub}</span>
          </span>
          <span aria-hidden className="text-violet-700">→</span>
        </Link>
      )}
      {groups.map((g) => (
        <Card key={g.title} title={g.title}>
          <dl className="divide-y divide-stone-100" data-testid="admin-stats">
            {g.rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-sm text-stone-600">{k}</dt>
                <dd className="text-lg font-bold tabular-nums text-stone-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
      {s && (
        <Card title={`🚀 ${a.launchTitle}`}>
          <p className="mb-3 text-xs leading-5 text-stone-500">{a.launchLead}</p>
          <ul className="space-y-2" data-testid="launch-checklist">
            {launchChecklist().map((x) => (
              <li key={x.key} className="flex gap-2 text-sm">
                <span aria-hidden className="shrink-0">{x.ok ? "✅" : x.required ? "⬜" : "➖"}</span>
                <span className="min-w-0">
                  <span className="block font-semibold text-stone-900">{a.launch[x.key].label}{!x.required && <span className="ml-1 text-xs font-normal text-stone-400">（{a.launchOptional}）</span>}</span>
                  {!x.ok && <span className="block text-xs leading-5 text-stone-500">{a.launch[x.key].todo}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {s && (
        <Card title={`🔔 ${a.pushTitle}`}>
          <p className="mb-3 text-sm leading-6 text-stone-700" data-testid="push-status">{pushConfigured() ? `✅ ${a.pushOn}` : a.pushOff}</p>
          <VapidKeygen text={{ make: a.vapidMake, again: a.vapidAgain, publicLabel: a.vapidPublic, privateLabel: a.vapidPrivate, subjectLabel: a.vapidSubject, subjectValue: `mailto:${(await getAccount(uid)).email}`, copy: a.copy, copied: a.copied, warning: a.vapidWarning, failed: a.vapidFailed }} />
        </Card>
      )}
      {s && (
        <Card title={a.access}>
          <p className="text-sm leading-6 text-stone-700">{devToolsEnabled() ? a.devOn : a.devOff}</p>
        </Card>
      )}
      {/* Trying sign-up, the faces, test companions: here with the other tools for running MOSAIC. */}
      {dev && <DevTools t={t} uid={uid} />}
    </Page>
  );
}
