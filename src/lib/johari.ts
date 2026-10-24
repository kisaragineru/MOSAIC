/**
 * Johari window per axis: how you describe yourself (from your answers) beside how the people you
 * asked describe you. Deterministic; no score.
 *
 *  - open:      you and they see the same side
 *  - blind:     they see a side that your own answers don't (yet) show
 *  - hidden:    your answers show a side they don't see
 *  - different: you see one side, they see the other
 *  - unknown:   neither shows a side yet
 * "They see a side" = more of them chose one pole than the other (ties and "neither" count as no side).
 */
export type Window = "open" | "blind" | "hidden" | "different" | "unknown";
export interface PeerCounts {
  pos: number;
  neutral: number;
  neg: number;
}

export function othersLean(c: PeerCounts): 1 | -1 | 0 {
  return c.pos > c.neg ? 1 : c.neg > c.pos ? -1 : 0;
}

/** `self` is the direction of your own claim when it says something (emerging or clear), else 0. */
export function windowOf(self: 1 | -1 | 0, c: PeerCounts): Window {
  const total = c.pos + c.neutral + c.neg;
  const lean = total ? othersLean(c) : 0;
  if (self !== 0 && lean !== 0) return self === lean ? "open" : "different";
  if (self !== 0) return "hidden";
  if (lean !== 0) return "blind";
  return "unknown";
}
