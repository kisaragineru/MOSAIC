import { notFound } from "next/navigation";
import { Card, Page } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { adminStats, devToolsEnabled } from "@/server/services/admin";

/** For the people running MOSAIC: how it's being used, in numbers only (no one's content). */
export default async function AdminPage() {
  const uid = await requireUser();
  const s = await adminStats(uid);
  if (!s) notFound();
  const { t, locale } = await getT();
  const a = t.admin;
  const n = (x: number) => new Intl.NumberFormat(locale).format(x);
  const pct = (x: number, of: number) => (of ? `${Math.round((x / of) * 100)}%` : "—");
  const groups: { title: string; rows: [string, string][] }[] = [
    { title: a.people, rows: [[a.users, n(s.users)], [a.users7, n(s.users_7d)], [a.users30, n(s.users_30d)], [a.active7, n(s.active_7d)], [a.charts, `${n(s.charts)}（${pct(s.charts, s.users)}）`]] },
    { title: a.use, rows: [[a.records7, n(s.records_7d)], [a.answers7, n(s.answers_7d)], [a.messages7, n(s.messages_7d)], [a.connections, n(s.connections)]] },
    { title: a.stories, rows: [[a.works, n(s.works)], [a.links, n(s.links)], [a.opened, `${n(s.links_opened)}（${pct(s.links_opened, s.links)}）`], [a.accepted, n(s.offers_accepted)]] },
  ];
  return (
    <Page title={a.title} back="/settings">
      <p className="text-xs leading-5 text-stone-500">{a.lead}</p>
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
      <Card title={a.access}>
        <p className="text-sm leading-6 text-stone-700">{devToolsEnabled() ? a.devOn : a.devOff}</p>
      </Card>
    </Page>
  );
}
