import { setCardAction } from "@/app/actions/sharing";
import type { Dict } from "@/lib/i18n/messages/en";
import { CARD_ITEMS, type CardItem } from "@/server/services/card";

/** Choose what every connection sees from the start (the calling card). */
export function CardForm({ t, items, back }: { t: Dict; items: CardItem[]; back: string }) {
  const c = t.card;
  return (
    <form action={setCardAction} className="space-y-3" data-testid="card-form">
      <input type="hidden" name="back" value={back} />
      <ul className="space-y-1">
        {CARD_ITEMS.map((x) => (
          <li key={x}>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl px-2 py-2 transition hover:bg-stone-50 has-[:checked]:bg-teal-50/70">
              <input type="checkbox" name="item" value={x} defaultChecked={items.includes(x)} className="mt-0.5 h-5 w-5 shrink-0 accent-teal-700" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-stone-900">{c.items[x][0]}</span>
                <span className="block text-xs leading-5 text-stone-500">{c.items[x][1]}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-5 text-stone-500">{c.chartNote}</p>
      <button type="submit" className="rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">{c.save}</button>
    </form>
  );
}
