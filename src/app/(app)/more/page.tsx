import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { Button, Card, Page } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export default async function MorePage() {
  const { t } = await getT();
  const links = [
    ["/me", t.nav.me],
    ["/tuvi", t.nav.tuvi],
    ["/insights", t.nav.insights],
    ["/discover/history", t.nav.history],
    ["/share", t.nav.share],
    ["/settings", t.nav.settings],
  ];
  return (
    <Page title={t.nav.more}>
      <Card>
        <ul className="divide-y divide-stone-100">
          {links.map(([href, label]) => (
            <li key={href}>
              <Link href={href!} className="block py-3 text-stone-800 hover:text-teal-700">{label} →</Link>
            </li>
          ))}
        </ul>
      </Card>
      <form action={logoutAction}>
        <Button variant="secondary" className="w-full">{t.nav.logout}</Button>
      </form>
    </Page>
  );
}
