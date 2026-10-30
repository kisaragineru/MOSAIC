"use client";
import { useState } from "react";
import { CIRCLE_ICON } from "./circle-icon";

export interface AudienceText {
  label: string;
  private: string;
  connections: string;
  circles: string;
  circleNames: Record<string, string>;
  circlesHelp: string;
  /** Above the people one can choose by name. */
  peopleLabel: string;
  noConnections: string;
  /** Under the post button: who will see it. */
  hint: { private: string; connections: string; /** With {names}. */ circles: string; chooseCircle: string };
  listSeparator: string;
}

const CIRCLES = ["partner", "family", "friend", "colleague"] as const;

/** Under the post button: who will see it, relationships and people by name. */
export function audienceHint(tx: AudienceText, vis: string, cs: string[], ps: string[], people: { id: string; name: string }[]) {
  if (vis === "connections") return tx.hint.connections;
  if (vis !== "circles") return tx.hint.private;
  const names = [...cs.map((c) => tx.circleNames[c]), ...ps.map((id) => people.find((p) => p.id === id)?.name).filter((x): x is string => !!x)];
  return names.length ? tx.hint.circles.replace("{names}", names.join(tx.listSeparator)) : tx.hint.chooseCircle;
}
const chip =
  "cursor-pointer select-none rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 transition has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400";

/**
 * Who a post is for, the same everywhere: only me, everyone I'm connected with, or chosen
 * relationships. Sends `visibility` and `circles`; tells the parent what it says now.
 */
export function AudienceField({
  tx,
  canShare,
  visibility = "private",
  circles = [],
  people = [],
  audience = [],
  onChange,
}: {
  tx: AudienceText;
  canShare: boolean;
  visibility?: string;
  circles?: string[];
  /** People I'm connected with, who can be chosen by name. */
  people?: { id: string; name: string }[];
  /** Those chosen already (user ids). */
  audience?: string[];
  onChange?: (hint: string, shared: boolean) => void;
}) {
  const [v, setV] = useState(visibility);
  const [picked, setPicked] = useState<string[]>(circles);
  const [chosen, setChosen] = useState<string[]>(audience.filter((id) => people.some((p) => p.id === id)));
  const set = (vis: string, cs: string[], ps: string[]) => {
    setV(vis);
    setPicked(cs);
    setChosen(ps);
    onChange?.(audienceHint(tx, vis, cs, ps, people), vis !== "private");
  };
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-stone-700">{tx.label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {(canShare ? (["private", "connections", "circles"] as const) : (["private"] as const)).map((x) => (
          <label key={x} className={chip}>
            <input type="radio" name="visibility" value={x} checked={v === x} onChange={() => set(x, picked, chosen)} className="sr-only" />
            {x === "private" ? `🔒 ${tx.private}` : x === "connections" ? `🔗 ${tx.connections}` : `👪 ${tx.circles}`}
          </label>
        ))}
      </div>
      {canShare && v === "circles" && (
        <div className="mt-2 rounded-xl bg-teal-50/60 px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {CIRCLES.map((c) => (
              <label key={c} className={chip}>
                <input type="checkbox" name="circles" value={c} checked={picked.includes(c)} onChange={(e) => set("circles", e.target.checked ? [...picked, c] : picked.filter((x) => x !== c), chosen)} className="sr-only" />
                {CIRCLE_ICON[c]} {tx.circleNames[c]}
              </label>
            ))}
          </div>
          {people.length > 0 && (
            <>
              <p className="mt-2 mb-1 text-[11px] font-semibold text-stone-600">{tx.peopleLabel}</p>
              <div className="flex flex-wrap gap-1.5" data-testid="audience-people">
                {people.map((x) => (
                  <label key={x.id} className={chip}>
                    <input type="checkbox" name="people" value={x.id} checked={chosen.includes(x.id)} onChange={(e) => set("circles", picked, e.target.checked ? [...chosen, x.id] : chosen.filter((y) => y !== x.id))} className="sr-only" />
                    👤 {x.name}
                  </label>
                ))}
              </div>
            </>
          )}
          <p className="mt-1 text-[11px] leading-5 text-stone-600">{tx.circlesHelp}</p>
        </div>
      )}
      {!canShare && <p className="mt-1 text-xs text-stone-500">{tx.noConnections}</p>}
    </fieldset>
  );
}
