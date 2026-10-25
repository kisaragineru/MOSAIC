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
  noConnections: string;
  /** Under the post button: who will see it. */
  hint: { private: string; connections: string; /** With {names}. */ circles: string; chooseCircle: string };
  listSeparator: string;
}

const CIRCLES = ["partner", "family", "friend", "colleague"] as const;
const chip =
  "cursor-pointer select-none rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 transition has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400";

/**
 * Who a post is for, the same everywhere: only me, everyone I'm connected with, or chosen
 * relationships. Sends `visibility` and `circles`; tells the parent what it says now.
 */
export function AudienceField({ tx, canShare, visibility = "private", circles = [], onChange }: { tx: AudienceText; canShare: boolean; visibility?: string; circles?: string[]; onChange?: (hint: string, shared: boolean) => void }) {
  const [v, setV] = useState(visibility);
  const [picked, setPicked] = useState<string[]>(circles);
  const hint = (vis: string, cs: string[]) =>
    vis === "connections" ? tx.hint.connections : vis === "circles" ? (cs.length ? tx.hint.circles.replace("{names}", cs.map((c) => tx.circleNames[c]).join(tx.listSeparator)) : tx.hint.chooseCircle) : tx.hint.private;
  const set = (vis: string, cs: string[]) => {
    setV(vis);
    setPicked(cs);
    onChange?.(hint(vis, cs), vis !== "private");
  };
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-stone-700">{tx.label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {(canShare ? (["private", "connections", "circles"] as const) : (["private"] as const)).map((x) => (
          <label key={x} className={chip}>
            <input type="radio" name="visibility" value={x} checked={v === x} onChange={() => set(x, picked)} className="sr-only" />
            {x === "private" ? `🔒 ${tx.private}` : x === "connections" ? `🔗 ${tx.connections}` : `👪 ${tx.circles}`}
          </label>
        ))}
      </div>
      {canShare && v === "circles" && (
        <div className="mt-2 rounded-xl bg-teal-50/60 px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {CIRCLES.map((c) => (
              <label key={c} className={chip}>
                <input type="checkbox" name="circles" value={c} checked={picked.includes(c)} onChange={(e) => set("circles", e.target.checked ? [...picked, c] : picked.filter((x) => x !== c))} className="sr-only" />
                {CIRCLE_ICON[c]} {tx.circleNames[c]}
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] leading-5 text-stone-600">{tx.circlesHelp}</p>
        </div>
      )}
      {!canShare && <p className="mt-1 text-xs text-stone-500">{tx.noConnections}</p>}
    </fieldset>
  );
}
