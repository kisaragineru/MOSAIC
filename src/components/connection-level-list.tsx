import Link from "next/link";
import { connectionLevelAction } from "@/app/actions/sharing";
import type { Dict } from "@/lib/i18n/messages/en";
import { levelOf, SCOPE_GROUPS, type ScopeGroup } from "@/lib/sharing/scope-levels";
import type { MainStarId } from "@/lib/tuvi/stars";
import type { PrivacyConnection } from "@/server/services/privacy";
import { Avatar } from "./avatar";
import { Checkbox, Pill } from "./ui";
import { SelectAll } from "./select-all";

/**
 * Everyone I'm connected with and how much of one group (Tử Vi, or answers) I show each of them,
 * with where each scope stands between us: shared, waiting for them, or offered by them. Pick
 * people and set one level for all of them; a connection still waiting on me is only linked.
 */
export function ConnectionLevelList({
  t,
  group,
  connections,
  avatars,
  tints,
  back,
}: {
  t: Dict;
  group: ScopeGroup;
  connections: PrivacyConnection[];
  avatars: Map<string, string>;
  tints: Map<string, MainStarId>;
  back: string;
}) {
  const tc = t.connectionLevels;
  const levels: Record<string, string> = group === "tuvi" ? tc.tuviLevels : tc.answersLevels;
  const scopes: readonly string[] = SCOPE_GROUPS[group].scopes;
  const settingsHref = (c: PrivacyConnection) => (c.personId ? `/people/${c.personId}/settings` : `/compare/${c.sessionId}`);
  if (connections.length === 0) return <p className="text-sm text-stone-500">{tc.none}</p>;
  const mine = connections.filter((c) => c.iConsented);
  const states = (c: PrivacyConnection) =>
    scopes.flatMap((s): { s: string; tone: "teal" | "amber" | "violet"; text: string }[] => {
      const name = t.compare.scopeNames[s as keyof typeof t.compare.scopeNames];
      const me = c.myScopes.includes(s);
      const them = c.theirScopes.includes(s);
      if (me && them) return [{ s, tone: "teal", text: `✓ ${name}${t.common.colon}${tc.states.shared}` }];
      if (me) return [{ s, tone: "amber", text: `⏳ ${name}${t.common.colon}${tc.states.waiting}` }];
      if (them) return [{ s, tone: "violet", text: `🎁 ${name}${t.common.colon}${tc.states.offered}` }];
      return [];
    });
  return (
    <form action={connectionLevelAction} className="space-y-3">
      <input type="hidden" name="group" value={group} />
      <input type="hidden" name="back" value={back} />
      {mine.length > 1 && <SelectAll name="sessionId" label={tc.selectAll} />}
      <ul className="divide-y divide-stone-100" data-testid={`levels-${group}`}>
        {connections.map((c) => (
          <li key={c.sessionId} className="flex items-start gap-3 py-3" data-testid="level-row">
            {c.iConsented ? (
              <input type="checkbox" name="sessionId" value={c.sessionId} id={`lv-${group}-${c.sessionId}`} aria-label={c.name} className="mt-3 h-4 w-4 shrink-0 accent-teal-700" />
            ) : (
              <span aria-hidden className="mt-3 h-4 w-4 shrink-0" />
            )}
            <Avatar name={c.name} src={c.otherId ? avatars.get(c.otherId) : null} type={c.otherId ? tints.get(c.otherId) : null} className="h-10 w-10 shrink-0 text-base" />
            <label htmlFor={c.iConsented ? `lv-${group}-${c.sessionId}` : undefined} className="min-w-0 flex-1 space-y-1">
              <span className="block truncate font-semibold text-stone-900">{c.name}</span>
              {c.iConsented ? (
                <span className="flex flex-wrap gap-1">
                  <Pill tone="stone">{tc.you(levels[levelOf(group, c.myScopes)]!)}</Pill>
                  {states(c).map((x) => <Pill key={x.s} tone={x.tone}>{x.text}</Pill>)}
                </span>
              ) : (
                <span className="block text-xs text-amber-800">⏳ {tc.notYet}</span>
              )}
            </label>
            <Link href={settingsHref(c)} className="mt-2 shrink-0 text-xs font-semibold text-teal-700">{c.iConsented ? tc.details : tc.approve} →</Link>
          </li>
        ))}
      </ul>
      {mine.length > 0 && (
        // Stays in reach while scrolling a long list.
        <div className="sticky bottom-24 z-10 space-y-2 rounded-3xl bg-white/95 p-3 shadow-lg ring-1 ring-stone-200" data-testid={`level-bar-${group}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-full px-1 text-xs font-semibold text-stone-600">{tc.changeTo}</span>
            <select name="level" aria-label={tc.changeTo} defaultValue="none" className="min-w-0 flex-1 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm">
              {Object.entries(levels).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <button type="submit" className="shrink-0 rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">{tc.apply}</button>
          </div>
          <Checkbox name="agree" label={<span className="text-xs leading-5 text-stone-600">{tc.agree}</span>} />
        </div>
      )}
    </form>
  );
}
