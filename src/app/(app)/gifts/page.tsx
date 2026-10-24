import Link from "next/link";
import { createGiftBoxAction, joinGiftBoxAction, receiveGiftAction } from "@/app/actions/gift-boxes";
import { Flash } from "@/components/flash";
import { Button, Card, Empty, Field, Input, Page, Select } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { GIFT_ROLES } from "@/server/db/schema";
import { myGiftBoxes } from "@/server/services/gift-boxes";
import { daysUntil, todayIso } from "@/lib/gift-dates";

const today = todayIso;

export default async function GiftsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t } = await getT();
  const g = t.giftBox;
  const boxes = await myGiftBoxes(uid);
  const writing = boxes.filter((b) => b.my_role !== "child");
  const received = boxes.filter((b) => b.my_role === "child");
  return (
    <Page title={`🎁 ${g.title}`} back="/me">
      <Flash t={t} sp={sp} />
      <p className="text-sm leading-7 text-stone-600">{g.intro}</p>

      {received.length > 0 && (
        <Card title={g.received}>
          <ul className="space-y-2">
            {received.map((b) => (
              <li key={b.id}>
                <Link href={`/gifts/${b.id}`} className="flex items-center justify-between rounded-2xl bg-linear-to-br from-amber-50 to-rose-50 px-4 py-3 ring-1 ring-amber-100">
                  <span className="font-semibold text-stone-900">🎁 {g.forChild(b.child_name)}</span>
                  <span className="text-xs text-stone-500">{b.delivered_at ? g.receivedOn(new Date(b.delivered_at).toISOString().slice(0, 10)) : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title={g.mine}>
        {writing.length === 0 ? (
          <Empty>{g.none}</Empty>
        ) : (
          <ul className="space-y-2">
            {writing.map((b) => {
              const left = daysUntil(b.deliver_on);
              return (
                <li key={b.id}>
                  <Link href={`/gifts/${b.id}`} className="block rounded-2xl border border-stone-200 bg-white/85 px-4 py-3 transition hover:border-teal-300 hover:shadow-sm">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-stone-900">{g.forChild(b.child_name)}</span>
                      {b.my_role === "owner" && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800">{g.owner}</span>}
                    </span>
                    <span className="mt-1 block text-xs text-stone-500">
                      {b.status === "delivered" ? g.deliveredOn(new Date(b.delivered_at!).toISOString().slice(0, 10)) : `${g.deliverOnText(b.deliver_on)} · ${g.daysLeft(left)}`} · {g.writers} {b.writers}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title={`＋ ${g.create}`}>
        <form action={createGiftBoxAction} className="space-y-3">
          <Field label={g.childName}><Input name="childName" required maxLength={60} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={g.childBirthday}><Input type="date" name="childBirthday" max={today()} /></Field>
            <Field label={g.deliverOn} hint={g.deliverHelp}><Input type="date" name="deliverOn" required min={today()} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={g.myRole}>
              <Select name="role" defaultValue="mother">
                {GIFT_ROLES.map((r) => <option key={r} value={r}>{g.roles[r]}</option>)}
              </Select>
            </Field>
            <Field label={g.myLabel}><Input name="label" maxLength={20} /></Field>
          </div>
          <Button type="submit">{g.create}</Button>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title={g.join}>
          <p className="mb-2 text-xs text-stone-500">{g.joinHelp}</p>
          <form action={joinGiftBoxAction} className="space-y-2">
            <Field label={g.code}><Input name="code" required autoComplete="off" placeholder="XXXX-XXXX-XXXX" /></Field>
            <Field label={g.myLabel}><Input name="label" maxLength={20} /></Field>
            <Button type="submit" variant="secondary">{g.joinButton}</Button>
          </form>
        </Card>
        <Card title={g.receive}>
          <p className="mb-2 text-xs text-stone-500">{g.receiveHelp}</p>
          <form action={receiveGiftAction} className="space-y-2">
            <Field label={g.code}><Input name="code" required autoComplete="off" placeholder="XXXX-XXXX-XXXX" /></Field>
            <Button type="submit" variant="secondary">{g.receiveButton}</Button>
          </form>
        </Card>
      </div>
    </Page>
  );
}
