import { addPersonFromConnectionAction } from "@/app/actions/sharing";
import type { Dict } from "@/lib/i18n/messages/en";
import { Button, Select } from "./ui";

const RELS = ["partner", "family", "friend", "colleague", "other"] as const;
const fold = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s（）()・.]/g, "");

/**
 * For a new connection: add them to People, or attach the connection to someone already there
 * (so what you recorded before — gifts, things done together, notes — stays with them). An
 * existing entry whose name looks like theirs is suggested first.
 */
export function ConnectionPersonForm({ t, sessionId, otherName, people }: { t: Dict; sessionId: string; otherName: string; people: { id: string; nickname: string }[] }) {
  const o = fold(otherName);
  const guess = people.find((p) => {
    const n = fold(p.nickname);
    return n && o && (n.includes(o) || o.includes(n));
  });
  return (
    <form action={addPersonFromConnectionAction} className="space-y-2">
      <input type="hidden" name="sessionId" value={sessionId} />
      {people.length > 0 && (
        <Select name="personId" defaultValue={guess?.id ?? ""} aria-label={t.people.whoIsThis(otherName)} className="text-sm">
          <option value="">＋ {t.people.addAsNew}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>{t.people.linkTo(p.nickname)}</option>
          ))}
        </Select>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Select name="relationship" defaultValue="friend" aria-label={t.people.relationship} className="!w-auto min-h-9 py-1 text-xs">
          {RELS.map((r) => <option key={r} value={r}>{t.people.relationships[r]}</option>)}
        </Select>
        <Button type="submit" className="min-h-9 px-4 py-1 text-xs">♡ {t.people.addFromConnection}</Button>
      </div>
      {people.length > 0 && <p className="text-[11px] leading-5 text-stone-500">{t.people.linkExistingHelp}</p>}
    </form>
  );
}
