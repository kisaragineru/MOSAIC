import Link from "next/link";
import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions/auth";
import { safeNext } from "@/app/actions/util";
import { AuthShell } from "@/components/auth-shell";
import { Flash } from "@/components/flash";
import { Button, Card, Field, Input, Notice, Select } from "@/components/ui";
import { LOCALE_NAMES, SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { currentUserId } from "@/server/auth/session";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await currentUserId()) redirect(next);
  const { t, locale } = await getT();
  return (
    <AuthShell t={t} locale={locale} back={`/register?next=${encodeURIComponent(next)}`}>
      <Card title={t.auth.registerTitle}>
        <form action={registerAction} className="space-y-3">
          <Flash t={t} sp={sp} />
          <input type="hidden" name="next" value={next} />
          <Field label={t.auth.displayName}>
            <Input name="displayName" autoComplete="nickname" required maxLength={80} />
          </Field>
          <Field label={t.auth.email}>
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label={t.auth.password} hint={t.auth.passwordHint}>
            <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
          </Field>
          <Field label={t.common.language}>
            <Select name="locale" defaultValue={locale}>
              {SUPPORTED_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
            </Select>
          </Field>
          <Notice>{t.auth.privacyNote}</Notice>
          <Button type="submit" className="w-full">{t.auth.submitRegister}</Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link className="text-teal-700 underline" href={`/login?next=${encodeURIComponent(next)}`}>{t.auth.haveAccount}</Link>
        </p>
      </Card>
    </AuthShell>
  );
}
