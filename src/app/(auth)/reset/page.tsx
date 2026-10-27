import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/reset-form";
import { Card } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

/** Setting a new password from a one-time link (its token is after "#", read in the page). */
export default async function ResetPage() {
  const { t, locale } = await getT();
  const a = t.auth;
  return (
    <AuthShell t={t} locale={locale} back="/reset">
      <Card title={a.resetTitle}>
        <ResetForm text={{ password: a.resetPassword, hint: a.passwordHint, submit: a.resetSubmit, noLink: a.resetNoLink, errors: t.errors as Record<string, string> }} />
      </Card>
    </AuthShell>
  );
}
