import Link from "next/link";
import { createMemoryAction } from "@/app/actions/memories";
import { Flash } from "@/components/flash";
import { Button, Card, LinkButton, Page, Pill, Textarea } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount, getNotificationPrefs } from "@/server/services/account";
import { getDaily } from "@/server/services/discovery";
import { listMemories } from "@/server/services/memories";
import { upcomingDates } from "@/server/services/people";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const account = await getAccount(uid);
  const daily = await getDaily(uid);
  const dates = await upcomingDates(uid, 60);
  const recent = await listMemories(uid, { limit: 5 });
  const first = daily.slots[0];
  const due = dates.filter((d) => d.reminderDue);
  const np = await getNotificationPrefs(uid);
  const questionReminder = np.dailyQuestion && !!first && !first.doneToday;
  return (
    <Page title={t.home.hello(account.profile.displayName)}>
      <Flash t={t} sp={sp} />
      {(due.length > 0 || questionReminder) && (
        <Card title={t.home.reminders} className="border-amber-200 bg-amber-50">
          <ul className="space-y-1 text-sm">
            {questionReminder && (
              <li>
                🔔 <Link href="/discover" className="underline">{t.home.todayQuestion}</Link>
              </li>
            )}
            {due.map((d) => (
              <li key={d.id}>
                🔔 {d.label}{d.personName ? ` · ${d.personName}` : ""} — {d.date} ({t.home.inDays(d.daysUntil)})
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card title={t.home.todayQuestion}>
        {first ? (
          <div className="space-y-3">
            <p className="text-lg text-stone-900">{first.question.prompt[locale]}</p>
            {first.doneToday ? <Pill tone="teal">{t.home.doneToday}</Pill> : <LinkButton href="/discover" variant="primary">{t.home.answerNow}</LinkButton>}
          </div>
        ) : (
          <p className="text-sm text-stone-500">{t.discover.noQuestion}</p>
        )}
      </Card>
      <Card title={t.home.quickNote}>
        <form action={createMemoryAction} className="space-y-2">
          <input type="hidden" name="back" value="/home" />
          <input type="hidden" name="stay" value="1" />
          <input type="hidden" name="kind" value="thought" />
          <Textarea name="body" required rows={3} placeholder={t.home.quickNotePlaceholder} aria-label={t.home.quickNote} />
          <div className="flex justify-between">
            <Link href="/memories/new" className="text-sm text-teal-700 underline">{t.memories.new} →</Link>
            <Button type="submit">{t.common.save}</Button>
          </div>
        </form>
      </Card>
      <Card title={t.home.upcoming}>
        {dates.length === 0 ? (
          <p className="text-sm text-stone-500">{t.home.noUpcoming}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {dates.map((d) => (
              <li key={d.id} className="flex justify-between gap-2">
                <span>{d.label}{d.personName ? ` · ${d.personName}` : ""} {d.years !== null && t.home.turning(d.years)}</span>
                <span className="shrink-0 text-stone-500">{t.home.inDays(d.daysUntil)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t.home.recent}>
        {recent.length === 0 ? (
          <p className="text-sm text-stone-500">{t.memories.empty}</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {recent.map((m) => (
              <li key={m.id}>
                <Link href={`/memories/${m.id}`} className="block py-2">
                  <Pill>{t.memories.kinds[m.kind]}</Pill>{" "}
                  <span className="text-sm text-stone-800">{m.sealed ? t.memories.sealed(m.revealOn!) : (m.title ?? m.body ?? "").slice(0, 80)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  );
}
