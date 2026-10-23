import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { safeNext } from "@/app/actions/util";
import { AuthShell } from "@/components/auth-shell";
import { Flash } from "@/components/flash";
import { Button, Card, Field, Input } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { currentUserId } from "@/server/auth/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await currentUserId()) redirect(next);
  const { t, locale } = await getT();
  return (
    <AuthShell t={t} locale={locale} back={`/login?next=${encodeURIComponent(next)}`}>
      <Card title={t.auth.loginTitle}>
        <form action={loginAction} className="space-y-3">
          <Flash t={t} sp={sp} />
          <input type="hidden" name="next" value={next} />
          <Field label={t.auth.email}>
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label={t.auth.password}>
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Button type="submit" className="w-full">{t.auth.submitLogin}</Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link className="text-teal-700 underline" href={`/register?next=${encodeURIComponent(next)}`}>{t.auth.noAccount}</Link>
        </p>
      </Card>
    </AuthShell>
  );
}
