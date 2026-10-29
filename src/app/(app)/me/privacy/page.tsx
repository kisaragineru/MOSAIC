import Link from "next/link";
import { CardForm } from "@/components/card-form";
import { myCard } from "@/server/services/card";
import type { ReactNode } from "react";
import { PersonLink } from "@/components/person-link";
import { Avatar } from "@/components/avatar";
import { Pill } from "@/components/ui";
import { Page } from "@/components/page";
import { SHARED_TEXT } from "@/content/manual-text";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { avatarUrls } from "@/server/services/avatars";
import { levelOf } from "@/lib/sharing/scope-levels";
import { privacyOverview } from "@/server/services/privacy";
import { myTint, typeTints } from "@/server/services/card";

const CIRCLES = ["partner", "family", "friend", "colleague"] as const;

function Section({ id, title, help, children }: { id: string; title: string; help?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 space-y-3 rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-white/80">
      <div>
        <h2 id={`${id}-title`} className="text-base font-semibold text-stone-900">{title}</h2>
        {help && <p className="mt-1 text-xs leading-5 text-stone-500">{help}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, href, action }: { label: string; value?: ReactNode; href?: string; action?: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="min-w-0 text-sm text-stone-800">{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        {value}
        {href && <Link href={href} className="text-sm font-semibold text-teal-700">{action} →</Link>}
      </span>
    </li>
  );
}

/** Who can see what: every sharing setting in one read-only page, each linking to where it's changed. */
export default async function PrivacyPage() {
  const uid = await requireUser();
  const { t, locale } = await getT();
  const tp = t.privacyHub;
  const o = await privacyOverview(uid);
  const avatars = await avatarUrls(uid, o.connections.map((c) => c.otherId));
  const tints = await typeTints(uid, o.connections.map((c) => c.otherId));
  const scopeList = (s: string[]) => s.map((x) => t.compare.scopeNames[x as keyof typeof t.compare.scopeNames] ?? x).join(t.common.listSeparator);
  // How many connections see how much of my Tử Vi (by what I chose; it shows once they choose too).
  const tuviCounts = (["detail", "tuvi", "none"] as const)
    .map((level) => [level, o.connections.filter((c) => c.iConsented && levelOf("tuvi", c.myScopes) === level).length] as const)
    .filter(([, n]) => n > 0);
  const done = (ok: boolean) => <Pill tone={ok ? "teal" : "stone"}>{ok ? tp.set : tp.notSet}</Pill>;
  return (
    <Page title={tp.title} back="/me">
      <p className="text-sm leading-6 text-stone-600">{tp.intro}</p>

      <Section id="only-you" title={tp.onlyYouTitle} help={tp.onlyYouHelp}>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-stone-700">
          {tp.onlyYou.map((x) => <li key={x}>{x}</li>)}
          <li>{tp.privateRecords(o.records.private)}{t.common.listSeparator}{tp.letters(o.records.letters)}</li>
          <li>{tp.privateAnswers(o.answers.private)}</li>
        </ul>
      </Section>

      <Section id="profile" title={tp.profileTitle} help={tp.profileHelp}>
        <ul className="divide-y divide-stone-100">
          <Row label={tp.name} value={<span className="text-sm font-medium text-stone-900">{o.profile.name}</span>} href="/me" action={tp.change} />
          <Row label={tp.photo} value={done(o.profile.hasPhoto)} href="/me/photo" action={tp.change} />
          <Row label={tp.bio} value={done(o.profile.hasBio)} href="/me#intro" action={tp.change} />
          <Row label={tp.intro2} value={done(o.profile.hasIntro)} href="/me#intro" action={tp.change} />
        </ul>
        <Link href="/me/preview" className="inline-block text-sm font-semibold text-teal-700">👁 {t.me.preview} →</Link>
      </Section>

      <Section id="card" title={`🪪 ${t.card.title}`} help={t.card.lead}>
        <CardForm t={t} items={(await myCard(uid)) ?? []} back="/me/privacy#card" />
      </Section>

      <Section id="records" title={tp.recordsTitle} help={tp.recordsHelp}>
        <ul className="space-y-1 text-sm text-stone-800">
          <li>🌐 {tp.everyone(o.records.everyone)}</li>
          {CIRCLES.filter((c) => o.records.byCircle[c] > 0).map((c) => (
            <li key={c}>👥 {tp.circle(t.people.relationships[c], o.records.byCircle[c])}</li>
          ))}
          <li>🔒 {tp.privateOnly(o.records.private)}</li>
        </ul>
        <Link href="/me/privacy/records" className="inline-block text-sm font-semibold text-teal-700">{tp.bulk} →</Link>
      </Section>

      <Section id="answers" title={tp.answersTitle} help={tp.answersHelp}>
        <p className="text-sm text-stone-800">✅ {tp.answersShared(o.answers.shared.preferences, o.answers.shared.values)}</p>
        <p className="text-sm text-stone-800">🔒 {tp.privateAnswers(o.answers.private)}</p>
        <Link href="/me/privacy/answers" className="inline-block text-sm font-semibold text-teal-700">{tp.bulk} →</Link>
      </Section>

      <Section id="tuvi" title={tp.tuviTitle} help={tp.tuviHelp}>
        <p className="text-sm text-stone-800">{!o.birth.entered ? tp.tuviNone : o.birth.hasChart ? tp.tuviReady : tp.tuviNoChart}</p>
        {tuviCounts.length > 0 && (
          <ul className="space-y-1 text-sm text-stone-800">
            {tuviCounts.map(([level, n]) => <li key={level}>{level === "none" ? "🔒" : "⭐"} {tp.levelCount(t.connectionLevels.tuviLevels[level], n)}</li>)}
          </ul>
        )}
        <Link href="/me/privacy/tuvi" className="inline-block text-sm font-semibold text-teal-700">{tp.bulk} →</Link>
      </Section>

      <Section id="connections" title={tp.connectionsTitle} help={tp.connectionsHelp}>
        {o.connections.length === 0 ? (
          <p className="text-sm text-stone-500">{tp.connectionsNone}</p>
        ) : (
          <ul className="space-y-3">
            {o.connections.map((c) => (
              <li key={c.sessionId} data-testid="privacy-connection" className="rounded-2xl border border-stone-200 p-3">
                <div className="flex items-center gap-3">
                  {c.otherId ? (
                    <PersonLink userId={c.otherId} label={t.replies.openProfile(c.name)}>
                      <Avatar name={c.name} src={avatars.get(c.otherId)} type={tints.get(c.otherId)} className="h-10 w-10 text-base" />
                    </PersonLink>
                  ) : (
                    <Avatar name={c.name} className="h-10 w-10 text-base" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-stone-900">{c.name}</p>
                    {c.relationship && <p className="text-xs text-stone-500">{t.people.relationships[c.relationship as keyof typeof t.people.relationships] ?? c.relationship}</p>}
                  </div>
                  <Link href={c.personId ? `/people/${c.personId}/settings` : `/compare/${c.sessionId}`} className="shrink-0 text-sm font-semibold text-teal-700">{tp.change} →</Link>
                </div>
                {c.status === "pending" ? (
                  <p className="mt-2 text-sm text-amber-800">⏳ {tp.pending}</p>
                ) : (
                  <div className="mt-2 space-y-1 text-sm text-stone-700">
                    <p className="flex flex-wrap items-center gap-1">
                      <span className="text-xs font-semibold text-stone-500">{tp.sharing}</span>
                      {c.sharedScopes.length ? c.sharedScopes.map((s) => <Pill key={s} tone="teal">{scopeList([s])}</Pill>) : <span className="text-stone-500">{tp.nothingShared}</span>}
                    </p>
                    {/* Chosen by you, not (yet) by them: not shared until they choose it too. */}
                    {c.myScopes.some((s) => !c.sharedScopes.includes(s)) && (
                      <p className="flex flex-wrap items-center gap-1" data-testid="privacy-waiting">
                        <span className="text-xs font-semibold text-stone-500">{tp.waiting}</span>
                        {c.myScopes.filter((s) => !c.sharedScopes.includes(s)).map((s) => <Pill key={s} tone="amber">⏳ {scopeList([s])}</Pill>)}
                      </p>
                    )}
                    <p>📘 {c.manualPreset ? tp.manual(SHARED_TEXT.presetName[c.manualPreset as keyof typeof SHARED_TEXT.presetName]?.[locale] ?? c.manualPreset) : tp.manualOff}</p>
                    <p>📖 {tp.recordsVisible(c.recordsVisible)}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="other" title={tp.otherTitle}>
        <ul className="divide-y divide-stone-100">
          <Row label={tp.ai(o.aiOptIn)} href="/settings" action={tp.change} />
          <Row label={tp.links(o.activeLinks)} href="/share" action={tp.see} />
        </ul>
        <p className="text-xs leading-5 text-stone-500">✉️ {tp.dm}</p>
      </Section>
    </Page>
  );
}
