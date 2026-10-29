/**
 * The per-connection sharing that the privacy lists set, as levels: Tử Vi (nothing, the summary,
 * or the full chart too) and answers (preferences, values, both). A level only touches its own
 * group's scopes; the other group's stay as they are.
 */
export const SCOPE_GROUPS = {
  tuvi: { scopes: ["tuvi", "tuvi_detail"], levels: { none: [], tuvi: ["tuvi"], detail: ["tuvi", "tuvi_detail"] } },
  answers: { scopes: ["preferences", "values"], levels: { none: [], preferences: ["preferences"], values: ["values"], both: ["preferences", "values"] } },
} as const;

export type ScopeGroup = keyof typeof SCOPE_GROUPS;
export type ScopeLevel<G extends ScopeGroup = ScopeGroup> = keyof (typeof SCOPE_GROUPS)[G]["levels"];

export const isScopeGroup = (v: unknown): v is ScopeGroup => typeof v === "string" && Object.hasOwn(SCOPE_GROUPS, v);

export function levelScopes(group: ScopeGroup, level: string): readonly string[] | null {
  const levels = SCOPE_GROUPS[group].levels as Record<string, readonly string[]>;
  return Object.hasOwn(levels, level) ? levels[level]! : null;
}

/** The level a set of scopes amounts to (the full chart counts as "detail" even without the summary). */
export function levelOf(group: ScopeGroup, scopes: readonly string[]): string {
  const has = (s: string) => scopes.includes(s);
  if (group === "tuvi") return has("tuvi_detail") ? "detail" : has("tuvi") ? "tuvi" : "none";
  return has("preferences") && has("values") ? "both" : has("preferences") ? "preferences" : has("values") ? "values" : "none";
}

/** My scopes with this group's replaced by the level's, in a stable order. */
export function withLevel(mine: readonly string[], group: ScopeGroup, level: string): string[] {
  const own: readonly string[] = SCOPE_GROUPS[group].scopes;
  const next = new Set([...mine.filter((s) => !own.includes(s)), ...(levelScopes(group, level) ?? [])]);
  return ["tuvi", "tuvi_detail", "preferences", "values"].filter((s) => next.has(s));
}
