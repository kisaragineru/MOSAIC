import Link from "next/link";
import { forgotAction } from "@/app/actions/password";
import { AuthShell } from "@/components/auth-shell";
import { Flash } from "@/components/flash";
import { Button, Card, Field, Input, Notice } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { enabledProviders } from "@/server/auth/oauth";
import { mailConfigured } from "@/server/mail";

/** Forgot the password: a link by email when email is set up; otherwise the other ways back in. */
export default async function ForgotPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const a = t.auth;
  const contact = process.env.CONTACT_EMAIL?.trim() || null;
  return (
    <AuthShell t={t} locale={locale} back="/forgot">
      <Card title={a.forgotTitle}>
        <Flash t={t} sp={sp} />
        {sp.sent ? (
          <Notice kind="success">{a.forgotSent}</Notice>
        ) : mailConfigured() ? (
          <form action={forgotAction} className="space-y-3">
            <p className="text-sm leading-6 text-stone-600">{a.forgotLead}</p>
            <Field label={a.email}>
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Button type="submit" className="w-full">{a.forgotSend}</Button>
          </form>
        ) : (
          <div className="space-y-3 text-sm leading-6 text-stone-700" data-testid="forgot-other-ways">
            <p>{a.forgotNoMail}</p>
            {enabledProviders().includes("google") && <p>• {a.forgotGoogle}</p>}
            <p>• {contact ? a.forgotContact(contact) : a.forgotContactNone}</p>
          </div>
        )}
        <p className="mt-4 text-center text-sm">
          <Link className="text-teal-700 underline" href="/login">{a.backToLogin}</Link>
        </p>
      </Card>
    </AuthShell>
  );
}
