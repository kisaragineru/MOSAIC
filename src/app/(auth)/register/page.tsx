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
import { invitedThrough, registrationCodeRequired } from "@/server/services/account";
import { InviteField } from "@/components/invite-field";
import Script from "next/script";
import { headers } from "next/headers";
import { formStamp, HONEYPOT, turnstileSiteKey } from "@/server/auth/human";
import { enabledProviders } from "@/server/auth/oauth";
import { OAuthButtons } from "@/components/oauth-buttons";
import { trialAccount, trialReturnUser } from "@/server/services/dev-trial";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await currentUserId()) redirect(next);
  const { t, locale } = await getT();
  // Development: trying sign-up from settings, with a throwaway account filled in.
  const trial = (await trialReturnUser()) ? trialAccount(locale) : null;
  const turnstile = trial ? null : turnstileSiteKey();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Came from a story link someone gave them (and it's still open): that link is the invitation.
  const w = /^\/w\/([A-Za-z0-9_-]{16,64})/.exec(next)?.[1];
  const work = w && (await invitedThrough(`work:${w}`)) ? `work:${w}` : null;
  return (
    <AuthShell t={t} locale={locale} back={`/register?next=${encodeURIComponent(next)}`} trial={!!trial}>
      <Card title={t.auth.registerTitle}>
        <form action={registerAction} className="space-y-3">
          <Flash t={t} sp={sp} />
          <input type="hidden" name="next" value={next} />
          {/* For people nothing to fill: a field only bots see, and when the form was shown. */}
          <input type="hidden" name="shown" value={formStamp()} />
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input name={HONEYPOT} tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>
          {trial && <Notice>{t.trial.registerNote}</Notice>}
          {!trial && (
            <InviteField
              work={work}
              codeRequired={registrationCodeRequired()}
              fromShare={next === "/s"}
              forceCode={sp.e === "invite_required"}
              text={{ label: t.auth.inviteCode, hint: t.auth.inviteHint, invited: t.auth.invited }}
            />
          )}
          {/* Google / Facebook first: the quickest way in. The invite code above applies to them too. */}
          <OAuthButtons providers={trial ? [] : enabledProviders()} next={next} from="register" labels={{ google: t.auth.continueGoogle, facebook: t.auth.continueFacebook, or: t.auth.orEmail }} />
          <Field label={t.auth.displayName}>
            <Input name="displayName" autoComplete="nickname" required maxLength={80} defaultValue={trial?.displayName} />
          </Field>
          <Field label={t.auth.email}>
            <Input name="email" type="email" autoComplete="email" required defaultValue={trial?.email} readOnly={!!trial} />
          </Field>
          <Field label={t.auth.password} hint={t.auth.passwordHint}>
            <Input name="password" type="password" autoComplete="new-password" minLength={10} required defaultValue={trial?.password} />
          </Field>
          <Field label={t.common.language}>
            <Select name="locale" defaultValue={locale}>
              {SUPPORTED_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
            </Select>
          </Field>
          {turnstile && (
            <>
              <div className="cf-turnstile" data-sitekey={turnstile} data-language={locale} data-testid="turnstile" />
              <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" nonce={nonce} />
            </>
          )}
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
